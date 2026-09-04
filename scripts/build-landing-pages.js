#!/usr/bin/env node
/**
 * scripts/build-landing-pages.js
 *
 * Generates static, indexable SEO landing pages for every category and brand
 * that Valmont sells. Each page is a real HTML file under:
 *
 *     /c/<slug>/index.html  ->  e.g. /c/iphones/  ("iPhones in Ghana")
 *     /brand/<slug>/index.html -> e.g. /brand/apple/ ("Apple Store Ghana")
 *
 * Why a directory + index.html rather than /c/iphones.html?
 *   - Directory-style URLs get the trailing slash we want (`/c/iphones/`) and
 *     match what the canonical/sitemap emit, which avoids a Search Console
 *     "URL not in sitemap" mismatch.
 *   - All pages are self-canonicalising — none point back to the homepage.
 *
 * Every page:
 *   - has its own <title> leading with the query intent, not the brand name
 *   - uses LIVE DATA for meta description (real SKU count, real min price)
 *   - renders 150+ visible words of body copy (what we stock, brands, delivery)
 *   - shows a visible "also searched as / also known as" line
 *   - has an FAQ section (3+ real questions) mirrored as FAQPage JSON-LD
 *   - has BreadcrumbList + ItemList/CollectionPage JSON-LD
 *   - links to sibling category/brand pages so crawlers can traverse the set
 *   - bootstraps the storefront JS, which auto-selects the matching filter
 *     from location.pathname so users land directly on the filtered grid
 *
 * Run:  node scripts/build-landing-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://valmontgadgets.com';
const { CATEGORIES, BRANDS, SERVICES, LOCATIONS, SITE_TERMS } = require(path.join(ROOT, 'src/data/keywords.js'));
const { CATEGORY_COPY, BRAND_COPY } = require(path.join(ROOT, 'src/data/copy.js'));

// ── Load the real product catalogue (same approach as prerender.js) ──────────
function loadProducts() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/catalog.js'), 'utf8');
  const w = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src)(w);
  return Array.isArray(w.VALMONT_CATALOG) ? w.VALMONT_CATALOG : [];
}
const PRODUCTS = loadProducts();

// Infer brand field for products that don't declare it explicitly, so brand
// page matching works across every SKU in the catalogue.
function brandOf(p) {
  if (p.brand) return p.brand.name || p.brand;
  const n = p.name;
  if (/iphone|ipad|macbook|airpod|airtag|apple watch/i.test(n)) return 'Apple';
  if (/samsung|galaxy/i.test(n)) return 'Samsung';
  if (/sony|wh-1000xm|playstation|ps5/i.test(n)) return 'Sony';
  if (/jbl/i.test(n)) return 'JBL';
  if (/anker/i.test(n)) return 'Anker';
  if (/^hp\b|hp\s/i.test(n)) return 'HP';
  if (/dell/i.test(n)) return 'Dell';
  if (/logitech/i.test(n)) return 'Logitech';
  if (/nintendo/i.test(n)) return 'Nintendo';
  if (/xiaomi|redmi/i.test(n)) return 'Xiaomi';
  if (/google pixel/i.test(n)) return 'Google';
  if (/oneplus/i.test(n)) return 'OnePlus';
  if (/tp-link|tapo|archer|deco/i.test(n)) return 'TP-Link';
  if (/spigen/i.test(n)) return 'Spigen';
  if (/ugreen/i.test(n)) return 'UGREEN';
  if (/baseus/i.test(n)) return 'Baseus';
  return 'Valmont Gadgets';
}
PRODUCTS.forEach(p => { p.brand = brandOf(p); });

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.slug, c.shortLabel]));
const money = (n) => `GH₵ ${Math.round(Number(n)).toLocaleString('en-US')}`;
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function minPrice(products) {
  return products.reduce((m, p) => Math.min(m, Number(p.retail) || Infinity), Infinity);
}

// ── FAQ content (shared structure, interpolated per page) ────────────────────
function buildFAQs(ctx) {
  // Start with a short set of universal FAQs (price/genuineness/delivery/warranty).
  const minPriceText = Number.isFinite(ctx.min) && ctx.min < Infinity
    ? `start from ${money(ctx.min)}` : `are priced for every budget`;
  const universal = [
    {
      q: `How much does a ${ctx.shortLabel.toLowerCase()} cost in Ghana?`,
      a: `Prices ${minPriceText} at Valmont Gadgets. The exact price depends on the model, storage and condition (sealed vs UK used). Every price listed on valmontgadgets.com is the real retail price you pay at checkout in Ghana cedis — we do not hide prices behind a quote form.`,
    },
    {
      q: `Are the ${ctx.shortLabel.toLowerCase()} you sell genuine?`,
      a: `Yes. Every unit we sell is genuine and verified before dispatch. Sealed units come in their original box with manufacturer warranty; UK/US used units are graded (Grade A/B/C) with battery health shown on the listing and come with a 6-month store warranty. We do not sell clones, refurbs passed off as new, or blacklisted devices.`,
    },
    {
      q: `Do you deliver to my part of Accra or region?`,
      a: `Same-day delivery across Greater Accra on orders placed before 3pm. Free Accra delivery on orders above GH₵ 5,000. Nationwide dispatch to Kumasi, Takoradi, Tamale, Cape Coast and the rest of Ghana via trusted courier. Pay by MTN MoMo, Telecel Cash, AT Money, bank card, or cash on delivery in Accra.`,
    },
    {
      q: `What warranty do I get?`,
      a: `Sealed devices carry a 12-month Valmont warranty on manufacturer defects. UK/US used devices carry 6 months. Accessories (chargers, cables, cases, speakers) carry 6 months. We honour returns within 7 days for sealed items with verifiable defects.`,
    },
  ];
  // Prepend category/brand-specific FAQs from src/data/copy.js so they show
  // first (Google uses the first few Qs for rich snippets).
  const customBlock = ctx.isBrand ? BRAND_COPY[ctx.slug] : CATEGORY_COPY[ctx.slug];
  const custom = (customBlock && customBlock.faqs) ? customBlock.faqs : [];
  // Keep total FAQ count reasonable (max 8).
  return [...custom, ...universal].slice(0, 8);
}

// ── Read the existing homepage header/footer so landing pages share chrome ───
//
// Rather than hand-copying nav/footer markup (which would drift), we extract
// the <head> contents up through </header> and everything from <footer>
// onwards out of index.html, then swap in the page-specific title,
// canonical, meta description and JSON-LD. This keeps header, search bar and
// footer identical across all landing pages.
const homepage = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractHeaderTemplate(html) {
  // Return markup from <!DOCTYPE> through the end of </header> (or up to <main>).
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) throw new Error('Cannot find </head> in index.html');
  const bodyStart = html.indexOf('<body', headEnd);
  const headerEnd = html.indexOf('</header>');
  if (headerEnd === -1) throw new Error('Cannot find </header> in index.html');
  const afterHeader = html.indexOf('>', headerEnd) + 1;
  return {
    headInner: html.slice(html.indexOf('<head>') + 6, headEnd),
    bodyStartTag: html.slice(bodyStart, html.indexOf('>', bodyStart) + 1),
    bodyHeader: html.slice(html.indexOf('<body'), afterHeader),
  };
}

function extractFooterTemplate(html) {
  // From <footer> through </html>.
  const footerStart = html.indexOf('<footer');
  if (footerStart === -1) throw new Error('Cannot find <footer> in index.html');
  return html.slice(footerStart);
}

const TPL = extractHeaderTemplate(homepage);
const FOOTER_HTML = extractFooterTemplate(homepage);

// We need the set of scripts to re-include. The production build fingerprints
// every asset, so we reference the same src=/href= attributes the homepage
// uses (build-production.mjs will rewrite them).
const SCRIPT_TAGS = (() => {
  const m = homepage.match(/<script[^>]+src="[^"]+"[^>]*><\/script>/g) || [];
  // Keep only the deferred app/catalog/password-reset scripts plus PWA ones.
  // The catalog + app combo is what boots the product grid; we add a small
  // bootstrap to auto-select the category/brand filter from the URL.
  return m.filter(s => /(analytics|storefront|catalog\.min|password-reset|security|page-init|valmontai)/.test(s) || /src="app\.js"/.test(s));
})();
const STYLE_LINKS = (() => {
  const m = homepage.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || [];
  return m;
})();

// headInner does NOT contain the closing </head> — we append anything that
// can't find an existing tag to the END of head, and close it in the template.
function appendToHead(head, tag) {
  return head + '\n' + tag;
}
function replaceMetaTag(head, name, content) {
  const re = new RegExp(`<meta\\s+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const next = `<meta name="${name}" content="${esc(content)}">`;
  if (re.test(head)) return head.replace(re, next);
  return appendToHead(head, next);
}
function setCanonical(head, url) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/i;
  const next = `<link rel="canonical" href="${url}">`;
  if (re.test(head)) return head.replace(re, next);
  return appendToHead(head, next);
}
function setOg(head, prop, content) {
  const re = new RegExp(`<meta\\s+property=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const next = `<meta property="${prop}" content="${esc(content)}">`;
  if (re.test(head)) return head.replace(re, next);
  return appendToHead(head, next);
}
function setTitle(head, title) {
  return head.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
}

/**
 * Replace the whole JSON-LD block with a fresh set. We strip the old PRERENDER
 * Product graph from the header and emit fresh BreadcrumbList + CollectionPage
 * + ItemList + FAQPage blobs instead — each landing page is a collection,
 * not a single product.
 */
