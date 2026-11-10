"""Core entities (plain dataclasses, no framework imports)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.domain.pricing import Totals


@dataclass
class User:
    id: int | None
    email: str
    password_hash: str
    full_name: str
    phone: str | None = None
    document_id: str | None = None
    role: str = "customer"
    is_active: bool = True
    created_at: datetime | None = None

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


@dataclass(frozen=True)
class ShippingInfo:
    full_name: str
    phone: str
    address_line: str
    city: str
    department: str
    postal_code: str
    address_extra: str | None = None
    notes: str | None = None


@dataclass
class OrderItem:
    variant_id: int
    product_id: int
    product_name: str
    product_slug: str
    image_url: str | None
    size_code: str
    color_name: str
    unit_price_cop: int
    quantity: int

    @property
    def line_total_cop(self) -> int:
        return self.unit_price_cop * self.quantity


@dataclass
class HistoryEntry:
    from_status: str | None
    to_status: str
    note: str | None
    created_at: datetime
    changed_by_user_id: int | None = None


@dataclass
class Payment:
    id: int | None
    order_id: int
    provider: str
    reference: str
    status: str
    amount_cop: int
    provider_message: str | None = None
    created_at: datetime | None = None


@dataclass
class Order:
    id: int | None
    number: str
    user_id: int
    status: str
    items: list[OrderItem]
    totals: Totals
    shipping: ShippingInfo
    created_at: datetime
    history: list[HistoryEntry] = field(default_factory=list)
    payments: list[Payment] = field(default_factory=list)
    updated_at: datetime | None = None


@dataclass
class OrderSummary:
    id: int
    number: str
    created_at: datetime
    status: str
    total_cop: int
    item_count: int
    first_item_image_url: str | None
    customer_name: str | None = None
    customer_email: str | None = None
