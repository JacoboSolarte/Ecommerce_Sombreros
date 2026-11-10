"""Domain errors. The presentation layer maps each one to an HTTP status."""
from __future__ import annotations

from typing import Any


class DomainError(Exception):
    code = "INTERNAL_ERROR"
    default_message = "Ocurrió un error inesperado."

    def __init__(self, message: str | None = None, details: dict[str, Any] | None = None):
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)


class ValidationError(DomainError):
    code = "VALIDATION_ERROR"
    default_message = "Los datos enviados no son válidos."


class NotAuthenticated(DomainError):
    code = "NOT_AUTHENTICATED"
    default_message = "Debes iniciar sesión para continuar."


class Forbidden(DomainError):
    code = "FORBIDDEN"
    default_message = "No tienes permisos para realizar esta acción."


class NotFound(DomainError):
    code = "NOT_FOUND"
    default_message = "No encontramos lo que buscas."


class EmailTaken(DomainError):
    code = "EMAIL_TAKEN"
    default_message = "Ya existe una cuenta con este correo."


class InvalidCredentials(DomainError):
    code = "INVALID_CREDENTIALS"
    default_message = "Correo o contraseña incorrectos."


class OutOfStock(DomainError):
    code = "OUT_OF_STOCK"
    default_message = "No hay suficiente stock disponible."


class CartEmpty(DomainError):
    code = "CART_EMPTY"
    default_message = "Tu carrito está vacío."


class InvalidTransition(DomainError):
    code = "INVALID_TRANSITION"
    default_message = "El cambio de estado no es válido."


class PaymentError(DomainError):
    code = "PAYMENT_ERROR"
    default_message = "No pudimos procesar el pago."