function replaceJsonLd(head, blocks) {
  // Drop all existing application/ld+json scripts (they describe products
  // on the homepage and are wrong on a category page). Note: headInner does
  // NOT contain the closing </head> tag (it was sliced off at extraction),
  // so we simply concatenate at the end and the caller re-attaches </head>.
  let next = head.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  // Also remove any leftover PRERENDER comments that referenced the old
  // Product JSON-LD.
  next = next.replace(/<!-- PRERENDER:PRODUCT-JSONLD:(START|END) -->\s*/g, '');
  // Remove the empty "Structured Data JSON-LD" comment followed by nothing.
  next = next.replace(/<!-- Structured Data JSON-LD -->\s*\n\s*(?:<!--[^>]*-->\s*\n?)*/g, '<!-- Structured Data JSON-LD -->\n');
  const joined = blocks.map(b =>
    `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n</script>`
  ).join('\n');
  return next + '\n' + joined + '\n';
}

// ── Render helpers ──────────────────────────────────────────────────────────
function stars(rating = 5) {
  const full = Math.round(rating);
  const s = '<svg class="w-3.5 h-3.5 fill-current" aria-hidden="true"><use href="#i-star"/></svg>';
  return `<div class="flex items-center gap-0.5 text-amber-500" role="img" aria-label="Rated ${rating} out of 5">${s.repeat(full)}</div>`;
}

