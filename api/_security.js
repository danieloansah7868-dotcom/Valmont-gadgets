/** Shared request hardening for public Edge API routes. */

const buckets = new Map();

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

/** Parse a JSON request without allowing an unbounded body into memory. */
export async function readJson(request, maxBytes = 32 * 1024) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestError(413, 'Request body is too large');
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new RequestError(413, 'Request body is too large');
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_) {
    throw new RequestError(400, 'Invalid JSON body');
  }
}

/** Read the platform-provided client address. Never trust a body/query value. */
function clientAddress(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 128);
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function localLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowSeconds * 1000 }
    : existing;
  bucket.count += 1;
  buckets.set(key, bucket);

  // Bound per-isolate memory even during an address-flood attack.
  if (buckets.size > 5000) {
    for (const [candidate, value] of buckets) {
      if (value.resetAt <= now || buckets.size > 4500) buckets.delete(candidate);
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * Enforce a fixed-window per-IP rate limit. In production, configure Upstash
 * Redis so limits are shared by all Edge isolates. The bounded in-memory
 * limiter remains a safe local/degraded fallback.
 */
export async function rateLimit({ request, env, namespace, limit, windowSeconds, log = () => {} }) {
  const addressHash = await digest(clientAddress(request));
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `vm-rate:${namespace}:${addressHash}:${windowId}`;
  const url = String(env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, String(windowSeconds), 'NX'],
        ]),
      });
      if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
      const result = await response.json();
      const count = Number(result && result[0] && result[0].result);
      if (!Number.isFinite(count)) throw new Error('Redis returned an invalid counter');
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: (windowId + 1) * windowSeconds * 1000,
      };
    } catch (error) {
      log(`[RATE-LIMIT] distributed limiter unavailable: ${error && error.message ? error.message : error}`);
    }
  }

  return localLimit(key, limit, windowSeconds);
}

export function rateLimitHeaders(result) {
  return {
    'x-ratelimit-remaining': String(result.remaining),
    'x-ratelimit-reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

export const SECURE_JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};
