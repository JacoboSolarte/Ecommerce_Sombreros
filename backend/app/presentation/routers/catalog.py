from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.application.dto import ProductFilters
from app.application.use_cases import catalog as uc
from app.container import Container
from app.presentation.deps import get_container
from app.presentation.schemas import (
    ArtisanDetailOut, CategoryOut, ColorOut, ProductCardOut, ProductDetailOut, ProductListOut, SizeOut,
)

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def categories(c: Container = Depends(get_container)):
    return uc.ListCategories(c.uow)()


@router.get("/colors", response_model=list[ColorOut])
def colors(c: Container = Depends(get_container)):
    return uc.ListColors(c.uow)()


@router.get("/sizes", response_model=list[SizeOut])
def sizes(c: Container = Depends(get_container)):
    return uc.ListSizes(c.uow)()


@router.get("/products", response_model=ProductListOut)
def list_products(
    q: str | None = Query(None, max_length=100), category: str | None = None, color: int | None = None,
    size: str | None = Query(None, max_length=4), minPrice: int | None = Query(None, ge=0),
    maxPrice: int | None = Query(None, ge=0), weave: str | None = None, inStock: bool = False,
    sort: Literal["relevance", "price_asc", "price_desc", "newest"] = "relevance",
    page: int = Query(1, ge=1), pageSize: int = Query(24, ge=1, le=60), c: Container = Depends(get_container),
):
    filters = ProductFilters(q=q, category=category, color=color, size=size, min_price=minPrice, max_price=maxPrice,
                             weave=weave, in_stock=inStock, sort=sort, page=page, page_size=pageSize)
    return uc.SearchProducts(c.uow)(filters)


@router.get("/products/featured", response_model=list[ProductCardOut])
def featured(c: Container = Depends(get_container)):
    return uc.FeaturedProducts(c.uow)()


@router.get("/products/{slug}", response_model=ProductDetailOut)
def product_detail(slug: str, c: Container = Depends(get_container)):
    return uc.GetProduct(c.uow)(slug)


@router.get("/artisans/{artisan_id}", response_model=ArtisanDetailOut)
def artisan(artisan_id: int, c: Container = Depends(get_container)):
    return uc.GetArtisan(c.uow)(artisan_id)
