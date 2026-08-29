/**
 * Valmont Gadgets — Database Adapter
 * Bridges localStorage to Supabase (VDB).
 * Falls back to localStorage if Supabase is unavailable.
 * Include AFTER supabase-client.js
 */
(function(){
'use strict';

const LS_KEYS = {
  swap_listings: 'vg_swap_listings',
  swap_users: 'vg_swap_users',
  swap_leads: 'vg_swap_leads',
  used_inventory: 'vg_used_inventory',
  ws_dealers: 'vg_ws_dealers',
  ws_orders: 'vg_ws_orders',
  partner_apps: 'vg_partner_applications',
  admin_logs: 'vg_admin_logs',
  site_settings: 'vg_site_settings',
};

// ── Helpers ──
function lsGet(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch(e) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function lsRemove(key) { try { localStorage.removeItem(key); } catch(e) {} }

// ── Check if Supabase is available ──
function hasVDB() { return typeof window.VDB !== 'undefined' && window.VDB && window.VDB.db; }

// ── Retry wrapper ──
async function withRetry(fn, retries = 2, delay = 500) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch(e) { if (i === retries) return null; await new Promise(r => setTimeout(r, delay * (i + 1))); }
  }
  return null;
}

// ── Loading bar ──
const Loading = {
  _el: null,
  show() {
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ff8c00,#e67e00);z-index:9999;transition:opacity .3s;opacity:0';
      document.body.appendChild(this._el);
    }
    this._el.style.opacity = '1';
  },
  hide() { if (this._el) this._el.style.opacity = '0'; }
};

// ── SWAP LISTINGS ──
const SwapDB = {
  async getAll() {
    Loading.show();
    try {
    if (hasVDB()) {
      const result = await withRetry(() => VDB.swap.getActive());
      const { data, error } = result || {};
      if (!error && data && data.length > 0) return data;
    }
    return lsGet(LS_KEYS.swap_listings, []).filter(l => l.status === 'active');
    } finally { Loading.hide(); }
  },

  async getAllIncludingPending() {
    if (hasVDB()) {
      const { data, error } = await VDB.db.select('swap_listings', {}, { order: { column: 'created_at' } });
      if (!error && data) return data;
    }
    return lsGet(LS_KEYS.swap_listings, []);
  },

  async getByUser(userId) {
    if (hasVDB()) {
      const { data } = await VDB.db.select('swap_listings', { seller_id: userId });
      if (data) return data;
    }
    return lsGet(LS_KEYS.swap_listings, []).filter(l => l.userId === userId);
  },

  async getPromoted() {
    if (hasVDB()) {
      const { data } = await VDB.swap.getPromoted();
      if (data && data.length > 0) return data;
    }
    return lsGet(LS_KEYS.swap_listings, []).filter(l => l.promoted && l.status === 'active');
  },

  async create(listing) {
    if (hasVDB()) {
      const dbListing = {
        seller_id: listing.userId, seller_name: listing.userName, seller_phone: listing.userPhone,
        seller_verified: listing.userVerified || false, listing_type: listing.type,
        category: listing.category || 'phones', brand: listing.brand, model: listing.model,
        storage: listing.storage, color: listing.color, grade: listing.grade,
        battery_health: listing.battery, screen_condition: listing.screen,
        body_condition: listing.body, included: listing.included, want: listing.want,
        price: listing.price, budget_min: listing.budgetMin, budget_max: listing.budgetMax,
        notes: listing.notes, images: listing.images || [], city: listing.city,
        status: 'pending', is_promoted: false, views: 0, leads_count: 0,
      };
      const { data, error } = await VDB.swap.create(dbListing);
      if (!error && data && data[0]) return data[0];
    }
    // Fallback to localStorage
    const listings = lsGet(LS_KEYS.swap_listings, []);
    listing.id = listing.id || 's' + Date.now();
    listing.status = listing.status || 'pending';
    listings.unshift(listing);
    lsSet(LS_KEYS.swap_listings, listings);
    return listing;
  },

  async update(id, updates) {
    if (hasVDB()) {
      const { data } = await VDB.db.update('swap_listings', id, updates);
      if (data) return data;
    }
    const listings = lsGet(LS_KEYS.swap_listings, []);
    const idx = listings.findIndex(l => l.id === id);
    if (idx >= 0) { Object.assign(listings[idx], updates); lsSet(LS_KEYS.swap_listings, listings); return listings[idx]; }
    return null;
  },

  async approve(id) { return this.update(id, { status: 'active' }); },
  async reject(id) { return this.update(id, { status: 'rejected' }); },
  async remove(id) { return this.update(id, { status: 'removed' }); },

  async togglePromo(id, hours) {
    const listings = lsGet(LS_KEYS.swap_listings, []);
    const l = listings.find(x => x.id === id);
    if (l) {
      l.promoted = !l.promoted;
      l.promoExpiry = l.promoted ? Date.now() + (hours * 3600000) : null;
      lsSet(LS_KEYS.swap_listings, listings);
    }
    if (hasVDB()) {
      await VDB.swap.togglePromo(id, l && l.promoted ? new Date(l.promoExpiry).toISOString() : null);
    }
    return l;
  },

  async addLead(listingId, buyerName, buyerPhone, message) {
    if (hasVDB()) {
      const { data } = await VDB.swap.addLead(listingId, buyerName, buyerPhone, message);
      if (data) return data;
    }
    const leads = lsGet(LS_KEYS.swap_leads, []);
    const lead = { id: 'l' + Date.now(), listingId, buyerName, buyerPhone, message, date: new Date().toLocaleString(), status: 'new' };
    leads.push(lead);
    lsSet(LS_KEYS.swap_leads, leads);
    return lead;
  },

  async getLeads() {
    if (hasVDB()) {
      const { data } = await VDB.db.select('swap_leads', {}, { order: { column: 'created_at' } });
      if (data) return data;
    }
    return lsGet(LS_KEYS.swap_leads, []);
  },

  seed(listings) { if (lsGet(LS_KEYS.swap_listings, []).length === 0) lsSet(LS_KEYS.swap_listings, listings); },
};

