from __future__ import annotations

from app.application.dto import AdminOrderFilters
from app.application.ports import Clock, UnitOfWorkFactory
from app.domain.entities import Order, OrderSummary, User
from app.domain.errors import NotFound, ValidationError
from app.domain.order_status import OrderStatus, allowed_transitions, ensure_transition, returns_stock
from app.domain.stock import apply_delta


class ListAdminOrders:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, filters: AdminOrderFilters) -> tuple[list[OrderSummary], int]:
        if filters.status and filters.status not in OrderStatus._value2member_map_:
            raise ValidationError("Estado no válido.")
        filters.page = max(filters.page, 1)
        with self._uow() as uow:
            return uow.orders.list_admin(filters)


class GetAdminOrder:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, order_id: int) -> tuple[Order, User, list[OrderStatus]]:
        with self._uow() as uow:
            order = uow.orders.get(order_id)
            if not order:
                raise NotFound("No encontramos este pedido.")
            customer = uow.users.get(order.user_id)
        return order, customer, allowed_transitions(order.status)


class TransitionOrder:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, admin: User, order_id: int, status: str, note: str | None = None) -> Order:
        if status not in OrderStatus._value2member_map_:
            raise ValidationError("Estado no válido.")
        now = self._clock.now()
        with self._uow() as uow:
            order = uow.orders.get(order_id, for_update=True)
            if not order:
                raise NotFound("No encontramos este pedido.")
            target = ensure_transition(order.status, status)
            if returns_stock(order.status, target):
                wanted: dict[int, int] = {}
                for item in order.items:
                    wanted[item.variant_id] = wanted.get(item.variant_id, 0) + item.quantity
                stocks = uow.inventory.lock_stock(list(wanted))
                for vid, qty in sorted(wanted.items()):
                    if vid not in stocks:
                        continue
                    uow.inventory.set_stock(vid, apply_delta(stocks[vid], qty))
                    uow.inventory.add_movement(
                        variant_id=vid, delta=qty, reason="cancellation", note=f"Cancelación pedido {order.number}",
                        user_id=admin.id, order_id=order.id, now=now,
                    )
            uow.orders.set_status(order.id, target.value, now)
            uow.orders.add_history(order.id, order.status, target.value, admin.id, (note or "").strip() or None, now)
            uow.commit()
            return uow.orders.get(order.id)
