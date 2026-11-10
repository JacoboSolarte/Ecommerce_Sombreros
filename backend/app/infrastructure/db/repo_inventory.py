from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import and_, func, literal_column, or_, select, update
from sqlalchemy.orm import Session

from app.domain.order_status import REVENUE_STATUSES, OrderStatus
from app.infrastructure.db.models import (
    ColorModel, InventoryMovementModel as M, OrderItemModel as OI, OrderModel as O, ProductModel as P,
    ProductVariantModel as V, SizeModel, UserModel,
)
from app.infrastructure.db.repo_orders import COLOMBIA_OFFSET


class SqlInventoryRepository:
    def __init__(self, session: Session, low_stock_threshold: int):
        self.s, self.low = session, low_stock_threshold

    def lock_stock(self, variant_ids: list[int]) -> dict[int, int]:
        if not variant_ids:
            return {}
        rows = self.s.execute(
            select(V.id, V.stock).where(V.id.in_(variant_ids)).order_by(V.id).with_for_update()
        ).all()
        return {vid: stock for vid, stock in rows}

    def set_stock(self, variant_id: int, stock: int) -> None:
        self.s.execute(update(V).where(V.id == variant_id).values(stock=stock))

    def add_movement(self, *, variant_id, delta, reason, note, user_id, order_id, now) -> None:
        self.s.add(M(variant_id=variant_id, delta=delta, reason=reason, note=note, user_id=user_id,
                     order_id=order_id, created_at=now))
        self.s.flush()

    def _rows_stmt(self):
        return (
            select(V.id, V.sku, P.id, P.name, SizeModel.code, ColorModel.name, ColorModel.hex, V.stock)
            .join(P, V.product_id == P.id).join(SizeModel, V.size_id == SizeModel.id)
            .join(ColorModel, V.color_id == ColorModel.id)
        )

    def _row(self, r) -> dict[str, Any]:
        return {"variant_id": r[0], "sku": r[1], "product_id": r[2], "product_name": r[3], "size_code": r[4],
                "color_name": r[5], "color_hex": r[6], "stock": r[7], "is_low": r[7] <= self.low}

    def list_inventory(self, q: str | None, low_only: bool) -> list[dict[str, Any]]:
        stmt = self._rows_stmt()
        if q:
            like = f"%{q.replace('%', '').replace('_', '')}%"
            stmt = stmt.where(or_(P.name.like(like), V.sku.like(like), ColorModel.name.like(like)))
        if low_only:
            stmt = stmt.where(V.stock <= self.low)
        stmt = stmt.order_by(P.name, SizeModel.sort_order, ColorModel.id)
        return [self._row(r) for r in self.s.execute(stmt).all()]

    def get_row(self, variant_id: int) -> dict[str, Any] | None:
        r = self.s.execute(self._rows_stmt().where(V.id == variant_id)).first()
        return self._row(r) if r else None

    def list_movements(self, variant_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(M, UserModel.full_name, O.number).outerjoin(UserModel, M.user_id == UserModel.id)
            .outerjoin(O, M.order_id == O.id).where(M.variant_id == variant_id).order_by(M.id.desc())
        )
        return [{"id": m.id, "variant_id": m.variant_id, "delta": m.delta, "reason": m.reason, "note": m.note,
                 "user_id": m.user_id, "user_name": name, "order_id": m.order_id, "order_number": number,
                 "created_at": m.created_at} for m, name, number in self.s.execute(stmt).all()]


class SqlReportRepository:
    def __init__(self, session: Session, low_stock_threshold: int):
        self.s, self.low = session, low_stock_threshold

    def summary(self, date_from: date, date_to: date) -> dict[str, Any]:
        start = datetime.combine(date_from, time.min) + COLOMBIA_OFFSET
        end = datetime.combine(date_to + timedelta(days=1), time.min) + COLOMBIA_OFFSET
        in_range = and_(O.created_at >= start, O.created_at < end)
        revenue_statuses = [s.value for s in REVENUE_STATUSES]
        counted = and_(in_range, O.status.in_(revenue_statuses))

        orders_count = self.s.scalar(select(func.count()).select_from(O).where(in_range)) or 0
        paid_count, revenue = self.s.execute(
            select(func.count(), func.coalesce(func.sum(O.total_cop), 0)).select_from(O).where(counted)
        ).one()
        by_status = {s.value: 0 for s in OrderStatus}
        for status, n in self.s.execute(select(O.status, func.count()).where(in_range).group_by(O.status)).all():
            by_status[status] = n

        units = func.sum(OI.quantity)
        top = self.s.execute(
            select(OI.product_id, func.max(OI.product_name), units, func.sum(OI.line_total_cop), func.max(OI.image_url))
            .join(O, OI.order_id == O.id).where(counted).group_by(OI.product_id).order_by(units.desc()).limit(5)
        ).all()

        day = func.date(func.date_sub(O.created_at, literal_column("INTERVAL 5 HOUR")))
        by_day = {
            d: (int(rev), n) for d, rev, n in self.s.execute(
                select(day, func.sum(O.total_cop), func.count()).where(counted).group_by(day)
            ).all()
        }
        sales_by_day, cursor = [], date_from
        while cursor <= date_to:
            rev, n = by_day.get(cursor, (0, 0))
            sales_by_day.append({"date": cursor.isoformat(), "revenue_cop": rev, "orders": n})
            cursor += timedelta(days=1)

        low = self.s.execute(
            select(V.id, P.name, SizeModel.code, ColorModel.name, V.stock)
            .join(P, V.product_id == P.id).join(SizeModel, V.size_id == SizeModel.id)
            .join(ColorModel, V.color_id == ColorModel.id)
            .where(P.is_active.is_(True), V.stock <= self.low).order_by(V.stock, P.name).limit(50)
        ).all()
        revenue = int(revenue)
        return {
            "orders_count": orders_count, "paid_orders_count": paid_count, "revenue_cop": revenue,
            "average_order_cop": round(revenue / paid_count) if paid_count else 0,
            "top_products": [{"product_id": pid, "name": name, "units_sold": int(u), "revenue_cop": int(r), "image_url": img}
                             for pid, name, u, r, img in top],
            "sales_by_day": sales_by_day,
            "low_stock": [{"variant_id": a, "product_name": b, "size_code": c, "color_name": d, "stock": e}
                          for a, b, c, d, e in low],
            "orders_by_status": by_status,
        }
