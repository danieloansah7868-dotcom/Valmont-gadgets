# Future Upgrade: Authorized Valmont Resellers Network

> **Status:** Launched v0 (application-only) on the homepage
>
> **Last updated:** 2026-09-04
>
> **Related:** FUTURE_SUPPLIER_NETWORK.md

## What's live now (v0)

The homepage shows an "Authorized Valmont Resellers" strip directly below the
supplier WhatsApp banner. It currently displays **4 open slots** (Accra, Kumasi,
Takoradi, Tamale) with a **"Become a reseller"** WhatsApp CTA that opens
`wa.me/233542451578` with a pre-filled application message.

This is honest: we are not fabricating partner shop names. The slots are open
applications. When a reseller is approved, their slot is filled in and they
appear on the homepage.

## Honest messaging rules

- **Never** invent a shop name, location or logo. Only shops that have actually
  placed ≥1 wholesale order and agreed to be listed should appear.
- Every listed reseller must sign a simple one-page authorization slip: Valmont
  supplies their genuine stock, they display the "Authorized Valmont Reseller"
  sticker, and both parties honour the warranty chain.
- A reseller that repeatedly sources grey-market/clone stock "on the side" and
  passes it off as Valmont-supplied loses the badge immediately.

## How to add a real reseller

Once a shop is approved, edit `scripts/rewire-internal-links.js` in the
`resellersStrip` block and replace one of the dashed-slot `<div>` blocks with a
filled-in card, e.g.:

```html
<div class="border border-gray-200 rounded-[4px] p-3 bg-orange-50/40">
  <p class="font-black text-[12px] text-[#0b1a38]">DanTech Phones</p>
  <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Circle, Accra</p>
</div>
```

Then run `npm run build` and deploy. Do not add more than 8 reseller cards on
the homepage without a carousel — the grid is currently 4 columns on desktop,
2 on mobile.

## Upgrades over time, in order

### v1 (when we have 4+ real resellers)
- Replace all 4 open slots with real shops.
- Add a second row of 4 slots, capped at 8.
- Add a small Valmont sticker asset (printable PDF) for physical shops.
- Take a real photo of each shopfront; use instead of placeholder cards.

### v2 (when we have 10+ resellers)
- Add a dedicated `/resellers.html` page listing every authorized reseller by
  region with Google Maps deep link and phone number.
- Link to that page from the homepage strip ("See all authorized resellers →").
- Issue resellers a unique discount/coupon code so their walk-in customers can
  also buy from valmontgadgets.com with the reseller getting credit.

### v3 (linked to Supplier Network)
- Once FUTURE_SUPPLIER_NETWORK.md Phase 2 (managed sourcing) is live, show a
  "Verified stock" badge on each reseller card so customers know the reseller
  is supplied directly from Valmont's warehouse.
- Add fulfilment tracking: resellers can place bulk orders directly from their
  account instead of WhatsApp.

## Safety rules

- Do not accept payment to be listed. A reseller earns the badge by ordering
  consistently, not by paying a marketing fee.
- Remove a reseller from the strip within 24 hours if customer reports of fake
  stock or broken warranty are verified.
- Keep the strip to shops that are actually open and reachable. A phone number
  that doesn't connect hurts trust more than an empty slot.

## What is explicitly out of scope now

- Fabricated social proof (fake logos, "500+ resellers" claims, stock photos).
- Paid placement / "sponsored reseller" slots.
- Automatic enrolment of anyone who submits the form — every slot is manually
  approved by Daniel.
- Nationwide coverage claims until at least one reseller exists in that region.

## Principle

The reseller badge is trust infrastructure. Every shop we list must be a shop
we would personally buy a phone from. Start with empty slots rather than fake
logos.
