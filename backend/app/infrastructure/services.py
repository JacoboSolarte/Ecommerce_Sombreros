"""Adapters: clock, bcrypt, JWT, simulated payment gateway, local file storage."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt

from app.application.dto import GatewayResult, IssuedToken, PaymentIntent, TokenClaims
from app.domain.errors import NotAuthenticated, PaymentError


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)


class BcryptPasswordHasher:
    def __init__(self, rounds: int = 12):
        self._rounds = rounds

    def hash(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=self._rounds)).decode()

    def verify(self, password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except ValueError:
            return False


class JwtTokenService:
    def __init__(self, secret: str, expires_minutes: int, clock: SystemClock | None = None):
        self._secret, self._minutes, self._clock = secret, expires_minutes, clock or SystemClock()

    def issue(self, user_id: int, role: str) -> IssuedToken:
        jti = uuid.uuid4().hex
        expires = self._clock.now() + timedelta(minutes=self._minutes)
        token = jwt.encode(
            {"sub": str(user_id), "role": role, "jti": jti, "exp": expires.replace(tzinfo=timezone.utc)},
            self._secret, algorithm="HS256",
        )
        return IssuedToken(token=token, jti=jti, expires_at=expires)

    def decode(self, token: str) -> TokenClaims:
        try:
            data = jwt.decode(token, self._secret, algorithms=["HS256"], options={"require": ["exp", "sub", "jti"]})
            expires = datetime.fromtimestamp(data["exp"], timezone.utc).replace(tzinfo=None)
            return TokenClaims(user_id=int(data["sub"]), role=data.get("role", "customer"), jti=data["jti"], expires_at=expires)
        except (jwt.PyJWTError, ValueError) as exc:
            raise NotAuthenticated("Tu sesión expiró. Inicia sesión de nuevo.") from exc


class SimulatedPaymentGateway:
    """Stands in for Wompi / Mercado Pago. No card data is ever handled."""

    provider = "simulator"
    _OUTCOMES = {
        "approved": "Pago aprobado por el simulador.",
        "declined": "Pago rechazado por el simulador.",
        "failed": "El simulador reportó un error al procesar el pago.",
    }

    def __init__(self, frontend_url: str):
        self._frontend_url = frontend_url.rstrip("/")

    def create_payment(self, order_number: str, amount_cop: int) -> PaymentIntent:
        reference = f"SIM-{order_number.replace('CG-', '')}-{secrets.token_hex(4).upper()}"
        return PaymentIntent(
            reference=reference, redirect_url=f"{self._frontend_url}/pago/simulador?ref={reference}", provider=self.provider
        )

    def resolve(self, outcome: str) -> GatewayResult:
        if outcome not in self._OUTCOMES:
            raise PaymentError("Resultado de pago no válido.")
        return GatewayResult(status=outcome, message=self._OUTCOMES[outcome])


class LocalFileStorage:
    def __init__(self, directory: Path):
        self._dir = directory
        self._dir.mkdir(parents=True, exist_ok=True)

    def save(self, content: bytes, extension: str) -> str:
        name = f"{uuid.uuid4().hex}{extension}"
        (self._dir / name).write_bytes(content)
        return f"/api/uploads/{name}"
