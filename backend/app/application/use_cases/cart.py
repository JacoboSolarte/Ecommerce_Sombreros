from __future__ import annotations

from app.application.dto import AppConfig, CartItemView, CartLine, CartView
from app.application.ports import Clock, UnitOfWork, UnitOfWorkFactory
from app.domain.entities import User
from app.domain.errors import NotFound, OutOfStock
from app.domain.pricing import compute_totals
from app.domain.stock import availability


def build_cart_view(lines: list[CartLine], config: AppConfig) -> CartView:
    items = [
        CartItemView(
            id=l.item_id, variant_id=l.variant.variant_id, product_id=l.variant.product_id, slug=l.variant.slug,
            name=l.variant.name, image_url=l.variant.image_url, size_code=l.variant.size_code,
            color_name=l.variant.color_name, color_hex=l.variant.color_hex, unit_price_cop=l.variant.unit_price_cop,
            quantity=l.quantity, line_total_cop=l.variant.unit_price_cop * l.quantity, stock=l.variant.stock,
            availability=availability(l.variant.stock, config.low_stock_threshold),
        )
        for l in lines
    ]
    totals = compute_totals(((i.unit_price_cop, i.quantity) for i in items), config.pricing)
    return CartView(items=items, totals=totals, item_count=sum(i.quantity for i in items))


class _CartUseCase:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock, config: AppConfig):
        self._uow, self._clock, self._config = uow, clock, config

    def _view(self, uow: UnitOfWork, user: User) -> CartView:
        return build_cart_view(uow.carts.list_lines(user.id), self._config)


class GetCart(_CartUseCase):
    def __call__(self, user: User) -> CartView:
        with self._uow() as uow:
            return self._view(uow, user)


class AddToCart(_CartUseCase):
    def __call__(self, user: User, variant_id: int, quantity: int) -> CartView:
        with self._uow() as uow:
            variant = uow.carts.get_variant(variant_id)
            if not variant:
                raise NotFound("Esta variante ya no está disponible.")
            existing = uow.carts.find_by_variant(user.id, variant_id)
            in_cart = existing.quantity if existing else 0
            if in_cart + quantity > variant.stock:
                raise OutOfStock(
                    f"Solo quedan {variant.stock} unidades disponibles.",
                    {"available": variant.stock, "inCart": in_cart},
                )
            uow.carts.set_variant_quantity(user.id, variant_id, in_cart + quantity, self._clock.now())
            uow.commit()
            return self._view(uow, user)


class UpdateCartItem(_CartUseCase):
    def __call__(self, user: User, item_id: int, quantity: int) -> CartView:
        with self._uow() as uow:
            line = uow.carts.get_item(user.id, item_id)
            if not line:
                raise NotFound("Este producto ya no está en tu carrito.")
            if quantity > line.variant.stock:
                raise OutOfStock(
                    f"Solo quedan {line.variant.stock} unidades disponibles.", {"available": line.variant.stock}
                )
            uow.carts.set_item_quantity(item_id, quantity, self._clock.now())
            uow.commit()
            return self._view(uow, user)


class RemoveCartItem(_CartUseCase):
    def __call__(self, user: User, item_id: int) -> CartView:
        with self._uow() as uow:
            uow.carts.remove_item(user.id, item_id, self._clock.now())
            uow.commit()
            return self._view(uow, user)


class MergeCart(_CartUseCase):
    def __call__(self, user: User, items: list[tuple[int, int]]) -> CartView:
        wanted: dict[int, int] = {}
        for variant_id, qty in items:
            wanted[variant_id] = wanted.get(variant_id, 0) + max(qty, 0)
        with self._uow() as uow:
            variants = uow.carts.get_variants(list(wanted))
            for variant_id, qty in wanted.items():
                variant = variants.get(variant_id)
                if not variant or variant.stock <= 0 or qty <= 0:
                    continue
                existing = uow.carts.find_by_variant(user.id, variant_id)
                total = min((existing.quantity if existing else 0) + qty, variant.stock)
                uow.carts.set_variant_quantity(user.id, variant_id, total, self._clock.now())
            uow.commit()
            return self._view(uow, user)


class QuoteCart(_CartUseCase):
    """Prices a guest cart without persisting anything."""

    def __call__(self, items: list[tuple[int, int]]) -> CartView:
        wanted: dict[int, int] = {}
        for variant_id, qty in items:
            wanted[variant_id] = wanted.get(variant_id, 0) + max(qty, 0)
        with self._uow() as uow:
            variants = uow.carts.get_variants(list(wanted))
        lines = [CartLine(item_id=vid, variant=variants[vid], quantity=qty)
                 for vid, qty in wanted.items() if vid in variants and qty > 0]
        return build_cart_view(lines, self._config)
