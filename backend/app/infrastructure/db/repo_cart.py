from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.application.dto import CartLine, VariantInfo
from app.infrastructure.db.models import CartItemModel, CartModel, ProductModel, ProductVariantModel as V

_VARIANT_OPTS = (
    joinedload(V.product).selectinload(ProductModel.images),
    joinedload(V.size),
    joinedload(V.color),
)


def variant_info(v: V) -> VariantInfo:
    return VariantInfo(
        variant_id=v.id, product_id=v.product_id, slug=v.product.slug, name=v.product.name,
        image_url=v.product.images[0].url if v.product.images else None, size_code=v.size.code,
        color_name=v.color.name, color_hex=v.color.hex, unit_price_cop=v.product.price_cop,
        stock=v.stock if v.product.is_active else 0,
    )


class SqlCartRepository:
    def __init__(self, session: Session):
        self.s = session

    def get_variant(self, variant_id: int) -> VariantInfo | None:
        v = self.s.scalar(select(V).where(V.id == variant_id).options(*_VARIANT_OPTS))
        return variant_info(v) if v else None

    def get_variants(self, variant_ids: list[int]) -> dict[int, VariantInfo]:
        if not variant_ids:
            return {}
        rows = self.s.scalars(select(V).where(V.id.in_(variant_ids)).options(*_VARIANT_OPTS))
        return {v.id: variant_info(v) for v in rows}

    def _cart(self, user_id: int, now: datetime | None = None, create: bool = False) -> CartModel | None:
        cart = self.s.scalar(select(CartModel).where(CartModel.user_id == user_id))
        if cart is None and create:
            cart = CartModel(user_id=user_id, updated_at=now)
            self.s.add(cart)
            self.s.flush()
        return cart

    def _lines(self, user_id: int, *conds) -> list[CartLine]:
        stmt = (
            select(CartItemModel).join(CartModel, CartItemModel.cart_id == CartModel.id)
            .where(CartModel.user_id == user_id, *conds).order_by(CartItemModel.id)
            .options(joinedload(CartItemModel.variant).options(*_VARIANT_OPTS))
        )
        return [CartLine(item_id=i.id, variant=variant_info(i.variant), quantity=i.quantity)
                for i in self.s.scalars(stmt).unique()]

    def list_lines(self, user_id: int) -> list[CartLine]:
        return self._lines(user_id)

    def find_by_variant(self, user_id: int, variant_id: int) -> CartLine | None:
        lines = self._lines(user_id, CartItemModel.variant_id == variant_id)
        return lines[0] if lines else None

    def get_item(self, user_id: int, item_id: int) -> CartLine | None:
        lines = self._lines(user_id, CartItemModel.id == item_id)
        return lines[0] if lines else None

    def set_variant_quantity(self, user_id: int, variant_id: int, quantity: int, now: datetime) -> None:
        cart = self._cart(user_id, now, create=True)
        item = self.s.scalar(select(CartItemModel).where(CartItemModel.cart_id == cart.id, CartItemModel.variant_id == variant_id))
        if item:
            item.quantity = quantity
        else:
            self.s.add(CartItemModel(cart_id=cart.id, variant_id=variant_id, quantity=quantity))
        cart.updated_at = now
        self.s.flush()

    def set_item_quantity(self, item_id: int, quantity: int, now: datetime) -> None:
        item = self.s.get(CartItemModel, item_id)
        item.quantity = quantity
        item.cart.updated_at = now
        self.s.flush()

    def remove_item(self, user_id: int, item_id: int, now: datetime) -> None:
        item = self.s.scalar(
            select(CartItemModel).join(CartModel, CartItemModel.cart_id == CartModel.id)
            .where(CartModel.user_id == user_id, CartItemModel.id == item_id)
        )
        if item:
            item.cart.updated_at = now
            self.s.delete(item)
            self.s.flush()

    def clear(self, user_id: int) -> None:
        cart = self._cart(user_id)
        if cart:
            self.s.execute(delete(CartItemModel).where(CartItemModel.cart_id == cart.id))
            self.s.expire(cart, ["items"])