// ── USERS ──
const UserDB = {
  async getAll() {
    if (hasVDB()) {
      const { data } = await VDB.sellers.getAll();
      if (data) return data;
    }
    return lsGet(LS_KEYS.swap_users, []);
  },

  async getByPhone(phone) {
    if (hasVDB()) {
      const user = await VDB.sellers.getByPhone(phone);
      if (user) return user;
    }
    return lsGet(LS_KEYS.swap_users, []).find(u => u.phone === phone);
  },

  async create(user) {
    if (hasVDB()) {
      const { data } = await VDB.sellers.create({
        name: user.name, phone: user.phone, city: user.city,
        ghana_card: user.ghanaCard, face_photo_url: user.facePhoto,
        face_verified: !!user.facePhoto, is_verified: true,
        role: 'seller', password_hash: user.pass,
      });
      if (data && data[0]) return data[0];
    }
    const users = lsGet(LS_KEYS.swap_users, []);
    user.id = user.id || 'u' + Date.now();
    users.push(user);
    lsSet(LS_KEYS.swap_users, users);
    return user;
  },

  async update(id, updates) {
    if (hasVDB()) {
      await VDB.db.update('sellers', id, updates);
    }
    const users = lsGet(LS_KEYS.swap_users, []);
    const idx = users.findIndex(u => u.id === id);
    if (idx >= 0) { Object.assign(users[idx], updates); lsSet(LS_KEYS.swap_users, users); }
  },

  async ban(id) {
    if (hasVDB()) await VDB.sellers.ban(id, 'Banned by admin');
    const users = lsGet(LS_KEYS.swap_users, []).filter(u => u.id !== id);
    lsSet(LS_KEYS.swap_users, users);
  },

  seed(users) { if (lsGet(LS_KEYS.swap_users, []).length === 0) lsSet(LS_KEYS.swap_users, users); },
};

