/**
 * Valmont Gadgets — Security Module
 * Include this BEFORE any page-specific scripts.
 * Provides: sanitization, rate limiting, input validation, XSS protection
 */
(function(){
'use strict';

const VG_SECURITY = {
  version: '1.0.0',

  // ── HTML Sanitizer (prevents XSS) ──
  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '/':'&#47;' };
    return str.replace(/[&<>"'/]/g, c => map[c]);
  },

  // ── Safe innerHTML — escapes all user data ──
  safeText(str) {
    return this.escapeHtml(String(str || ''));
  },

  // ── Ghana Card Validator ──
  isValidGhanaCard(gc) {
    if (typeof gc !== 'string') return false;
    const clean = gc.trim().toUpperCase();
    // GHA-XXXXXXXXX-X (3 letters, dash, 9 digits, dash, 1 digit)
    return /^GHA-\d{9}-\d$/.test(clean);
  },

  // ── Ghana Phone Validator ──
  isValidGhanaPhone(phone) {
    if (typeof phone !== 'string') return false;
    const digits = phone.replace(/\D/g, '');
    // 0XX XXX XXXX — 10 digits starting with 0
    return /^0\d{9}$/.test(digits);
  },

  // ── URL Validator (only https) ──
  isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/.test(url.trim());
  },

  // ── Number Validator ──
  safeNumber(val, min, max, fallback) {
    const n = parseInt(val);
    if (isNaN(n)) return fallback;
    if (min !== undefined && n < min) return fallback;
    if (max !== undefined && n > max) return fallback;
    return n;
  },

  // ── Password Strength ──
  isStrongPassword(p) {
    return typeof p === 'string' && p.length >= 6;
  },

  // ── Rate Limiter ──
  canPerform(action, maxAttempts, windowMs) {
    const key = 'vg_rate_' + action;
    const now = Date.now();
    let attempts = [];
    try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    attempts = attempts.filter(t => now - t < windowMs);
    if (attempts.length >= maxAttempts) return false;
    attempts.push(now);
    try { localStorage.setItem(key, JSON.stringify(attempts)); } catch(e) {}
    return true;
  },

  // ── Get remaining attempts ──
  getRemainingAttempts(action, maxAttempts, windowMs) {
    const key = 'vg_rate_' + action;
    const now = Date.now();
    let attempts = [];
    try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    attempts = attempts.filter(t => now - t < windowMs);
    return Math.max(0, maxAttempts - attempts.length);
  },

  // ── Session Manager ──
  session: {
    create(key, data, expiryMs) {
      const session = { ...data, created: Date.now(), expires: Date.now() + expiryMs };
      try { localStorage.setItem(key, JSON.stringify(session)); } catch(e) {}
      return session;
    },
    get(key) {
      try {
        const s = JSON.parse(localStorage.getItem(key));
        if (!s) return null;
        if (Date.now() > s.expires) { localStorage.removeItem(key); return null; }
        return s;
      } catch(e) { return null; }
    },
    destroy(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    }
  },

  // ── Content Security ──
  sanitizeObject(obj) {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') clean[k] = this.escapeHtml(v);
      else if (typeof v === 'number') clean[k] = v;
      else if (typeof v === 'boolean') clean[k] = v;
      else if (Array.isArray(v)) clean[k] = v.map(i => typeof i === 'string' ? this.escapeHtml(i) : i);
      else if (v === null || v === undefined) clean[k] = v;
      else clean[k] = v;
    }
    return clean;
  },

  // ── Anti-CSRF Token ──
  generateToken() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  },

  // ── Secure localStorage wrapper ──
  storage: {
    set(key, value) {
      try {
        const wrapper = { d: value, t: Date.now(), h: VG_SECURITY.generateToken().slice(0, 8) };
        localStorage.setItem(key, JSON.stringify(wrapper));
      } catch(e) {}
    },
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        // Support both wrapped and legacy format
        if (parsed && parsed.d !== undefined && parsed.t !== undefined) return parsed.d;
        return parsed; // Legacy format
      } catch(e) { return fallback; }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    }
  },

  // ── Input field validator ──
  validateField(value, rules) {
    const v = typeof value === 'string' ? value.trim() : value;
    if (rules.required && (!v || v.length === 0)) return { valid: false, msg: rules.label + ' is required.' };
    if (rules.minLength && v.length < rules.minLength) return { valid: false, msg: rules.label + ' must be at least ' + rules.minLength + ' characters.' };
    if (rules.maxLength && v.length > rules.maxLength) return { valid: false, msg: rules.label + ' must be under ' + rules.maxLength + ' characters.' };
    if (rules.pattern && !rules.pattern.test(v)) return { valid: false, msg: rules.label + ' format is invalid.' };
    if (rules.custom && !rules.custom(v)) return { valid: false, msg: rules.label + ' is invalid.' };
    return { valid: true, msg: '' };
  },

  // ── Brute force protection ──
  isLockedOut(action) {
    const key = 'vg_lockout_' + action;
    try {
      const lock = JSON.parse(localStorage.getItem(key));
      if (lock && Date.now() < lock.until) return { locked: true, remaining: Math.ceil((lock.until - Date.now()) / 60000) };
      return { locked: false };
    } catch(e) { return { locked: false }; }
  },

  lockOut(action, minutes) {
    const key = 'vg_lockout_' + action;
    try { localStorage.setItem(key, JSON.stringify({ until: Date.now() + (minutes * 60000) })); } catch(e) {}
  },

  // ── Audit logger ──
  audit(action, details) {
    const logs = VG_SECURITY.storage.get('vg_audit_logs', []);
    logs.unshift({
      action,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      time: new Date().toISOString(),
      token: VG_SECURITY.generateToken().slice(0, 6)
    });
    if (logs.length > 500) logs.length = 500;
    VG_SECURITY.storage.set('vg_audit_logs', logs);
  }
};

// Expose globally
window.VG = VG_SECURITY;

// ── Auto-apply security headers via meta tags (if not already present) ──
if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
  const metas = [
    { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
    { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
    { httpEquiv: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
  ];
  metas.forEach(m => {
    const meta = document.createElement('meta');
    meta.httpEquiv = m.httpEquiv;
    meta.content = m.content;
    document.head.appendChild(meta);
  });
}

// ── Disable console in production ──
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const noop = () => {};
  // Keep error for debugging, disable log/info/debug/warn
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
}

// ── Block eval() ──
window.eval = function() { throw new Error('eval() is disabled for security.'); };

// ── Warn on suspicious activity ──
window.addEventListener('error', (e) => {
  VG_SECURITY.audit('JS_ERROR', e.message + ' at ' + e.filename + ':' + e.lineno);
});

})();
