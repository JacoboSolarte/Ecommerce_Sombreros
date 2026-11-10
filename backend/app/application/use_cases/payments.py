from __future__ import annotations

from collections import defaultdict

from app.application.dto import AppConfig, PaymentIntent
from app.application.ports import Clock, PaymentGateway, UnitOfWorkFactory
from app.domain.entities import Order, Payment, User
from app.domain.errors import NotFound, OutOfStock, PaymentError
from app.domain.order_status import OrderStatus, ensure_transition
from app.domain.stock import apply_delta

NO_STOCK_NOTE = "Sin stock al confirmar el pago"


def _quantities(order: Order) -> dict[int, int]:
    totals: dict[int, int] = defaultdict(int)
    for item in order.items:
        totals[item.variant_id] += item.quantity
    return dict(totals)


class GetPayment:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, user: User, reference: str) -> tuple[Payment, Order]:
        with self._uow() as uow:
            payment = uow.payments.get_by_reference(reference)
            order = uow.orders.get(payment.order_id) if payment else None
        if not payment or not order or order.user_id != user.id:
            raise NotFound("No encontramos este pago.")
        return payment, order


class SimulatePayment:
    """Stands in for the provider webhook. The approved path is a single transaction."""

    def __init__(self, uow: UnitOfWorkFactory, gateway: PaymentGateway, clock: Clock):
        self._uow, self._gateway, self._clock = uow, gateway, clock

    def __call__(self, user: User, reference: str, outcome: str) -> tuple[Payment, Order]:
        result = self._gateway.resolve(outcome)
        now = self._clock.now()
        with self._uow() as uow:
            payment = uow.payments.get_by_reference(reference, for_update=True)
            order = uow.orders.get(payment.order_id, for_update=True) if payment else None
            if not payment or not order or (order.user_id != user.id and not user.is_admin):
                raise NotFound("No encontramos este pago.")
            if payment.status == "approved" and result.status == "approved":
                return payment, order  # idempotent
            if payment.status != "pending":
                raise PaymentError("Este pago ya fue procesado.")
            if order.status != OrderStatus.PENDING.value:
                raise PaymentError("Este pedido ya no admite pagos.")

            if result.status != "approved":
                payment.status, payment.provider_message = result.status, result.message
                uow.payments.update(payment, now)
                uow.commit()
                return payment, uow.orders.get(order.id)

            wanted = _quantities(order)
            stocks = uow.inventory.lock_stock(list(wanted))
            if any(stocks.get(vid, 0) < qty for vid, qty in wanted.items()):
                payment.status, payment.provider_message = "failed", NO_STOCK_NOTE
                uow.payments.update(payment, now)
                uow.orders.set_status(order.id, OrderStatus.CANCELLED.value, now)
                uow.orders.add_history(order.id, order.status, OrderStatus.CANCELLED.value, None, NO_STOCK_NOTE, now)
                uow.commit()
                return payment, uow.orders.get(order.id)

            for vid, qty in sorted(wanted.items()):
                uow.inventory.set_stock(vid, apply_delta(stocks[vid], -qty))
                uow.inventory.add_movement(
                    variant_id=vid, delta=-qty, reason="purchase", note=f"Pedido {order.number}",
                    user_id=order.user_id, order_id=order.id, now=now,
                )
            payment.status, payment.provider_message = "approved", result.message
            uow.payments.update(payment, now)
            ensure_transition(order.status, OrderStatus.PAID, manual=False)
            uow.orders.set_status(order.id, OrderStatus.PAID.value, now)
            uow.orders.add_history(order.id, order.status, OrderStatus.PAID.value, None, "Pago aprobado", now)
            uow.commit()
            return payment, uow.orders.get(order.id)


class RetryPayment:
    def __init__(self, uow: UnitOfWorkFactory, gateway: PaymentGateway, clock: Clock, config: AppConfig):
        self._uow, self._gateway, self._clock, self._config = uow, gateway, clock, config

    def __call__(self, user: User, order_id: int) -> PaymentIntent:
        now = self._clock.now()
        with self._uow() as uow:
            order = uow.orders.get(order_id, for_update=True)
            if not order or order.user_id != user.id:
                raise NotFound("No encontramos este pedido.")
            if order.status != OrderStatus.PENDING.value:
                raise PaymentError("Este pedido no admite un nuevo pago.")
            wanted = _quantities(order)
            stocks = uow.inventory.lock_stock(list(wanted))
            short = [{"variantId": v, "requested": q, "available": stocks.get(v, 0)}
                     for v, q in wanted.items() if stocks.get(v, 0) < q]
            if short:
                raise OutOfStock("Algunos productos de tu pedido ya no tienen stock suficiente.", {"items": short})
            intent = self._gateway.create_payment(order.number, order.totals.total_cop)
            uow.payments.add(Payment(
                id=None, order_id=order.id, provider=intent.provider, reference=intent.reference,
                status="pending", amount_cop=order.totals.total_cop,
            ), now)
            uow.commit()
            return intent