function productCard(p) {
  const img = /^uploads\//.test(p.image) ? p.image : p.image;
  const compareAt = Number(p.compareAt) > Number(p.retail)
    ? `<span class="text-[11px] text-gray-400 line-through ml-1 font-semibold">${money(p.compareAt)}</span>
       <span class="text-[10px] text-[#ff8c00] font-black ml-1">-${Math.round((1 - p.retail/p.compareAt)*100)}%</span>` : '';
  return `
    <div role="button" tabindex="0" data-open-product="${esc(p.id)}" class="bg-white rounded-[4px] overflow-hidden border border-gray-200 hover:shadow-md transition duration-200 flex flex-col justify-between group relative cursor-pointer">
      <button type="button" data-wishlist-product="${esc(p.id)}" class="absolute top-2.5 right-2 h-7 w-7 rounded-full bg-white/95 shadow-sm border border-gray-50 flex items-center justify-center z-10 transition" aria-label="Save ${esc(p.name)}">
        <svg class="h-4.5 w-4.5 text-gray-400 hover:text-red-500" aria-hidden="true"><use href="#i-heart"/></svg>
      </button>
      <div class="p-3">
        <div class="h-[140px] w-full flex items-center justify-center overflow-hidden mb-2 rounded-[4px] bg-gray-50">
          <img src="${esc(img)}" alt="${esc(p.name)}" width="140" height="140" loading="lazy" decoding="async" class="max-h-full object-contain group-hover:scale-105 transition duration-200">
        </div>
        <h4 class="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[32px]">${esc(p.name)}</h4>
        <p class="text-[10px] text-gray-400 font-medium truncate mt-1">${esc(p.specs || '')}</p>
        <div class="mt-2">
          <span class="text-[14px] font-black text-gray-800">${money(p.retail)}</span>${compareAt}
        </div>
        <div class="flex items-center gap-0.5 text-[9px] text-amber-500 font-black mt-1">${stars(5)}<span class="text-gray-400 font-bold ml-1">(4.9)</span></div>
      </div>
      <div class="px-3 pb-3">
        <button type="button" data-add-product="${esc(p.id)}" class="w-full bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[11px] py-2 rounded-[4px] uppercase transition tracking-widest shadow-sm">Add To Bag</button>
      </div>
    </div>`;
}

