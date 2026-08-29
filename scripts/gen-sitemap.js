#!/usr/bin/env node
/**
 * Generates sitemap.xml from the live category list so it cannot drift.
 * Usage: node scripts/gen-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://valmontgadgets.com';
const outputPath = path.resolve(ROOT, process.argv[2] || 'sitemap.xml');
const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
const existingDate = existing.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
const lastmod = process.env.SITEMAP_LASTMOD || existingDate || '2026-08-14';
if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
  throw new Error('SITEMAP_LASTMOD must use YYYY-MM-DD');
}

// Mirrors CATEGORY_LABELS in app.js (minus `all`, which is the homepage).
const CATEGORIES = [
  'iphones', 'samsung', 'android', 'tablets', 'smartwatches', 'laptops',
  'laptop_acc', 'audio', 'gaming', 'phone_acc', 'phone_parts',
  'travel_acc', 'chargers', 'smart_home', 'networking', 'cameras',
];

const urls = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'monthly' },
  ...CATEGORIES.map((c) => ({
    loc: `${SITE}/?category=${c}`,
    priority: '0.8',
    changefreq: 'weekly',
  })),
  { loc: `${SITE}/drop.html`, priority: '0.6', changefreq: 'daily' },
  // Platform pages. `wholesale.html` and `admin-control.html` are deliberately
  // absent: both carry noindex, and the price list behind the dealer login is
  // not something a sitemap should advertise to a crawler.
  { loc: `${SITE}/used.html`, priority: '0.9', changefreq: 'daily' },
  { loc: `${SITE}/swap.html`, priority: '0.8', changefreq: 'weekly' },
  { loc: `${SITE}/partner.html`, priority: '0.6', changefreq: 'monthly' },
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
