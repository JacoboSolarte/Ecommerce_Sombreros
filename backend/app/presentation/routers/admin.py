from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile

from app.application.dto import AdminOrderFilters, ImageInput, ProductInput, VariantInput
from app.application.use_cases import admin_inventory as inv_uc
from app.application.use_cases import admin_orders as ord_uc
from app.application.use_cases import admin_products as prod_uc
from app.application.use_cases.admin_reports import SalesSummary
from app.container import Container
from app.domain.entities import User
from app.domain.errors import ValidationError
from app.presentation.deps import get_container, require_admin
from app.presentation.schemas import (
    AdjustIn, AdminOrderListOut, AdminOrderOut, AdminOrderSummaryOut, AdminProductDetailOut, AdminProductListOut,
    ArtisanOption, CategoryOption, CustomerOut, InventoryRowOut, MovementOut, ProductIn, StatusChangeIn, SummaryOut,
    UploadOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _product_input(body: ProductIn) -> ProductInput:
    return ProductInput(
        name=body.name, sku=body.sku, short_description=body.short_description, description=body.description,
        price_cop=body.price_cop, compare_at_price_cop=body.compare_at_price_cop, category_id=body.category_id,
        artisan_id=body.artisan_id, weave_grade=body.weave_grade, weaving_hours=body.weaving_hours,
        brim_cm=body.brim_cm, delivery_days_min=body.delivery_days_min, delivery_days_max=body.delivery_days_max,
        is_featured=body.is_featured, images=[ImageInput(i.url, i.alt) for i in body.images],
        variants=[VariantInput(v.size_code, v.color_id, v.stock) for v in body.variants],
    )


@router.get("/summary", response_model=SummaryOut)
def summary(date_from: date | None = Query(None, alias="from"), date_to: date | None = Query(None, alias="to"),
            _: User = Depends(require_admin), c: Container = Depends(get_container)):
    return SalesSummary(c.uow, c.clock)(date_from, date_to)


# ----- products -----
@router.get("/products", response_model=AdminProductListOut)
def list_products(q: str | None = None, status: str = "all", page: int = Query(1, ge=1),
                  pageSize: int = Query(20, ge=1, le=100), _: User = Depends(require_admin),
                  c: Container = Depends(get_container)):
    return prod_uc.ListAdminProducts(c.uow)(q, status, page, pageSize)


@router.post("/products", response_model=AdminProductDetailOut, status_code=201)
def create_product(body: ProductIn, admin: User = Depends(require_admin), c: Container = Depends(get_container)):
    return prod_uc.CreateProduct(c.uow, c.clock)(admin, _product_input(body))


@router.get("/products/{product_id}", response_model=AdminProductDetailOut)
def get_product(product_id: int, _: User = Depends(require_admin), c: Container = Depends(get_container)):
    return prod_uc.GetAdminProduct(c.uow)(product_id)


@router.put("/products/{product_id}", response_model=AdminProductDetailOut)
def update_product(product_id: int, body: ProductIn, admin: User = Depends(require_admin),
                   c: Container = Depends(get_container)):
    return prod_uc.UpdateProduct(c.uow, c.clock)(admin, product_id, _product_input(body))


@router.post("/products/{product_id}/deactivate", status_code=204)
def deactivate(product_id: int, _: User = Depends(require_admin), c: Container = Depends(get_container)):
    prod_uc.SetProductActive(c.uow, c.clock)(product_id, False)
    return Response(status_code=204)


@router.post("/products/{product_id}/activate", status_code=204)
def activate(product_id: int, _: User = Depends(require_admin), c: Container = Depends(get_container)):
    prod_uc.SetProductActive(c.uow, c.clock)(product_id, True)
    return Response(status_code=204)


@router.post("/uploads", response_model=UploadOut, status_code=201)
def upload(file: UploadFile = File(...), _: User = Depends(require_admin), c: Container = Depends(get_container)):
    content = file.file.read(prod_uc.MAX_UPLOAD_BYTES + 1)
    if not file.filename:
        raise ValidationError("Selecciona un archivo.")
    return UploadOut(url=prod_uc.UploadImage(c.storage)(file.filename, content))


@router.get("/categories", response_model=list[CategoryOption])
def categories(_: User = Depends(require_admin), c: Container = Depends(get_container)):
    return prod_uc.ListFormOptions(c.uow).categories()


@router.get("/artisans", response_model=list[ArtisanOption])
def artisans(_: User = Depends(require_admin), c: Container = Depends(get_container)):
    return prod_uc.ListFormOptions(c.uow).artisans()


# ----- inventory -----
@router.get("/inventory", response_model=list[InventoryRowOut])
def inventory(q: str | None = None, lowStock: bool = False, _: User = Depends(require_admin),
              c: Container = Depends(get_container)):
    return inv_uc.ListInventory(c.uow)(q, lowStock)


@router.post("/inventory/{variant_id}/adjust", response_model=InventoryRowOut)
def adjust(variant_id: int, body: AdjustIn, admin: User = Depends(require_admin), c: Container = Depends(get_container)):
    return inv_uc.AdjustStock(c.uow, c.clock)(admin, variant_id, body.delta, body.reason, body.note)


@router.get("/inventory/{variant_id}/movements", response_model=list[MovementOut])
def movements(variant_id: int, _: User = Depends(require_admin), c: Container = Depends(get_container)):
    return inv_uc.ListMovements(c.uow)(variant_id)


# ----- orders -----
def _admin_order(order, customer, allowed) -> AdminOrderOut:
    base = AdminOrderOut.model_validate({
        "id": order.id, "number": order.number, "status": order.status, "created_at": order.created_at,
        "items": order.items, "totals": order.totals, "shipping": order.shipping, "history": order.history,
        "payments": order.payments, "customer": CustomerOut.model_validate(customer),
        "allowed_transitions": [s.value for s in allowed],
    })
    return base


@router.get("/orders", response_model=AdminOrderListOut)
def list_orders(status: str | None = None, date_from: date | None = Query(None, alias="from"),
                date_to: date | None = Query(None, alias="to"), q: str | None = None, page: int = Query(1, ge=1),
                pageSize: int = Query(20, ge=1, le=100), _: User = Depends(require_admin),
                c: Container = Depends(get_container)):
    filters = AdminOrderFilters(status=status or None, date_from=date_from, date_to=date_to,
                                q=(q or "").strip() or None, page=page, page_size=pageSize)
    items, total = ord_uc.ListAdminOrders(c.uow)(filters)
    return AdminOrderListOut(items=[AdminOrderSummaryOut.model_validate(i) for i in items], total=total)


@router.get("/orders/{order_id}", response_model=AdminOrderOut)
def get_order(order_id: int, _: User = Depends(require_admin), c: Container = Depends(get_container)):
    return _admin_order(*ord_uc.GetAdminOrder(c.uow)(order_id))


@router.post("/orders/{order_id}/status", response_model=AdminOrderOut)
def change_status(order_id: int, body: StatusChangeIn, admin: User = Depends(require_admin),
                  c: Container = Depends(get_container)):
    ord_uc.TransitionOrder(c.uow, c.clock)(admin, order_id, body.status, body.note)
    return _admin_order(*ord_uc.GetAdminOrder(c.uow)(order_id))
