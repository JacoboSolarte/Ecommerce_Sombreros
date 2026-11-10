import struct
import zlib

from sqlalchemy import text

from tests.helpers import add_to_cart, buy, checkout, place_order, simulate


def product_payload(data, **over):
    body = {
        "name": "Sombrero Nuevo de Prueba", "sku": "CG-NEW", "shortDescription": "Corto", "description": "Largo " * 10,
        "priceCop": 210000, "compareAtPriceCop": 250000, "categoryId": data.cat_ids[0], "artisanId": data.artisan_ids[0],
        "weaveGrade": "superfino", "weavingHours": 60, "brimCm": 8.5, "deliveryDaysMin": 3, "deliveryDaysMax": 6,
        "isFeatured": False, "images": [{"url": "/images/nuevo.jpg", "alt": "Sombrero nuevo"}],
        "variants": [{"sizeCode": "M", "colorId": data.color_ids["Natural"], "stock": 4},
                     {"sizeCode": "L", "colorId": data.color_ids["Natural"], "stock": 0}],
    }
    body.update(over)
    return body


def png_bytes() -> bytes:
    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    raw = b"\x00\xff\x00\x00"
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


# ---------- products ----------
def test_create_and_edit_product(admin, anon, data, container):
    r = admin.post("/api/admin/products", json=product_payload(data))
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["slug"] == "sombrero-nuevo-de-prueba" and p["isActive"] is True and p["categoryId"] == data.cat_ids[0]
    assert {v["sizeCode"]: v["stock"] for v in p["variants"]} == {"M": 4, "L": 0}
    assert anon.get(f"/api/products/{p['slug']}").status_code == 200

    # a same-named product gets a distinct slug
    other = admin.post("/api/admin/products", json=product_payload(data, sku="CG-NEW2")).json()
    assert other["slug"] == "sombrero-nuevo-de-prueba-2"

    variants = [{"sizeCode": "M", "colorId": data.color_ids["Natural"], "stock": 9},
                {"sizeCode": "L", "colorId": data.color_ids["Natural"], "stock": 0},
                {"sizeCode": "XL", "colorId": data.color_ids["Miel"], "stock": 2}]
    r = admin.put(f"/api/admin/products/{p['id']}", json=product_payload(data, priceCop=199000, variants=variants))
    assert r.status_code == 200, r.text
    edited = r.json()
    assert edited["priceCop"] == 199000 and edited["slug"] == "sombrero-nuevo-de-prueba"
    assert {v["sizeCode"]: v["stock"] for v in edited["variants"]} == {"M": 9, "L": 0, "XL": 2}
    ids_before = {v["sizeCode"]: v["id"] for v in p["variants"]}
    assert {v["sizeCode"]: v["id"] for v in edited["variants"] if v["sizeCode"] in ids_before} == ids_before
    with container.engine.connect() as c:
        rows = c.execute(text(
            "SELECT reason, delta FROM inventory_movements WHERE variant_id=:v ORDER BY id"), {"v": ids_before["M"]}).all()
    assert [tuple(x) for x in rows] == [("initial", 4), ("adjustment", 5)]


def test_product_validation(admin, data):
    r = admin.post("/api/admin/products", json=product_payload(data, compareAtPriceCop=100000))
    assert r.status_code == 400 and "compareAtPriceCop" in r.json()["error"]["details"]["fields"]
    assert admin.post("/api/admin/products", json=product_payload(data, priceCop=0)).status_code == 400
    assert admin.post("/api/admin/products", json=product_payload(data, weaveGrade="x")).status_code == 400
    assert admin.post("/api/admin/products", json=product_payload(data, variants=[])).status_code == 400
    dup = [{"sizeCode": "M", "colorId": data.color_ids["Natural"], "stock": 1}] * 2
    assert admin.post("/api/admin/products", json=product_payload(data, variants=dup)).status_code == 400
    assert admin.post("/api/admin/products", json=product_payload(data, sku="CG-1")).status_code == 400
    assert admin.post("/api/admin/products", json=product_payload(data, categoryId=9999)).status_code == 400


