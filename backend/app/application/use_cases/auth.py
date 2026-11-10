from __future__ import annotations

import re

from app.application.dto import IssuedToken, TokenClaims
from app.application.ports import Clock, PasswordHasher, TokenService, UnitOfWorkFactory
from app.domain.entities import User
from app.domain.errors import EmailTaken, InvalidCredentials, NotAuthenticated
from app.domain.validation import normalize_email, validate_registration


class RegisterUser:
    def __init__(self, uow: UnitOfWorkFactory, hasher: PasswordHasher, tokens: TokenService, clock: Clock):
        self._uow, self._hasher, self._tokens, self._clock = uow, hasher, tokens, clock

    def __call__(self, *, full_name: str, email: str, password: str, phone: str | None = None) -> tuple[User, IssuedToken]:
        validate_registration(full_name, email, password, phone)
        email = normalize_email(email)
        with self._uow() as uow:
            if uow.users.get_by_email(email):
                raise EmailTaken()
            user = uow.users.add(User(
                id=None, email=email, password_hash=self._hasher.hash(password), full_name=full_name.strip(),
                phone=re.sub(r"[\s-]", "", phone) if phone else None, created_at=self._clock.now(),
            ))
            uow.commit()
        return user, self._tokens.issue(user.id, user.role)


class LoginUser:
    def __init__(self, uow: UnitOfWorkFactory, hasher: PasswordHasher, tokens: TokenService):
        self._uow, self._hasher, self._tokens = uow, hasher, tokens

    def __call__(self, *, email: str, password: str) -> tuple[User, IssuedToken]:
        with self._uow() as uow:
            user = uow.users.get_by_email(normalize_email(email))
        if not user or not user.is_active or not self._hasher.verify(password, user.password_hash):
            raise InvalidCredentials()
        return user, self._tokens.issue(user.id, user.role)


class LogoutUser:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, claims: TokenClaims) -> None:
        with self._uow() as uow:
            uow.tokens.revoke(claims.jti, claims.expires_at)
            uow.commit()


class AuthenticateToken:
    """Resolves a session token to an active user, rejecting revoked tokens."""

    def __init__(self, uow: UnitOfWorkFactory, tokens: TokenService):
        self._uow, self._tokens = uow, tokens

    def claims(self, token: str | None) -> TokenClaims:
        if not token:
            raise NotAuthenticated()
        return self._tokens.decode(token)

    def __call__(self, token: str | None) -> User:
        claims = self.claims(token)
        with self._uow() as uow:
            if uow.tokens.is_revoked(claims.jti):
                raise NotAuthenticated("Tu sesión ya no es válida. Inicia sesión de nuevo.")
            user = uow.users.get(claims.user_id)
        if not user or not user.is_active:
            raise NotAuthenticated()
        return user


class RecordAccessDenied:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, *, user: User | None, path: str, ip: str | None) -> None:
        with self._uow() as uow:
            uow.audit.add(
                user_id=user.id if user else None, action="ACCESS_DENIED", path=path, ip=ip,
                detail=f"role={user.role}" if user else "anonymous", now=self._clock.now(),
            )
            uow.commit()
