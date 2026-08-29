#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = await readFile(join(ROOT, 'index.html'), 'utf8');
const appSource = await readFile(join(ROOT, 'app.js'), 'utf8');
const catalogSource = await readFile(join(ROOT, 'assets/js/catalog.js'), 'utf8');
const accountSource = await readFile(join(ROOT, 'assets/js/account.js'), 'utf8');
const UUID = '00000000-0000-4000-8000-000000000001';

const pages = [
  'index.html', 'account.html', 'admin.html', 'admin-login.html',
  'admin-drop.html', 'drop.html', 'order-confirmed.html',
  'swap.html', 'used.html', 'wholesale.html', 'partner.html', 'admin-control.html',
];
for (const page of pages) {
  const html = await readFile(join(ROOT, page), 'utf8');
  const document = new JSDOM(html).window.document;
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of element.getAttributeNames()) {
      assert.ok(!/^on/i.test(attribute), `${page}: inline event handler ${attribute}`);
    }
  }
  for (const script of document.querySelectorAll('script:not([src])')) {
    assert.equal(script.type, 'application/ld+json', `${page}: executable inline script`);
  }
}
// ── platform pages: no local theatre pretending to be a server ──────────────
const securitySource = await readFile(join(ROOT, 'assets/js/security.js'), 'utf8');
const dbAdapterSource = await readFile(join(ROOT, 'assets/js/db-adapter.js'), 'utf8');
const clientSource = await readFile(join(ROOT, 'assets/js/supabase-client.js'), 'utf8');
const swapSource = await readFile(join(ROOT, 'assets/js/swap-page.js'), 'utf8');
const usedSource = await readFile(join(ROOT, 'assets/js/used-page.js'), 'utf8');
const adminConsoleSource = await readFile(join(ROOT, 'assets/js/admin-control-page.js'), 'utf8');
const adminConsoleHtml = await readFile(join(ROOT, 'admin-control.html'), 'utf8');
const swapHtml = await readFile(join(ROOT, 'swap.html'), 'utf8');
const usedHtml = await readFile(join(ROOT, 'used.html'), 'utf8');

// Data comes from Postgres or it is an error state — never from a demo array.
for (const [label, source] of Object.entries({
  'db-adapter.js': dbAdapterSource, 'swap-page.js': swapSource, 'used-page.js': usedSource,
})) {
  assert.doesNotMatch(source, /\bSEED_[A-Z]+\b|const\s+DEMO\s*=/, `${label}: ships seeded demo rows`);
}
assert.match(dbAdapterSource, /retryable\s*=\s*true/, 'a failed read must surface as a retryable error, not fake data');
assert.doesNotMatch(usedSource, /SEED|sampleInventory/, 'the used board may not invent stock');

// "Security" must not be theater: no console silencing, no eval override, no
// self-asserting CSP meta tag injected at runtime.
assert.doesNotMatch(securitySource, /window\.eval\s*=|console\.(?:log|warn|error|debug)\s*=/,
  'console and eval must not be monkey-patched');
