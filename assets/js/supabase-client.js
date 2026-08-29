/**
 * Valmont Gadgets — Shared Supabase Client
 * Include AFTER security.js and supabase.min.js
 * Provides: authenticated client, CRUD helpers, realtime subscriptions
 */
(function(){
'use strict';

const SB_URL = 'https://eydsoqnpetqczaeqrscc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc';

let _client = null;

function getClient() {
  if (_client) return _client;
  try {
    _client = window.supabase.createClient(SB_URL, SB_KEY, {
      global: { headers: { Authorization: 'Bearer ' + (localStorage.getItem('valmont_access_token') || '') } }
    });
  } catch(e) {
    console.error('Supabase init failed:', e);
  }
  return _client;
}

// ── Generic CRUD ──
const db = {
  // SELECT with optional filters
  async select(table, filters = {}, options = {}) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    let query = sb.from(table).select(options.select || '*');
    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'object' && v.op) {
        query = query.filter(k, v.op, v.val);
      } else {
        query = query.eq(k, v);
      }
    }
    if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    return await query;
  },

  // INSERT
  async insert(table, data) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    return await sb.from(table).insert(data).select();
  },

  // UPDATE
  async update(table, id, data) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    return await sb.from(table).update(data).eq('id', id).select();
  },

  // DELETE
  async delete(table, id) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    return await sb.from(table).delete().eq('id', id);
  },

  // UPSERT
  async upsert(table, data) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    return await sb.from(table).upsert(data).select();
  },

  // RPC call
  async rpc(fn, params = {}) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    return await sb.rpc(fn, params);
  },

  // Count
  async count(table, filters = {}) {
    const sb = getClient(); if (!sb) return { data: null, error: 'No client' };
    let query = sb.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v);
    }
    return await query;
  }
};

// ── Swap Listings Helpers ──
const swap = {
  async getActive(filters = {}) {
    return await db.select('swap_listings', { status: 'active', ...filters }, { order: { column: 'created_at' } });
  },
  async getPending() {
    return await db.select('swap_listings', { status: 'pending' }, { order: { column: 'created_at' } });
  },
  async getPromoted() {
    return await db.select('swap_listings', { is_promoted: true, status: 'active' }, { order: { column: 'created_at' } });
  },
  async create(listing) {
    return await db.insert('swap_listings', listing);
  },
  async approve(id) {
    return await db.update('swap_listings', id, { status: 'active' });
  },
  async reject(id) {
    return await db.update('swap_listings', id, { status: 'rejected' });
  },
  async remove(id) {
    return await db.update('swap_listings', id, { status: 'removed' });
  },
  async togglePromo(id, expiresAt) {
    const { data } = await db.select('swap_listings', { id }, { select: 'is_promoted', limit: 1 });
    const current = data && data[0] ? data[0].is_promoted : false;
    return await db.update('swap_listings', id, { is_promoted: !current, promo_expires_at: !current ? expiresAt : null });
  },
  async incrementViews(id) {
    return await db.rpc('increment_column', { table_name: 'swap_listings', column_name: 'views', row_id: id });
  },
  async addLead(listingId, buyerName, buyerPhone, message) {
    return await db.insert('swap_leads', { listing_id: listingId, buyer_name: buyerName, buyer_phone: buyerPhone, message });
  },
  async getLeads(listingId) {
    return await db.select('swap_leads', { listing_id: listingId }, { order: { column: 'created_at' } });
  }
};

// ── Used Inventory Helpers ──
const used = {
  async getAvailable(filters = {}) {
    return await db.select('used_inventory', { is_sold: false, ...filters }, { order: { column: 'listed_date' } });
  },
  async getAll() {
    return await db.select('used_inventory', {}, { order: { column: 'listed_date' } });
  },
  async create(item) {
    return await db.insert('used_inventory', item);
  },
  async markSold(id) {
    return await db.update('used_inventory', id, { is_sold: true });
  },
  async restock(id) {
    return await db.update('used_inventory', id, { is_sold: false });
  },
  async remove(id) {
    return await db.delete('used_inventory', id);
  }
};

// ── Wholesale Helpers ──
const wholesale = {
  async getDealers(filters = {}) {
    return await db.select('wholesale_dealers', filters);
  },
  async createDealer(dealer) {
    return await db.insert('wholesale_dealers', dealer);
  },
  async approveDealer(id) {
    return await db.update('wholesale_dealers', id, { status: 'approved' });
  },
  async getOrders(dealerId) {
    const filters = dealerId ? { dealer_id: dealerId } : {};
    return await db.select('wholesale_orders', filters, { order: { column: 'created_at' } });
  },
  async createOrder(order) {
    return await db.insert('wholesale_orders', order);
  },
  async updateOrderStatus(id, status) {
    return await db.update('wholesale_orders', id, { status });
  }
};

// ── Partner Helpers ──
const partner = {
  async getApplications(filters = {}) {
    return await db.select('partner_applications', filters, { order: { column: 'created_at' } });
  },
  async apply(application) {
    return await db.insert('partner_applications', application);
  },
  async approve(id) {
    return await db.update('partner_applications', id, { status: 'approved' });
  },
  async reject(id) {
    return await db.update('partner_applications', id, { status: 'rejected' });
  }
};

// ── Ad Payment Helpers ──
const ads = {
  async recordPayment(payment) {
    return await db.insert('ad_payments', payment);
  },
  async getPayments(sellerId) {
    const filters = sellerId ? { seller_id: sellerId } : {};
    return await db.select('ad_payments', filters, { order: { column: 'created_at' } });
  },
  async getTotalRevenue() {
    const { data } = await db.select('ad_payments', { status: 'completed' });
    return data ? data.reduce((s, p) => s + (p.amount || 0), 0) : 0;
  }
};

// ── Seller Helpers ──
const sellers = {
  async getByPhone(phone) {
    const { data } = await db.select('sellers', { phone }, { limit: 1 });
    return data && data[0] ? data[0] : null;
  },
  async create(seller) {
    return await db.insert('sellers', seller);
  },
  async verify(id) {
    return await db.update('sellers', id, { is_verified: true });
  },
  async ban(id, reason) {
    return await db.update('sellers', id, { is_banned: true, ban_reason: reason });
  },
  async getAll() {
    return await db.select('sellers', {}, { order: { column: 'created_at' } });
  }
};

// ── Audit Log ──
const audit = {
  async log(adminUser, action, details = {}) {
    return await db.insert('admin_audit_log', { admin_user: adminUser, action, details });
  },
  async getAll(limit = 100) {
    return await db.select('admin_audit_log', {}, { order: { column: 'created_at' }, limit });
  }
};

// ── Settings ──
const settings = {
  async get(key) {
    const { data } = await db.select('site_settings', { key }, { limit: 1 });
    return data && data[0] ? data[0].value : null;
  },
  async set(key, value) {
    return await db.upsert('site_settings', { key, value });
  }
};

// ── Realtime subscriptions ──
function subscribe(table, callback, filter = '*') {
  const sb = getClient(); if (!sb) return null;
  return sb.channel('public:' + table)
    .on('postgres_changes', { event: filter, schema: 'public', table }, callback)
    .subscribe();
}

// ── Expose globally ──
window.VDB = {
  client: getClient,
  db,
  swap,
  used,
  wholesale,
  partner,
  ads,
  sellers,
  audit,
  settings,
  subscribe
};

})();
