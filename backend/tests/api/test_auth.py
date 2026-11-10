from sqlalchemy import text

from tests.factories import CUSTOMER


def test_health(anon, data):
    r = anon.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "database": "ok"}


def test_register_logs_in_and_sets_cookie(anon):
    r = anon.post("/api/auth/register", json={"fullName": "Luz Mora", "email": "Luz@Correo.co", "password": "Segura123"})
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "luz@correo.co" and body["role"] == "customer" and "passwordHash" not in body
    assert "httponly" in r.headers["set-cookie"].lower() and "cg_session" in r.headers["set-cookie"]
    assert anon.get("/api/auth/me").json()["fullName"] == "Luz Mora"


def test_register_rejects_weak_password_and_duplicate(anon, data):
    r = anon.post("/api/auth/register", json={"fullName": "Luz Mora", "email": "x@y.co", "password": "corta"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "password" in r.json()["error"]["details"]["fields"]
    r = anon.post("/api/auth/register", json={"fullName": "Otro", "email": CUSTOMER[0], "password": "Segura123"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "EMAIL_TAKEN"


def test_missing_field_is_422_in_spanish(anon):
    r = anon.post("/api/auth/register", json={"email": "a@b.co"})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR" and err["details"]["fields"]["fullName"] == "Este campo es obligatorio."


def test_login_wrong_password(anon, data):
    r = anon.post("/api/auth/login", json={"email": CUSTOMER[0], "password": "Mala12345"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_requires_login(anon):
    r = anon.get("/api/auth/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_logout_revokes_token(customer, new_client, container):
    token = customer.cookies.get("cg_session")
    assert customer.get("/api/auth/me").status_code == 200
    assert customer.post("/api/auth/logout").status_code == 204
    assert customer.get("/api/auth/me").status_code == 401
    # replaying the old token is rejected server-side too
    other = new_client()
    other.cookies.set("cg_session", token)
    assert other.get("/api/auth/me").status_code == 401
    with container.engine.connect() as c:
        assert c.execute(text("SELECT COUNT(*) FROM revoked_tokens")).scalar() == 1


def test_update_profile(customer):
    r = customer.patch("/api/users/me", json={"fullName": "Nuevo Nombre", "phone": "3001112233", "documentId": "1085123456"})
    assert r.status_code == 200 and r.json()["fullName"] == "Nuevo Nombre" and r.json()["documentId"] == "1085123456"


def test_customer_forbidden_on_admin_and_audited(customer, container):
    r = customer.get("/api/admin/summary")
    assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN"
    with container.engine.connect() as c:
        row = c.execute(text("SELECT action, path, user_id FROM audit_log")).one()
    assert row[0] == "ACCESS_DENIED" and row[1] == "/api/admin/summary" and row[2] is not None


def test_anonymous_on_admin_is_401_and_audited(anon, container):
    assert anon.get("/api/admin/products").status_code == 401
    with container.engine.connect() as c:
        assert c.execute(text("SELECT COUNT(*) FROM audit_log WHERE user_id IS NULL")).scalar() == 1


def test_admin_allowed(admin):
    assert admin.get("/api/admin/summary").status_code == 200
