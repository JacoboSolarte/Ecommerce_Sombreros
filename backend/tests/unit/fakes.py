"""In-memory implementations of the application ports (with transaction rollback semantics)."""
from __future__ import annotations

import copy
import itertools
from datetime import datetime

from app.application.dto import (
    AppConfig, GatewayResult, IssuedToken, PaymentIntent, TokenClaims, VariantInfo, CartLine,
)
from app.domain.entities import HistoryEntry, Order, Payment, User
from app.domain.errors import NotAuthenticated, PaymentError
from app.domain.pricing import PricingPolicy, Totals

from decimal import Decimal

NOW = datetime(2026, 10, 27, 12, 0, 0)


class FixedClock:
    def now(self) -> datetime:
        return NOW


class FakeHasher:
    def hash(self, password: str) -> str:
        return f"hashed:{password}"

    def verify(self, password: str, hashed: str) -> bool:
        return hashed == f"hashed:{password}"


class FakeTokens:
    def __init__(self):
        self._n = itertools.count(1)

    def issue(self, user_id: int, role: str) -> IssuedToken:
        n = next(self._n)
        return IssuedToken(token=f"{user_id}:{role}:jti{n}", jti=f"jti{n}", expires_at=NOW)

    def decode(self, token: str) -> TokenClaims:
        try:
            uid, role, jti = token.split(":")
            return TokenClaims(int(uid), role, jti, NOW)
        except ValueError as exc:
            raise NotAuthenticated() from exc


class FakeGateway:
    provider = "fake"

    def __init__(self):
        self._n = itertools.count(1)

    def create_payment(self, order_number: str, amount_cop: int) -> PaymentIntent:
        ref = f"REF-{next(self._n)}"
        return PaymentIntent(ref, f"http://front/pago?ref={ref}", self.provider)

    def resolve(self, outcome: str) -> GatewayResult:
        if outcome not in ("approved", "declined", "failed"):
            raise PaymentError("bad outcome")
        return GatewayResult(outcome, outcome)


class Store:
    """All persisted state; the UoW snapshots it so uncommitted changes are rolled back."""

    def __init__(self):
        self.users: dict[int, User] = {}
        self.revoked: set[str] = set()
        self.variants: dict[int, VariantInfo] = {}
        self.carts: dict[int, dict[int, tuple[int, int]]] = {}  # user -> item_id -> (variant_id, qty)
        self.orders: dict[int, Order] = {}
        self.payments: dict[int, Payment] = {}
        self.movements: list[dict] = []
        self.audit: list[dict] = []
        self.ids = itertools.count(1)

    def state(self):
        return copy.deepcopy({k: v for k, v in self.__dict__.items() if k != "ids"})

    def restore(self, snap):
        self.__dict__.update(copy.deepcopy(snap))

    def add_variant(self, variant_id: int, price: int, stock: int, name="Sombrero", product_id=1) -> None:
        self.variants[variant_id] = VariantInfo(variant_id, product_id, name.lower(), name, "/img.jpg", "M", "Natural",
                                                "#D9C59A", price, stock)


class _Users:
    def __init__(self, s: Store): self.s = s
    def add(self, user):
        user.id = next(self.s.ids)
        self.s.users[user.id] = copy.deepcopy(user)
        return copy.deepcopy(user)
    def get(self, uid): return copy.deepcopy(self.s.users.get(uid))
    def get_by_email(self, email): return next((copy.deepcopy(u) for u in self.s.users.values() if u.email == email), None)
    def update(self, user, now): self.s.users[user.id] = copy.deepcopy(user); return user


class _Tokens:
    def __init__(self, s): self.s = s
    def revoke(self, jti, expires_at): self.s.revoked.add(jti)
    def is_revoked(self, jti): return jti in self.s.revoked


class _Audit:
    def __init__(self, s): self.s = s
    def add(self, **kw): self.s.audit.append(kw)


