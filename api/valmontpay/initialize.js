/**
 * POST /api/valmontpay/initialize — server-side Valmont-Pay tenant checkout.
 *
 * Tenant pattern (docs/tenant-integration.md in the Valmont-Pay gateway):
 *   - Tenant "TENANT_KEY" (LIVE) on https://valmontpay.app.
 *   - POST https://valmontpay.app/api/transaction/initialize with
 *     `Authorization: Bearer ${VALMONTPAY_SECRET_KEY}` and amounts in GHS
 *     cedis (major units — the gateway converts to pesewas at the Paystack
 *     wire boundary; never pre-multiply).
 *   - The response's `pay_url` (access_code flow) is the hosted checkout the
 *     browser is redirected to; the amount is resolved server-side there, so
 *     the customer can never edit it.
 *
 * This endpoint NEVER trusts client-sent amounts: it recomputes every unit
 * price from the Supabase `products` table, builds the totals in integer
 * pesewas, records the Pending order, then asks the gateway for a hosted
 * checkout and stores the returned VP-… reference on the order.
 *
 * Runtime: Vercel Edge Function (matches ./webhook.js).
 */

export const config = { runtime: 'edge' };

const GATEWAY_BASE = 'https://valmontpay.app';
const GATEWAY_INITIALIZE_PATH = '/api/transaction/initialize';
const CALLBACK_URL = 'https://valmontgadgets.com/order-confirmed.html';

/** Supabase project backing the storefront (same project app.js uses). */
const DEFAULT_SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
// The anon key is already public: it ships inside app.js/shop.min.js and is
// confined by RLS (anon can only read active products, INSERT orders/customers
// and call the two narrow payment RPCs). No service-role secret is required.
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const MAX_ITEMS = 50;
const MAX_QTY = 50;

// ─── Small helpers ──────────────────────────────────────────────────────────

