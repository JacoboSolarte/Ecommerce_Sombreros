from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends

from app.application.use_cases import orders as orders_uc
from app.application.use_cases import payments as pay_uc
from app.application.use_cases.checkout import Checkout
from app.container import Container
from app.domain.entities import ShippingInfo, User
from app.presentation.deps import get_container, get_current_user
from app.presentation.schemas import (
    CheckoutIn, CheckoutOut, OrderOut, OrderSummaryOut, PaymentIntentOut, PaymentOut, PaymentStatusOut, SimulateIn,
    SimulateOut,
)

router = APIRouter(tags=["orders"])


@router.post("/checkout", response_model=CheckoutOut, status_code=201)
def checkout(body: CheckoutIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    s = body.shipping
    shipping = ShippingInfo(
        full_name=s.full_name, phone=s.phone, address_line=s.address_line, address_extra=s.address_extra,
        city=s.city, department=s.department, postal_code=s.postal_code, notes=s.notes,
    )
    order, intent = Checkout(c.uow, c.gateway, c.clock, c.config)(user, shipping)
    return CheckoutOut(order=OrderOut.model_validate(order),
                       payment=PaymentIntentOut(reference=intent.reference, redirect_url=intent.redirect_url))


@router.get("/payments/{reference}", response_model=PaymentStatusOut)
def payment_status(reference: str, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    payment, order = pay_uc.GetPayment(c.uow)(user, reference)
    return PaymentStatusOut(reference=payment.reference, status=payment.status, amount_cop=payment.amount_cop,
                            order_number=order.number, order_id=order.id)


@router.post("/payments/{reference}/simulate", response_model=SimulateOut)
def simulate(reference: str, body: SimulateIn, user: User = Depends(get_current_user),
             c: Container = Depends(get_container)):
    payment, order = pay_uc.SimulatePayment(c.uow, c.gateway, c.clock)(user, reference, body.outcome)
    return SimulateOut(payment=PaymentOut.model_validate(payment), order=OrderOut.model_validate(order))


@router.post("/orders/{order_id}/pay", response_model=PaymentIntentOut)
def retry_payment(order_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    intent = pay_uc.RetryPayment(c.uow, c.gateway, c.clock, c.config)(user, order_id)
    return PaymentIntentOut(reference=intent.reference, redirect_url=intent.redirect_url)


@router.get("/orders", response_model=list[OrderSummaryOut])
def my_orders(sort: Literal["date_desc", "date_asc"] = "date_desc", user: User = Depends(get_current_user),
              c: Container = Depends(get_container)):
    return [OrderSummaryOut.model_validate(o) for o in orders_uc.ListMyOrders(c.uow)(user, sort)]


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return OrderOut.model_validate(orders_uc.GetOrder(c.uow)(user, order_id))
