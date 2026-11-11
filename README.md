# Casa Guaico

Tienda en línea de sombreros de iraca tejidos a mano en Nariño, Colombia. MVP construido a partir del proyecto de Jira
**Ecommerce_Sombreros** (clave `SCRUM`, 7 épicas).

**En línea:** https://casa-guaico-sombreros.vercel.app (ver [Despliegue](#despliegue)).

| Capa | Tecnología |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, bcrypt, JWT en cookie httpOnly |
| Arquitectura | Limpia: `domain` → `application` (casos de uso + puertos) → `infrastructure` (adaptadores) → `presentation` (HTTP) |
| Base de datos | MySQL 8 (`casa_guaico`, pruebas en `casa_guaico_test`) |
| Frontend | Next.js 16 (App Router, TypeScript), Tailwind CSS v4 |
| Pagos | Pasarela simulada detrás del puerto `PaymentGateway` (lista para cambiar por Wompi o Mercado Pago) |

Documentos:
- `docs/ARCHITECTURE.md`: contrato entre backend y frontend (modelo de datos, reglas de dinero, stock y estados, todos los endpoints).
- `PRODUCT.md`: contexto de producto. `DESIGN.md`: sistema visual tal como está construido. `docs/DESIGN-BRIEF.md`: dirección de diseño (solo desarrollo).
- `backend/README.md`: detalle del backend. `frontend/public/images/CREDITS.md`: créditos y licencias de las fotos.

## Puesta en marcha (Windows, PowerShell)

Requisitos: Python 3.13, Node 22+ (probado con 24), MySQL 8 corriendo en `localhost:3306`.

```powershell
# 1. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env                      # edita la contraseña de MySQL y JWT_SECRET
.\.venv\Scripts\python.exe scripts\create_db.py
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe scripts\seed.py --reset
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# 2. Frontend (otra terminal)
cd frontend
npm install
copy .env.example .env.local                # BACKEND_URL=http://localhost:8000
npm run dev                                 # http://localhost:3000
```

El navegador solo habla con `localhost:3000`; Next reenvía `/api/*` al backend, así la cookie de sesión es del mismo origen.

### Cuentas de prueba (datos de muestra)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@casaguaico.co | Admin1234 |
| Cliente | cliente@casaguaico.co | Cliente1234 |

### Pruebas

```powershell
cd backend;  .\.venv\Scripts\python.exe -m pytest          # unitarias + API contra casa_guaico_test
cd frontend; npm run lint; npm run build
```

## Variables de entorno

Backend (`backend/.env`, ver `.env.example`): `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_MINUTES`,
`COOKIE_SECURE`, `CORS_ORIGINS`, `FRONTEND_URL`, `TAX_RATE` (0.19), `SHIPPING_FLAT_COP` (12000),
`FREE_SHIPPING_FROM_COP` (250000), `LOW_STOCK_THRESHOLD` (3), `PAYMENT_PROVIDER` (simulator).
Frontend (`frontend/.env.local`): `BACKEND_URL`. Ningún `.env` se versiona.

## Alcance entregado (por épica de Jira)

1. **Investigación y arquitectura** (SCRUM-8..12, 55..61): arquitectura y contrato documentados, estructura de carpetas, `.env.example`,
   repositorio Git inicializado (sin remoto), endpoint `/api/health`, CORS, manejo centralizado de errores con formato único.
2. **Autenticación y usuarios** (SCRUM-13..16): registro, ingreso, cierre de sesión con revocación del token, perfil, roles cliente/administrador.
3. **Catálogo** (SCRUM-17..23): catálogo, detalle, filtros por categoría/color/talla/tejido/precio, búsqueda sin tildes,
   selección de talla con calculadora por contorno de cabeza, disponibilidad por variante, ficha del artesano.
4. **Carrito y checkout** (SCRUM-24..31): carrito persistente (invitado en el navegador, se une al iniciar sesión), cantidades limitadas
   por stock, subtotal + IVA 19 % + envío, datos de envío validados (departamentos de Colombia, código postal de 6 dígitos), resumen y confirmación.
5. **Pedidos, pagos e inventario** (SCRUM-32..39): pedidos con historial de estados, pasarela simulada (aprobado/rechazado/fallido, reintento),
   descuento de stock atómico al aprobar el pago con bloqueo de filas, nunca stock negativo.
6. **Administración** (SCRUM-40..46): panel con acceso solo para administradores (los intentos denegados quedan en `audit_log`),
   productos (crear, editar, desactivar sin borrar), inventario con ajustes y movimientos, pedidos con transiciones válidas, resumen de ventas.
7. **Pruebas, seguridad y despliegue** (SCRUM-47..54): 132 pruebas automáticas (dominio, casos de uso y API, incluida la carrera por la última unidad),
   flujo completo de compra verificado, contraseñas con bcrypt, sin datos de tarjeta, sin secretos en el código,
   despliegue en producción (Vercel + Render + Aiven) con cookie `Secure` y conexión a MySQL por TLS.

## Despliegue

| Pieza | Servicio (plan gratis) | URL |
|---|---|---|
| Frontend (Next.js) | Vercel | https://casa-guaico-sombreros.vercel.app |
| Backend (FastAPI) | Render, definido en `render.yaml` | https://casa-guaico-api.onrender.com/api/health |
| Base de datos | Aiven for MySQL 8 (TLS con `backend/certs/aiven-ca.pem`) | — |

- El backend gratis de Render se duerme tras unos minutos sin tráfico; la primera visita puede tardar 30-60 s.
- Render corre `alembic upgrade head` en cada arranque. Los datos de muestra se cargaron una vez con `scripts/seed.py`.
- `DATABASE_URL` en producción: `mysql+pymysql://avnadmin:<clave>@<host>:<puerto>/defaultdb?charset=utf8mb4&ssl_ca=certs/aiven-ca.pem`.
- Las imágenes que suba el administrador viven en el disco de Render y se pierden al redesplegar (las del catálogo de muestra están en `frontend/public`).
- Frontend: `cd frontend && npx vercel deploy --prod` (variable `BACKEND_URL` configurada en Vercel).

## Limitaciones conocidas

- La pasarela de pagos es simulada; integrar Wompi o Mercado Pago implica un adaptador nuevo de `PaymentGateway` y su webhook.
- Los productos, artesanos, precios y pedidos son **datos de muestra** y deben reemplazarse antes de lanzar.
- Las fotos de producto son imágenes de licencia abierta de sombreros de paja toquilla (varias de Ecuador); no muestran productos reales
  de la tienda. Hay 10 fotos para 18 productos, así que algunas se repiten. Las fotos de paisaje son de Nariño (Galeras, Laguna de la Cocha, Sandoná).
  Créditos en `/creditos` y en `frontend/public/images/CREDITS.md`.
- No hay correo transaccional: la confirmación de compra se muestra en pantalla y en "Mis pedidos".
- El costo de envío es una tarifa plana configurable, sin cálculo por ciudad.
