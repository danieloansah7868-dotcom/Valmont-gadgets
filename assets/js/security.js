/**
 * Valmont Gadgets — Shared hardening helpers (window.VG)
 *
 * What this file is: input validation, output escaping, a local attempt
 * counter used to keep a honest UI honest, and a debug ring buffer.
 *
 * What this file is NOT: a security boundary. Anything a browser can decide,
 * an attacker can rewrite. Enforcement of rate limits, ownership, pricing,
 * approval and admin access lives in Postgres (RLS + SECURITY DEFINER RPCs)
 * and in the serverless checkout endpoint. See README "Production
 * architecture" and supabase/migrations/20260811_admin_email_allowlist.sql.
 *
 * Real response headers are set by vercel.json — `<meta http-equiv>` tags are
 * ignored by browsers for CSP/X-Frame-Options, so this script no longer
 * pretends to install them.
 */
(function () {
  'use strict';

  const AUDIT_LIMIT = 60;
  const PII_KEYS = /(?:pass|password|token|secret|card|cvv|otp|pin|session)/i;

  const VG = {
    version: '2.0.0',

    // ── Output escaping ─────────────────────────────────────────────
    // Every page renders listings, leads and profiles into markup; escaping at
    // the single point of output is what keeps stored text from becoming XSS.
    escapeHtml(value) {
      return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
    },
    esc(value) { return VG.escapeHtml(value); },

    /** Escapes then quotes for use inside an HTML attribute value. */
    attr(value) { return VG.escapeHtml(value); },

    /**
     * Whitelisting, not blocklisting: user supplied image URLs must be https
     * and come from a host the CSP already allows, otherwise a listing could
     * turn every visitor's browser into a tracking-pixel client.
     */
    imageHosts: ['images.unsplash.com', 'upload.wikimedia.org', 'picsum.photos'],
    supabaseHost: 'eydsoqnpetqczaeqrscc.supabase.co',
    siteHost: 'valmontgadgets.com',
    isSafeImageUrl(value) {
      if (typeof value !== 'string') return false;
      let url;
      try { url = new URL(value.trim()); } catch (e) { return false; }
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.toLowerCase();
      const allowed = VG.imageHosts.indexOf(host) !== -1
        || host === VG.supabaseHost
        || host === VG.siteHost
        || host === 'www.' + VG.siteHost
        || host.endsWith('.vercel.app');
      return allowed;
    },
    /** Accepts site-relative upload paths (uploads/foo.png) and safe https URLs. */
    safeImageRef(value) {
      const raw = String(value || '').trim();
      if (/^uploads\/[\w.-]+\.png$/i.test(raw)) return raw;
      return VG.isSafeImageUrl(raw) ? raw : '';
    },

    // ── Validation ──────────────────────────────────────────────────
    // Ghana Card PIN: GHA- + 9 digits + '-' + single check digit.
    isValidGhanaCard(value) {
      return typeof value === 'string' && /^GHA-\d{9}-\d$/i.test(value.trim().toUpperCase());
    },
    // Local Ghana mobile: 0 + 9 digits (also accepts +233 spelling).
    isValidGhanaPhone(value) {
      const digits = String(value || '').replace(/[^\d+]/g, '');
      if (/^\+233\d{9}$/.test(digits)) return true;
      return /^0\d{9}$/.test(digits.replace(/\D/g, ''));
    },
    normalizeGhanaPhone(value) {
      const digits = String(value || '').replace(/\D/g, '');
      if (digits.startsWith('233') && digits.length === 12) return `0${digits.slice(3)}`;
      if (digits.startsWith('0') && digits.length === 10) return digits;
      return '';
    },
    /** wa.me needs the international form; derived, never asked for. */
    toWhatsAppNumber(value) {
      const local = VG.normalizeGhanaPhone(value);
      return local ? `233${local.slice(1)}` : '';
    },
    isValidEmail(value) {
      return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(value || '').trim());
    },
    hasUsablePassword(value) {
      return typeof value === 'string' && value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);
    },
    safeInteger(value, min, max, fallback) {
      const n = Math.trunc(Number(value));
      if (!Number.isFinite(n) || n < min || n > max) return fallback;
      return n;
    },
    safeDecimal(value, min, max, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < min || n > max) return fallback;
      return Math.round(n * 100) / 100;
    },
    /** Trims, strips control characters and caps length before a write. */
    cleanText(value, max) {
      return String(value === null || value === undefined ? '' : value)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, Math.min(Math.max(Number(max) || 160, 1), 2000));
    },

    // ── Client-side attempt counter (UI pacing only, not enforcement) ──
    attemptKey(action) { return `vg_attempts_${String(action).replace(/[^a-z0-9_:.-]/gi, '_')}`; },
    canPerform(action, maxAttempts, windowMs) {
      const key = VG.attemptKey(action);
      const now = Date.now();
      let attempts = [];
      try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { attempts = []; }
      if (!Array.isArray(attempts)) attempts = [];
      attempts = attempts.filter((t) => Number.isFinite(t) && now - t < windowMs);
      if (attempts.length >= maxAttempts) return false;
      attempts.push(now);
      try { localStorage.setItem(key, JSON.stringify(attempts.slice(-maxAttempts * 4))); } catch (e) { /* ignore */ }
      return true;
    },
    remainingAttempts(action, maxAttempts, windowMs) {
      const key = VG.attemptKey(action);
      const now = Date.now();
      let attempts = [];
      try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { attempts = []; }
      if (!Array.isArray(attempts)) attempts = [];
      attempts = attempts.filter((t) => Number.isFinite(t) && now - t < windowMs);
      return Math.max(0, maxAttempts - attempts.length);
    },
    resetAttempts(action) {
      try { localStorage.removeItem(VG.attemptKey(action)); } catch (e) { /* ignore */ }
    },

    // ── Storage helpers ─────────────────────────────────────────────
    // Non-sensitive UI state only (filters, "seen" flags). Account data,
    // listings, payments and verification results must come from Postgres.
    storage: {
      get(key, fallback) {
        try {
          const raw = localStorage.getItem(String(key));
          return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
      },
      set(key, value) {
        try { localStorage.setItem(String(key), JSON.stringify(value)); } catch (e) { /* ignore */ }
      },
      remove(key) {
        try { localStorage.removeItem(String(key)); } catch (e) { /* ignore */ }
      },
    },

    // ── Field validation helper ─────────────────────────────────────
    validateField(value, rules) {
      const label = (rules && rules.label) || 'This field';
      const v = typeof value === 'string' ? value.trim() : value;
      if (rules.required && (v === '' || v === null || v === undefined)) return { valid: false, msg: `${label} is required.` };
      if (typeof v === 'string' && rules.minLength && v.length < rules.minLength) return { valid: false, msg: `${label} must be at least ${rules.minLength} characters.` };
      if (typeof v === 'string' && rules.maxLength && v.length > rules.maxLength) return { valid: false, msg: `${label} must be under ${rules.maxLength} characters.` };
      if (rules.pattern && !rules.pattern.test(String(v))) return { valid: false, msg: `${label} format is invalid.` };
      if (typeof rules.custom === 'function' && !rules.custom(v)) return { valid: false, msg: `${label} is invalid.` };
      return { valid: true, msg: '' };
    },

    // ── Local debug ring buffer ─────────────────────────────────────
    // Diagnostics only. The authoritative audit trail is
    // public.admin_audit_log, written inside the admin RPCs in Postgres.
    audit(event, details) {
      const logs = VG.storage.get('vg_debug_ring', []);
      const safe = Array.isArray(logs) ? logs : [];
      safe.unshift({ event: String(event).slice(0, 48), at: new Date().toISOString(), info: redact(details) });
      VG.storage.set('vg_debug_ring', safe.slice(0, AUDIT_LIMIT));
    },
    debugRing() {
      const logs = VG.storage.get('vg_debug_ring', []);
      return Array.isArray(logs) ? logs : [];
    },

    /**
     * Session helpers are a thin view over the Supabase Auth session owned by
     * assets/js/supabase-client.js. Pages must not create their own "logged
     * in" state — that is how a page ends up trusting itself.
     */
    session: {
      create() { throw new Error('Sign in with VDB.auth.signin()/signup() instead.'); },
      get() { return null; },
      destroy() { if (window.VDB && window.VDB.auth) window.VDB.auth.signout(); },
    },
  };

  function redact(details) {
    if (details === null || details === undefined) return null;
    if (typeof details !== 'object') return String(details).slice(0, 160);
    const out = {};
    for (const [key, value] of Object.entries(details)) {
      out[key] = PII_KEYS.test(key) ? '[redacted]' : typeof value === 'object' ? String(value).slice(0, 80) : value;
    }
    return out;
  }

  // Any uncaught page error is worth a line in the operator's debug ring, but
  // never a toast and never the stack.
  window.addEventListener('error', (event) => {
    VG.audit('JS_ERROR', { message: String(event && event.message || '').slice(0, 160) });
  });

  window.VG = VG;
})();