/** Integer pesewas for a GHS major-unit price. Null when invalid. */
export function toPesewas(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** GH₵ 1234.5 -> "1,234.50" (for audit notes only). */
export function formatCedis(pesewas) {
  return (pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Unique, sortable order reference, e.g. VG-MB3K7Z1A-48213K9ZF. */
export function generateOrderNumber(now = Date.now()) {
  const rand = Math.floor(10000 + Math.random() * 90000);
  let suffix = '';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `VG-${now.toString(36).toUpperCase()}-${rand}${suffix}`;
}

function clampText(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

/**
 * Builds the exact JSON object POSTed to `POST /rest/v1/orders`.
 *
 * Exported so the integration test can insert the SAME payload shape through
 * real supabase-js (against a schema-validating mock server). The orders table
 * has `order_number TEXT UNIQUE NOT NULL` with no default, so any key rename
 * or missing value here would otherwise only surface in production as a 23502
 * not-null violation ("Could not record your order").
 *
 * @param {object} p
 * @param {string} p.orderNumber  Server-generated "VG-…" reference.
 * @returns {object} The POST body for the orders row (never mutated later).
 */
export function buildOrderRow({
  orderNumber,
  customerId,
  orderItems,
  subtotalPesewas,
  deliveryFeePesewas,
  totalPesewas,
  paymentMethod,
}) {
  return {
    order_number: orderNumber,
    customer_id: customerId,
    items: orderItems,
    subtotal: subtotalPesewas / 100,
    delivery_fee: deliveryFeePesewas / 100,
    total: totalPesewas / 100,
    status: 'Pending',
    payment_method: paymentMethod,
  };
}

// ─── Core handler (exported for unit tests) ─────────────────────────────────

/**
 * @param {object} deps
 * @param {object} deps.body  Parsed JSON request body.
 * @param {Record<string,string|undefined>} deps.env
 * @param {typeof fetch} deps.fetchImpl
 * @param {(msg: string) => void} [deps.log]
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleInitializeCore({ body, env, fetchImpl, log }) {
  const emit = log || (() => {});

  const secretKey = env.VALMONTPAY_SECRET_KEY;
  if (!secretKey) {
    emit('[VALMONTPAY-INIT] VALMONTPAY_SECRET_KEY is not configured');
    return { status: 500, body: { status: false, message: 'Payments are not configured. Please try again later.' } };
  }

  // ── 410 Gone: legacy client-priced requests ───────────────────────────────
  // The retired flow let clients dictate amounts. Any request still carrying
  // client-priced fields is refused with 410 so old callers fail loudly and
  // visibly instead of being silently re-priced.
  const LEGACY_PRICE_FIELDS = ['amount', 'total', 'total_amount', 'subtotal', 'price', 'unit_price', 'line_total'];
  if (body && typeof body === 'object') {
    const carried = LEGACY_PRICE_FIELDS.filter((k) => body[k] !== undefined && body[k] !== null);
    if (carried.length) {
      emit(`[VALMONTPAY-INIT] legacy client-priced request rejected (410): fields=${carried.join(',')}`);
      return {
        status: 410,
        body: {
          status: false,
          message: 'Gone: client-priced checkout has been retired. Amounts are computed server-side from the database — send items and quantities only.',
        },
      };
    }
    if (Array.isArray(body.items)) {
      const itemCarried = body.items.filter((i) => i && typeof i === 'object' && ['price', 'unit_price', 'retail', 'line_total', 'amount'].some((k) => i[k] !== undefined && i[k] !== null));
      if (itemCarried.length) {
        emit('[VALMONTPAY-INIT] legacy client-priced items rejected (410)');
        return {
          status: 410,
          body: {
            status: false,
            message: 'Gone: client-priced checkout has been retired. Amounts are computed server-side from the database — send items and quantities only.',
          },
        };
      }
    }
  }

  // ── Validate the request shape (never any amounts) ────────────────────────
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0 || items.length > MAX_ITEMS) {
    return { status: 400, body: { status: false, message: 'Your cart is empty or too large.' } };
  }
  const normalized = [];
  for (const item of items) {
    const id = clampText(item && item.id, 120);
    const qty = Math.floor(Number(item && item.qty));
    if (!id) {
      return { status: 400, body: { status: false, message: 'A cart item is missing its product id.' } };
    }
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return { status: 400, body: { status: false, message: `Invalid quantity for ${id}.` } };
    }
    normalized.push({
      id,
      qty,
      selected_color: clampText(item && item.selected_color, 60) || null,
      selected_storage: clampText(item && item.selected_storage, 60) || null,
    });
  }

  const customer = body && typeof body.customer === 'object' && body.customer ? body.customer : {};
  const name = clampText(customer.name, 120) || 'Customer';
  const phone = clampText(customer.phone, 40);
  let email = clampText(customer.email, 190).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  if (!email) email = 'sales@valmontgadgets.com';
  const area = clampText(customer.area, 120);
  const street = clampText(customer.street, 190);
  const fullAddress = clampText(customer.full_address, 300);
  const paymentMethod = clampText(body && body.payment_method, 60) || 'Valmont-Pay';

  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const sbKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const sbHeaders = { apikey: sbKey, authorization: `Bearer ${sbKey}` };

  // ── 1. Recompute every price from the database ────────────────────────────
  const ids = Array.from(new Set(normalized.map((i) => i.id)));
  const idFilter = ids.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
  let products;
  try {
    const res = await fetchImpl(
      `${sbUrl}/rest/v1/products?select=id,name,price,is_active&id=in.(${encodeURIComponent(idFilter)})`,
      { headers: sbHeaders }
    );
    if (!res.ok) {
      emit(`[VALMONTPAY-INIT] products lookup failed: HTTP ${res.status}`);
      return { status: 503, body: { status: false, message: 'The store is temporarily unavailable. Please try again.' } };
    }
    products = await res.json();
  } catch (err) {
    emit(`[VALMONTPAY-INIT] products lookup error: ${err && err.message}`);
    return { status: 503, body: { status: false, message: 'The store is temporarily unavailable. Please try again.' } };
  }
  if (!Array.isArray(products)) {
    return { status: 500, body: { status: false, message: 'Unexpected catalog response. Please try again.' } };
  }

  const priceMap = new Map();
  for (const p of products) {
    if (p && p.is_active && toPesewas(p.price) > 0) {
      priceMap.set(String(p.id), { name: String(p.name || 'Item'), unitPesewas: toPesewas(p.price) });
    }
  }
  const missing = ids.filter((id) => !priceMap.has(id));
  if (missing.length) {
    emit(`[VALMONTPAY-INIT] unavailable products requested: ${missing.join(', ')}`);
    return {
      status: 400,
      body: { status: false, message: 'Some items in your cart are no longer available. Please refresh and try again.', unavailable: missing },
    };
  }

  // ── 2. Build totals in integer pesewas (no float drift) ───────────────────
  const orderItems = normalized.map((item) => {
    const priced = priceMap.get(item.id);
    const linePesewas = priced.unitPesewas * item.qty;
    return {
      product_id: item.id,
      name: priced.name,
      quantity: item.qty,
      unit_price: priced.unitPesewas / 100,
      line_total: linePesewas / 100,
      selected_color: item.selected_color,
      selected_storage: item.selected_storage,
    };
  });
  // Sum straight from the integer unit prices — no float round-trips.
  const subtotalPesewas = normalized.reduce((sum, item) => sum + priceMap.get(item.id).unitPesewas * item.qty, 0);
  // Delivery is arranged after payment (unchanged storefront behaviour), so
  // the payable total equals the recomputed subtotal.
  const deliveryFeePesewas = 0;
  const totalPesewas = subtotalPesewas + deliveryFeePesewas;
  const totalCedis = totalPesewas / 100;

  // ── 3. Record the Pending order (the webhook needs a row to mark Paid) ────
  // generateOrderNumber() always returns a non-empty "VG-…" string, but a
  // future refactor (renamed variable, swapped generator, edge-runtime quirk)
  // could silently make it undefined. `orders.order_number` is NOT NULL with
  // no default, so PostgREST would reject the row with a 23502 not-null
  // violation — surfacing to the shopper as "Could not record your order".
  // Fail fast, here, with a loud server-side log instead of round-tripping a
  // guaranteed-rejected INSERT.
  const orderNumber = String(generateOrderNumber() || '').trim();
  if (!orderNumber.startsWith('VG-') || orderNumber.length < 8) {
    emit(`[VALMONTPAY-INIT] refused to record order: generated order_number is invalid (${JSON.stringify(orderNumber)})`);
    return { status: 500, body: { status: false, message: 'Could not issue an order number. Please try again.' } };
  }
  const phoneDigits = phone.replace(/\D/g, '');
  const customerId = phoneDigits ? `cust-${phoneDigits}` : `cust-anon-${Date.now()}`;

  // Single source of truth for the orders row — both the live INSERT and the
  // supabase-js integration test build from this object, so a key-name drift
  // (e.g. `orderNo` vs `order_number`) cannot slip past the test gate.
  const orderRow = buildOrderRow({
    orderNumber,
    customerId,
    orderItems,
    subtotalPesewas,
    deliveryFeePesewas: 0,
    totalPesewas,
    paymentMethod,
  });

  try {
    await fetchImpl(`${sbUrl}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sbHeaders,
        prefer: 'return=minimal, resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        id: customerId,
        name,
        phone: phone || null,
        email: email === 'sales@valmontgadgets.com' ? null : email,
        addresses: [{ zone: area || null, street: street || null, address: fullAddress || null }],
      }),
    });
    // Non-2xx here is tolerated: a duplicate id (race) or a soft failure must
    // not block checkout — the orders.customer_id FK is nullable-safe below.
  } catch (err) {
    emit(`[VALMONTPAY-INIT] customer upsert skipped: ${err && err.message}`);
  }

  let orderRes;
  try {
    orderRes = await fetchImpl(`${sbUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sbHeaders,
        prefer: 'return=representation',
      },
      body: JSON.stringify(orderRow),
    });
  } catch (err) {
    emit(`[VALMONTPAY-INIT] order insert failed (network): ${err && err.message}`);
    return { status: 503, body: { status: false, message: 'Could not record your order. Please try again.' } };
  }
  if (!orderRes.ok) {
    let detail = '';
    try {
      const j = await orderRes.json();
      detail = (j && (j.message || j.msg || j.hint)) || '';
    } catch (_) {}
    emit(`[VALMONTPAY-INIT] order insert failed: HTTP ${orderRes.status} ${detail}`);
    return { status: 500, body: { status: false, message: 'Could not record your order. Please try again.' } };
  }

  emit(`[VALMONTPAY-INIT] pending order ${orderNumber} recorded: GHS ${formatCedis(totalPesewas)} (${orderItems.length} line/s)`);

  // ── 4. Initialize the hosted checkout on the Valmont-Pay gateway ──────────
  const gatewayUrl = `${String(env.VALMONTPAY_GATEWAY_URL || GATEWAY_BASE).replace(/\/$/, '')}${GATEWAY_INITIALIZE_PATH}`;
  let gatewayJson = null;
  try {
    // 8s cap keeps the whole endpoint comfortably inside Vercel's default
    // function duration even when the gateway is slow.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const gatewayRes = await fetchImpl(gatewayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: totalCedis, // GHS cedis (major units) — gateway contract
        email,
        reference: orderNumber,
        callback_url: CALLBACK_URL,
        phone: phone || undefined,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    try {
      gatewayJson = await gatewayRes.json();
    } catch (_) {
      gatewayJson = null;
    }
    if (!gatewayRes.ok || !gatewayJson || gatewayJson.status === false) {
      const message = (gatewayJson && gatewayJson.message) || `Gateway error (HTTP ${gatewayRes.status})`;
      emit(`[VALMONTPAY-INIT] gateway rejected ${orderNumber}: ${message}`);
      return { status: 502, body: { status: false, message: 'The payment gateway could not start your checkout. Please try again.', detail: message } };
    }
  } catch (err) {
    emit(`[VALMONTPAY-INIT] gateway unreachable for ${orderNumber}: ${err && err.message}`);
    return { status: 502, body: { status: false, message: 'The payment gateway is unreachable. Please try again.' } };
  }

  const data = gatewayJson.data && typeof gatewayJson.data === 'object' ? gatewayJson.data : {};
  const payUrl = data.pay_url || data.checkout_url || data.paystack_authorization_url || '';
  if (!payUrl) {
    emit(`[VALMONTPAY-INIT] gateway returned no checkout URL for ${orderNumber}`);
    return { status: 502, body: { status: false, message: 'The payment gateway returned no checkout link. Please try again.' } };
  }

  // ── 5. Store the gateway's VP-… reference on the order ────────────────────
  // The webhook matches on order_number OR payment_reference, so a failure
  // here is logged loudly but never blocks the customer from paying.
  const gatewayReference = String(data.gateway_reference || data.reference || '').trim();
  if (gatewayReference) {
    try {
      const note = `checkout initialized: GHS ${formatCedis(totalPesewas)}${data.access_code ? `, access_code ${data.access_code}` : ''}`;
      const rpcRes = await fetchImpl(`${sbUrl}/rest/v1/rpc/set_order_payment_reference`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sbHeaders },
        body: JSON.stringify({
          p_order_number: orderNumber,
          p_payment_reference: gatewayReference,
          p_note: note,
        }),
      });
      if (!rpcRes.ok) emit(`[VALMONTPAY-INIT] payment_reference not stored for ${orderNumber}: HTTP ${rpcRes.status}`);
    } catch (err) {
      emit(`[VALMONTPAY-INIT] payment_reference not stored for ${orderNumber}: ${err && err.message}`);
    }
  }

  return {
    status: 200,
    body: {
      status: true,
      url: payUrl,
      order_number: orderNumber,
      reference: gatewayReference || orderNumber,
      total: totalCedis,
      currency: data.currency || 'GHS',
    },
  };
}

// ─── Edge entrypoint ────────────────────────────────────────────────────────

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ status: false, message: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return new Response(JSON.stringify({ status: false, message: 'Invalid JSON body' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const result = await handleInitializeCore({
      body,
      env: process.env,
      fetchImpl: fetch,
      log: (msg) => console.log(msg),
    });
    return new Response(JSON.stringify(result.body), { status: result.status, headers: JSON_HEADERS });
  } catch (err) {
    console.error('[VALMONTPAY-INIT] unexpected error:', err && err.message ? err.message : err);
    return new Response(JSON.stringify({ status: false, message: 'Internal error. Please try again.' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
