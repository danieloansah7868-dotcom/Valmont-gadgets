/**
 * Valmont Gadgets — Browser data layer (VDB)
 *
 * One narrow, auditable path from a platform page to Supabase:
 *   1. `VDB.auth.*`   — real Supabase Auth (email + password). No password is
 *                       ever kept in this browser; only the short-lived access
 *                       token, shared with the storefront session.
 *   2. `VDB.rpc.*`    — the ONLY way a page mutates data. Every write goes to a
 *                       `SECURITY DEFINER` Postgres function that derives the
 *                       caller from `auth.uid()` and prices/reviews what it
 *                       writes. A page can never invent a price, a seller
 *                       identity, an approval or a "paid" flag.
 *   3. `VDB.read.*`   — read-only projections. Rows the database has decided a
 *                       given caller may see; there is no client-side fallback
 *                       that fabricates data when the database is unreachable.
 *
 * There is deliberately no generic insert/update/delete helper here: direct
 * table mutation from a browser has repeatedly been the hole this repo had to
 * close (see supabase/migrations/20260811_admin_email_allowlist.sql).
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
  // Public anon key, identical to the one already shipped in shop.min.js. It
  // grants nothing by itself: every policy is enforced by Postgres.
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

  // Shared with the storefront so one sign-in covers shop, swap, and wholesale.
  const K_TOKEN = 'valmont_access_token';
  const K_USER = 'valmont_user';
  const K_EXPIRES = 'valmont_token_expires_at';
  // Sessions are short: 2 hours, then the page asks for a fresh sign-in.
  const SESSION_MS = 2 * 60 * 60 * 1000;

  const read = (key) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  };
  const write = (key, value) => {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* private mode / quota — the session simply stays in memory */ }
  };

  let memoryToken = null;
  let memoryUser = null;
  let memoryExpires = 0;

  /**
   * The admin surfaces sign in through the pinned Supabase SDK (admin-login.html),
   * which keeps its session under `sb-<project-ref>-auth-token`. Reuse that
   * bearer token here so a single admin sign-in covers both shells; the token is
   * still verified server-side before anything is rendered.
   */
  function vendorSession() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-[a-z0-9-]+-auth-token$/i.test(key)) continue;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || 'null');
        const session = stored && (stored.currentSession || stored.session);
        if (session && session.access_token && Number(session.expires_at) * 1000 > Date.now()) {
          return session;
        }
      } catch (e) { /* unreadable storage entry */ }
    }
    return null;
  }

  const token = () => {
    if (Date.now() < expiresAt()) return read(K_TOKEN) || memoryToken;
    const vendor = vendorSession();
    return vendor ? vendor.access_token : null;
  };
  const expiresAt = () => Number(read(K_EXPIRES) || memoryExpires || 0);

  function setSession(session) {
    if (!session || !session.access_token) return null;
    const user = normalizeUser(session.user);
    memoryToken = session.access_token;
    memoryUser = user;
    memoryExpires = Date.now() + (session.expires_in ? session.expires_in * 1000 : SESSION_MS);
    write(K_TOKEN, session.access_token);
    write(K_EXPIRES, String(memoryExpires));
    write(K_USER, JSON.stringify(user));
    return user;
  }

  function normalizeUser(account) {
    const metadata = (account && account.user_metadata) || {};
    const email = (account && account.email) || '';
    return {
      id: (account && account.id) || '',
      name: metadata.full_name || metadata.name || (email ? email.split('@')[0] : 'Valmont Seller'),
      email,
      phone: metadata.phone || '',
      city: metadata.city || '',
      // Verification state is decided in Postgres, never in the browser.
      verified: false,
      faceVerified: false,
    };
  }

  function clearSession() {
    memoryToken = null;
    memoryUser = null;
    memoryExpires = 0;
    write(K_TOKEN, null);
    write(K_USER, null);
    write(K_EXPIRES, null);
  }

  async function currentAccount() {
    const access = token();
    if (!access) return null;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${access}` },
      });
      if (!response.ok) {
        // Expired or revoked: our own copy is worthless, drop it. A vendor
        // (SDK-managed) session is cleared by the SDK, not by us.
        if (memoryToken || read(K_TOKEN)) clearSession();
        return null;
      }
      const account = await response.json();
      const user = normalizeUser(account);
      memoryUser = user;
      write(K_USER, JSON.stringify(user));
      return user;
    } catch (e) {
      // Network failure: keep the session but never claim more than the
      // account snapshot already proves (id/name/phone/city).
      if (memoryUser) return memoryUser;
      try {
        const stored = JSON.parse(read(K_USER) || 'null');
        return stored && stored.id ? normalizeUser(stored) : null;
      } catch (err) {
        return null;
      }
    }
  }

  /** Maps GoTrue error payloads to shopper-safe copy (no user enumeration). */
  function authMessage(payload, status) {
    const raw = String((payload && (payload.error_description || payload.msg || payload.message)) || '').toLowerCase();
    if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
    if (/invalid login credentials/.test(raw)) return 'Email or password is incorrect.';
    if (/email not confirmed/.test(raw)) return 'Confirm your email first — check your inbox.';
    if (/already registered|already exists/.test(raw)) return 'That email already has an account. Please sign in instead.';
    if (/password should be/.test(raw)) return 'Password is too short — use at least 8 characters.';
    if (/rate limit/.test(raw)) return 'Too many attempts. Please try again shortly.';
    return 'We could not sign you in. Please try again.';
  }

  async function authRequest(path, body) {
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error('Network unavailable. Check your connection and try again.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(authMessage(payload, response.status));
    return payload;
  }

  const auth = {
    get emailRequired() { return true; },
    current: () => currentAccount(),
    async signin(email, password) {
      const result = await authRequest('token?grant_type=password', {
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
      });
      const user = setSession(result);
      if (!user) throw new Error('Sign-in did not return a session. Please try again.');
      // Seller-specific profile (Ghana Card hash, verification) comes from Postgres.
      try { user.sellerProfile = await rpc.profile(); } catch (e) { user.sellerProfile = null; }
      return user;
    },
    async signup(input) {
      const email = String((input && input.email) || '').trim().toLowerCase();
      const password = String((input && input.password) || '');
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) throw new Error('Enter a valid email address.');
      if (password.length < 8) throw new Error('Password is too short — use at least 8 characters.');
      const result = await authRequest('signup', {
        email,
        password,
        data: {
          full_name: String((input && input.name) || '').slice(0, 80),
          phone: String((input && input.phone) || '').slice(0, 20),
          city: String((input && input.city) || '').slice(0, 60),
        },
      });
      if (result.session && result.session.access_token) {
        const user = setSession(result.session);
        await persistProfile(input);
        try { user.sellerProfile = await rpc.profile(); } catch (e) { /* pending */ }
        return { user, confirmed: true };
      }
      // Email confirmation is on for this project: no session yet.
      await Promise.resolve();
      return { user: normalizeUser(result.user), confirmed: false };
    },
    async signout() {
      const access = token();
      clearSession();
      if (!access) return;
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${access}` },
        });
      } catch (e) { /* the local session is already gone */ }
    },
    /** Optional selfie is uploaded to the private bucket by an admin review, never stored here. */
  };

  /** PostgREST call for a SECURITY DEFINER function. */
  async function callRpc(name, params) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid request.');
    const access = token();
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          ...(access ? { authorization: `Bearer ${access}` } : {}),
          prefer: 'tx=single',
        },
        body: JSON.stringify(params || {}),
      });
    } catch (e) {
      throw new Error('The service is unreachable right now. Please try again.');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = String((payload && (payload.message || payload.error)) || '');
      // Postgres raise_message text is ours (see the platform migration); raw
      // driver detail is never shown to a shopper.
      if (response.status === 401 || /authentication required|28000/i.test(message)) {
        throw new Error('Please sign in to continue.');
      }
      if (response.status === 403 || /42501|permission/i.test(message)) {
        throw new Error('You do not have access to that action.');
      }
      throw new Error(sanitizeRpcMessage(message));
    }
    return payload;
  }

  /** Read-only projection over PostgREST (GET, anonymous or bearer). */
  async function select(table, query, options) {
    if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error('Invalid request.');
    const access = token();
    const search = new URLSearchParams(query || {});
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${search}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${access || SUPABASE_ANON_KEY}`,
          ...(options && options.head ? { range: '0-0', 'range-unit': 'rows' } : {}),
        },
      });
    } catch (e) {
      throw new Error('The service is unreachable right now. Please try again.');
    }
    if (!response.ok) throw new Error('That data is not available right now.');
    return await response.json();
  }

  function sanitizeRpcMessage(message) {
    const text = String(message || '')
      .replace(/^(?:new\s+\)?Error\s*\(?\s*['"]|insert|update|delete|select)/i, '')
      .replace(/['"`\s]+$/g, '')
      .trim();
    if (!text || /row-level security|permission denied|duplicate key/i.test(text)) {
      return 'This action is not allowed from here.';
    }
    return text.slice(0, 180);
  }

  async function persistProfile(input) {
    return await callRpc('save_seller_profile', {
      p_display_name: String((input && input.name) || '').slice(0, 80),
      p_phone: String((input && input.phone) || '').slice(0, 20),
      p_city: String((input && input.city) || '').slice(0, 60),
      p_ghana_card: String((input && input.ghanaCard) || '').slice(0, 24),
    });
  }

  const rpc = {
    profile: () => callRpc('get_my_seller_profile', {}),
    createListing: (listing) => callRpc('create_swap_listing', { p_listing: listing }),
    myListings: () => callRpc('get_my_swap_listings', {}),
    updateListingStatus: (listingId, status) => callRpc('update_swap_listing_status', { p_listing_id: listingId, p_status: status }),
    requestPromotion: (listingId, hours) => callRpc('request_listing_promotion', { p_listing_id: listingId, p_plan_hours: hours }),
    addLead: (listingId, message) => callRpc('create_swap_lead', { p_listing_id: listingId, p_message: message }),
    listingViews: (listingId) => callRpc('record_listing_view', { p_listing_id: listingId }),
    // One dispatcher, not one RPC per button: the SQL allowlist in
    // admin_private_execute() decides what an admin may do, and this is the only
    // name the console is allowed to call. Sending `admin_${name}` would ask
    // PostgREST for a function that does not exist.
    admin: (name, params) => callRpc('admin', { p_name: name, p_params: params || {} }),
    partnerApply: (application) => callRpc('apply_store_partner', { p_application: application }),
    wholesaleApply: (business) => callRpc('apply_wholesale_account', { p_business: business }),
    wholesaleProfile: () => callRpc('get_my_wholesale_account', {}),
    wholesaleCatalog: () => callRpc('get_wholesale_catalog', {}),
    wholesaleOrders: () => callRpc('get_my_wholesale_orders', {}),
    wholesaleQuote: (items) => callRpc('price_wholesale_order', { p_items: items }),
    wholesalePlaceOrder: (items, address) => callRpc('place_wholesale_order', { p_items: items, p_delivery_address: address }),
    partnerStatus: () => callRpc('get_my_partner_application', {}),
    profileLeads: () => callRpc('get_my_swap_leads', {}),
    usedInventory: (origin) => callRpc('get_used_inventory', { p_origin: origin || null }),
    /** Server-side answer to "is this session the allowlisted admin?". */
    isAdmin: () => callRpc('is_valmont_admin', {}),
    adminBoard: (section, limit) => callRpc('admin_platform_board', { p_section: section, p_limit: Math.min(Math.max(Number(limit) || 50, 1), 200) }),
  };

  const read_ = {
    activeSwapListings: (limit) => select('swap_listings', {
      select: 'id,brand,model,storage,color,grade,battery_health,screen_condition,body_condition,included,want,price,budget_min,budget_max,notes,images,city,listing_type,category,status,is_promoted,promo_expires_at,views,seller_name,seller_verified,created_at',
      status: 'eq.active',
      order: 'is_promoted.desc,created_at.desc',
      limit: String(Math.min(Math.max(Number(limit) || 60, 1), 120)),
    }),
    availableUsed: (limit) => select('used_inventory', {
      select: 'id,origin,brand,name,storage,color,grade,battery_health,price,was_price,screen_condition,body_condition,charger_included,images,listed_date',
      is_sold: 'eq.false',
      order: 'listed_date.desc',
      limit: String(Math.min(Math.max(Number(limit) || 120, 1), 300)),
    }),
  };

  const session = {
    /** Kept for API compatibility with pages written against the old helper. */
    create() { throw new Error('Sessions come from Supabase Auth only.'); },
    get() { return null; },
    destroy() { clearSession(); },
    expiresAt: () => expiresAt(),
  };

  window.VDB = {
    version: '2.0.0',
    config: { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY },
    auth,
    rpc,
    read: read_,
    session,
    clearSession,
    hasSession: () => Boolean(token()),
    // Legacy no-ops kept so an old reference fails loudly instead of writing.
    db: {
      select() { throw new Error('Direct table reads are not available from the browser. Use VDB.read.'); },
      insert() { throw new Error('Direct table writes are not available from the browser. Use VDB.rpc.'); },
      update() { throw new Error('Direct table writes are not available from the browser. Use VDB.rpc.'); },
      delete() { throw new Error('Direct table writes are not available from the browser. Use VDB.rpc.'); },
      upsert() { throw new Error('Direct table writes are not available from the browser. Use VDB.rpc.'); },
    },
  };
})();
