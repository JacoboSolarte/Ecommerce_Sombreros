# Casa Guaico: architecture and API contract

Source of scope: Jira project **Ecommerce_Sombreros** (key `SCRUM`), epics SCRUM-1..7.
This document is the contract between `backend/` and `frontend/`. Both sides must follow it exactly;
if a change is needed, update this file in the same change.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0 (sync ORM, PyMySQL driver), Alembic, Pydantic v2 + pydantic-settings, bcrypt, PyJWT, pytest + httpx |
| Database | MySQL 8 (local service `MySQL80`), db `casa_guaico` (tests: `casa_guaico_test`), utf8mb4 |
| Frontend | Next.js 16 (App Router, TypeScript, React Server Components), Tailwind CSS v4, lucide-react icons |
| Payments | Simulated gateway behind the `PaymentGateway` port (no card data ever touches our system) |
| Deploy | Out of scope for now (local only) |

## Repository layout

```
sombreros/
  backend/
    app/
      domain/          # entities, value objects, domain errors, order state machine, pricing rules (pure Python, no frameworks)
      application/     # use cases (one class/function per Jira story) + ports (abstract repos, UnitOfWork, PasswordHasher, TokenService, PaymentGateway, Clock)
      infrastructure/  # SQLAlchemy models + repositories + UnitOfWork, bcrypt hasher, JWT service, simulated gateway, settings
      presentation/    # FastAPI routers, request/response schemas, dependencies (auth, roles), error handlers
      main.py          # app factory, CORS, routers, /api/health
    alembic/  alembic.ini
    scripts/seed.py    # sample catalog + users
    tests/             # unit (domain/use cases with fakes) + API integration (MySQL test db)
    requirements.txt  .env.example  README.md
  frontend/
    src/app/...        # routes (see "Frontend routes")
    public/images/     # curated, credited photography (see public/images/manifest.json, CREDITS.md)
    .env.example
  docs/ARCHITECTURE.md  PRODUCT.md  README.md
```

Dependency rule: `presentation → application → domain`; `infrastructure` implements `application` ports.
`domain` and `application` import nothing from FastAPI or SQLAlchemy.

## Environment variables

backend/.env (never committed; `.env.example` committed):
```
APP_ENV=development
DATABASE_URL=mysql+pymysql://root:CHANGE_ME@localhost:3306/casa_guaico?charset=utf8mb4
TEST_DATABASE_URL=mysql+pymysql://root:CHANGE_ME@localhost:3306/casa_guaico_test?charset=utf8mb4
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_MINUTES=10080
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
TAX_RATE=0.19
SHIPPING_FLAT_COP=12000
FREE_SHIPPING_FROM_COP=250000
LOW_STOCK_THRESHOLD=3
PAYMENT_PROVIDER=simulator
```
Local dev MySQL credentials are root / root (only in the untracked `.env`).

frontend/.env.local:
```
BACKEND_URL=http://localhost:8000     # used by Next rewrites and server components
```

## Runtime topology

- Backend: `uvicorn app.main:app --reload --port 8000`. All routes under `/api`.
- Frontend: `next dev` on port 3000. `next.config.ts` rewrites `/api/:path*` → `${BACKEND_URL}/api/:path*`,
  so the browser only talks to `localhost:3000` (same-origin cookies). CORS is still configured on the backend for `CORS_ORIGINS`.
- Server components fetch `${BACKEND_URL}/api/...` directly, forwarding the `cg_session` cookie when needed.

## Auth

- Login sets an **httpOnly** cookie `cg_session` (JWT, HS256, `sub`=user id, `role`, `jti`), `SameSite=Lax`, `Path=/`, `Secure` per `COOKIE_SECURE`.
- Logout deletes the cookie **and** stores the `jti` in `revoked_tokens`, so the token is invalid server-side.
- Roles: `customer`, `admin`. Admin endpoints return 403 for customers, and every denied attempt is written to `audit_log` (SCRUM-40).
- Passwords: bcrypt. Rules: min 8 chars, at least one letter and one digit.

## Money and totals (SCRUM-28)

- All money is integer COP (no decimals). Format in UI as `$ 189.000` (es-CO).
- Product prices **include IVA** (Colombian retail convention).
- For a cart/order: `total_items = Σ unit_price × qty`; `tax = round(total_items − total_items / (1 + TAX_RATE))`; `subtotal = total_items − tax`;
  `shipping = 0 if total_items ≥ FREE_SHIPPING_FROM_COP else SHIPPING_FLAT_COP` (0 when cart empty);
  `total = total_items + shipping`. The same domain function computes cart and order totals.

## Domain model (MySQL tables)

