from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.db.repo_admin_products import SqlAdminProductRepository
from app.infrastructure.db.repo_basic import SqlAuditLogRepository, SqlRevokedTokenRepository, SqlUserRepository
from app.infrastructure.db.repo_cart import SqlCartRepository
from app.infrastructure.db.repo_catalog import SqlCatalogRepository
from app.infrastructure.db.repo_inventory import SqlInventoryRepository, SqlReportRepository
from app.infrastructure.db.repo_orders import SqlOrderRepository, SqlPaymentRepository


def make_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True, pool_recycle=1800, future=True)


class SqlAlchemyUnitOfWork:
    """One session = one transaction. Leaving the block without commit() rolls back."""

    def __init__(self, session_factory: sessionmaker[Session], low_stock_threshold: int, free_shipping_from_cop: int):
        self._factory = session_factory
        self._low = low_stock_threshold
        self._free_from = free_shipping_from_cop

    def __enter__(self) -> "SqlAlchemyUnitOfWork":
        self.session = self._factory()
        s = self.session
        self.users = SqlUserRepository(s)
        self.tokens = SqlRevokedTokenRepository(s)
        self.audit = SqlAuditLogRepository(s)
        self.catalog = SqlCatalogRepository(s, self._low)
        self.admin_products = SqlAdminProductRepository(s, self._low)
        self.carts = SqlCartRepository(s)
        self.orders = SqlOrderRepository(s, self._free_from)
        self.payments = SqlPaymentRepository(s)
        self.inventory = SqlInventoryRepository(s, self._low)
        self.reports = SqlReportRepository(s, self._low)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            if exc_type:
                self.session.rollback()
        finally:
            self.session.close()

    def commit(self) -> None:
        self.session.commit()

    def rollback(self) -> None:
        self.session.rollback()
