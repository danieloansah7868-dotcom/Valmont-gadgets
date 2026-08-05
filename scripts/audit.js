#!/usr/bin/env node
/**
 * Static SEO / accessibility / performance audit against the success criteria.
 * Usage: node scripts/audit.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(ROOT, f))).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

let pass = 0;
let fail = 0;
const check = (ok, label, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const html = read('index.html');
const dom = new JSDOM(html, { url: 'https://valmontgadgets.com/' });
const d = dom.window.document;
const q = (s) => d.querySelector(s);
const qa = (s) => Array.from(d.querySelectorAll(s));

console.log('\n── SEO ──');
const h1s = qa('h1');
check(h1s.length === 1, 'exactly one <h1>', `${h1s.length} found`);
check(!!q('meta[name="description"]'), 'meta description');
check(!!q('link[rel="canonical"]'), 'canonical', q('link[rel="canonical"]')?.href);
for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:site_name', 'og:locale', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
  check(!!q(`meta[property="${p}"]`), p);
}
for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
  check(!!q(`meta[name="${n}"]`), n);
}

const lds = qa('script[type="application/ld+json"]').map((s) => {
  try { return JSON.parse(s.textContent); } catch (e) { return { __bad: e.message }; }
});
check(!lds.some((l) => l.__bad), 'all JSON-LD parses', lds.find((l) => l.__bad)?.__bad || 'ok');
check(lds.some((l) => l['@type'] === 'Store'), 'Store JSON-LD');
const graph = lds.find((l) => Array.isArray(l['@graph']));
const products = graph ? graph['@graph'].filter((n) => n['@type'] === 'Product') : [];
check(products.length > 0, 'Product JSON-LD', `${products.length} products`);
check(products.every((p) => p.offers && p.offers.price && p.offers.priceCurrency === 'GHS' && p.offers.availability),
  'every Product has offers/price/GHS/availability');

console.log('\n── Crawlable content ──');
const cards = qa('#productGrid > div');
check(cards.length >= 20, 'product cards in static HTML', `${cards.length} cards`);
check(/GH₵/.test(q('#productGrid').textContent), 'prices present in static HTML');

console.log('\n── Files ──');
for (const f of ['robots.txt', 'sitemap.xml', 'vercel.json']) {
  check(fs.existsSync(path.join(ROOT, f)), f);
}
const sm = read('sitemap.xml');
check(sm.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'sitemap namespace');
check(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sm), 'lastmod YYYY-MM-DD');
check(!/valmont-gadgets2?\.vercel\.app/.test(sm + read('robots.txt')), 'sitemap/robots use production domain');

console.log('\n── Assets ──');
check(!/cdn\.tailwindcss\.com/.test(html), 'no Tailwind CDN in index.html');
const cdnPages = ['account.html', 'admin.html', 'admin-login.html'].filter((f) => /cdn\.tailwindcss\.com/.test(read(f)));
check(cdnPages.length === 0, 'no Tailwind CDN on any page', cdnPages.join(', ') || 'clean');
check(gz('tailwind.min.css') < 15 * 1024, 'tailwind CSS < 15 KB gzipped', `${kb(size('tailwind.min.css'))} raw / ${kb(gz('tailwind.min.css'))} gz`);
check(!/<script>[^<]{500,}/.test(html), 'no large inline <script> block');
const deferred = qa('script[src]').filter((s) => s.defer || s.async);
check(qa('script[src]').length === deferred.length, 'all external scripts defer/async');
check(!/js\.paystack\.co/.test(html), 'Paystack not eagerly loaded in HTML');
check(/loadPaystackScript/.test(read('shop.min.js')), 'Paystack lazy-loader present in bundle');
const clientSurfaces = ['app.js', 'shop.min.js', 'index.html', 'order-confirmed.html', 'account.html', 'drop.html', 'assets/js/gadgets.js', 'assets/js/admin.js', 'assets/js/account.js', 'assets/js/analytics.js']
  .filter((f) => fs.existsSync(path.join(ROOT, f)))
  .map((f) => read(f));
const clientBlob = clientSurfaces.join('\n');
check(!/(sk_live_|sk_test_|pk_live_|pk_test_)[A-Za-z0-9]+/.test(clientBlob), 'no Paystack keys in any browser bundle');
check(!/VALMONTPAY_(SECRET|WEBHOOK)_KEY\s*[:=]\s*['"][^'"]+['"]/.test(clientBlob), 'no inline Valmont-Pay secret values in browser bundles');
check(!/Bearer\s+\$?\{?process\.env\.VALMONTPAY/.test(clientBlob), 'no server-side tenant auth in browser bundles');
check(/\/api\/valmontpay\/initialize/.test(read('app.js')), 'checkout goes through server-side /api/valmontpay/initialize');
check(!/pay\.html\?[^'"]*amount=/.test(read('app.js')), 'no client-built amount-in-URL gateway links in app.js');
// Budget raised 30→32 KB when shop.min.js was re-synced with app.js: the old
// artifact was stale (terser had been failing on a duplicate-const SyntaxError
// in app.js) and the secure Valmont-Pay checkout adds ~1 KB gz on top.
check(gz('shop.min.js') < 32 * 1024, 'JS bundle gzipped', `${kb(size('shop.min.js'))} raw / ${kb(gz('shop.min.js'))} gz`);
check(size('index.html') > 0, 'index.html size', `${kb(size('index.html'))} raw / ${kb(gz('index.html'))} gz`);

const uploads = fs.readdirSync(path.join(ROOT, 'uploads'));
const biggest = uploads
  .map((f) => ({ f, s: fs.statSync(path.join(ROOT, 'uploads', f)).size }))
  .sort((a, b) => b.s - a.s)[0];
check(biggest.s < 80 * 1024, 'largest image < 80 KB', `${biggest.f} = ${kb(biggest.s)}`);

console.log('\n── Images ──');
const imgs = qa('img');
check(imgs.every((i) => i.hasAttribute('alt')), 'every <img> has alt',
  imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')).join(', ') || 'all present');
check(imgs.every((i) => i.hasAttribute('width') && i.hasAttribute('height')), 'every <img> has width/height');
const lazy = imgs.filter((i) => i.getAttribute('loading') === 'lazy');
check(lazy.length > 0, 'lazy-loaded images', `${lazy.length}/${imgs.length}`);
const hero = q('img[fetchpriority="high"]');
check(!!hero && hero.getAttribute('loading') !== 'lazy', 'LCP image fetchpriority=high and not lazy');
check(qa('picture source[type="image/webp"]').length > 0, 'WebP served via <picture>',
  `${qa('picture source[type="image/webp"]').length} sources`);
check(qa('img[srcset], picture source[srcset]').length > 0, 'srcset present');

console.log('\n── Accessibility ──');
const levels = qa('h1,h2,h3,h4,h5,h6').map((h) => Number(h.tagName[1]));
let skips = [];
for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) skips.push(`${levels[i - 1]}→${levels[i]}`);
check(skips.length === 0, 'no skipped heading levels', skips.slice(0, 5).join(', ') || 'clean');
const dialogs = qa('[role="dialog"]');
check(dialogs.length > 0, 'modals use role="dialog"', `${dialogs.length}`);
check(dialogs.every((x) => x.getAttribute('aria-modal') === 'true'), 'dialogs have aria-modal');
check(dialogs.every((x) => x.hasAttribute('aria-label') || x.hasAttribute('aria-labelledby')), 'dialogs are labelled');
const bad = qa('input:not([type=hidden]),select,textarea').filter((el) => {
  if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
  if (el.id && d.querySelector(`label[for="${el.id}"]`)) return false;
  return !el.closest('label');
});
check(bad.length === 0, 'form controls labelled', bad.map((b) => b.id || b.name || b.type).join(', ') || 'all labelled');
const btns = qa('button').filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label'));
check(btns.length === 0, 'buttons have accessible names', `${btns.length} unnamed`);
check(/:focus-visible/.test(read('mobile-fixes.css')) || /:focus-visible/.test(html), 'visible focus ring defined');
check(/Escape/.test(read('shop.min.js')), 'Escape-to-close wired');
// Tab-cycling focus trap lives in the keydown handler at the top of app.js.
check(/shiftKey/.test(read('shop.min.js')) && /"Tab"|'Tab'/.test(read('shop.min.js')),
  'focus trap (Tab cycling) present');

console.log(`\n${fail === 0 ? '✅' : '⚠️ '} ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
