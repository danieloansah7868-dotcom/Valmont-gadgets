#!/usr/bin/env node
/**
 * Regression test for the "Sign up with Google" flow.
 *
 * Extracts the REAL Google-auth functions out of app.js and account.js and
 * runs them against stubbed browser APIs, verifying:
 *   1. The Supabase authorize redirect always uses an allowlist-safe callback
 *      URL (bare site page, no query string).
 *   2. A shopper who starts "Sign up with Google" on the account page is
 *      returned to the account page once Google has authenticated them
 *      (valmont_oauth_return is consumed, never stranded on the store).
 *   3. OAuth errors (consent denied, expired flow, failed token exchange) are
 *      surfaced to the shopper, never silently swallowed, and never leave a
 *      bogus session or a stale return destination behind.
 *
 * Usage: node scripts/test-google-oauth.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const accountJs = fs.readFileSync(path.join(ROOT, 'assets/js/account.js'), 'utf8');

// --- tiny brace-matcher to pull a function body out of a file ---
function extractFunction(src, signature) {
  const start = src.indexOf(signature);
  if (start === -1) throw new Error(`signature not found: ${signature}`);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  // Preserve any `async` modifier that precedes the signature (the brace
  // matcher only looks at `{`, so it would otherwise be dropped).
  const fnIdx = src.indexOf('function', start);
  const asyncPrefix = src.slice(Math.max(0, fnIdx - 6), fnIdx).trim() === 'async' ? 'async ' : '';
  return { body: src.slice(open, i + 1), asyncPrefix };
}

const appHandleGoogleSignIn = extractFunction(appJs, 'function handleGoogleSignIn()');
const appCompleteGoogleSignIn = extractFunction(appJs, 'async function completeGoogleSignIn()');
const accountHandleGoogleSignIn = extractFunction(accountJs, 'function handleGoogleSignIn()');

let pass = 0, fail = 0;
const ok = (cond, label) => { console.log(`  ${cond ? '✅' : '❌'} ${label}`); cond ? pass++ : fail++; };

// --- stubs shared by all tests ---
function makeStubs({ hash = '', search = '', pathname = '/', origin = 'https://valmontgadgets.com', userApiResponse = null, userApiOk = true } = {}) {
  const calls = { assign: [], toasts: [], replaceState: [], ui: [], fetches: [] };
  const store = new Map();
  const historyStack = [{ hash, search, pathname, origin }];
  const sessionStorage = {
    getItem: k => store.has('s:' + k) ? store.get('s:' + k) : null,
    setItem: (k, v) => store.set('s:' + k, String(v)),
    removeItem: k => store.delete('s:' + k),
  };
  const localStorage = {
    getItem: k => store.has('l:' + k) ? store.get('l:' + k) : null,
    setItem: (k, v) => store.set('l:' + k, String(v)),
    removeItem: k => store.delete('l:' + k),
  };
  const location = {
    get origin() { return historyStack[historyStack.length - 1].origin; },
    get pathname() { return historyStack[historyStack.length - 1].pathname; },
    get search() { return historyStack[historyStack.length - 1].search; },
    get hash() { return historyStack[historyStack.length - 1].hash; },
    get href() { const h = historyStack[historyStack.length - 1]; return h.origin + h.pathname + h.search + h.hash; },
    assign: u => calls.assign.push(String(u)),
  };
  const history = {
    replaceState: (_s, _t, url) => {
      calls.replaceState.push(String(url));
      const top = historyStack[historyStack.length - 1];
      const u = new URL(url, top.origin);
      historyStack.push({ origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash });
    },
  };
  const fetch = async () => {
    calls.fetches.push(1);
    return { ok: userApiOk, json: async () => userApiResponse };
  };
  const context = {
    window: { location },
    location, history, sessionStorage, localStorage, fetch,
    URLSearchParams, console, setTimeout,
    VALMONT_SUPABASE: { url: 'https://eydsoqnpetqczaeqrscc.supabase.co', anonKey: 'anon-key' },
    hasSupabase: () => true,
    showValmontToast: m => calls.toasts.push(m),
    updateUserUI: () => { calls.ui.push(1); },
    currentUser: null,
  };
  vm.createContext(context);
  return { context, calls, store };
}

function run(fn, context, name) {
  return vm.runInContext(`(${fn.asyncPrefix}function() ${fn.body})`, context, { filename: name });
}

// ============ TEST 1: homepage flow — kickoff builds a clean allowlist-safe URL ============
console.log('\nT1: homepage kickoff (handleGoogleSignIn)');
{
  const { context, calls } = makeStubs();
  const fn = run(appHandleGoogleSignIn, context, 'app.js');
  fn();
  const authUrl = calls.assign[0];
  ok(authUrl.startsWith('https://eydsoqnpetqczaeqrscc.supabase.co/auth/v1/authorize?provider=google&redirect_to='), 'redirects to Supabase authorize endpoint');
  const rt = decodeURIComponent(authUrl.split('redirect_to=')[1]);
  ok(rt === 'https://valmontgadgets.com/', `callback redirect_to is bare site root (got ${rt})`);
  ok(context.sessionStorage.getItem('valmont_oauth_return') === 'https://valmontgadgets.com/', 'valmont_oauth_return defaults to current storefront URL');
}

// ============ TEST 2: account page seeds return destination ============
console.log('\nT2: account page kickoff (account.js handleGoogleSignIn)');
{
  const { context, calls } = makeStubs({ pathname: '/account' });
  const fn = run(accountHandleGoogleSignIn, context, 'account.js');
  fn();
  ok(calls.assign[0] === '/?google_signin=1', 'hands off to the storefront with google_signin=1');
  ok(context.sessionStorage.getItem('valmont_oauth_return') === 'https://valmontgadgets.com/account', 'seeds valmont_oauth_return with the account page URL');
}

// ============ TEST 3: kickoff preserves the account-page destination ============
console.log('\nT3: storefront kickoff preserves pre-seeded destination');
{
  const { context, calls } = makeStubs({ search: '?google_signin=1' });
  context.sessionStorage.setItem('valmont_oauth_return', 'https://valmontgadgets.com/account');
  const fn = run(appHandleGoogleSignIn, context, 'app.js');
  fn();
  const rt = decodeURIComponent(calls.assign[0].split('redirect_to=')[1]);
  ok(rt === 'https://valmontgadgets.com/', 'callback still uses the bare site root');
  ok(context.sessionStorage.getItem('valmont_oauth_return') === 'https://valmontgadgets.com/account', 'return destination preserved for post-OAuth handback');
}

// ============ TEST 4: OAuth success on homepage → user persisted, stays put ============
console.log('\nT4: OAuth callback success on the homepage');
{
  const { context, calls, store } = makeStubs({
    hash: '#access_token=TOK123&token_type=bearer&expires_in=3600',
    userApiResponse: { id: 'u1', email: 'ada@gmail.com', user_metadata: { full_name: 'Ada Lovelace' } },
  });
  const fn = run(appCompleteGoogleSignIn, context, 'app.js');
  await fn();
  ok(JSON.parse(store.get('l:valmont_user')).name === 'Ada Lovelace', 'verified Google profile persisted to localStorage');
  ok(store.get('l:valmont_access_token') === 'TOK123', 'access token persisted');
  ok(calls.assign.length === 0, 'no redirect when already on the destination page');
  ok(calls.ui.length === 1 && calls.toasts.some(t => t.includes('Ada')), 'UI updated and welcome toast shown');
  ok(context.location.hash === '', 'sensitive fragment cleared from the address bar');
}

// ============ TEST 5: "Sign up with Google" from account page returns to account page ============
console.log('\nT5: OAuth callback success returns shopper to the account page');
{
  const { context, calls, store } = makeStubs({
    hash: '#access_token=TOK456&token_type=bearer&expires_in=3600',
    userApiResponse: { id: 'u2', email: 'grace@gmail.com', user_metadata: { full_name: 'Grace Hopper' } },
  });
  context.sessionStorage.setItem('valmont_oauth_return', 'https://valmontgadgets.com/account');
  const fn = run(appCompleteGoogleSignIn, context, 'app.js');
  await fn();
  ok(JSON.parse(store.get('l:valmont_user')).name === 'Grace Hopper', 'Google profile persisted');
  ok(calls.assign.length === 1 && calls.assign[0] === 'https://valmontgadgets.com/account', `redirected back to account page (got ${calls.assign[0]})`);
  ok(context.sessionStorage.getItem('valmont_oauth_return') === null, 'return destination consumed (cleared)');
}

// ============ TEST 6: OAuth denied → error surfaced, no bogus session ============
console.log('\nT6: OAuth error callback (consent denied)');
{
  const { context, calls, store } = makeStubs({
    hash: '#error=access_denied&error_description=The+user+denied+the+request',
  });
  const fn = run(appCompleteGoogleSignIn, context, 'app.js');
  await fn();
  ok(calls.toasts.some(t => t.includes('not completed')), 'shopper informed sign-in was not completed');
  ok(store.get('l:valmont_user') === undefined && store.get('l:valmont_access_token') === undefined, 'no session persisted on denial');
  ok(context.location.hash === '', 'error fragment cleared');
}

// ============ TEST 7: exchange failure → no session, no redirect ============
console.log('\nT7: token exchange failure');
{
  const { context, calls, store } = makeStubs({
    hash: '#access_token=BAD&token_type=bearer',
    userApiOk: false, userApiResponse: { msg: 'bad' },
  });
  context.sessionStorage.setItem('valmont_oauth_return', 'https://valmontgadgets.com/account');
  const fn = run(appCompleteGoogleSignIn, context, 'app.js');
  await fn();
  ok(store.get('l:valmont_access_token') === undefined, 'no session persisted');
  ok(calls.assign.length === 0, 'no redirect to account page on failure');
  ok(calls.toasts.some(t => t.includes('could not be completed')), 'failure toast shown');
  ok(context.sessionStorage.getItem('valmont_oauth_return') === null, 'stale return destination cleared so it cannot misdirect a later flow');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
