"""ORM rows -> plain dicts (snake_case keys) consumed by the presentation schemas."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import joinedload, selectinload

from app.domain.stock import availability
from app.infrastructure.db.models import ArtisanModel, ProductModel, ProductVariantModel

CARD_OPTIONS = (
    joinedload(ProductModel.category),
    joinedload(ProductModel.artisan),
    selectinload(ProductModel.images),
    selectinload(ProductModel.variants).joinedload(ProductVariantModel.color),
)
DETAIL_OPTIONS = CARD_OPTIONS + (selectinload(ProductModel.variants).joinedload(ProductVariantModel.size),)


def card(p: ProductModel, low: int) -> dict[str, Any]:
    total = sum(v.stock for v in p.variants)
    colors: dict[int, dict] = {}
    for v in p.variants:
        colors.setdefault(v.color_id, {"id": v.color.id, "name": v.color.name, "hex": v.color.hex})
    first = p.images[0] if p.images else None
    return {
        "id": p.id, "slug": p.slug, "name": p.name, "short_description": p.short_description,
        "price_cop": p.price_cop, "compare_at_price_cop": p.compare_at_price_cop,
        "image_url": first.url if first else None, "image_alt": (first.alt if first else None) or p.name,
        "category": {"slug": p.category.slug, "name": p.category.name},
        "artisan": {"full_name": p.artisan.full_name, "municipality": p.artisan.municipality},
        "weave_grade": p.weave_grade, "colors": list(colors.values()), "total_stock": total,
        "availability": availability(total, low),
        "delivery_days_min": p.delivery_days_min, "delivery_days_max": p.delivery_days_max,
    }


def artisan_row(a: ArtisanModel) -> dict[str, Any]:
    return {
        "id": a.id, "full_name": a.full_name, "municipality": a.municipality, "department": a.department,
        "craft": a.craft, "bio": a.bio, "years_experience": a.years_experience, "photo_url": a.photo_url,
    }


def detail(p: ProductModel, low: int, related: list[dict] | None = None, admin: bool = False) -> dict[str, Any]:
    sizes: dict[int, Any] = {}
    for v in p.variants:
        sizes[v.size_id] = v.size
    ordered_sizes = sorted(sizes.values(), key=lambda s: s.sort_order)
    row = card(p, low)
    row.update({
        "sku": p.sku, "description": p.description, "fiber": p.fiber, "weaving_hours": p.weaving_hours,
        "brim_cm": float(p.brim_cm),
        "images": [{"url": i.url, "alt": i.alt or p.name} for i in p.images],
        "sizes": [{"code": s.code, "label": s.label, "head_cm_min": s.head_cm_min, "head_cm_max": s.head_cm_max}
                  for s in ordered_sizes],
        "variants": [
            {"id": v.id, "sku": v.sku, "size_code": v.size.code, "color_id": v.color_id, "color_name": v.color.name,
             "color_hex": v.color.hex, "stock": v.stock, "availability": availability(v.stock, low)}
            for v in sorted(p.variants, key=lambda v: (v.size.sort_order, v.color_id))
        ],
        "artisan": artisan_row(p.artisan),
        "related": related or [],
    })
    if admin:
        row.update({"is_active": p.is_active, "is_featured": p.is_featured, "category_id": p.category_id,
                    "artisan_id": p.artisan_id, "updated_at": p.updated_at})
    return row