- `users` id, email (unique), password_hash, full_name, phone, document_id (nullable), role, is_active, created_at, updated_at
- `revoked_tokens` jti (pk), expires_at
- `audit_log` id, user_id (nullable), action, path, ip, detail, created_at
- `categories` id, name, slug (unique), description, image_url, sort_order
- `artisans` id, full_name, municipality, department (default "Nariño"), craft, bio, years_experience, photo_url
- `products` id, sku (unique), slug (unique), name, short_description, description, price_cop, compare_at_price_cop (nullable),
  category_id, artisan_id, weave_grade (`fino` | `superfino` | `extrafino`), fiber ("Iraca (Carludovica palmata)"),
  weaving_hours (int), brim_cm (decimal 4,1), delivery_days_min, delivery_days_max, is_active (soft delete, SCRUM-43), is_featured, created_at, updated_at
- `product_images` id, product_id, url, alt, position
- `colors` id, name, hex
- `sizes` id, code (`S`,`M`,`L`,`XL`), label, head_cm_min, head_cm_max, sort_order
  Seed: S 54–55, M 56–57, L 58–59, XL 60–61 (cm head circumference).
- `product_variants` id, product_id, size_id, color_id, sku (unique), stock (int ≥ 0, CHECK), unique(product_id,size_id,color_id)
- `carts` id, user_id (unique), updated_at; `cart_items` id, cart_id, variant_id, quantity, unique(cart_id,variant_id)
- `orders` id, number (e.g. `CG-000123`, unique), user_id, status, total_items_cop, subtotal_cop, tax_cop, shipping_cop, total_cop,
  ship_full_name, ship_phone, ship_address_line, ship_address_extra, ship_city, ship_department, ship_postal_code, ship_notes, created_at, updated_at
- `order_items` id, order_id, variant_id, product_id, product_name, product_slug, image_url, size_code, color_name, unit_price_cop, quantity, line_total_cop (snapshot)
- `order_status_history` id, order_id, from_status (nullable), to_status, changed_by_user_id (nullable), note, created_at
- `payments` id, order_id, provider, reference (unique), status (`pending`|`approved`|`declined`|`failed`), amount_cop, provider_message, created_at, updated_at
- `inventory_movements` id, variant_id, delta, reason (`initial`|`purchase`|`adjustment`|`restock`|`cancellation`), note, user_id, order_id, created_at

### Order state machine (SCRUM-36)

Statuses (API values → UI label): `pending` Pendiente, `paid` Pagado, `preparing` Preparando, `shipped` Enviado, `delivered` Entregado, `cancelled` Cancelado.
Valid transitions: pending→paid (payment only), pending→cancelled, paid→preparing, paid→cancelled, preparing→shipped, preparing→cancelled, shipped→delivered.
Cancelling a paid/preparing order returns stock (`cancellation` movement). Every change writes `order_status_history`.

### Stock rules (SCRUM-37/38/39)

- Validate stock when adding to / updating the cart (quantity ≤ variant stock) and again at payment confirmation.
- Stock is decremented **only when the payment is approved**, inside one DB transaction that locks the variants (`SELECT … FOR UPDATE`),
  re-checks availability, decrements, writes `purchase` movements, marks the payment approved and the order `paid`.
  If stock is insufficient at that moment, the order goes to `cancelled` with note "Sin stock al confirmar el pago" and the payment is `failed`.
- Stock can never become negative (domain check + DB CHECK constraint).

## API (all JSON, prefix `/api`)

