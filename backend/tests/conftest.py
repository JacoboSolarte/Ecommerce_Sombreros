from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.infrastructure.config import Settings
from app.infrastructure.db.models import Base
from app.infrastructure.services import BcryptPasswordHasher
from app.main import create_app
from tests.factories import ADMIN, CUSTOMER, seed_basic


@pytest.fixture(scope="session")
def app(tmp_path_factory):
    base = Settings()
    settings = Settings(database_url=base.test_database_url, uploads_dir=tmp_path_factory.mktemp("uploads"))
    application = create_app(settings)
    container = application.state.container
    container.hasher = BcryptPasswordHasher(rounds=4)  # fast hashing in tests
    Base.metadata.drop_all(container.engine)
    Base.metadata.create_all(container.engine)
    yield application
    container.engine.dispose()


@pytest.fixture
def container(app):
    return app.state.container


@pytest.fixture
def clean_db(app):
    engine = app.state.container.engine
    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"DELETE FROM `{table.name}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))


@pytest.fixture
def db(container, clean_db):
    s = sessionmaker(container.engine, expire_on_commit=False)()
    yield s
    s.close()


@pytest.fixture
def data(db, container):
    return seed_basic(db, container.hasher)


@pytest.fixture
def new_client(app, clean_db):
    clients = []

    def make() -> TestClient:
        c = TestClient(app, raise_server_exceptions=False)
        clients.append(c)
        return c

    yield make
    for c in clients:
        c.close()


@pytest.fixture
def anon(new_client):
    return new_client()


def _login(client: TestClient, creds):
    r = client.post("/api/auth/login", json={"email": creds[0], "password": creds[1]})
    assert r.status_code == 200, r.text
    return client


@pytest.fixture
def customer(new_client, data):
    return _login(new_client(), CUSTOMER)


@pytest.fixture
def admin(new_client, data):
    return _login(new_client(), ADMIN)
