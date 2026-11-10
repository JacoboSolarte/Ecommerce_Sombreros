from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import text

from tests.helpers import add_to_cart, buy, checkout, place_order, register_customer, simulate


def stock_of(container, variant_id):
    with container.engine.connect() as c:
        return c.execute(text("SELECT stock FROM product_variants WHERE id=:i"), {"i": variant_id}).scalar()


def test_checkout_empty_cart(customer, data):
    r = checkout(customer)
    assert r.status_code == 400 and r.json()["error"]["code"] == "CART_EMPTY"


def test_checkout_validations(customer, data):
    add_to_cart(customer, data.wide_v[("M", "Café")], 1)
    r = checkout(customer, postalCode="5200")
    assert r.status_code == 400
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR" and "postalCode" in err["details"]["fields"]
    assert "phone" in checkout(customer, phone="12345").json()["error"]["details"]["fields"]
    assert "department" in checkout(customer, department="Narnia").json()["error"]["details"]["fields"]
    assert "fullName" in checkout(customer, fullName=" ").json()["error"]["details"]["fields"]
    # nothing was created and the cart is untouched
    assert customer.get("/api/orders").json() == []
    assert len(customer.get("/api/cart").json()["items"]) == 1


def test_checkout_accepts_landline_and_department_without_accent(customer, data):
    add_to_cart(customer, data.wide_v[("M", "Café")], 1)
    r = checkout(customer, phone="7236789", department="narino")
    assert r.status_code == 201
    assert r.json()["order"]["shipping"]["department"] == "Nariño"


def test_full_purchase_flow(customer, data, container):
    wide, classic = data.wide_v[("M", "Café")], data.classic_v[("M", "Natural")]
    placed = place_order(customer, [(classic, 2), (wide, 1)])
    order, payment = placed["order"], placed["payment"]
    assert order["status"] == "pending" and order["number"].startswith("CG-")
    assert payment["redirectUrl"].endswith(f"/pago/simulador?ref={payment['reference']}")
    t = order["totals"]
    assert t["totalItemsCop"] == 498000 and t["shippingCop"] == 0 and t["totalCop"] == 498000
    assert t["subtotalCop"] + t["taxCop"] == t["totalItemsCop"]
    assert [i["lineTotalCop"] for i in order["items"]] == [378000, 120000]
    assert customer.get("/api/cart").json()["items"] == []
    assert stock_of(container, classic) == 5 and stock_of(container, wide) == 10  # not decremented yet

    status = customer.get(f"/api/payments/{payment['reference']}").json()
    assert status["status"] == "pending" and status["orderId"] == order["id"] and status["amountCop"] == 498000

    r = simulate(customer, payment["reference"], "approved")
    assert r.status_code == 200
    body = r.json()
    assert body["payment"]["status"] == "approved" and body["order"]["status"] == "paid"
    assert stock_of(container, classic) == 3 and stock_of(container, wide) == 9
    assert [h["toStatus"] for h in body["order"]["history"]] == ["pending", "paid"]
    assert body["order"]["history"][0]["fromStatus"] is None

    with container.engine.connect() as c:
        moves = c.execute(text("SELECT delta, reason, order_id FROM inventory_movements ORDER BY id")).all()
    assert [(m[0], m[1]) for m in moves] == [(-2, "purchase"), (-1, "purchase")]
    assert all(m[2] == order["id"] for m in moves)

    # idempotent when replayed
    assert simulate(customer, payment["reference"], "approved").status_code == 200
    assert stock_of(container, classic) == 3

    listing = customer.get("/api/orders").json()
    assert listing[0]["number"] == order["number"] and listing[0]["itemCount"] == 3
    assert listing[0]["firstItemImageUrl"] == "/images/CG-1.jpg" and listing[0]["status"] == "paid"
    detail = customer.get(f"/api/orders/{order['id']}").json()
    assert detail["payments"][0]["status"] == "approved"


