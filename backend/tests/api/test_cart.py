from tests.helpers import add_to_cart


def test_cart_requires_login(anon, data):
    assert anon.get("/api/cart").status_code == 401


def test_add_update_remove(customer, data):
    v = data.classic_v[("M", "Natural")]
    cart = add_to_cart(customer, v, 2).json()
    item = cart["items"][0]
    assert item["quantity"] == 2 and item["lineTotalCop"] == 378000 and item["stock"] == 5
    assert item["sizeCode"] == "M" and item["colorName"] == "Natural" and cart["itemCount"] == 2
    # adding again accumulates
    assert add_to_cart(customer, v, 1).json()["items"][0]["quantity"] == 3
    cart = customer.patch(f"/api/cart/items/{item['id']}", json={"quantity": 1}).json()
    assert cart["items"][0]["quantity"] == 1
    cart = customer.delete(f"/api/cart/items/{item['id']}").json()
    assert cart["items"] == [] and cart["totals"]["totalCop"] == 0 and cart["totals"]["shippingCop"] == 0


def test_add_beyond_stock_is_409(customer, data):
    v = data.classic_v[("L", "Natural")]  # stock 1
    r = add_to_cart(customer, v, 2)
    assert r.status_code == 409
    err = r.json()["error"]
    assert err["code"] == "OUT_OF_STOCK" and err["details"]["available"] == 1
    assert add_to_cart(customer, v, 1).status_code == 200
    assert add_to_cart(customer, v, 1).status_code == 409  # already one in the cart


def test_out_of_stock_variant_cannot_be_added(customer, data):
    assert add_to_cart(customer, data.sold_out_v[("M", "Natural")], 1).status_code == 409


def test_update_beyond_stock_is_409(customer, data):
    item = add_to_cart(customer, data.classic_v[("M", "Natural")], 1).json()["items"][0]
    r = customer.patch(f"/api/cart/items/{item['id']}", json={"quantity": 6})
    assert r.status_code == 409 and r.json()["error"]["details"]["available"] == 5


def test_quantity_validation_and_unknown_variant(customer, data):
    assert customer.post("/api/cart/items", json={"variantId": data.classic_v[("M", "Natural")], "quantity": 0}).status_code == 422
    assert add_to_cart(customer, 999999, 1).status_code == 404


def test_totals_with_shipping_and_free_shipping(customer, data):
    cart = add_to_cart(customer, data.wide_v[("M", "Café")], 1).json()
    t = cart["totals"]
    assert t["totalItemsCop"] == 120000 and t["shippingCop"] == 12000 and t["totalCop"] == 132000
    assert t["taxCop"] == 19160 and t["subtotalCop"] == 100840 and t["freeShippingFromCop"] == 250000
    cart = add_to_cart(customer, data.wide_v[("M", "Café")], 2).json()
    t = cart["totals"]
    assert t["totalItemsCop"] == 360000 and t["shippingCop"] == 0 and t["totalCop"] == 360000
    assert t["taxCop"] == 57479 and t["subtotalCop"] + t["taxCop"] == 360000


def test_merge_clamps_to_stock(customer, data):
    items = [{"variantId": data.classic_v[("L", "Natural")], "quantity": 5},
             {"variantId": data.sold_out_v[("M", "Natural")], "quantity": 2},
             {"variantId": 999999, "quantity": 1}]
    cart = customer.post("/api/cart/merge", json={"items": items}).json()
    assert len(cart["items"]) == 1 and cart["items"][0]["quantity"] == 1


def test_quote_guest_cart_without_login(anon, data):
    items = [{"variantId": data.wide_v[("M", "Café")], "quantity": 1}]
    r = anon.post("/api/cart/quote", json={"items": items})
    assert r.status_code == 200
    cart = r.json()
    assert cart["totals"]["totalCop"] == 132000 and cart["items"][0]["stock"] == 10
