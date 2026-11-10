from __future__ import annotations

from datetime import date, timedelta

from app.application.ports import Clock, Row, UnitOfWorkFactory
from app.domain.errors import ValidationError

COLOMBIA_OFFSET_HOURS = 5


class SalesSummary:
    def __init__(self, uow: UnitOfWorkFactory, clock: Clock):
        self._uow, self._clock = uow, clock

    def __call__(self, date_from: date | None, date_to: date | None) -> Row:
        today = (self._clock.now() - timedelta(hours=COLOMBIA_OFFSET_HOURS)).date()
        date_to = date_to or today
        date_from = date_from or date_to - timedelta(days=29)
        if date_from > date_to:
            raise ValidationError("La fecha inicial no puede ser posterior a la final.")
        if (date_to - date_from).days > 366:
            raise ValidationError("El rango máximo es de un año.")
        with self._uow() as uow:
            return uow.reports.summary(date_from, date_to)
