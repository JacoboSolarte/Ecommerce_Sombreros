"""Baseline rows for API tests."""
from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy.orm import Session

from app.infrastructure.db.models import (
    ArtisanModel, CategoryModel, ColorModel, ProductImageModel, ProductModel, ProductVariantModel, SizeModel, UserModel,
)

CUSTOMER = ("cliente@test.co", "Cliente1234")
ADMIN = ("admin@test.co", "Admin1234")
SHIPPING = {
    "fullName": "Ana Pérez", "phone": "3101234567", "addressLine": "Calle 10 # 5-20", "city": "Pasto",
    "department": "Nariño", "postalCode": "520001",
}


def seed_basic(s: Session, hasher) -> SimpleNamespace:
    ns = SimpleNamespace()
    for email, pw, role, name in (
        (*CUSTOMER, "customer", "Cliente Prueba"), (*ADMIN, "admin", "Admin Prueba"),
    ):
        s.add(UserModel(email=email, password_hash=hasher.hash(pw), full_name=name, role=role))
    sizes = {c: SizeModel(code=c, label=f"Talla {c}", head_cm_min=54 + 2 * i, head_cm_max=55 + 2 * i, sort_order=i)
             for i, c in enumerate(["S", "M", "L", "XL"])}
    colors = {n: ColorModel(name=n, hex=h) for n, h in (("Natural", "#D9C59A"), ("Miel", "#C8963E"), ("Café", "#6B4A2E"))}
    cats = [CategoryModel(name="Sombreros clásicos", slug="clasicos", sort_order=1),
            CategoryModel(name="Sombreros de ala ancha", slug="ala-ancha", sort_order=2)]
    arts = [ArtisanModel(full_name="María Prueba", municipality="Sandoná", bio="Tejedora.", years_experience=20),
            ArtisanModel(full_name="José Prueba", municipality="Linares", bio="Tejedor.", years_experience=12)]
    s.add_all([*sizes.values(), *colors.values(), *cats, *arts])
    s.flush()

    def product(sku, name, cat, art, price, variants, compare=None, featured=False, weave="fino", desc="Tejido a mano."):
        slug = name.lower().replace(" ", "-").replace("ñ", "n").replace("ñ", "n")
        p = ProductModel(sku=sku, slug=slug.replace("ñ", "n"), name=name,
                         short_description=f"{name} corto", description=desc, price_cop=price,
                         compare_at_price_cop=compare, category_id=cat.id, artisan_id=art.id, weave_grade=weave,
                         weaving_hours=40, brim_cm=7.5, is_featured=featured)
        p.images = [ProductImageModel(url=f"/images/{sku}.jpg", alt=name, position=0)]
        s.add(p)
        s.flush()
        out = {}
        for size, color, stock in variants:
            v = ProductVariantModel(product_id=p.id, size_id=sizes[size].id, color_id=colors[color].id,
                                    sku=f"{sku}-{size}-{color}", stock=stock)
            s.add(v)
            s.flush()
            out[(size, color)] = v.id
        return p.id, out

    ns.classic, ns.classic_v = product("CG-1", "Aguadeno Clasico", cats[0], arts[0], 189000,
                                       [("M", "Natural", 5), ("L", "Natural", 1), ("M", "Miel", 0)], featured=True,
                                       desc="Sombrero con cogollo cocido y blanqueado.")
    ns.wide, ns.wide_v = product("CG-2", "Ala Ancha Fino", cats[1], arts[1], 120000, [("M", "Café", 10)],
                                 compare=150000, weave="superfino")
    ns.sold_out, ns.sold_out_v = product("CG-3", "Agotado", cats[0], arts[1], 99000, [("M", "Natural", 0)])
    ns.premium, ns.premium_v = product("CG-4", "Extrafino Premium", cats[1], arts[0], 300000, [("L", "Miel", 3)],
                                       weave="extrafino")
    ns.cat_ids = [c.id for c in cats]
    ns.artisan_ids = [a.id for a in arts]
    ns.color_ids = {n: c.id for n, c in colors.items()}
    s.commit()
    return ns
