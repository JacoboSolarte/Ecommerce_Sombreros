from __future__ import annotations

from app.application.dto import ProductFilters
from app.application.ports import Row, UnitOfWorkFactory
from app.domain.errors import NotFound
from app.domain.validation import WEAVE_GRADES

SORTS = ("relevance", "price_asc", "price_desc", "newest")


class ListCategories:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self) -> list[Row]:
        with self._uow() as uow:
            return uow.catalog.list_categories()


class ListColors(ListCategories):
    def __call__(self) -> list[Row]:
        with self._uow() as uow:
            return uow.catalog.list_colors()


class ListSizes(ListCategories):
    def __call__(self) -> list[Row]:
        with self._uow() as uow:
            return uow.catalog.list_sizes()


class SearchProducts:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, filters: ProductFilters) -> Row:
        filters.q = (filters.q or "").strip() or None
        filters.sort = filters.sort if filters.sort in SORTS else "relevance"
        filters.weave = filters.weave if filters.weave in WEAVE_GRADES else None
        filters.page = max(filters.page, 1)
        filters.page_size = min(max(filters.page_size, 1), 60)
        with self._uow() as uow:
            return uow.catalog.search_products(filters)


class FeaturedProducts(ListCategories):
    def __call__(self) -> list[Row]:
        with self._uow() as uow:
            return uow.catalog.featured_products(12)


class GetProduct:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, slug: str) -> Row:
        with self._uow() as uow:
            product = uow.catalog.get_product_detail(slug)
        if not product:
            raise NotFound("No encontramos este sombrero.")
        return product


class GetArtisan:
    def __init__(self, uow: UnitOfWorkFactory):
        self._uow = uow

    def __call__(self, artisan_id: int) -> Row:
        with self._uow() as uow:
            artisan = uow.catalog.get_artisan(artisan_id)
        if not artisan:
            raise NotFound("No encontramos a este artesano.")
        return artisan
