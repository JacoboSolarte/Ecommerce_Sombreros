"""Load sample data into casa_guaico.

    python scripts/seed.py            # only seeds an empty database
    python scripts/seed.py --reset    # wipes every table and reloads
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import func, select, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.domain.pricing import PricingPolicy, compute_totals  # noqa: E402
from app.infrastructure.config import Settings  # noqa: E402
from app.infrastructure.db import models as m  # noqa: E402
from app.infrastructure.db.uow import make_engine  # noqa: E402
from app.infrastructure.services import BcryptPasswordHasher  # noqa: E402
from app.infrastructure.db.repo_admin_products import slugify  # noqa: E402
import seed_data as d  # noqa: E402

MANIFEST = ROOT.parent / "frontend" / "public" / "images" / "manifest.json"
PLACEHOLDER = "/images/products/placeholder-sq.jpg"
SHAPE_KEYS = {
    0: ("classic", "clasic", "aguade", "fedora"),
    1: ("wide", "ancha", "brim"),
    2: ("capel", "dama", "lady", "women", "cloche"),
    3: ("kid", "niñ", "nino", "child", "infant"),
    4: ("pack", "fold", "travel", "plegable", "roll"),
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


# ---------- images ----------
def load_manifest() -> list[dict]:
    if not MANIFEST.exists():
        print(f"AVISO: no existe {MANIFEST}; se usará {PLACEHOLDER} para todos los productos. "
              "Vuelve a ejecutar el seed cuando el manifest esté listo.")
        return []
    raw = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = next((v for v in raw.values() if isinstance(v, list)), [])
    entries = [e for e in raw if isinstance(e, dict) and e.get("kind") == "product" and e.get("file")]
    if not entries:
        print("AVISO: el manifest no tiene imágenes de producto; se usará el placeholder.")
    return entries


def _rgb(hex_color: str | None):
    try:
        h = (hex_color or "").lstrip("#")
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


class ImagePicker:
    def __init__(self, entries: list[dict]):
        self.entries, self.used = entries, {}

    def _matches(self, e: dict, cat_idx: int) -> bool:
        haystack = " ".join([str(e.get("shape", "")), *map(str, e.get("tags") or [])]).lower()
        return any(k in haystack for k in SHAPE_KEYS[cat_idx])

    def pick(self, cat_idx: int, color_hex: str) -> dict | None:
        if not self.entries:
            return None
        pool = [e for e in self.entries if self._matches(e, cat_idx)] or self.entries
        # Prefer a matching shape, but never reuse a photo while another one is still unused.
        least_used = min(self.used.get(e["file"], 0) for e in self.entries)
        if min(self.used.get(e["file"], 0) for e in pool) > least_used:
            pool = [e for e in self.entries if self.used.get(e["file"], 0) == least_used]
        target = _rgb(color_hex)

        def score(e):
            rgb = _rgb(e.get("dominantColor"))
            dist = sum((a - b) ** 2 for a, b in zip(rgb, target)) ** 0.5 if rgb and target else 0
            return dist + 90 * self.used.get(e["file"], 0)

        best = min(pool, key=score)
        self.used[best["file"]] = self.used.get(best["file"], 0) + 1
        return best


# ---------- seeding ----------
def wipe(session: Session) -> None:
    session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for table in reversed(m.Base.metadata.sorted_tables):
        if table.name != "alembic_version":
            session.execute(text(f"DELETE FROM `{table.name}`"))
    session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    session.commit()


def seed(session: Session, settings: Settings) -> None:
    rng = random.Random(2026)
    now = utcnow()
    hasher = BcryptPasswordHasher()
    policy = PricingPolicy(settings.tax_rate, settings.shipping_flat_cop, settings.free_shipping_from_cop)

    # users
    admin = m.UserModel(email="admin@casaguaico.co", password_hash=hasher.hash("Admin1234"),
                        full_name="Administración Casa Guaico", role="admin", created_at=now - timedelta(days=60), updated_at=now)
    customer = m.UserModel(email="cliente@casaguaico.co", password_hash=hasher.hash("Cliente1234"),
                           full_name="Camila Andrea Rodríguez", phone="3105551234", document_id="1085123456",
                           role="customer", created_at=now - timedelta(days=45), updated_at=now)
    session.add_all([admin, customer])

    sizes = {c: m.SizeModel(code=c, label=label, head_cm_min=lo, head_cm_max=hi, sort_order=i)
             for i, (c, label, lo, hi) in enumerate(d.SIZES)}
    colors = {n: m.ColorModel(name=n, hex=h) for n, h in d.COLORS}
    artisans = [m.ArtisanModel(full_name=a["full_name"], municipality=a["municipality"], department="Nariño",
                               craft="Tejeduría de iraca", bio=a["bio"], years_experience=a["years"],
                               photo_url=None) for a in d.ARTISANS]
    categories = [m.CategoryModel(name=n, slug=s, description=desc, sort_order=i + 1)
                  for i, (n, s, _, desc) in enumerate(d.CATEGORIES)]
    session.add_all([*sizes.values(), *colors.values(), *artisans, *categories])
    session.flush()

    # products
    picker = ImagePicker(load_manifest())
    products: list[m.ProductModel] = []
    final_stock: dict[int, int] = {}
    variants_by_product: dict[int, list[m.ProductVariantModel]] = {}
    category_image: dict[int, str] = {}
    for idx, row in enumerate(d.PRODUCTS):
        (name, cat_i, art_i, grade, hours, brim, price, compare, featured, color_names, size_codes, bleach, short, pitch) = row
        entry = picker.pick(cat_i, dict(d.COLORS)[color_names[0]])
        main = entry["square"] if entry and entry.get("square") else (entry["file"] if entry else PLACEHOLDER)
        alt = (entry or {}).get("alt") or f"{name}, sombrero de iraca tejido a mano en Nariño"
        category_image.setdefault(cat_i, entry["file"] if entry else PLACEHOLDER)
        p = m.ProductModel(
            sku=f"CG-{['ACL', 'ALA', 'DAM', 'NIN', 'PLG'][cat_i]}-{idx + 1:03d}", slug=slugify(name), name=name,
            short_description=short,
            description=d.build_description(name, grade, hours, brim, bleach, pitch, color_names, cat_i == 4, cat_i == 3),
            price_cop=price, compare_at_price_cop=compare, category_id=categories[cat_i].id, artisan_id=artisans[art_i].id,
            weave_grade=grade, weaving_hours=hours, brim_cm=brim, delivery_days_min=3 if grade == "fino" else 5,
            delivery_days_max=6 if grade == "fino" else 12 if grade == "extrafino" else 8, is_featured=featured,
            created_at=now - timedelta(days=50 - idx * 2), updated_at=now - timedelta(days=idx),
        )
        p.images = [m.ProductImageModel(url=main, alt=alt, position=0)]
        if entry and entry.get("file") and entry["file"] != main:
            p.images.append(m.ProductImageModel(url=entry["file"], alt=f"{alt} (vista completa)", position=1))
        session.add(p)
        session.flush()
        products.append(p)

        variants = []
        codes = ["S", "M", "L", "XL"] if size_codes == "SMLX" else list(size_codes)
        for code in codes:
            for cname in color_names:
                if idx == 14:
                    stock = 0
                elif grade == "extrafino":
                    stock = rng.choice([0, 1, 1, 2, 3])
                else:
                    stock = rng.choice([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12])
                v = m.ProductVariantModel(product_id=p.id, size_id=sizes[code].id, color_id=colors[cname].id,
                                          sku=f"{p.sku}-{code}-{colors[cname].id}", stock=0)
                variants.append((v, stock))
                session.add(v)
        session.flush()
        if idx != 14 and not any(s > 0 for _, s in variants):
            variants[1] = (variants[1][0], 6)
        for v, stock in variants:
            final_stock[v.id] = stock
        variants_by_product[p.id] = [v for v, _ in variants]
    # explicit states to show in the UI: low stock on a classic, a size gone on another
    classic = variants_by_product[products[0].id]
    for v in classic:
        if v.sku.endswith(f"-S-{colors['Natural'].id}"):
            final_stock[v.id] = 0
        if v.sku.endswith(f"-M-{colors['Natural'].id}"):
            final_stock[v.id] = 2
        if v.sku.endswith(f"-L-{colors['Natural'].id}"):
            final_stock[v.id] = 12

    # Category tiles: one distinct photo per category, chosen to fit the category where the manifest has one.
    preferred = ["sombrero-fedora-banda-negra", "pila-sombreros-tienda", "sombrero-flor-rosa",
                 "fedora-banda-granate", "sombrero-plegado"]
    by_id = {e.get("id"): e for e in picker.entries}
    for cat_i, c in enumerate(categories):
        entry = by_id.get(preferred[cat_i]) if cat_i < len(preferred) else None
        c.image_url = (entry.get("square") or entry["file"]) if entry else category_image.get(cat_i)

    # sample orders (stock movements stay consistent with the final stock)
    plan = [
        (28, "delivered", [(0, 1)]), (22, "delivered", [(5, 1), (12, 1)]), (18, "delivered", [(15, 1)]),
        (15, "cancelled_paid", [(2, 1)]), (12, "shipped", [(8, 1)]), (9, "cancelled_nostock", [(4, 1)]),
        (7, "preparing", [(7, 1), (1, 1)]), (4, "paid", [(10, 2)]), (2, "paid", [(3, 1)]), (1, "pending", [(6, 1)]),
    ]
    addresses = [("Calle 18 # 25-40, Barrio Centro", "Pasto", "Nariño", "520001"),
                 ("Carrera 7 # 72-41, Apto 402", "Bogotá", "Bogotá D.C.", "110231"),
                 ("Calle 5 # 38-20", "Cali", "Valle del Cauca", "760001")]
    net_sold: dict[int, int] = {}
    movements: list[tuple] = []
    for n, (days_ago, kind, items) in enumerate(plan):
        created = now - timedelta(days=days_ago, hours=rng.randint(0, 6))
        lines = []
        for p_idx, qty in items:
            p = products[p_idx]
            v = next((x for x in variants_by_product[p.id] if x.sku.split("-")[-2] in ("M", "L")), variants_by_product[p.id][0])
            lines.append((p, v, qty))
        totals = compute_totals(((p.price_cop, q) for p, _, q in lines), policy)
        addr = addresses[n % len(addresses)]
        order = m.OrderModel(
            number=f"TMP-{n}", user_id=customer.id, status="pending", total_items_cop=totals.total_items_cop,
            subtotal_cop=totals.subtotal_cop, tax_cop=totals.tax_cop, shipping_cop=totals.shipping_cop,
            total_cop=totals.total_cop, ship_full_name=customer.full_name, ship_phone=customer.phone,
            ship_address_line=addr[0], ship_city=addr[1], ship_department=addr[2], ship_postal_code=addr[3],
            created_at=created, updated_at=created,
        )
        order.items = [m.OrderItemModel(
            variant_id=v.id, product_id=p.id, product_name=p.name, product_slug=p.slug,
            image_url=p.images[0].url, size_code=v.sku.split("-")[-2], color_name=_color_name(colors, v.color_id),
            unit_price_cop=p.price_cop, quantity=q, line_total_cop=p.price_cop * q) for p, v, q in lines]
        session.add(order)
        session.flush()
        order.number = f"CG-{order.id:06d}"

        history = [(None, "pending", "Pedido creado", None, created)]
        t_paid = created + timedelta(minutes=4)
        pay_status = "pending"
        if kind == "pending":
            pay_status = "declined"
        elif kind == "cancelled_nostock":
            pay_status = "failed"
            history.append(("pending", "cancelled", "Sin stock al confirmar el pago", None, t_paid))
        else:
            pay_status = "approved"
            history.append(("pending", "paid", "Pago aprobado", None, t_paid))
            for p, v, q in lines:
                movements.append((v.id, -q, "purchase", f"Pedido {order.number}", customer.id, order, t_paid))
                net_sold[v.id] = net_sold.get(v.id, 0) + q
            chain = {"paid": [], "preparing": ["preparing"], "shipped": ["preparing", "shipped"],
                     "delivered": ["preparing", "shipped", "delivered"], "cancelled_paid": ["cancelled"]}[kind]
            prev, when = "paid", t_paid
            notes = {"preparing": "Empacando el pedido", "shipped": "Enviado con transportadora", "delivered": "Entregado al cliente",
                     "cancelled": "Cliente solicitó la cancelación"}
            for step in chain:
                when += timedelta(hours=20)
                history.append((prev, step, notes[step], admin.id, when))
                prev = step
            if kind == "cancelled_paid":
                for p, v, q in lines:
                    movements.append((v.id, q, "cancellation", f"Cancelación pedido {order.number}", admin.id, order, when))
                    net_sold[v.id] -= q
            order.status = prev
            order.updated_at = when
        if kind in ("pending", "cancelled_nostock"):
            order.status = "cancelled" if kind == "cancelled_nostock" else "pending"
            order.updated_at = t_paid
        order.history = [m.OrderStatusHistoryModel(from_status=f, to_status=t, note=note, changed_by_user_id=u, created_at=at)
                         for f, t, note, u, at in history]
        session.add(m.PaymentModel(
            order_id=order.id, provider="simulator", reference=f"SIM-{order.id:06d}-SEED{n:02d}", status=pay_status,
            amount_cop=totals.total_cop, provider_message={"approved": "Pago aprobado por el simulador.",
                                                          "declined": "Pago rechazado por el simulador.",
                                                          "failed": "Sin stock al confirmar el pago"}[pay_status],
            created_at=created, updated_at=t_paid))
    session.flush()

    # stock: initial movement = final stock + what the sample orders took out
    start = now - timedelta(days=60)
    for variants in variants_by_product.values():
        for v in variants:
            final = final_stock[v.id]
            v.stock = final
            initial = final + net_sold.get(v.id, 0)
            if initial:
                session.add(m.InventoryMovementModel(variant_id=v.id, delta=initial, reason="initial", note="Stock inicial",
                                                     user_id=admin.id, created_at=start))
    for variant_id, delta, reason, note, user_id, order, at in movements:
        session.add(m.InventoryMovementModel(variant_id=variant_id, delta=delta, reason=reason, note=note,
                                             user_id=user_id, order_id=order.id, created_at=at))
    session.commit()


def _color_name(colors: dict, color_id: int) -> str:
    return next(n for n, c in colors.items() if c.id == color_id)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="wipe all data before loading")
    args = parser.parse_args()
    settings = Settings()
    engine = make_engine(settings.database_url)
    with Session(engine) as session:
        if args.reset:
            wipe(session)
        elif session.scalar(select(func.count()).select_from(m.UserModel)):
            print("La base de datos ya tiene datos. Usa --reset para recargar.")
            return
        seed(session, settings)
        counts = {t: session.scalar(text(f"SELECT COUNT(*) FROM {t}")) for t in
                  ("users", "categories", "artisans", "products", "product_variants", "orders", "inventory_movements")}
    print("Seed listo:", ", ".join(f"{k}={v}" for k, v in counts.items()))
    print("Admin: admin@casaguaico.co / Admin1234   Cliente: cliente@casaguaico.co / Cliente1234")


if __name__ == "__main__":
    main()
