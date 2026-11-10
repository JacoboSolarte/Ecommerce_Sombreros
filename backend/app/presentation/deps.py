from __future__ import annotations

from fastapi import Depends, Request

from app.application.use_cases.auth import AuthenticateToken, RecordAccessDenied
from app.container import Container
from app.domain.entities import User
from app.domain.errors import Forbidden, NotAuthenticated

COOKIE_NAME = "cg_session"


def get_container(request: Request) -> Container:
    return request.app.state.container


def session_token(request: Request) -> str | None:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("authorization", "")
    return auth[7:] if auth.lower().startswith("bearer ") else None


def get_current_user(request: Request, c: Container = Depends(get_container)) -> User:
    return AuthenticateToken(c.uow, c.tokens)(session_token(request))


def get_optional_user(request: Request, c: Container = Depends(get_container)) -> User | None:
    try:
        return get_current_user(request, c)
    except NotAuthenticated:
        return None


def require_admin(request: Request, c: Container = Depends(get_container),
                  user: User | None = Depends(get_optional_user)) -> User:
    if user is not None and user.is_admin:
        return user
    RecordAccessDenied(c.uow, c.clock)(user=user, path=request.url.path, ip=request.client.host if request.client else None)
    if user is None:
        raise NotAuthenticated()
    raise Forbidden()