def test_other_users_cannot_see_order_or_pay(customer, new_client, data):
    placed = place_order(customer, [(data.wide_v[("M", "Café")], 1)])
    stranger = register_customer(new_client)
    assert stranger.get(f"/api/orders/{placed['order']['id']}").status_code == 404
    assert stranger.get(f"/api/payments/{placed['payment']['reference']}").status_code == 404
    assert simulate(stranger, placed["payment"]["reference"]).status_code == 404
    assert stranger.post(f"/api/orders/{placed['order']['id']}/pay").status_code == 404


def test_declined_then_retry(customer, data, container):
    v = data.wide_v[("M", "Café")]
    placed = place_order(customer, [(v, 1)])
    order_id, ref = placed["order"]["id"], placed["payment"]["reference"]

    declined = simulate(customer, ref, "declined").json()
    assert declined["payment"]["status"] == "declined" and declined["order"]["status"] == "pending"
    assert stock_of(container, v) == 10
    # a processed payment can not be resolved twice
    again = simulate(customer, ref, "approved")
    assert again.status_code == 409 and again.json()["error"]["code"] == "PAYMENT_ERROR"

    retry = customer.post(f"/api/orders/{order_id}/pay")
    assert retry.status_code == 200
    new_ref = retry.json()["reference"]
    assert new_ref != ref and new_ref in retry.json()["redirectUrl"]
    failed = simulate(customer, new_ref, "failed").json()
    assert failed["payment"]["status"] == "failed" and failed["order"]["status"] == "pending"

    new_ref = customer.post(f"/api/orders/{order_id}/pay").json()["reference"]
    ok = simulate(customer, new_ref, "approved").json()
    assert ok["order"]["status"] == "paid" and stock_of(container, v) == 9
    assert len(ok["order"]["payments"]) == 3
    # a paid order no longer accepts payments
    assert customer.post(f"/api/orders/{order_id}/pay").status_code == 409


def test_checkout_blocks_when_stock_changed(customer, data, container):
    v = data.classic_v[("L", "Natural")]
    add_to_cart(customer, v, 1)
    with container.engine.begin() as c:
        c.execute(text("UPDATE product_variants SET stock=0 WHERE id=:i"), {"i": v})
    r = checkout(customer)
    assert r.status_code == 409
    err = r.json()["error"]
    assert err["code"] == "OUT_OF_STOCK" and err["details"]["items"] == [{"variantId": v, "requested": 1, "available": 0}]


def test_second_approval_for_last_unit_cancels_order(customer, new_client, data, container):
    last = data.classic_v[("L", "Natural")]  # stock 1
    other = register_customer(new_client)
    first = place_order(customer, [(last, 1)])
    second = place_order(other, [(last, 1)])  # allowed: stock is only reserved at payment

    assert simulate(customer, first["payment"]["reference"]).json()["order"]["status"] == "paid"
    r = simulate(other, second["payment"]["reference"], "approved")
    assert r.status_code == 200
    body = r.json()
    assert body["payment"]["status"] == "failed" and body["order"]["status"] == "cancelled"
    assert body["order"]["history"][-1]["note"] == "Sin stock al confirmar el pago"
    assert stock_of(container, last) == 0

    with container.engine.connect() as c:
        assert c.execute(text("SELECT COUNT(*) FROM inventory_movements WHERE reason='purchase'")).scalar() == 1
    # the cancelled order can not be paid again
    assert other.post(f"/api/orders/{second['order']['id']}/pay").status_code == 409


def test_concurrent_approvals_never_oversell(customer, new_client, data, container):
    last = data.classic_v[("L", "Natural")]
    other = register_customer(new_client)
    refs = [(customer, place_order(customer, [(last, 1)])["payment"]["reference"]),
            (other, place_order(other, [(last, 1)])["payment"]["reference"])]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda cr: simulate(cr[0], cr[1]), refs))
    assert all(r.status_code == 200 for r in results)
    assert sorted(r.json()["order"]["status"] for r in results) == ["cancelled", "paid"]
    assert stock_of(container, last) == 0


def test_buy_helper_declined_keeps_order_pending(customer, data):
    order = buy(customer, [(data.wide_v[("M", "Café")], 1)], outcome="declined")
    assert order["status"] == "pending"
