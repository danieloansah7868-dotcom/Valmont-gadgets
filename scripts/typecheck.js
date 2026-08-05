#!/usr/bin/env node
/**
 * Syntax gate for every hand-written JavaScript file in the project.
 * (This repo has no TypeScript build; app/page.tsx is an orphaned, unbuilt
 * page and is checked for balanced structure only.)
 *
 *   npm run typecheck
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let fail = 0;

function check(file, moduleType) {
  const rel = path.relative(ROOT, file);
  try {
    if (moduleType === 'esm') {
      // node --check honours the nearest package.json "type"; api/ is ESM.
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } else {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    }
    console.log(`  ✅ ${rel}`);
  } catch (err) {
    fail++;
    console.error(`  ❌ ${rel}`);
    console.error(String(err.stderr || err.message).split('\n').map((l) => `     ${l}`).join('\n'));
  }
}

// Serverless Valmont-Pay endpoints (ESM via api/package.json).
for (const f of fs.readdirSync(path.join(ROOT, 'api', 'valmontpay'))) {
  if (f.endsWith('.js')) check(path.join(ROOT, 'api', 'valmontpay', f), 'esm');
}

// Storefront + legacy bundles (plain scripts).
for (const f of ['app.js', 'sw.js', 'shop.min.js']) {
  check(path.join(ROOT, f), 'cjs');
}

// Build/CI scripts (CommonJS .js, ESM .mjs).
for (const f of fs.readdirSync(path.join(ROOT, 'scripts'))) {
  if (f.endsWith('.js') || f.endsWith('.mjs')) check(path.join(ROOT, 'scripts', f), f.endsWith('.mjs') ? 'esm' : 'cjs');
}

// Browser assets.
for (const f of fs.readdirSync(path.join(ROOT, 'assets', 'js'))) {
  if (f.endsWith('.js')) check(path.join(ROOT, 'assets', 'js', f), 'cjs');
}

// Orphaned Next.js page (not part of the Vercel static build): structural sanity.
const tsx = fs.readFileSync(path.join(ROOT, 'app', 'page.tsx'), 'utf8');
const braces = (tsx.match(/{/g) || []).length - (tsx.match(/}/g) || []).length;
const parens = (tsx.match(/\(/g) || []).length - (tsx.match(/\)/g) || []).length;
if (braces === 0 && parens === 0) {
  console.log('  ✅ app/page.tsx (balanced)');
} else {
  fail++;
  console.error(`  ❌ app/page.tsx (unbalanced: braces=${braces} parens=${parens})`);
}

console.log(`\n${fail === 0 ? '✅ typecheck clean' : `⚠️ ${fail} file(s) failed`}\n`);
process.exit(fail === 0 ? 0 : 1);
