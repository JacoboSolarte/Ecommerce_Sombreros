"""Order state machine."""
from __future__ import annotations

from enum import StrEnum

from app.domain.errors import InvalidTransition


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


LABELS = {
    "pending": "Pendiente", "paid": "Pagado", "preparing": "Preparando",
    "shipped": "Enviado", "delivered": "Entregado", "cancelled": "Cancelado",
}

TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.PENDING: frozenset({OrderStatus.PAID, OrderStatus.CANCELLED}),
    OrderStatus.PAID: frozenset({OrderStatus.PREPARING, OrderStatus.CANCELLED}),
    OrderStatus.PREPARING: frozenset({OrderStatus.SHIPPED, OrderStatus.CANCELLED}),
    OrderStatus.SHIPPED: frozenset({OrderStatus.DELIVERED}),
    OrderStatus.DELIVERED: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}

REVENUE_STATUSES = (OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.DELIVERED)
STOCK_RETURNING = (OrderStatus.PAID, OrderStatus.PREPARING)  # cancelling from these returns stock


def allowed_transitions(status: OrderStatus | str, *, manual: bool = True) -> list[OrderStatus]:
    """Next statuses. `manual=True` excludes pending->paid, which only a payment can do."""
    targets = TRANSITIONS[OrderStatus(status)]
    if manual:
        targets = targets - {OrderStatus.PAID}
    return sorted(targets, key=list(OrderStatus).index)


def ensure_transition(current: OrderStatus | str, target: OrderStatus | str, *, manual: bool = True) -> OrderStatus:
    cur, tgt = OrderStatus(current), OrderStatus(target)
    if tgt not in allowed_transitions(cur, manual=manual):
        raise InvalidTransition(
            f"No se puede pasar de {LABELS[cur]} a {LABELS[tgt]}.",
            {"from": cur.value, "to": tgt.value},
        )
    return tgt


def returns_stock(current: OrderStatus | str, target: OrderStatus | str) -> bool:
    return OrderStatus(target) is OrderStatus.CANCELLED and OrderStatus(current) in STOCK_RETURNING
