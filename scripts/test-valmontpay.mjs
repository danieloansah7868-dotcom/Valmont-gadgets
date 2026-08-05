#!/usr/bin/env node
/**
 * Unit tests for the Valmont-Pay tenant endpoints (api/valmontpay/*).
 * Runs on plain Node (>= 19 for WebCrypto) — no test framework needed.
 *
 *   npm test
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  TENANT_KEY,
  hmacSha512Hex,
  timingSafeEqualHex,
  toPesewas as hookToPesewas,
  handleWebhookCore,
} from '../api/valmontpay/webhook.js';

import {
  toPesewas as initToPesewas,
  generateOrderNumber,
  handleInitializeCore,
} from '../api/valmontpay/initialize.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const WEBHOOK_SECRET = 'whsec_test_secret_123';
const SB_URL = 'https://example.supabase.co';

// ─── helpers ────────────────────────────────────────────────────────────────

function signedHookRequest(payload, opts = {}) {
  const secret = opts.secret || WEBHOOK_SECRET;
  const tenant = 'tenant' in opts ? opts.tenant : TENANT_KEY;
  const raw = JSON.stringify(payload);
  const signature = createHmac('sha512', secret).update(raw).digest('hex');
  let rawBodyBytes = new TextEncoder().encode(raw);
  if (opts.tamperAfterSigning) {
    // Flip a byte in the body AFTER signing — the signature must no longer verify.
    rawBodyBytes = new TextEncoder().encode(raw.replace('23.5', '29.5'));
  }
  const headers = {
    'content-type': 'application/json',
    'x-valmontpay-signature': signature,
  };
  if (tenant !== null) headers['x-valmontpay-tenant'] = tenant;
  return { rawBodyBytes, headers };
}

function chargeSuccessPayload({ reference = 'VG-TEST-1', amount = 23.5, event = 'charge.success' } = {}) {
  return {
    event,
    data: {
      reference,
      status: 'success',
      amount,
      currency: 'GHS',
      channel: 'card',
      paid_at: '2026-08-05T12:00:00Z',
      merchant: TENANT_KEY,
      gateway_reference: 'VP-MB3K7Z1A-9F4C2E18',
    },
  };
}

/** Mock fetch that records every call and answers from a route table. */
function mockFetch(routes) {
  const calls = [];
  const impl = async (url, opts = {}) => {
    const entry = { url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null, headers: opts.headers || {} };
    calls.push(entry);
    for (const route of routes) {
      if (route.match(entry)) {
        if (route.throw) throw new Error(route.throw);
        const { status = 200, json = {} } = route.respond(entry);
        return {
          ok: status >= 200 && status < 300,
          status,
          json: async () => json,
          text: async () => JSON.stringify(json),
        };
      }
    }
    throw new Error(`Unexpected fetch in test: ${entry.method} ${entry.url}`);
  };
  return { impl, calls };
}

const rpcRoute = (result) => ({
  match: (c) => c.url.includes('/rest/v1/rpc/confirm_order_paid'),
  respond: () => ({ status: 200, json: result }),
});

async function runWebhook(payload, rpcResult, opts = {}) {
  const { rawBodyBytes, headers } = payload.rawBodyBytes ? payload : signedHookRequest(payload, opts.sign || {});
  const { impl, calls } = mockFetch(rpcResult ? [rpcRoute(rpcResult)] : []);
  const result = await handleWebhookCore({
    rawBodyBytes,
    headers,
    env: { VALMONTPAY_WEBHOOK_SECRET: opts.secret === null ? undefined : WEBHOOK_SECRET, SUPABASE_URL: SB_URL, SUPABASE_ANON_KEY: 'anon-test' },
    fetchImpl: impl,
    log: () => {},
  });
  return { result, calls };
}

// ─── crypto primitives ──────────────────────────────────────────────────────

test('hmacSha512Hex matches node:crypto HMAC-SHA512', async () => {
  const raw = new TextEncoder().encode('{"event":"charge.success"}');
  const got = await hmacSha512Hex(WEBHOOK_SECRET, raw);
  const want = createHmac('sha512', WEBHOOK_SECRET).update('{"event":"charge.success"}').digest('hex');
  assert.equal(got, want);
});

