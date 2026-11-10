"""Global exception handlers -> {"error": {code, message, details}}. Never leaks stack traces."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain import errors as e

log = logging.getLogger("casa_guaico")

STATUS = {
    e.ValidationError: 400, e.NotAuthenticated: 401, e.InvalidCredentials: 401, e.Forbidden: 403, e.NotFound: 404,
    e.EmailTaken: 409, e.OutOfStock: 409, e.CartEmpty: 400, e.InvalidTransition: 409, e.PaymentError: 409,
}
HTTP_CODES = {
    400: "VALIDATION_ERROR", 401: "NOT_AUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "NOT_FOUND",
    409: "VALIDATION_ERROR", 422: "VALIDATION_ERROR",
}
HTTP_MESSAGES = {
    401: "Debes iniciar sesión para continuar.", 403: "No tienes permisos para realizar esta acción.",
    404: "No encontramos lo que buscas.", 405: "Operación no permitida.",
}
TYPE_MESSAGES = {
    "missing": "Este campo es obligatorio.",
    "string_too_short": "El texto es demasiado corto.",
    "string_too_long": "El texto es demasiado largo.",
    "int_parsing": "Debe ser un número entero.",
    "int_type": "Debe ser un número entero.",
    "float_parsing": "Debe ser un número.",
    "bool_parsing": "Debe ser verdadero o falso.",
    "greater_than_equal": "El valor es menor al mínimo permitido.",
    "less_than_equal": "El valor supera el máximo permitido.",
    "greater_than": "El valor es demasiado bajo.",
    "less_than": "El valor es demasiado alto.",
    "string_type": "Debe ser un texto.",
    "literal_error": "Valor no permitido.",
    "date_from_datetime_parsing": "Fecha no válida (usa AAAA-MM-DD).",
    "date_parsing": "Fecha no válida (usa AAAA-MM-DD).",
    "json_invalid": "El cuerpo de la solicitud no es un JSON válido.",
    "too_long": "Hay demasiados elementos.",
    "list_type": "Debe ser una lista.",
}


def error_body(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(e.DomainError)
    async def domain_error(_: Request, exc: e.DomainError):
        status = next((s for cls, s in STATUS.items() if isinstance(exc, cls)), 400)
        return JSONResponse(error_body(exc.code, exc.message, exc.details), status_code=status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err["loc"] if p not in ("body", "query", "path")]
            fields.setdefault(".".join(loc) or "body", TYPE_MESSAGES.get(err["type"], "Valor no válido."))
        return JSONResponse(error_body("VALIDATION_ERROR", "Revisa los datos enviados.", {"fields": fields}), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        code = HTTP_CODES.get(exc.status_code, "INTERNAL_ERROR" if exc.status_code >= 500 else "VALIDATION_ERROR")
        message = HTTP_MESSAGES.get(exc.status_code, "No pudimos procesar la solicitud.")
        return JSONResponse(error_body(code, message), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error", exc_info=exc)
        return JSONResponse(error_body("INTERNAL_ERROR", "Ocurrió un error inesperado. Intenta de nuevo."), status_code=500)
