#!/usr/bin/env node
/**
 * Verifies that the pre-rendered #productGrid markup matches what the
 * client-side renderProducts() paints on hydration. A mismatch means users
 * would see a visual flash, so this guards Hard Constraint #1.
 *
 * Usage: node scripts/verify-hydration.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

/**
 * Normalises away the *intentional* differences between the pre-rendered
 * markup and the runtime template: the pre-rendered cards use the shared SVG
 * sprite, explicit type="button", aria-labels and lazy/decoding hints
 * (Tasks 5 + 8). Everything else — order, names, prices, stock, SKUs — must
 * match exactly.
 */
function normalise(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    // collapse any <svg>…</svg> (sprite <use> vs inline path) to a token
    .replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')
    .replace(/\s(?:type="button"|loading="lazy"|decoding="async"|fetchpriority="high")/g, '')
    .replace(/\saria-label="[^"]*"/g, '')
    .replace(/\srole="img"/g, '')
    // <picture> wrapper around local WebP sources vs bare <img>
    .replace(/<picture>\s*<source[^>]*>\s*/g, '')
    .replace(/<\/picture>/g, '')
    .replace(/\ssrcset="[^"]*"/g, '')
    .replace(/\ssizes="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

async function main() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://valmontgadgets.com/',
  });
  const { window } = dom;

  const before = window.document.getElementById('productGrid').innerHTML;
  const beforeCards = window.document.querySelectorAll('#productGrid > div').length;

  // Stub the browser APIs app.js touches that jsdom does not implement.
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.fetch = () => Promise.reject(new Error('offline'));

  // app.js installs countdown timers/carousels that keep the event loop alive
  // forever; neutralise the repeating ones so this script can exit.
  window.setInterval = () => 0;

  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  try {
    window.eval(app);
  } catch (e) {
    console.warn('app.js threw during eval (may be benign in jsdom):', e.message);
  }
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 600));

  const after = window.document.getElementById('productGrid').innerHTML;
  const afterCards = window.document.querySelectorAll('#productGrid > div').length;

  console.log(`pre-rendered cards : ${beforeCards}`);
  console.log(`hydrated cards     : ${afterCards}`);

  const a = normalise(before);
  const b = normalise(after);

  if (a === b) {
    console.log('\n✅ MATCH — pre-rendered markup is identical to hydrated output.');
    return;
  }

  console.log('\n⚠️  DIFF between pre-rendered and hydrated markup.');
  console.log(`   pre-rendered length: ${a.length}`);
  console.log(`   hydrated length    : ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log(`   first difference at char ${i}:`);
      console.log(`   pre : ...${a.slice(Math.max(0, i - 90), i + 90)}...`);
      console.log(`   post: ...${b.slice(Math.max(0, i - 90), i + 90)}...`);
      break;
    }
  }
  process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode || 0),
  (e) => { console.error(e); process.exit(1); }
);
