from __future__ import annotations

from fastapi import APIRouter, Depends

from app.application.use_cases import cart as uc
from app.container import Container
from app.domain.entities import User
from app.presentation.deps import get_container, get_current_user
from app.presentation.schemas import CartBulkIn, CartItemIn, CartOut, CartQuantityIn

router = APIRouter(prefix="/cart", tags=["cart"])


def _out(view) -> CartOut:
    return CartOut.model_validate(view)


@router.get("", response_model=CartOut)
def get_cart(user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return _out(uc.GetCart(c.uow, c.clock, c.config)(user))


@router.post("/items", response_model=CartOut)
def add_item(body: CartItemIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return _out(uc.AddToCart(c.uow, c.clock, c.config)(user, body.variant_id, body.quantity))


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(item_id: int, body: CartQuantityIn, user: User = Depends(get_current_user),
                c: Container = Depends(get_container)):
    return _out(uc.UpdateCartItem(c.uow, c.clock, c.config)(user, item_id, body.quantity))


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(item_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return _out(uc.RemoveCartItem(c.uow, c.clock, c.config)(user, item_id))


@router.post("/merge", response_model=CartOut)
def merge(body: CartBulkIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return _out(uc.MergeCart(c.uow, c.clock, c.config)(user, [(i.variant_id, i.quantity) for i in body.items]))


@router.post("/quote", response_model=CartOut)
def quote(body: CartBulkIn, c: Container = Depends(get_container)):
    return _out(uc.QuoteCart(c.uow, c.clock, c.config)([(i.variant_id, i.quantity) for i in body.items]))
