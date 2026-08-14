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

import { RequestError, SECURE_JSON_HEADERS, rateLimit, rateLimitHeaders, readJson } from '../_security.js';

const GATEWAY_BASE = 'https://valmontpay.app';
const GATEWAY_INITIALIZE_PATH = '/api/transaction/initialize';
const CALLBACK_URL = 'https://valmontgadgets.com/order-confirmed.html';

/** Supabase project backing the storefront (same project app.js uses). */
const DEFAULT_SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
// Public only; used as the API gateway key when forwarding an authenticated
// administrator's own JWT. All checkout and public-write operations require
// SUPABASE_SERVICE_ROLE_KEY and never fall back to this browser credential.
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

const JSON_HEADERS = SECURE_JSON_HEADERS;
const MAX_ITEMS = 50;
const MAX_QTY = 50;
const MAX_TOTAL_QTY = 100;

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
 * Resolve an optional Supabase bearer token to a server-verified account ID.
 * An invalid supplied token fails closed; requests without a token remain
 * valid guest checkouts.
 */
export async function resolveCheckoutAccount({ authorization, env, fetchImpl, log }) {
  const emit = log || (() => {});
  const header = String(authorization || '').trim();
  if (!header) return { supplied: false, accountId: null };
  const match = /^Bearer\s+([^\s]{20,4096})$/i.exec(header);
  if (!match) return { supplied: true, accountId: null };

  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anonKey = String(env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  try {
    const response = await fetchImpl(`${sbUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${match[1]}` },
    });
    if (!response.ok) return { supplied: true, accountId: null };
    const account = await response.json();
    const accountId = String(account && account.id || '').trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(accountId)) {
      emit('[VALMONTPAY-INIT] verified auth response did not contain a valid account ID');
      return { supplied: true, accountId: null };
    }
    return { supplied: true, accountId };
  } catch (error) {
    emit(`[VALMONTPAY-INIT] account verification failed: ${error && error.message ? error.message : error}`);
    return { supplied: true, accountId: null, unavailable: true };
  }
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
  const sbKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!sbKey) {
    emit('[SMS-OPTIN] SUPABASE_SERVICE_ROLE_KEY is not configured');
    return { status: 500, body: { ok: false, message: 'SMS signup is temporarily unavailable.' } };
  }

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
 * The only account allowed to administer the store. Mirrors
 * `public.admin_allowlist` in supabase/migrations/20260811_admin_email_allowlist.sql.
 */
export const ADMIN_ALLOWED_EMAILS = ['danieloansah7868@gmail.com'];

/**
 * Reads the `email` claim out of a Supabase access token WITHOUT verifying the
 * signature. That is safe here because this is only a fast pre-filter: the
 * token is forwarded to PostgREST, which verifies the signature and applies
 * RLS. A forged token fails there, so this can never grant access on its own.
 *
 * @param {string} token
 * @returns {string} lower-cased email, or '' when unreadable.
 */
export function adminEmailFromToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return '';
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('utf8');
    const claims = JSON.parse(json);
    return String(claims.email || '').trim().toLowerCase();
  } catch (_) {
    return '';
  }
}

/** True when the bearer token belongs to an allowlisted Valmont admin. */
export function isAdminToken(token) {
  return ADMIN_ALLOWED_EMAILS.includes(adminEmailFromToken(token));
}

/**
 * GET /api/admin/sms-leads — list collected SMS leads (newest first).
 * Admin-token gated: requires `x-admin-token` (or `Authorization: Bearer …`)
 * holding the admin's Supabase access token.
 *
 * The token must carry the allowlisted admin email. Any shopper can self-
 * register against the same Supabase project and obtain a valid
 * `authenticated` JWT, so "has a session" is NOT sufficient authorisation for
 * reading collected marketing phone numbers.
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

  // A static shared secret (SMS_ADMIN_TOKEN) stays supported for scripted
  // exports; otherwise the token must be the allowlisted admin's Supabase JWT.
  const sharedSecret = String(env.SMS_ADMIN_TOKEN || '').trim();
  const isSharedSecret = sharedSecret.length > 0 && token === sharedSecret;
  if (!isSharedSecret && !isAdminToken(token)) {
    emit('[SMS-LEADS] rejected non-admin token');
    return { status: 403, body: { ok: false, message: 'Forbidden: not an admin account' } };
  }

  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const apiKey = isSharedSecret
    ? String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    : String(env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  const authorization = isSharedSecret ? apiKey : token;
  if (!apiKey) {
    emit('[SMS-LEADS] required Supabase server credential is not configured');
    return { status: 500, body: { ok: false, message: 'SMS lead export is not configured.' } };
  }

  let res;
  try {
    res = await fetchImpl(`${sbUrl}/rest/v1/sms_leads?select=*&order=created_at.desc`, {
      headers: { apikey: apiKey, authorization: `Bearer ${authorization}` },
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
 * Compute a stable, collision-resistant idempotency key from every field that
 * changes the resulting order. Variant and delivery-region changes must never
 * reuse an older Pending order. Hashing avoids collisions caused by truncating
 * long serialized carts to the database column length.
 *
 * @param {string} customerId
 * @param {Array<{id: string, qty: number, selected_color?: string|null, selected_storage?: string|null}>} normalizedItems
 * @param {string|null} deliveryRegion
 * @returns {Promise<string>}
 */
