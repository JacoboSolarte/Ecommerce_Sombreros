from __future__ import annotations

import uuid
from datetime import datetime, timedelta, time

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.application.dto import AdminOrderFilters
from app.domain.entities import HistoryEntry, Order, OrderItem, OrderSummary, Payment, ShippingInfo
from app.domain.pricing import Totals
from app.infrastructure.db.models import (
    OrderItemModel, OrderModel, OrderStatusHistoryModel, PaymentModel, UserModel,
)

COLOMBIA_OFFSET = timedelta(hours=5)
_LOADS = (selectinload(OrderModel.items), selectinload(OrderModel.history), selectinload(OrderModel.payments))


def to_payment(m: PaymentModel) -> Payment:
    return Payment(id=m.id, order_id=m.order_id, provider=m.provider, reference=m.reference, status=m.status,
                   amount_cop=m.amount_cop, provider_message=m.provider_message, created_at=m.created_at)


def to_order(m: OrderModel) -> Order:
    return Order(
        id=m.id, number=m.number, user_id=m.user_id, status=m.status, created_at=m.created_at, updated_at=m.updated_at,
        items=[OrderItem(variant_id=i.variant_id, product_id=i.product_id, product_name=i.product_name,
                         product_slug=i.product_slug, image_url=i.image_url, size_code=i.size_code,
                         color_name=i.color_name, unit_price_cop=i.unit_price_cop, quantity=i.quantity) for i in m.items],
        totals=Totals(m.total_items_cop, m.subtotal_cop, m.tax_cop, m.shipping_cop, m.total_cop, 0),
        shipping=ShippingInfo(full_name=m.ship_full_name, phone=m.ship_phone, address_line=m.ship_address_line,
                              address_extra=m.ship_address_extra, city=m.ship_city, department=m.ship_department,
                              postal_code=m.ship_postal_code, notes=m.ship_notes),
        history=[HistoryEntry(h.from_status, h.to_status, h.note, h.created_at, h.changed_by_user_id) for h in m.history],
        payments=[to_payment(p) for p in m.payments],
    )


def _summary(m: OrderModel, with_customer: bool = False) -> OrderSummary:
    return OrderSummary(
        id=m.id, number=m.number, created_at=m.created_at, status=m.status, total_cop=m.total_cop,
        item_count=sum(i.quantity for i in m.items), first_item_image_url=m.items[0].image_url if m.items else None,
        customer_name=m.user.full_name if with_customer else None,
        customer_email=m.user.email if with_customer else None,
    )


