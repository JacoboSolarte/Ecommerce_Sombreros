---
name: Casa Guaico
description: Marketplace de sombreros de iraca tejidos en Nariño; se compra como en los marketplaces conocidos, la identidad vive en tipografía, paleta y la ficha de tejido.
colors:
  paramo-shell: "#14382c"
  paramo-shell-2: "#1d4a3a"
  paramo-shell-3: "#285a48"
  shell-ink: "#f3f1ea"
  shell-mute: "#c9d6cf"
  iraca-gold: "#e3b23c"
  iraca-gold-hover: "#d6a22b"
  link-green: "#1d6b52"
  link-green-hover: "#14513e"
  ground: "#f1f2ef"
  surface: "#ffffff"
  tile: "#f7f7f5"
  tone: "#e6e9e4"
  skeleton: "#e1e5df"
  ink: "#111813"
  ink-2: "#4a5550"
  border: "#c9cec8"
  field: "#b9bfb8"
  ok: "#1e7b4f"
  ok-bg: "#e0f0e7"
  low: "#9a5b00"
  low-bg: "#f7ead0"
  out: "#b3261e"
  out-bg: "#f8e0dd"
  info: "#1d5f8a"
  info-bg: "#dce9f2"
  teal: "#17665f"
  teal-bg: "#d9ebe8"
  admin-frame: "#eef2ef"
  admin-frame-active: "#e0e6e1"
  admin-edge: "#e3e7e3"
  admin-rule: "#edf0ed"
  chart: "#1d6b52"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  price:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  field: "6px"
  card: "8px"
  sheet: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  gutter-phone: "16px"
  gutter-wide: "24px"
components:
  button-primary:
    backgroundColor: "{colors.iraca-gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.iraca-gold-hover}"
  button-secondary:
    backgroundColor: "{colors.paramo-shell}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.paramo-shell-2}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.link-green}"
    rounded: "{rounded.pill}"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.out}"
    rounded: "{rounded.pill}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "0 12px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  status-pill:
    backgroundColor: "{colors.tone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  size-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "56px"
    padding: "0 12px"
  size-chip-selected:
    backgroundColor: "{colors.paramo-shell}"
    textColor: "#ffffff"
  weave-sheet:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  size-calculator:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  admin-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px"
---

# Design System: Casa Guaico

## Overview

**Creative North Star: "El taller de tejido"**

Casa Guaico shops like the marketplaces Colombians already know: a search-first header, category strip, filter sidebar, product grids, a buy box, a cart, a stepped checkout. Nothing about the controls is unfamiliar. The Nariño identity lives in four places only: a deep verde-páramo shell, a cool off-white ground, an iraca-gold pill reserved for buying, and the ficha de tejido (the workshop tag every hat carries) paired with the size calculator in the buy box.

Density is marketplace-grade: compact cards on a cool grey-green ground, tabular prices, small supporting text in a muted ink. Depth comes from tone steps (ground, tile, surface), not from shadows. Photography is real, credited, open-licence imagery of Nariño; it carries the warmth so the palette can stay cool and clean. The admin panel reuses the same palette in a quieter "framed sheet" form.

It refuses the orange marketplace clone and the cream-and-terracotta artisan boutique.

**Key Characteristics:**
- Verde páramo shell (header, footer, selected states) against a cool off-white ground.
- Gold is only for the action that moves a shopper forward (buy, search submit, skip link, active carousel dot).
- One family, Figtree, four weights (400/500/600/700); prices always tabular.
- Pill buttons, 6px fields, 8px panels; flat at rest.
- Product data (weave, municipality, artisan, hours) is shown as facts, never as marketing copy.

## Colors

A cool green-grey system: one dark green, one gold, tonal greys with a green cast, and semantic tints for state.

