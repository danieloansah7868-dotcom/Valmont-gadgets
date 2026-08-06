// Local smoke test: runs the real Edge handler functions against a local
// mock Supabase + mock Valmont-Pay gateway over actual HTTP fetch.
import http from 'node:http';
import { createHmac } from 'node:crypto';
import webhookHandler from '../api/valmontpay/webhook.js';
import initializeHandler from '../api/valmontpay/initialize.js';

const SECRET = 'smoke-webhook-secret';
const TENANT = 'valmont-gadget';
process.env.VALMONTPAY_WEBHOOK_SECRET = SECRET;
process.env.VALMONTPAY_SECRET_KEY = 'sk_smoke_tenant';

let orders = [];
let directOrderPosts = 0;
let rpcCalls = [];
let gatewayCalls = [];

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = req.url;
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (url.startsWith('/rest/v1/products')) {
      return send(200, [{ id: 'VG-A', name: 'Phone A', price: 19.99, is_active: true }]);
    }
    if (url.startsWith('/rest/v1/customers')) return send(201, []);
    if (url.startsWith('/rest/v1/orders')) {
      directOrderPosts++;
      return send(500, { code: 'TEST', message: 'direct orders POST must not be used' });
    }
    if (url.startsWith('/rest/v1/rpc/create_pending_order')) {
      const args = JSON.parse(raw);
      const order = {
        id: 'ord-1',
        order_number: args.p_order_number,
        customer_id: args.p_customer_id,
        items: args.p_items,
        subtotal: args.p_subtotal,
        delivery_fee: args.p_delivery_fee,
        total: args.p_total,
        status: 'Pending',
        payment_method: args.p_payment_method,
      };
      orders.push(order);
      return send(200, { id: order.id, order_number: order.order_number });
    }
    if (url.startsWith('/rest/v1/rpc/confirm_order_paid')) {
      rpcCalls.push(JSON.parse(raw));
      return send(200, { result: 'paid', order_number: JSON.parse(raw).p_reference });
    }
    if (url.startsWith('/rest/v1/rpc/set_order_payment_reference')) {
      return send(200, { result: 'ok' });
    }
    if (url.startsWith('/api/transaction/initialize')) {
      gatewayCalls.push({ auth: req.headers.authorization, body: JSON.parse(raw) });
      return send(200, {
        status: true,
        message: 'Transaction initialized successfully',
        data: {
          access_code: 'ac_smoke',
          reference: gatewayCalls.length ? 'VG-ORDER-1' : 'VG-ORDER-1',
          gateway_reference: 'VP-SMOKE-0001-ABCD1234',
          amount: JSON.parse(raw).amount,
          currency: 'GHS',
          pay_url: 'https://valmontpay.app/pay.html?access_code=ac_smoke',
          checkout_url: 'https://valmontpay.app/checkout.html?reference=VG-ORDER-1',
        },
      });
    }
    send(404, { message: 'no route ' + url });
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.VALMONTPAY_GATEWAY_URL = `http://127.0.0.1:${port}`;