assert.doesNotMatch(securitySource, /http-equiv['"]?\s*,?\s*['"]Content-Security-Policy/,
  'CSP belongs in vercel.json, not in a script');
assert.match(securitySource, /safeImageRef|cleanText/, 'sanitizers must exist to be used');

// Authentication is Supabase's job. A page that hashes a password locally is a
// credential oracle, and the admin console must hand over to admin-login.html.
for (const [label, source] of Object.entries({
  'supabase-client.js': clientSource, 'admin-control-page.js': adminConsoleSource,
})) {
  assert.doesNotMatch(source, /sha256|SubtleCrypto|crypto\.subtle|hashStr|btoa\(password\)/,
    `${label}: no browser-side credential hashing`);
}
assert.doesNotMatch(adminConsoleHtml, /type="password"|value="admin"|valmont2026/,
  'the admin console must not contain a login form, a user name or a secret');
assert.match(adminConsoleHtml, /admin-login\.html/, 'the admin console hands over to the real sign-in');
assert.match(clientSource, /is_valmont_admin/, 'admin access is answered by Postgres, not by localStorage');
assert.doesNotMatch(adminConsoleSource, /vg_admin_session|localStorage\.setItem\(['"]valmont_admin/,
  'no client-side admin session flag');
assert.doesNotMatch(clientSource + dbAdapterSource + adminConsoleSource + swapSource,
  /\.from\(['"](?:sellers|swap_listings|swap_leads|used_inventory|wholesale_dealers|wholesale_orders|partner_applications|ad_payments|admin_audit_log)['"]\)/,
  'platform tables may only be touched through the RPC surface');

// The marketplace entry points must be real links, and the sell flow must reach
// the seller dashboard through the adapter rather than a local array.
assert.match(swapHtml, /assets\/js\/db-adapter\.js/, 'swap.html must load the Supabase adapter');
assert.match(usedHtml, /assets\/js\/supabase-client\.js/, 'used.html must load the data client');
assert.match(swapSource, /VGA\.swap\.create|VGA\.swap\.browse/, 'swap page must go through the adapter');

assert.match(accountSource, /accountStorageKey\s*\(/, 'account private state must be account-scoped');
for (const key of [
  'valmont_customer_addresses', 'valmont_payment_preference', 'valmont_cart',
  'valmont_wishlist', 'valmont_recently_viewed', 'valmont_settings',
]) {
  assert.ok(accountSource.includes(`accountStorageKey('${key}')`), `account key is not scoped: ${key}`);
}
assert.doesNotMatch(appSource, /metadata\.role\s*===\s*['"]dealer['"]/, 'JWT user metadata must not grant dealer mode');
assert.match(appSource, /get_my_dealer_profile/, 'storefront must query authoritative dealer profile');
assert.match(appSource, /profile\s*&&\s*profile\.status\s*===\s*['"]approved['"]/, 'dealer activation must require approved status');
assert.match(appSource, /get_my_dealer_prices/, 'approved pricing must use an authenticated RPC');
assert.doesNotMatch(appSource, /isDealerMode\s*=\s*true[\s\S]{0,200}localStorage\.setItem\(['"]valmont_is_dealer/, 'local state must not grant dealer mode');
assert.doesNotMatch(catalogSource, /"(?:wholesale|wholesale_price|deliveryCost|paymentCost)"\s*:/, 'public fallback catalog must contain no private costs');

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

async function waitFor(predicate, label, timeout = 1500) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function loadStore({ token = '', profile = null, dealerPrices = [], userStatus = 200, guestCart = null } = {}) {
  const virtualConsole = new VirtualConsole();
  const calls = [];
  const dom = new JSDOM(indexHtml, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://valmontgadgets.com/',
    virtualConsole,
  });
  const { window } = dom;
  window.matchMedia = () => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
  window.scrollTo = () => {};
  window.alert = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.setInterval = () => 0;
  if (token) window.localStorage.setItem('valmont_access_token', token);
  window.localStorage.setItem('valmont_user', JSON.stringify({ id: 'forged', name: 'Forged', role: 'dealer' }));
  window.localStorage.setItem('valmont_is_dealer', 'true');
  window.localStorage.setItem('valmont_dealer_profile', JSON.stringify({ status: 'approved' }));
  if (guestCart) window.localStorage.setItem('valmont_cart', JSON.stringify(guestCart));

  window.fetch = async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.includes('/auth/v1/user')) {
      if (userStatus !== 200) return response({ message: 'invalid token' }, userStatus);
      return response({
        id: UUID,
        email: 'buyer@example.com',
        phone: '0240000000',
        user_metadata: { full_name: 'Contract Buyer', role: 'dealer' },
      });
    }
    if (url.includes('/rest/v1/rpc/get_my_dealer_profile')) return response(profile);
    if (url.includes('/rest/v1/rpc/get_my_dealer_prices')) return response(dealerPrices);
    if (url.includes('/rest/v1/rpc/apply_for_dealer')) return response({ status: 'pending', business_name: 'Contract Gadgets' });
    if (url.includes('/rest/v1/rpc/get_storefront_catalog')) return response([]);
    if (url.includes('/auth/v1/logout')) return response({});
    return response([]);
  };

  window.eval(catalogSource);
  window.eval(appSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  return { dom, window, calls };
}

// Cached display objects and forged dealer flags are discarded synchronously.
{
  const { dom, window } = await loadStore();
  assert.equal(window.localStorage.getItem('valmont_user'), null);
  assert.equal(window.localStorage.getItem('valmont_is_dealer'), null);
  assert.equal(window.document.getElementById('accountLabel').textContent.trim(), 'Sign In');
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer Portal');
  dom.window.close();
}

// A verified shopper whose authoritative dealer status is pending stays on
// retail pricing. Guest cart intent moves once into that account namespace and
// is not exposed again after logout.
{
  const guestCart = [{ id: 'VG-IP15PM-256', qty: 2, selected_color: 'Black' }];
  const { dom, window, calls } = await loadStore({
    token: 'verified-token',
    profile: { status: 'pending', business_name: 'Pending Dealer', phone: '0240000000', email: 'buyer@example.com' },
    guestCart,
  });
  await waitFor(() => window.document.getElementById('accountLabel').textContent.includes('Contract'), 'verified session');
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer Portal');
  assert.equal(JSON.parse(window.localStorage.getItem('valmont_user')).role, 'customer');
  assert.equal(window.localStorage.getItem('valmont_cart:guest'), null);
  const accountCart = [{ ...guestCart[0], retail: 16500 }];
  assert.deepEqual(JSON.parse(window.localStorage.getItem(`valmont_cart:${UUID}`)), accountCart);
  const dealerCall = calls.find(call => call.url.includes('get_my_dealer_profile'));
  assert.equal(dealerCall.options.headers.Authorization, 'Bearer verified-token');

  window.document.querySelector('[data-store-action="open-dealer"]').click();
  window.document.getElementById('dlNameInput').value = 'Contract Gadgets';
  window.document.getElementById('dlPhoneInput').value = '0240000000';
  window.document.getElementById('dealerRegForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => calls.some(call => call.url.includes('apply_for_dealer')), 'dealer application');
  await waitFor(() => window.document.getElementById('dealerModal').classList.contains('hidden'), 'dealer application completion');
  const applicationCall = calls.find(call => call.url.includes('apply_for_dealer'));
  assert.equal(applicationCall.options.headers.Authorization, 'Bearer verified-token');
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer Portal');
  assert.equal(window.localStorage.getItem('valmont_is_dealer'), null);

  window.document.querySelector('[data-store-action="logout"]').click();
  await waitFor(() => window.localStorage.getItem('valmont_access_token') === null, 'logout');
  assert.equal(window.document.getElementById('accountLabel').textContent.trim(), 'Sign In');
  assert.equal(window.localStorage.getItem('valmont_cart:guest'), null);
  assert.deepEqual(JSON.parse(window.localStorage.getItem(`valmont_cart:${UUID}`)), accountCart);
  dom.window.close();
}

// Suspended status is fail-closed even if protected-looking prices are present
// in a forged/mock response: the browser must never request that endpoint.
{
  const { dom, window, calls } = await loadStore({
    token: 'suspended-token',
    profile: { status: 'suspended', business_name: 'Suspended Dealer', phone: '0240000000', email: 'buyer@example.com' },
    dealerPrices: [{ product_id: 'VG-IP15PM-256', wholesale_price: 1 }],
    guestCart: [{ id: 'VG-IP15PM-256', qty: 1 }],
  });
  await waitFor(() => window.document.getElementById('accountLabel').textContent.includes('Contract'), 'suspended account');
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer Portal');
  assert.equal(calls.some(call => call.url.includes('get_my_dealer_prices')), false);
  assert.equal(JSON.parse(window.localStorage.getItem('valmont_user')).role, 'customer');
  assert.equal(JSON.parse(window.localStorage.getItem(`valmont_cart:${UUID}`))[0].retail, 16500);
  dom.window.close();
}

// Approved status from the authenticated RPC is the sole route to dealer UI.
{
  const { dom, window, calls } = await loadStore({
    token: 'approved-token',
    profile: { status: 'approved', business_name: 'Contract Gadgets', phone: '0240000000', email: 'buyer@example.com' },
    dealerPrices: [{ product_id: 'VG-IP15PM-256', wholesale_price: 13900 }],
    guestCart: [{ id: 'VG-IP15PM-256', qty: 1 }],
  });
  await waitFor(() => window.document.getElementById('dealerBtnLabel').textContent.includes('Contract'), 'approved dealer');
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer: Contract');
  const pricingCall = calls.find(call => call.url.includes('get_my_dealer_prices'));
  assert.equal(pricingCall.options.headers.Authorization, 'Bearer approved-token');
  assert.equal(JSON.parse(window.localStorage.getItem(`valmont_cart:${UUID}`))[0].retail, 13900);
  window.document.querySelector('[data-store-action="logout"]').click();
  await waitFor(() => window.localStorage.getItem('valmont_access_token') === null, 'approved dealer logout');
  assert.equal(JSON.parse(window.localStorage.getItem(`valmont_cart:${UUID}`))[0].retail, 16500);
  dom.window.close();
}

// A rejected/expired token clears the device session and never trusts caches.
{
  const { dom, window } = await loadStore({ token: 'expired-token', userStatus: 401 });
  await waitFor(() => window.localStorage.getItem('valmont_access_token') === null, 'expired session cleanup');
  assert.equal(window.localStorage.getItem('valmont_user'), null);
  assert.equal(window.document.getElementById('dealerBtnLabel').textContent.trim(), 'Dealer Portal');
  dom.window.close();
}

// ── the admin console may only name actions the database actually allows ──────
// Every button in admin-control.html becomes public.admin(p_name, p_params); the
// allowlist lives in admin_private_execute's CASE. If the console grows a name
// the SQL does not have, the operator sees "unsupported admin action"; if the SQL
// drops one, a button silently dies. Both are caught here instead.
{
  const migrationSql = await readFile(
    join(ROOT, 'supabase/migrations/20260829_platform_security.sql'), 'utf8');
  const body = migrationSql.slice(
    migrationSql.indexOf('FUNCTION public.admin_private_execute'),
    migrationSql.indexOf('FUNCTION public.admin('));
  const sqlActions = new Set([...body.matchAll(/WHEN\s+'([a-z0-9_]+)'/g)].map((m) => m[1]));
  const sqlParams = new Set([...body.matchAll(/->>?\s*'(p_[a-z0-9_]+)'/g)].map((m) => m[1]));
  assert.ok(sqlActions.size >= 15, `the SQL allowlist looks truncated (${sqlActions.size} actions)`);

  const pageActions = new Set([...adminConsoleSource.matchAll(/act\('([a-z0-9_]+)'/g)].map((m) => m[1]));
  for (const match of adminConsoleSource.matchAll(/rpc\.admin\('([a-z0-9_]+)'/g)) pageActions.add(match[1]);
  for (const match of adminConsoleHtml.matchAll(/data-act="([a-z0-9_]+)"/g)) pageActions.add(match[1]);
  const unknown = [...pageActions].filter((name) => !sqlActions.has(name));
  assert.deepEqual(unknown, [], 'the console offers actions the database refuses: ' + unknown.join(', '));

  // The id a button carries must be the parameter the SQL reads for that action.
  const idParamBlock = adminConsoleSource.slice(
    adminConsoleSource.indexOf('const ID_PARAM'), adminConsoleSource.indexOf('async function act('));
  const idParams = new Map([...idParamBlock.matchAll(/(\w+):\s*'(p_[a-z0-9_]+)'/g)].map((m) => [m[1], m[2]]));
  for (const [action, key] of idParams) {
    assert.ok(sqlActions.has(action), `ID_PARAM names an action that does not exist: ${action}`);
    assert.ok(sqlParams.has(key), `${action} sends ${key}, which admin_private_execute never reads`);
  }
  // Anything the page sends as a payload key must be read by the SQL too.
  // \b matters: without it, the ID_PARAM key `stop_promo:` reads as a payload
  // parameter called `p_promo`.
  for (const match of adminConsoleSource.matchAll(/\b(p_[a-z0-9_]+):/g)) {
    assert.ok(sqlParams.has(match[1]), `the console sends ${match[1]}, which the SQL ignores`);
  }
  // One dispatcher, never a guessed per-action endpoint (that 404s on PostgREST).
  assert.doesNotMatch(clientSource, /callRpc\(\s*`admin_/, 'admin actions must go through public.admin()');
  assert.match(clientSource, /callRpc\('admin',\s*\{\s*p_name/, 'the client must call the admin dispatcher');
  console.log(`✓ admin console actions match the SQL allowlist (${sqlActions.size} actions, ${idParams.size} id params)`);
}

console.log('✓ browser identity, dealer authorization, logout, and storage isolation');
console.log('✓ production pages contain no executable inline event handlers/scripts');
