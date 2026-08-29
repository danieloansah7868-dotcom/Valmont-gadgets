#!/usr/bin/env node
/**
 * One-pass deep site audit (static crawl). Feeds the findings table.
 * Usage: node scripts/deep-audit.js [--json]
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));

const PAGES = [
  'index.html', 'order-confirmed.html', 'account.html', 'drop.html',
  'admin.html', 'admin-login.html', 'admin-drop.html',
  'swap.html', 'used.html', 'wholesale.html', 'partner.html', 'admin-control.html',
];
const findings = [];
const add = (sev, where, issue, detail = '') => findings.push({ sev, where, issue, detail });

// ── 1. asset references ─────────────────────────────────────────────────────
for (const page of PAGES) {
  if (!exists(page)) { add('high', page, 'page missing'); continue; }
  const html = read(page);
  const dom = new JSDOM(html, { url: `https://valmontgadgets.com/${page}` });
  const d = dom.window.document;

  for (const el of d.querySelectorAll('script[src], link[href], img[src], source[srcset], a[href]')) {
    let refs = [];
    if (el.tagName === 'SOURCE') {
      refs = (el.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/)[0]);
    } else {
      refs = [el.getAttribute(el.tagName === 'LINK' ? 'href' : el.tagName === 'A' ? 'href' : 'src')];
    }
    for (let ref of refs) {
      if (!ref) continue;
      if (/^(https?:|data:|mailto:|tel:|wa\.me|#|javascript:)/.test(ref)) continue;
      if (ref.startsWith('//')) continue;
      const clean = ref.split('?')[0].replace(/^\//, '');
      if (clean === '' ) continue;
      if (!exists(clean)) add('high', `${page}`, `broken local ref: ${ref}`, el.tagName.toLowerCase());
    }
  }

  // img hygiene
  for (const img of d.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) add('medium', page, `img missing alt: ${img.getAttribute('src')}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) add('low', page, `img missing width/height: ${(img.getAttribute('src') || '').slice(0, 60)}`);
  }

  // inline handlers → function existence (page scripts only)
  const pageScripts = [...d.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n');
  const externalNames = new Set();
  for (const s of d.querySelectorAll('script[src]')) {
    const src = s.getAttribute('src') || '';
    if (!/^https?:/.test(src) && exists(src)) externalNames.add(read(src));
  }
  const allJs = pageScripts + '\n' + [...externalNames].join('\n');
  for (const el of d.querySelectorAll('[onclick],[onchange],[onsubmit],[oninput],[onerror]')) {
    for (const attr of ['onclick', 'onchange', 'onsubmit', 'oninput']) {
      const code = el.getAttribute(attr);
      if (!code) continue;
      const m = code.match(/^[\s;]*([A-Za-z_$][\w$]*)\s*\(/);
      if (m && !['if', 'return', 'this', 'window', 'document', 'alert'].includes(m[1])) {
        const fn = m[1];
        const defined = new RegExp(`function\\s+${fn}\\b|${fn}\\s*=\\s*(function|\\(|async)|window\\.${fn}\\s*=|const\\s+${fn}\\b|let\\s+${fn}\\b`).test(allJs);
        if (!defined) add('high', page, `dead inline handler ${attr}="${code.slice(0, 48)}" — ${fn}() not defined`);
      }
    }
  }

  // SEO basics
  const title = d.querySelector('title')?.textContent.trim();
  if (!title) add('medium', page, 'missing <title>');
  if (!d.querySelector('meta[name="description"]')) add('medium', page, 'missing meta description');
  if (!d.querySelector('link[rel="canonical"]')) add('low', page, 'missing canonical');
  const robots = d.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
  if (['admin.html', 'admin-login.html', 'admin-drop.html', 'account.html', 'order-confirmed.html'].includes(page) && !/noindex/.test(robots)) {
    add('medium', page, 'private page not noindexed');
  }
  const h1s = d.querySelectorAll('h1');
  if (page === 'index.html' && h1s.length !== 1) add('low', page, `h1 count = ${h1s.length}`);

  // unsafe HTML injection sinks fed by user data (manual review targets)
  const sinks = (html.match(/\.innerHTML\s*=/g) || []).length;
  if (sinks) add('info', page, `${sinks} innerHTML assignments (manual XSS review)`);
}

// ── 2. uploads/images referenced by PRODUCTS ────────────────────────────────
{
  const src = read('app.js');
  const start = src.indexOf('const PRODUCTS');
  const open = src.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) { const c = src[i]; if (c === '[') depth++; else if (c === ']') { depth--; if (!depth) { end = i; break; } } }
  const products = new Function(`return ${src.slice(open, end + 1)};`)();
  for (const p of products) {
    const imgs = [p.image, ...(p.images || [])].filter(Boolean);
    for (const im of imgs) {
      if (!/^https?:/.test(im) && !exists(im)) add('high', 'app.js PRODUCTS', `broken product image for ${p.id}: ${im}`);
    }
    const retail = Number(p.retail);
    if (!Number.isFinite(retail) || retail <= 0) add('critical', 'app.js PRODUCTS', `invalid retail for ${p.id}: ${p.retail}`);
    if (Number(p.compareAt) && Number(p.compareAt) < retail) add('medium', 'app.js PRODUCTS', `compareAt < retail for ${p.id} (${p.compareAt} < ${retail}) — fake discount`);
    if (Number(p.wholesale) > retail) add('medium', 'app.js PRODUCTS', `wholesale > retail for ${p.id}`);
    if (p.has_installments && (!Number.isFinite(Number(p.retail)) )) add('high', 'app.js PRODUCTS', `installments on non-numeric price ${p.id}`);
  }
  // duplicate ids
  const seen = new Map();
  for (const p of products) seen.set(p.id, (seen.get(p.id) || 0) + 1);
  for (const [id, n] of seen) if (n > 1) add('high', 'app.js PRODUCTS', `duplicate product id ${id} x${n}`);
}

// ── 3. localStorage parse safety + known keys ───────────────────────────────
{
  for (const f of ['app.js', 'assets/js/account.js', 'assets/js/admin.js', 'assets/js/analytics.js', 'assets/js/gadgets.js', 'sw.js']) {
    if (!exists(f)) continue;
    const src = read(f);
    const parses = src.split('\n');
    parses.forEach((line, i) => {
      if (/JSON\.parse\s*\(\s*localStorage/.test(line) && !/try/.test(line) && !/catch/.test(line)) {
        // crude: check the enclosing ~3 lines for try
        const ctx = parses.slice(Math.max(0, i - 3), i + 2).join(' ');
        if (!/try\s*{/.test(ctx)) add('medium', `${f}:${i + 1}`, 'JSON.parse(localStorage…) without visible try/catch', line.trim().slice(0, 90));
      }
    });
    if (/sk_live_|sk_test_|pk_live_|pk_test_/.test(src)) add('critical', f, 'Paystack key literal in client code');
    if (/service_role/.test(src)) add('critical', f, 'service_role reference in client code');
  }
}

// ── 4. service worker sanity ────────────────────────────────────────────────
{
  const sw = read('sw.js');
  if (/cache\.addAll/.test(sw)) {
    const m = sw.match(/cache\.addAll\(\[([\s\S]*?)\]\)/);
    if (m) {
      for (const ref of m[1].match(/['"]([^'"]+)['"]/g) || []) {
        const clean = ref.slice(1, -1).replace(/^\//, '');
        if (clean && !/^https?:/.test(clean) && !exists(clean)) add('high', 'sw.js', `precache missing file: ${clean}`);
      }
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
findings.sort((a, b) => order[a.sev] - order[b.sev]);
for (const f of findings) console.log(`[${f.sev.toUpperCase()}] ${f.where} — ${f.issue}${f.detail ? ` (${f.detail})` : ''}`);
console.log(`\n${findings.length} findings`);
if (process.argv.includes('--json')) fs.writeFileSync('/tmp/deep-audit.json', JSON.stringify(findings, null, 1));
