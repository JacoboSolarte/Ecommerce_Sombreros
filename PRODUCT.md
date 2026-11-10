# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Chosen by the user (2026-10-27): FastAPI (Python 3.13) backend with clean architecture (domain → application/use cases → ports → infrastructure adapters → HTTP presentation), SQLAlchemy 2 + Alembic over MySQL 8; Next.js (App Router) + Tailwind CSS frontend. No deployment for now (local only). Payments: local simulated gateway only, behind a port so a real gateway (Wompi / Mercado Pago) can be plugged in later.

## Users

- **Customers (cliente):** people in Colombia, mostly on phones, buying a handmade iraca (paja toquilla) hat from Nariño for themselves or as a gift. They need to find a hat, pick the right size and color, trust that it is genuinely handmade, and pay without friction.
- **Store administrator (administrador):** the Casa Guaico operator who manages products, sizes/stock, orders and order states, and reviews sales.

## Product Purpose

Casa Guaico is the online store for handmade iraca hats woven in Nariño, Colombia (Sandoná and surrounding municipalities). Success for the MVP (due 23/11/2026, per Jira SCRUM-8) is a complete working purchase flow: catalog → product → size → cart → checkout → payment → order → confirmation, plus an admin panel to operate the store.

## Positioning

Every hat is traceable to the artisan who wove it and the craft process behind it (Jira SCRUM-23): weave, fiber, municipality and weaving time are product data, not marketing copy.

## Operating Context

- Source of truth for scope: Jira project "Ecommerce_Sombreros" (key SCRUM), 7 epics, 61 issues.
- Hats come in sizes (head circumference) and colors; stock is tracked per product variant (size × color).
- Order states: Pendiente → Pagado → Preparando → Enviado → Entregado, and Cancelado.
- Shipping addresses use Colombian departments and cities; prices in COP; IVA shown in totals.
- The user asked for a shopping experience modelled on Amazon and Mercado Libre (familiar marketplace conventions: search-first header, filters, product detail with buy box, cart, multi-step checkout, "Mis pedidos").

## Capabilities and Constraints

- Auth: registration, login, logout, basic profile; roles cliente / administrador; hashed passwords; session persists across reloads.
- Catalog: listing, detail, category filter, search, size selection (size calculator mentioned in Jira), availability, artisan info.
- Cart persisted across sessions; quantities limited by stock; subtotal, IVA and total consistent between cart and checkout.
- Stock is validated when adding to cart and again at payment; stock is decremented atomically on payment approval and never goes negative.
- Admin: create/edit/deactivate (soft delete) products, inventory adjustments with low-stock alerts, order management with valid state transitions and history, sales summary (orders, revenue, top products), unauthorized access logged.
- No card data stored. Payment gateway is simulated for now (approved / declined / failed).
- Undecided: real payment gateway, shipping cost rules, deployment target.

## Brand Commitments

- Name: Casa Guaico.
- Product: sombreros de iraca artesanales, Nariño, Colombia.
- Voice: Spanish (Colombia).

## Evidence on Hand

- No product photography of its own, no logo, no testimonials, no press, no sales figures. Imagery comes from openly licensed collections (credited); product names, artisans and prices in the seed data are sample content to be replaced before launch.
- No customer reviews or ratings exist: none may be invented.

## Product Principles

1. The purchase flow must never let a customer buy something that cannot ship (stock is truth).
2. Traceability is product data: who wove it, where, how long.
3. Familiar marketplace patterns first; Casa Guaico's identity lives in the details, not in unfamiliar controls.
4. Mobile is the primary shopping device.

## Accessibility & Inclusion

WCAG 2.1 AA as the working target: keyboard operable flows, visible focus, labelled forms, sufficient contrast.
