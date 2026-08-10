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
// confined by RLS (anon can only read active products, INSERT customers and
// call the three narrow payment RPCs: create_pending_order,
// set_order_payment_reference). No service-role secret is required — orders
// are never read or written directly via PostgREST.
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

// ─── SMS lead collection (SMS marketing popup + admin export) ────────────────
//
// Two routes are consolidated into this existing function and routed here via
// vercel.json rewrites (no new function files):
//   POST /api/account/optin  -> stores an opted-in Ghana mobile number (public)
//   GET  /api/admin/sms-leads -> lists collected leads (admin-token gated)
//
// Both talk to the `sms_leads` Supabase table. See
// supabase/migrations/20260810_sms_leads.sql (unique phone + ^0[0-9]{9}$ check,
// RLS on, anon SELECT revoked).

/** Valid local Ghana mobile prefixes (leading 0, then 2/5 followed by 2 digits). */
export const GHANA_MOBILE_PREFIXES = ['020', '023', '024', '025', '026', '027', '028', '050', '053', '054', '055', '056', '057', '059'];

/** Prefix -> live network mapping (local 0XXXXXXXXX form). */
export const GHANA_SMS_NETWORKS = {
  MTN: ['024', '025', '026', '054', '055', '056', '059'],
  Telecel: ['020', '050', '053'],
  AirtelTigo: ['023', '027', '028', '057'],
};

/** Normalise any user-entered Ghana number to `0XXXXXXXXX`. '' when invalid. */
export function normalizeGhanaLocalPhone(value) {
  let digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (/^233\d{9}$/.test(digits)) digits = '0' + digits.slice(3); // international -> local
  if (!/^0\d{9}$/.test(digits)) return '';
  return GHANA_MOBILE_PREFIXES.some((p) => digits.startsWith(p)) ? digits : '';
}

/** Detect the live mobile network from a validated local number, or null. */
export function detectGhanaNetwork(phone) {
  for (const network of Object.keys(GHANA_SMS_NETWORKS)) {
    if (GHANA_SMS_NETWORKS[network].some((p) => phone.startsWith(p))) return network;
  }
  return null;
}

/**
 * POST /api/account/optin — store an opted-in SMS marketing number.
 * Public (no auth). Validates the number before persisting; duplicates are
 * idempotent and return { ok:true, duplicate:true } (200).
 *
 * @param {object} deps
 * @param {object} deps.body  Parsed JSON body ({ phone, source? }).
 * @param {Record<string,string|undefined>} deps.env
 * @param {typeof fetch} deps.fetchImpl
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleSmsOptinCore({ body, env, fetchImpl, log }) {
  const emit = log || (() => {});
  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const sbKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const phone = normalizeGhanaLocalPhone(body && body.phone);
  if (!phone) {
    return { status: 400, body: { ok: false, message: 'Invalid Ghana mobile number. Use the format 0XXXXXXXXX with a valid prefix.' } };
  }
  const network = detectGhanaNetwork(phone);
  const source = clampText(body && body.source, 60) || 'storefront';

  let res;
  try {
    res = await fetchImpl(`${sbUrl}/rest/v1/sms_leads`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: sbKey,
        authorization: `Bearer ${sbKey}`,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ phone, network, source }),
    });
  } catch (err) {
    emit(`[SMS-OPTIN] supabase unreachable: ${err && err.message}`);
    return { status: 503, body: { ok: false, message: 'Could not save your number. Please try again.' } };
  }

  if (res.ok) {
    emit(`[SMS-OPTIN] recorded ${phone} (${network}) via ${source}`);
    return { status: 200, body: { ok: true, duplicate: false, network, source } };
  }

  // A 409 / unique_violation (23505) means the number already opted in -> idempotent.
  let errJson = {};
  try { errJson = await res.json(); } catch (_) { errJson = {}; }
  if (String(errJson.code) === '23505' || String(errJson.code) === '23514' || res.status === 409) {
    emit(`[SMS-OPTIN] duplicate ${phone} ignored (idempotent)`);
    return { status: 200, body: { ok: true, duplicate: true, network, source } };
  }

  emit(`[SMS-OPTIN] insert failed: HTTP ${res.status} ${errJson.message || ''}`);
  return { status: 500, body: { ok: false, message: 'Could not save your number. Please try again.' } };
}

/**
 * GET /api/admin/sms-leads — list collected SMS leads (newest first).
 * Admin-token gated: requires `x-admin-token` (or `Authorization: Bearer …`)
 * holding the admin's Supabase access token. RLS only lets authenticated
 * (admin) roles SELECT sms_leads, so a missing/invalid token -> 401.
 *
 * @param {object} deps
 * @param {Record<string,string>} deps.headers  Lower-cased request headers.
 * @param {Record<string,string|undefined>} deps.env
 * @param {typeof fetch} deps.fetchImpl
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleSmsLeadsCore({ headers, env, fetchImpl, log }) {
  const emit = log || (() => {});
  const auth = String(headers['authorization'] || '');
  const token = auth.startsWith('Bearer ')
    ? auth.slice(7).trim()
    : String(headers['x-admin-token'] || '').trim();
  if (!token) {
    return { status: 401, body: { ok: false, message: 'Unauthorized: missing admin token' } };
  }

  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');

  let res;
  try {
    res = await fetchImpl(`${sbUrl}/rest/v1/sms_leads?select=*&order=created_at.desc`, {
      headers: { apikey: token, authorization: `Bearer ${token}` },
    });
  } catch (err) {
    emit(`[SMS-LEADS] supabase unreachable: ${err && err.message}`);
    return { status: 503, body: { ok: false, message: 'Could not load SMS leads. Please try again.' } };
  }

  if (res.status === 401 || res.status === 403) {
    return { status: 401, body: { ok: false, message: 'Unauthorized: invalid or expired admin token' } };
  }
  if (!res.ok) {
    emit(`[SMS-LEADS] select failed: HTTP ${res.status}`);
    return { status: 500, body: { ok: false, message: 'Could not load SMS leads. Please try again.' } };
  }

  let rows = [];
  try { rows = await res.json(); } catch (_) { rows = []; }
  if (!Array.isArray(rows)) rows = [];
  return { status: 200, body: { ok: true, count: rows.length, leads: rows } };
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
 * NOTE: The live checkout path now goes through the create_pending_order RPC
 * (not a direct PostgREST INSERT) so that anon never needs orders INSERT
 * privilege. buildOrderRow is retained for integration-test replay assertions.
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

/**
 * Compute a stable idempotency key from customer + cart contents.
 * Identical carts from the same customer always produce the same key,
 * so retries hit the same Pending order instead of creating duplicates.
 *
 * @param {string} customerId
 * @param {Array<{id: string, qty: number}>} normalizedItems
 * @returns {string}
 */