class SqlOrderRepository:
    def __init__(self, session: Session, free_shipping_from_cop: int = 0):
        self.s = session
        self.free_from = free_shipping_from_cop

    def add(self, order: Order) -> Order:
        t, sh = order.totals, order.shipping
        m = OrderModel(
            number=f"TMP-{uuid.uuid4().hex[:20]}", user_id=order.user_id, status=order.status,
            total_items_cop=t.total_items_cop, subtotal_cop=t.subtotal_cop, tax_cop=t.tax_cop,
            shipping_cop=t.shipping_cop, total_cop=t.total_cop, ship_full_name=sh.full_name, ship_phone=sh.phone,
            ship_address_line=sh.address_line, ship_address_extra=sh.address_extra, ship_city=sh.city,
            ship_department=sh.department, ship_postal_code=sh.postal_code, ship_notes=sh.notes,
            created_at=order.created_at, updated_at=order.created_at,
            items=[OrderItemModel(variant_id=i.variant_id, product_id=i.product_id, product_name=i.product_name,
                                  product_slug=i.product_slug, image_url=i.image_url, size_code=i.size_code,
                                  color_name=i.color_name, unit_price_cop=i.unit_price_cop, quantity=i.quantity,
                                  line_total_cop=i.line_total_cop) for i in order.items],
            history=[OrderStatusHistoryModel(from_status=h.from_status, to_status=h.to_status, note=h.note,
                                             created_at=h.created_at, changed_by_user_id=h.changed_by_user_id)
                     for h in order.history],
        )
        self.s.add(m)
        self.s.flush()
        m.number = f"CG-{m.id:06d}"
        self.s.flush()
        order.id, order.number = m.id, m.number
        return order

    def get(self, order_id: int, for_update: bool = False) -> Order | None:
        stmt = select(OrderModel).where(OrderModel.id == order_id).options(*_LOADS).execution_options(populate_existing=True)
        if for_update:
            stmt = stmt.with_for_update()
        m = self.s.scalar(stmt)
        if not m:
            return None
        order = to_order(m)
        order.totals = Totals(**{**order.totals.__dict__, "free_shipping_from_cop": self.free_from})
        return order

    def list_for_user(self, user_id: int, newest_first: bool) -> list[OrderSummary]:
        order = OrderModel.created_at.desc() if newest_first else OrderModel.created_at.asc()
        stmt = select(OrderModel).where(OrderModel.user_id == user_id).order_by(order, OrderModel.id.desc()).options(selectinload(OrderModel.items))
        return [_summary(m) for m in self.s.scalars(stmt)]

    def list_admin(self, f: AdminOrderFilters) -> tuple[list[OrderSummary], int]:
        stmt = select(OrderModel.id).join(UserModel, OrderModel.user_id == UserModel.id)
        if f.status:
            stmt = stmt.where(OrderModel.status == f.status)
        if f.date_from:
            stmt = stmt.where(OrderModel.created_at >= datetime.combine(f.date_from, time.min) + COLOMBIA_OFFSET)
        if f.date_to:
            stmt = stmt.where(OrderModel.created_at < datetime.combine(f.date_to + timedelta(days=1), time.min) + COLOMBIA_OFFSET)
        if f.q:
            like = f"%{f.q.replace('%', '').replace('_', '')}%"
            stmt = stmt.where(or_(OrderModel.number.like(like), UserModel.full_name.like(like), UserModel.email.like(like)))
        total = self.s.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        ids = list(self.s.scalars(stmt.order_by(OrderModel.created_at.desc(), OrderModel.id.desc())
                                  .limit(f.page_size).offset((f.page - 1) * f.page_size)))
        rows = {m.id: m for m in self.s.scalars(
            select(OrderModel).where(OrderModel.id.in_(ids)).options(selectinload(OrderModel.items), selectinload(OrderModel.user)))}
        return [_summary(rows[i], with_customer=True) for i in ids], total

    def set_status(self, order_id: int, status: str, now: datetime) -> None:
        m = self.s.get(OrderModel, order_id)
        m.status, m.updated_at = status, now
        self.s.flush()

    def add_history(self, order_id, from_status, to_status, user_id, note, now) -> None:
        self.s.add(OrderStatusHistoryModel(order_id=order_id, from_status=from_status, to_status=to_status,
                                           changed_by_user_id=user_id, note=note, created_at=now))
        self.s.flush()


class SqlPaymentRepository:
    def __init__(self, session: Session):
        self.s = session

    def add(self, payment: Payment, now: datetime) -> Payment:
        m = PaymentModel(order_id=payment.order_id, provider=payment.provider, reference=payment.reference,
                         status=payment.status, amount_cop=payment.amount_cop,
                         provider_message=payment.provider_message, created_at=now, updated_at=now)
        self.s.add(m)
        self.s.flush()
        return to_payment(m)

    def get_by_reference(self, reference: str, for_update: bool = False) -> Payment | None:
        stmt = select(PaymentModel).where(PaymentModel.reference == reference).execution_options(populate_existing=True)
        if for_update:
            stmt = stmt.with_for_update()
        m = self.s.scalar(stmt)
        return to_payment(m) if m else None

    def update(self, payment: Payment, now: datetime) -> None:
        m = self.s.get(PaymentModel, payment.id)
        m.status, m.provider_message, m.updated_at = payment.status, payment.provider_message, now
        self.s.flush()
