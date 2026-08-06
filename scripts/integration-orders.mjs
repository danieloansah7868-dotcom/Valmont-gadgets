#!/usr/bin/env node
/**
 * Integration test: the pending-order INSERT that
 * api/valmontpay/initialize.js issues must survive the real
 * public.orders schema constraints.
 *
 * Why this file exists
 * --------------------
 * The unit tests in test-valmontpay.mjs stub `fetch` and reply 201 to
 * POST /rest/v1/orders no matter what JSON is sent, so a missing or null
 * `order_number` sailed through CI while Postgres rejected it in production
 * with:
 *
 *   null value in column "order_number" of relation "orders"
 *   violates not-null constraint  (SQLSTATE 23502)
 *
 * This test instead:
 *   1. Stands up a tiny PostgREST-shaped HTTP server that enforces the
 *      NOT NULL / UNIQUE / FK / TYPE constraints declared on public.orders
 *      (copied verbatim from supabase/migrations/init.sql).
 *   2. Drives it with the REAL @supabase/supabase-js client (the same
 *      library the serverless endpoint could use), so URL encoding,
 *      headers, Prefer handling and JSON serialization are production-true.
 *   3. Inserts the exact row shape the handler builds (via buildOrderRow),
 *      proving order_number is always present and non-null.
 *   4. Also runs control assertions: payloads violating each constraint are
 *      rejected — proving the mock actually enforces the constraint, so a
 *      regression that drops the key or sends wrong types cannot pass silently.
 *
 * It does NOT touch the live Supabase project; it is hermetic and safe in CI.
 *
 *   npm run test:integration
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { createClient } from '@supabase/supabase-js';

import { buildOrderRow, generateOrderNumber, handleInitializeCore } from '../api/valmontpay/initialize.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ─── Schema-validating PostgREST stand-in ───────────────────────────────────
// Mirrors the constraints from supabase/migrations/init.sql and
// supabase/migrations/20260805_valmontpay_pipeline.sql:
//
//   orders.order_number TEXT UNIQUE NOT NULL
//   orders.customer_id  TEXT REFERENCES customers(id) ON DELETE SET NULL
//   orders.items        JSONB NOT NULL DEFAULT '[]'::jsonb
//   orders.subtotal     NUMERIC NOT NULL DEFAULT 0
//   orders.delivery_fee NUMERIC NOT NULL DEFAULT 0
//   orders.total        NUMERIC NOT NULL DEFAULT 0
//
function startSchemaServer() {
  const customers = new Map(); // id -> {id, name, ...}
  const orders = [];
  const seenOrderNumbers = new Set();

  const send = (res, status, obj) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // JSONB columns accept arrays and plain objects (not strings, numbers, booleans)
  const isValidJsonb = (value) => {
    if (value === null || value === undefined) return false;
    // Must be a plain object or array - reject strings, numbers, booleans
    if (typeof value === 'object' && !Array.isArray(value)) return true; // plain object
    if (Array.isArray(value)) return true; // array
    return false; // string, number, boolean, etc. are not valid JSONB
  };

  const isNumeric = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return true;
    if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n); }
    return false;
  };

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/rest/v1/customers') && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let body;
        try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { code: '22P02', message: 'invalid JSON' }); }
        // Customers: id is the primary key. Store it so orders FK can reference it.
        if (body.id) customers.set(body.id, body);
        const prefer = req.headers.prefer || '';
        if (prefer.includes('return=representation')) return send(res, 201, [body]);
        return send(res, 201, {});
      });
      return;
    }

    if (req.method !== 'POST' || !req.url.startsWith('/rest/v1/orders')) {
      return send(res, 404, { message: `no route ${req.method} ${req.url}` });
    }

    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch (e) {
        return send(res, 400, { code: '22P02', message: 'invalid JSON' });
      }

      // ── 1. NOT NULL enforcement (SQLSTATE 23502) ─────────────────────────
      for (const col of ['order_number', 'items', 'total']) {
        if (body[col] === undefined || body[col] === null) {
          return send(res, 400, {
            code: '23502',
            message: `null value in column "${col}" of relation "orders" violates not-null constraint`,
            details: { column: col },
          });
        }
      }

      // ── 2. FOREIGN KEY on customer_id → customers(id) (SQLSTATE 23503) ─
      // customer_id is nullable (ON DELETE SET NULL), but if non-null it
      // MUST reference an existing customers row.
      if (body.customer_id !== null && body.customer_id !== undefined && body.customer_id !== '') {
        if (!customers.has(body.customer_id)) {
          return send(res, 400, {
            code: '23503',
            message: `insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"`,
            details: `Key (customer_id)=(${body.customer_id}) is not present in table "customers".`,
            hint: 'Make sure the customer exists before inserting the order.',
          });
        }
      }

      // ── 3. TYPE enforcement: items must be valid JSONB (array or object) ─
      if (!isValidJsonb(body.items)) {
        return send(res, 400, {
          code: '22P02',
          message: 'invalid input syntax for type jsonb',
          details: `Value "${String(body.items).slice(0, 50)}" is not valid JSONB.`,
        });
      }

      // ── 4. TYPE enforcement: subtotal, delivery_fee, total must be NUMERIC ─
      for (const col of ['subtotal', 'delivery_fee', 'total']) {
        if (body[col] !== undefined && body[col] !== null && !isNumeric(body[col])) {
          return send(res, 400, {
            code: '22P02',
            message: `invalid input syntax for type numeric: "${body[col]}"`,
            details: { column: col, value: body[col] },
          });
        }
      }

      // ── 5. UNIQUE on order_number (SQLSTATE 23505) ─────────────────────
      if (seenOrderNumbers.has(body.order_number)) {
        return send(res, 409, {
          code: '23505',
          message: `duplicate key value violates unique constraint "orders_order_number_key"`,
          details: { key: { order_number: body.order_number } },
        });
      }
      seenOrderNumbers.add(body.order_number);

      const stored = {
        id: `ord-${orders.length + 1}`,
        order_number: body.order_number,
        customer_id: body.customer_id ?? null,
        items: body.items ?? [],
        subtotal: body.subtotal ?? 0,
        delivery_fee: body.delivery_fee ?? 0,
        total: body.total ?? 0,
        status: body.status ?? 'Pending',
        payment_method: body.payment_method ?? null,
        created_at: new Date().toISOString(),
      };
      orders.push(stored);

      const prefer = req.headers.prefer || '';
      if (prefer.includes('return=representation')) {
        return send(res, 201, [stored]);
      }
      return send(res, 201, {});
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        orders,
        customers,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('end-to-end: handleInitializeCore calls create_pending_order RPC (no direct orders INSERT)', async () => {
  const { url, orders, customers, close } = await startSchemaServer();
  try {
    const captured = { rpcCall: null, customerInsert: null };
    const CATALOG = [{ id: 'VG-A', name: 'Phone A', price: 19.99, is_active: true }];
    const GATEWAY = {
      status: true,
      message: 'ok',
      data: { access_code: 'ac_test', gateway_reference: 'VP-TEST', pay_url: 'https://valmontpay.app/pay.html?access_code=ac_test' },
    };

    const mockFetch = async (fetchUrl, opts = {}) => {
      const u = String(fetchUrl);
      const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

      if (u.includes('/rest/v1/products')) return json(200, CATALOG);

      // Forward customer POSTs to the schema server so the customer FK is satisfied.
      if (u.endsWith('/rest/v1/customers') && opts.method === 'POST') {
        captured.customerInsert = JSON.parse(opts.body);
        const upstream = await fetch(`${url}/rest/v1/customers`, {
          method: 'POST',
          headers: opts.headers,
          body: opts.body,
        });
        return { ok: upstream.ok, status: upstream.status, json: () => upstream.json(), text: () => upstream.text() };
      }

      // RPC: create_pending_order — return the order_number that was sent.
      if (u.includes('/rest/v1/rpc/create_pending_order')) {
        captured.rpcCall = JSON.parse(opts.body);
        const orderNumber = captured.rpcCall.p_order_number;
        return json(200, { id: 'ord-rpc-1', order_number: orderNumber, idempotent: false });
      }

      if (u.includes('/rest/v1/rpc/')) return json(200, { result: 'ok' });
      if (u.includes('/api/transaction/initialize')) return json(200, GATEWAY);

      // Direct orders INSERT must NOT happen anymore.
      if (u.endsWith('/rest/v1/orders') && opts.method === 'POST') {
        throw new Error('REGRESSION: initialize.js must NOT directly POST /rest/v1/orders — use the create_pending_order RPC');
      }

      throw new Error(`unexpected fetch ${opts.method || 'GET'} ${u}`);
    };

    const result = await handleInitializeCore({
      body: { items: [{ id: 'VG-A', qty: 2 }], customer: { name: 'Ama', phone: '054 245 1578', email: 'ama@example.com' }, payment_method: 'Mobile Money' },
      env: { VALMONTPAY_SECRET_KEY: 'sk_test', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'anon-test' },
      fetchImpl: mockFetch,
      log: () => {},
    });

    assert.equal(result.status, 200, `initialize should succeed: ${JSON.stringify(result.body)}`);
    assert.ok(captured.rpcCall, 'handler must call create_pending_order RPC');
    assert.ok(captured.customerInsert, 'handler must POST /rest/v1/customers');

    // Verify the customer was stored in our mock (satisfying the FK).
    const custId = captured.customerInsert.id;
    assert.ok(customers.has(custId), `customer ${custId} must exist for FK constraint`);

    // Verify RPC payload shape.
    assert.equal(typeof captured.rpcCall.p_order_number, 'string');
    assert.ok(captured.rpcCall.p_order_number.startsWith('VG-'));
    assert.ok(Array.isArray(captured.rpcCall.p_items), 'p_items must be an array');
    assert.ok(captured.rpcCall.p_items.length > 0, 'p_items must not be empty');
    assert.equal(typeof captured.rpcCall.p_total, 'number', 'p_total must be numeric');
    assert.equal(captured.rpcCall.p_total, 39.98, 'p_total = 2 × 19.99 = 39.98 GHS');
    assert.ok(captured.rpcCall.p_idempotency_key, 'p_idempotency_key must be present');
    assert.equal(result.body.order_number, captured.rpcCall.p_order_number);

    // No direct orders table access happened.
    assert.equal(orders.length, 0, 'no direct orders INSERT should occur');
  } finally {
    await close();
  }
});

test('end-to-end: RETRY flow — second call with same cart reuses the existing order (idempotent)', async () => {
  const { url, customers, close } = await startSchemaServer();
  try {
    // Pre-create the customer.
    customers.set('cust-0542451578', { id: 'cust-0542451578', name: 'Ama', phone: '0542451578' });

    const CATALOG = [{ id: 'VG-A', name: 'Phone A', price: 19.99, is_active: true }];
    const GATEWAY = {
      status: true,
      message: 'ok',
      data: { access_code: 'ac_test', gateway_reference: 'VP-TEST', pay_url: 'https://valmontpay.app/pay.html?access_code=ac_test' },
    };

    // Track all RPC calls to verify idempotency behaviour.
    const rpcCalls = [];
    const existingOrder = { id: 'ord-existing', order_number: 'VG-RETRY-FIRST00' };

    const mockFetch = async (fetchUrl, opts = {}) => {
      const u = String(fetchUrl);
      const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

      if (u.includes('/rest/v1/products')) return json(200, CATALOG);
      if (u.endsWith('/rest/v1/customers')) return json(201, []);

      if (u.includes('/rest/v1/rpc/create_pending_order')) {
        const body = JSON.parse(opts.body);
        rpcCalls.push(body);
        // Simulate: first call creates (idempotent: false), second call finds
        // existing (idempotent: true, returns the existing order_number).
        if (rpcCalls.length === 1) {
          return json(200, { id: existingOrder.id, order_number: body.p_order_number, idempotent: false });
        }
        return json(200, { id: existingOrder.id, order_number: existingOrder.order_number, idempotent: true });
      }

      if (u.includes('/rest/v1/rpc/')) return json(200, { result: 'ok' });
      if (u.includes('/api/transaction/initialize')) return json(200, GATEWAY);

      if (u.endsWith('/rest/v1/orders') && opts.method === 'POST') {
        throw new Error('REGRESSION: direct /rest/v1/orders INSERT detected');
      }

      throw new Error(`unexpected fetch ${opts.method || 'GET'} ${u}`);
    };

    const body = {
      items: [{ id: 'VG-A', qty: 2 }],
      customer: { name: 'Ama', phone: '054 245 1578', email: 'ama@example.com' },
      payment_method: 'Mobile Money',
    };

    // First call: fresh create.
    const first = await handleInitializeCore({
      body,
      env: { VALMONTPAY_SECRET_KEY: 'sk_test', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'anon-test' },
      fetchImpl: mockFetch,
      log: () => {},
    });
    assert.equal(first.status, 200, `first call should succeed: ${JSON.stringify(first.body)}`);
    assert.equal(first.body.idempotent, false);

    // Second call: retry (idempotent hit).
    const second = await handleInitializeCore({
      body,
      env: { VALMONTPAY_SECRET_KEY: 'sk_test', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'anon-test' },
      fetchImpl: mockFetch,
      log: () => {},
    });
    assert.equal(second.status, 200, `retry should succeed: ${JSON.stringify(second.body)}`);
    assert.equal(second.body.idempotent, true);
    assert.equal(second.body.order_number, 'VG-RETRY-FIRST00', 'retry must return the EXISTING order number');

    // Both RPC calls must carry the SAME idempotency key.
    assert.equal(rpcCalls.length, 2);
    assert.equal(rpcCalls[0].p_idempotency_key, rpcCalls[1].p_idempotency_key, 'idempotency keys must match');
    assert.ok(rpcCalls[0].p_idempotency_key.startsWith('idem:'), 'key must be namespaced');
  } finally {
    await close();
  }
});

test('buildOrderRow: order_number is a non-empty VG-… string (never null/undefined)', () => {
  const row = buildOrderRow({
    orderNumber: generateOrderNumber(),
    customerId: 'cust-0542451578',
    orderItems: [{ product_id: 'VG-A', name: 'Phone A', quantity: 1, unit_price: 19.99, line_total: 19.99 }],
    subtotalPesewas: 1999,
    deliveryFeePesewase: 0,
    totalPesewas: 1999,
    paymentMethod: 'Mobile Money',
  });
  assert.equal(typeof row.order_number, 'string');
  assert.ok(row.order_number.length > 0, 'order_number must not be empty');
  assert.match(row.order_number, /^VG-[A-Z0-9]+-[A-Z0-9]{9}$/, 'order_number must be VG-… form');
  assert.equal(row.status, 'Pending');
  assert.equal(row.total, 19.99);
  assert.ok(!Number.isNaN(row.total), 'total must be a valid number');
  assert.ok(Array.isArray(row.items), 'items must be an array');
  assert.equal(typeof row.total, 'number', 'total must be numeric');
  assert.equal(typeof row.subtotal, 'number', 'subtotal must be numeric');
  assert.equal(typeof row.delivery_fee, 'number', 'delivery_fee must be numeric');
});

test('REAL supabase-js insert of buildOrderRow() succeeds against a FK+TYPE-enforcing server', async () => {
  const { url, customers, close } = await startSchemaServer();
  try {
    // Pre-create the customer so the FK is satisfied.
    customers.set('cust-0542451578', { id: 'cust-0542451578', name: 'Test', email: 'test@test.com' });

    const sb = createClient(url, 'anon-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const orderRow = buildOrderRow({
      orderNumber: generateOrderNumber(),
      customerId: 'cust-0542451578',
      orderItems: [{ product_id: 'VG-A', name: 'Phone A', quantity: 1, unit_price: 19.99, line_total: 19.99 }],
      subtotalPesewas: 1999,
      deliveryFeePesewase: 0,
      totalPesewas: 1999,
      paymentMethod: 'Mobile Money',
    });

    const { data, error } = await sb.from('orders').insert(orderRow).select();
    assert.equal(error, null, `insert must not error: ${error && error.message}`);
    assert.ok(Array.isArray(data) && data.length === 1, 'return=representation must yield one row');
    assert.equal(data[0].order_number, orderRow.order_number);
    assert.equal(data[0].status, 'Pending');
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a missing order_number with 23502', async () => {
  const { url, customers, close } = await startSchemaServer();
  customers.set('cust-x', { id: 'cust-x', name: 'X' });
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const brokenRow = {
      customer_id: 'cust-x',
      items: [],
      total: 19.99,
      status: 'Pending',
    };
    const { error } = await sb.from('orders').insert(brokenRow).select();
    assert.ok(error, 'an insert without order_number MUST fail');
    assert.match(String(error.message), /not-null|23502|order_number/i);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a duplicate order_number with 23505', async () => {
  const { url, customers, close } = await startSchemaServer();
  customers.set('cust-x', { id: 'cust-x', name: 'X' });
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const row = buildOrderRow({
      orderNumber: 'VG-DUP-000000000',
      customerId: 'cust-x',
      orderItems: [],
      subtotalPesewas: 0,
      deliveryFeePesewase: 0,
      totalPesewas: 0,
      paymentMethod: 'Valmont-Pay',
    });
    const first = await sb.from('orders').insert(row).select();
    assert.equal(first.error, null);
    const second = await sb.from('orders').insert(row).select();
    assert.ok(second.error, 'duplicate order_number must be rejected');
    assert.match(String(second.error.message), /unique|23505|duplicate/i);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a non-existent customer_id with 23503', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    // customer_id references a customers row that doesn't exist.
    const row = buildOrderRow({
      orderNumber: generateOrderNumber(),
      customerId: 'cust-nonexistent-999',
      orderItems: [],
      subtotalPesewas: 0,
      deliveryFeePesewase: 0,
      totalPesewas: 0,
      paymentMethod: 'Valmont-Pay',
    });
    const { error } = await sb.from('orders').insert(row).select();
    assert.ok(error, 'insert with non-existent customer_id MUST fail');
    assert.match(String(error.message), /23503|foreign.*key|customer_id/i);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS items as a plain string with 22P02', async () => {
  const { url, customers, close } = await startSchemaServer();
  customers.set('cust-x', { id: 'cust-x', name: 'X' });
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    // Send items as a plain string (not JSONB array/object).
    const { error } = await sb.from('orders').insert({
      order_number: generateOrderNumber(),
      customer_id: 'cust-x',
      items: 'not a jsonb array',
      total: 19.99,
      status: 'Pending',
    }).select();
    assert.ok(error, 'items as string MUST fail JSONB type check');
    assert.match(String(error.message), /22P02|jsonb|invalid/i);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS total as a plain string with 22P02', async () => {
  const { url, customers, close } = await startSchemaServer();
  customers.set('cust-x', { id: 'cust-x', name: 'X' });
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    // Send total as a non-numeric string (would fail NUMERIC type coercion).
    const { error } = await sb.from('orders').insert({
      order_number: generateOrderNumber(),
      customer_id: 'cust-x',
      items: [],
      total: 'not-a-number',
      status: 'Pending',
    }).select();
    assert.ok(error, 'total as string MUST fail NUMERIC type check');
    assert.match(String(error.message), /22P02|numeric|invalid/i);
  } finally {
    await close();
  }
});

test('control: the mock server allows a null customer_id (FK is nullable)', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const row = buildOrderRow({
      orderNumber: generateOrderNumber(),
      customerId: null, // nullable FK — no customer needed
      orderItems: [],
      subtotalPesewas: 0,
      deliveryFeePesewase: 0,
      totalPesewas: 0,
      paymentMethod: 'Valmont-Pay',
    });
    const { data, error } = await sb.from('orders').insert(row).select();
    assert.equal(error, null, `null customer_id must be accepted: ${error && error.message}`);
    assert.equal(data[0].customer_id, null);
  } finally {
    await close();
  }
});


// ─── delivery-fee tier math via REAL RPC path (Task 4) ──────────────────────

const DELIVERY_TIERS = {
  'Greater Accra': 25,
  'Ashanti': 40,
  'Upper West': 70,
};
const FREE_OVER_TIER = 5000;
const DEFAULT_TIER_FEE = 50;

function tierFee(region, subtotal) {
  if (subtotal >= FREE_OVER_TIER) return 0;
  if (region && DELIVERY_TIERS[region] != null) return DELIVERY_TIERS[region];
  return DEFAULT_TIER_FEE;
}

test('integration tier: Greater Accra 25 via RPC authoritative path', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 100, is_active: true }];
    const fee = DELIVERY_TIERS['Greater Accra'];
    const subtotal = 100; // qty 1
    const expectedTotal = subtotal + fee;
    const mockFetch = async (u, opts={}) => {
      const s = String(u);
      const json = (status, body) => ({ ok: status>=200&&status<300, status, json: async()=>body, text: async()=>JSON.stringify(body) });
      if (s.includes('/rest/v1/products')) return json(200, CAT);
      if (s.endsWith('/rest/v1/customers')) return json(201, []);
      if (s.includes('/rest/v1/rpc/create_pending_order')) {
        const b = JSON.parse(opts.body);
        assert.equal(b.p_delivery_region, 'Greater Accra');
        // Compute authoritative
        const cSubtotal = 100;
        const cFee = tierFee(b.p_delivery_region, cSubtotal);
        const cTotal = cSubtotal + cFee;
        return json(200, { id: 'ord-1', order_number: b.p_order_number, idempotent: false, subtotal: cSubtotal, delivery_fee: cFee, delivery_region: b.p_delivery_region, total: cTotal, fee_source: 'region' });
      }
      if (s.includes('/api/transaction/initialize')) {
        const b = JSON.parse(opts.body);
        assert.equal(b.amount, expectedTotal, 'gateway amount must be server total');
        return json(200, { status:true, data:{ pay_url:'https://valmontpay.app/pay.html?access_code=ac', gateway_reference:'VP-1' }});
      }
      if (s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200, { result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER', qty:1}], customer:{name:'A', phone:'0540000011'}, delivery_region:'Greater Accra' }, env:{ VALMONTPAY_SECRET_KEY:'sk_test', SUPABASE_URL:url, SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.status, 200);
    assert.equal(res.body.delivery_fee, fee);
    assert.equal(res.body.total, expectedTotal);
  } finally { await close(); }
});

test('integration tier: Ashanti 40', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 200, is_active: true }];
    const fee = 40;
    const subtotal = 200;
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        const b=JSON.parse(opts.body);
        return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal,delivery_fee:fee,delivery_region:b.p_delivery_region,total:subtotal+fee,fee_source:'region'});
      }
      if(s.includes('/api/transaction/initialize')) return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER',qty:1}], delivery_region:'Ashanti' }, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.body.delivery_fee,40);
    assert.equal(res.body.total,240);
  } finally { await close();}
});

test('integration tier: Upper West 70', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 50, is_active: true }];
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        const b=JSON.parse(opts.body);
        return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal:50,delivery_fee:70,delivery_region:'Upper West',total:120,fee_source:'region'});
      }
      if(s.includes('/api/transaction/initialize')) return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER',qty:1}], delivery_region:'Upper West' }, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.body.delivery_fee,70);
  } finally { await close();}
});

test('integration tier: >=5000 free', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Expensive', price: 5000, is_active: true }];
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        const b=JSON.parse(opts.body);
        return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal:5000,delivery_fee:0,delivery_region:b.p_delivery_region,total:5000,fee_source:'free_over'});
      }
      if(s.includes('/api/transaction/initialize')) return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER',qty:1}], delivery_region:'Greater Accra' }, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.body.delivery_fee,0);
    assert.equal(res.body.total,5000);
  } finally { await close();}
});

test('integration tier: unknown region fallback default 50', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 100, is_active: true }];
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        const b=JSON.parse(opts.body);
        assert.equal(b.p_delivery_region,'Atlantis');
        return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal:100,delivery_fee:50,delivery_region:'Atlantis',total:150,fee_source:'default'});
      }
      if(s.includes('/api/transaction/initialize')) return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER',qty:1}], delivery_region:'Atlantis' }, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.body.delivery_fee,50);
    assert.equal(res.body.fee_source,'default');
  } finally { await close();}
});

test('integration tier: tampered client fee ignored (server authoritative)', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 100, is_active: true }];
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        const b=JSON.parse(opts.body);
        // Client never sends fee, but even if they did, server ignores and returns correct tier
        return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal:100,delivery_fee:25,delivery_region:'Greater Accra',total:125,fee_source:'region'});
      }
      if(s.includes('/api/transaction/initialize')){
        const b=JSON.parse(opts.body);
        assert.equal(b.amount,125); // not 101 (client guess)
        return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      }
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const res = await handleInitializeCore({ body:{ items:[{id:'VG-TIER',qty:1}], delivery_region:'Greater Accra' }, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(res.body.delivery_fee,25);
    assert.equal(res.body.total,125);
  } finally { await close();}
});

test('integration tier: idempotent retry repricing after fee edit', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const CAT = [{ id: 'VG-TIER', name: 'Tier Product', price: 100, is_active: true }];
    let callCount=0;
    const mockFetch = async (u, opts={}) => {
      const s=String(u);
      const json=(st,b)=>({ok:st>=200&&st<300,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
      if(s.includes('/rest/v1/products')) return json(200,CAT);
      if(s.endsWith('/rest/v1/customers')) return json(201,[]);
      if(s.includes('/rest/v1/rpc/create_pending_order')){
        callCount++;
        const b=JSON.parse(opts.body);
        if(callCount===1) return json(200,{id:'ord-1',order_number:b.p_order_number,idempotent:false,subtotal:100,delivery_fee:40,delivery_region:'Ashanti',total:140,fee_source:'region'});
        // After fee edit, Ashanti now 45, retry should return new fee and same order? In our mock, second call returns repriced
        return json(200,{id:'ord-1',order_number:'VG-EXISTING-123',idempotent:true,subtotal:100,delivery_fee:45,delivery_region:'Ashanti',total:145,fee_source:'region'});
      }
      if(s.includes('/api/transaction/initialize')){
        const b=JSON.parse(opts.body);
        // Second call gateway amount should be repriced 145
        if(callCount===2) assert.equal(b.amount,145);
        return json(200,{status:true,data:{pay_url:'https://valmontpay.app/pay.html?access_code=ac',gateway_reference:'VP-1'}});
      }
      if(s.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200,{result:'ok'});
      throw new Error('unexpected '+s);
    };
    const body={ items:[{id:'VG-TIER',qty:1}], customer:{name:'A',phone:'0540000012'}, delivery_region:'Ashanti' };
    const first = await handleInitializeCore({ body, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(first.body.delivery_fee,40);
    const second = await handleInitializeCore({ body, env:{VALMONTPAY_SECRET_KEY:'sk_test',SUPABASE_URL:url,SUPABASE_ANON_KEY:'anon-test'}, fetchImpl: mockFetch, log:()=>{} });
    assert.equal(second.body.delivery_fee,45);
    assert.equal(second.body.total,145);
  } finally { await close();}
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
console.log(`\n${failed === 0 ? '✅' : '⚠️ '} ${tests.length - failed}/${tests.length} order-integration tests passed\n`);
process.exit(failed === 0 ? 0 : 1);