def test_deactivate_hides_from_catalog_but_keeps_orders(admin, customer, anon, data):
    order = buy(customer, [(data.classic_v[("M", "Natural")], 1)])
    assert admin.post(f"/api/admin/products/{data.classic}/deactivate").status_code == 204
    assert anon.get("/api/products/aguadeno-clasico").status_code == 404
    assert "Aguadeno Clasico" not in [i["name"] for i in anon.get("/api/products").json()["items"]]
    assert "Aguadeno Clasico" not in [p["name"] for p in anon.get("/api/products/featured").json()]
    assert anon.get("/api/categories").json()[0]["productCount"] == 1

    seen = customer.get(f"/api/orders/{order['id']}").json()
    assert seen["items"][0]["productName"] == "Aguadeno Clasico" and seen["status"] == "paid"
    inactive = admin.get("/api/admin/products", params={"status": "inactive"}).json()
    assert [i["name"] for i in inactive["items"]] == ["Aguadeno Clasico"]

    # an inactive product can not be bought, even from an existing cart line
    assert add_to_cart(customer, data.classic_v[("M", "Natural")], 1).status_code == 409
    assert admin.post(f"/api/admin/products/{data.classic}/activate").status_code == 204
    assert anon.get("/api/products/aguadeno-clasico").status_code == 200


def test_cart_line_of_deactivated_product_blocks_checkout(admin, customer, data):
    add_to_cart(customer, data.wide_v[("M", "Café")], 1)
    admin.post(f"/api/admin/products/{data.wide}/deactivate")
    cart = customer.get("/api/cart").json()
    assert cart["items"][0]["availability"] == "out_of_stock"
    assert checkout(customer).status_code == 409


def test_admin_product_list_and_detail(admin, data):
    r = admin.get("/api/admin/products", params={"q": "CG-2"}).json()
    assert r["total"] == 1 and r["items"][0]["totalStock"] == 10 and r["items"][0]["variantCount"] == 1
    assert admin.get("/api/admin/products").json()["total"] == 4
    d = admin.get(f"/api/admin/products/{data.premium}").json()
    assert d["isActive"] is True and d["artisanId"] == data.artisan_ids[0]
    assert admin.get("/api/admin/products/99999").status_code == 404
    assert len(admin.get("/api/admin/categories").json()) == 2 and len(admin.get("/api/admin/artisans").json()) == 2


def test_upload(admin, anon):
    r = admin.post("/api/admin/uploads", files={"file": ("foto.png", png_bytes(), "image/png")})
    assert r.status_code == 201
    url = r.json()["url"]
    assert url.startswith("/api/uploads/") and url.endswith(".png")
    assert anon.get(url).status_code == 200
    bad = admin.post("/api/admin/uploads", files={"file": ("malo.png", b"no soy imagen", "image/png")})
    assert bad.status_code == 400
    assert admin.post("/api/admin/uploads", files={"file": ("x.gif", b"GIF89a", "image/gif")}).status_code == 400
    big = admin.post("/api/admin/uploads", files={"file": ("big.png", png_bytes() + b"0" * (5 * 1024 * 1024), "image/png")})
    assert big.status_code == 400


# ---------- inventory ----------
def test_inventory_adjust_cannot_go_negative(admin, data, container):
    v = data.classic_v[("L", "Natural")]  # stock 1
    r = admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": -2, "reason": "adjustment", "note": "merma"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "OUT_OF_STOCK"
    assert next(i for i in admin.get("/api/admin/inventory").json() if i["variantId"] == v)["stock"] == 1

    ok = admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": 5, "reason": "restock", "note": "lote nuevo"})
    assert ok.status_code == 200 and ok.json()["stock"] == 6 and ok.json()["isLow"] is False
    ok = admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": -6, "reason": "adjustment"})
    assert ok.json()["stock"] == 0
    moves = admin.get(f"/api/admin/inventory/{v}/movements").json()
    assert [(m["delta"], m["reason"]) for m in moves] == [(-6, "adjustment"), (5, "restock")]
    assert moves[1]["note"] == "lote nuevo" and moves[0]["userName"] == "Admin Prueba"