export function computeIdempotencyKey(customerId, normalizedItems) {
  const sorted = [...normalizedItems]
    .map((i) => `${i.id}:${i.qty}`)
    .sort();
  return `idem:${customerId}:${sorted.join(',')}`.slice(0, 128);
}

/**
 * Build the items array in the exact shape create_pending_order() expects:
 * each entry has `product_id`, `quantity`, and optional `unit_price`,
 * `line_total`, `selected_color`, `selected_storage`.
 *
 * @param {Array} orderItems  The enriched items from step 2 (with name, unit_price, line_total).
 * @returns {Array} RPC-shaped items.
 */
function buildRpcItems(orderItems) {
  return orderItems.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    selected_color: item.selected_color || null,
    selected_storage: item.selected_storage || null,
  }));
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

  // ── delivery_region validation (optional, string <=60 else 400) ────────────
  let deliveryRegion = null;
  if (body && body.delivery_region !== undefined && body.delivery_region !== null) {
    if (typeof body.delivery_region !== 'string') {
      return { status: 400, body: { status: false, message: 'delivery_region must be a string' } };
    }
    const trimmed = body.delivery_region.trim();
    if (trimmed.length > 60) {
      return { status: 400, body: { status: false, message: 'delivery_region must be 60 characters or fewer' } };
    }
    if (trimmed.length > 0) deliveryRegion = trimmed;
    else deliveryRegion = null;
  }

  // ── 410 Gone: legacy client-priced requests ───────────────────────────────
  // The retired flow let clients dictate amounts. Any request still carrying
  // client-priced fields is refused with 410 so old callers fail loudly and
  // visibly instead of being silently re-priced. Region is explicitly allowed.
  const LEGACY_PRICE_FIELDS = ['amount', 'total', 'total_amount', 'subtotal', 'price', 'unit_price', 'line_total', 'delivery_fee', 'deliveryFee', 'fee', 'delivery_fee_amount', 'shipping_fee', 'shippingFee'];
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
      const itemCarried = body.items.filter((i) => i && typeof i === 'object' && ['price', 'unit_price', 'retail', 'line_total', 'amount', 'delivery_fee', 'deliveryFee', 'fee'].some((k) => i[k] !== undefined && i[k] !== null));
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
  // Local totals are only for the RPC payload validation; the AUTHORITATIVE
  // fee/total come from the RPC response (server-side region tiering + free_over).
  const localDeliveryFeePesewas = 0;
  const localTotalPesewas = subtotalPesewas + localDeliveryFeePesewas;

  // ── 3. Record the Pending order (the webhook needs a row to mark Paid) ────
  const orderNumber = String(generateOrderNumber() || '').trim();
  if (!orderNumber.startsWith('VG-') || orderNumber.length < 8) {
    emit(`[VALMONTPAY-INIT] refused to record order: generated order_number is invalid (${JSON.stringify(orderNumber)})`);
    return { status: 500, body: { status: false, message: 'Could not issue an order number. Please try again.' } };
  }
  const phoneDigits = phone.replace(/\D/g, '');
  const customerId = phoneDigits ? `cust-${phoneDigits}` : `cust-anon-${Date.now()}`;

  // ── 3b. Best-effort customer upsert (for the FK) ──────────────────────────
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
  } catch (err) {
    emit(`[VALMONTPAY-INIT] customer upsert skipped: ${err && err.message}`);
  }

  // ── 3c. Record the Pending order via SECURITY DEFINER RPC ──────────────────
  // The anon role has NO direct SELECT/INSERT privilege on public.orders
  // All order creation goes through create_pending_order(), which validates catalog prices server-side and is
  // idempotent: identical (customer, cart) retries return the same Pending
  // order instead of creating duplicates.
  // When p_delivery_region is supplied the RPC computes fee server-authoritatively.
  const idempotencyKey = computeIdempotencyKey(customerId, normalized);
  const rpcItems = buildRpcItems(orderItems);

  let orderRes;
  let orderResult = null;
  try {
    const rpcBody = {
      p_order_number: orderNumber,
      p_customer_id: customerId,
      p_items: rpcItems,
      p_subtotal: subtotalPesewas / 100,
      p_delivery_fee: 0,
      p_total: localTotalPesewas / 100,
      p_payment_method: paymentMethod,
      p_idempotency_key: idempotencyKey,
      p_delivery_region: deliveryRegion,
    };
    orderRes = await fetchImpl(`${sbUrl}/rest/v1/rpc/create_pending_order`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sbHeaders,
        prefer: 'return=representation',
      },
      body: JSON.stringify(rpcBody),
    });
  } catch (err) {
    emit(`[VALMONTPAY-INIT] create_pending_order RPC failed (network): ${err && err.message}`);
    return { status: 503, body: { status: false, message: 'Could not record your order. Please try again.' } };
  }

  try {
    orderResult = await orderRes.json();
  } catch (_) {
    orderResult = null;
  }

  if (!orderRes.ok || !orderResult || typeof orderResult !== 'object') {
    let pgError = orderResult || {};
    const sqlState = pgError.code || '';
    const pgMessage = pgError.message || pgError.msg || '';
    const pgHint = pgError.hint || '';
    const pgDetails = pgError.details || '';
    emit(`[VALMONTPAY-INIT] create_pending_order failed: HTTP ${orderRes.status} [${sqlState}] ${pgMessage}`);
    if (pgHint) emit(`[VALMONTPAY-INIT] PostgreSQL hint: ${pgHint}`);
    if (pgDetails) emit(`[VALMONTPAY-INIT] PostgreSQL details: ${pgDetails}`);
    return {
      status: 500,
      body: {
        status: false,
        message: `Could not record your order [${sqlState}]`,
        detail: pgMessage || 'Database constraint violation',
        hint: pgHint || undefined,
        details: pgDetails || undefined,
      },
    };
  }

  // The RPC returns {id, order_number, idempotent: bool, subtotal, delivery_fee, delivery_region, total, fee_source}
  // On an idempotent retry, the existing order_number is returned — use it for the gateway.
  // ALWAYS use the RPC-RETURNED subtotal/delivery_fee/total (never locally computed ones).
  const effectiveOrderNumber = String(orderResult.order_number || orderNumber).trim();
  const isIdempotentHit = orderResult.idempotent === true;
  const rpcSubtotal = orderResult.subtotal != null ? Number(orderResult.subtotal) : subtotalPesewas / 100;
  const rpcDeliveryFee = orderResult.delivery_fee != null ? Number(orderResult.delivery_fee) : 0;
  const rpcTotal = orderResult.total != null ? Number(orderResult.total) : rpcSubtotal + rpcDeliveryFee;
  const rpcDeliveryRegion = orderResult.delivery_region != null ? String(orderResult.delivery_region) : deliveryRegion;
  const rpcFeeSource = orderResult.fee_source != null ? String(orderResult.fee_source) : null;

  const rpcTotalPesewas = toPesewas(rpcTotal) ?? 0;
  emit(`[VALMONTPAY-INIT] pending order ${effectiveOrderNumber} ${isIdempotentHit ? 'reused (idempotent)' : 'recorded'}: GHS ${formatCedis(rpcTotalPesewas)} (${orderItems.length} line/s) region=${rpcDeliveryRegion || 'none'} fee=${rpcDeliveryFee} source=${rpcFeeSource || 'unknown'}`);

  // ── 4. Initialize the hosted checkout on the Valmont-Pay gateway ──────────
  const gatewayUrl = `${String(env.VALMONTPAY_GATEWAY_URL || GATEWAY_BASE).replace(/\/$/, '')}${GATEWAY_INITIALIZE_PATH}`;
  let gatewayJson = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const gatewayRes = await fetchImpl(gatewayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: rpcTotal, // GHS cedis (major units) — ALWAYS RPC-returned total
        email,
        reference: effectiveOrderNumber,
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
      emit(`[VALMONTPAY-INIT] gateway rejected ${effectiveOrderNumber}: ${message}`);
      return { status: 502, body: { status: false, message: 'The payment gateway could not start your checkout. Please try again.', detail: message } };
    }
  } catch (err) {
    emit(`[VALMONTPAY-INIT] gateway unreachable for ${effectiveOrderNumber}: ${err && err.message}`);
    return { status: 502, body: { status: false, message: 'The payment gateway is unreachable. Please try again.' } };
  }

  const data = gatewayJson.data && typeof gatewayJson.data === 'object' ? gatewayJson.data : {};
  const payUrl = data.pay_url || data.checkout_url || data.paystack_authorization_url || '';
  if (!payUrl) {
    emit(`[VALMONTPAY-INIT] gateway returned no checkout URL for ${effectiveOrderNumber}`);
    return { status: 502, body: { status: false, message: 'The payment gateway returned no checkout link. Please try again.' } };
  }

  // ── 5. Store the gateway's VP-… reference on the order ────────────────────
  const gatewayReference = String(data.gateway_reference || data.reference || '').trim();
  if (gatewayReference) {
    try {
      const note = `checkout initialized: GHS ${formatCedis(rpcTotalPesewas)}${data.access_code ? `, access_code ${data.access_code}` : ''} region=${rpcDeliveryRegion || 'none'}`;
      const rpcRes = await fetchImpl(`${sbUrl}/rest/v1/rpc/set_order_payment_reference`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sbHeaders },
        body: JSON.stringify({
          p_order_number: effectiveOrderNumber,
          p_payment_reference: gatewayReference,
          p_note: note,
        }),
      });
      if (!rpcRes.ok) emit(`[VALMONTPAY-INIT] payment_reference not stored for ${effectiveOrderNumber}: HTTP ${rpcRes.status}`);
    } catch (err) {
      emit(`[VALMONTPAY-INIT] payment_reference not stored for ${effectiveOrderNumber}: ${err && err.message}`);
    }
  }

  return {
    status: 200,
    body: {
      status: true,
      url: payUrl,
      order_number: effectiveOrderNumber,
      order_id: orderResult && orderResult.id ? orderResult.id : null,
      reference: gatewayReference || effectiveOrderNumber,
      total: rpcTotal,
      subtotal: rpcSubtotal,
      delivery_fee: rpcDeliveryFee,
      delivery_region: rpcDeliveryRegion,
      fee_source: rpcFeeSource,
      currency: data.currency || 'GHS',
      idempotent: isIdempotentHit,
    },
  };
}

