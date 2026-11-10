from __future__ import annotations

from app.application.ports import Clock, Row, UnitOfWorkFactory
from app.domain.entities import User
from app.domain.errors import NotFound, ValidationError
from app.domain.stock import apply_delta


class ListInventory:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, q: str | None, low_only: bool) -> list[Row]:
        with self._uow() as uow:
            return uow.inventory.list_inventory((q or "").strip() or None, low_only)


class AdjustStock:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, admin: User, variant_id: int, delta: int, reason: str, note: str | None) -> Row:
        errors: dict[str, str] = {}
        if delta == 0:
            errors["delta"] = "El ajuste no puede ser cero."
        if reason not in ("restock", "adjustment"):
            errors["reason"] = "Motivo no válido."
        elif reason == "restock" and delta < 0:
            errors["delta"] = "Una reposición debe ser positiva."
        if errors:
            raise ValidationError("Revisa los datos ingresados.", {"fields": errors})
        with self._uow() as uow:
            stocks = uow.inventory.lock_stock([variant_id])
            if variant_id not in stocks:
                raise NotFound("No encontramos esta variante.")
            uow.inventory.set_stock(variant_id, apply_delta(stocks[variant_id], delta))
            uow.inventory.add_movement(
                variant_id=variant_id, delta=delta, reason=reason, note=(note or "").strip() or None,
                user_id=admin.id, order_id=None, now=self._clock.now(),
            )
            uow.commit()
            return uow.inventory.get_row(variant_id)


class ListMovements:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, variant_id: int) -> list[Row]:
        with self._uow() as uow:
            if not uow.inventory.get_row(variant_id):
                raise NotFound("No encontramos esta variante.")
            return uow.inventory.list_movements(variant_id)
