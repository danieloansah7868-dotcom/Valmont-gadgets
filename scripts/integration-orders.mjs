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
 *      NOT NULL / UNIQUE constraints declared on public.orders
 *      (copied verbatim from supabase/migrations/init.sql).
 *   2. Drives it with the REAL @supabase/supabase-js client (the same
 *      library the serverless endpoint could use), so URL encoding,
 *      headers, Prefer handling and JSON serialization are production-true.
 *   3. Inserts the exact row shape the handler builds (via buildOrderRow),
 *      proving order_number is always present and non-null.
 *   4. Also runs a control assertion: a payload WITHOUT order_number is
 *      rejected — proving the mock actually enforces the constraint, so a
 *      regression that drops the key cannot pass silently.
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
// Mirrors the constraints that matter for the pending-order insert:
//
//   order_number TEXT UNIQUE NOT NULL
//   total        NUMERIC NOT NULL DEFAULT 0
//
// (Copied from supabase/migrations/init.sql and part1_tables.sql.)
function startSchemaServer() {
  const rows = [];
  const seenOrderNumbers = new Set();

  const server = http.createServer((req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.method !== 'POST' || !req.url.startsWith('/rest/v1/orders')) {
      return send(404, { message: `no route ${req.method} ${req.url}` });
    }

    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch (e) {
        return send(400, { code: '22P02', message: 'invalid JSON' });
      }

      // ── NOT NULL enforcement (SQLSTATE 23502) ──────────────────────────
      // These are the exact columns declared NOT NULL without a default in
      // the orders table. order_number is the one that bit production.
      for (const col of ['order_number']) {
        if (body[col] === undefined || body[col] === null || String(body[col]).trim() === '') {
          return send(400, {
            code: '23502',
            message: `null value in column "${col}" of relation "orders" violates not-null constraint`,
            details: { column: col },
          });
        }
      }

      // `total` is NOT NULL but has DEFAULT 0, so a missing key is filled
      // by Postgres. Mirror that: only an explicit null is rejected.
      if (body.total === null) {
        return send(400, {
          code: '23502',
          message: 'null value in column "total" of relation "orders" violates not-null constraint',
        });
      }

      // ── UNIQUE on order_number (SQLSTATE 23505) ────────────────────────
      if (seenOrderNumbers.has(body.order_number)) {
        return send(409, {
          code: '23505',
          message: `duplicate key value violates unique constraint "orders_order_number_key"`,
        });
      }
      seenOrderNumbers.add(body.order_number);

      const stored = {
        id: `ord-${rows.length + 1}`,
        order_number: body.order_number,
        customer_id: body.customer_id ?? null,
        items: body.items ?? [],
        subtotal: body.subtotal ?? 0,
        delivery_fee: body.delivery_fee ?? 0,
        total: body.total ?? 0,
        status: body.status ?? 'Pending',
        payment_method: body.payment_method ?? null,
      };
      rows.push(stored);

      // The handler sends Prefer: return=representation; echo the row.
      const prefer = req.headers.prefer || '';
      if (prefer.includes('return=representation')) {
        return send(201, [stored]);
      }
      return send(201, {});
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        rows,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('end-to-end: handleInitializeCore issues an order_number that round-trips through REAL supabase-js insert', async () => {
  // A single schema-enforcing server backs both the handler's raw fetch
  // calls (products lookup, customers upsert, orders INSERT, RPC) AND the
  // real supabase-js re-insert below. The handler's catalog/gateway calls
  // are answered by a mock fetch; the orders POST is what we re-play.
  const { url, rows, close } = await startSchemaServer();
  try {
    const captured = { orderInsert: null };
    const CATALOG = [{ id: 'VG-A', name: 'Phone A', price: 19.99, is_active: true }];
    const GATEWAY = {
      status: true,
      message: 'ok',
      data: { access_code: 'ac_test', gateway_reference: 'VP-TEST', pay_url: 'https://valmontpay.app/pay.html?access_code=ac_test' },
    };

    // Mock fetch answers every non-orders route; the orders POST is left
    // to the real schema server so the 23502 constraint actually fires.
    const mockFetch = async (fetchUrl, opts = {}) => {
      const u = String(fetchUrl);
      const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
      if (u.includes('/rest/v1/products')) return json(200, CATALOG);
      if (u.endsWith('/rest/v1/customers')) return json(201, []);
      if (u.includes('/rest/v1/rpc/')) return json(200, { result: 'ok' });
      if (u.includes('/api/transaction/initialize')) return json(200, GATEWAY);
      // Orders INSERT: record the exact bytes the handler sent, then let the
      // real schema server enforce NOT NULL by forwarding to it.
      if (u.endsWith('/rest/v1/orders')) {
        captured.orderInsert = JSON.parse(opts.body);
        const upstream = await fetch(`${url}/rest/v1/orders`, {
          method: 'POST',
          headers: opts.headers,
          body: opts.body,
        });
        return { ok: upstream.ok, status: upstream.status, json: () => upstream.json(), text: () => upstream.text() };
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
    assert.ok(captured.orderInsert, 'handler must POST /rest/v1/orders');
    assert.equal(typeof captured.orderInsert.order_number, 'string', 'the order POST must carry order_number as a string');
    assert.ok(captured.orderInsert.order_number.startsWith('VG-'), 'order_number must be VG-… form');
    assert.equal(rows.length, 1, 'schema server must have accepted the row');
    assert.equal(rows[0].order_number, captured.orderInsert.order_number);

    // Now re-insert the EXACT payload the handler built through the real
    // supabase-js client against the same enforcing server. If a future
    // change renames/drops order_number inside buildOrderRow, this call
    // returns a 23502 error and the test fails — exactly the production
    // bug, caught before deploy.
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const replay = await sb
      .from('orders')
      .insert({ ...captured.orderInsert, order_number: generateOrderNumber() }) // fresh unique key
      .select();
    assert.equal(replay.error, null, `supabase-js re-insert must accept the handler's payload shape: ${replay.error && replay.error.message}`);
    assert.equal(rows.length, 2);
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
    deliveryFeePesewas: 0,
    totalPesewas: 1999,
    paymentMethod: 'Mobile Money',
  });
  assert.equal(typeof row.order_number, 'string');
  assert.ok(row.order_number.length > 0, 'order_number must not be empty');
  assert.match(row.order_number, /^VG-[A-Z0-9]+-[A-Z0-9]{9}$/, 'order_number must be VG-… form');
  assert.equal(row.status, 'Pending');
  assert.equal(row.total, 19.99);
});

test('REAL supabase-js insert of buildOrderRow() succeeds against a NOT-NULL-enforcing server', async () => {
  const { url, rows, close } = await startSchemaServer();
  try {
    // This is the genuine supabase-js client — same fetch/headers/serialization
    // path a real service would use.
    const sb = createClient(url, 'anon-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const orderRow = buildOrderRow({
      orderNumber: generateOrderNumber(),
      customerId: 'cust-0542451578',
      orderItems: [{ product_id: 'VG-A', name: 'Phone A', quantity: 1, unit_price: 19.99, line_total: 19.99 }],
      subtotalPesewas: 1999,
      deliveryFeePesewas: 0,
      totalPesewas: 1999,
      paymentMethod: 'Mobile Money',
    });

    const { data, error } = await sb.from('orders').insert(orderRow).select();
    assert.equal(error, null, `insert must not error: ${error && error.message}`);
    assert.ok(Array.isArray(data) && data.length === 1, 'return=representation must yield one row');
    assert.equal(data[0].order_number, orderRow.order_number);
    assert.equal(data[0].status, 'Pending');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].order_number, orderRow.order_number);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a missing order_number with 23502 (so the test above is meaningful)', async () => {
  const { url, rows, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Deliberately omit order_number — this is the production failure shape.
    const brokenRow = {
      customer_id: 'cust-0542451578',
      items: [],
      total: 19.99,
      status: 'Pending',
    };
    const { error } = await sb.from('orders').insert(brokenRow).select();
    assert.ok(error, 'an insert without order_number MUST fail');
    assert.match(String(error.message), /not-null|23502|order_number/i);
    assert.equal(rows.length, 0, 'no row should have been persisted');
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a duplicate order_number with 23505', async () => {
  const { url, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const row = buildOrderRow({
      orderNumber: 'VG-DUP-000000000',
      customerId: 'cust-x',
      orderItems: [],
      subtotalPesewas: 0,
      deliveryFeePesewas: 0,
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
