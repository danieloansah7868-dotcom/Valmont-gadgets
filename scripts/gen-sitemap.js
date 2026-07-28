#!/usr/bin/env node
/**
 * Generates sitemap.xml from the live category list so it cannot drift.
 * Usage: node scripts/gen-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://valmontgadgets.com';
const today = new Date().toISOString().slice(0, 10);

// Mirrors CATEGORY_LABELS in app.js (minus `all`, which is the homepage).
const CATEGORIES = [
  'iphones', 'samsung', 'android', 'tablets', 'smartwatches', 'laptops',
  'laptop_acc', 'audio', 'gaming', 'phone_acc', 'phone_parts',
  'travel_acc', 'chargers',
];

const urls = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'monthly' },
  ...CATEGORIES.map((c) => ({
    loc: `${SITE}/?category=${c}`,
    priority: '0.8',
    changefreq: 'weekly',
  })),
  { loc: `${SITE}/account.html`, priority: '0.3', changefreq: 'yearly' },
];

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
    )
    .join('\n') +
  `\n</urlset>\n`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`Wrote sitemap.xml with ${urls.length} URLs (lastmod ${today})`);
