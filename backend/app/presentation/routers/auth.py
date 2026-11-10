from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from app.application.dto import IssuedToken
from app.application.use_cases.auth import AuthenticateToken, LoginUser, LogoutUser, RegisterUser
from app.application.use_cases.users import UpdateProfile
from app.container import Container
from app.domain.entities import User
from app.presentation.deps import COOKIE_NAME, get_container, get_current_user, session_token
from app.presentation.schemas import LoginIn, ProfileIn, RegisterIn, UserOut

router = APIRouter(tags=["auth"])


def _set_cookie(response: Response, issued: IssuedToken, c: Container) -> None:
    response.set_cookie(
        COOKIE_NAME, issued.token, max_age=c.settings.jwt_expires_minutes * 60, httponly=True, samesite="lax",
        secure=c.settings.cookie_secure, path="/",
    )


@router.post("/auth/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, response: Response, c: Container = Depends(get_container)):
    user, issued = RegisterUser(c.uow, c.hasher, c.tokens, c.clock)(
        full_name=body.full_name, email=body.email, password=body.password, phone=body.phone
    )
    _set_cookie(response, issued, c)
    return UserOut.model_validate(user)


@router.post("/auth/login", response_model=UserOut)
def login(body: LoginIn, response: Response, c: Container = Depends(get_container)):
    user, issued = LoginUser(c.uow, c.hasher, c.tokens)(email=body.email, password=body.password)
    _set_cookie(response, issued, c)
    return UserOut.model_validate(user)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, c: Container = Depends(get_container)):
    response = Response(status_code=204)
    token = session_token(request)
    if token:
        try:
            LogoutUser(c.uow)(AuthenticateToken(c.uow, c.tokens).claims(token))
        except Exception:  # an invalid/expired token just means nothing to revoke
            pass
    response.delete_cookie(COOKIE_NAME, path="/", samesite="lax", secure=c.settings.cookie_secure, httponly=True)
    return response


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.patch("/users/me", response_model=UserOut)
def update_me(body: ProfileIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    fields = body.model_dump(exclude_unset=True)
    updated = UpdateProfile(c.uow, c.clock)(user, **fields)
    return UserOut.model_validate(updated)