### Primary
- **Verde Páramo** (#14382c): the shell: store header, footer, secondary button, selected size chip, weave-grade bars, ficha header. Steps `#1d4a3a` (hover) and `#285a48` (active, banner fallback).
- **Iraca Gold** (#e3b23c): the buy action and search submit; hover `#d6a22b`. Text on gold is always ink. Also the selection highlight (40% mix), the focus ring on shell, and the "tu talla" ring.

### Secondary
- **Link Green** (#1d6b52): links, ghost buttons, default focus ring, active tab underline, range accent, chart line; hover `#14513e`.

### Neutral
- **Ground** (#f1f2ef): page background. **Surface** (#ffffff): cards, fields, the admin sheet. **Tile** (#f7f7f5): inset panels (weave sheet, calculator, image wells, dialog footers). **Tone** (#e6e9e4): hover fills, disabled, neutral pills. **Skeleton** (#e1e5df): loading blocks and unfilled weave bars.
- **Ink** (#111813): text. **Ink 2** (#4a5550): secondary text, labels, icons.
- **Border** (#c9cec8): outline-button and chip edges. **Field** (#b9bfb8): input borders (hover goes to ink-2).
- **Shell Ink** (#f3f1ea) and **Shell Mute** (#c9d6cf): text and secondary text on the shell.

### State (each has a tint background)
- **Disponible** ok `#1e7b4f` / `#e0f0e7`; **Últimas unidades / pendiente** low `#9a5b00` / `#f7ead0`; **Agotado / error** out `#b3261e` / `#f8e0dd`; **Pagado / info** `#1d5f8a` / `#dce9f2`; **Enviado** teal `#17665f` / `#d9ebe8`. Pill and alert text use darker hand-set shades of the same hue for contrast.

### Admin frame
- **Frame** (#eef2ef) wraps the sheet; **Frame Active** (#e0e6e1) is the active nav row; **Edge** (#e3e7e3) the sheet border and tab rule; **Rule** (#edf0ed) row dividers; **Chart** (#1d6b52).

### Named Rules
**The Gold Means Buy Rule.** Gold marks the one forward action on a screen and nothing decorative. If two gold buttons compete, one is wrong.
**The Tone Step Rule.** Separate regions with ground, tile, surface and tone steps, not with borders and shadows.

## Typography

**Display / Body / Label Font:** Figtree (400, 500, 600, 700) with ui-sans-serif, system-ui fallback. No second face in the storefront.

**Character:** Friendly, geometric and legible at small sizes on phones; weight does the hierarchy work, not size jumps.

### Hierarchy
- **Display** (700, 30 / 36 / 48px at base / sm / lg, 1.08, -0.025em): banner headline only, white on photography.
- **Headline** (600, 20px phone / 24px sm+): section headings and page titles. Admin page title is 22px/32px 600.
- **Title** (600, 18px): dialog titles, footer headings, ficha values.
- **Body** (400, 16px, 1.5): form text, buy-box text. Card titles 15px 500; secondary lines 14px in ink-2.
- **Label** (500, 14px): field labels, nav, pills at 13px, helper text 12px.
- **Price** (600, tabular): amount at 16 / 20 / 30px with a smaller currency sign (12 / 14 / 18px), `$ 189.000` style; compare-at struck in ink-2 at 14px; "% menos" in ok.

### Named Rules
**The Tabular Price Rule.** Every number a shopper compares (prices, cm, hours, stock, counts) uses tabular figures.
**The Weight Ladder Rule.** 400 body, 500 labels, 600 values and headings, 700 only on the banner headline and brand wordmark.

## Layout

Single container: 1400px max, centred, gutters 16px on phones and 24px from 640px. Breakpoints are Tailwind defaults plus `xs` at 480px; the key switches are `lg` (1024px: desktop header items, buy box beside gallery, phone buy bar hidden) and `md` (768px: grid goes 2 to 3 columns, rail arrows appear). Product grids: 2 columns on phones with 8px gap (12px from `sm`), 3 from `md`. Rails are scroll-snap rows of 44vw cards (max 224px).

Spacing rhythm is 4/8/12/16/24: card padding 12px, panel padding 12 to 20px, section heading margin 16px, footer top margin 64px. Controls are 44px high on phones and 40px on larger screens; touch targets never fall below 40px (carousel controls 44px). On phones a fixed buy bar sits at the bottom of product pages and the footer gains bottom padding to stay reachable. In-page anchors clear the sticky header (scroll-padding-top 8rem).

Admin (desktop): 228px sidebar column, 48px top bar, content max 1280px, 24px padding. On phones the sidebar becomes a left sheet.

## Elevation & Depth

Flat at rest. Cards, panels, banners and the admin sheet have no shadow; depth is the tone step between ground (#f1f2ef), tile, surface and the shell. Shadows exist only on elements that float above the page: menus (account menu `shadow-xl`, admin search results `shadow-lg`), toasts (`shadow-lg`), desktop rail arrows (`shadow-lg`), the phone buy bar (`0 -4px 16px rgb(0 0 0 / 0.12)`), and native dialogs/sheets (`shadow-2xl`) over a `rgb(10 20 15 / 0.5)` backdrop.

### Named Rules
**The Float-Only Shadow Rule.** A shadow means "this sits above the page". Resting surfaces never get one.

## Shapes

Three radii and a pill. Fields 6px, cards/panels/chips/alerts 8px, the admin sheet 16px (desktop only). All buttons, status pills, quantity stepper, header search and icon buttons are fully round. Product images sit in a 6px well on a tile background, square (1:1). Colour swatches are round with a 1px black/25% ring. Hairline borders appear only on fields, outline buttons, size chips and the admin sheet.

## Components

### Buttons
Pill-shaped, 150ms transition, press scales to 0.98, 40px high (`md`), 36px (`sm`), 44px phone / 40px desktop (`lg`).
- **Primary:** gold fill, ink text, 600; the buy/continue action.
- **Secondary:** verde-páramo fill, white text, 600.
- **Outline:** white fill, 1px border `#c9cec8`, ink text, 500; hover tile.
- **Ghost:** transparent, link-green text; hover tone.
- **Danger:** white fill, out-red text, 1px out/40% border; hover out-bg.
- **Disabled:** tone fill, ink-2 text. **Loading:** spinner icon, `aria-busy`.

### Inputs / Fields
White, 1px `#b9bfb8` border, 6px radius, 16px text (no iOS zoom), 44px phone / 40px desktop. Hover darkens the border to ink-2. Label above in 14px 500 (obligatorio announced to screen readers only); hint in ink-2; error in out-red 600 with `role="alert"` and a red border. Select hides the native chevron and draws its own. Admin controls are 32px high, 14px text.

### Price display
A small currency sign beside the amount, weight 600, tabular, with the full amount in a screen-reader-only span. The price block adds a struck compare-at price and "N% menos" in ok green.

### Status pills
Pill-shaped, 13px 500, tint background with dark same-hue text: pendiente low, pagado info, preparando neutral, enviado teal, entregado ok, cancelado out. Payment states reuse the same tones. Availability is plain coloured 600 text (Disponible / Últimas unidades / Agotado), not a pill.

### Product card
White 8px card, 12px padding, the whole card is one link. Square image in a 6px tile well (zooms 1.03 over 200ms on hover; 60% opacity when sold out), then: name (15px 500, 2-line clamp, turns link-green and underlined on hover), "municipio · tejido" line, price block, up to 5 colour swatches (+N), availability text, delivery estimate. No ratings (none exist).

### Ficha de tejido (weave sheet)
Tile panel with a shell-green header bar holding the gold hat mark and "Ficha de tejido". Body is a two-column definition list: artisan (link), municipality and department, weaving hours, fibre, brim width, then the weave grade as a 3-step scale: three pill bars, bars up to the grade filled shell-green, the current label in 600.

### Size calculator and size chips
Tile panel "¿Cuál es mi talla?": cm number input plus a 52-63 cm range slider, result line announced politely. The matching size chip lights live with a gold ring and tint; the selected chip is shell-green with white text; out-of-stock chips are tone-grey with struck text. Chips are 56px high and show the code and cm range.

### Rails and banner
Rail: horizontal scroll-snap list with hidden scrollbar and round white arrow buttons from `md`. Banner: 300 / 380 / 430px tall, full-bleed credited photography under a left-to-right black scrim (65% to 5%), white headline, one gold CTA, photo caption bottom right, pause/play, arrows and dot indicators (active dot is a gold 24px pill). Auto-advance every 6.5s, starts paused, stops on hover/focus and under reduced motion; cross-fade 500ms. Category tiles overlap the banner so products show in the first viewport.

### Navigation
Header on the shell: search-first pill bar (category select on tone, white input, gold square submit), "Enviar a" location, account menu, orders, cart with count (bumps on add). Items get a shell-2 round hover. Breadcrumb: 14px, link-green, chevron separators. Footer on the shell, four columns.

### Dialogs and sheets
Native `<dialog>`: bottom sheet on phones, right/left sheets, centred dialog; shared backdrop, 18px title, white body, tile footer, round 40px close button.

### Admin framed sheet
The panel is a white sheet (16px radius, 1px edge) inset in a tinted frame (#eef2ef) beside a 228px sidebar; nav rows are 32px, 14px, the active row on frame-active in 600. Underline tabs (2px link-green), 32px controls, one primary action per page title (outlined secondary beside it), chart lines in `#1d6b52` with hairline gridlines, monospace for SKUs and codes.

## Do's and Don'ts

### Do:
- **Do** use familiar marketplace patterns first and let identity live in type, palette, density and the ficha de tejido.
- **Do** reserve iraca-gold (#e3b23c) for the single forward action; shell green for structure and selection.
- **Do** give every control a 150ms colour transition and every interactive target at least 40px.
- **Do** show prices with the tabular, small-sign price component; show real product data (artisan, municipality, hours).
- **Do** use only credited photography listed in `frontend/public/images/manifest.json` (title, creator, licence, source, alt, caption). Captions name the place or subject and credit the author; they never imply Casa Guaico shot or owns the photo. The full list lives on `/creditos`.
- **Do** keep focus visible: 2px link-green outline, offset 2px; gold on shell surfaces.
- **Do** announce state with text, not colour alone (struck sizes, "agotada" labels, alert roles, polite live regions).
- **Do** keep motion to feedback: 150-220ms ease-out-expo for menus, sheets, dialogs, count bump, press scale, 500ms banner fade; collapse all durations under `prefers-reduced-motion`.

### Don't:
- **Don't** use shadows on resting surfaces; only floating layers get them.
- **Don't** use marketplace orange or cream-and-terracotta artisan-boutique palettes.
- **Don't** invent ratings, reviews, testimonials, logos or sales proof; none exist.
- **Don't** add a second display face, gradient text, glass effects or decorative motion.
- **Don't** use glyph characters as icons; icons are Lucide SVGs with `aria-hidden`.
- **Don't** convey status by colour alone.
- **Don't** copy design-brief text into shipped source, comments or metadata.

## Known drift

- The brief says "Figtree only"; the admin uses system monospace for SKUs and codes (`MONO` in `frontend/src/components/admin/ui.tsx`).
- Chart colours and axis greys (`#1d6b52`, `#4a5550`, `#cdd3cd`, `#e8ece8`, `#9aa39b`) are hard-coded in `charts.tsx`, and pill, alert and swatch-check text shades are hand-set hex, not tokens.
- Floating layers and the banner scrim carry `taste-skill-ignore` markers; the banner scrim is a black gradient, not a token.
- Weight 700 appears on the banner headline and brand wordmark despite the 600 ladder; recorded as the single exception.
- Not canonized: no kickers, offset shadows or glyph icons were found in the sampled files, so nothing banned by the craft floor is recorded as a rule.