def test_inventory_validation_and_filters(admin, data):
    v = data.wide_v[("M", "Café")]
    assert admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": 0, "reason": "adjustment"}).status_code == 400
    assert admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": -1, "reason": "restock"}).status_code == 400
    assert admin.post(f"/api/admin/inventory/{v}/adjust", json={"delta": 1, "reason": "otro"}).status_code == 422
    assert admin.post("/api/admin/inventory/99999/adjust", json={"delta": 1, "reason": "restock"}).status_code == 404
    low = admin.get("/api/admin/inventory", params={"lowStock": "true"}).json()
    assert all(i["isLow"] for i in low) and len(low) == 4  # two at 0, one at 1, one at 3
    assert [i["productName"] for i in admin.get("/api/admin/inventory", params={"q": "CG-2"}).json()] == ["Ala Ancha Fino"]


# ---------- orders ----------
def test_order_transitions_and_history(admin, customer, data, container):
    v = data.classic_v[("M", "Natural")]
    order = buy(customer, [(v, 2)])
    oid = order["id"]

    d = admin.get(f"/api/admin/orders/{oid}").json()
    assert d["status"] == "paid" and d["allowedTransitions"] == ["preparing", "cancelled"]
    assert d["customer"]["email"] == "cliente@test.co"

    def go(status, note=None):
        return admin.post(f"/api/admin/orders/{oid}/status", json={"status": status, "note": note})

    for bad in ("delivered", "shipped", "pending", "paid"):
        r = go(bad)
        assert r.status_code == 409 and r.json()["error"]["code"] == "INVALID_TRANSITION", bad
    assert go("nonsense").status_code == 400

    assert go("preparing", "Empacando").json()["status"] == "preparing"
    assert go("shipped", "Guía 123").json()["allowedTransitions"] == ["delivered"]
    assert go("cancelled").status_code == 409
    done = go("delivered").json()
    assert done["allowedTransitions"] == []
    assert [h["toStatus"] for h in done["history"]] == ["pending", "paid", "preparing", "shipped", "delivered"]
    assert done["history"][2]["note"] == "Empacando"
    assert go("preparing").status_code == 409
    assert customer.get(f"/api/orders/{oid}").json()["status"] == "delivered"


