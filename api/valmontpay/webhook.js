/**
 * POST /api/valmontpay/webhook — Valmont-Pay gateway webhook receiver.
 *
 * Tenant pattern (docs/tenant-integration.md in the Valmont-Pay gateway):
 *   - The gateway signs every delivery with HMAC-SHA512(rawBody, tenant
 *     webhook signing secret) and sends it as `x-valmontpay-signature`.
 *   - `x-valmontpay-tenant` carries the tenant key (this storefront is
 *     registered as "valmont-gadget", LIVE mode).
 *   - Payload shape: { event: 'charge.success' | 'charge.failed', data: {
 *     reference, status, amount, currency, channel, paid_at, merchant,
 *     gateway_reference } }. `amount` is in GHS cedis (major units).
 *
 * Security model:
 *   1. Verify the signature over the EXACT raw request bytes, constant-time.
 *      Bad/missing signature → 401. Never crash.
 *   2. Require x-valmontpay-tenant === "valmont-gadget" → otherwise 401.
 *   3. Only a signed `charge.success` with `data.status === 'success'` whose
 *      pesewa amount exactly matches the stored order total can move an order
 *      to 'Paid' (the DB transition itself is enforced again inside the
 *      confirm_order_paid() RPC, which also decrements product stock exactly
 *      once — repeat deliveries hit the 'already_paid' branch).
 *   4. Idempotent by reference: gateway repeats get a plain 200.
 *   5. Ignored events are acknowledged with a fast 200 so the gateway stops
 *      retrying them; retryable failures return explicit 5xx.
 *
 * Runtime: Vercel Edge Function — chosen deliberately because the Edge
 * runtime exposes the exact raw request bytes (`request.arrayBuffer()`),
 * which the Node runtime's auto-parsed req.body does not.
 */

export const config = { runtime: 'edge' };

/** This storefront's tenant key on https://valmontpay.app (LIVE). */
export const TENANT_KEY = 'valmont-gadget';

/** Supabase project backing the storefront (same project app.js uses). */
const DEFAULT_SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
// The anon key is already public: it ships inside app.js/shop.min.js and is
// confined by RLS (anon can only INSERT orders and call the two narrow RPCs).
// Referencing it server-side adds no new exposure.
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// ─── Crypto helpers (WebCrypto: works on Edge and Node >= 19) ───────────────

/**
 * HMAC-SHA512 over raw bytes, hex-encoded.
 * @param {string} secret
 * @param {Uint8Array} bytes
 * @returns {Promise<string>}
 */
export async function hmacSha512Hex(secret, bytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes));
  let hex = '';
  for (let i = 0; i < sig.length; i++) hex += sig[i].toString(16).padStart(2, '0');
  return hex;
}