test('timingSafeEqualHex accepts identical digests only', async () => {
  const digest = createHmac('sha512', 'k').update('x').digest('hex');
  assert.equal(timingSafeEqualHex(digest, digest), true);
  assert.equal(timingSafeEqualHex(digest, digest.replace(/^./, digest[0] === '0' ? '1' : '0')), false);
  assert.equal(timingSafeEqualHex(digest, digest.slice(0, -2)), false);
  assert.equal(timingSafeEqualHex(digest, ''), false);
  assert.equal(timingSafeEqualHex('zz', 'zz'), false); // non-hex
  assert.equal(timingSafeEqualHex(undefined, digest), false);
});

test('toPesewas converts cedis -> integer pesewas and rejects junk', () => {
  for (const fn of [hookToPesewas, initToPesewas]) {
    assert.equal(fn(23.5), 2350);
    assert.equal(fn('23.50'), 2350);
    assert.equal(fn(0), 0);
    assert.equal(fn(16500), 1650000);
    assert.equal(fn(-1), null);
    assert.equal(fn('abc'), null);
    assert.equal(fn(NaN), null);
  }
});

test('generateOrderNumber is unique and sortable', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(generateOrderNumber());
  assert.equal(seen.size, 500);
  assert.match([...seen][0], /^VG-[A-Z0-9]+-[A-Z0-9]{9}$/);
});

// ─── webhook: auth gate ─────────────────────────────────────────────────────

