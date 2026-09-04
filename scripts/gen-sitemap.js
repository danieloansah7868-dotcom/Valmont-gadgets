#!/usr/bin/env node
/**
 * Generates sitemap.xml from the live category/brand/service list.
 *
 * Important rule: every <loc> in this file must be byte-identical to the
 * page's own self-referencing canonical. Query-string URLs (/?category=...)
 * are deliberately NOT listed — they canonicalise back to the homepage and
 * would show up in Search Console as "submitted URL marked noindex".
 * Real landing pages live at /c/<slug>/ and /brand/<slug>/.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://valmontgadgets.com';
const outputPath = path.resolve(ROOT, process.argv[2] || 'sitemap.xml');
const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
const existingDate = existing.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
const lastmod = process.env.SITEMAP_LASTMOD || existingDate || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
  throw new Error('SITEMAP_LASTMOD must use YYYY-MM-DD');
}

// Read the keyword module to discover categories and brands.
// We rely on generated-pages.json (written by build-landing-pages.js) so that
// the sitemap only lists landing pages that were actually emitted — that way
// thin brands with <2 products don't end up as 404s in Search Console.
let categories = [], brands = [];
try {
  // eslint-disable-next-line global-require
  const manifest = require(path.join(ROOT, 'src/data/generated-pages.json'));
  categories = manifest.generated.filter(g => g.kind === 'category').map(g => g.slug);
  brands = manifest.generated.filter(g => g.kind === 'brand').map(g => g.slug);
} catch (e) {
  console.warn('gen-sitemap: failed to load generated-pages.json, falling back to keywords list:', e.message);
  try {
    // eslint-disable-next-line global-require
    const kw = require(path.join(ROOT, 'src/data/keywords.js'));
    categories = kw.CATEGORIES.map(c => c.slug);
    brands = kw.BRANDS.map(b => b.slug);
  } catch (e2) {
    console.warn('gen-sitemap: failed to load keywords module, falling back to hardcoded list:', e2.message);
    categories = ['iphones','samsung','android','tablets','smartwatches','laptops','laptop_acc','audio','gaming','phone_acc','phone_parts','travel_acc','chargers','smart_home','networking','cameras'];
    brands = [];
  }
}

let services = [
  { loc: `${SITE}/used.html`,      priority: '0.9', changefreq: 'daily'   },
  { loc: `${SITE}/swap.html`,      priority: '0.8', changefreq: 'weekly'  },
  { loc: `${SITE}/drop.html`,      priority: '0.7', changefreq: 'daily'   },
  { loc: `${SITE}/partner.html`,   priority: '0.6', changefreq: 'monthly' },
  { loc: `${SITE}/review-google.html`, priority: '0.3', changefreq: 'monthly' },
];
try {
  // eslint-disable-next-line global-require
  const manifest = require(path.join(ROOT, 'src/data/generated-pages.json'));
  const fromManifest = manifest.generated.filter(g => g.kind === 'service');
  if (fromManifest.length) {
    services = fromManifest.map(g => ({
      loc: `${SITE}${g.url}`,
      priority: String(g.priority || 0.7),
      changefreq: g.slug === 'used.html' ? 'daily' : g.slug === 'drop.html' ? 'daily' : 'weekly',
    }));
  }
} catch (_) { /* keep fallback list */ }

const urls = [
  { loc: `${SITE}/`,                    priority: '1.0', changefreq: 'daily'   },

  // Category landing pages (the "money" pages — highest non-home priority).
  ...categories.map((c) => ({
    loc: `${SITE}/c/${c}`,
    priority: '0.9',
    changefreq: 'weekly',
  })),

  // Brand landing pages.
  ...brands.map((b) => ({
    loc: `${SITE}/brand/${b}`,
    priority: '0.8',
    changefreq: 'weekly',
  })),

  // Service / destination pages.
  ...services,
];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
    )
    .join('\n') +
  `\n</urlset>\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, xml);
console.log(`Wrote ${path.relative(ROOT, outputPath)} with ${urls.length} URLs (lastmod ${lastmod})`);