def test_manual_pending_to_paid_is_rejected_but_cancel_ok(admin, customer, data, container):
    placed = place_order(customer, [(data.wide_v[("M", "Café")], 1)])
    oid = placed["order"]["id"]
    assert admin.post(f"/api/admin/orders/{oid}/status", json={"status": "paid"}).status_code == 409
    r = admin.post(f"/api/admin/orders/{oid}/status", json={"status": "cancelled", "note": "Cliente desistió"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert simulate(customer, placed["payment"]["reference"]).status_code == 409  # can't pay a cancelled order
    with container.engine.connect() as c:
        assert c.execute(text("SELECT stock FROM product_variants WHERE id=:i"), {"i": data.wide_v[("M", "Café")]}).scalar() == 10


def test_cancelling_paid_order_returns_stock(admin, customer, data, container):
    v = data.classic_v[("M", "Natural")]
    order = buy(customer, [(v, 3)])
    stock = lambda: next(i for i in admin.get("/api/admin/inventory").json() if i["variantId"] == v)["stock"]  # noqa: E731
    assert stock() == 2
    assert admin.post(f"/api/admin/orders/{order['id']}/status", json={"status": "cancelled"}).status_code == 200
    assert stock() == 5
    moves = admin.get(f"/api/admin/inventory/{v}/movements").json()
    assert moves[0]["reason"] == "cancellation" and moves[0]["delta"] == 3 and moves[0]["orderNumber"] == order["number"]
    assert admin.post(f"/api/admin/orders/{order['id']}/status", json={"status": "cancelled"}).status_code == 409
    assert stock() == 5


def test_admin_order_list_filters(admin, customer, data):
    paid = buy(customer, [(data.wide_v[("M", "Café")], 1)])
    pending = buy(customer, [(data.classic_v[("M", "Natural")], 1)], outcome="declined")
    all_orders = admin.get("/api/admin/orders").json()
    assert all_orders["total"] == 2 and all_orders["items"][0]["customerEmail"] == "cliente@test.co"
    only_paid = admin.get("/api/admin/orders", params={"status": "paid"}).json()
    assert [o["id"] for o in only_paid["items"]] == [paid["id"]]
    assert [o["id"] for o in admin.get("/api/admin/orders", params={"q": pending["number"]}).json()["items"]] == [pending["id"]]
    assert admin.get("/api/admin/orders", params={"q": "Cliente Prueba"}).json()["total"] == 2
    assert admin.get("/api/admin/orders", params={"from": "2000-01-01", "to": "2000-01-02"}).json()["total"] == 0
    assert admin.get("/api/admin/orders", params={"status": "xx"}).status_code == 400


# ---------- reports ----------
def test_summary_numbers_add_up(admin, customer, data):
    a = buy(customer, [(data.classic_v[("M", "Natural")], 2)])      # 378.000, free shipping
    b = buy(customer, [(data.wide_v[("M", "Café")], 1)])            # 120.000 + 12.000 shipping
    buy(customer, [(data.premium_v[("L", "Miel")], 1)], outcome="declined")  # stays pending
    admin.post(f"/api/admin/orders/{b['id']}/status", json={"status": "preparing"})

    s = admin.get("/api/admin/summary").json()
    expected = a["totals"]["totalCop"] + b["totals"]["totalCop"]
    assert (a["totals"]["totalCop"], b["totals"]["totalCop"]) == (378000, 132000)
    assert s["ordersCount"] == 3 and s["paidOrdersCount"] == 2 and s["revenueCop"] == expected
    assert s["averageOrderCop"] == expected // 2
    assert s["ordersByStatus"] == {"pending": 1, "paid": 1, "preparing": 1, "shipped": 0, "delivered": 0, "cancelled": 0}
    assert sum(d["revenueCop"] for d in s["salesByDay"]) == expected and sum(d["orders"] for d in s["salesByDay"]) == 2
    assert len(s["salesByDay"]) == 30
    top = s["topProducts"]
    assert [(t["name"], t["unitsSold"], t["revenueCop"]) for t in top] == [("Aguadeno Clasico", 2, 378000), ("Ala Ancha Fino", 1, 120000)]
    low = {(i["productName"], i["sizeCode"], i["colorName"]): i["stock"] for i in s["lowStock"]}
    assert low[("Aguadeno Clasico", "M", "Miel")] == 0 and low[("Extrafino Premium", "L", "Miel")] == 3
    assert ("Ala Ancha Fino", "M", "Café") not in low


def test_summary_range_and_validation(admin, customer, data):
    buy(customer, [(data.wide_v[("M", "Café")], 1)])
    empty = admin.get("/api/admin/summary", params={"from": "2001-01-01", "to": "2001-01-10"}).json()
    assert empty["ordersCount"] == 0 and empty["revenueCop"] == 0 and empty["averageOrderCop"] == 0
    assert len(empty["salesByDay"]) == 10 and empty["topProducts"] == []
    assert admin.get("/api/admin/summary", params={"from": "2001-02-01", "to": "2001-01-10"}).status_code == 400
    assert admin.get("/api/admin/summary", params={"from": "no-es-fecha"}).status_code == 422