function bodyCopy(ctx) {
  // ~300+ word human body block, data-driven. No fabricated numbers.
  const brandsList = [...new Set(ctx.products.slice(0, 30).map(pr => pr.brand))].slice(0, 6);
  const usedCount = ctx.products.filter(pr => /uk used|used/i.test(pr.stock || '')).length;
  const sealedCount = ctx.products.length - usedCount;
  const conditionLine = usedCount > 0
    ? `${sealedCount} of the items on this page are factory-sealed with a 12-month warranty; ${usedCount} are UK/US-graded used units with battery health printed on the listing and a 6-month store warranty.`
    : `Everything listed is factory-sealed stock with a 12-month warranty.`;
  const priceLine = Number.isFinite(ctx.min) && ctx.min < Infinity
    ? `Prices start at <strong>${money(ctx.min)}</strong>, and every price on this page is what you actually pay at checkout in Ghana cedis — no hidden fees, no "call for price" games.`
    : `Prices are listed in Ghana cedis on every product — what you see is what you pay.`;
  const copyBlock = ctx.isBrand ? BRAND_COPY[ctx.slug] : CATEGORY_COPY[ctx.slug];
  let paras = (copyBlock && copyBlock.paragraphs) ? copyBlock.paragraphs.slice() : [
    `Valmont Gadgets is Accra's trusted shop for <strong>${esc(ctx.shortLabel.toLowerCase())}</strong>. We stock genuine, verified units across ${brandsList.join(', ')} — every item on this page is in our warehouse right now, photographed, priced in Ghana cedis, and ready for same-day Accra delivery.`,
    ctx.isBrand
      ? `Whether you want the latest flagship or genuine accessories, every ${esc(ctx.shortLabel)} product here ships from our Accra showroom with a warranty card and a receipt. We do not sell clones.`
      : `${priceLine} Free delivery applies to Accra orders above GH₵ 5,000; we also ship nationwide to Kumasi, Takoradi, Tamale and Cape Coast. Pay by MTN MoMo, Telecel Cash, AT Money or card on Valmont-Pay. Phone swaps are accepted at the counter, and approved resellers can unlock wholesale pricing.`,
  ];
  // Append data-driven tail so every page ends with the price + warranty essentials.
  paras.push(`${priceLine} ${conditionLine} Same-day delivery across Greater Accra; nationwide to Kumasi, Takoradi, Tamale and Cape Coast. Pay by MoMo, card or cash on delivery. Phone swaps are accepted at the counter in under 10 minutes, and approved resellers can unlock wholesale pricing on the partner portal.`);
  return `
    ${paras.map((t, i) => `<p class="text-[14px] leading-relaxed text-gray-700 font-medium${i > 0 ? ' mt-3' : ''}">${t}</p>`).join('\n')}
  `;
}


function siblingLinks(ctx, validBrands) {
  // Cross-links to other categories / brands so crawlers traverse the full set.
  // Only link to brands/categories that actually have a landing page (avoid 404s).
  const cats = CATEGORIES.slice(0, 8);
  const brs = BRANDS.filter(b => validBrands.has(b.slug)).slice(0, 8);
  const list = ctx.isBrand ? cats : brs;
  const siblings = list.map(s => {
    const url = ctx.isBrand ? `/c/${s.slug}` : `/brand/${s.slug}`;
    return `<a href="${url}" class="inline-block bg-white border border-gray-200 hover:border-[#ff8c00] hover:text-[#ff8c00] px-3 py-1.5 rounded-[4px] text-[11px] font-bold mr-2 mb-2 transition">${esc(s.shortLabel)}</a>`;
  }).join('');
  return `
    <div class="mt-8 border-t pt-6">
      <h3 class="font-extrabold text-[13px] uppercase tracking-wider text-gray-800 mb-3">${ctx.isBrand ? 'Browse by category' : 'Browse by brand'}</h3>
      <div>${siblings}</div>
    </div>`;
}

/**
 * Bootstrap that activates the correct category/brand filter on load. We read
 * the pathname, map it to the existing data-cat-filter / brand filter, and
 * synthesize a click so the existing client-side grid renders the right set.
 * Brand filters work via an explicit allowlist of product IDs (deterministic,
 * no regex eval at runtime).
 */
function buildBootstrap(ctx, brandProductIdMap) {
  // Config is a JSON block (not executable); landing-bootstrap.js reads it at
  // runtime. This keeps all code in external files with CSP-friendly hashes.
  // Use absolute paths (Vercel serves from root) so the file resolves no
  // matter how many directory levels deep the landing page is.
  const cfg = {
    catSlug: ctx.isCategory ? ctx.slug : null,
    brandSlug: ctx.isBrand ? ctx.slug : null,
    brandLabels: Object.fromEntries(BRANDS.map(b => [b.slug, b.shortLabel])),
    brandIds: brandProductIdMap,
  };
  return `
<script type="application/json" id="landing-bootstrap-data">${JSON.stringify(cfg)}</script>
<script src="/assets/js/landing-bootstrap.js" defer></script>`;
}

function brandProductIds(products) {
  return products.map(p => p.id);
}