class _Carts:
    def __init__(self, s): self.s = s
    def get_variant(self, vid): return copy.deepcopy(self.s.variants.get(vid))
    def get_variants(self, ids): return {i: copy.deepcopy(self.s.variants[i]) for i in ids if i in self.s.variants}
    def _line(self, item_id, variant_id, qty): return CartLine(item_id, copy.deepcopy(self.s.variants[variant_id]), qty)
    def list_lines(self, uid): return [self._line(i, v, q) for i, (v, q) in self.s.carts.get(uid, {}).items()]
    def find_by_variant(self, uid, vid):
        return next((self._line(i, v, q) for i, (v, q) in self.s.carts.get(uid, {}).items() if v == vid), None)
    def get_item(self, uid, item_id):
        item = self.s.carts.get(uid, {}).get(item_id)
        return self._line(item_id, *item) if item else None
    def set_variant_quantity(self, uid, vid, qty, now):
        cart = self.s.carts.setdefault(uid, {})
        for i, (v, _) in cart.items():
            if v == vid:
                cart[i] = (v, qty)
                return
        cart[next(self.s.ids)] = (vid, qty)
    def set_item_quantity(self, item_id, qty, now):
        for cart in self.s.carts.values():
            if item_id in cart:
                cart[item_id] = (cart[item_id][0], qty)
    def remove_item(self, uid, item_id, now): self.s.carts.get(uid, {}).pop(item_id, None)
    def clear(self, uid): self.s.carts[uid] = {}


class _Orders:
    def __init__(self, s): self.s = s
    def add(self, order):
        order.id = next(self.s.ids)
        order.number = f"CG-{order.id:06d}"
        self.s.orders[order.id] = copy.deepcopy(order)
        return order
    def get(self, oid, for_update=False):
        o = copy.deepcopy(self.s.orders.get(oid))
        if o:
            o.payments = [copy.deepcopy(p) for p in self.s.payments.values() if p.order_id == oid]
        return o
    def set_status(self, oid, status, now): self.s.orders[oid].status = status
    def add_history(self, oid, frm, to, uid, note, now): self.s.orders[oid].history.append(HistoryEntry(frm, to, note, now, uid))


class _Payments:
    def __init__(self, s): self.s = s
    def add(self, payment, now):
        payment.id = next(self.s.ids)
        self.s.payments[payment.id] = copy.deepcopy(payment)
        return payment
    def get_by_reference(self, ref, for_update=False):
        return next((copy.deepcopy(p) for p in self.s.payments.values() if p.reference == ref), None)
    def update(self, payment, now): self.s.payments[payment.id] = copy.deepcopy(payment)


class _Inventory:
    def __init__(self, s): self.s = s
    def lock_stock(self, ids): return {i: self.s.variants[i].stock for i in sorted(ids) if i in self.s.variants}
    def set_stock(self, vid, stock):
        assert stock >= 0, "the database CHECK would reject this"
        self.s.variants[vid].stock = stock
    def add_movement(self, **kw): self.s.movements.append(kw)
    def get_row(self, vid):
        v = self.s.variants.get(vid)
        return {"variant_id": vid, "stock": v.stock} if v else None


class FakeUoW:
    def __init__(self, store: Store):
        self.store = store
        self.users, self.tokens, self.audit = _Users(store), _Tokens(store), _Audit(store)
        self.carts, self.orders, self.payments = _Carts(store), _Orders(store), _Payments(store)
        self.inventory = _Inventory(store)

    def __enter__(self):
        self._snap = self.store.state()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.store.restore(self._snap)  # discard anything not committed

    def commit(self):
        self._snap = self.store.state()

    def rollback(self):
        self.store.restore(self._snap)


def make_config() -> AppConfig:
    return AppConfig(PricingPolicy(Decimal("0.19"), 12000, 250000), 3, "http://front")


def make_totals() -> Totals:
    return Totals(0, 0, 0, 0, 0, 250000)
