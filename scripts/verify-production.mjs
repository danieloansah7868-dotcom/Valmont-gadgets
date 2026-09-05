#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public');
const sha256 = (value) => createHash('sha256').update(value).digest('base64');

async function filesBelow(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesBelow(full));
    else result.push(full);
  }
  return result.sort();
}

async function treeDigest(directory) {
  const hash = createHash('sha256');
  for (const file of await filesBelow(directory)) {
    hash.update(relative(directory, file));
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
}

const vercel = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
assert.equal(vercel.outputDirectory, 'public', 'Vercel must publish only the allowlisted artifact');
const catchAll = vercel.headers.find(rule => rule.source === '/(.*)');
assert.ok(catchAll, 'catch-all security headers are required');
const headers = Object.fromEntries(catchAll.headers.map(({ key, value }) => [key.toLowerCase(), value]));
for (const name of [
  'content-security-policy', 'strict-transport-security', 'x-content-type-options',
  'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy',
]) assert.ok(headers[name], `missing ${name}`);
const csp = headers['content-security-policy'];
assert.match(csp, /script-src 'self'/);
assert.match(csp, /script-src-attr 'none'/);
assert.doesNotMatch(csp.match(/script-src [^;]+/)?.[0] || '', /'unsafe-inline'|'unsafe-eval'|\shttps:\s/);
assert.match(csp, /object-src 'none'/);
assert.match(csp, /frame-ancestors 'none'/);
assert.doesNotMatch(csp, /(?:^|\s)\*(?:\s|;|$)|\*\./, 'CSP must not contain wildcard sources');
const connectSources = (csp.match(/(?:^|;)\s*connect-src\s+([^;]+)/)?.[1] || '').trim().split(/\s+/);
const expectedConnectSources = new Set([
  "'self'",
  'https://eydsoqnpetqczaeqrscc.supabase.co',
  'wss://eydsoqnpetqczaeqrscc.supabase.co',
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://region1.google-analytics.com',
  'https://www.facebook.com',
]);
assert.deepEqual(new Set(connectSources), expectedConnectSources, 'connect-src must stay on the reviewed origin allowlist');

const immutableRule = vercel.headers.find(rule => rule.source === '/assets/build/(.*)');
assert.match(immutableRule?.headers?.find(header => header.key === 'Cache-Control')?.value || '', /immutable/);
for (const rule of vercel.headers.filter(rule => rule.source !== '/assets/build/(.*)')) {
  const cache = rule.headers.find(header => header.key === 'Cache-Control')?.value || '';
  assert.doesNotMatch(cache, /immutable/, `only fingerprinted assets may be immutable: ${rule.source}`);
}

const pageNames = [
  'index.html', 'account.html', 'admin.html', 'admin-login.html',
  'admin-drop.html', 'drop.html', 'order-confirmed.html',
  'swap.html', 'used.html', 'wholesale.html', 'partner.html', 'admin-control.html',
];
// Each platform page must load the reviewed runtime in dependency order from
// the fingerprinted bundles; a page that quietly drops db-adapter.js would fall
// back to no data at all, which is exactly how a "working" demo ships broken.
const platformRuntimes = {
  'swap.html': ['security', 'supabase-client', 'db-adapter', 'swap-page', 'valmontai'],
  'used.html': ['security', 'supabase-client', 'db-adapter', 'used-page', 'valmontai'],
  'wholesale.html': ['security', 'supabase-client', 'db-adapter', 'wholesale-page', 'valmontai'],
  'partner.html': ['security', 'supabase-client', 'db-adapter', 'partner-page', 'valmontai'],
  'admin-control.html': ['security', 'supabase-client', 'admin-control-page'],
};
for (const page of pageNames) {
  const source = await readFile(join(OUT, page), 'utf8');
  const document = new JSDOM(source).window.document;
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of element.getAttributeNames()) {
      assert.ok(!/^on/i.test(attribute), `${page} contains executable ${attribute}`);
    }
  }
  // Data blocks (application/ld+json structured data, application/json
  // landing config) are NOT executed as script, so script-src CSP never
  // applies to them — skip hashing/checking them. This mirrors the exact
  // exemption build-production.mjs already uses. Anything else inline is
  // real JavaScript: with script-src 'self' it is blocked, and CSP forbids
  // 'unsafe-inline', so fail the build rather than ship a dead inline script.
  for (const script of document.querySelectorAll('script:not([src])')) {
    if (script.type === 'application/ld+json' || script.type === 'application/json') continue;
    if (!script.type || script.type === 'text/javascript' || script.type === 'module') {
      assert.fail(`${page} contains executable inline JavaScript (type="${script.type || 'text/javascript'}"), which CSP blocks`);
    }
  }
  for (const asset of document.querySelectorAll('script[src],link[rel="stylesheet"][href]')) {
    const ref = asset.getAttribute(asset.hasAttribute('src') ? 'src' : 'href');
    if (/^https?:/.test(ref)) continue;
    assert.match(ref, /^\/assets\/build\/[a-z0-9.-]+\.[a-f0-9]{16}\.(?:js|css)$/i, `${page}: asset is not fingerprinted: ${ref}`);
  }
  assert.ok(!source.includes('cdn.jsdelivr.net/npm/@supabase'), `${page}: unpinned CDN SDK`);
  // No credential, secret or raw-identity column may be shipped to a browser.
  for (const leak of ['valmont2026', 'ADMIN_USER', 'password_hash', 'face_photo_url', 'ghana_card:']) {
    assert.ok(!source.includes(leak), `${page}: ships ${leak}`);
  }
  const runtime = platformRuntimes[page];
  if (runtime) {
    const refs = [...document.querySelectorAll('script[src]')];
    assert.equal(refs.length, runtime.length, `${page}: unexpected script tag count`);
    const stems = refs.map((node) => (node.getAttribute('src') || '').match(/^\/assets\/build\/([a-z-]+)\.[a-f0-9]{16}\.js$/)?.[1]);
    assert.deepEqual(stems, runtime, `${page}: runtime scripts missing, extra or out of order`);
  }
}