function renderPage(ctx, brandProductIdMap, validBrands) {
  // ctx: { urlPath, canonical, title, description, h1, keywords, products, shortLabel, isCategory, isBrand, terms, breadcrumbs }
  const { products } = ctx;
  const min = minPrice(products);
  const faqs = buildFAQs({ ...ctx, min, minPriceText: '' });
  const count = products.length;

  const metaKeywords = [...new Set([...ctx.terms, ...SITE_TERMS])].slice(0, 30).join(', ');

  // JSON-LD blocks:
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: ctx.breadcrumbs.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: ctx.h1,
    description: ctx.description,
    url: ctx.canonical,
    isPartOf: { '@type': 'WebSite', name: 'Valmont Gadgets', url: SITE + '/' },
    numberOfItems: count,
  };
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ctx.h1,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/#${p.id}`,
      name: p.name,
    })),
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  // Build <head>: start from the homepage head and swap tags.
  let head = TPL.headInner;
  head = setTitle(head, ctx.title);
  head = replaceMetaTag(head, 'description', ctx.description);
  head = setCanonical(head, ctx.canonical);
  ['og:title','og:description','og:url','og:image','twitter:title','twitter:description','twitter:image'].forEach(p => {
    if (/:title$/.test(p) || p === 'og:url') head = setOg(head, p, p === 'og:url' ? ctx.canonical : (/:title$/.test(p) ? ctx.title : ctx.description));
  });
  head = replaceMetaTag(head, 'keywords', metaKeywords);
  head = replaceJsonLd(head, [breadcrumbLd, collectionLd, itemListLd, faqLd]);

  // Keep the Store JSON-LD but remove per-product JSON-LD (we only show a grid,
  // not single products). The JsonLd replacement above already strips old
  // scripts; we re-add the Organization/Store block once.
  const storeLd = {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: 'Valmont Gadgets',
    url: SITE + '/',
    telephone: '+233542451578',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Accra',
      addressRegion: 'Greater Accra',
      addressCountry: 'GH',
    },
    priceRange: 'GH₵',
  };
  head = appendToHead(head, `<script type="application/ld+json">\n${JSON.stringify(storeLd, null, 2)}\n</script>`);

  const breadcrumbHtml = `
    <nav aria-label="Breadcrumb" class="max-w-[1184px] mx-auto px-4 mt-3 text-[11px] text-gray-500 font-semibold">
      <ol class="flex flex-wrap gap-1.5 items-center">
        ${ctx.breadcrumbs.map((b, i) => `
          <li class="flex items-center gap-1.5">
            ${i === ctx.breadcrumbs.length - 1
              ? `<span class="text-gray-800 font-bold" aria-current="page">${esc(b.name)}</span>`
              : `<a href="${b.url}" class="hover:text-[#ff8c00]">${esc(b.name)}</a><span aria-hidden="true">/</span>`}
          </li>`).join('')}
      </ol>
    </nav>`;

  const synonyms = [...new Set(ctx.terms)].slice(0, 12).map(t => `<span class="inline-block bg-orange-50 text-[#ff8c00] border border-orange-100 px-2 py-0.5 rounded text-[11px] font-bold mr-1 mb-1">${esc(t)}</span>`).join('');
  const sample = products.slice(0, 18).map(productCard).join('');
  const faqHtml = `
    <section class="mt-10 bg-white rounded-[4px] p-5 md:p-7 border border-gray-100 card-shadow" aria-labelledby="faq-heading">
      <h2 id="faq-heading" class="font-extrabold text-[16px] md:text-[18px] text-[#0b1a38] uppercase tracking-wider mb-1">Frequently asked questions</h2>
      <p class="text-[12px] text-gray-500 font-medium mb-4">Real answers about ${esc(ctx.shortLabel.toLowerCase())} from Valmont Gadgets.</p>
      <div class="space-y-3">
        ${faqs.map((f, i) => `
          <details class="border border-gray-200 rounded-[4px] open:border-[#ff8c00] group"${i === 0 ? ' open' : ''}>
            <summary class="cursor-pointer px-4 py-3 font-bold text-[13px] text-[#0b1a38] flex items-center justify-between hover:text-[#ff8c00]">
              <span>${esc(f.q)}</span>
              <span class="text-[#ff8c00] text-lg transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div class="px-4 pb-4 text-[13px] text-gray-700 leading-relaxed font-medium">${esc(f.a)}</div>
          </details>`).join('')}
      </div>
    </section>`;

  // Note: we deliberately do NOT duplicate the whole product grid statically
  // for each category — that's 70+ duplicated cards per page × ~25 pages and
  // would balloon the HTML. Instead we render 18 real sample cards (enough to
  // give crawlers real product content + prices) and let the existing JS grid
  // populate the full set client-side (it already renders the entire
  // catalogue from window.VALMONT_CATALOG on DOMContentLoaded). The bootstrap
  // script above auto-selects the filter once JS loads.

  const mainHtml = `
  <main class="max-w-[1200px] mx-auto px-4 py-4 md:py-6">
    ${breadcrumbHtml}
    <header class="bg-white rounded-[4px] border border-gray-100 p-5 md:p-7 card-shadow mb-5 mt-3">
      <span class="inline-block bg-[#ff8c00] text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-sm mb-3">Valmont Gadgets • Accra, Ghana</span>
      <h1 class="font-black text-[22px] md:text-[30px] leading-tight text-[#0b1a38] tracking-tight mb-2">${esc(ctx.h1)}</h1>
      <p class="text-[14px] text-gray-700 font-semibold leading-relaxed mb-3">${esc(ctx.description)}</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-black text-gray-500 uppercase tracking-wider mb-3">
        <span>${count} in stock now</span>
        <span aria-hidden="true">•</span>
        <span>Prices from ${Number.isFinite(min) && min < Infinity ? money(min) : 'GH₵ 90'}</span>
        <span aria-hidden="true">•</span>
        <span>Same-day Accra delivery</span>
        <span aria-hidden="true">•</span>
        <span>12-month warranty</span>
      </div>
      <div class="mt-2">
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#ff8c00] mb-1">Also searched as:</p>
        <div>${synonyms}</div>
      </div>
    </header>

    <section class="mb-5">
      ${bodyCopy(ctx)}
    </section>

    <section aria-label="Products in ${esc(ctx.shortLabel)}">
      <div class="flex items-center justify-between border-b pb-3 mb-4">
        <h2 class="font-extrabold text-[14px] uppercase tracking-wider text-gray-800">${esc(ctx.shortLabel)} in stock</h2>
        <span class="text-[11px] font-black text-gray-400 uppercase tracking-widest">${count} products</span>
      </div>
      <div class="product-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4" id="landingSampleGrid" data-landing-filter="${esc(ctx.slug)}" data-landing-kind="${ctx.isCategory ? 'category' : 'brand'}">
        ${sample}
      </div>
      <p class="text-[12px] text-gray-500 mt-3 font-medium">Showing a sample — the full catalogue of ${count} ${esc(ctx.shortLabel.toLowerCase())} loads below as you browse.</p>
    </section>

    ${faqHtml}
    ${siblingLinks(ctx, validBrands)}
    <div data-supplier-cta class="mt-8 bg-gradient-to-r from-[#128c7e] to-[#075e54] text-white rounded-[4px] px-4 py-4 md:px-5 md:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div class="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-7 h-7 shrink-0 fill-white mt-0.5" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 89.4-184.5 184.6-184.5 46 0 89.3 18 121.9 50.6 32.6 32.5 50.5 75.9 50.5 122.1-.1 101.8-94.9 184.5-184.6 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
        <div>
          <p class="font-black text-[13px] md:text-[15px] uppercase tracking-wider leading-tight mb-1">Own a phone or gadget shop? We supply ${esc(ctx.shortLabel)} in bulk.</p>
          <p class="text-[12px] md:text-[13px] font-medium text-white/95 leading-relaxed">Valmont supplies genuine sealed and UK-used ${esc(ctx.shortLabel.toLowerCase())} to resellers across Accra, Kumasi, Takoradi and nationwide — carton and half-carton pricing, same-day pickup from our Accra warehouse, warranty on every unit, consistent restocks and no-minimum orders for small shops starting out. Chat Daniel directly on WhatsApp for your dealer price list.</p>
        </div>
      </div>
      <a href="https://wa.me/233542451578?text=${encodeURIComponent(`Hi Valmont, I run a phone/gadget shop and I'd like to stock ${ctx.shortLabel} from you. Can I get your wholesale price list?`)}" target="_blank" rel="noopener" class="shrink-0 inline-flex items-center gap-2 bg-white text-[#075e54] font-black text-[12px] md:text-[13px] tracking-wider uppercase px-5 py-3 rounded-[4px] hover:bg-[#25d366] hover:text-white transition shadow-md">
        WhatsApp Valmont
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </main>`;

  // Script tag ordering must match index.html. We keep CSS <link>s, icon
  // sprite and header chrome from the homepage, inject our own <main>, then
  // append footer + scripts + bootstrap.
  const cssLinks = (homepage.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/g) || []).join('\n');
  const otherHeadLinks = (homepage.match(/<link[^>]+rel=["'](?:icon|apple-touch-icon|manifest|preconnect)[^>]*>/g) || []).join('\n');
  const metaEquiv = (homepage.match(/<meta\s+(?:http-equiv|name)=["'](?:X-Content-Type|X-Frame|X-XSS|Referrer-Policy|theme-color|mobile-web-app-capable|apple-mobile-web-app|viewport|ga-measurement|meta-pixel)[^>]*>/g) || []).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8">
  <base href="/">
  ${metaEquiv}
  ${head}
  ${otherHeadLinks}
  ${cssLinks}
</head>${TPL.bodyStartTag}
  <svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true" focusable="false">
    <symbol id="i-star" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"></path></symbol>
  </svg>
  <div class="bg-[#0b1a38] text-white py-2 px-4 text-center hidden md:block">
    <p class="text-[10px] md:text-[11px] font-extrabold tracking-[0.12em] uppercase">
      GENUINE PHONES &amp; LAPTOPS WITH 12-MONTH WARRANTY • FREE ACCRA DELIVERY ABOVE GH₵ 5,000!
    </p>
  </div>
  ${TPL.bodyHeader.split('<body').slice(1).join('<body').replace(/^[^>]*>/, '')}
  ${mainHtml}
  ${FOOTER_HTML}
  ${SCRIPT_TAGS.join('\n')}
  ${buildBootstrap(ctx, brandProductIdMap || {})}
</body></html>`;
  return html;
}