test('webhook: missing signature -> 401, zero DB calls', async () => {
  const payload = chargeSuccessPayload();
  const raw = JSON.stringify(payload);
  const { result, calls } = await runWebhook({
    rawBodyBytes: new TextEncoder().encode(raw),
    headers: { 'x-valmontpay-tenant': TENANT_KEY },
  }, { result: 'paid' });
  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test('webhook: bad signature -> 401, zero DB calls', async () => {
  const { rawBodyBytes, headers } = signedHookRequest(chargeSuccessPayload());
  headers['x-valmontpay-signature'] = 'deadbeef'.repeat(16);
  const { result, calls } = await runWebhook({ rawBodyBytes, headers }, { result: 'paid' });
  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test('webhook: body tampered after signing (raw bytes verified) -> 401', async () => {
  const signed = signedHookRequest(chargeSuccessPayload({ amount: 23.5 }), { tamperAfterSigning: true });
  const { result, calls } = await runWebhook(signed, { result: 'paid' });
  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test('webhook: wrong tenant header -> 401 even with valid signature', async () => {
  const { result, calls } = await runWebhook(chargeSuccessPayload(), { result: 'paid' }, { sign: { tenant: 'some-other-tenant' } });
  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test('webhook: missing tenant header -> 401', async () => {
  const { result } = await runWebhook(chargeSuccessPayload(), { result: 'paid' }, { sign: { tenant: null } });
  assert.equal(result.status, 401);
});

test('webhook: secret not configured -> 500 (retryable)', async () => {
  const { result } = await runWebhook(chargeSuccessPayload(), null, { secret: null });
  assert.equal(result.status, 500);
});

// ─── webhook: event handling ────────────────────────────────────────────────

test('webhook: signed charge.success marks order Paid via RPC (pesewa total)', async () => {
  const { result, calls } = await runWebhook(chargeSuccessPayload({ reference: 'VG-ABC-123', amount: 139.98 }), { result: 'paid', order_number: 'VG-ABC-123' });
  assert.equal(result.status, 200);
  assert.equal(result.body.result, 'paid');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/confirm_order_paid$/);
  assert.equal(calls[0].body.p_reference, 'VG-ABC-123');
  assert.equal(calls[0].body.p_expected_total, 139.98);
});

test('webhook: repeat delivery (already_paid) -> plain 200 (idempotent)', async () => {
  const { result } = await runWebhook(chargeSuccessPayload(), { result: 'already_paid', order_number: 'VG-TEST-1' });
  assert.equal(result.status, 200);
  assert.equal(result.body.result, 'already_paid');
});

test('webhook: pesewa mismatch never flips order -> terminal 200, not Paid', async () => {
  const { result } = await runWebhook(chargeSuccessPayload({ amount: 100 }), { result: 'amount_mismatch', order_number: 'VG-TEST-1', order_total: 139.98 });
  assert.equal(result.status, 200);
  assert.equal(result.body.result, 'amount_mismatch');
  assert.notEqual(result.body.result, 'paid');
});

test('webhook: order row missing -> 503 so the gateway retries', async () => {
  const { result } = await runWebhook(chargeSuccessPayload(), { result: 'not_found' });
  assert.equal(result.status, 503);
});

test('webhook: charge.failed -> fast 200 ignored, zero DB calls', async () => {
  const { result, calls } = await runWebhook(chargeSuccessPayload({ event: 'charge.failed' }), { result: 'paid' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, true);
  assert.equal(calls.length, 0);
});

test('webhook: unrelated event -> fast 200 ignored', async () => {
  const { result, calls } = await runWebhook(chargeSuccessPayload({ event: 'transfer.success' }), { result: 'paid' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, true);
  assert.equal(calls.length, 0);
});

test('webhook: signed but invalid JSON -> 400', async () => {
  const raw = '{ not json';
  const signature = createHmac('sha512', WEBHOOK_SECRET).update(raw).digest('hex');
  const { result } = await runWebhook({
    rawBodyBytes: new TextEncoder().encode(raw),
    headers: { 'x-valmontpay-signature': signature, 'x-valmontpay-tenant': TENANT_KEY },
  }, null);
  assert.equal(result.status, 400);
});

test('webhook: charge.success without reference -> 400', async () => {
  const payload = chargeSuccessPayload();
  delete payload.data.reference;
  delete payload.data.gateway_reference;
  const { result } = await runWebhook(payload, null);
  assert.equal(result.status, 400);
});

test('webhook: database unreachable -> 503 (retryable)', async () => {
  const signed = signedHookRequest(chargeSuccessPayload());
  const { impl } = mockFetch([{ match: () => true, throw: 'network down' }]);
  const result = await handleWebhookCore({
    rawBodyBytes: signed.rawBodyBytes,
    headers: signed.headers,
    env: { VALMONTPAY_WEBHOOK_SECRET: WEBHOOK_SECRET, SUPABASE_URL: SB_URL },
    fetchImpl: impl,
    log: () => {},
  });
  assert.equal(result.status, 503);
});

// ─── initialize: server-side pricing pipeline ───────────────────────────────

const CATALOG = [
  { id: 'VG-A', name: 'Product A', price: 19.99, is_active: true },
  { id: 'VG-B', name: 'Product B', price: 100, is_active: true },
  { id: 'VG-OFF', name: 'Deactivated', price: 50, is_active: false },
];

function initRoutes({ gateway = { status: true, message: 'ok', data: { access_code: 'ac_test', reference: 'VG-ORDER-1', gateway_reference: 'VP-MB3K7Z1A-9F4C2E18', pay_url: 'https://valmontpay.app/pay.html?access_code=ac_test', checkout_url: 'https://valmontpay.app/checkout.html?reference=VG-ORDER-1' } }, gatewayStatus = 200, orderInsertStatus = 200, productsThrows = false } = {}) {
  return mockFetch([
    {
      match: (c) => c.url.includes('/rest/v1/products?'),
      respond: () => ({ status: 200, json: CATALOG }),
      ...(productsThrows ? { throw: 'catalog down' } : {}),
    },
    { match: (c) => c.url.endsWith('/rest/v1/customers'), respond: () => ({ status: 201, json: [] }) },
    { match: (c) => c.url.endsWith('/rest/v1/orders'), respond: () => ({ status: orderInsertStatus, json: orderInsertStatus < 300 ? [{ id: 'order-1' }] : { message: 'insert failed' } }) },
    { match: (c) => c.url.includes('/api/transaction/initialize'), respond: () => ({ status: gatewayStatus, json: gateway }) },
    { match: (c) => c.url.includes('/rest/v1/rpc/set_order_payment_reference'), respond: () => ({ status: 200, json: { result: 'ok' } }) },
  ]);
}

const INIT_ENV = { VALMONTPAY_SECRET_KEY: 'sk_valmont_test', SUPABASE_URL: SB_URL, SUPABASE_ANON_KEY: 'anon-test' };

async function runInitialize(body, opts = {}) {
  const { impl, calls } = initRoutes(opts);
  const result = await handleInitializeCore({ body, env: opts.env || INIT_ENV, fetchImpl: impl, log: () => {} });
  return { result, calls };
}

test('initialize: recomputes total from DB prices, ignores client amounts', async () => {
  const { result, calls } = await runInitialize({
    items: [
      { id: 'VG-A', qty: 2, price: 1, total_amount: 2 }, // hostile client amounts -> ignored
      { id: 'VG-B', qty: 1 },
    ],
    customer: { name: 'Ama Serwaa', phone: '054 245 1578', email: 'ama@example.com', area: 'Osu', street: '12 High St', full_address: '12 High St, Osu, Accra' },
    payment_method: 'Mobile Money',
    total_amount: 1, // must never be honoured
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.total, 139.98); // 2x19.99 + 100, cedis
  assert.equal(result.body.currency, 'GHS');
  assert.match(result.body.url, /^https:\/\/valmontpay\.app\/pay\.html\?access_code=ac_test$/);

  const orderInsert = calls.find((c) => c.url.endsWith('/rest/v1/orders'));
  assert.equal(orderInsert.body.total, 139.98);
  assert.equal(orderInsert.body.subtotal, 139.98);
  assert.equal(orderInsert.body.status, 'Pending');
  assert.equal(orderInsert.body.items.length, 2);
  assert.equal(orderInsert.body.items[0].unit_price, 19.99);

  const gatewayCall = calls.find((c) => c.url.includes('/api/transaction/initialize'));
  assert.equal(gatewayCall.headers.authorization, 'Bearer sk_valmont_test');
  assert.equal(gatewayCall.body.amount, 139.98); // cedis, never pesewas
  assert.equal(gatewayCall.body.reference, orderInsert.body.order_number);
  assert.equal(gatewayCall.body.callback_url, 'https://valmontgadgets.com/order-confirmed.html');

  const refStore = calls.find((c) => c.url.includes('set_order_payment_reference'));
  assert.equal(refStore.body.p_payment_reference, 'VP-MB3K7Z1A-9F4C2E18');
  assert.equal(refStore.body.p_order_number, orderInsert.body.order_number);
});

test('initialize: unknown product -> 400, gateway never called', async () => {
  const { result, calls } = await runInitialize({ items: [{ id: 'VG-NOPE', qty: 1 }], customer: {} });
  assert.equal(result.status, 400);
  assert.ok(Array.isArray(result.body.unavailable));
  assert.equal(calls.some((c) => c.url.includes('/api/transaction/initialize')), false);
});

test('initialize: inactive product -> 400, gateway never called', async () => {
  const { result, calls } = await runInitialize({ items: [{ id: 'VG-OFF', qty: 1 }] });
  assert.equal(result.status, 400);
  assert.equal(calls.some((c) => c.url.includes('/api/transaction/initialize')), false);
});

test('initialize: empty cart -> 400', async () => {
  const { result } = await runInitialize({ items: [] });
  assert.equal(result.status, 400);
});

test('initialize: qty 0 or > 50 -> 400', async () => {
  assert.equal((await runInitialize({ items: [{ id: 'VG-A', qty: 0 }] })).result.status, 400);
  assert.equal((await runInitialize({ items: [{ id: 'VG-A', qty: 51 }] })).result.status, 400);
});

test('initialize: missing tenant secret -> 500', async () => {
  const { result } = await runInitialize({ items: [{ id: 'VG-A', qty: 1 }] }, { env: { SUPABASE_URL: SB_URL } });
  assert.equal(result.status, 500);
});

test('initialize: gateway rejection -> 502 with gateway message', async () => {
  const { result } = await runInitialize({ items: [{ id: 'VG-A', qty: 1 }] }, { gateway: { status: false, message: 'Invalid tenant key' }, gatewayStatus: 401 });
  assert.equal(result.status, 502);
  assert.match(result.body.detail || '', /Invalid tenant key/);
});

test('initialize: catalog unreachable -> 503', async () => {
  const { result } = await runInitialize({ items: [{ id: 'VG-A', qty: 1 }] }, { productsThrows: true });
  assert.equal(result.status, 503);
});

test('initialize: order insert failure -> 500, gateway never called', async () => {
  const { result, calls } = await runInitialize({ items: [{ id: 'VG-A', qty: 1 }] }, { orderInsertStatus: 500 });
  assert.equal(result.status, 500);
  assert.equal(calls.some((c) => c.url.includes('/api/transaction/initialize')), false);
});

// ─── runner ─────────────────────────────────────────────────────────────────

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err && err.message ? err.message : err}`);
  }
}
console.log(`\n${failed === 0 ? '✅' : '⚠️ '} ${tests.length - failed}/${tests.length} Valmont-Pay tests passed\n`);
process.exit(failed === 0 ? 0 : 1);
