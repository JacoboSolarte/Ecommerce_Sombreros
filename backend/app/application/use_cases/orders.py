from __future__ import annotations

from app.application.ports import UnitOfWorkFactory
from app.domain.entities import Order, OrderSummary, User
from app.domain.errors import NotFound


class ListMyOrders:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, user: User, sort: str = "date_desc") -> list[OrderSummary]:
        with self._uow() as uow:
            return uow.orders.list_for_user(user.id, newest_first=sort != "date_asc")


class GetOrder:
    """Owner or admin only; anyone else gets 404."""

    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, user: User, order_id: int) -> Order:
        with self._uow() as uow:
            order = uow.orders.get(order_id)
        if not order or (order.user_id != user.id and not user.is_admin):
            raise NotFound("No encontramos este pedido.")
        return order
