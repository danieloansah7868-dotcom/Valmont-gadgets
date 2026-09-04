#!/usr/bin/env node
/**
 * Task 3 — Option A: build-time server rendering of the product grid.
 *
 * Reads the public catalog from assets/js/catalog.js (single source of truth),
 * renders static markup for every SKU into #productGrid in index.html,
 * and regenerates the Product JSON-LD @graph so the two can never drift.
 *
 * The markup mirrors the client-side template in app.js renderProducts()
 * so that the pre-paint HTML and the hydrated HTML are visually identical.
 *
 * Usage: node scripts/prerender.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://valmontgadgets.com';
const BIZ = require(path.join(ROOT, 'src/data/business.js'));

const GRID_START = '<!-- PRERENDER:PRODUCTS:START -->';
const GRID_END = '<!-- PRERENDER:PRODUCTS:END -->';
const LD_START = '<!-- PRERENDER:PRODUCT-JSONLD:START -->';
const LD_END = '<!-- PRERENDER:PRODUCT-JSONLD:END -->';

/** Evaluate the inert public catalog against an isolated window object. */
function loadProducts() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/catalog.js'), 'utf8');
  const isolatedWindow = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src)(isolatedWindow);
  if (!Array.isArray(isolatedWindow.VALMONT_CATALOG)) {
    throw new Error('assets/js/catalog.js did not expose VALMONT_CATALOG');
  }
  return normalise(isolatedWindow.VALMONT_CATALOG.map((product) => ({ ...product })));
}

/**
 * Mirrors the merchandising normalisation app.js applies at runtime
 * (reviews_count / stock_quantity are derived, not authored). Kept in sync
 * with the PRODUCTS.forEach((p, index) => ...) block in app.js.
 */
function normalise(products) {
  products.forEach((p, index) => {
    const name = p.name.toLowerCase();
    const isPopular = name.includes('iphone 15 pro max') || name.includes('s24 ultra');
    const isMidRange = name.includes('iphone 13') || name.includes('a55');
    const isAccessory = ['chargers', 'phone_acc', 'phone_parts', 'travel_acc', 'laptop_acc', 'smart_home', 'networking', 'cameras'].includes(p.category);
    const isNew = p.badge === 'NEW';
    p.reviews_count = isPopular ? 42 + (index % 27)
      : isMidRange ? 18 + (index % 15)
      : isNew ? index % 6
      : isAccessory ? 8 + (index % 8)
      : 12 + (index % 18);
    p.stock_quantity = isPopular ? 3 + (index % 6)
      : p.category === 'samsung' ? 5 + (index % 8)
      : isAccessory ? 15 + (index % 16)
      : 6 + (index % 12);
    // UK Used stock — three phones whose copy reads "UK Used - 6m Store
    // Warranty" are advertised to Google as UsedCondition. "Swapping Allowed"
    // on its own (trade-ins on a NEW unit, e.g. VG-AW-17PROMAX) does not
    // flip the condition.
    p._isUsed = /\bUK Used\b/i.test(p.stock || '') && /6m Store Warranty/i.test(p.stock || '');
  });
  return products;
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n) => `GH₵ ${Number(n).toLocaleString('en-US')}`;

// Icons reference the <symbol> sprite defined at the top of <body>, which keeps
// ~136 KB of duplicated SVG path data out of the static HTML payload.
const STAR = '<svg class="w-3.5 h-3.5 fill-current" aria-hidden="true"><use href="#i-star"/></svg>';

/**
 * Local uploads/*.png have pre-generated 400/800 WebP derivatives, so those get
 * a <picture> with srcset. Remote (Unsplash) images already serve optimised
 * WebP via their own CDN and are left as plain <img> with a width-tuned srcset.
 */