const artifactFiles = await filesBelow(OUT);
for (const file of artifactFiles) {
  const rel = relative(OUT, file);
  assert.ok(!/^(?:preview(?:-|\/)|scripts?\/|supabase\/|docs?\/)/i.test(rel), `non-production path published: ${rel}`);
  assert.ok(!['.sql', '.map', '.md'].includes(extname(file)), `non-production file published: ${rel}`);
}
for (const forbidden of ['app.js', 'shop.min.js', 'package.json', 'README.md', 'SETUP_ALL_IN_ONE.txt']) {
  assert.ok(!artifactFiles.some(file => relative(OUT, file) === forbidden), `published forbidden file: ${forbidden}`);
}

const assetManifest = JSON.parse(await readFile(join(OUT, 'asset-manifest.json'), 'utf8'));
assert.match(assetManifest['app.js'], /^\/assets\/build\/app\.[a-f0-9]{16}\.js$/);
assert.match(assetManifest['assets/js/catalog.min.js'], /^\/assets\/build\/catalog\.[a-f0-9]{16}\.js$/);
const publicCatalogBundle = await readFile(join(OUT, assetManifest['assets/js/catalog.min.js']), 'utf8');
assert.doesNotMatch(
  publicCatalogBundle,
  /\b(?:wholesale|wholesale_price|deliveryCost|paymentCost)\s*:/,
  'public artifact contains private catalog costs',
);
for (const outputRef of Object.values(assetManifest)) {
  const bytes = await readFile(join(OUT, outputRef));
  const encoded = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  assert.ok(outputRef.includes(`.${encoded}.`), `incorrect asset fingerprint: ${outputRef}`);
}

const serviceWorker = await readFile(join(OUT, 'sw.js'), 'utf8');
assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/, 'service worker must bypass APIs');
assert.match(serviceWorker, /startsWith\('\/assets\/build\/'\)/, 'cache-first is limited to fingerprinted assets');
// Manual, hand-bumped integer cache versions (e.g. "valmont-v3") are
// forbidden: the cache version must be derived from the precache content so
// a changed bundle invalidates old caches automatically. The generated SW
// uses `valmont-v2-<content-hash>` — the `v2-` prefix is the hard-reset
// generation marker and the trailing hex hash is the real, content-derived
// version — so forbid only a bare integer version (no hash suffix).
assert.match(
  serviceWorker,
  /const\s+CACHE_NAME\s*=\s*['"]valmont-v\d+-[0-9a-f]{16}['"]/,
  'service worker cache version must be a content-derived hash',
);
assert.doesNotMatch(
  serviceWorker,
  /CACHE_NAME\s*=\s*['"]valmont-v\d+['"]/,
  'manual service-worker versions are forbidden',
);

const sitemap = await readFile(join(OUT, 'sitemap.xml'), 'utf8');
assert.ok(!sitemap.includes('/account.html'), 'noindex account page must not be in sitemap');
assert.ok(sitemap.includes('/drop.html'), 'public Daily Drop should be in sitemap');
for (const page of ['used.html', 'swap.html', 'partner.html']) {
  assert.ok(sitemap.includes(`/${page}`), `${page} is indexable and belongs in the sitemap`);
}
for (const page of ['wholesale.html', 'admin-control.html']) {
  assert.ok(!sitemap.includes(`/${page}`), `${page} is noindex and must not be in the sitemap`);
}
assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);

// A second artifact build with identical inputs must be byte-for-byte stable.
const before = await treeDigest(OUT);
execFileSync(process.execPath, [join(ROOT, 'scripts/build-production.mjs')], { cwd: ROOT, stdio: 'ignore' });
const after = await treeDigest(OUT);
assert.equal(after, before, 'production artifact is not deterministic');

const totalBytes = (await Promise.all(artifactFiles.map(file => stat(file)))).reduce((sum, item) => sum + item.size, 0);
console.log(`✓ production artifact verified (${artifactFiles.length} files, ${totalBytes} bytes)`);
console.log('✓ strict CSP, fingerprints, cache policy, allowlist, and deterministic rebuild');
