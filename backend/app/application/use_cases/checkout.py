from __future__ import annotations

from app.application.dto import AppConfig, PaymentIntent
from app.application.ports import Clock, PaymentGateway, UnitOfWorkFactory
from app.domain.entities import HistoryEntry, Order, OrderItem, Payment, ShippingInfo, User
from app.domain.errors import CartEmpty, OutOfStock
from app.domain.order_status import OrderStatus
from app.domain.pricing import compute_totals
from app.domain.validation import validate_shipping


class Checkout:
    def __init__(self, uow: UnitOfWorkFactory, gateway: PaymentGateway, clock: Clock, config: AppConfig):
        self._uow, self._gateway, self._clock, self._config = uow, gateway, clock, config

    def __call__(self, user: User, shipping: ShippingInfo) -> tuple[Order, PaymentIntent]:
        shipping = validate_shipping(shipping)
        now = self._clock.now()
        with self._uow() as uow:
            lines = uow.carts.list_lines(user.id)
            if not lines:
                raise CartEmpty()
            short = [
                {"variantId": l.variant.variant_id, "requested": l.quantity, "available": l.variant.stock}
                for l in lines if l.quantity > l.variant.stock
            ]
            if short:
                raise OutOfStock("Algunos productos de tu carrito ya no tienen stock suficiente.", {"items": short})
            items = [
                OrderItem(
                    variant_id=l.variant.variant_id, product_id=l.variant.product_id, product_name=l.variant.name,
                    product_slug=l.variant.slug, image_url=l.variant.image_url, size_code=l.variant.size_code,
                    color_name=l.variant.color_name, unit_price_cop=l.variant.unit_price_cop, quantity=l.quantity,
                )
                for l in lines
            ]
            totals = compute_totals(((i.unit_price_cop, i.quantity) for i in items), self._config.pricing)
            order = uow.orders.add(Order(
                id=None, number="", user_id=user.id, status=OrderStatus.PENDING.value, items=items, totals=totals,
                shipping=shipping, created_at=now,
                history=[HistoryEntry(None, OrderStatus.PENDING.value, "Pedido creado", now, user.id)],
            ))
            intent = self._gateway.create_payment(order.number, totals.total_cop)
            uow.payments.add(Payment(
                id=None, order_id=order.id, provider=intent.provider, reference=intent.reference,
                status="pending", amount_cop=totals.total_cop,
            ), now)
            uow.carts.clear(user.id)
            uow.commit()
            return uow.orders.get(order.id), intent