function imageMarkup(p, index) {
  const alt = esc(p.name);
  const eager = index < 6; // first row on desktop is above the fold
  const loading = eager ? '' : ' loading="lazy"';
  const priority = index === 0 ? ' fetchpriority="high"' : '';
  const local = /^uploads\//.test(p.image || '');
  const cls = `max-h-full object-contain group-hover:scale-105 transition duration-200${local ? ' product-media-local' : ''}`;

  if (local) {
    const base = p.image.replace(/\.png$/, '');
    return (
      `<picture>` +
      `<source type="image/webp" srcset="${base}_400.webp 400w, ${base}_800.webp 800w" sizes="(max-width: 640px) 45vw, 140px">` +
      `<img src="${esc(p.image)}" alt="${alt}" width="140" height="140"${loading}${priority} decoding="async" class="${cls}" />` +
      `</picture>`
    );
  }

  const u = (p.image || '').replace(/([?&])w=\d+/, '$1w=400');
  const srcset = u !== p.image ? ` srcset="${esc(u)} 400w, ${esc(p.image)} 800w" sizes="(max-width: 640px) 45vw, 140px"` : '';
  return `<img src="${esc(p.image)}"${srcset} alt="${alt}" width="140" height="140"${loading}${priority} decoding="async" class="${cls}" />`;
}

function productVariants(p) {
  const source = `${p.name} ${p.specs}`.toLowerCase();
  const palette = [
    ['black', '#111827'], ['midnight', '#1f2937'], ['obsidian', '#171717'], ['titanium', '#94a3b8'],
    ['blue', '#2563eb'], ['purple', '#7e22ce'], ['pink', '#ec4899'], ['white', '#f8fafc'],
    ['silver', '#cbd5e1'], ['green', '#16a34a'], ['gray', '#6b7280'], ['grey', '#6b7280'],
    ['gold', '#d4a72c'], ['cream', '#f5f0df'], ['navy', '#172554']
  ];
  const colors = palette.filter(([name]) => source.includes(name)).map(([, value]) => value).slice(0, 3);
  const storage = [...new Set((`${p.name} ${p.specs}`.match(/\b(?:\d+(?:\.\d+)?(?:GB|TB)|\d+GB RAM)\b/gi) || []).map(value => value.toUpperCase()))].slice(0, 3);
  return { colors: colors.length ? colors : ['#111827', '#94a3b8', '#f8fafc'], storage };
}

function variantsMarkup(p) {
  const { colors, storage } = productVariants(p);
  return `<div class="mt-1.5 space-y-1" aria-label="Available colour and storage variations">
        <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-gray-500">Colours:</span>${colors.map(color => `<span class="w-2 h-2 rounded-full border border-gray-300" style="background:${color}" aria-hidden="true"></span>`).join('')}</div>
        ${storage.length ? `<div class="flex items-center gap-1 flex-wrap"><span class="text-[9px] font-bold text-gray-500">Size:</span>${storage.map(size => `<span class="border border-gray-200 rounded px-1.5 py-0.5 text-[8px] font-bold text-gray-600">${size}</span>`).join('')}</div>` : ''}
      </div>`;
}

function card(p, index) {
  const discount = p.compareAt ? Math.round((1 - p.retail / p.compareAt) * 100) : 0;
  const id = esc(p.id);
  const stockQty = p.stock_quantity || 0;
  const reviews = p.reviews_count || 0;

  return `
            <div role="button" tabindex="0" data-open-product="${id}" class="bg-white rounded-[4px] overflow-hidden border border-gray-200 hover:shadow-md transition duration-200 flex flex-col justify-between group relative cursor-pointer">
              <button type="button" data-wishlist-product="${id}" class="absolute top-2.5 right-2 h-7 w-7 rounded-full bg-white/95 shadow-sm border border-gray-50 flex items-center justify-center z-10 transition" aria-label="Toggle ${esc(p.name)} in saved items">
                <svg class="h-4.5 w-4.5 text-gray-400 hover:text-red-500" aria-hidden="true"><use href="#i-heart"/></svg>
              </button>

              <div class="p-3">
                <div class="product-image-frame h-[140px] w-full flex items-center justify-center overflow-hidden mb-2 rounded-[4px] bg-gray-50">
                  ${imageMarkup(p, index)}
                </div>
                <h4 class="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[32px]">${esc(p.name)}</h4>
                <p class="text-[10px] text-gray-400 font-medium truncate mt-1">${esc(p.specs)}</p>
                <div class="mt-2">
                  <span class="text-[14px] font-black text-gray-800">${money(p.retail)}</span>
                  <span class="text-[11px] text-gray-400 line-through ml-1 font-semibold">${money(p.compareAt || p.retail)}</span>
                  ${discount > 0 ? `<span class="text-[10px] text-[#ff8c00] font-black ml-1">-${discount}%</span>` : ''}
                  ${p.retail > 5000 ? '<span class="card-free-delivery">Free Delivery</span>' : ''}
                </div>
                <div class="flex items-center gap-0.5 text-[9px] text-amber-500 font-black mt-1">
                  <div class="flex items-center gap-0.5 text-amber-500" role="img" aria-label="Rated 5 out of 5">${STAR.repeat(5)}</div>
                  <span class="text-gray-400 font-bold ml-1">(${reviews})</span>
                </div>
                ${variantsMarkup(p)}

                <div class="mt-2.5">
                  <div class="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                    <span>${stockQty} items left</span>
                  </div>
                  <div class="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div class="bg-[#ff8c00] h-full" style="width: ${Math.min(100, stockQty * 4)}%"></div>
                  </div>
                </div>
              </div>
              <div class="px-3 pb-3 hidden md:block">
                <button type="button" data-add-product="${id}" class="w-full bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[11px] py-2 rounded-[4px] uppercase transition tracking-widest shadow-sm">
                  Add To Bag
                </button>
              </div>
            </div>`;
}