function writePage(ctx, brandProductIdMap, validBrands) {
  const outDir = path.join(ROOT, ctx.fsDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), renderPage(ctx, brandProductIdMap, validBrands));
}

// Pre-compute brand product ID map for the client bootstrap.
const BRAND_PRODUCT_IDS = {};
for (const b of BRANDS) {
  BRAND_PRODUCT_IDS[b.slug] = PRODUCTS.filter(p => {
    try { return b.match(p); } catch (e) { return false; }
  }).map(p => p.id);
}

// Determine which brands qualify for a landing page (>=2 products).
// We pre-compute this set so sibling-links don't link to 404 thin pages.
const VALID_BRANDS = new Set();
for (const b of BRANDS) {
  const count = PRODUCTS.filter(p => { try { return b.match(p); } catch(e) { return false; } }).length;
  if (count >= 2) VALID_BRANDS.add(b.slug);
}

// ── Generate category pages ─────────────────────────────────────────────────
const generated = [];
for (const c of CATEGORIES) {
  const products = PRODUCTS.filter(p => p.category === c.slug);
  if (products.length === 0) {
    console.log(`Skipping category ${c.slug} (no products)`);
    continue;
  }
  const min = minPrice(products);
  const title = `${c.shortLabel} in Ghana — buy genuine ${c.terms.slice(1,4).join(', ')} | from ${money(min)} | Valmont Gadgets`;
  const description = `Shop ${products.length} genuine ${c.shortLabel.toLowerCase()} at Valmont Gadgets, Accra. Prices from ${money(min)}. Sealed and UK-used options, 12-month warranty, same-day Accra delivery, MoMo accepted.`;
  writePage({
    fsDir: path.join('c', c.slug),
    urlPath: `/c/${c.slug}`,
    canonical: `${SITE}/c/${c.slug}`,
    title,
    description,
    h1: c.h1,
    shortLabel: c.shortLabel,
    terms: c.terms,
    slug: c.slug,
    isCategory: true,
    isBrand: false,
    products,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/#store-feed' },
      { name: c.shortLabel, url: `/c/${c.slug}` },
    ],
  }, BRAND_PRODUCT_IDS, VALID_BRANDS);
  generated.push({ kind: 'category', slug: c.slug, url: `/c/${c.slug}`, count: products.length, priority: 0.85 });
}

