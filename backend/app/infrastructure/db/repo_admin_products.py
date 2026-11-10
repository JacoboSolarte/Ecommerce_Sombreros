from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.dto import ProductInput
from app.domain.errors import NotFound, ValidationError
from app.infrastructure.db import mappers
from app.infrastructure.db.models import (
    ArtisanModel, CategoryModel, ColorModel, InventoryMovementModel, ProductImageModel, ProductModel as P,
    ProductVariantModel as V, SizeModel,
)


def slugify(text: str) -> str:
    folded = "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", folded).strip("-") or "producto"


class SqlAdminProductRepository:
    def __init__(self, session: Session, low_stock_threshold: int):
        self.s, self.low = session, low_stock_threshold

    def list_products(self, q: str | None, status: str, page: int, page_size: int) -> dict[str, Any]:
        stmt = select(P.id).join(CategoryModel, P.category_id == CategoryModel.id)
        if q:
            like = f"%{q.replace('%', '').replace('_', '')}%"
            stmt = stmt.where(or_(P.name.like(like), P.sku.like(like), CategoryModel.name.like(like)))
        if status == "active":
            stmt = stmt.where(P.is_active.is_(True))
        elif status == "inactive":
            stmt = stmt.where(P.is_active.is_(False))
        total = self.s.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        ids = list(self.s.scalars(stmt.order_by(P.updated_at.desc(), P.id.desc()).limit(page_size).offset((page - 1) * page_size)))
        products = {p.id: p for p in self.s.scalars(select(P).where(P.id.in_(ids)).options(*mappers.CARD_OPTIONS))}
        items = []
        for i in ids:
            p = products[i]
            items.append({
                "id": p.id, "sku": p.sku, "slug": p.slug, "name": p.name, "price_cop": p.price_cop,
                "category_name": p.category.name, "is_active": p.is_active,
                "total_stock": sum(v.stock for v in p.variants), "variant_count": len(p.variants),
                "image_url": p.images[0].url if p.images else None, "updated_at": p.updated_at,
            })
        return {"items": items, "total": total}

    def get_detail(self, product_id: int) -> dict[str, Any] | None:
        p = self.s.scalar(select(P).where(P.id == product_id).options(*mappers.DETAIL_OPTIONS)
                        .execution_options(populate_existing=True))
        return mappers.detail(p, self.low, admin=True) if p else None

    def _lookups(self, data: ProductInput) -> tuple[dict[str, SizeModel], set[int]]:
        if not self.s.get(CategoryModel, data.category_id):
            raise ValidationError("La categoría no existe.", {"fields": {"categoryId": "Categoría no válida."}})
        if not self.s.get(ArtisanModel, data.artisan_id):
            raise ValidationError("El artesano no existe.", {"fields": {"artisanId": "Artesano no válido."}})
        sizes = {z.code: z for z in self.s.scalars(select(SizeModel))}
        colors = set(self.s.scalars(select(ColorModel.id)))
        for v in data.variants:
            if v.size_code not in sizes or v.color_id not in colors:
                raise ValidationError("Talla o color no válidos.", {"fields": {"variants": "Talla o color no válidos."}})
        return sizes, colors

    def _apply_fields(self, p: P, data: ProductInput, now: datetime) -> None:
        p.sku, p.name = data.sku.strip(), data.name.strip()
        p.short_description, p.description = data.short_description.strip(), data.description.strip()
        p.price_cop, p.compare_at_price_cop = data.price_cop, data.compare_at_price_cop
        p.category_id, p.artisan_id, p.weave_grade = data.category_id, data.artisan_id, data.weave_grade
        p.weaving_hours, p.brim_cm = data.weaving_hours, data.brim_cm
        p.delivery_days_min, p.delivery_days_max = data.delivery_days_min, data.delivery_days_max
        p.is_featured, p.updated_at = data.is_featured, now

    def _movement(self, variant_id, delta, reason, note, user_id, now) -> None:
        self.s.add(InventoryMovementModel(variant_id=variant_id, delta=delta, reason=reason, note=note,
                                          user_id=user_id, created_at=now))

    def _unique_slug(self, name: str, exclude_id: int | None = None) -> str:
        base = slugify(name)
        slug, n = base, 2
        while True:
            hit = self.s.scalar(select(P.id).where(P.slug == slug))
            if hit is None or hit == exclude_id:
                return slug
            slug, n = f"{base}-{n}", n + 1

    def create(self, data: ProductInput, user_id: int, now: datetime) -> int:
        sizes, _ = self._lookups(data)
        p = P(slug=self._unique_slug(data.name), created_at=now, is_active=True, fiber="Iraca (Carludovica palmata)")
        self._apply_fields(p, data, now)
        p.images = [ProductImageModel(url=i.url, alt=i.alt, position=n) for n, i in enumerate(data.images)]
        self.s.add(p)
        try:
            self.s.flush()
        except IntegrityError as exc:
            raise ValidationError("Ya existe un producto con este SKU.", {"fields": {"sku": "SKU repetido."}}) from exc
        for v in data.variants:
            row = V(product_id=p.id, size_id=sizes[v.size_code].id, color_id=v.color_id,
                    sku=f"{p.sku}-{v.size_code}-{v.color_id}", stock=v.stock)
            self.s.add(row)
            self.s.flush()
            if v.stock:
                self._movement(row.id, v.stock, "initial", "Stock inicial", user_id, now)
        return p.id

    def update(self, product_id: int, data: ProductInput, user_id: int, now: datetime) -> None:
        sizes, _ = self._lookups(data)
        p = self.s.get(P, product_id, with_for_update=True)
        if not p:
            raise NotFound("No encontramos este producto.")
        renamed = slugify(data.name) != slugify(p.name)
        self._apply_fields(p, data, now)
        if renamed:
            p.slug = self._unique_slug(data.name, p.id)
        p.images = [ProductImageModel(url=i.url, alt=i.alt, position=n) for n, i in enumerate(data.images)]
        try:
            self.s.flush()
        except IntegrityError as exc:
            raise ValidationError("Ya existe un producto con este SKU.", {"fields": {"sku": "SKU repetido."}}) from exc

        existing = {(v.size.code, v.color_id): v for v in p.variants}
        wanted = {(v.size_code, v.color_id): v.stock for v in data.variants}
        for key, stock in wanted.items():
            row = existing.get(key)
            if row is None:
                row = V(product_id=p.id, size_id=sizes[key[0]].id, color_id=key[1], sku=f"{p.sku}-{key[0]}-{key[1]}", stock=stock)
                self.s.add(row)
                self.s.flush()
                if stock:
                    self._movement(row.id, stock, "initial", "Stock inicial", user_id, now)
            elif row.stock != stock:
                self._movement(row.id, stock - row.stock, "adjustment", "Edición del producto", user_id, now)
                row.stock = stock
        for key, row in existing.items():  # variants dropped from the form stay (history) but sell nothing
            if key not in wanted and row.stock:
                self._movement(row.id, -row.stock, "adjustment", "Variante retirada del producto", user_id, now)
                row.stock = 0
        self.s.flush()

    def set_active(self, product_id: int, active: bool, now: datetime) -> bool:
        p = self.s.get(P, product_id)
        if not p:
            return False
        p.is_active, p.updated_at = active, now
        self.s.flush()
        return True

    def list_categories(self) -> list[dict[str, Any]]:
        return [{"id": c.id, "name": c.name, "slug": c.slug}
                for c in self.s.scalars(select(CategoryModel).order_by(CategoryModel.sort_order))]

    def list_artisans(self) -> list[dict[str, Any]]:
        return [{"id": a.id, "full_name": a.full_name, "municipality": a.municipality}
                for a in self.s.scalars(select(ArtisanModel).order_by(ArtisanModel.full_name))]
