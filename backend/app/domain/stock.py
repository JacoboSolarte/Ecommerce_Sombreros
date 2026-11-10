"""Stock rules: never negative."""
from __future__ import annotations

from app.domain.errors import OutOfStock


def ensure_available(requested: int, available: int) -> None:
    if requested > available:
        raise OutOfStock(
            "No hay suficiente stock para la cantidad solicitada.",
            {"available": max(available, 0), "requested": requested},
        )


def apply_delta(current: int, delta: int) -> int:
    new = current + delta
    if new < 0:
        raise OutOfStock("El ajuste dejaría el stock en negativo.", {"available": current})
    return new


def availability(stock: int, low_threshold: int) -> str:
    if stock <= 0:
        return "out_of_stock"
    if stock <= low_threshold:
        return "low_stock"
    return "in_stock"