export async function computeIdempotencyKey(customerId, normalizedItems, deliveryRegion = null) {
  const aggregated = new Map();
  for (const item of normalizedItems) {
    const identity = JSON.stringify([
      String(item.id),
      String(item.selected_color || ''),
      String(item.selected_storage || ''),
    ]);
    aggregated.set(identity, (aggregated.get(identity) || 0) + Number(item.qty));
  }
  const canonical = JSON.stringify({
    version: 2,
    customer_id: String(customerId),
    delivery_region: String(deliveryRegion || '').trim(),
    items: [...aggregated.entries()]
      .map(([identity, quantity]) => [...JSON.parse(identity), quantity])
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `idem:v2:${hex}`;
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
 * @param {string|null} [deps.accountId] Server-verified Supabase account UUID.
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleInitializeCore({ body, env, fetchImpl, log, accountId = null }) {
  const emit = log || (() => {});

  const secretKey = String(env.VALMONTPAY_SECRET_KEY || '').trim();
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secretKey || !serviceRoleKey) {
    emit(`[VALMONTPAY-INIT] missing server secret(s):${!secretKey ? ' VALMONTPAY_SECRET_KEY' : ''}${!serviceRoleKey ? ' SUPABASE_SERVICE_ROLE_KEY' : ''}`);
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
  if (normalized.reduce((sum, item) => sum + item.qty, 0) > MAX_TOTAL_QTY) {
    return { status: 400, body: { status: false, message: 'Your cart contains too many units.' } };
  }

  const customer = body && typeof body.customer === 'object' && body.customer ? body.customer : {};
  const name = clampText(customer.name, 120);
  const phone = normalizeGhanaLocalPhone(customer.phone) || clampText(customer.phone, 40);
  let email = clampText(customer.email, 190).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  const area = clampText(customer.area, 120);
  const street = clampText(customer.street, 190);
  const fullAddress = clampText(customer.full_address, 300);
  const paymentMethod = clampText(body && body.payment_method, 60) || 'Valmont-Pay';

  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const sbHeaders = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` };

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

  // Checkout contact fields are validated after catalog availability so old
  // tests that probe product-state errors keep their expected precedence.
  if (!name || name.length < 2) {
    return { status: 400, body: { status: false, message: 'Please enter the customer name.' } };
  }
  if (!phone) {
    return { status: 400, body: { status: false, message: 'Please enter a valid phone number.' } };
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
  const customerId = accountId
    ? `acct-${accountId}`
    : phoneDigits ? `cust-${phoneDigits}` : `cust-anon-${Date.now()}`;

  // ── 3b. Customer upsert through a narrow SECURITY DEFINER RPC ─────────────
  // This must succeed: create_pending_order() validates the foreign key, and
  // the admin Customers page relies on this row not being an anonymous
  // PostgREST insert that RLS can silently reject.
  try {
    const customerRes = await fetchImpl(`${sbUrl}/rest/v1/rpc/ensure_customer_for_checkout`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...sbHeaders,
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        p_customer_id: customerId,
        p_name: name,
        p_phone: phone,
        p_email: email || null,
        p_area: area || null,
        p_street: street || null,
        p_full_address: fullAddress || null,
      }),
    });
    if (!customerRes.ok) {
      let detail = '';
      try { detail = (await customerRes.json()).message || ''; } catch (_) {}
      emit(`[VALMONTPAY-INIT] customer upsert failed: HTTP ${customerRes.status} ${detail}`);
      return { status: 500, body: { status: false, message: 'Could not save customer details. Please try again.' } };
    }
  } catch (err) {
    emit(`[VALMONTPAY-INIT] customer upsert failed: ${err && err.message}`);
    return { status: 503, body: { status: false, message: 'Could not save customer details. Please try again.' } };
  }

  // ── 3c. Record the Pending order via SECURITY DEFINER RPC ──────────────────
  // The anon role has NO direct SELECT/INSERT privilege on public.orders
  // All order creation goes through create_pending_order(), which validates catalog prices server-side and is
  // idempotent: identical (customer, cart) retries return the same Pending
  // order instead of creating duplicates.
  // When p_delivery_region is supplied the RPC computes fee server-authoritatively.
  const idempotencyKey = await computeIdempotencyKey(customerId, normalized, deliveryRegion);
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
      p_account_id: accountId,
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
    const conflict = /insufficient_stock/i.test(pgMessage);
    const invalidRegion = /invalid_delivery_region/i.test(pgMessage);
    return {
      status: conflict ? 409 : invalidRegion ? 400 : 500,
      body: {
        status: false,
        message: conflict
          ? 'One or more items are no longer available in the requested quantity.'
          : invalidRegion
            ? 'Please choose a valid delivery region.'
            : 'Could not record your order. Please try again.',
      },
    };
  }

  // The RPC returns {id, order_number, idempotent, subtotal, delivery_fee, delivery_region, total, fee_source, pricing_tier}
  // On an idempotent retry, the existing order_number is returned — use it for the gateway.
  // ALWAYS use the RPC-RETURNED subtotal/delivery_fee/total (never locally computed ones).
  const effectiveOrderNumber = String(orderResult.order_number || orderNumber).trim();
  const isIdempotentHit = orderResult.idempotent === true;
  const rpcSubtotal = orderResult.subtotal != null ? Number(orderResult.subtotal) : subtotalPesewas / 100;
  const rpcDeliveryFee = orderResult.delivery_fee != null ? Number(orderResult.delivery_fee) : 0;
  const rpcTotal = orderResult.total != null ? Number(orderResult.total) : rpcSubtotal + rpcDeliveryFee;
  const rpcDeliveryRegion = orderResult.delivery_region != null ? String(orderResult.delivery_region) : deliveryRegion;
  const rpcFeeSource = orderResult.fee_source != null ? String(orderResult.fee_source) : null;
  const rpcPricingTier = orderResult.pricing_tier === 'dealer' ? 'dealer' : 'retail';

  const rpcTotalPesewas = toPesewas(rpcTotal) ?? 0;
  emit(`[VALMONTPAY-INIT] pending order ${effectiveOrderNumber} ${isIdempotentHit ? 'reused (idempotent)' : 'recorded'}: GHS ${formatCedis(rpcTotalPesewas)} (${orderItems.length} line/s) region=${rpcDeliveryRegion || 'none'} fee=${rpcDeliveryFee} source=${rpcFeeSource || 'unknown'}`);

  // Snapshot the checkout's contact details on the order itself. This keeps
  // admin order/customer views accurate even if the customer row is later
  // reused, merged, or edited.
  try {
    const snapshotRes = await fetchImpl(`${sbUrl}/rest/v1/rpc/set_order_customer_snapshot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...sbHeaders },
      body: JSON.stringify({
        p_order_number: effectiveOrderNumber,
        p_customer_name: name,
        p_customer_phone: phone,
        p_customer_email: email || null,
        p_customer_area: area || null,
        p_customer_street: street || null,
        p_delivery_address: fullAddress || [area, street].filter(Boolean).join(', ') || null,
      }),
    });
    if (!snapshotRes.ok) emit(`[VALMONTPAY-INIT] customer snapshot not stored for ${effectiveOrderNumber}: HTTP ${snapshotRes.status}`);
  } catch (err) {
    emit(`[VALMONTPAY-INIT] customer snapshot not stored for ${effectiveOrderNumber}: ${err && err.message}`);
  }

  // If a newly-created checkout cannot be handed to the payment gateway, put
  // its reserved stock back immediately. Idempotent retries may already have a
  // live hosted checkout, so they retain their original reservation.
  const releaseNewReservation = async (reason) => {
    if (isIdempotentHit) return;
    try {
      const response = await fetchImpl(`${sbUrl}/rest/v1/rpc/release_order_reservation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sbHeaders },
        body: JSON.stringify({ p_order_number: effectiveOrderNumber, p_reason: reason }),
      });
      if (!response.ok) emit(`[VALMONTPAY-INIT] reservation release failed for ${effectiveOrderNumber}: HTTP ${response.status}`);
    } catch (error) {
      emit(`[VALMONTPAY-INIT] reservation release failed for ${effectiveOrderNumber}: ${error && error.message}`);
    }
  };

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
        email: email || undefined,
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
      await releaseNewReservation('gateway_initialization_failed');
      return { status: 502, body: { status: false, message: 'The payment gateway could not start your checkout. Please try again.' } };
    }
  } catch (err) {
    emit(`[VALMONTPAY-INIT] gateway unreachable for ${effectiveOrderNumber}: ${err && err.message}`);
    await releaseNewReservation('gateway_unreachable');
    return { status: 502, body: { status: false, message: 'The payment gateway is unreachable. Please try again.' } };
  }

  const data = gatewayJson.data && typeof gatewayJson.data === 'object' ? gatewayJson.data : {};
  const payUrl = data.pay_url || data.checkout_url || data.paystack_authorization_url || '';
  if (!payUrl) {
    emit(`[VALMONTPAY-INIT] gateway returned no checkout URL for ${effectiveOrderNumber}`);
    await releaseNewReservation('gateway_missing_checkout_url');
    return { status: 502, body: { status: false, message: 'The payment gateway returned no checkout link. Please try again.' } };
  }
  let checkoutUrl;
  try {
    checkoutUrl = new URL(payUrl);
  } catch (_) {
    await releaseNewReservation('gateway_invalid_checkout_url');
    return { status: 502, body: { status: false, message: 'The payment gateway returned an invalid checkout link.' } };
  }
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'valmontpay.app') {
    emit(`[VALMONTPAY-INIT] refused unexpected checkout origin for ${effectiveOrderNumber}`);
    await releaseNewReservation('gateway_untrusted_checkout_url');
    return { status: 502, body: { status: false, message: 'The payment gateway returned an untrusted checkout link.' } };
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
      pricing_tier: rpcPricingTier,
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
  const emit = (message) => console.log(message);
  const respond = (body, status, extraHeaders = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });

  const routeConfig = vmRoute === 'optin'
    ? { namespace: 'sms-optin', limit: 5, windowSeconds: 3600 }
    : vmRoute === 'sms-leads'
      ? { namespace: 'sms-leads', limit: 60, windowSeconds: 60 }
      : { namespace: 'checkout', limit: 12, windowSeconds: 600 };
  const limited = await rateLimit({ request, env: process.env, ...routeConfig, log: emit });
  const limitHeaders = rateLimitHeaders(limited);
  if (!limited.allowed) {
    return respond(
      { status: false, ok: false, message: 'Too many requests. Please try again later.' },
      429,
      { ...limitHeaders, 'retry-after': String(Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))) }
    );
  }

  if (vmRoute === 'optin') {
    if (request.method !== 'POST') return respond({ ok: false, message: 'Method not allowed' }, 405, limitHeaders);
    let body;
    try {
      body = await readJson(request, 4096);
    } catch (error) {
      return respond({ ok: false, message: error instanceof RequestError ? error.message : 'Invalid JSON body' }, error.status || 400, limitHeaders);
    }
    try {
      const result = await handleSmsOptinCore({ body, env: process.env, fetchImpl: fetch, log: emit });
      return respond(result.body, result.status, limitHeaders);
    } catch (err) {
      console.error('[SMS-OPTIN] unexpected error:', err && err.message ? err.message : err);
      return respond({ ok: false, message: 'Internal error. Please try again.' }, 500, limitHeaders);
    }
  }

  if (vmRoute === 'sms-leads') {
    if (request.method !== 'GET') return respond({ ok: false, message: 'Method not allowed' }, 405, limitHeaders);
    const headers = {};
    request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    try {
      const result = await handleSmsLeadsCore({ headers, env: process.env, fetchImpl: fetch, log: emit });
      return respond(result.body, result.status, limitHeaders);
    } catch (err) {
      console.error('[SMS-LEADS] unexpected error:', err && err.message ? err.message : err);
      return respond({ ok: false, message: 'Internal error. Please try again.' }, 500, limitHeaders);
    }
  }

  if (request.method !== 'POST') return respond({ status: false, message: 'Method not allowed' }, 405, limitHeaders);

  let body;
  try {
    body = await readJson(request, 64 * 1024);
  } catch (error) {
    return respond({ status: false, message: error instanceof RequestError ? error.message : 'Invalid JSON body' }, error.status || 400, limitHeaders);
  }

  const account = await resolveCheckoutAccount({
    authorization: request.headers.get('authorization'),
    env: process.env,
    fetchImpl: fetch,
    log: emit,
  });
  if (account.supplied && !account.accountId) {
    return respond(
      { status: false, message: account.unavailable ? 'Account verification is temporarily unavailable.' : 'Your session expired. Please sign in again.' },
      account.unavailable ? 503 : 401,
      limitHeaders
    );
  }

  try {
    const result = await handleInitializeCore({
      body,
      env: process.env,
      fetchImpl: fetch,
      log: emit,
      accountId: account.accountId,
    });
    return respond(result.body, result.status, limitHeaders);
  } catch (err) {
    console.error('[VALMONTPAY-INIT] unexpected error:', err && err.message ? err.message : err);
    return respond({ status: false, message: 'Internal error. Please try again.' }, 500, limitHeaders);
  }
}
