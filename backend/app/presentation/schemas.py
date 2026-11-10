"""Request/response schemas. JSON is camelCase, Python is snake_case."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer
from pydantic.alias_generators import to_camel


def _iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[datetime, PlainSerializer(_iso_utc, return_type=str, when_used="json")]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- auth / users ----------
class RegisterIn(CamelModel):
    full_name: str = Field(max_length=150)
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)
    phone: str | None = Field(default=None, max_length=30)


class LoginIn(CamelModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class ProfileIn(CamelModel):
    full_name: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    document_id: str | None = Field(default=None, max_length=30)


class UserOut(CamelModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    document_id: str | None
    role: str
    created_at: UtcDatetime


# ---------- catalog ----------
class CategoryOut(CamelModel):
    id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None
    product_count: int


class ColorOut(CamelModel):
    id: int
    name: str
    hex: str


class SizeOut(CamelModel):
    id: int
    code: str
    label: str
    head_cm_min: int
    head_cm_max: int


class CategoryRef(CamelModel):
    slug: str
    name: str


class ArtisanRef(CamelModel):
    full_name: str
    municipality: str


class ProductCardOut(CamelModel):
    id: int
    slug: str
    name: str
    short_description: str
    price_cop: int
    compare_at_price_cop: int | None
    image_url: str | None
    image_alt: str | None
    category: CategoryRef
    artisan: ArtisanRef
    weave_grade: str
    colors: list[ColorOut]
    total_stock: int
    availability: str
    delivery_days_min: int
    delivery_days_max: int


class FacetCategory(CamelModel):
    slug: str
    name: str
    count: int


class FacetColor(CamelModel):
    id: int
    name: str
    hex: str
    count: int


class FacetSize(CamelModel):
    code: str
    count: int


class FacetWeave(CamelModel):
    value: str
    count: int


class Facets(CamelModel):
    categories: list[FacetCategory]
    colors: list[FacetColor]
    sizes: list[FacetSize]
    weaves: list[FacetWeave]
    price_min: int
    price_max: int


class ProductListOut(CamelModel):
    items: list[ProductCardOut]
    total: int
    page: int
    page_size: int
    facets: Facets


class ImageOut(CamelModel):
    url: str
    alt: str


class DetailSize(CamelModel):
    code: str
    label: str
    head_cm_min: int
    head_cm_max: int


class VariantOut(CamelModel):
    id: int
    sku: str
    size_code: str
    color_id: int
    color_name: str
    color_hex: str
    stock: int
    availability: str


class ArtisanFull(CamelModel):
    id: int
    full_name: str
    municipality: str
    department: str
    craft: str
    bio: str | None
    years_experience: int
    photo_url: str | None


class ProductDetailOut(ProductCardOut):
    sku: str
    description: str
    fiber: str
    weaving_hours: int
    brim_cm: float
    images: list[ImageOut]
    sizes: list[DetailSize]
    variants: list[VariantOut]
    artisan: ArtisanFull  # type: ignore[assignment]
    related: list[ProductCardOut]


class AdminProductDetailOut(ProductDetailOut):
    is_active: bool
    is_featured: bool
    category_id: int
    artisan_id: int


class ArtisanDetailOut(ArtisanFull):
    products: list[ProductCardOut]


# ---------- cart ----------
class CartItemIn(CamelModel):
    variant_id: int
    quantity: int = Field(ge=1, le=99)


class CartQuantityIn(CamelModel):
    quantity: int = Field(ge=1, le=99)


class CartBulkIn(CamelModel):
    items: list[CartItemIn] = Field(max_length=100)


class TotalsOut(CamelModel):
    total_items_cop: int
    subtotal_cop: int
    tax_cop: int
    shipping_cop: int
    total_cop: int
    free_shipping_from_cop: int


class CartItemOut(CamelModel):
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


class CartOut(CamelModel):
    items: list[CartItemOut]
    totals: TotalsOut
    item_count: int


# ---------- checkout / orders / payments ----------
class ShippingIn(CamelModel):
    full_name: str = Field(max_length=150)
    phone: str = Field(max_length=30)
    address_line: str = Field(max_length=255)
    address_extra: str | None = Field(default=None, max_length=255)
    city: str = Field(max_length=100)
    department: str = Field(max_length=100)
    postal_code: str = Field(max_length=10)
    notes: str | None = Field(default=None, max_length=500)


class CheckoutIn(CamelModel):
    shipping: ShippingIn


class ShippingOut(ShippingIn):
    pass


class OrderItemOut(CamelModel):
    product_name: str
    product_slug: str
    image_url: str | None
    size_code: str
    color_name: str
    unit_price_cop: int
    quantity: int
    line_total_cop: int


class HistoryOut(CamelModel):
    from_status: str | None
    to_status: str
    note: str | None
    created_at: UtcDatetime


class PaymentOut(CamelModel):
    reference: str
    status: str
    amount_cop: int
    created_at: UtcDatetime
    provider_message: str | None = None


class OrderOut(CamelModel):
    id: int
    number: str
    status: str
    created_at: UtcDatetime
    items: list[OrderItemOut]
    totals: TotalsOut
    shipping: ShippingOut
    history: list[HistoryOut]
    payments: list[PaymentOut]


class PaymentIntentOut(CamelModel):
    reference: str
    redirect_url: str


class CheckoutOut(CamelModel):
    order: OrderOut
    payment: PaymentIntentOut


class PaymentStatusOut(CamelModel):
    reference: str
    status: str
    amount_cop: int
    order_number: str
    order_id: int


class SimulateIn(CamelModel):
    outcome: Literal["approved", "declined", "failed"]


class SimulateOut(CamelModel):
    payment: PaymentOut
    order: OrderOut


class OrderSummaryOut(CamelModel):
    id: int
    number: str
    created_at: UtcDatetime
    status: str
    total_cop: int
    item_count: int
    first_item_image_url: str | None


class AdminOrderSummaryOut(OrderSummaryOut):
    customer_name: str | None
    customer_email: str | None


class AdminOrderListOut(CamelModel):
    items: list[AdminOrderSummaryOut]
    total: int


class CustomerOut(CamelModel):
    id: int
    full_name: str
    email: str
    phone: str | None


class AdminOrderOut(OrderOut):
    customer: CustomerOut
    allowed_transitions: list[str]


class StatusChangeIn(CamelModel):
    status: str
    note: str | None = Field(default=None, max_length=500)


# ---------- admin ----------
class TopProductOut(CamelModel):
    product_id: int
    name: str
    units_sold: int
    revenue_cop: int
    image_url: str | None


class SalesDayOut(CamelModel):
    date: date
    revenue_cop: int
    orders: int


class LowStockOut(CamelModel):
    variant_id: int
    product_name: str
    size_code: str
    color_name: str
    stock: int


class SummaryOut(CamelModel):
    orders_count: int
    paid_orders_count: int
    revenue_cop: int
    average_order_cop: int
    top_products: list[TopProductOut]
    sales_by_day: list[SalesDayOut]
    low_stock: list[LowStockOut]
    orders_by_status: dict[str, int]


class AdminProductRow(CamelModel):
    id: int
    sku: str
    slug: str
    name: str
    price_cop: int
    category_name: str
    is_active: bool
    total_stock: int
    variant_count: int
    image_url: str | None
    updated_at: UtcDatetime


class AdminProductListOut(CamelModel):
    items: list[AdminProductRow]
    total: int


class ImageIn(CamelModel):
    url: str = Field(max_length=500)
    alt: str = Field(default="", max_length=300)


class VariantIn(CamelModel):
    size_code: str = Field(max_length=4)
    color_id: int
    stock: int = Field(ge=0, le=100000)


class ProductIn(CamelModel):
    name: str = Field(max_length=180)
    sku: str = Field(max_length=60)
    short_description: str = Field(max_length=300)
    description: str
    price_cop: int = Field(le=100_000_000)
    compare_at_price_cop: int | None = None
    category_id: int
    artisan_id: int
    weave_grade: str
    weaving_hours: int
    brim_cm: float
    delivery_days_min: int
    delivery_days_max: int
    is_featured: bool = False
    images: list[ImageIn] = Field(default_factory=list, max_length=12)
    variants: list[VariantIn] = Field(default_factory=list, max_length=60)


class UploadOut(CamelModel):
    url: str


class InventoryRowOut(CamelModel):
    variant_id: int
    sku: str
    product_id: int
    product_name: str
    size_code: str
    color_name: str
    color_hex: str
    stock: int
    is_low: bool


class AdjustIn(CamelModel):
    delta: int = Field(ge=-100000, le=100000)
    reason: Literal["restock", "adjustment"]
    note: str | None = Field(default=None, max_length=500)


class MovementOut(CamelModel):
    id: int
    variant_id: int
    delta: int
    reason: str
    note: str | None
    user_id: int | None
    user_name: str | None
    order_id: int | None
    order_number: str | None
    created_at: UtcDatetime


class CategoryOption(CamelModel):
    id: int
    name: str
    slug: str


class ArtisanOption(CamelModel):
    id: int
    full_name: str
    municipality: str
