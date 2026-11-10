from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "mysql+pymysql://root:CHANGE_ME@localhost:3306/casa_guaico?charset=utf8mb4"
    test_database_url: str = "mysql+pymysql://root:CHANGE_ME@localhost:3306/casa_guaico_test?charset=utf8mb4"
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_expires_minutes: int = 10080
    cookie_secure: bool = False
    cors_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"
    tax_rate: Decimal = Decimal("0.19")
    shipping_flat_cop: int = 12000
    free_shipping_from_cop: int = 250000
    low_stock_threshold: int = 3
    payment_provider: str = "simulator"
    uploads_dir: Path = BACKEND_DIR / "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
