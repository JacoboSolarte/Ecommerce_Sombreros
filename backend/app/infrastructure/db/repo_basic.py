from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.entities import User
from app.domain.errors import EmailTaken
from app.infrastructure.db.models import AuditLogModel, RevokedTokenModel, UserModel


def _to_user(m: UserModel) -> User:
    return User(id=m.id, email=m.email, password_hash=m.password_hash, full_name=m.full_name, phone=m.phone,
                document_id=m.document_id, role=m.role, is_active=m.is_active, created_at=m.created_at)


class SqlUserRepository:
    def __init__(self, session: Session):
        self.s = session

    def add(self, user: User) -> User:
        m = UserModel(email=user.email, password_hash=user.password_hash, full_name=user.full_name, phone=user.phone,
                      document_id=user.document_id, role=user.role, is_active=user.is_active,
                      created_at=user.created_at, updated_at=user.created_at)
        self.s.add(m)
        try:
            self.s.flush()
        except IntegrityError as exc:
            raise EmailTaken() from exc
        return _to_user(m)

    def get(self, user_id: int) -> User | None:
        m = self.s.get(UserModel, user_id)
        return _to_user(m) if m else None

    def get_by_email(self, email: str) -> User | None:
        m = self.s.scalar(select(UserModel).where(UserModel.email == email))
        return _to_user(m) if m else None

    def update(self, user: User, now: datetime) -> User:
        m = self.s.get(UserModel, user.id)
        m.full_name, m.phone, m.document_id, m.updated_at = user.full_name, user.phone, user.document_id, now
        self.s.flush()
        return _to_user(m)


class SqlRevokedTokenRepository:
    def __init__(self, session: Session):
        self.s = session

    def revoke(self, jti: str, expires_at: datetime) -> None:
        if not self.s.get(RevokedTokenModel, jti):
            self.s.add(RevokedTokenModel(jti=jti, expires_at=expires_at))
            self.s.flush()

    def is_revoked(self, jti: str) -> bool:
        return self.s.get(RevokedTokenModel, jti) is not None


class SqlAuditLogRepository:
    def __init__(self, session: Session):
        self.s = session

    def add(self, *, user_id, action, path, ip, detail, now) -> None:
        self.s.add(AuditLogModel(user_id=user_id, action=action, path=path[:255], ip=ip, detail=detail, created_at=now))
        self.s.flush()
