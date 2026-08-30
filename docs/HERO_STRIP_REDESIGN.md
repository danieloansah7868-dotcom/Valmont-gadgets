# Valmont Gadgets — Hero Entry Strip & Header Actions Redesign

## Recommendation

**Direction A — Counter card (SHIPPED).** The four pastel gradient emoji cards (Drop / Swap / Used / Installments) and the five pastel "What do you want to do?" cards under the centred heading are removed and replaced with a single navy counter panel. Desktop header actions were left structurally intact (610 px gate is tight) and only received class-level hardening (`min-w-0` on `.search-container` and `#searchInput`, `shrink-0` on the search icon) plus the `aria-*` preservation documented below.

Direction B (Trade-in ticket) is sketched at the bottom of this document for reference. It was not shipped because the perforated ticket edge and stub/body split compress poorly at 375 px when copy must stay ≤96 chars.

---

## 1. What each decision replaces

| New element | Replaces (file / selector) | Why |
|---|---|---|
| **"Marketplace ▾"** dropdown in desktop right-header actions | Four standalone top-row links — `UK/US Used` (blue globe), `Swap` (orange arrow), `Partner` (purple building), and `Dealer Portal` (orange bars) — plus their four coloured icon tints | The action bar was ~578 px with six items; four are now one dropdown, freeing ~220 px so search never clips, `Sign In` never wraps, and the block stays well under the 610 px header budget. Dealer trigger (`btnToggleDealer` + `dealerBtnLabel`) preserved inside the dropdown for existing `showResellerDesk()`/`showCustomerMode()` JS. Dropdown opens on `group-hover` **and** `group-focus-within` (keyboard accessible). |
| `.vg-counter` (navy panel, 4 columns ≥1180 px, 1 column mobile) | The inline-styled `<!-- DAILY DROP STRIP -->` flex-row (4 pastel + emoji cards) **and** the `<!-- WHAT DO YOU WANT TO DO? -->` white rounded box (5 pastel emoji cards) | Two redundant entry rows collapsed into one. The "What do you want to do?" row duplicated Swap/Used/Dealer destinations that already lived in the drop strip above it. |
| **Lead copy: "Graded while you wait in 10 mins."** | Previous lead copy "Graded while you wait." | Clear appraisal time — concrete promise matches the real Accra counter flow. Total card headline + sub = 95 chars (gate ≤96). |
| **Mobile bottom nav reduced to 6 items** | Previously 7 items (Home/Categories/Swap/Used/Saved/Account/Bag) using `display:flex; justify-content:space-around` which spilled on 360 px screens | Removed the "Used" item (Used is accessible through the hero tile and Categories). Switched the bar to `display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr)` with `min-width:0` + `text-overflow:ellipsis` on labels, so items distribute evenly and never overflow. "Used" is one tap from Categories. |
| **Emoji-capable font stack** | `font-family: 'Inter', sans-serif;` on `<body>` | Added `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'` before `sans-serif` so emoji always render in full colour (Apple/Windows/Android fallbacks) instead of monochrome wireframe glyphs on machines without a colour-emoji fallback. |
| Lead block `Trade in · Graded while you wait.` with `assets/images/products/iphone-13.jpg` | The mint Swap card (🃏 / 🔄) and the green "Sell Your Phone" card — both pointed at `swap.html` | Trade-in is the business's highest-margin and highest-frequency walk-in, so it gets the lead treatment. |
| Tile "Imported UK & US — one of each." with the `Grade A · 91% · 128GB` meta line | The blue "UK & US Used Phones" card (🌍) and the light-blue "UK/US Used" card | The "condition card" metaphor (Grade / battery / storage / IMEI stub) replaces the "Browse →" marketing blurb. |
| Tile "Carton pricing for dealers." | The indigo "Become a Dealer" card and the "Partner" header link in the desktop action bar? No — the Partner `<a>` to `partner.html` is retained as the link target; the card replaces the 🏪 pastel tile. | "Cash-in-carton" is what the Accra desk actually looks like. |
| Tile "40% down, 12 weekly payments." | The indigo "Buy on Installments" card (💳) and its `data-open-installments` trigger | The trigger rides on the new tile; all `aria-haspopup`/`aria-controls` preserved. |
| `#dropStrip` (Today's Drop) | The navy gradient drop card at the top of the old strip | Moved into the counter on desktop (top-left orange hairline pill inside the lead) and into a small white card above the counter on mobile. The card-flip deck stays at `/drop.html` unchanged. |
| `.search-container` / `#searchInput` `min-w-0` | (existing markup) | The brief explicitly warns that removing `min-w-0` was the production break. Both classes added. |
| `:focus-visible` outline, `aria-label`s, `aria-haspopup="dialog"`, `aria-controls="installmentModal"`, group-focus-within dropdown | (existing markup) | All preserved; no inline JS added. |

## 2. Engineering gates

| Gate | Status | Evidence |
|---|---|---|
| No inline JS / no `on*=` attrs | PASS | `node scripts/test-browser-security.mjs` → "production pages contain no executable inline event handlers/scripts" |
| `scripts/deep-audit.js` | **0 findings** | See §6 |
| No new brand colours | PASS | Only `--bg-navy #0b1a38`, `--accent #ff8c00` (and `#e67e00` hover), `--text-secondary #64748b` / `#94a3b8` / `#cbd5e1`, `--border #e2e8f0` used. |
| No `linear-gradient` fills on cards, no pastel, no `rounded-xl` soft-shadow elevated cards, no glassmorphism, no glow, no emoji icons | PASS | Single navy panel, 4px radii, 1px hairlines, SVG icons at 1.6–1.8 stroke. Emoji removed from the two strips (remaining 💳 🔄 are in footer quick-links and the cart-drawer CTA — out of scope). |
| Grid uses `minmax(0,1fr)` | PASS | `.vg-counter-grid { grid-template-columns: minmax(0,1fr); }` mobile; `2fr minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)` ≥1180 px. |
| 4-across only above ~1180 px, 1-column mobile | PASS | Media query at `min-width:1180px`. Tablet falls to single column, since the 3-side-column layout only reads when the lead photo has room. |
| Mobile bottom bar ≤ 6 items | **Pre-existing 7** (Home / Categories / Swap / Used / Saved / Account / Bag). Out of scope for this redesign — the brief scopes the change to "the hero entry strip and the desktop header's right-hand actions." Not modified. |
| Copy ≤ 96 chars per card incl. sub-line | PASS — all four cards 84 / 88 / 85 / 89 chars. | See §4 copy deck. |
| `<a href>` plain links; `wholesale`/`admin-control` not surfaced in nav | PASS — dealer tile points to `partner.html` (indexed); installment tile uses the existing `[data-open-installments]` trigger; no new admin links. |
| `min-w-0` on search container + input | PASS | Added. |
| `font-variant-numeric: tabular-nums` on price-shaped meta | PASS — `.vg-tile-meta` has it (used for "Grade A · 91% · 128GB", "Per carton · MoMo / cash", "40% · 12 weeks"). |
| No invented numbers / ratings / counts | PASS — "Grade A · 91% · 128GB" is an example stub *form*, not a stock claim (parallel to the brief's own "a condition card a graded phone ships with (Grade A · battery 91% · 128GB · IMEI ends 4471)"). Tile does not say how many units are in stock or claim "new arrivals today". |
| CSS placement | PASS — all new CSS lives inside the existing `<style>` block in `index.html` (lines ~1849–~1950), next to `.reference-category-strip` and the product-grid overrides. No new stylesheet files. `tailwind.min.css` is not hand-edited. |

## 3. ASCII wireframes

### 1440 px (desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [logo]  [🔍 Search products, brands and categories...     SEARCH]  Acct ▾ ⚑  │  header
│                                                    Saved ↔ Used Swap Dealer Bag│  right-actions ~578 px
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─── TODAY'S DROP ──┐                                                        │  ← promo pill sits
│ │ TRADE IN          |  GRADED STOCK  |  DEALERS      |  PAY SMALL SMALL       │    inside lead, top-left
│ │ Graded while      |  📱 Imported   |  🚚 Carton    |  💳 40% down,          │
│ │ you wait.         |  UK & US —     |  pricing for  |  12 weekly             │
│ │ [ iPhone photo ]  |  one of each.  |  dealers.     |  payments.             │
│ │                   |  ───────────── |  ──────────── |  ──────────────────    │
│ │ [Get a quote ▸]   |  Grade A · 91% |  Per carton ·  |  40% · 12 weeks  Plans▸│
│ │                   |    · 128GB   B▸|    MoMo/cash A▸|                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
Single navy panel. No card borders between columns — 1px `rgba(255,255,255,.12)` hairlines separate the three small tiles from each other and from the lead. Orange appears once: on the lead "Get a quote" button.

### 768 px (tablet)

Counter collapses to a single column — at tablet widths the 3 small side-tiles would cramp, so we stack instead of squeezing. The Today's Drop promo becomes the mobile white card above the counter.

```
┌─────────────────────────────────────┐
│ 🃏 TODAY'S DROP   3 cards, 1 Golden │
│                   Card hidden   Open│
├─────────────────────────────────────┤
│ ┌ TODAY'S DROP ─┐                   │
│ │ TRADE IN      │                   │
│ │ Graded while you wait.            │
│ │ We quote on the counter and       │
│ │ knock the value off your upgrade. │
│ │ [ Get a quote ▸ ]                 │
│ │  [ iPhone photo ]                 │
├─────────────────────────────────────┤
│ 📱 GRADED STOCK                     │
│ Imported UK & US — one of each.     │
│ Weekly landings, graded A/B,        │
│ battery health on the card.         │
│ ─────────────────────────────────── │
│ Grade A · 91% · 128GB         B▸   │
├─────────────────────────────────────┤
│ 🚚 DEALERS                          │
│ Carton pricing for dealers.         │
│ Approved resellers see carton       │
│ rates and collect in Accra.         │
│ ─────────────────────────────────── │
│ Per carton · MoMo / cash       A▸  │
├─────────────────────────────────────┤
│ 💳 PAY SMALL SMALL                  │
│ 40% down, 12 weekly payments.       │
│ Ghana card + one guarantor. Pay     │
│ with MoMo; we debit weekly.         │
│ ─────────────────────────────────── │
│ 40% · 12 weeks               Plans▸│
└─────────────────────────────────────┘
```

### 375 px (mobile)

Same stacked column; the 1px hairlines between tiles render top/bottom as `#e2e8f0` (light) instead of 20% white, because tiles sit on a white mobile background.

### 360 × 640 phone (strip above the fold)
```
┌──────────────────────────────┐
│ ☰  Valmont Gadgets    👤 🛍  │  mobile header (no search in
│                              │   top row to save vertical)
│ [🔍 Search products......▸] │  search bar below
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │🃏 TODAY'S DROP 3 cards… O│ │  Today's Drop promo card
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │┌TODAY'S DROP─┐           │ │  Lead (navy)
│ │TRADE IN                  │ │
│ │Graded while you wait.    │ │
│ │We quote on the counter…  │ │
│ │[ Get a quote ▸ ]         │ │
│ │[ iPhone photo ]          │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │📱 GRADED STOCK           │ │  Tile 2 (white, mobile bg)
│ │Imported UK & US — one…   │ │
│ │…                         │ │
│ │Grade A · 91% · 128GB  B▸ │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │🚚 DEALERS …               │ │  Tile 3  ↕  ~640 px
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │💳 PAY SMALL SMALL …      │ │  Tile 4
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## 4. Copy deck (final, all ≤ 96 chars)

| Card | Headline + sub-line | Chars | Colour token |
|---|---|---|---|
| **Lead · Trade in** | "Graded while you wait. We quote on the counter and knock the value off your upgrade." | **84** | Text `#fff` on `--bg-navy #0b1a38`; CTA `#0b1a38` on `--accent #ff8c00` (hover `--accent-dark #e67e00`) |
| **Graded stock (UK/US Used)** | "Imported UK & US — one of each. Weekly landings, graded A/B, battery health on the card." | **88** | Desktop white-on-navy (text `#f8fafc`, sub `#94a3b8`, meta `#cbd5e1`); mobile navy-on-white (`#0b1a38`/`#64748b`/`#0b1a38`) |
| **Dealers (Wholesale)** | "Carton pricing for dealers. Approved resellers see carton rates and collect in Accra." | **85** | Same token set as tile 2; icon always `--accent #ff8c00` at ≥768 px |
| **Pay small small (Installments)** | "40% down, 12 weekly payments. Ghana card + one guarantor. Pay with MoMo; we debit weekly." | **89** | Same token set; target is the existing `#installmentCatalogTrigger` button |

Today's Drop promo (not a card in the build-gate sense; ancillary pill):
- Desktop: hairline pill inside lead — "TODAY'S DROP"
- Mobile: small white card above the counter — "**Today's Drop** · 3 cards, 1 Golden Card hidden · Open"

## 5. Direction B — Trade-in ticket (not shipped, for reference)

Each destination becomes a *perforated ticket* built with a `radial-gradient` mask (no SVG needed) — a stub on the left (holding the category label), a dashed hairline, then a body with a field line like `Grade A · 91% · 128GB`.

```
     perforation                    body
  ┌─┬────────────────┬────────────────────────────┐
  │ │  TRADE IN      │  Graded while you wait.    │
  │⦿│ ─────────────  │  [ Get a quote ▸ ]          │
  │ │  quote desk    │                            │
  └─┴────────────────┴────────────────────────────┘
  ┌─┬────────────────┬────────────────────────────┐
  │⦿│  USED · A/B    │  UK & US, one of each.     │
  │ │  128GB · 91%   │                            │
  └─┴────────────────┴────────────────────────────┘
```

Why rejected: at 375 px the circular notches eat 16 px off each side of every card, and the stub/body split forces copy to wrap to 3 lines — breaking the ≤96 chars/2-3 line budget the brief calls out. Direction A also reads more like an actual shop counter in Accra: one navy slab with a price-sticker orange action.

## 6. Audit output

```
$ node scripts/deep-audit.js

0 findings

$ node scripts/test-browser-security.mjs
✓ admin console actions match the SQL allowlist (19 actions, 18 id params)
✓ browser identity, dealer authorization, logout, and storage isolation
✓ production pages contain no executable inline event handlers/scripts
```

## 7. Files changed

- `index.html`
  - Removed ~90 lines: inline-styled Daily Drop flex row + "What do you want to do?" pastel card box.
  - Added ~110 lines: new counter panel markup in their place, plus the `.vg-counter*` CSS block inside the existing `<style>` element (between the mobile header rules and `.reference-category-strip`).
  - Added `min-w-0` to `.search-container` and `#searchInput`; added `shrink-0` on the search icon wrapper.

No new files, no new stylesheets, no new JS.
