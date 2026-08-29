/**
 * Valmont Gadgets — Read-model adapter (VGA)
 *
 * Turns the rows the database is willing to hand out into the shapes the
 * platform pages render. Two rules:
 *
 *   1. No invented rows. If Supabase is unreachable the page shows a retry
 *      state; it must never fall back to a localStorage "sample" that a
 *      shopper could mistake for live stock or a real seller.
 *   2. No secrets, no PII. Raw Ghana Card numbers, phone numbers and any
 *      supplier cost stop at this layer unless the field is a deliberate,
 *      seller-chosen public contact handle.
 *
 * Writes do not go through here: pages call VDB.rpc.* which maps to a
 * SECURITY DEFINER Postgres function.
 */
(function () {
  'use strict';

  const gradeLabel = (grade) => (['A', 'B', 'C'].indexOf(String(grade || '').toUpperCase()) !== -1
    ? String(grade).toUpperCase() : '');

  const numberOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const dateOnly = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  const imageList = (value) => {
    let list = value;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (e) { list = list ? [list] : []; }
    }
    if (!Array.isArray(list)) list = list ? [list] : [];
    const safe = list.map((item) => window.VG.safeImageRef(item)).filter(Boolean);
    return safe.slice(0, 8);
  };

  const PLACEHOLDER = 'uploads/clean_15_pro.png';

  /** Active swap/sell listings, promoted first (public projection). */
  async function swapListings() {
    let rows = [];
    try {
      rows = await window.VDB.read.activeSwapListings(120);
    } catch (error) {
      const err = new Error('Listings are unavailable right now.');
      err.cause = error;
      err.retryable = true;
      throw err;
    }
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      type: ['swap', 'sell', 'both'].indexOf(row.listing_type) !== -1 ? row.listing_type : 'swap',
      category: String(row.category || 'phones'),
      brand: String(row.brand || ''),
      model: String(row.model || ''),
      storage: String(row.storage || ''),
      color: String(row.color || ''),
      grade: gradeLabel(row.grade),
      battery: numberOrNull(row.battery_health),
      screen: String(row.screen_condition || ''),
      body: String(row.body_condition || ''),
      included: String(row.included || ''),
      want: String(row.want || ''),
      price: numberOrNull(row.price),
      budgetMin: numberOrNull(row.budget_min),
      budgetMax: numberOrNull(row.budget_max),
      notes: String(row.notes || ''),
      images: imageList(row.images),
      fallbackImage: PLACEHOLDER,
      city: String(row.city || ''),
      sellerName: String(row.seller_name || 'Valmont seller'),
      verified: row.seller_verified === true,
      promoted: row.is_promoted === true && (!row.promo_expires_at || new Date(row.promo_expires_at) > new Date()),
      views: numberOrNull(row.views) || 0,
      date: dateOnly(row.created_at),
      status: 'active',
    }));
  }

  /** The signed-in seller's own listings, including pending ones. */
  async function mySwapListings() {
    const rows = await window.VDB.rpc.myListings();
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      type: ['swap', 'sell', 'both'].indexOf(row.listing_type) !== -1 ? row.listing_type : 'swap',
      model: String(row.model || ''),
      brand: String(row.brand || ''),
      storage: String(row.storage || ''),
      grade: gradeLabel(row.grade),
      price: numberOrNull(row.price),
      want: String(row.want || ''),
      images: imageList(row.images),
      fallbackImage: PLACEHOLDER,
      city: String(row.city || ''),
      status: String(row.status || 'pending'),
      promoted: row.is_promoted === true && (!row.promo_expires_at || new Date(row.promo_expires_at) > new Date()),
      promoPending: row.promo_pending === true,
      views: numberOrNull(row.views) || 0,
      leads: numberOrNull(row.leads_count) || 0,
      date: dateOnly(row.created_at),
      whatsappNumber: String(row.seller_phone || ''),
      sellerName: String(row.seller_name || ''),
    }));
  }

  async function myLeads() {
    const rows = await window.VDB.rpc.profileLeads ? await window.VDB.rpc.profileLeads() : [];
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      listingId: String(row.listing_id || ''),
      listingModel: String(row.listing_model || ''),
      listingImage: imageList(row.listing_images)[0] || PLACEHOLDER,
      buyerName: String(row.buyer_name || 'Valmont buyer'),
      buyerPhone: String(row.buyer_phone || ''),
      message: String(row.message || ''),
      status: String(row.status || 'new'),
      date: dateOnly(row.created_at),
    }));
  }

  async function usedInventory(origin) {
    let rows = [];
    try {
      rows = await window.VDB.rpc.usedInventory(origin);
    } catch (error) {
      const err = new Error('Imported stock is unavailable right now.');
      err.cause = error;
      err.retryable = true;
      throw err;
    }
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      origin: row.origin === 'us' ? 'us' : 'uk',
      brand: String(row.brand || ''),
      name: String(row.name || ''),
      storage: String(row.storage || ''),
      color: String(row.color || ''),
      grade: gradeLabel(row.grade),
      battery: numberOrNull(row.battery_health),
      price: numberOrNull(row.price),
      was: numberOrNull(row.was_price),
      screen: String(row.screen_condition || ''),
      body: String(row.body_condition || ''),
      charger: String(row.charger_included || ''),
      images: imageList(row.images),
      fallbackImage: PLACEHOLDER,
      date: dateOnly(row.listed_date),
      sold: false,
    }));
  }

  /**
   * Dealer rows (including supplier cost) are only ever handed out by
   * `get_wholesale_catalog()`, which fails closed for anyone Postgres has not
   * marked approved. The page does not have to check the profile itself.
   */
  async function wholesaleCatalog() {
    const rows = await window.VDB.rpc.wholesaleCatalog();
    return {
      approved: true,
      products: (Array.isArray(rows) ? rows : []).map((row) => ({
        id: String(row.id),
        name: String(row.name || ''),
        category: String(row.category_id || ''),
        storage: String(row.storage_options && row.storage_options[0] || ''),
        retail: numberOrNull(row.price),
        wholesale: numberOrNull(row.wholesale_price),
        tiers: Array.isArray(row.tiers) ? row.tiers.map((t) => ({
          qty: numberOrNull(t.min_qty),
          price: numberOrNull(t.unit_price),
        })) : [],
        image: imageList([row.image_url])[0] || PLACEHOLDER,
        stock: numberOrNull(row.stock) || 0,
      })),
    };
  }

  async function myWholesaleProfile() {
    const row = await window.VDB.rpc.wholesaleProfile();
    if (!row) return null;
    return {
      id: String(row.id || ''),
      businessName: String(row.business_name || ''),
      contactName: String(row.contact_name || ''),
      phone: String(row.phone || ''),
      status: String(row.status || 'pending'),
      since: dateOnly(row.created_at),
    };
  }

  async function myOrders() {
    const rows = await window.VDB.rpc.wholesaleOrders();
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id),
      orderNumber: String(row.order_number || ''),
      total: numberOrNull(row.total),
      status: String(row.status || 'pending'),
      items: Array.isArray(row.items) ? row.items.map((item) => ({
        name: String(item.name || ''),
        qty: numberOrNull(item.qty) || 0,
        unitPrice: numberOrNull(item.unit_price),
      })) : [],
      date: dateOnly(row.created_at),
    }));
  }

  async function partnerStatus() {
    const row = await window.VDB.rpc.partnerStatus();
    if (!row) return null;
    return {
      id: String(row.id || ''),
      shopName: String(row.shop_name || ''),
      plan: String(row.plan || 'starter'),
      status: String(row.status || 'pending'),
      date: dateOnly(row.created_at),
    };
  }

  window.VGA = {
    swap: {
      browse: swapListings,
      mine: mySwapListings,
      leads: myLeads,
      create: (listing) => window.VDB.rpc.createListing(listing),
      setStatus: (id, status) => window.VDB.rpc.updateListingStatus(id, status),
      promote: (id, hours) => window.VDB.rpc.requestPromotion(id, hours),
      expressInterest: (id, message) => window.VDB.rpc.addLead(id, message),
      recordView: (id) => window.VDB.rpc.listingViews(id),
    },
    used: { inventory: usedInventory },
    wholesale: {
      catalog: wholesaleCatalog,
      profile: myWholesaleProfile,
      // Pages pass the same camelCase shape they display; the wire names stay
      // inside this file so a rename in Postgres is a one-line change.
      apply: (business) => window.VDB.rpc.wholesaleApply({
        business_name: String((business && business.businessName) || '').slice(0, 90),
        contact_name: String((business && business.contactName) || '').slice(0, 80),
        phone: String((business && business.phone) || '').slice(0, 20),
        email: String((business && business.email) || '').slice(0, 120),
        city: String((business && business.city) || '').slice(0, 60),
      }),
      placeOrder: (items, address) => window.VDB.rpc.wholesalePlaceOrder(items, address),
      orders: myOrders,
      quote: (items) => window.VDB.rpc.wholesaleQuote(items),
    },
    partner: {
      apply: (application) => window.VDB.rpc.partnerApply(application),
      status: partnerStatus,
    },
    seller: { profile: () => window.VDB.rpc.profile() },
  };
})();