// ─── Edge entrypoint ────────────────────────────────────────────────────────
// This single consolidated function also serves the two SMS-lead routes. The
// vercel.json rewrites below tag each incoming request with a `__vmRoute`
// query marker so we can dispatch without needing extra function files:
//   /api/account/optin    -> /api/valmontpay/initialize?__vmRoute=optin
//   /api/admin/sms-leads  -> /api/valmontpay/initialize?__vmRoute=sms-leads

export default async function handler(request) {
  const vmRoute = new URL(request.url).searchParams.get('__vmRoute');

  if (vmRoute === 'optin') {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });
    }
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, message: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS });
    }
    try {
      const result = await handleSmsOptinCore({ body, env: process.env, fetchImpl: fetch, log: (m) => console.log(m) });
      return new Response(JSON.stringify(result.body), { status: result.status, headers: JSON_HEADERS });
    } catch (err) {
      console.error('[SMS-OPTIN] unexpected error:', err && err.message ? err.message : err);
      return new Response(JSON.stringify({ ok: false, message: 'Internal error. Please try again.' }), { status: 500, headers: JSON_HEADERS });
    }
  }

  if (vmRoute === 'sms-leads') {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS });
    }
    const headers = {};
    request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    try {
      const result = await handleSmsLeadsCore({ headers, env: process.env, fetchImpl: fetch, log: (m) => console.log(m) });
      return new Response(JSON.stringify(result.body), { status: result.status, headers: JSON_HEADERS });
    } catch (err) {
      console.error('[SMS-LEADS] unexpected error:', err && err.message ? err.message : err);
      return new Response(JSON.stringify({ ok: false, message: 'Internal error. Please try again.' }), { status: 500, headers: JSON_HEADERS });
    }
  }

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