// ── Generate brand pages ────────────────────────────────────────────────────
for (const b of BRANDS) {
  const products = PRODUCTS.filter(p => {
    try { return b.match(p); } catch(e) { return false; }
  });
  if (products.length < 2) {
    console.log(`Skipping brand ${b.slug} (only ${products.length} products)`);
    continue;
  }
  const min = minPrice(products);
  const title = `${b.shortLabel} in Ghana — genuine ${b.terms.slice(1,3).join(', ')} | from ${money(min)} | Valmont Gadgets`;
  const description = `Shop ${products.length} genuine ${b.shortLabel} products at Valmont Gadgets, Accra. Prices from ${money(min)}. Sealed with 12-month warranty, same-day Accra delivery, MoMo and card payments.`;
  writePage({
    fsDir: path.join('brand', b.slug),
    urlPath: `/brand/${b.slug}`,
    canonical: `${SITE}/brand/${b.slug}`,
    title,
    description,
    h1: b.h1,
    shortLabel: b.shortLabel,
    terms: b.terms,
    slug: b.slug,
    isCategory: false,
    isBrand: true,
    products,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Brands', url: '/#store-feed' },
      { name: b.shortLabel, url: `/brand/${b.slug}` },
    ],
  }, BRAND_PRODUCT_IDS, VALID_BRANDS);
  generated.push({ kind: 'brand', slug: b.slug, url: `/brand/${b.slug}`, count: products.length, priority: 0.8 });
}

