"""Composition root."""
from __future__ import annotations

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.container import Container
from app.infrastructure.config import Settings
from app.presentation.deps import get_container
from app.presentation.errors import register_error_handlers
from app.presentation.routers import admin, auth, cart, catalog, orders


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    container = Container(settings)
    app = FastAPI(title="Casa Guaico API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.state.container = container

    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True,
        allow_methods=["*"], allow_headers=["*"],
    )
    register_error_handlers(app)

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["health"])
    def health(c: Container = Depends(get_container)):
        try:
            with c.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception:
            return JSONResponse({"status": "degraded", "database": "error"}, status_code=503)
        return {"status": "ok", "database": "ok"}

    for module in (auth, catalog, cart, orders, admin):
        api.include_router(module.router)
    app.include_router(api)

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
    return app


app = create_app()