function hexToBytes(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Constant-time comparison of two hex digests. Unequal lengths are rejected
 * without short-circuiting on content (length itself is not secret).
 */
export function timingSafeEqualHex(a, b) {
  const ba = hexToBytes(String(a || '').trim());
  const bb = hexToBytes(String(b || '').trim());
  if (!ba || !bb || ba.length === 0 || ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

/** Convert a GHS major-unit amount to integer pesewas. Null when invalid. */
export function toPesewas(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ─── Core handler (exported for unit tests) ─────────────────────────────────

/**
 * @param {object} deps
 * @param {Uint8Array} deps.rawBodyBytes  Exact request body bytes.
 * @param {Record<string,string>} deps.headers  Lower-cased header map.
 * @param {Record<string,string|undefined>} deps.env
 * @param {typeof fetch} deps.fetchImpl
 * @param {(msg: string) => void} [deps.log]
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleWebhookCore({ rawBodyBytes, headers, env, fetchImpl, log }) {
  const emit = log || (() => {});
  const secret = env.VALMONTPAY_WEBHOOK_SECRET;
  if (!secret) {
    emit('[VALMONTPAY-WEBHOOK] VALMONTPAY_WEBHOOK_SECRET is not configured');
    return { status: 500, body: { status: false, message: 'Webhook secret not configured' } };
  }

  // 1) Signature first — before looking at anything else.
  const signature = headers['x-valmontpay-signature'];
  if (!signature) {
    return { status: 401, body: { status: false, message: 'Missing signature' } };
  }
  const expected = await hmacSha512Hex(secret, rawBodyBytes);
  if (!timingSafeEqualHex(expected, signature)) {
    return { status: 401, body: { status: false, message: 'Invalid signature' } };
  }

  // 2) Tenant gate.
  const tenant = String(headers['x-valmontpay-tenant'] || '').trim();
  if (tenant !== TENANT_KEY) {
    return { status: 401, body: { status: false, message: 'Unknown tenant' } };
  }

  // 3) Parse the (already-authenticated) payload. Never throw.
  let payload;
  try {
    payload = JSON.parse(new TextDecoder('utf-8').decode(rawBodyBytes));
  } catch (_) {
    return { status: 400, body: { status: false, message: 'Invalid JSON payload' } };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 400, body: { status: false, message: 'Invalid webhook payload' } };
  }

  // 4) Fast 200 for everything except charge.success (terminal — retrying
  //    would never change the outcome).
  const event = payload.event;
  if (event !== 'charge.success') {
    return { status: 200, body: { status: true, ignored: true, event: event || null } };
  }

  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};

  // Contract: BOTH event === 'charge.success' AND data.status === 'success'
  // must hold before an order can flip to Paid. Any other status is terminal
  // (it will never become 'success' on retry) → fast 200 so the gateway stops.
  if (String(data.status || '').toLowerCase() !== 'success') {
    return {
      status: 200,
      body: { status: true, ignored: true, event, reason: 'data.status is not success', observed_status: data.status || null },
    };
  }

  const reference = String(data.reference || data.gateway_reference || '').trim();
  if (!reference) {
    return { status: 400, body: { status: false, message: 'Payload is missing data.reference' } };
  }
  const amountPesewas = toPesewas(data.amount);
  if (amountPesewas === null || amountPesewas <= 0) {
    return { status: 400, body: { status: false, message: 'Payload has an invalid amount' } };
  }

  // 5) Verify + transition inside the database. confirm_order_paid() is
  //    SECURITY DEFINER and re-checks the pesewa total itself, so even a
  //    logic bug here can never mark the wrong amount Paid.
  const sbUrl = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const sbKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  let res;
  try {
    res = await fetchImpl(`${sbUrl}/rest/v1/rpc/confirm_order_paid`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: sbKey,
        authorization: `Bearer ${sbKey}`,
        prefer: 'return=representation',
      },
      body: JSON.stringify({
        p_reference: reference,
        p_expected_total: amountPesewas / 100,
      }),
    });
  } catch (err) {
    emit(`[VALMONTPAY-WEBHOOK] Supabase unreachable for ${reference}: ${err && err.message}`);
    return { status: 503, body: { status: false, message: 'Database unreachable — retry' } };
  }

  let rpcResult = null;
  try {
    rpcResult = await res.json();
  } catch (_) {
    rpcResult = null;
  }

  if (!res.ok || !rpcResult || typeof rpcResult !== 'object') {
    const text = rpcResult && (rpcResult.message || rpcResult.msg || rpcResult.hint);
    emit(`[VALMONTPAY-WEBHOOK] confirm_order_paid failed (${res.status}) for ${reference}: ${text || 'unknown error'}`);
    return { status: 500, body: { status: false, message: 'Failed to record payment — retry' } };
  }

  const outcome = rpcResult.result;
  emit(`[VALMONTPAY-WEBHOOK] ${event} ${reference} -> ${outcome} (pesewas=${amountPesewas})`);

  if (outcome === 'paid') {
    return { status: 200, body: { status: true, result: 'paid', reference, order_number: rpcResult.order_number || null } };
  }
  if (outcome === 'already_paid') {
    // Idempotent repeat — the gateway retries until it gets a 2xx.
    return { status: 200, body: { status: true, result: 'already_paid', reference, order_number: rpcResult.order_number || null } };
  }
  if (outcome === 'amount_mismatch') {
    // Terminal on purpose: a retry cannot fix a mismatch and the order must
    // NOT flip to Paid. Loud log + 200 stops the retry loop; the order stays
    // Pending for manual review.
    emit(`[VALMONTPAY-WEBHOOK] AMOUNT MISMATCH for ${reference}: webhook pesewas=${amountPesewas} order_total=${rpcResult.order_total}`);
    return { status: 200, body: { status: true, result: 'amount_mismatch', reference } };
  }
  if (outcome === 'not_found') {
    // Retryable: the pending-order INSERT may still be in flight. The gateway
    // retries with backoff for ~24h, so the row will be picked up once it lands.
    return { status: 503, body: { status: false, message: 'Order not recorded yet — retry' } };
  }
  return { status: 500, body: { status: false, message: 'Unexpected database result — retry' } };
}

// ─── Edge entrypoint ────────────────────────────────────────────────────────

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ status: false, message: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  try {
    const rawBodyBytes = new Uint8Array(await request.arrayBuffer());
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const result = await handleWebhookCore({
      rawBodyBytes,
      headers,
      env: process.env,
      fetchImpl: fetch,
      log: (msg) => console.log(msg),
    });
    return new Response(JSON.stringify(result.body), { status: result.status, headers: JSON_HEADERS });
  } catch (err) {
    // Never crash: log, then hand the gateway an explicit retryable 5xx.
    console.error('[VALMONTPAY-WEBHOOK] unexpected error:', err && err.message ? err.message : err);
    return new Response(JSON.stringify({ status: false, message: 'Internal error — retry' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