// ── Service pages — tighten titles/descriptions on existing HTML files ───────
// (Leave the HTML mostly as-is; just rewrite their <title>, meta description
// and canonical so they don't get overlooked.)
const serviceMeta = {
  'used.html': {
    title: 'UK & US Used Phones in Ghana — graded, battery health shown | Valmont Gadgets',
    description: 'Shop Grade A UK and US used iPhones, Samsung and more at Valmont Gadgets, Accra. Every phone is graded, battery health listed, comes with 6-month store warranty. Swaps accepted.',
    url: '/used.html',
  },
  'swap.html': {
    title: 'Phone Swap & Trade-In in Accra, Ghana — cash in 10 minutes | Valmont Gadgets',
    description: 'Trade in your old iPhone or Samsung at Valmont Gadgets. We grade it at the counter in 10 minutes and knock the value off your new phone. Sealed and UK-used swaps accepted.',
    url: '/swap.html',
  },
  'drop.html': {
    title: "Today's Drop — 3 cards, 1 golden hidden | Valmont Gadgets",
    description: 'Flip one card a day for real discounts on phones, accessories and gadgets at Valmont Gadgets. One golden card hidden each day. Accra, Ghana.',
    url: '/drop.html',
  },
  'partner.html': {
    title: 'Dealer & Wholesale Portal — buy phones in bulk, Accra Ghana | Valmont Gadgets',
    description: 'Apply for a Valmont Gadgets dealer account. Buy phones and accessories by the carton at wholesale prices, pick up in Accra. For approved resellers in Ghana only.',
    url: '/partner.html',
  },
};
for (const [file, meta] of Object.entries(serviceMeta)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  let html = fs.readFileSync(fp, 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(meta.title)}</title>`);
  const descRe = /<meta\s+name=["']description["'][^>]*>/i;
  const descTag = `<meta name="description" content="${esc(meta.description)}">`;
  html = descRe.test(html) ? html.replace(descRe, descTag) : html.replace('</head>', descTag + '\n</head>');
  const canonRe = /<link\s+rel=["']canonical["'][^>]*>/i;
  const canonTag = `<link rel="canonical" href="${SITE}${meta.url}">`;
  html = canonRe.test(html) ? html.replace(canonRe, canonTag) : html.replace('</head>', canonTag + '\n</head>');
  fs.writeFileSync(fp, html);
  generated.push({ kind: 'service', slug: file, url: meta.url, priority: file === 'used.html' ? 0.9 : 0.7 });
}

// ── Tighten the homepage title to lead with the money keyword ───────────────
const homeFile = path.join(ROOT, 'index.html');
let homeHtml = fs.readFileSync(homeFile, 'utf8');
const newHomeTitle = 'Phones, Laptops & Electronics in Ghana — genuine iPhones, Samsung, AirPods | Valmont Gadgets';
const newHomeDesc = 'Shop genuine phones, executive laptops and electronics in Ghana at Valmont Gadgets. iPhones, Samsung, MacBooks, AirPods and accessories — 12-month warranty, same-day Accra delivery, MoMo accepted.';
homeHtml = homeHtml.replace(/<title>[^<]*<\/title>/i, `<title>${esc(newHomeTitle)}</title>`);
homeHtml = homeHtml.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(newHomeDesc)}">`);
['og:title','og:description','twitter:title','twitter:description'].forEach(p => {
  homeHtml = homeHtml.replace(new RegExp(`<meta\\s+property=["']${p}["'][^>]*>`, 'i'), `<meta property="${p}" content="${esc(/title/.test(p) ? newHomeTitle : newHomeDesc)}">`);
});
fs.writeFileSync(homeFile, homeHtml);

// Write a manifest so the sitemap generator picks up the new URLs.
const manifest = { generated, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(ROOT, 'src/data/generated-pages.json'), JSON.stringify(manifest, null, 2));

console.log(`Generated ${generated.length} landing pages.`);
generated.forEach(g => console.log(`  ${g.kind.padEnd(9)} ${g.url}  (${g.count || '-'} items)`));
