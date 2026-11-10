"""Data carried between layers (no framework types)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime

from app.domain.pricing import PricingPolicy, Totals


@dataclass(frozen=True)
class AppConfig:
    pricing: PricingPolicy
    low_stock_threshold: int
    frontend_url: str


@dataclass(frozen=True)
class TokenClaims:
    user_id: int
    role: str
    jti: str
    expires_at: datetime


@dataclass(frozen=True)
class IssuedToken:
    token: str
    jti: str
    expires_at: datetime


@dataclass(frozen=True)
class PaymentIntent:
    reference: str
    redirect_url: str
    provider: str


@dataclass(frozen=True)
class GatewayResult:
    status: str  # approved | declined | failed
    message: str


@dataclass
class VariantInfo:
    variant_id: int
    product_id: int
    slug: str
    name: str
    image_url: str | None
    size_code: str
    color_name: str
    color_hex: str
    unit_price_cop: int
    stock: int  # effective stock: 0 when the product is inactive


@dataclass
class CartLine:
    item_id: int
    variant: VariantInfo
    quantity: int


@dataclass
class CartItemView:
    id: int
    variant_id: int
    product_id: int
    slug: str
    name: str
    image_url: str | None
    size_code: str
    color_name: str
    color_hex: str
    unit_price_cop: int
    quantity: int
    line_total_cop: int
    stock: int
    availability: str


@dataclass
class CartView:
    items: list[CartItemView]
    totals: Totals
    item_count: int


@dataclass
class ProductFilters:
    q: str | None = None
    category: str | None = None
    color: int | None = None
    size: str | None = None
    min_price: int | None = None
    max_price: int | None = None
    weave: str | None = None
    in_stock: bool = False
    sort: str = "relevance"
    page: int = 1
    page_size: int = 24


@dataclass
class ImageInput:
    url: str
    alt: str = ""


@dataclass
class VariantInput:
    size_code: str
    color_id: int
    stock: int


@dataclass
class ProductInput:
    name: str
    sku: str
    short_description: str
    description: str
    price_cop: int
    category_id: int
    artisan_id: int
    weave_grade: str
    weaving_hours: int
    brim_cm: float
    delivery_days_min: int
    delivery_days_max: int
    compare_at_price_cop: int | None = None
    is_featured: bool = False
    images: list[ImageInput] = field(default_factory=list)
    variants: list[VariantInput] = field(default_factory=list)


@dataclass
class AdminOrderFilters:
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    q: str | None = None
    page: int = 1
    page_size: int = 20
