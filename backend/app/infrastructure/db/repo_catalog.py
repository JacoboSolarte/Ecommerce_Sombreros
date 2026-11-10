from __future__ import annotations

from typing import Any

from sqlalchemy import Select, and_, case, distinct, func, or_, select
from sqlalchemy.orm import Session

from app.application.dto import ProductFilters
from app.infrastructure.db import mappers
from app.infrastructure.db.models import (
    ArtisanModel, CategoryModel, ColorModel, ProductModel, ProductVariantModel as V, SizeModel,
)

P = ProductModel


def _escape(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _text_clause(q: str):
    """Every word must match somewhere; accents/case ignored by the utf8mb4_0900_ai_ci collation."""
    clauses = []
    for term in q.split():
        like = f"%{_escape(term)}%"
        clauses.append(or_(
            P.name.like(like, escape="\\"), P.short_description.like(like, escape="\\"),
            P.description.like(like, escape="\\"), CategoryModel.name.like(like, escape="\\"),
            ArtisanModel.municipality.like(like, escape="\\"),
        ))
    return and_(*clauses)


class SqlCatalogRepository:
    def __init__(self, session: Session, low_stock_threshold: int):
        self.s, self.low = session, low_stock_threshold

    def list_categories(self) -> list[dict[str, Any]]:
        counts = dict(self.s.execute(
            select(P.category_id, func.count()).where(P.is_active.is_(True)).group_by(P.category_id)
        ).all())
        cats = self.s.scalars(select(CategoryModel).order_by(CategoryModel.sort_order, CategoryModel.id)).all()
        return [{"id": c.id, "name": c.name, "slug": c.slug, "description": c.description, "image_url": c.image_url,
                 "product_count": counts.get(c.id, 0)} for c in cats]

    def list_colors(self) -> list[dict[str, Any]]:
        return [{"id": c.id, "name": c.name, "hex": c.hex} for c in self.s.scalars(select(ColorModel).order_by(ColorModel.id))]

    def list_sizes(self) -> list[dict[str, Any]]:
        return [{"id": z.id, "code": z.code, "label": z.label, "head_cm_min": z.head_cm_min, "head_cm_max": z.head_cm_max}
                for z in self.s.scalars(select(SizeModel).order_by(SizeModel.sort_order))]

    def _base(self, stmt: Select) -> Select:
        return stmt.select_from(P).join(CategoryModel, P.category_id == CategoryModel.id) \
            .join(ArtisanModel, P.artisan_id == ArtisanModel.id).where(P.is_active.is_(True))

    def search_products(self, f: ProductFilters) -> dict[str, Any]:
        text = _text_clause(f.q) if f.q else None
        stmt = self._base(select(P.id))
        if text is not None:
            stmt = stmt.where(text)
        if f.category:
            stmt = stmt.where(CategoryModel.slug == f.category)
        if f.min_price is not None:
            stmt = stmt.where(P.price_cop >= f.min_price)
        if f.max_price is not None:
            stmt = stmt.where(P.price_cop <= f.max_price)
        if f.weave:
            stmt = stmt.where(P.weave_grade == f.weave)
        variant_conds = []
        if f.color:
            variant_conds.append(V.color_id == f.color)
        if f.size:
            variant_conds.append(V.size_id.in_(select(SizeModel.id).where(SizeModel.code == f.size.upper())))
        if f.in_stock:
            variant_conds.append(V.stock > 0)
        if variant_conds:
            stmt = stmt.where(P.variants.any(and_(*variant_conds)))

        total = self.s.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        if f.sort == "price_asc":
            order = (P.price_cop.asc(), P.id.asc())
        elif f.sort == "price_desc":
            order = (P.price_cop.desc(), P.id.asc())
        elif f.sort == "newest":
            order = (P.created_at.desc(), P.id.desc())
        elif f.q:
            order = (case((P.name.like(f"%{_escape(f.q)}%", escape="\\"), 0), else_=1), P.is_featured.desc(), P.id.asc())
        else:
            order = (P.is_featured.desc(), P.id.asc())
        ids = list(self.s.scalars(stmt.order_by(*order).limit(f.page_size).offset((f.page - 1) * f.page_size)))
        products = {p.id: p for p in self.s.scalars(select(P).where(P.id.in_(ids)).options(*mappers.CARD_OPTIONS))}
        items = [mappers.card(products[i], self.low) for i in ids if i in products]
        return {"items": items, "total": total, "page": f.page, "page_size": f.page_size,
                "facets": self._facets(text)}

    def _facets(self, text) -> dict[str, Any]:
        """Facets describe the whole matching set for the text query, so filters stay switchable."""
        base = self._base(select(P.id))
        if text is not None:
            base = base.where(text)
        ids = base.correlate(None).scalar_subquery()
        cats = self.s.execute(
            select(CategoryModel.slug, CategoryModel.name, func.count(P.id))
            .join(P, P.category_id == CategoryModel.id).where(P.id.in_(ids), P.is_active.is_(True))
            .group_by(CategoryModel.id).order_by(CategoryModel.sort_order)
        ).all()
        colors = self.s.execute(
            select(ColorModel.id, ColorModel.name, ColorModel.hex, func.count(distinct(V.product_id)))
            .join(V, V.color_id == ColorModel.id).where(V.product_id.in_(ids)).group_by(ColorModel.id).order_by(ColorModel.id)
        ).all()
        sizes = self.s.execute(
            select(SizeModel.code, func.count(distinct(V.product_id)))
            .join(V, V.size_id == SizeModel.id).where(V.product_id.in_(ids)).group_by(SizeModel.id).order_by(SizeModel.sort_order)
        ).all()
        weaves = self.s.execute(
            select(P.weave_grade, func.count()).where(P.id.in_(ids)).group_by(P.weave_grade)
        ).all()
        pmin, pmax = self.s.execute(select(func.min(P.price_cop), func.max(P.price_cop)).where(P.id.in_(ids))).one()
        weave_order = {"fino": 0, "superfino": 1, "extrafino": 2}
        return {
            "categories": [{"slug": s, "name": n, "count": c} for s, n, c in cats],
            "colors": [{"id": i, "name": n, "hex": h, "count": c} for i, n, h, c in colors],
            "sizes": [{"code": code, "count": c} for code, c in sizes],
            "weaves": [{"value": v, "count": c} for v, c in sorted(weaves, key=lambda w: weave_order.get(w[0], 9))],
            "price_min": pmin or 0, "price_max": pmax or 0,
        }

    def featured_products(self, limit: int) -> list[dict[str, Any]]:
        rows = self.s.scalars(
            select(P).where(P.is_active.is_(True), P.is_featured.is_(True)).order_by(P.id.desc()).limit(limit)
            .options(*mappers.CARD_OPTIONS)
        ).all()
        return [mappers.card(p, self.low) for p in rows]

    def get_product_detail(self, slug: str) -> dict[str, Any] | None:
        p = self.s.scalar(select(P).where(P.slug == slug, P.is_active.is_(True)).options(*mappers.DETAIL_OPTIONS))
        if not p:
            return None
        rel = self.s.scalars(
            select(P).where(P.category_id == p.category_id, P.id != p.id, P.is_active.is_(True))
            .order_by(P.is_featured.desc(), P.id.desc()).limit(8).options(*mappers.CARD_OPTIONS)
        ).all()
        return mappers.detail(p, self.low, [mappers.card(r, self.low) for r in rel])

    def get_artisan(self, artisan_id: int) -> dict[str, Any] | None:
        a = self.s.get(ArtisanModel, artisan_id)
        if not a:
            return None
        products = self.s.scalars(
            select(P).where(P.artisan_id == a.id, P.is_active.is_(True)).order_by(P.id).options(*mappers.CARD_OPTIONS)
        ).all()
        row = mappers.artisan_row(a)
        row["products"] = [mappers.card(p, self.low) for p in products]
        return row