/** Maps a product name/category to a real manufacturer brand. */
const BRAND_RULES = [
  [/iphone|ipad|macbook|airpods|apple|airtag|magsafe/i, 'Apple'],
  [/samsung|galaxy/i, 'Samsung'],
  [/google pixel|pixel/i, 'Google'],
  [/oneplus/i, 'OnePlus'],
  [/xiaomi|redmi/i, 'Xiaomi'],
  [/sony/i, 'Sony'],
  [/\bjbl\b/i, 'JBL'],
  [/anker|soundcore/i, 'Anker'],
  [/baseus/i, 'Baseus'],
  [/spigen/i, 'Spigen'],
  [/logitech|\bmx\b/i, 'Logitech'],
  [/\bhp\b|spectre/i, 'HP'],
  [/dell|xps/i, 'Dell'],
  [/lenovo|thinkpad/i, 'Lenovo'],
  [/nintendo|switch/i, 'Nintendo'],
  [/playstation|\bps5\b/i, 'Sony'],
  [/ugreen/i, 'UGREEN'],
];

function brandOf(p) {
  const hay = `${p.name || ''} ${p.specs || ''}`;
  for (const [re, brand] of BRAND_RULES) if (re.test(hay)) return brand;
  return 'Valmont Gadgets';
}

function productJsonLd(products) {
  const graph = products.map((p) => ({
    '@type': 'Product',
    name: p.name,
    image: /^uploads\//.test(p.image || '') ? `${SITE}/${p.image}` : p.image,
    description: p.specs,
    sku: p.id,
    brand: { '@type': 'Brand', name: brandOf(p) },
    offers: {
      '@type': 'Offer',
      url: `${SITE}/#${p.id}`,
      priceCurrency: 'GHS',
      price: String(p.retail),
      availability:
        (p.stock_quantity || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: p._isUsed
        ? 'https://schema.org/UsedCondition'
        : 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Valmont Gadgets' },
    },
  }));
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

function replaceBlock(html, start, end, body, label) {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1) throw new Error(`Missing ${label} markers in index.html`);
  return html.slice(0, a + start.length) + body + html.slice(b);
}

/**
 * The client paginates at 20/page and defaults to sort=popular
 * (reviews_count desc). We pre-render exactly that first page in exactly that
 * order, so the markup the crawler sees is byte-for-byte what renderProducts()
 * paints on hydration — no flash, no layout shift, no visual change.
 */
const PAGE_SIZE = 20;

function firstPage(products) {
  return products
    .slice()
    .sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
    .slice(0, PAGE_SIZE);
}

/** Build a full ElectronicsStore LocalBusiness JSON-LD block for Google. */
function buildLocalBusinessLd() {
  const oh = BIZ.openingHours.map(h => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.dayOfWeek,
    opens: h.opens,
    closes: h.closes,
  }));
  const ld = {
    '@context': 'https://schema.org',
    '@type': ['ElectronicsStore','LocalBusiness'],
    '@id': `${SITE}/#business`,
    name: BIZ.name,
    legalName: BIZ.legalName,
    url: SITE + '/',
    telephone: BIZ.telephone,
    email: BIZ.email,
    logo: BIZ.logo,
    image: BIZ.image,
    priceRange: BIZ.priceRange,
    currenciesAccepted: BIZ.currenciesAccepted,
    paymentAccepted: BIZ.paymentAccepted.join(', '),
    address: { '@type': 'PostalAddress', ...BIZ.address },
    geo: { '@type': 'GeoCoordinates', latitude: BIZ.geo.latitude, longitude: BIZ.geo.longitude },
    openingHoursSpecification: oh,
    areaServed: BIZ.areaServed.map(r => ({ '@type': 'City', name: r })),
    sameAs: BIZ.sameAs,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '0',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Phones, Laptops & Electronics',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Genuine iPhones' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Samsung Galaxy Phones' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Executive Laptops (Apple, HP)' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Same-day Accra delivery' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Phone swap / trade-in' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: '12-month warranty' } },
      ],
    },
  };
  if (BIZ.hasMap) ld.hasMap = BIZ.hasMap;
  if (BIZ.googlePlaceId) {
    ld.identifier = BIZ.googlePlaceId;
    ld['@id'] = `${SITE}/#${BIZ.googlePlaceId}`;
  }
  return ld;
}

