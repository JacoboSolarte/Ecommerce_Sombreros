from __future__ import annotations

from app.application.dto import ProductInput
from app.application.ports import Clock, FileStorage, Row, UnitOfWorkFactory
from app.domain.entities import User
from app.domain.errors import NotFound, ValidationError
from app.domain.validation import validate_product_data

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_SIGNATURES = {
    ".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",), ".png": (b"\x89PNG\r\n\x1a\n",), ".webp": (b"RIFF",),
}


def _validate(data: ProductInput) -> None:
    validate_product_data(
        name=data.name, sku=data.sku, price_cop=data.price_cop, compare_at=data.compare_at_price_cop,
        weave_grade=data.weave_grade, weaving_hours=data.weaving_hours, delivery_min=data.delivery_days_min,
        delivery_max=data.delivery_days_max, brim_cm=data.brim_cm,
    )
    seen = set()
    for v in data.variants:
        if v.stock < 0:
            raise ValidationError("El stock no puede ser negativo.", {"fields": {"variants": "Stock negativo."}})
        key = (v.size_code, v.color_id)
        if key in seen:
            raise ValidationError("Hay variantes repetidas (talla y color).", {"fields": {"variants": "Variante repetida."}})
        seen.add(key)
    if not data.variants:
        raise ValidationError("Agrega al menos una variante.", {"fields": {"variants": "Agrega al menos una variante."}})


class ListAdminProducts:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, q: str | None, status: str, page: int, page_size: int = 20) -> Row:
        status = status if status in ("active", "inactive", "all") else "all"
        with self._uow() as uow:
            return uow.admin_products.list_products((q or "").strip() or None, status, max(page, 1), page_size)


class GetAdminProduct:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, product_id: int) -> Row:
        with self._uow() as uow:
            product = uow.admin_products.get_detail(product_id)
        if not product:
            raise NotFound("No encontramos este producto.")
        return product


class CreateProduct:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, admin: User, data: ProductInput) -> Row:
        _validate(data)
        with self._uow() as uow:
            product_id = uow.admin_products.create(data, admin.id, self._clock.now())
            uow.commit()
            return uow.admin_products.get_detail(product_id)


class UpdateProduct:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, admin: User, product_id: int, data: ProductInput) -> Row:
        _validate(data)
        with self._uow() as uow:
            if not uow.admin_products.get_detail(product_id):
                raise NotFound("No encontramos este producto.")
            uow.admin_products.update(product_id, data, admin.id, self._clock.now())
            uow.commit()
            return uow.admin_products.get_detail(product_id)


class SetProductActive:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, product_id: int, active: bool) -> None:
        with self._uow() as uow:
            if not uow.admin_products.set_active(product_id, active, self._clock.now()):
                raise NotFound("No encontramos este producto.")
            uow.commit()


class ListFormOptions:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def categories(self) -> list[Row]:
        with self._uow() as uow:
            return uow.admin_products.list_categories()

    def artisans(self) -> list[Row]:
        with self._uow() as uow:
            return uow.admin_products.list_artisans()


class UploadImage:
    def __init__(self, storage: FileStorage):
        self._storage = storage

    def __call__(self, filename: str, content: bytes) -> str:
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in _SIGNATURES:
            raise ValidationError("Solo se aceptan imágenes JPG, PNG o WebP.")
        if len(content) > MAX_UPLOAD_BYTES:
            raise ValidationError("La imagen no puede superar 5 MB.")
        if not any(content.startswith(sig) for sig in _SIGNATURES[ext]) or (ext == ".webp" and content[8:12] != b"WEBP"):
            raise ValidationError("El archivo no es una imagen válida.")
        return self._storage.save(content, ".jpg" if ext == ".jpeg" else ext)
