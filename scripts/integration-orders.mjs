#!/usr/bin/env node
/**
 * Integration tests for the pending-order creation path.
 *
 * The production endpoint uses the SECURITY DEFINER
 * `create_pending_order(...)` RPC rather than a direct table INSERT.  This
 * harness still models the old direct PostgREST path because that is the
 * regression that shipped: an INSERT with `Prefer: return=representation`
 * can be rejected by orders SELECT RLS even though the INSERT itself is
 * allowed.  A mock that always echoed a row body could never catch that.
 *
 * The tests:
 *   1. Drive the handler and a create_pending_order RPC stand-in with the
 *      real @supabase/supabase-js client available for replay.
 *   2. Enforce the orders NOT NULL / UNIQUE constraints.
 *   3. Explicitly model "INSERT ok, RETURNING denied" (HTTP 401 / SQLSTATE
 *      42501) and prove headers-only/minimal INSERT remains successful.
 *   4. Check that the checked-in SQL contains the live pg_policies assertions
 *      that keep orders SELECT-less for anon.
 *
 * It does NOT touch the live Supabase project; it is hermetic and safe in CI.
 *
 *   npm run test:integration
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import {
  buildCreatePendingOrderArgs,
  buildOrderRow,
  generateOrderNumber,
  handleInitializeCore,
} from '../api/valmontpay/initialize.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const SQL_MIGRATION = readFileSync(
  new URL('../supabase/migrations/20260806_create_pending_order.sql', import.meta.url),
  'utf8',
);

// ─── Schema-validating PostgREST stand-in ───────────────────────────────────
// Mirrors the constraints that matter for public.orders:
//
//   order_number TEXT UNIQUE NOT NULL
//   total        NUMERIC NOT NULL DEFAULT 0
//
// `returningDenied` represents the real RLS shape: a direct INSERT is allowed,
// but the SELECT needed for `return=representation` is denied for anon.
function startSchemaServer({ returningDenied = false } = {}) {
  const rows = [];
  const seenOrderNumbers = new Set();

  const send = (res, status, obj) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  function validateAndStoreOrder(body) {
    for (const col of ['order_number']) {
      if (body[col] === undefined || body[col] === null || String(body[col]).trim() === '') {
        return {
          status: 400,
          body: {
            code: '23502',
            message: `null value in column "${col}" of relation "orders" violates not-null constraint`,
            details: { column: col },
          },
        };
      }
    }

    // `total` is NOT NULL but has DEFAULT 0, so a missing key is filled by
    // Postgres. Mirror that: only an explicit null is rejected.
    if (body.total === null) {
      return {
        status: 400,
        body: {
          code: '23502',
          message: 'null value in column "total" of relation "orders" violates not-null constraint',
        },
      };
    }

    if (seenOrderNumbers.has(body.order_number)) {
      return {
        status: 409,
        body: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "orders_order_number_key"',
        },
      };
    }

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
    seenOrderNumbers.add(body.order_number);
    rows.push(stored);
    return { status: 201, body: stored };
  }

  const server = http.createServer((req, res) => {
    const path = String(req.url || '').split('?')[0];
    if (req.method !== 'POST') return send(res, 404, { message: `no route ${req.method} ${req.url}` });
    if (!['/rest/v1/orders', '/rest/v1/rpc/create_pending_order', '/rest/v1/customers'].includes(path)) {
      return send(res, 404, { message: `no route ${req.method} ${req.url}` });
    }

    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch (_) {
        return send(res, 400, { code: '22P02', message: 'invalid JSON' });
      }

      if (path === '/rest/v1/customers') return send(res, 201, {});

      if (path === '/rest/v1/rpc/create_pending_order') {
        const rpcBody = {
          order_number: body.p_order_number,
          customer_id: body.p_customer_id,
          items: body.p_items,
          subtotal: body.p_subtotal,
          delivery_fee: body.p_delivery_fee,
          total: body.p_total,
          status: 'Pending',
          payment_method: body.p_payment_method,
        };
        const inserted = validateAndStoreOrder(rpcBody);
        if (inserted.status !== 201) return send(res, inserted.status, inserted.body);
        return send(res, 200, { id: inserted.body.id, order_number: inserted.body.order_number });
      }

      const inserted = validateAndStoreOrder(body);
      if (inserted.status !== 201) return send(res, inserted.status, inserted.body);

      const prefer = String(req.headers.prefer || '');
      if (returningDenied && prefer.includes('return=representation')) {
        // The row write was accepted, but PostgREST cannot expose the returned
        // row without a matching SELECT policy for anon.
        return send(res, 401, {
          code: '42501',
          message: 'new row violates row-level security policy for table orders',
        });
      }
      if (prefer.includes('return=representation')) return send(res, 201, [inserted.body]);
      return send(res, 201, {});
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

function orderFixture(orderNumber = generateOrderNumber()) {
  return buildOrderRow({
    orderNumber,
    customerId: 'cust-0542451578',
    orderItems: [{ product_id: 'VG-A', name: 'Phone A', quantity: 1, unit_price: 19.99, line_total: 19.99 }],
    subtotalPesewas: 1999,
    deliveryFeePesewas: 0,
    totalPesewas: 1999,
    paymentMethod: 'Mobile Money',
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('end-to-end: initialize creates the order through RPC and returns its identity', async () => {
  const { url, rows, close } = await startSchemaServer();
  try {
    const captured = { rpcArgs: null, directOrderPost: false };
    const CATALOG = [{ id: 'VG-A', name: 'Phone A', price: 19.99, is_active: true }];
    const GATEWAY = {
      status: true,
      message: 'ok',
      data: { access_code: 'ac_test', gateway_reference: 'VP-TEST', pay_url: 'https://valmontpay.app/pay.html?access_code=ac_test' },
    };

    const mockFetch = async (fetchUrl, opts = {}) => {
      const u = String(fetchUrl);
      const json = (status, body) => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
      });
      if (u.includes('/rest/v1/products')) return json(200, CATALOG);
      if (u.endsWith('/rest/v1/customers')) return json(201, {});
      if (u.endsWith('/rest/v1/orders')) {
        captured.directOrderPost = true;
        return json(500, { code: 'TEST', message: 'direct orders POST must not be used' });
      }
      if (u.endsWith('/rest/v1/rpc/create_pending_order')) {
        captured.rpcArgs = JSON.parse(opts.body);
        const upstream = await fetch(`${url}/rest/v1/rpc/create_pending_order`, {
          method: 'POST',
          headers: opts.headers,
          body: opts.body,
        });
        return {
          ok: upstream.ok,
          status: upstream.status,
          json: () => upstream.json(),
          text: () => upstream.text(),
        };
      }
      if (u.includes('/rest/v1/rpc/set_order_payment_reference')) return json(200, { result: 'ok' });
      if (u.includes('/api/transaction/initialize')) return json(200, GATEWAY);
      throw new Error(`unexpected fetch ${opts.method || 'GET'} ${u}`);
    };

    const result = await handleInitializeCore({
      body: {
        items: [{ id: 'VG-A', qty: 2 }],
        customer: { name: 'Ama', phone: '054 245 1578', email: 'ama@example.com' },
        payment_method: 'Mobile Money',
      },
      env: { VALMONTPAY_SECRET_KEY: 'sk_test', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'anon-test' },
      fetchImpl: mockFetch,
      log: () => {},
    });

    assert.equal(result.status, 200, `initialize should succeed: ${JSON.stringify(result.body)}`);
    assert.ok(captured.rpcArgs, 'handler must call create_pending_order');
    assert.equal(captured.directOrderPost, false, 'handler must never direct-insert orders');
    assert.equal(typeof captured.rpcArgs.p_order_number, 'string');
    assert.ok(captured.rpcArgs.p_order_number.startsWith('VG-'));
    assert.equal(captured.rpcArgs.p_total, 39.98);
    assert.equal(captured.rpcArgs.p_items.length, 1);
    assert.equal(rows.length, 1, 'RPC stand-in must have accepted the row');
    assert.equal(result.body.order_number, captured.rpcArgs.p_order_number);
    assert.equal(result.body.order_id, rows[0].id);

    // Replay the same RPC call through the real supabase-js client. This
    // verifies PostgREST RPC URL/body serialization without SELECT on orders.
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const replay = await sb.rpc('create_pending_order', {
      ...captured.rpcArgs,
      p_order_number: generateOrderNumber(),
    });
    assert.equal(replay.error, null, `supabase-js RPC must succeed: ${replay.error && replay.error.message}`);
    assert.equal(typeof replay.data.id, 'string');
    assert.equal(replay.data.order_number.startsWith('VG-'), true);
    assert.equal(rows.length, 2);
  } finally {
    await close();
  }
});

test('buildOrderRow/buildCreatePendingOrderArgs keep the validated identity and totals', () => {
  const row = orderFixture();
  const args = buildCreatePendingOrderArgs(row);
  assert.equal(typeof row.order_number, 'string');
  assert.match(row.order_number, /^VG-[A-Z0-9]+-[A-Z0-9]{9}$/);
  assert.equal(row.status, 'Pending');
  assert.equal(row.total, 19.99);
  assert.equal(args.p_order_number, row.order_number);
  assert.equal(args.p_total, row.total);
  assert.deepEqual(args.p_items, row.items);
});

test('REAL supabase-js RPC returns id/order_number without selecting from orders', async () => {
  const { url, rows, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const row = orderFixture();
    const result = await sb.rpc('create_pending_order', buildCreatePendingOrderArgs(row));
    assert.equal(result.error, null, `RPC must not error: ${result.error && result.error.message}`);
    assert.deepEqual(result.data, { id: 'ord-1', order_number: row.order_number });
    assert.equal(rows.length, 1);
  } finally {
    await close();
  }
});

test('regression: INSERT succeeds but return=representation is denied with 42501; minimal succeeds', async () => {
  const { url, rows, close } = await startSchemaServer({ returningDenied: true });
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const representation = await sb.from('orders').insert(orderFixture()).select();
    assert.ok(representation.error, 'returning a row must be denied without anon SELECT policy');
    assert.match(String(representation.error.message), /42501|row-level security/i);
    assert.equal(rows.length, 1, 'the mock must model an accepted INSERT before RETURNING is denied');

    const minimal = await sb.from('orders').insert(orderFixture()).select(undefined, { head: true });
    // supabase-js still asks for representation when `.select()` is called;
    // use a fresh client request without `.select()` for the headers-only path.
    assert.ok(minimal.error, 'head/select representation should remain denied');
    const headersOnly = await sb.from('orders').insert(orderFixture());
    assert.equal(headersOnly.error, null, `headers-only INSERT must succeed: ${headersOnly.error && headersOnly.error.message}`);
    assert.equal(rows.length, 3);
  } finally {
    await close();
  }
});

test('control: the mock server REJECTS a missing order_number with 23502', async () => {
  const { url, rows, close } = await startSchemaServer();
  try {
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const brokenRow = { customer_id: 'cust-0542451578', items: [], total: 19.99, status: 'Pending' };
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
    const sb = createClient(url, 'anon-test', { auth: { persistSession: false, autoRefreshToken: false } });
    const row = orderFixture('VG-DUP-000000000');
    const first = await sb.from('orders').insert(row).select();
    assert.equal(first.error, null);
    const second = await sb.from('orders').insert(row).select();
    assert.ok(second.error, 'duplicate order_number must be rejected');
    assert.match(String(second.error.message), /unique|23505|duplicate/i);
  } finally {
    await close();
  }
});

test('SQL migration asserts the live pg_policies set and grants the RPC', () => {
  assert.match(SQL_MIGRATION, /FROM\s+pg_policies/i);
  assert.match(SQL_MIGRATION, /orders\s+must have no anon\/PUBLIC table policy/i);
  assert.match(SQL_MIGRATION, /CREATE OR REPLACE FUNCTION\s+public\.create_pending_order/i);
  assert.match(SQL_MIGRATION, /REVOKE ALL ON FUNCTION public\.create_pending_order/i);
  assert.match(SQL_MIGRATION, /TO anon, authenticated, service_role/i);
  assert.match(SQL_MIGRATION, /cmd IN \('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'\)/i);
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