Errors always use: `{"error": {"code": "STRING_CODE", "message": "Mensaje en español para el usuario", "details": {...}|null}}`
with proper HTTP status (400 validation, 401 not authenticated, 403 forbidden, 404 not found, 409 conflict/stock, 422 request validation, 500 internal without stack traces). SCRUM-61.
Codes used: `VALIDATION_ERROR`, `NOT_AUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `OUT_OF_STOCK`, `CART_EMPTY`, `INVALID_TRANSITION`, `PAYMENT_ERROR`, `INTERNAL_ERROR`.

Field naming: JSON uses **camelCase** (Pydantic alias generator), Python uses snake_case.

### Health
- `GET /api/health` → `{"status":"ok","database":"ok"}`

### Auth & profile (SCRUM-13..16)
- `POST /api/auth/register` `{fullName, email, password, phone?}` → 201 `User` and sets the session cookie (logged in after register).
- `POST /api/auth/login` `{email, password}` → 200 `User` + cookie. Wrong credentials → 401 `INVALID_CREDENTIALS`.
- `POST /api/auth/logout` → 204, cookie cleared, jti revoked.
- `GET /api/auth/me` → 200 `User` or 401.
- `PATCH /api/users/me` `{fullName?, phone?, documentId?}` → `User`.
- `User` = `{id, email, fullName, phone, documentId, role, createdAt}`

### Catalog (SCRUM-17..23)
- `GET /api/categories` → `[{id, name, slug, description, imageUrl, productCount}]`
- `GET /api/colors` → `[{id, name, hex}]`; `GET /api/sizes` → `[{id, code, label, headCmMin, headCmMax}]`
- `GET /api/products?q=&category=<slug>&color=<id>&size=<code>&minPrice=&maxPrice=&weave=&inStock=true&sort=relevance|price_asc|price_desc|newest&page=1&pageSize=24`
  → `{items: ProductCard[], total, page, pageSize, facets: {categories:[{slug,name,count}], colors:[{id,name,hex,count}], sizes:[{code,count}], weaves:[{value,count}], priceMin, priceMax}}`
  Only active products. `q` searches name, description, category name and artisan municipality (case/accent-insensitive via utf8mb4_0900_ai_ci).
- `ProductCard` = `{id, slug, name, shortDescription, priceCop, compareAtPriceCop, imageUrl, imageAlt, category:{slug,name}, artisan:{fullName, municipality}, weaveGrade, colors:[{id,name,hex}], totalStock, availability: "in_stock"|"low_stock"|"out_of_stock", deliveryDaysMin, deliveryDaysMax}`
- `GET /api/products/{slug}` → `ProductDetail` = ProductCard + `{sku, description, fiber, weavingHours, brimCm, images:[{url,alt}], sizes:[{code,label,headCmMin,headCmMax}], variants:[{id, sku, sizeCode, colorId, colorName, colorHex, stock, availability}], artisan:{id, fullName, municipality, department, craft, bio, yearsExperience, photoUrl}, related: ProductCard[] (max 8, same category)}`
- `GET /api/products/featured` → `ProductCard[]` (max 12)
- `GET /api/artisans/{id}` → artisan + `products: ProductCard[]`

`availability`: out_of_stock when stock = 0, low_stock when 1..LOW_STOCK_THRESHOLD, else in_stock.

### Cart (SCRUM-24..28) — requires login
Guests keep a cart in `localStorage` (`cg_guest_cart` = `[{variantId, quantity}]`) and the frontend calls `/api/cart/merge` right after login/register.
- `GET /api/cart` → `Cart`
- `POST /api/cart/items` `{variantId, quantity}` → `Cart` (adds to existing line). 409 `OUT_OF_STOCK` with `details:{available}` if it would exceed stock.
- `PATCH /api/cart/items/{itemId}` `{quantity}` (1..stock) → `Cart`
- `DELETE /api/cart/items/{itemId}` → `Cart`
- `POST /api/cart/merge` `{items:[{variantId, quantity}]}` → `Cart` (quantities clamped to stock)
- `POST /api/cart/quote` `{items:[{variantId, quantity}]}` (no auth) → `Cart` shape, not persisted; used to render the guest cart with real prices/stock.
- `Cart` = `{items: [{id, variantId, productId, slug, name, imageUrl, sizeCode, colorName, colorHex, unitPriceCop, quantity, lineTotalCop, stock, availability}], totals: Totals, itemCount}`
- `Totals` = `{totalItemsCop, subtotalCop, taxCop, shippingCop, totalCop, freeShippingFromCop}`

### Checkout, orders, payment (SCRUM-29..36) — requires login
- `POST /api/checkout` `{shipping:{fullName, phone, addressLine, addressExtra?, city, department, postalCode, notes?}}`
  Validates: cart not empty (400 `CART_EMPTY`), all lines within stock (409 `OUT_OF_STOCK` with `details:{items:[{variantId, requested, available}]}`),
  required fields, phone = 10 digits starting with 3 (mobile) or 7-10 digits, postalCode = 6 digits, department ∈ the 33 Colombian departments list.
  Creates the order `pending` with item snapshot + history, empties the cart, creates a payment via the gateway.
  → 201 `{order: Order, payment: {reference, redirectUrl}}` where `redirectUrl` = `${FRONTEND_URL}/pago/simulador?ref=<reference>`.
- `GET /api/payments/{reference}` → `{reference, status, amountCop, orderNumber, orderId}` (owner only)
- `POST /api/payments/{reference}/simulate` `{outcome: "approved"|"declined"|"failed"}` → `{payment, order}`. This endpoint is what the simulated gateway calls
  (stands in for the provider's webhook). Approved → stock transaction above. Declined/failed → payment status updated, order stays `pending` so the customer can retry.
- `POST /api/orders/{id}/pay` → new `{reference, redirectUrl}` for a `pending` order (retry after decline). Re-validates stock.
- `GET /api/orders?sort=date_desc|date_asc` → `OrderSummary[]` (own orders only) `{id, number, createdAt, status, totalCop, itemCount, firstItemImageUrl}`
- `GET /api/orders/{id}` → `Order` (owner or admin; others 404)
- `Order` = `{id, number, status, createdAt, items:[{productName, productSlug, imageUrl, sizeCode, colorName, unitPriceCop, quantity, lineTotalCop}], totals: Totals(without freeShippingFromCop needed), shipping:{...}, history:[{fromStatus,toStatus,note,createdAt}], payments:[{reference,status,amountCop,createdAt}]}`

### Admin (SCRUM-40..46) — role admin
- `GET /api/admin/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ordersCount, paidOrdersCount, revenueCop (sum of total_cop for paid/preparing/shipped/delivered), averageOrderCop, topProducts:[{productId,name,unitsSold,revenueCop,imageUrl}], salesByDay:[{date, revenueCop, orders}], lowStock:[{variantId, productName, sizeCode, colorName, stock}], ordersByStatus:{pending:n,...}}`
- `GET /api/admin/products?q=&status=active|inactive|all&page=` → `{items:[{id, sku, slug, name, priceCop, categoryName, isActive, totalStock, variantCount, imageUrl, updatedAt}], total}`
- `POST /api/admin/products` `ProductInput` → ProductDetail. `ProductInput` = `{name, sku, shortDescription, description, priceCop, compareAtPriceCop?, categoryId, artisanId, weaveGrade, weavingHours, brimCm, deliveryDaysMin, deliveryDaysMax, isFeatured, images:[{url, alt}], variants:[{sizeCode, colorId, stock}]}`; slug derived from name.
- `GET /api/admin/products/{id}` → ProductDetail + `isActive`, `isFeatured`, `categoryId`, `artisanId`
- `PUT /api/admin/products/{id}` `ProductInput` (variants: existing matched by size+color keep id; stock changes recorded as `adjustment` movements)
- `POST /api/admin/products/{id}/deactivate` and `/activate` → 204 (soft delete)
- `POST /api/admin/uploads` multipart `file` (jpg/png/webp ≤ 5 MB) → `{url}` stored under `backend/uploads/` and served at `/api/uploads/<name>`
- `GET /api/admin/inventory?q=&lowStock=true` → `[{variantId, sku, productId, productName, sizeCode, colorName, colorHex, stock, isLow}]`
- `POST /api/admin/inventory/{variantId}/adjust` `{delta, reason: "restock"|"adjustment", note}` → updated row (409 if result < 0)
- `GET /api/admin/inventory/{variantId}/movements` → movements list
- `GET /api/admin/orders?status=&from=&to=&q=&page=` → `{items:[OrderSummary + customerName, customerEmail], total}`
- `GET /api/admin/orders/{id}` → Order + `customer:{id, fullName, email, phone}`, `allowedTransitions: [status]`
- `POST /api/admin/orders/{id}/status` `{status, note?}` → Order (409 `INVALID_TRANSITION`)
- `GET /api/admin/categories`, `GET /api/admin/artisans` → lists for product form selects

## Seed data (sample, must be replaced before launch)

- Users: `admin@casaguaico.co` / `Admin1234` (admin), `cliente@casaguaico.co` / `Cliente1234` (customer).
- Categories: Sombreros clásicos (aguadeño / fedora de ala media), Sombreros de ala ancha, Sombreros para dama (capelina), Sombreros para niños, Plegables de viaje.
- Artisans (fictional sample names, municipalities real): from Sandoná, Linares, Ancuya, La Florida, Consacá, El Tambo (Nariño).
- Colors: Natural (#D9C59A), Blanco hueso (#EFE9DC), Miel (#C8963E), Café (#6B4A2E), Negro (#1E1E1E), Verde oliva (#5B6B3A).
- ~18 products, prices 89.000–690.000 COP, 2–4 colors each, sizes S–XL, stock 0–12 per variant (some out of stock / low stock to show states).
- Product image URLs come from `frontend/public/images/manifest.json` (paths like `/images/products/<file>.jpg`).

## Backend implementation notes (clarifications, no contract changes)

- `facets` are computed over every active product matching the text query `q` only (not the other filters), so filter options stay switchable.
- `POST /api/payments/{reference}/simulate` requires the session of the order owner (or an admin). Replaying `approved` on an approved payment is idempotent; any other already-processed payment returns 409 `PAYMENT_ERROR`.
- Payment references look like `SIM-<order number>-<8 hex>`; `Order.totals.freeShippingFromCop` is also included.
- 422 request-validation errors use `details: {"fields": {"<field>": "<mensaje>"}}`; domain validation errors (400) use the same `fields` shape.
- Removing a variant in `PUT /api/admin/products/{id}` sets its stock to 0 (an `adjustment` movement) instead of deleting it, so order history keeps its references.
- Anonymous or customer access to `/api/admin/*` is written to `audit_log` (`ACCESS_DENIED`); anonymous gets 401, customers 403.
- `GET /api/admin/products` and `/api/admin/orders` also accept `pageSize` (default 20).
