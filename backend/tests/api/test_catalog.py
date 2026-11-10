CARD_KEYS = {
    "id", "slug", "name", "shortDescription", "priceCop", "compareAtPriceCop", "imageUrl", "imageAlt", "category",
    "artisan", "weaveGrade", "colors", "totalStock", "availability", "deliveryDaysMin", "deliveryDaysMax",
}


def names(r):
    return sorted(i["name"] for i in r.json()["items"])


def test_list_shape_and_facets(anon, data):
    r = anon.get("/api/products")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 4 and body["page"] == 1 and body["pageSize"] == 24
    assert CARD_KEYS <= set(body["items"][0])
    f = body["facets"]
    assert {c["slug"] for c in f["categories"]} == {"clasicos", "ala-ancha"}
    assert f["priceMin"] == 99000 and f["priceMax"] == 300000
    assert {w["value"] for w in f["weaves"]} == {"fino", "superfino", "extrafino"}
    assert [s["code"] for s in f["sizes"]] == ["M", "L"]


def test_availability_states(anon, data):
    by_name = {i["name"]: i for i in anon.get("/api/products").json()["items"]}
    assert by_name["Agotado"]["availability"] == "out_of_stock"
    assert by_name["Extrafino Premium"]["availability"] == "low_stock"  
    assert by_name["Ala Ancha Fino"]["availability"] == "in_stock"


def test_search_is_accent_and_case_insensitive(anon, data):
    assert names(anon.get("/api/products", params={"q": "sandona"})) == ["Aguadeno Clasico", "Extrafino Premium"]
    assert names(anon.get("/api/products", params={"q": "SANDONÁ"})) == ["Aguadeno Clasico", "Extrafino Premium"]
    assert names(anon.get("/api/products", params={"q": "clásico"})) == ["Agotado", "Aguadeno Clasico"]
    assert anon.get("/api/products", params={"q": "zzzz"}).json()["total"] == 0


def test_search_matches_every_word(anon, data):
    assert names(anon.get("/api/products", params={"q": "sandona ala"})) == ["Extrafino Premium"]


def test_filters(anon, data):
    assert names(anon.get("/api/products", params={"category": "ala-ancha"})) == ["Ala Ancha Fino", "Extrafino Premium"]
    assert names(anon.get("/api/products", params={"color": data.color_ids["Miel"]})) == ["Aguadeno Clasico", "Extrafino Premium"]
    assert names(anon.get("/api/products", params={"size": "L"})) == ["Aguadeno Clasico", "Extrafino Premium"]
    assert names(anon.get("/api/products", params={"minPrice": 150000, "maxPrice": 250000})) == ["Aguadeno Clasico"]
    assert names(anon.get("/api/products", params={"weave": "extrafino"})) == ["Extrafino Premium"]
    in_stock = names(anon.get("/api/products", params={"inStock": "true"}))
    assert "Agotado" not in in_stock and len(in_stock) == 3
    # color + inStock applies to the same variant: Miel/M has no stock but Miel/L of premium does
    assert names(anon.get("/api/products", params={"color": data.color_ids["Miel"], "inStock": "true"})) == ["Extrafino Premium"]


def test_sorting_and_pagination(anon, data):
    asc = [i["priceCop"] for i in anon.get("/api/products", params={"sort": "price_asc"}).json()["items"]]
    assert asc == sorted(asc)
    desc = [i["priceCop"] for i in anon.get("/api/products", params={"sort": "price_desc"}).json()["items"]]
    assert desc == sorted(desc, reverse=True)
    page2 = anon.get("/api/products", params={"sort": "price_asc", "pageSize": 3, "page": 2}).json()
    assert page2["total"] == 4 and len(page2["items"]) == 1 and page2["items"][0]["priceCop"] == 300000


def test_detail(anon, data):
    r = anon.get("/api/products/aguadeno-clasico")
    assert r.status_code == 200
    d = r.json()
    assert d["sku"] == "CG-1" and d["fiber"].startswith("Iraca") and d["brimCm"] == 7.5
    assert d["images"][0]["url"] == "/images/CG-1.jpg"
    assert [s["code"] for s in d["sizes"]] == ["M", "L"]
    assert len(d["variants"]) == 3
    miel = next(v for v in d["variants"] if v["colorName"] == "Miel")
    assert miel["stock"] == 0 and miel["availability"] == "out_of_stock"
    assert d["artisan"]["municipality"] == "Sandoná" and d["artisan"]["yearsExperience"] == 20
    assert [x["name"] for x in d["related"]] == ["Agotado"]


def test_detail_not_found(anon, data):
    r = anon.get("/api/products/no-existe")
    assert r.status_code == 404 and r.json()["error"]["code"] == "NOT_FOUND"


def test_featured_categories_colors_sizes_artisan(anon, data):
    assert [p["name"] for p in anon.get("/api/products/featured").json()] == ["Aguadeno Clasico"]
    cats = anon.get("/api/categories").json()
    assert {c["slug"]: c["productCount"] for c in cats} == {"clasicos": 2, "ala-ancha": 2}
    assert len(anon.get("/api/colors").json()) == 3
    sizes = anon.get("/api/sizes").json()
    assert [s["code"] for s in sizes] == ["S", "M", "L", "XL"] and sizes[0]["headCmMin"] == 54
    a = anon.get(f"/api/artisans/{data.artisan_ids[0]}").json()
    assert a["fullName"] == "María Prueba" and len(a["products"]) == 2
