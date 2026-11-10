from __future__ import annotations

import itertools

from tests.factories import SHIPPING

_counter = itertools.count(1)


def register_customer(new_client):
    c = new_client()
    n = next(_counter)
    r = c.post("/api/auth/register", json={"fullName": f"Cliente {n}", "email": f"c{n}@test.co", "password": "Segura123"})
    assert r.status_code == 201, r.text
    return c


def add_to_cart(client, variant_id: int, quantity: int = 1):
    return client.post("/api/cart/items", json={"variantId": variant_id, "quantity": quantity})


def checkout(client, **overrides):
    return client.post("/api/checkout", json={"shipping": {**SHIPPING, **overrides}})


def place_order(client, items: list[tuple[int, int]]) -> dict:
    """Fills the cart and checks out; returns the checkout JSON."""
    for variant_id, qty in items:
        r = add_to_cart(client, variant_id, qty)
        assert r.status_code == 200, r.text
    r = checkout(client)
    assert r.status_code == 201, r.text
    return r.json()


def simulate(client, reference: str, outcome: str = "approved"):
    return client.post(f"/api/payments/{reference}/simulate", json={"outcome": outcome})


def buy(client, items: list[tuple[int, int]], outcome: str = "approved") -> dict:
    placed = place_order(client, items)
    r = simulate(client, placed["payment"]["reference"], outcome)
    assert r.status_code == 200, r.text
    return r.json()["order"]
