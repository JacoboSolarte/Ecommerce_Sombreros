"""Wires infrastructure adapters; the only place that knows every concrete class."""
from __future__ import annotations

from sqlalchemy.orm import sessionmaker

from app.application.dto import AppConfig
from app.domain.pricing import PricingPolicy
from app.infrastructure.config import Settings
from app.infrastructure.db.uow import SqlAlchemyUnitOfWork, make_engine
from app.infrastructure.services import (
    BcryptPasswordHasher, JwtTokenService, LocalFileStorage, SimulatedPaymentGateway, SystemClock,
)


class Container:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.engine = make_engine(settings.database_url)
        self._sessions = sessionmaker(self.engine, expire_on_commit=False)
        self.clock = SystemClock()
        self.hasher = BcryptPasswordHasher()
        self.tokens = JwtTokenService(settings.jwt_secret, settings.jwt_expires_minutes, self.clock)
        self.gateway = SimulatedPaymentGateway(settings.frontend_url)
        self.storage = LocalFileStorage(settings.uploads_dir)
        self.config = AppConfig(
            pricing=PricingPolicy(settings.tax_rate, settings.shipping_flat_cop, settings.free_shipping_from_cop),
            low_stock_threshold=settings.low_stock_threshold,
            frontend_url=settings.frontend_url,
        )

    def uow(self) -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(self._sessions, self.config.low_stock_threshold, self.config.pricing.free_shipping_from_cop)
