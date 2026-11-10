"""Pure validation rules (passwords, emails, shipping, product data)."""
from __future__ import annotations

import re
import unicodedata

from app.domain.entities import ShippingInfo
from app.domain.errors import ValidationError

DEPARTMENTS = [
    "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
    "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
    "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
    "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre",
    "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
]
WEAVE_GRADES = ("fino", "superfino", "extrafino")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def _fold(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn").strip()


_DEPT_LOOKUP = {_fold(d): d for d in DEPARTMENTS}


def _fail(fields: dict[str, str]) -> None:
    if fields:
        raise ValidationError("Revisa los datos ingresados.", {"fields": fields})


def normalize_email(email: str) -> str:
    return email.strip().lower()


def password_errors(password: str) -> dict[str, str]:
    if len(password) < 8:
        return {"password": "La contraseña debe tener al menos 8 caracteres."}
    if len(password) > 64:
        return {"password": "La contraseña no puede superar 64 caracteres."}
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return {"password": "La contraseña debe incluir al menos una letra y un número."}
    return {}


def validate_registration(full_name: str, email: str, password: str, phone: str | None) -> None:
    errors: dict[str, str] = {}
    if len(full_name.strip()) < 2:
        errors["fullName"] = "Ingresa tu nombre completo."
    if not _EMAIL.match(normalize_email(email)):
        errors["email"] = "Ingresa un correo válido."
    errors.update(password_errors(password))
    if phone and not re.fullmatch(r"\d{7,10}", re.sub(r"[\s-]", "", phone)):
        errors["phone"] = "Ingresa un teléfono válido."
    _fail(errors)


def validate_shipping(data: ShippingInfo) -> ShippingInfo:
    errors: dict[str, str] = {}
    phone = re.sub(r"[\s-]", "", data.phone or "")
    if len(data.full_name.strip()) < 3:
        errors["fullName"] = "Ingresa el nombre de quien recibe."
    if not (re.fullmatch(r"3\d{9}", phone) or re.fullmatch(r"\d{7,10}", phone)):
        errors["phone"] = "Ingresa un celular de 10 dígitos que empiece por 3, o un teléfono de 7 a 10 dígitos."
    if len(data.address_line.strip()) < 5:
        errors["addressLine"] = "Ingresa la dirección de entrega."
    if len(data.city.strip()) < 2:
        errors["city"] = "Ingresa la ciudad o municipio."
    department = _DEPT_LOOKUP.get(_fold(data.department or ""))
    if department is None:
        errors["department"] = "Selecciona un departamento válido."
    if not re.fullmatch(r"\d{6}", (data.postal_code or "").strip()):
        errors["postalCode"] = "El código postal debe tener 6 dígitos."
    _fail(errors)
    return ShippingInfo(
        full_name=data.full_name.strip(), phone=phone, address_line=data.address_line.strip(),
        address_extra=(data.address_extra or "").strip() or None, city=data.city.strip(),
        department=department or "", postal_code=data.postal_code.strip(),
        notes=(data.notes or "").strip() or None,
    )


def validate_product_data(*, name: str, sku: str, price_cop: int, compare_at: int | None, weave_grade: str,
                          weaving_hours: int, delivery_min: int, delivery_max: int, brim_cm: float) -> None:
    errors: dict[str, str] = {}
    if len(name.strip()) < 3:
        errors["name"] = "El nombre es obligatorio."
    if not sku.strip():
        errors["sku"] = "El SKU es obligatorio."
    if price_cop <= 0:
        errors["priceCop"] = "El precio debe ser mayor a cero."
    if compare_at is not None and compare_at <= price_cop:
        errors["compareAtPriceCop"] = "El precio anterior debe ser mayor al precio actual."
    if weave_grade not in WEAVE_GRADES:
        errors["weaveGrade"] = "Tejido no válido."
    if weaving_hours <= 0:
        errors["weavingHours"] = "Las horas de tejido deben ser mayores a cero."
    if brim_cm <= 0:
        errors["brimCm"] = "El ala debe medir más de cero."
    if delivery_min < 0 or delivery_max < delivery_min:
        errors["deliveryDaysMax"] = "Los días de entrega no son válidos."
    _fail(errors)