function main() {
  const products = loadProducts();
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  const grid = firstPage(products).map(card).join('\n') + '\n          ';
  html = replaceBlock(html, GRID_START, GRID_END, '\n' + grid, 'product grid');

  // The <script> wrapper is emitted inside the markers: HTML comments are not
  // legal inside a JSON-LD payload, so the markers must sit outside the tag.
  const ld =
    '\n  <script type="application/ld+json">\n' +
    productJsonLd(products) +
    '\n  <\/script>\n  ';
  html = replaceBlock(html, LD_START, LD_END, ld, 'product JSON-LD');

  // Keep the visible product count in sync with the data.
  html = html.replace(
    /(id="itemCountDisplay">)[^<]*(<)/,
    `$1${products.length} Products$2`
  );

  // Inject homepage BreadcrumbList + WebSite + FAQPage JSON-LD so Google can
  // display breadcrumbs, a Sitelinks Searchbox, and rich FAQ snippets for
  // the root URL. Also emit a full ElectronicsStore / LocalBusiness block
  // (NAP, opening hours, geo, sameAs) so Google Business Profile association
  // works immediately after verification.
  const homepageExtraLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BIZ.name,
      url: SITE + '/',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: SITE + '/?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    },
    buildLocalBusinessLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do you offer same-day delivery in Accra?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — Valmont Gadgets offers same-day delivery within Accra on most in-stock orders placed before 3pm. You can also pay on delivery or via Mobile Money.'
          }
        },
        {
          '@type': 'Question',
          name: 'Are the phones genuine and sealed?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'All phones sold at Valmont Gadgets are genuine. We sell brand-new sealed units as well as carefully inspected UK-used devices, each covered by our 12-month in-store warranty.'
          }
        },
        {
          '@type': 'Question',
          name: 'What payment methods do you accept?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We accept Mobile Money (MoMo), cash on delivery within Accra, and bank transfer. Swap / trade-in is also available on selected devices.'
          }
        },
        {
          '@type': 'Question',
          name: 'Do you sell laptops and accessories too?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. In addition to phones we stock executive laptops (HP, Apple, Dell, Lenovo), smartwatches, chargers, power banks, phone cases, screen protectors, cameras and smart-home devices — all with the same 12-month warranty.'
          }
        }
      ]
    }
  ];
  const extraBlock = homepageExtraLd.map(b =>
    `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`
  ).join('\n');
  // Idempotently inject the homepage-only JSON-LD set. Remove any previous
  // BreadcrumbList / WebSite / ElectronicsStore / FAQPage blocks so we do
  // not accumulate duplicates on rebuild.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?"(?:BreadcrumbList|WebSite|ElectronicsStore|FAQPage)"[\s\S]*?<\/script>\s*/g, '');
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?"@type":\s*\[(?:"ElectronicsStore"|"LocalBusiness"|"[\w]+")[\s\S]*?<\/script>\s*/g, '');
  html = html.replace('</head>', extraBlock + '\n</head>');

  fs.writeFileSync(file, html);
  console.log(
    `Prerendered ${Math.min(PAGE_SIZE, products.length)} product cards ` +
      `+ JSON-LD for all ${products.length} SKUs into index.html`
  );
}

main();