let pass = 0, fail = 0;
const expect = (cond, label) => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${label}`); };

// ── initialize: full path ───────────────────────────────────────────────────
{
  const req = new Request('https://valmontgadgets.com/api/valmontpay/initialize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: 'VG-A', qty: 2 }],
      customer: { name: 'Smoke Tester', phone: '0542451578', email: 'smoke@example.com', area: 'Osu', street: '1 St', full_address: '1 St, Osu' },
      payment_method: 'Mobile Money',
    }),
  });
  const res = await initializeHandler(req);
  const body = await res.json();
  expect(res.status === 200, `initialize -> 200 (got ${res.status})`);
  expect(body.url === 'https://valmontpay.app/pay.html?access_code=ac_smoke', 'initialize returns hosted pay_url');
  expect(body.total === 39.98, `server recomputed total 39.98 from DB (got ${body.total})`);
  expect(gatewayCalls[0].auth === 'Bearer sk_smoke_tenant', 'gateway called with Bearer tenant secret');
  expect(gatewayCalls[0].body.amount === 39.98, 'gateway amount in cedis (39.98), not pesewas');
  expect(orders[0].status === 'Pending' && orders[0].total === 39.98, 'pending order recorded with DB total');
  expect(directOrderPosts === 0, 'initialize never direct-posts the orders table');
  expect(/^VG-/.test(body.order_number), `order_number issued (${body.order_number})`);
}

// ── webhook: signed charge.success marks Paid ───────────────────────────────
{
  const payload = JSON.stringify({
    event: 'charge.success',
    data: { reference: 'VG-ORDER-1', status: 'success', amount: 39.98, currency: 'GHS', channel: 'mobile_money', paid_at: new Date().toISOString(), merchant: TENANT, gateway_reference: 'VP-SMOKE-0001-ABCD1234' },
  });
  const req = new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-valmontpay-signature': createHmac('sha512', SECRET).update(payload).digest('hex'),
      'x-valmontpay-tenant': TENANT,
    },
    body: payload,
  });
  const res = await webhookHandler(req);
  const body = await res.json();
  expect(res.status === 200 && body.result === 'paid', `webhook charge.success -> 200 paid (got ${res.status} ${JSON.stringify(body)})`);
  expect(rpcCalls[0].p_expected_total === 39.98, 'RPC got pesewa-matched expected total');
}

// ── webhook: bad signature -> 401 ───────────────────────────────────────────
{
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'VG-ORDER-1', amount: 39.98 } });
  const req = new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-valmontpay-signature': 'ab'.repeat(64), 'x-valmontpay-tenant': TENANT },
    body: payload,
  });
  const res = await webhookHandler(req);
  expect(res.status === 401, `bad signature -> 401 (got ${res.status})`);
}

// ── webhook: wrong tenant -> 401 ────────────────────────────────────────────
{
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'VG-ORDER-1', amount: 39.98 } });
  const req = new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-valmontpay-signature': createHmac('sha512', SECRET).update(payload).digest('hex'),
      'x-valmontpay-tenant': 'another-tenant',
    },
    body: payload,
  });
  const res = await webhookHandler(req);
  expect(res.status === 401, `wrong tenant -> 401 (got ${res.status})`);
}

// ── webhook: ignored event -> fast 200 ──────────────────────────────────────
{
  const payload = JSON.stringify({ event: 'charge.failed', data: { reference: 'VG-ORDER-1', amount: 39.98 } });
  const req = new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-valmontpay-signature': createHmac('sha512', SECRET).update(payload).digest('hex'),
      'x-valmontpay-tenant': TENANT,
    },
    body: payload,
  });
  const res = await webhookHandler(req);
  const body = await res.json();
  expect(res.status === 200 && body.ignored === true, `charge.failed -> fast 200 ignored (got ${res.status})`);
}

// ── webhook: GET -> 405 ─────────────────────────────────────────────────────
{
  const res = await webhookHandler(new Request('https://valmontgadgets.com/api/valmontpay/webhook', { method: 'GET' }));
  expect(res.status === 405, `GET -> 405 (got ${res.status})`);
}

// ── webhook: UNSIGNED request -> bare 401 (manual check) ────────────────────
{
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'VG-ORDER-1', status: 'success', amount: 39.98 } });
  const res = await webhookHandler(new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: payload,
  }));
  expect(res.status === 401, `unsigned webhook -> bare 401 (got ${res.status})`);
}

// ── webhook: charge.success without data.status=success -> ignored ──────────
{
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'VG-ORDER-1', status: 'pending', amount: 39.98 } });
  const res = await webhookHandler(new Request('https://valmontgadgets.com/api/valmontpay/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-valmontpay-signature': createHmac('sha512', SECRET).update(payload).digest('hex'),
      'x-valmontpay-tenant': TENANT,
    },
    body: payload,
  }));
  const body = await res.json();
  expect(res.status === 200 && body.ignored === true, `data.status=pending -> 200 ignored (got ${res.status} ${JSON.stringify(body)})`);
}

// ── initialize: legacy client-priced request -> 410 Gone ────────────────────
{
  const res = await initializeHandler(new Request('https://valmontgadgets.com/api/valmontpay/initialize', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'VG-A', qty: 1 }], total_amount: 19.99 }),
  }));
  const body = await res.json();
  expect(res.status === 410, `legacy client-priced initialize -> 410 (got ${res.status})`);
  expect(/Gone/i.test(body.message || ''), '410 body explains retirement');
}

server.close();
console.log(`\n${fail === 0 ? '✅' : '⚠️'} smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