// ── USED INVENTORY ──
const UsedDB = {
  async getAll() {
    Loading.show();
    try {
    if (hasVDB()) {
      const result = await withRetry(() => VDB.used.getAll());
      const { data } = result || {};
      if (data && data.length > 0) return data;
    }
    return lsGet(LS_KEYS.used_inventory, []);
    } finally { Loading.hide(); }
  },

  async getAvailable() {
    if (hasVDB()) {
      const { data } = await VDB.used.getAvailable();
      if (data && data.length > 0) return data;
    }
    return lsGet(LS_KEYS.used_inventory, []).filter(i => !i.sold);
  },

  async create(item) {
    if (hasVDB()) {
      const { data } = await VDB.used.create({
        origin: item.origin, brand: item.brand, name: item.name,
        storage: item.storage, color: item.color, grade: item.grade,
        battery_health: item.battery, price: item.price, was_price: item.was,
        screen_condition: item.screen, body_condition: item.body,
        charger_included: item.charger, images: item.images || [],
      });
      if (data && data[0]) return data[0];
    }
    const items = lsGet(LS_KEYS.used_inventory, []);
    item.id = item.id || 'p' + Date.now();
    items.unshift(item);
    lsSet(LS_KEYS.used_inventory, items);
    return item;
  },

  async toggleSold(id) {
    const items = lsGet(LS_KEYS.used_inventory, []);
    const item = items.find(i => i.id === id);
    if (item) { item.sold = !item.sold; lsSet(LS_KEYS.used_inventory, items); }
    if (hasVDB()) {
      if (item && item.sold) await VDB.used.markSold(id);
      else await VDB.used.restock(id);
    }
    return item;
  },

  async remove(id) {
    if (hasVDB()) await VDB.used.remove(id);
    const items = lsGet(LS_KEYS.used_inventory, []).filter(i => i.id !== id);
    lsSet(LS_KEYS.used_inventory, items);
  },

  seed(items) { if (lsGet(LS_KEYS.used_inventory, []).length === 0) lsSet(LS_KEYS.used_inventory, items); },
};

// ── WHOLESALE ──
const WholesaleDB = {
  async getDealers() {
    if (hasVDB()) {
      const { data } = await VDB.wholesale.getDealers();
      if (data) return data;
    }
    return lsGet(LS_KEYS.ws_dealers, []);
  },

  async createDealer(dealer) {
    if (hasVDB()) {
      const { data } = await VDB.wholesale.createDealer(dealer);
      if (data) return data;
    }
    const dealers = lsGet(LS_KEYS.ws_dealers, []);
    dealer.id = dealer.id || 'd' + Date.now();
    dealers.push(dealer);
    lsSet(LS_KEYS.ws_dealers, dealers);
    return dealer;
  },

  async getOrders(dealerId) {
    if (hasVDB()) {
      const { data } = await VDB.wholesale.getOrders(dealerId);
      if (data) return data;
    }
    const orders = lsGet(LS_KEYS.ws_orders, []);
    return dealerId ? orders.filter(o => o.dealerId === dealerId) : orders;
  },

  async createOrder(order) {
    if (hasVDB()) {
      const { data } = await VDB.wholesale.createOrder(order);
      if (data) return data;
    }
    const orders = lsGet(LS_KEYS.ws_orders, []);
    order.id = order.id || 'WO-' + Date.now();
    orders.unshift(order);
    lsSet(LS_KEYS.ws_orders, orders);
    return order;
  },
};

// ── PARTNER ──
const PartnerDB = {
  async getAll() {
    if (hasVDB()) {
      const { data } = await VDB.partner.getApplications();
      if (data) return data;
    }
    return lsGet(LS_KEYS.partner_apps, []);
  },

  async apply(app) {
    if (hasVDB()) {
      const { data } = await VDB.partner.apply(app);
      if (data) return data;
    }
    const apps = lsGet(LS_KEYS.partner_apps, []);
    app.id = app.id || 'pa' + Date.now();
    apps.unshift(app);
    lsSet(LS_KEYS.partner_apps, apps);
    return app;
  },
};

// ── EXPOSE ──
window.VDBSwap = SwapDB;
window.VDBUser = UserDB;
window.VDBUsed = UsedDB;
window.VDBWholesale = WholesaleDB;
window.VDBPartner = PartnerDB;

})();
