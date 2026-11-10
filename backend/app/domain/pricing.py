"""Totals shared by cart and orders. Prices already include IVA."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable


@dataclass(frozen=True)
class PricingPolicy:
    tax_rate: Decimal
    shipping_flat_cop: int
    free_shipping_from_cop: int


@dataclass(frozen=True)
class Totals:
    total_items_cop: int
    subtotal_cop: int
    tax_cop: int
    shipping_cop: int
    total_cop: int
    free_shipping_from_cop: int


def compute_totals(lines: Iterable[tuple[int, int]], policy: PricingPolicy) -> Totals:
    """`lines` are (unit_price_cop, quantity) pairs."""
    total_items = sum(price * qty for price, qty in lines)
    net = Decimal(total_items) / (Decimal(1) + policy.tax_rate)
    tax = int((Decimal(total_items) - net).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    if total_items == 0 or total_items >= policy.free_shipping_from_cop:
        shipping = 0
    else:
        shipping = policy.shipping_flat_cop
    return Totals(
        total_items_cop=total_items,
        subtotal_cop=total_items - tax,
        tax_cop=tax,
        shipping_cop=shipping,
        total_cop=total_items + shipping,
        free_shipping_from_cop=policy.free_shipping_from_cop,
    )
