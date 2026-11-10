"""SQLAlchemy 2.0 declarative models (MySQL 8, InnoDB, utf8mb4_0900_ai_ci)."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, MetaData, Numeric, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
TABLE_OPTS = {
    "mysql_engine": "InnoDB",
    "mysql_charset": "utf8mb4",
    "mysql_collate": "utf8mb4_0900_ai_ci",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    document_id: Mapped[str | None] = mapped_column(String(30))
    role: Mapped[str] = mapped_column(String(20), default="customer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RevokedTokenModel(Base):
    __tablename__ = "revoked_tokens"
    __table_args__ = (TABLE_OPTS,)
    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class AuditLogModel(Base):
    __tablename__ = "audit_log"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(60))
    path: Mapped[str] = mapped_column(String(255))
    ip: Mapped[str | None] = mapped_column(String(64))
    detail: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CategoryModel(Base):
    __tablename__ = "categories"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ArtisanModel(Base):
    __tablename__ = "artisans"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    municipality: Mapped[str] = mapped_column(String(100))
    department: Mapped[str] = mapped_column(String(100), default="Nariño")
    craft: Mapped[str] = mapped_column(String(150), default="Tejeduría de iraca")
    bio: Mapped[str | None] = mapped_column(Text)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    photo_url: Mapped[str | None] = mapped_column(String(500))


class ColorModel(Base):
    __tablename__ = "colors"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)
    hex: Mapped[str] = mapped_column(String(7))


class SizeModel(Base):
    __tablename__ = "sizes"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(4), unique=True)
    label: Mapped[str] = mapped_column(String(60))
    head_cm_min: Mapped[int] = mapped_column(Integer)
    head_cm_max: Mapped[int] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ProductModel(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price_cop > 0", name="price_positive"),
        Index("ix_products_active_featured", "is_active", "is_featured"),
        TABLE_OPTS,
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(60), unique=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    name: Mapped[str] = mapped_column(String(180))
    short_description: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    price_cop: Mapped[int] = mapped_column(Integer)
    compare_at_price_cop: Mapped[int | None] = mapped_column(Integer)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    artisan_id: Mapped[int] = mapped_column(ForeignKey("artisans.id"), index=True)
    weave_grade: Mapped[str] = mapped_column(String(20))
    fiber: Mapped[str] = mapped_column(String(100), default="Iraca (Carludovica palmata)")
    weaving_hours: Mapped[int] = mapped_column(Integer)
    brim_cm: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    delivery_days_min: Mapped[int] = mapped_column(Integer, default=3)
    delivery_days_max: Mapped[int] = mapped_column(Integer, default=7)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    category: Mapped[CategoryModel] = relationship()
    artisan: Mapped[ArtisanModel] = relationship()
    images: Mapped[list["ProductImageModel"]] = relationship(
        order_by="ProductImageModel.position", cascade="all, delete-orphan", back_populates="product"
    )
    variants: Mapped[list["ProductVariantModel"]] = relationship(
        order_by="ProductVariantModel.id", back_populates="product"
    )


class ProductImageModel(Base):
    __tablename__ = "product_images"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    alt: Mapped[str] = mapped_column(String(300), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    product: Mapped[ProductModel] = relationship(back_populates="images")


class ProductVariantModel(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "size_id", "color_id", name="uq_variant_product_size_color"),
        CheckConstraint("stock >= 0", name="stock_non_negative"),
        TABLE_OPTS,
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    size_id: Mapped[int] = mapped_column(ForeignKey("sizes.id"), index=True)
    color_id: Mapped[int] = mapped_column(ForeignKey("colors.id"), index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[ProductModel] = relationship(back_populates="variants")
    size: Mapped[SizeModel] = relationship()
    color: Mapped[ColorModel] = relationship()


class CartModel(Base):
    __tablename__ = "carts"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    items: Mapped[list["CartItemModel"]] = relationship(
        order_by="CartItemModel.id", cascade="all, delete-orphan", back_populates="cart"
    )


class CartItemModel(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "variant_id", name="uq_cart_item_variant"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        TABLE_OPTS,
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"))
    variant_id: Mapped[int] = mapped_column(ForeignKey("product_variants.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    cart: Mapped[CartModel] = relationship(back_populates="items")
    variant: Mapped[ProductVariantModel] = relationship()


class OrderModel(Base):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_status_created", "status", "created_at"), TABLE_OPTS)
    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(30), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    total_items_cop: Mapped[int] = mapped_column(Integer)
    subtotal_cop: Mapped[int] = mapped_column(Integer)
    tax_cop: Mapped[int] = mapped_column(Integer)
    shipping_cop: Mapped[int] = mapped_column(Integer)
    total_cop: Mapped[int] = mapped_column(Integer)
    ship_full_name: Mapped[str] = mapped_column(String(150))
    ship_phone: Mapped[str] = mapped_column(String(30))
    ship_address_line: Mapped[str] = mapped_column(String(255))
    ship_address_extra: Mapped[str | None] = mapped_column(String(255))
    ship_city: Mapped[str] = mapped_column(String(100))
    ship_department: Mapped[str] = mapped_column(String(100))
    ship_postal_code: Mapped[str] = mapped_column(String(10))
    ship_notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[UserModel] = relationship()
    items: Mapped[list["OrderItemModel"]] = relationship(
        order_by="OrderItemModel.id", cascade="all, delete-orphan", back_populates="order"
    )
    history: Mapped[list["OrderStatusHistoryModel"]] = relationship(
        order_by="OrderStatusHistoryModel.id", cascade="all, delete-orphan", back_populates="order"
    )
    payments: Mapped[list["PaymentModel"]] = relationship(order_by="PaymentModel.id", back_populates="order")


class OrderItemModel(Base):
    __tablename__ = "order_items"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("product_variants.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(180))
    product_slug: Mapped[str] = mapped_column(String(180))
    image_url: Mapped[str | None] = mapped_column(String(500))
    size_code: Mapped[str] = mapped_column(String(4))
    color_name: Mapped[str] = mapped_column(String(60))
    unit_price_cop: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)
    line_total_cop: Mapped[int] = mapped_column(Integer)
    order: Mapped[OrderModel] = relationship(back_populates="items")


class OrderStatusHistoryModel(Base):
    __tablename__ = "order_status_history"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(20))
    to_status: Mapped[str] = mapped_column(String(20))
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    order: Mapped[OrderModel] = relationship(back_populates="history")


class PaymentModel(Base):
    __tablename__ = "payments"
    __table_args__ = (TABLE_OPTS,)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(30))
    reference: Mapped[str] = mapped_column(String(60), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    amount_cop: Mapped[int] = mapped_column(Integer)
    provider_message: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    order: Mapped[OrderModel] = relationship(back_populates="payments")


class InventoryMovementModel(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (Index("ix_movements_variant_created", "variant_id", "created_at"), TABLE_OPTS)
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("product_variants.id"))
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(String(500))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
