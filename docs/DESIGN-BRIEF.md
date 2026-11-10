# Casa Guaico storefront and admin: design brief (development only)

Never copy this text into shipped source, comments, data-attributes or metadata.

## Mode and the pinned convention

The user pinned the convention: **a marketplace store like Amazon and Mercado Libre**. The store is an Operate surface:
shoppers find a hat, pick size and color, check stock, buy. Familiar marketplace patterns win everywhere: a search-first header,
category navigation, a filter sidebar with result counts, product grids, a product page with a gallery and a buy box,
a cart, a step-by-step checkout, "Mis pedidos". The Casa Guaico / Nariño identity lives in **type, palette, density and one
signature move**, never in unfamiliar controls. Craft bar: as clean as Amazon/Mercado Libre at their best, and more
distinctive than them.

Seed reference for the direction roll: `seed:510b5c0f7569b930` (overridden by the brief's pin: canon marketplace).

## Direction contract

- **THESIS:** A Nariño weaving-workshop marketplace. Shopping works exactly like the marketplaces people know; every product
  carries its **ficha de tejido** (weave sheet): who wove it, in which municipality, how many hours, what weave grade. That is
  what no generic marketplace has. It refuses the stock "marketplace clone in orange/yellow" and the stock "artisan boutique
  in cream and terracotta".
- **OWN-WORLD:** Shell in **verde páramo** (the Andean green of Nariño's mountains): header `#14382C`, category strip `#1D4A3A`,
  text on it `#F3F1EA` and `#C9D6CF`. Ground a cool off-white `#F1F2EF`, surfaces pure white, separated by tone steps, not lines or shadows.
  Primary buy action in **iraca gold** `#E3B23C` (ink text `#14211B`, hover `#D6A22B`); secondary actions filled `#14382C` with white text, or a
  white button with a 1px `#C9CEC8` border. Links `#1D6B52`. Price ink `#111813`. States: available `#1E7B4F`, low stock `#9A5B00`,
  sold out `#B3261E`, info `#1D5F8A`. Color swatches are real hex of the hat colors. One type family: **Figtree** (Google Fonts,
  400/500/600/700) for everything; prices in tabular figures, weight 600, `$ 189.000` with the currency sign in a smaller size.
  Buttons: **fully rounded pills**, 40px (44px on mobile for primary). Cards and panels: radius 8px. Inputs: radius 6px, 1px `#B9BFB8`
  border, focus ring 2px `#1D6B52` offset 2px. Text selection `#E3B23C` at 40%. Scrollbars themed thin, thumb `#B9BFB8`.
- **STORY:** Home: a full-width banner carousel of real Nariño photography (Sandoná artisans, Laguna de la Cocha, Galeras) with a short
  claim and a "Ver sombreros" action; then Amazon-style **category tiles** (4 per row on desktop, 2 on mobile, each a white panel
  with a heading and a photo); a horizontal **"Los más vendidos"** product rail; a **"Tejidos en Sandoná"** band that introduces
  artisans (photo, name, municipality, years weaving) linking to their products; a dense product grid "Recién tejidos"; a plain
  service strip (envío a toda Colombia, pago seguro, cambios de talla) set as text with small outline icons; footer.
- **FIRST VIEWPORT (home, 1440×900):** header (logo + wordmark "Casa Guaico", "Enviar a <ciudad>" location, search with a
  category select and a gold search button, "Hola, <nombre> / Cuenta y pedidos", "Mis pedidos", cart with count), the green
  category strip, then the banner photo at about 420px tall with headline and action, and the top of the category tiles
  overlapping the banner's lower edge (the Amazon move), so products show within the first screen.
- **SIGNATURE MOVE:** the **ficha de tejido + calculadora de talla** in the product page's buy area: a compact panel set like a
  hand-filled workshop tag (artisan name, municipality, hours woven, weave grade shown as a 3-step scale fino / superfino /
  extrafino with the current grade filled). Next to the size chips there is a "¿Cuál es mi talla?" calculator: the shopper types their
  head circumference in cm (or moves a slider 52–63 cm) and the matching size chip highlights live (S 54–55, M 56–57, L 58–59,
  XL 60–61), with the out-of-stock sizes disabled and struck through. Works with the keyboard and on a phone thumb.
- **RISK:** it can drift into a generic marketplace template. Guard: real photography, the green shell, the weave sheet on every
  card (municipality + weave grade line), and words of the trade ("tejido superfino", "horas de tejido", "Sandoná").

## Rules from the design skills (enforced)

- No gradients (except a neutral dark scrim under text on banner photos), no glass/backdrop blur, no glows, no emoji,
  no monospace (except SKUs in admin), no eyebrow labels above headings, no "01/02/03" numbering, no tiny uppercase tracked labels,
  no icon-in-tinted-square cards, no styled accent word in headlines, no violet/indigo, no cream+terracotta.
- No shadows on things at rest; shadows only on floating things (dropdowns, mini-cart popover, dialogs, sticky mobile buy bar).
- Headlines at most two lines at every width. Body text 16px in full ink; secondary text `#4A5550` (≥ 4.5:1).
- Every page has one `h1`; every section has a heading.
- Real images only (from `public/images/manifest.json`), credited in the footer "Créditos de imágenes" page `/creditos`.
  Never present a found photo as Casa Guaico's own workshop or team; captions say what/where the photo is.
- States everywhere: loading (skeletons in tone steps, no shimmer gradient), empty (with the next action), error (what happened +
  how to recover), out of stock, low stock, disabled.
- Keyboard: all controls reachable, visible focus, labelled inputs, `aria-live` for cart updates and calculator result.
- Mobile first: no horizontal page scroll, 16px side gutters, filters in a bottom sheet, sticky buy bar on product page, cart and checkout usable one-handed.
- Motion: feedback only (press, hover, focus, menus, sheet open, cart badge bump, image swap). 150–220ms ease-out; `prefers-reduced-motion` respected.
- Copy: Spanish (Colombia), "tú" form, controls named for their action ("Agregar al carrito", "Comprar ahora", "Continuar al pago").
  No invented reviews, ratings, testimonials, sales counts or press. "Los más vendidos" on the home is computed from real order data
  when available, otherwise use featured products under the heading "Destacados".

## Admin (Operate, app-screen rules, taste-skill style `framed-sheet`, seed 1800453768)

Tinted L-frame (sidebar 228px + 48px top bar) in a green-grey `#EEF2EF` derived from the shell; white sheet inset 8px from right/bottom,
16px radius, 1px `#E3E7E3` edge, no shadow. Brand only in the logo and a 2px tab underline `#1D6B52`. Chart hue `#1D6B52`.
Figtree, 14px body, 22px titles, KPIs 28px regular weight, tabular numbers right-aligned. Pills for status: Pendiente amber,
Pagado blue, Preparando neutral, Enviado green-blue, Entregado green, Cancelado red (pale fill, dark text same hue).
Screens: Resumen (overview with KPIs as chart tabs: ingresos, pedidos; top products; low stock), Pedidos (list with status tabs,
filters by state and date, detail with status change + history), Productos (list, create/edit form with variants matrix size × color
with stock), Inventario (table by product/size/color with adjust dialog and low-stock filter, movements). On the phone the frame
disappears, sidebar becomes a menu sheet.
