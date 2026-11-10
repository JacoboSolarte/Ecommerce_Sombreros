from __future__ import annotations

import re

from app.application.ports import Clock, UnitOfWorkFactory
from app.domain.entities import User
from app.domain.errors import NotFound, ValidationError


class UpdateProfile:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, user: User, *, full_name: str | None = None, phone: str | None = None,
                 document_id: str | None = None) -> User:
        errors: dict[str, str] = {}
        if full_name is not None and len(full_name.strip()) < 2:
            errors["fullName"] = "Ingresa tu nombre completo."
        if phone and not re.fullmatch(r"\d{7,10}", re.sub(r"[\s-]", "", phone)):
            errors["phone"] = "Ingresa un teléfono válido."
        if document_id and not re.fullmatch(r"[A-Za-z0-9]{5,20}", document_id.strip()):
            errors["documentId"] = "Ingresa un documento válido."
        if errors:
            raise ValidationError("Revisa los datos ingresados.", {"fields": errors})
        with self._uow() as uow:
            current = uow.users.get(user.id)
            if not current:
                raise NotFound()
            if full_name is not None:
                current.full_name = full_name.strip()
            if phone is not None:
                current.phone = re.sub(r"[\s-]", "", phone) or None
            if document_id is not None:
                current.document_id = document_id.strip() or None
            updated = uow.users.update(current, self._clock.now())
            uow.commit()
        return updated
