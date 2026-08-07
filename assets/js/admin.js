// Valmont Gadgets complete admin panel
// Password gate, Supabase CRUD, localStorage fallback, image uploads and responsive UI.

const SUPABASE_URL = "https://eydsoqnpetqczaeqrscc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc";
const PRODUCT_IMAGE_BUCKET = "product-images";

const DEFAULT_CATEGORIES = [
  { id: "iphones", name: "iPhones and Apple", slug: "iphones", sort_order: 1 },
  { id: "samsung", name: "Samsung Galaxy", slug: "samsung", sort_order: 2 },
  { id: "laptops", name: "Executive Laptops", slug: "laptops", sort_order: 3 },
  { id: "audio", name: "Smart Audio", slug: "audio", sort_order: 4 },
  { id: "power", name: "Power and Chargers", slug: "power", sort_order: 5 }
];

const DEFAULT_SETTINGS = {
  store_name: "Valmont Gadgets",
  admin_email: "admin@valmontgadgets.com",
  hero_headline: "Executive Midweek Deals",
  hero_subtitle: "Genuine phones, laptops and electronics with warranty support in Ghana.",
  hero_cta: "Shop Deals",
  announcement: "GENUINE PHONES & LAPTOPS WITH 12-MONTH WARRANTY • FREE ACCRA DELIVERY ABOVE GH₵ 5,000!",
  store_hours: "Open Mon-Sat 9AM-7PM",
  address: "East Legon, Accra",
  whatsapp: "233542451578",
  free_delivery_threshold: 5000,
  logo_url: "",
  shipping_zones: [
    { name: "Accra Central", delivery_fee: 0, estimated_days: "Same day" },
    { name: "Greater Accra", delivery_fee: 50, estimated_days: "1-2 days" },
    { name: "Outside Accra", delivery_fee: 100, estimated_days: "2-4 days" }
  ],
  payment_methods: { momo: true, card: true },
  faq: [
    { question: "Are your devices genuine?", answer: "Yes. Every product is inspected and sold with original packaging where stated." },
    { question: "Do you offer delivery?", answer: "Yes. Delivery fees depend on the zone and may be free above the configured threshold." }
  ]
};

const storageKeys = {
  products: "valmont_products",
  categories: "valmont_categories",
  orders: "valmont_orders",
  customers: "valmont_customers",
  reviews: "valmont_reviews",
  settings: "valmont_site_settings"
};

const state = {
  activeSection: "dashboard",
  products: [],
  categories: [],
  orders: [],
  customers: [],
  reviews: [],
  settings: { ...DEFAULT_SETTINGS },
  deliveryFees: [],
  deliverySettings: { free_over: 5000, default_fee: 50 },
  auditLog: [],
  productImages: [],
  editingProductId: null,
  draggingImageIndex: null,
  draggingCategoryId: null,
  realtimeChannels: []
};

class ValmontAdminDatabase {
  constructor() {
    this.client = null;
    this.useSupabase = false;
    if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.useSupabase = true;
      } catch (error) {
        console.warn("Supabase could not initialize. Using localStorage fallback.", error);
      }
    }
    this.ensureLocalSeeds();
  }

  ensureLocalSeeds() {
    if (!localStorage.getItem(storageKeys.categories)) {
      localStorage.setItem(storageKeys.categories, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(storageKeys.settings)) {
      localStorage.setItem(storageKeys.settings, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(storageKeys.products)) {
      localStorage.setItem(storageKeys.products, JSON.stringify([]));
    }
    if (!localStorage.getItem(storageKeys.orders)) {
      localStorage.setItem(storageKeys.orders, JSON.stringify([]));
    }
    if (!localStorage.getItem(storageKeys.customers)) {
      localStorage.setItem(storageKeys.customers, JSON.stringify([]));
    }
    if (!localStorage.getItem(storageKeys.reviews)) {
      localStorage.setItem(storageKeys.reviews, JSON.stringify([]));
    }
  }

  readLocal(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  }

  writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getProducts() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("products").select("*").order("name", { ascending: true });
        if (error) throw error;
        if (Array.isArray(data)) {
          const normalized = data.map(normalizeProduct);
          this.writeLocal(storageKeys.products, normalized.map(toStorefrontProduct));
          return normalized;
        }
      } catch (error) {
        console.warn("Supabase products unavailable; using localStorage.", error);
      }
    }
    return this.readLocal(storageKeys.products, []).map(normalizeProduct);
  }

  async saveProduct(product) {
    const normalized = normalizeProduct(product);
    const requestedPayload = {
      id: normalized.id,
      name: normalized.name,
      slug: normalized.slug,
      category_id: normalized.category_id,
      price: normalized.price,
      compare_at_price: normalized.compare_at_price,
      wholesale_price: normalized.wholesale_price,
      specs: normalized.specs,
      description: normalized.description,
      badge: normalized.badge,
      stock: normalized.stock,
      image_url: normalized.image_url,
      images: normalized.images,
      colors: normalized.colors,
      storage_options: normalized.storage_options,
      is_active: normalized.is_active
    };
    const legacyPayload = {
      id: normalized.id,
      name: normalized.name,
      slug: normalized.slug,
      category: normalized.category_id,
      price: normalized.price,
      compare_at_price: normalized.compare_at_price,
      wholesale_price: normalized.wholesale_price,
      specs: normalized.specs,
      description: normalized.description,
      badge: normalized.badge,
      stock_quantity: normalized.stock,
      image_url: normalized.image_url,
      images: normalized.images,
      colors: normalized.colors,
      storage_options: normalized.storage_options,
      is_active: normalized.is_active,
      rating: normalized.rating || 4.8,
      reviews_count: normalized.reviews_count || 0
    };

    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("products").upsert(requestedPayload, { onConflict: "id" });
        if (error) throw error;
      } catch (requestedError) {
        try {
          const { error } = await this.client.from("products").upsert(legacyPayload, { onConflict: "id" });
          if (error) throw error;
        } catch (legacyError) {
          console.warn("Supabase product save failed; saving local copy only.", { requestedError, legacyError });
        }
      }
    }

    const products = this.readLocal(storageKeys.products, []).map(normalizeProduct);
    const index = products.findIndex(item => String(item.id) === String(normalized.id));
    if (index >= 0) products[index] = normalized;
    else products.unshift(normalized);
    this.writeLocal(storageKeys.products, products.map(toStorefrontProduct));
    return normalized;
  }

  async deleteProduct(id) {
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("products").delete().eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.warn("Supabase product delete failed; deleting local copy only.", error);
      }
    }
    const products = this.readLocal(storageKeys.products, []).filter(item => String(item.id) !== String(id));
    this.writeLocal(storageKeys.products, products);
  }

  async getCategories() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("categories").select("*").order("sort_order", { ascending: true });
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
          const normalized = data.map(normalizeCategory);
          this.writeLocal(storageKeys.categories, normalized);
          return normalized;
        }
      } catch (error) {
        console.warn("Supabase categories unavailable; using localStorage.", error);
      }
    }
    const local = this.readLocal(storageKeys.categories, DEFAULT_CATEGORIES).map(normalizeCategory);
    return local.length ? local : DEFAULT_CATEGORIES;
  }

  async saveCategory(category) {
    const normalized = normalizeCategory(category);
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("categories").upsert(normalized, { onConflict: "id" });
        if (error) throw error;
      } catch (error) {
        console.warn("Supabase category save failed; saving local copy only.", error);
      }
    }
    const categories = this.readLocal(storageKeys.categories, DEFAULT_CATEGORIES).map(normalizeCategory);
    const index = categories.findIndex(item => String(item.id) === String(normalized.id));
    if (index >= 0) categories[index] = normalized;
    else categories.push(normalized);
    categories.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    this.writeLocal(storageKeys.categories, categories);
    return normalized;
  }

  async deleteCategory(id) {
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("categories").delete().eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.warn("Supabase category delete failed; deleting local copy only.", error);
      }
    }
    this.writeLocal(storageKeys.categories, this.readLocal(storageKeys.categories, DEFAULT_CATEGORIES).filter(item => String(item.id) !== String(id)));
  }

  async saveCategoryOrder(categories) {
    const normalized = categories.map((category, index) => ({ ...normalizeCategory(category), sort_order: index + 1 }));
    this.writeLocal(storageKeys.categories, normalized);
    if (this.useSupabase) {
      await Promise.all(normalized.map(category => this.saveCategory(category)));
    }
  }

  async getOrders() {
    let orders = [];
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("orders").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        orders = Array.isArray(data) ? data : [];
        const ordersNeedingItems = orders.filter(order => !Array.isArray(parseJsonMaybe(order.items, [])) || parseJsonMaybe(order.items, []).length === 0);
        if (ordersNeedingItems.length) {
          try {
            const { data: itemsData, error: itemsError } = await this.client.from("order_items").select("*");
            if (!itemsError && Array.isArray(itemsData)) {
              orders = orders.map(order => ({
                ...order,
                items: parseJsonMaybe(order.items, []).length ? parseJsonMaybe(order.items, []) : itemsData.filter(item => String(item.order_id) === String(order.id))
              }));
            }
          } catch (_) {}
        }
        const normalized = orders.map(normalizeOrder);
        this.writeLocal(storageKeys.orders, normalized);
        return normalized;
      } catch (error) {
        console.warn("Supabase orders unavailable; using localStorage.", error);
      }
    }
    return this.readLocal(storageKeys.orders, []).map(normalizeOrder);
  }

  async updateOrder(id, updates) {
    // Full update payload — includes admin-editable delivery adjustment fields.
    const fullUpdates = {
      status: updates.status,
      admin_notes: updates.admin_notes || ""
    };
    if (updates.delivery_fee !== undefined && updates.delivery_fee !== null && updates.delivery_fee !== "") {
      fullUpdates.delivery_fee = Number(updates.delivery_fee) || 0;
    }
    if (updates.total !== undefined && updates.total !== null && updates.total !== "") {
      fullUpdates.total = Number(updates.total) || 0;
    }
    if (updates.estimated_delivery_date !== undefined) {
      fullUpdates.estimated_delivery_date = updates.estimated_delivery_date || null;
    }

    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("orders").update(fullUpdates).eq("id", id);
        if (error) throw error;
      } catch (requestedError) {
        // Retry without the newer columns (older DBs without the migration
        // may reject `estimated_delivery_date`). Try the modern schema first,
        // then the legacy `order_status` column.
        const withoutEstimated = { ...fullUpdates };
        delete withoutEstimated.estimated_delivery_date;
        try {
          const { error } = await this.client.from("orders").update(withoutEstimated).eq("id", id);
          if (error) throw error;
        } catch (secondError) {
          try {
            const legacyPayload = { order_status: updates.status, admin_notes: updates.admin_notes || "" };
            if (fullUpdates.delivery_fee !== undefined) legacyPayload.delivery_fee = fullUpdates.delivery_fee;
            if (fullUpdates.total !== undefined) legacyPayload.total = fullUpdates.total;
            const { error } = await this.client.from("orders").update(legacyPayload).eq("id", id);
            if (error) throw error;
          } catch (legacyError) {
            console.warn("Supabase order update failed; saving local copy only.", { requestedError, secondError, legacyError });
          }
        }
      }
    }
    const orders = this.readLocal(storageKeys.orders, []).map(normalizeOrder).map(order => String(order.id) === String(id) ? { ...order, ...fullUpdates } : order);
    this.writeLocal(storageKeys.orders, orders);
  }

  async getCustomers() {
    let customers = [];
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("customers").select("*").order("name", { ascending: true });
        if (error) throw error;
        customers = Array.isArray(data) ? data : [];
        try {
          const { data: addresses, error: addressError } = await this.client.from("customer_addresses").select("*");
          if (!addressError && Array.isArray(addresses)) {
            customers = customers.map(customer => ({ ...customer, addresses: addresses.filter(address => String(address.customer_id) === String(customer.id)) }));
          }
        } catch (_) {}
        const normalized = customers.map(normalizeCustomer);
        this.writeLocal(storageKeys.customers, normalized);
        return normalized;
      } catch (error) {
        console.warn("Supabase customers unavailable; using localStorage.", error);
      }
    }
    return this.readLocal(storageKeys.customers, []).map(normalizeCustomer);
  }

  async getReviews() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("reviews").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        if (Array.isArray(data)) {
          const normalized = data.map(normalizeReview);
          this.writeLocal(storageKeys.reviews, normalized);
          return normalized;
        }
      } catch (error) {
        console.warn("Supabase reviews unavailable; using localStorage.", error);
      }
    }
    return this.readLocal(storageKeys.reviews, []).map(normalizeReview);
  }

  async updateReview(id, isApproved) {
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("reviews").update({ is_approved: isApproved }).eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.warn("Supabase review update failed; saving local copy only.", error);
      }
    }
    const reviews = this.readLocal(storageKeys.reviews, []).map(review => String(review.id) === String(id) ? { ...review, is_approved: isApproved } : review);
    this.writeLocal(storageKeys.reviews, reviews);
  }

  async deleteReview(id) {
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("reviews").delete().eq("id", id);
        if (error) throw error;
      } catch (error) {
        console.warn("Supabase review delete failed; deleting local copy only.", error);
      }
    }
    this.writeLocal(storageKeys.reviews, this.readLocal(storageKeys.reviews, []).filter(review => String(review.id) !== String(id)));
  }

  async getSettings() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.client.from("site_settings").select("key,value");
        if (error) throw error;
        if (Array.isArray(data) && data.length) {
          const remote = { ...DEFAULT_SETTINGS };
          data.forEach(row => {
            remote[row.key] = parseJsonMaybe(row.value, row.value);
          });
          this.writeLocal(storageKeys.settings, remote);
          return remote;
        }
      } catch (error) {
        console.warn("Supabase site_settings unavailable; using localStorage.", error);
      }
    }
    return { ...DEFAULT_SETTINGS, ...this.readLocal(storageKeys.settings, DEFAULT_SETTINGS) };
  }

  async saveSettings(settings) {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    this.writeLocal(storageKeys.settings, merged);
    if (this.useSupabase) {
      const entries = Object.entries(merged);
      for (const [key, value] of entries) {
        try {
          const { error } = await this.client.from("site_settings").upsert({ key, value }, { onConflict: "key" });
          if (error) throw error;
        } catch (jsonError) {
          try {
            const { error } = await this.client.from("site_settings").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
            if (error) throw error;
          } catch (textError) {
            console.warn(`Could not save site setting ${key} to Supabase.`, { jsonError, textError });
          }
        }
      }
    }
    return merged;
  }


  async getDeliveryFees() {
    if (!this.useSupabase || !this.client) return [];
    try {
      const { data, error } = await this.client.from("delivery_fees").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // 401/42501 -> not admin
      if (error && (String(error.code) === "42501" || String(error.message).includes("401") || error.status === 401)) throw error;
      console.warn("delivery_fees unavailable:", error);
      return [];
    }
  }

  async getDeliverySettings() {
    if (!this.useSupabase || !this.client) return { free_over: 5000, default_fee: 50 };
    try {
      const { data, error } = await this.client.from("delivery_settings").select("*");
      if (error) throw error;
      const out = { free_over: 5000, default_fee: 50 };
      if (Array.isArray(data)) {
        data.forEach(row => {
          const key = String(row.key || row.setting_key || row.name || "").trim();
          let val = row.value;
          try { if (typeof val === "string") val = JSON.parse(val); } catch(_) {}
          if (key === "free_over") out.free_over = Number(val ?? val?.value ?? 5000);
          if (key === "default_fee") out.default_fee = Number(val ?? val?.value ?? 50);
          // also handle if row has free_over/default_fee columns directly
          if (row.free_over != null) out.free_over = Number(row.free_over);
          if (row.default_fee != null) out.default_fee = Number(row.default_fee);
        });
      }
      // Fallback if settings stored as single row with jsonb
      if (data && !Array.isArray(data) && typeof data === "object") {
        if (data.free_over != null) out.free_over = Number(data.free_over);
        if (data.default_fee != null) out.default_fee = Number(data.default_fee);
      }
      return out;
    } catch (error) {
      if (error && (String(error.code) === "42501" || String(error.message).includes("401") || error.status === 401)) throw error;
      console.warn("delivery_settings unavailable:", error);
      return { free_over: 5000, default_fee: 50 };
    }
  }

  async saveDeliveryFees(fees, settings) {
    // fees: array of {region, fee}
    // settings: {free_over, default_fee}
    let lastError = null;
    // Save region fees: only changed rows via .update().eq()
    for (const f of fees) {
      try {
        const { error } = await this.client.from("delivery_fees").update({ fee: Number(f.fee) }).eq("region", f.region);
        if (error) throw error;
      } catch (e) {
        lastError = e;
        if (String(e.code) === "42501" || e.status === 401 || String(e.message).includes("401")) throw e;
        console.warn("delivery_fees update failed for", f.region, e);
      }
    }
    // Save settings via upsert or update
    const settingsRows = [
      { key: "free_over", value: Number(settings.free_over) },
      { key: "default_fee", value: Number(settings.default_fee) }
    ];
    for (const row of settingsRows) {
      try {
        // Try update first
        const { data, error } = await this.client.from("delivery_settings").select("key").eq("key", row.key).limit(1);
        if (!error && Array.isArray(data) && data.length === 0) {
          const { error: insErr } = await this.client.from("delivery_settings").insert(row);
          if (insErr) throw insErr;
        } else {
          const { error: updErr } = await this.client.from("delivery_settings").update({ value: row.value }).eq("key", row.key);
          if (updErr) throw updErr;
        }
      } catch (e) {
        // Fallback: try direct update with key column
        try {
          const { error } = await this.client.from("delivery_settings").update({ value: row.value }).eq("key", row.key);
          if (error) throw error;
        } catch (e2) {
          lastError = e2;
          if (String(e2.code) === "42501" || e2.status === 401) throw e2;
          console.warn("delivery_settings update failed for", row.key, e2);
        }
      }
    }
    if (lastError && String(lastError.code) === "42501") throw lastError;
  }

  async getAuditLog() {
    if (!this.useSupabase || !this.client) return [];
    try {
      const { data, error } = await this.client.from("admin_audit_log").select("*").order("changed_at", { ascending: false }).limit(50);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error && (String(error.code) === "42501" || error.status === 401)) throw error;
      console.warn("admin_audit_log unavailable:", error);
      return [];
    }
  }

  async uploadImage(file, folder = "products") {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    if (this.useSupabase) {
      try {
        const { error } = await this.client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = this.client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
        if (data && data.publicUrl) return data.publicUrl;
      } catch (error) {
        console.warn("Supabase image upload failed; using local preview URL.", error);
      }
    }
    return readFileAsDataUrl(file);
  }

  subscribeToRealtime(onChange) {
    if (!this.useSupabase || !this.client.channel) return;
    ["products", "orders", "customers", "reviews", "categories", "site_settings"].forEach(table => {
      try {
        const channel = this.client
          .channel(`valmont-admin-${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table }, () => onChange(table))
          .subscribe();
        state.realtimeChannels.push(channel);
      } catch (error) {
        console.warn(`Realtime subscription failed for ${table}.`, error);
      }
    });
  }
}

const db = new ValmontAdminDatabase();

window.addEventListener("DOMContentLoaded", initAdminPanel);

async function initAdminPanel() {
  // Admin pages are protected by Supabase Auth. Redirect to login if no session.
  if (typeof supabase === "undefined") {
    // Supabase JS not loaded — cannot verify session
    window.location.replace("/admin-login.html");
    return;
  }
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    window.location.replace("/admin-login.html");
    return;
  }
  bindAuthEvents(sb);
  bindNavigationEvents();
  bindFormEvents();
  bindProductModalEvents();
  bindOrderEvents();
  bindResponsiveShell();

  showAdminApp();
  await loadAllData();
}

function bindAuthEvents(sb) {
  // In-page re-login form (fallback if session expired without redirect)
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.getElementById("adminPasswordInput");
      const emailInput = document.getElementById("adminEmailInput");
      const email = (emailInput ? emailInput.value : "admin@valmontgadgets.com").trim().toLowerCase();
      const password = input.value.trim();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (data.session) {
        document.getElementById("loginError")?.classList.add("hidden");
        showAdminApp();
        loadAllData();
      } else {
        document.getElementById("loginError")?.classList.remove("hidden");
        input.select();
      }
    });
  }
  document.getElementById("topLogoutBtn").addEventListener("click", () => logoutAdmin(sb));
  document.getElementById("sidebarLogoutBtn").addEventListener("click", () => logoutAdmin(sb));
}

async function logoutAdmin(sb) {
  try { await sb.auth.signOut(); } catch (_) {}
  window.location.replace("/admin-login.html");
}

function showAdminApp() {
  document.getElementById("authGate").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
}

async function loadAllData() {
  try {
    const [settings, categories, products, orders, customers, reviews] = await Promise.all([
      db.getSettings(),
      db.getCategories(),
      db.getProducts(),
      db.getOrders(),
      db.getCustomers(),
      db.getReviews()
    ]);
    state.settings = { ...DEFAULT_SETTINGS, ...settings };
    state.categories = categories.length ? categories : DEFAULT_CATEGORIES;
    state.products = products;
    state.orders = attachCustomersToOrders(orders, customers);
    state.customers = mergeCustomersWithOrders(customers, state.orders);
    state.reviews = reviews;
    // Delivery fees + audit log (Task 3) - load separately (admin-only SELECT)
    try {
      const [fees, dSettings, audit] = await Promise.all([db.getDeliveryFees(), db.getDeliverySettings(), db.getAuditLog()]);
      state.deliveryFees = Array.isArray(fees) ? fees : [];
      state.deliverySettings = dSettings || { free_over: 5000, default_fee: 50 };
      state.auditLog = Array.isArray(audit) ? audit : [];
    } catch (e) {
      if (String(e.code) === "42501" || e.status === 401 || String(e.message).includes("not your admin")) {
        // Will be surfaced when rendering
        state.deliveryFees = [];
        state.auditLog = [];
      } else {
        console.warn("Delivery fees load failed", e);
      }
    }
    renderEverything();
    db.subscribeToRealtime(async () => {
      await refreshDataSilently();
    });
  } catch (error) {
    console.error(error);
    showToast("Admin data loaded with local fallback.");
    renderEverything();
  }
}

async function refreshDataSilently() {
  const [settings, categories, products, orders, customers, reviews] = await Promise.all([
    db.getSettings(), db.getCategories(), db.getProducts(), db.getOrders(), db.getCustomers(), db.getReviews()
  ]);
  try { const [fees, dSettings, audit] = await Promise.all([db.getDeliveryFees(), db.getDeliverySettings(), db.getAuditLog()]); state.deliveryFees = fees; state.deliverySettings = dSettings; state.auditLog = audit; } catch(_) {}
  state.settings = { ...DEFAULT_SETTINGS, ...settings };
  state.categories = categories.length ? categories : DEFAULT_CATEGORIES;
  state.products = products;
  state.orders = attachCustomersToOrders(orders, customers);
  state.customers = mergeCustomersWithOrders(customers, state.orders);
  state.reviews = reviews;
  renderEverything();
}

function renderEverything() {
  renderTopBar();
  renderDashboard();
  renderProductsTable();
  renderOrdersTable();
  renderCustomersTable();
  renderReviewsTable();
  renderCategories();
  renderSiteContentForm();
  renderSettingsForm();
  renderDeliveryFees();
  renderAuditLog();
  populateCategorySelect();
}

function bindNavigationEvents() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => switchSection(button.dataset.section));
  });
  document.querySelectorAll("[data-open-product]").forEach(button => {
    button.addEventListener("click", () => openProductModal());
  });
  document.getElementById("productSearch").addEventListener("input", renderProductsTable);
}

function bindResponsiveShell() {
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  document.getElementById("openSidebarBtn").addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.remove("hidden");
  });
  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.add("hidden");
  };
  document.getElementById("closeSidebarBtn").addEventListener("click", close);
  backdrop.addEventListener("click", close);
}

function switchSection(section) {
  state.activeSection = section;
  document.querySelectorAll(".nav-btn").forEach(button => button.classList.toggle("active", button.dataset.section === section));
  document.querySelectorAll(".section-panel").forEach(panel => panel.classList.toggle("active", panel.id === `section-${section}`));
  document.getElementById("adminSidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.add("hidden");
}

function renderTopBar() {
  document.getElementById("topStoreName").textContent = state.settings.store_name || DEFAULT_SETTINGS.store_name;
  document.getElementById("topAdminEmail").textContent = state.settings.admin_email || DEFAULT_SETTINGS.admin_email;
}

function renderDashboard() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const nonCancelled = state.orders.filter(order => normalizeStatus(order.status) !== "Cancelled");
  const todayRevenue = nonCancelled.filter(order => String(order.created_at || "").slice(0, 10) === todayKey).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const weekRevenue = nonCancelled.filter(order => new Date(order.created_at || Date.now()) >= weekAgo).reduce((sum, order) => sum + Number(order.total || 0), 0);
  document.getElementById("statTodayRevenue").textContent = formatCurrency(todayRevenue);
  document.getElementById("statWeekRevenue").textContent = formatCurrency(weekRevenue);
  document.getElementById("statTotalOrders").textContent = String(state.orders.length);
  document.getElementById("statTotalProducts").textContent = String(state.products.length);
  document.getElementById("statTotalCustomers").textContent = String(state.customers.length);

  const lowStock = state.products.filter(product => Number(product.stock) < 5).sort((a, b) => Number(a.stock) - Number(b.stock)).slice(0, 8);
  document.getElementById("lowStockList").innerHTML = lowStock.length ? lowStock.map(product => `
    <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#071126] p-3">
      <div class="min-w-0"><p class="truncate text-sm font-black text-white">${escapeHtml(product.name)}</p><p class="text-xs font-semibold text-slate-500">${escapeHtml(getCategoryName(product.category_id))}</p></div>
      <span class="badge ${Number(product.stock) === 0 ? "badge-red" : "badge-amber"}">${Number(product.stock)} left</span>
    </div>
  `).join("") : emptyState("No low-stock products.");

  const best = getBestSellingProducts();
  document.getElementById("bestSellingList").innerHTML = best.length ? best.map((item, index) => `
    <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#071126] p-3">
      <div class="flex items-center gap-3 min-w-0"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-xs font-black text-[#071126]">${index + 1}</span><div class="min-w-0"><p class="truncate text-sm font-black text-white">${escapeHtml(item.name)}</p><p class="text-xs font-semibold text-slate-500">${item.quantity} units sold</p></div></div>
      <span class="text-sm font-black text-gold">${formatCurrency(item.revenue)}</span>
    </div>
  `).join("") : emptyState("No sales data yet.");
}

function renderProductsTable() {
  const query = (document.getElementById("productSearch")?.value || "").toLowerCase().trim();
  const products = state.products.filter(product => !query || [product.name, product.specs, getCategoryName(product.category_id)].join(" ").toLowerCase().includes(query));
  document.getElementById("productsTableBody").innerHTML = products.length ? products.map(product => `
    <tr>
      <td><img src="${escapeAttr(product.image_url || product.images[0] || "/logo.svg")}" alt="${escapeAttr(product.name)}" class="h-12 w-12 rounded-lg border border-slate-800 bg-[#071126] object-cover" /></td>
      <td><p class="font-black text-white">${escapeHtml(product.name)}</p><p class="text-xs font-semibold text-slate-500">${escapeHtml(product.specs || product.slug)}</p></td>
      <td>${escapeHtml(getCategoryName(product.category_id))}</td>
      <td><span class="font-black text-gold">${formatCurrency(product.price)}</span>${Number(product.compare_at_price) > Number(product.price) ? `<br><span class="text-xs text-slate-500 line-through">${formatCurrency(product.compare_at_price)}</span>` : ""}</td>
      <td><span class="badge ${Number(product.stock) < 5 ? "badge-amber" : ""}">${Number(product.stock)}</span></td>
      <td><span class="badge ${product.is_active ? "badge-green" : "badge-red"}">${product.is_active ? "Active" : "Inactive"}</span></td>
      <td class="text-right"><div class="flex justify-end gap-2"><button class="btn-muted" data-edit-product="${escapeAttr(product.id)}">Edit</button><button class="btn-danger" data-delete-product="${escapeAttr(product.id)}">Delete</button></div></td>
    </tr>
  `).join("") : `<tr><td colspan="7">${emptyState("No products found.")}</td></tr>`;

  document.querySelectorAll("[data-edit-product]").forEach(button => button.addEventListener("click", () => openProductModal(button.dataset.editProduct)));
  document.querySelectorAll("[data-delete-product]").forEach(button => button.addEventListener("click", () => confirmDeleteProduct(button.dataset.deleteProduct)));
}

function renderOrdersTable() {
  const statusFilter = document.getElementById("orderFilterStatus")?.value || "all";
  const from = document.getElementById("orderFilterFrom")?.value || "";
  const to = document.getElementById("orderFilterTo")?.value || "";
  const orders = state.orders.filter(order => {
    const orderStatus = normalizeStatus(order.status);
    const date = String(order.created_at || "").slice(0, 10);
    return (statusFilter === "all" || orderStatus === statusFilter) && (!from || date >= from) && (!to || date <= to);
  });
  document.getElementById("ordersTableBody").innerHTML = orders.length ? orders.map(order => `
    <tr class="cursor-pointer hover:bg-[#071126]/50" data-open-order="${escapeAttr(order.id)}">
      <td class="font-black text-white">${escapeHtml(order.order_number)}</td>
      <td>${formatDate(order.created_at)}</td>
      <td><p class="font-bold text-white">${escapeHtml(order.customer.name)}</p><p class="text-xs text-slate-500">${escapeHtml(order.customer.phone || order.customer.email || "")}</p></td>
      <td>${order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items</td>
      <td class="font-black text-gold">${formatCurrency(order.total)}</td>
      <td><span class="badge ${statusClass(order.status)}">${escapeHtml(normalizeStatus(order.status))}</span></td>
      <td><button class="btn-muted" type="button">View</button></td>
    </tr>
  `).join("") : `<tr><td colspan="7">${emptyState("No orders match the current filters.")}</td></tr>`;

  document.querySelectorAll("[data-open-order]").forEach(row => row.addEventListener("click", () => openOrderModal(row.dataset.openOrder)));
}

function bindOrderEvents() {
  ["orderFilterStatus", "orderFilterFrom", "orderFilterTo"].forEach(id => document.getElementById(id).addEventListener("input", renderOrdersTable));
  document.getElementById("clearOrderFilters").addEventListener("click", () => {
    document.getElementById("orderFilterStatus").value = "all";
    document.getElementById("orderFilterFrom").value = "";
    document.getElementById("orderFilterTo").value = "";
    renderOrdersTable();
  });
  document.getElementById("closeOrderModal").addEventListener("click", closeOrderModal);
}

function openOrderModal(id) {
  const order = state.orders.find(item => String(item.id) === String(id));
  if (!order) return;
  document.getElementById("orderModalTitle").textContent = `Order ${order.order_number}`;
  const itemsMarkup = order.items.length ? order.items.map(item => `
    <div class="grid gap-3 rounded-xl border border-slate-800 bg-[#071126] p-3 sm:grid-cols-[56px_1fr_auto] sm:items-center">
      <img src="${escapeAttr(item.image || "/logo.svg")}" alt="${escapeAttr(item.name)}" class="h-14 w-14 rounded-lg object-cover" />
      <div><p class="font-black text-white">${escapeHtml(item.name)}</p><p class="text-xs font-semibold text-slate-500">${escapeHtml([item.selected_color, item.selected_storage].filter(Boolean).join(" / ") || "Standard")}</p><p class="text-xs text-slate-500">Qty ${Number(item.quantity || 0)} × ${formatCurrency(item.unit_price)}</p></div>
      <p class="font-black text-gold">${formatCurrency(item.line_total)}</p>
    </div>
  `).join("") : emptyState("No item details were recorded for this order.");

  const currentDeliveryFee = Number(order.delivery_fee || 0);
  const currentSubtotal = Number(order.subtotal || 0);
  const currentTotal = Number(order.total || (currentSubtotal + currentDeliveryFee));

  document.getElementById("orderDetailContent").innerHTML = `
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-[#071126] p-4"><h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Customer Info</h3><p class="font-black text-white">${escapeHtml(order.customer.name)}</p><p class="text-sm font-semibold text-slate-300">${escapeHtml(order.customer.phone || "No phone")}</p><p class="text-sm font-semibold text-slate-300">${escapeHtml(order.customer.email || "No email")}</p><p class="mt-3 text-sm font-semibold text-slate-400">${escapeHtml(order.customer.address || "No delivery address")}</p></div>
      <div class="rounded-xl border border-slate-800 bg-[#071126] p-4">
        <h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Payment & Totals</h3>
        <div class="space-y-2 text-sm font-bold text-slate-300">
          <div class="flex justify-between"><span>Subtotal</span><span id="orderSubtotalDisplay">${formatCurrency(currentSubtotal)}</span></div>
          <div class="flex justify-between"><span>Delivery fee</span><span id="orderDeliveryFeeDisplay">${formatCurrency(currentDeliveryFee)}</span></div>
          <div class="flex justify-between border-t border-slate-800 pt-2 text-base text-gold"><span>Total</span><span id="orderTotalDisplay">${formatCurrency(currentTotal)}</span></div>
          <div class="flex justify-between"><span>Payment method</span><span>${escapeHtml(order.payment_method || "Not set")}</span></div>
        </div>
      </div>
    </div>
    <div><h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Items</h3><div class="space-y-3">${itemsMarkup}</div></div>

    <div class="rounded-xl border border-amber-500/40 bg-[#0a1730] p-4">
      <h3 class="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gold">
        <span>Delivery Adjustment</span>
        <span class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">Admin editable</span>
      </h3>
      <p class="mb-3 text-[11px] font-semibold text-slate-400">Update the delivery fee, estimated date and reason if transport fares change or weather causes delays. The order total will be recalculated automatically.</p>
      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label class="admin-label">Adjusted Delivery Fee (GH₵)</label>
          <input id="orderDeliveryFeeInput" type="number" min="0" step="0.01" value="${currentDeliveryFee}" class="admin-input" />
        </div>
        <div>
          <label class="admin-label">Estimated Delivery Date / Timeframe</label>
          <input id="orderEstimatedDateInput" type="text" value="${escapeAttr(order.estimated_delivery_date || "")}" placeholder="e.g. 2026-08-02 - Weather delay" class="admin-input" />
        </div>
        <div>
          <label class="admin-label">Status</label>
          <select id="orderStatusInput" class="admin-input">${["Pending", "Paid", "Confirmed", "Shipped", "Delivered", "Cancelled"].map(status => `<option ${normalizeStatus(order.status) === status ? "selected" : ""}>${status}</option>`).join("")}</select>
        </div>
      </div>
      <div class="mt-3">
        <label class="admin-label">Adjustment Reason / Admin Notes</label>
        <textarea id="orderNotesInput" rows="3" class="admin-input" placeholder="e.g. Fare surcharge due to fuel / weather conditions">${escapeHtml(order.admin_notes || "")}</textarea>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button id="notifyCustomerBtn" class="btn-muted inline-flex items-center gap-2" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.52 3.48A11.9 11.9 0 0 0 12 0C5.37 0 0 5.37 0 12a11.94 11.94 0 0 0 1.64 6L0 24l6.2-1.63A12 12 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52ZM12 22a10 10 0 0 1-5.1-1.4l-.36-.21-3.68.97.98-3.59-.24-.37A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10Zm5.36-7.47c-.29-.15-1.73-.85-2-.95s-.46-.15-.66.15-.76.95-.94 1.15-.34.22-.63.07a8.2 8.2 0 0 1-2.41-1.49 9 9 0 0 1-1.66-2.06c-.17-.29 0-.44.13-.58.13-.13.29-.34.44-.51a2 2 0 0 0 .29-.49.55.55 0 0 0 0-.51c-.07-.15-.66-1.58-.9-2.16s-.48-.5-.66-.51h-.56a1.08 1.08 0 0 0-.78.36 3.28 3.28 0 0 0-1 2.44 5.7 5.7 0 0 0 1.19 3.05 13 13 0 0 0 5 4.4c.7.3 1.24.48 1.66.62a4 4 0 0 0 1.83.12 3 3 0 0 0 2-1.4 2.44 2.44 0 0 0 .17-1.4c-.06-.13-.25-.2-.54-.35Z"/></svg>
          Notify Customer of Delivery/Fee Adjustment (WhatsApp)
        </button>
        <button id="saveOrderDetails" class="btn-gold" type="button">Save Order</button>
      </div>
    </div>
  `;

  // Auto-recalculate total when delivery fee is edited.
  const feeInput = document.getElementById("orderDeliveryFeeInput");
  const totalDisplay = document.getElementById("orderTotalDisplay");
  const feeDisplay = document.getElementById("orderDeliveryFeeDisplay");
  const recalcTotal = () => {
    const newFee = Number(feeInput.value || 0);
    const newTotal = currentSubtotal + newFee;
    feeDisplay.textContent = formatCurrency(newFee);
    totalDisplay.textContent = formatCurrency(newTotal);
  };
  feeInput.addEventListener("input", recalcTotal);
  feeInput.addEventListener("change", recalcTotal);

  // Notify Customer via WhatsApp with the adjusted values.
  document.getElementById("notifyCustomerBtn").addEventListener("click", () => {
    const newFee = Number(feeInput.value || 0);
    const newTotal = currentSubtotal + newFee;
    const estDate = document.getElementById("orderEstimatedDateInput").value.trim() || "to be confirmed";
    const reason = document.getElementById("orderNotesInput").value.trim() || "operational conditions";
    const customerName = order.customer.name || "Customer";
    const ref = order.order_number || order.reference_code || order.id;
    const message =
      `Hello ${customerName}, regarding your Valmont Gadgets Order #${ref}:\n` +
      `Due to ${reason}, your updated delivery fee is GH₵ ${newFee.toFixed(2)} ` +
      `(New Total: GH₵ ${newTotal.toFixed(2)}).\n` +
      `Your estimated delivery date is now ${estDate}.\n` +
      `Thank you for your patience!`;

    const rawPhone = String(order.customer.phone || "").replace(/[^0-9]/g, "");
    let waNumber = rawPhone;
    if (waNumber.startsWith("0")) waNumber = "233" + waNumber.slice(1);
    if (!waNumber) waNumber = "233542451578"; // fall back to Valmont dispatch line
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener");
  });

  document.getElementById("saveOrderDetails").addEventListener("click", async () => {
    const newFee = Number(feeInput.value || 0);
    const newTotal = currentSubtotal + newFee;
    await db.updateOrder(order.id, {
      status: document.getElementById("orderStatusInput").value,
      admin_notes: document.getElementById("orderNotesInput").value,
      delivery_fee: newFee,
      total: newTotal,
      estimated_delivery_date: document.getElementById("orderEstimatedDateInput").value.trim()
    });
    const refreshedCustomers = await db.getCustomers();
    state.orders = attachCustomersToOrders(await db.getOrders(), refreshedCustomers);
    state.customers = mergeCustomersWithOrders(refreshedCustomers, state.orders);
    renderDashboard();
    renderOrdersTable();
    renderCustomersTable();
    closeOrderModal();
    showToast("Order updated.");
  });
  document.body.classList.add("modal-open");
  document.getElementById("orderModal").classList.remove("hidden");
}

function closeOrderModal() {
  document.getElementById("orderModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function renderCustomersTable() {
  document.getElementById("customersTableBody").innerHTML = state.customers.length ? state.customers.map(customer => `
    <tr>
      <td class="font-black text-white">${escapeHtml(customer.name)}</td>
      <td>${escapeHtml(customer.phone || "")}</td>
      <td>${escapeHtml(customer.email || "")}</td>
      <td>${customer.orders.length}</td>
      <td class="font-black text-gold">${formatCurrency(customer.total_spent)}</td>
      <td><button class="btn-muted" data-view-customer="${escapeAttr(customer.id)}">View</button></td>
    </tr>
  `).join("") : `<tr><td colspan="6">${emptyState("No customers yet.")}</td></tr>`;
  document.querySelectorAll("[data-view-customer]").forEach(button => button.addEventListener("click", () => renderCustomerDetail(button.dataset.viewCustomer)));
}

function renderCustomerDetail(id) {
  const customer = state.customers.find(item => String(item.id) === String(id));
  if (!customer) return;
  const addresses = customer.addresses.length ? customer.addresses.map(address => `<li class="rounded-lg border border-slate-800 bg-[#071126] p-3 text-sm font-semibold text-slate-300">${escapeHtml(formatAddress(address))}</li>`).join("") : `<li class="text-sm font-semibold text-slate-500">No saved addresses.</li>`;
  const orders = customer.orders.length ? customer.orders.map(order => `<tr><td>${escapeHtml(order.order_number)}</td><td>${formatDate(order.created_at)}</td><td>${order.items.length}</td><td>${formatCurrency(order.total)}</td><td><span class="badge ${statusClass(order.status)}">${escapeHtml(normalizeStatus(order.status))}</span></td></tr>`).join("") : `<tr><td colspan="5">No orders.</td></tr>`;
  document.getElementById("customerDetailPanel").innerHTML = `
    <div class="space-y-5">
      <div><p class="admin-label">Profile Info</p><h2 class="text-xl font-black text-white">${escapeHtml(customer.name)}</h2><p class="text-sm font-semibold text-slate-300">${escapeHtml(customer.phone || "")}</p><p class="text-sm font-semibold text-slate-300">${escapeHtml(customer.email || "")}</p><p class="mt-3 text-lg font-black text-gold">${formatCurrency(customer.total_spent)} total spent</p></div>
      <div><p class="admin-label">Saved Addresses</p><ul class="space-y-2">${addresses}</ul></div>
      <div><p class="admin-label">Complete Order History</p><div class="table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${orders}</tbody></table></div></div>
    </div>
  `;
}

function renderReviewsTable() {
  document.getElementById("reviewsTableBody").innerHTML = state.reviews.length ? state.reviews.map(review => `
    <tr>
      <td>${escapeHtml(getProductName(review.product_id))}</td>
      <td class="font-bold text-white">
        <div>${escapeHtml(review.customer_name)}</div>
        ${review.customer_email ? `<div class="text-[11px] font-normal text-slate-400">${escapeHtml(review.customer_email)}</div>` : ''}
        ${review.is_verified_buyer ? `<span class="inline-block mt-1 text-[10px] font-extrabold text-green-400 bg-green-900/40 border border-green-800/50 px-1.5 py-0.5 rounded">Verified Buyer</span>` : ''}
      </td>
      <td class="text-gold">${"★".repeat(Number(review.rating || 0))}${"☆".repeat(5 - Number(review.rating || 0))}</td>
      <td class="max-w-sm">
        <p class="line-clamp-2">${escapeHtml(review.comment || "")}</p>
        ${review.photo_url ? `<a href="${escapeAttr(review.photo_url)}" target="_blank" rel="noopener" class="text-xs text-amber-400 font-bold underline mt-1 inline-block">View Photo</a>` : ''}
      </td>
      <td>${formatDate(review.created_at)}</td>
      <td><span class="badge ${review.is_approved ? "badge-green" : "badge-amber"}">${review.is_approved ? "Approved" : "Pending"}</span></td>
      <td><div class="flex flex-wrap gap-2"><button class="btn-muted" data-approve-review="${escapeAttr(review.id)}">Approve</button><button class="btn-muted" data-reject-review="${escapeAttr(review.id)}">Reject</button><button class="btn-danger" data-delete-review="${escapeAttr(review.id)}">Delete</button></div></td>
    </tr>
  `).join("") : `<tr><td colspan="7">${emptyState("No reviews yet.")}</td></tr>`;
  document.querySelectorAll("[data-approve-review]").forEach(button => button.addEventListener("click", () => updateReview(button.dataset.approveReview, true)));
  document.querySelectorAll("[data-reject-review]").forEach(button => button.addEventListener("click", () => updateReview(button.dataset.rejectReview, false)));
  document.querySelectorAll("[data-delete-review]").forEach(button => button.addEventListener("click", () => deleteReview(button.dataset.deleteReview)));
}

async function updateReview(id, approved) {
  await db.updateReview(id, approved);
  state.reviews = await db.getReviews();
  renderReviewsTable();
  showToast(approved ? "Review approved." : "Review rejected.");
}

async function deleteReview(id) {
  if (!confirm("Delete this review permanently?")) return;
  await db.deleteReview(id);
  state.reviews = await db.getReviews();
  renderReviewsTable();
  showToast("Review deleted.");
}

function renderCategories() {
  const counts = state.products.reduce((map, product) => {
    map[product.category_id] = (map[product.category_id] || 0) + 1;
    return map;
  }, {});
  document.getElementById("categoriesList").innerHTML = state.categories.length ? state.categories.map(category => `
    <div class="category-row flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#071126] p-4 sm:flex-row sm:items-center sm:justify-between" draggable="true" data-category-id="${escapeAttr(category.id)}">
      <div class="min-w-0"><p class="font-black text-white">${escapeHtml(category.name)}</p><p class="text-xs font-semibold text-slate-500">${escapeHtml(category.slug)} • ${counts[category.id] || counts[category.slug] || 0} products</p></div>
      <div class="flex gap-2"><button class="btn-muted" data-edit-category="${escapeAttr(category.id)}">Edit</button><button class="btn-danger" data-delete-category="${escapeAttr(category.id)}">Delete</button></div>
    </div>
  `).join("") : emptyState("No categories configured.");

  document.querySelectorAll("[data-edit-category]").forEach(button => button.addEventListener("click", () => editCategory(button.dataset.editCategory)));
  document.querySelectorAll("[data-delete-category]").forEach(button => button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory)));
  bindCategoryDragEvents();
}

function bindCategoryDragEvents() {
  document.querySelectorAll(".category-row").forEach(row => {
    row.addEventListener("dragstart", () => { state.draggingCategoryId = row.dataset.categoryId; row.classList.add("opacity-50"); });
    row.addEventListener("dragend", () => { row.classList.remove("opacity-50"); state.draggingCategoryId = null; });
    row.addEventListener("dragover", event => event.preventDefault());
    row.addEventListener("drop", async event => {
      event.preventDefault();
      const targetId = row.dataset.categoryId;
      const sourceId = state.draggingCategoryId;
      if (!sourceId || sourceId === targetId) return;
      const categories = [...state.categories];
      const from = categories.findIndex(category => String(category.id) === String(sourceId));
      const to = categories.findIndex(category => String(category.id) === String(targetId));
      if (from < 0 || to < 0) return;
      const [moved] = categories.splice(from, 1);
      categories.splice(to, 0, moved);
      state.categories = categories.map((category, index) => ({ ...category, sort_order: index + 1 }));
      await db.saveCategoryOrder(state.categories);
      renderCategories();
      populateCategorySelect();
      showToast("Category order saved.");
    });
  });
}

function bindFormEvents() {
  document.getElementById("categoryForm").addEventListener("submit", saveCategoryFromForm);
  document.getElementById("resetCategoryForm").addEventListener("click", resetCategoryForm);
  document.getElementById("categoryName").addEventListener("input", () => {
    if (!document.getElementById("categorySlug").value.trim()) document.getElementById("categorySlug").placeholder = slugify(document.getElementById("categoryName").value);
  });
  document.getElementById("siteContentForm").addEventListener("submit", saveSiteContentForm);
  document.getElementById("addFaqBtn").addEventListener("click", () => { state.settings.faq.push({ question: "", answer: "" }); renderSiteContentForm(); });
  document.getElementById("settingsForm").addEventListener("submit", saveSettingsForm);
  document.getElementById("addShippingZoneBtn").addEventListener("click", () => { state.settings.shipping_zones.push({ name: "", delivery_fee: 0, estimated_days: "" }); renderSettingsForm(); });
  document.getElementById("changePasswordBtn").addEventListener("click", changeAdminPassword);
  document.getElementById("settingLogoUpload").addEventListener("change", handleLogoUpload);
}

async function saveCategoryFromForm(event) {
  event.preventDefault();
  const idInput = document.getElementById("categoryId");
  const name = document.getElementById("categoryName").value.trim();
  const slug = slugify(document.getElementById("categorySlug").value.trim() || name);
  const category = { id: idInput.value || slug, name, slug, sort_order: idInput.value ? (state.categories.find(item => String(item.id) === String(idInput.value))?.sort_order || state.categories.length + 1) : state.categories.length + 1 };
  await db.saveCategory(category);
  state.categories = await db.getCategories();
  resetCategoryForm();
  renderCategories();
  populateCategorySelect();
  showToast("Category saved.");
}

function editCategory(id) {
  const category = state.categories.find(item => String(item.id) === String(id));
  if (!category) return;
  document.getElementById("categoryId").value = category.id;
  document.getElementById("categoryName").value = category.name;
  document.getElementById("categorySlug").value = category.slug;
}

async function deleteCategory(id) {
  const count = state.products.filter(product => String(product.category_id) === String(id)).length;
  if (!confirm(`Delete this category? ${count} products currently reference it.`)) return;
  await db.deleteCategory(id);
  state.categories = await db.getCategories();
  renderCategories();
  populateCategorySelect();
  showToast("Category deleted.");
}

function resetCategoryForm() {
  document.getElementById("categoryForm").reset();
  document.getElementById("categoryId").value = "";
}

function renderSiteContentForm() {
  document.getElementById("settingHeroHeadline").value = state.settings.hero_headline || "";
  document.getElementById("settingHeroSubtitle").value = state.settings.hero_subtitle || "";
  document.getElementById("settingHeroCta").value = state.settings.hero_cta || "";
  document.getElementById("settingAnnouncement").value = state.settings.announcement || "";
  document.getElementById("settingStoreHours").value = state.settings.store_hours || "";
  document.getElementById("settingAddress").value = state.settings.address || "";
  document.getElementById("settingWhatsApp").value = state.settings.whatsapp || "";
  renderFaqRows();
}

function renderFaqRows() {
  const faq = Array.isArray(state.settings.faq) ? state.settings.faq : [];
  document.getElementById("faqList").innerHTML = faq.length ? faq.map((item, index) => `
    <div class="grid gap-3 rounded-xl border border-slate-800 bg-[#071126] p-3 md:grid-cols-[1fr_1fr_auto]">
      <input class="admin-input" data-faq-question="${index}" value="${escapeAttr(item.question || "")}" placeholder="Question" />
      <input class="admin-input" data-faq-answer="${index}" value="${escapeAttr(item.answer || "")}" placeholder="Answer" />
      <button type="button" class="btn-danger" data-remove-faq="${index}">Delete</button>
    </div>
  `).join("") : emptyState("No FAQs yet.");
  document.querySelectorAll("[data-remove-faq]").forEach(button => button.addEventListener("click", () => { state.settings.faq.splice(Number(button.dataset.removeFaq), 1); renderFaqRows(); }));
}

async function saveSiteContentForm(event) {
  event.preventDefault();
  document.querySelectorAll("[data-faq-question]").forEach(input => {
    const index = Number(input.dataset.faqQuestion);
    if (!state.settings.faq[index]) state.settings.faq[index] = { question: "", answer: "" };
    state.settings.faq[index].question = input.value.trim();
  });
  document.querySelectorAll("[data-faq-answer]").forEach(input => {
    const index = Number(input.dataset.faqAnswer);
    if (!state.settings.faq[index]) state.settings.faq[index] = { question: "", answer: "" };
    state.settings.faq[index].answer = input.value.trim();
  });
  state.settings = await db.saveSettings({
    ...state.settings,
    hero_headline: document.getElementById("settingHeroHeadline").value.trim(),
    hero_subtitle: document.getElementById("settingHeroSubtitle").value.trim(),
    hero_cta: document.getElementById("settingHeroCta").value.trim(),
    announcement: document.getElementById("settingAnnouncement").value.trim(),
    store_hours: document.getElementById("settingStoreHours").value.trim(),
    address: document.getElementById("settingAddress").value.trim(),
    whatsapp: document.getElementById("settingWhatsApp").value.trim(),
    faq: state.settings.faq.filter(item => item.question || item.answer)
  });
  renderTopBar();
  showToast("Site content saved.");
}

function renderSettingsForm() {
  document.getElementById("settingStoreName").value = state.settings.store_name || "";
  document.getElementById("settingAdminEmail").value = state.settings.admin_email || "";
  document.getElementById("settingFreeDelivery").value = state.settings.free_delivery_threshold || 0;
  document.getElementById("payMomo").checked = Boolean(state.settings.payment_methods?.momo);
  document.getElementById("payCard").checked = Boolean(state.settings.payment_methods?.card);
  document.getElementById("logoPreview").innerHTML = state.settings.logo_url ? `<img src="${escapeAttr(state.settings.logo_url)}" alt="Store logo" class="max-h-16 rounded-lg bg-white/5 object-contain" />` : "No logo uploaded.";
  renderShippingZoneRows();
}


function renderDeliveryFees() {
  const freeOverEl = document.getElementById("deliveryFreeOver");
  const defaultFeeEl = document.getElementById("deliveryDefaultFee");
  const listEl = document.getElementById("deliveryFeesList");
  const msgEl = document.getElementById("deliverySaveMessage");
  if (!freeOverEl || !defaultFeeEl || !listEl) return;
  const settings = state.deliverySettings || { free_over: 5000, default_fee: 50 };
  freeOverEl.value = settings.free_over ?? 5000;
  defaultFeeEl.value = settings.default_fee ?? 50;
  const fees = Array.isArray(state.deliveryFees) && state.deliveryFees.length ? state.deliveryFees : [];
  if (!fees.length) {
    listEl.innerHTML = emptyState("No delivery fees found. Check admin permissions.");
  } else {
    // Sort by sort_order
    const sorted = [...fees].sort((a,b)=> Number(a.sort_order||999)-Number(b.sort_order||999));
    listEl.innerHTML = sorted.map(r => `
      <div class="flex gap-3 items-center rounded-xl border border-slate-800 bg-[#071126] p-3">
        <div class="flex-1 min-w-0"><p class="text-sm font-black text-white truncate">${escapeHtml(r.region)}</p><p class="text-[10px] text-slate-500">sort ${r.sort_order ?? ""}</p></div>
        <div class="w-32"><label class="admin-label">Fee GH₵</label><input type="number" step="0.01" min="0" class="admin-input delivery-fee-input" data-region="${escapeAttr(r.region)}" value="${Number(r.fee ?? 0)}" /></div>
      </div>
    `).join("");
  }
  // Bind save button
  const saveBtn = document.getElementById("saveDeliveryFees");
  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = "1";
    saveBtn.addEventListener("click", async () => {
      await saveDeliveryFees();
    });
  }
}

async function saveDeliveryFees() {
  const msgEl = document.getElementById("deliverySaveMessage");
  const freeOver = Number(document.getElementById("deliveryFreeOver").value || 0);
  const defaultFee = Number(document.getElementById("deliveryDefaultFee").value || 0);
  const inputs = Array.from(document.querySelectorAll(".delivery-fee-input"));
  const fees = inputs.map(inp => ({ region: inp.dataset.region, fee: Number(inp.value || 0), original: state.deliveryFees.find(r=>r.region===inp.dataset.region)?.fee }));
  const changed = fees.filter(f => Number(f.fee) !== Number(f.original));
  // Validate
  if (Number.isNaN(freeOver) || freeOver < 0) { showToast("Free over must be >=0"); return; }
  if (Number.isNaN(defaultFee) || defaultFee < 0) { showToast("Default fee must be >=0"); return; }
  // Show saving state
  const saveBtn = document.getElementById("saveDeliveryFees");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; }
  try {
    // Build payload for db.saveDeliveryFees: need to pass all fees (changed rows will be updated)
    // But spec says save changed rows via .update().eq(); our db method does that.
    await db.saveDeliveryFees(fees, { free_over: freeOver, default_fee: defaultFee });
    // Refresh state
    try {
      const [newFees, newSettings, audit] = await Promise.all([db.getDeliveryFees(), db.getDeliverySettings(), db.getAuditLog()]);
      state.deliveryFees = newFees;
      state.deliverySettings = newSettings;
      state.auditLog = audit;
    } catch(_) {}
    renderDeliveryFees();
    renderAuditLog();
    if (msgEl) { msgEl.textContent = "Delivery fees saved."; msgEl.className = "text-sm font-bold text-emerald-400"; msgEl.classList.remove("hidden"); }
    showToast("Delivery fees saved.");
  } catch (e) {
    const code = String(e.code || e.status || "");
    const msg = String(e.message || "");
    if (code === "42501" || code === "401" || msg.includes("401") || msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("not your admin")) {
      if (msgEl) { msgEl.textContent = "not your admin account"; msgEl.className = "text-sm font-bold text-red-400"; msgEl.classList.remove("hidden"); }
      showToast("not your admin account");
    } else {
      if (msgEl) { msgEl.textContent = "Save failed: " + (e.message || "unknown error"); msgEl.className = "text-sm font-bold text-red-400"; msgEl.classList.remove("hidden"); }
      showToast("Save failed");
    }
    console.error("saveDeliveryFees failed", e);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Delivery Fees"; }
    setTimeout(() => { if (msgEl) msgEl.classList.add("hidden"); }, 4000);
  }
}

function renderAuditLog() {
  const body = document.getElementById("auditLogBody");
  if (!body) return;
  const logs = Array.isArray(state.auditLog) ? state.auditLog : [];
  if (!logs.length) {
    body.innerHTML = `<tr><td colspan="4">${emptyState("No audit history yet.")}</td></tr>`;
    return;
  }
  body.innerHTML = logs.map(row => {
    const changedAt = row.changed_at || row.created_at || row.timestamp || "";
    const rowKey = row.row_key || row.region || row.key || row.table_name || "" ;
    const actor = row.actor_email || row.actor || row.email || "";
    // old->new fee: try various column names
    let change = "";
    if (row.old_fee != null || row.new_fee != null) change = `${row.old_fee ?? "-"} → ${row.new_fee ?? "-"}`;
    else if (row.old_value != null || row.new_value != null) change = `${JSON.stringify(row.old_value)} → ${JSON.stringify(row.new_value)}`;
    else if (row.old_data || row.new_data) change = `${escapeHtml(JSON.stringify(row.old_data||row.old||""))} → ${escapeHtml(JSON.stringify(row.new_data||row.new||""))}`;
    else if (row.fee != null) change = `${row.fee}`;
    else change = `${row.old_fee ?? row.old_value ?? ""} → ${row.new_fee ?? row.new_value ?? ""}`.trim() || "—";
    // If change still empty, show generic
    if (!change || change === " → ") change = "fee update";
    const dateStr = changedAt ? new Date(changedAt).toLocaleString("en-GH") : "";
    return `<tr><td>${escapeHtml(dateStr)}</td><td class="font-bold text-white">${escapeHtml(String(rowKey))}</td><td>${escapeHtml(change)}</td><td>${escapeHtml(String(actor))}</td></tr>`;
  }).join("");
}

function renderShippingZoneRows() {
  const zones = Array.isArray(state.settings.shipping_zones) ? state.settings.shipping_zones : [];
  document.getElementById("shippingZonesList").innerHTML = zones.length ? zones.map((zone, index) => `
    <div class="grid gap-3 rounded-xl border border-slate-800 bg-[#071126] p-3 md:grid-cols-[1fr_160px_1fr_auto]">
      <input class="admin-input" data-zone-name="${index}" value="${escapeAttr(zone.name || "")}" placeholder="Zone name" />
      <input class="admin-input" data-zone-fee="${index}" type="number" value="${Number(zone.delivery_fee || 0)}" placeholder="Delivery fee" />
      <input class="admin-input" data-zone-days="${index}" value="${escapeAttr(zone.estimated_days || "")}" placeholder="Estimated days" />
      <button type="button" class="btn-danger" data-remove-zone="${index}">Delete</button>
    </div>
  `).join("") : emptyState("No shipping zones yet.");
  document.querySelectorAll("[data-remove-zone]").forEach(button => button.addEventListener("click", () => { state.settings.shipping_zones.splice(Number(button.dataset.removeZone), 1); renderShippingZoneRows(); }));
}

async function saveSettingsForm(event) {
  event.preventDefault();
  document.querySelectorAll("[data-zone-name]").forEach(input => {
    const index = Number(input.dataset.zoneName);
    if (!state.settings.shipping_zones[index]) state.settings.shipping_zones[index] = {};
    state.settings.shipping_zones[index].name = input.value.trim();
  });
  document.querySelectorAll("[data-zone-fee]").forEach(input => {
    const index = Number(input.dataset.zoneFee);
    if (!state.settings.shipping_zones[index]) state.settings.shipping_zones[index] = {};
    state.settings.shipping_zones[index].delivery_fee = Number(input.value || 0);
  });
  document.querySelectorAll("[data-zone-days]").forEach(input => {
    const index = Number(input.dataset.zoneDays);
    if (!state.settings.shipping_zones[index]) state.settings.shipping_zones[index] = {};
    state.settings.shipping_zones[index].estimated_days = input.value.trim();
  });
  state.settings = await db.saveSettings({
    ...state.settings,
    store_name: document.getElementById("settingStoreName").value.trim(),
    admin_email: document.getElementById("settingAdminEmail").value.trim(),
    free_delivery_threshold: Number(document.getElementById("settingFreeDelivery").value || 0),
    payment_methods: {
      momo: document.getElementById("payMomo").checked,
      card: document.getElementById("payCard").checked
    },
    shipping_zones: state.settings.shipping_zones.filter(zone => zone.name)
  });
  renderTopBar();
  showToast("Settings saved.");
}

async function handleLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  showToast("Uploading logo...");
  const url = await db.uploadImage(file, "logos");
  state.settings.logo_url = url;
  await db.saveSettings(state.settings);
  renderSettingsForm();
  showToast("Logo uploaded.");
}

async function changeAdminPassword() {
  const current = document.getElementById("currentAdminPassword").value;
  const next = document.getElementById("newAdminPassword").value.trim();
  if (next.length < 6) {
    showToast("New password must be at least 6 characters.");
    return;
  }
  if (typeof supabase === "undefined") {
    showToast("Supabase not available. Try again later.");
    return;
  }
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // Re-authenticate with current password to verify it
  const { data: sessionData } = await sb.auth.getSession();
  const email = sessionData.session?.user?.email;
  if (!email) { showToast("Not logged in. Please sign in again."); return; }
  const { error: verifyError } = await sb.auth.signInWithPassword({ email, password: current });
  if (verifyError) { showToast("Current password is incorrect."); return; }
  const { error: updateError } = await sb.auth.updateUser({ password: next });
  if (updateError) { showToast("Could not update password: " + updateError.message); return; }
  document.getElementById("currentAdminPassword").value = "";
  document.getElementById("newAdminPassword").value = "";
  showToast("Admin password changed on this device.");
}

function bindProductModalEvents() {
  document.getElementById("closeProductModal").addEventListener("click", closeProductModal);
  document.getElementById("cancelProductForm").addEventListener("click", closeProductModal);
  document.getElementById("productForm").addEventListener("submit", saveProductFromForm);
  document.getElementById("deleteProductFromModal").addEventListener("click", () => confirmDeleteProduct(state.editingProductId));
  document.getElementById("addColorBtn").addEventListener("click", () => addColorRow());
  document.getElementById("addStorageBtn").addEventListener("click", () => addStorageRow());
  const dropZone = document.getElementById("imageDropZone");
  const input = document.getElementById("productImageInput");
  dropZone.addEventListener("click", () => input.click());
  input.addEventListener("change", event => handleImageFiles(event.target.files));
  dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("border-gold"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-gold"));
  dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("border-gold");
    handleImageFiles(event.dataTransfer.files);
  });
}

function populateCategorySelect() {
  const select = document.getElementById("productCategory");
  select.innerHTML = state.categories.map(category => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.name)}</option>`).join("");
}

function openProductModal(id = null) {
  state.editingProductId = id;
  const product = id ? state.products.find(item => String(item.id) === String(id)) : null;
  document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add Product";
  document.getElementById("deleteProductFromModal").classList.toggle("hidden", !product);
  document.getElementById("productForm").reset();
  populateCategorySelect();
  if (product) {
    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productCategory").value = product.category_id || state.categories[0]?.id || "";
    document.getElementById("productBadge").value = product.badge || "";
    document.getElementById("productPrice").value = product.price || 0;
    document.getElementById("productComparePrice").value = product.compare_at_price || "";
    document.getElementById("productWholesalePrice").value = product.wholesale_price || "";
    document.getElementById("productStock").value = product.stock || 0;
    document.getElementById("productSpecs").value = product.specs || "";
    document.getElementById("productActive").value = String(product.is_active !== false);
    document.getElementById("productDescription").value = product.description || "";
    state.productImages = [...new Set([product.image_url, ...(product.images || [])].filter(Boolean))].slice(0, 5);
    renderColorRows(product.colors || []);
    renderStorageRows(product.storage_options || []);
  } else {
    document.getElementById("productId").value = "";
    document.getElementById("productCategory").value = state.categories[0]?.id || "";
    document.getElementById("productActive").value = "true";
    state.productImages = [];
    renderColorRows([]);
    renderStorageRows([]);
  }
  renderImagePreviews();
  document.body.classList.add("modal-open");
  document.getElementById("productModal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("productModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  state.editingProductId = null;
}

async function handleImageFiles(files) {
  const selected = Array.from(files || []).filter(file => file.type.startsWith("image/"));
  if (!selected.length) return;
  const available = 5 - state.productImages.length;
  if (available <= 0) {
    showToast("Maximum 5 images allowed.");
    return;
  }
  const toUpload = selected.slice(0, available);
  showToast("Uploading product images...");
  for (const file of toUpload) {
    const url = await db.uploadImage(file, "products");
    state.productImages.push(url);
    renderImagePreviews();
  }
  document.getElementById("productImageInput").value = "";
  showToast("Image upload complete.");
}

function renderImagePreviews() {
  const list = document.getElementById("imagePreviewList");
  list.innerHTML = state.productImages.length ? state.productImages.map((url, index) => `
    <div class="image-tile relative rounded-xl border border-slate-800 bg-[#071126] p-2" draggable="true" data-image-index="${index}">
      <img src="${escapeAttr(url)}" alt="Product image ${index + 1}" class="h-24 w-full rounded-lg object-cover" />
      <div class="mt-2 flex items-center justify-between"><span class="text-[10px] font-black uppercase text-slate-500">${index === 0 ? "Main" : `Image ${index + 1}`}</span><button type="button" class="text-xs font-black text-red-400" data-remove-image="${index}">Delete</button></div>
    </div>
  `).join("") : `<div class="col-span-full text-sm font-semibold text-slate-500">No images uploaded.</div>`;
  document.querySelectorAll("[data-remove-image]").forEach(button => button.addEventListener("click", () => { state.productImages.splice(Number(button.dataset.removeImage), 1); renderImagePreviews(); }));
  document.querySelectorAll(".image-tile").forEach(tile => {
    tile.addEventListener("dragstart", () => { state.draggingImageIndex = Number(tile.dataset.imageIndex); tile.classList.add("dragging"); });
    tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
    tile.addEventListener("dragover", event => event.preventDefault());
    tile.addEventListener("drop", event => {
      event.preventDefault();
      const from = state.draggingImageIndex;
      const to = Number(tile.dataset.imageIndex);
      if (Number.isNaN(from) || from === to) return;
      const [moved] = state.productImages.splice(from, 1);
      state.productImages.splice(to, 0, moved);
      renderImagePreviews();
    });
  });
}

function renderColorRows(colors) {
  const list = document.getElementById("colorsList");
  list.innerHTML = colors.map((color, index) => colorRowMarkup(color, index)).join("");
  bindVariantRemoveButtons();
}

function addColorRow(color = { name: "", hex: "#000000", available: true }) {
  const list = document.getElementById("colorsList");
  const index = list.querySelectorAll("[data-color-row]").length;
  list.insertAdjacentHTML("beforeend", colorRowMarkup(color, index));
  bindVariantRemoveButtons();
}

function colorRowMarkup(color, index) {
  return `
    <div data-color-row class="grid gap-3 rounded-xl border border-slate-800 bg-[#071126] p-3 sm:grid-cols-[1fr_90px_120px_auto]">
      <input class="admin-input" data-color-name value="${escapeAttr(color.name || "")}" placeholder="Color name" />
      <input class="admin-input h-full" data-color-hex type="color" value="${escapeAttr(color.hex || "#000000")}" />
      <label class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300"><input data-color-available type="checkbox" class="accent-gold" ${color.available !== false ? "checked" : ""} /> Available</label>
      <button type="button" class="btn-danger" data-remove-variant>Delete</button>
    </div>
  `;
}

function renderStorageRows(options) {
  const list = document.getElementById("storageList");
  list.innerHTML = options.map((option, index) => storageRowMarkup(option, index)).join("");
  bindVariantRemoveButtons();
}

function addStorageRow(option = { size: "128GB", price_adjustment: 0 }) {
  const list = document.getElementById("storageList");
  const index = list.querySelectorAll("[data-storage-row]").length;
  list.insertAdjacentHTML("beforeend", storageRowMarkup(option, index));
  bindVariantRemoveButtons();
}

function storageRowMarkup(option, index) {
  return `
    <div data-storage-row class="grid gap-3 rounded-xl border border-slate-800 bg-[#071126] p-3 sm:grid-cols-[1fr_1fr_auto]">
      <input class="admin-input" data-storage-size list="storageSizeOptions" value="${escapeAttr(option.size || "")}" placeholder="128GB / 256GB / 512GB / 1TB" />
      <input class="admin-input" data-storage-adjustment type="number" step="0.01" value="${Number(option.price_adjustment || 0)}" placeholder="Price adjustment" />
      <button type="button" class="btn-danger" data-remove-variant>Delete</button>
    </div>
  `;
}

function bindVariantRemoveButtons() {
  document.querySelectorAll("[data-remove-variant]").forEach(button => {
    button.onclick = () => button.closest("[data-color-row], [data-storage-row]").remove();
  });
}

async function saveProductFromForm(event) {
  event.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const id = document.getElementById("productId").value || crypto.randomUUID();
  const product = {
    id,
    name,
    slug: slugify(name),
    category_id: document.getElementById("productCategory").value,
    category: document.getElementById("productCategory").value,
    price: Number(document.getElementById("productPrice").value || 0),
    compare_at_price: Number(document.getElementById("productComparePrice").value || 0),
    wholesale_price: Number(document.getElementById("productWholesalePrice").value || 0),
    specs: document.getElementById("productSpecs").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    badge: document.getElementById("productBadge").value,
    stock: Number(document.getElementById("productStock").value || 0),
    stock_quantity: Number(document.getElementById("productStock").value || 0),
    image_url: state.productImages[0] || "",
    image: state.productImages[0] || "",
    images: state.productImages.slice(1),
    colors: collectColorRows(),
    storage_options: collectStorageRows(),
    is_active: document.getElementById("productActive").value === "true"
  };
  const saved = await db.saveProduct(product);
  state.products = await db.getProducts();
  renderDashboard();
  renderProductsTable();
  renderCategories();
  closeProductModal();
  showToast(`${saved.name} saved.`);
}

function collectColorRows() {
  return Array.from(document.querySelectorAll("[data-color-row]")).map(row => ({
    name: row.querySelector("[data-color-name]").value.trim(),
    hex: row.querySelector("[data-color-hex]").value || "#000000",
    available: row.querySelector("[data-color-available]").checked
  })).filter(color => color.name);
}

function collectStorageRows() {
  return Array.from(document.querySelectorAll("[data-storage-row]")).map(row => ({
    size: row.querySelector("[data-storage-size]").value.trim(),
    price_adjustment: Number(row.querySelector("[data-storage-adjustment]").value || 0)
  })).filter(option => option.size);
}

async function confirmDeleteProduct(id) {
  if (!id) return;
  const product = state.products.find(item => String(item.id) === String(id));
  if (!confirm(`Delete ${product?.name || "this product"}? This cannot be undone.`)) return;
  await db.deleteProduct(id);
  state.products = await db.getProducts();
  renderDashboard();
  renderProductsTable();
  renderCategories();
  closeProductModal();
  showToast("Product deleted.");
}

function normalizeProduct(product) {
  const parsedImages = parseJsonMaybe(product.images, []);
  const parsedColors = parseJsonMaybe(product.colors, []);
  const parsedStorage = parseJsonMaybe(product.storage_options, []);
  const categoryId = product.category_id || product.category || product.category_slug || "uncategorized";
  const stock = Number(product.stock ?? product.stock_quantity ?? product.quantity ?? 0);
  const imageUrl = product.image_url || product.image || parsedImages[0] || "";
  return {
    ...product,
    id: product.id || crypto.randomUUID(),
    name: product.name || "Untitled Product",
    slug: product.slug || slugify(product.name || "product"),
    category_id: categoryId,
    category: categoryId,
    price: Number(product.price || 0),
    compare_at_price: Number(product.compare_at_price || 0),
    wholesale_price: Number(product.wholesale_price || 0),
    specs: product.specs || "",
    description: product.description || "",
    badge: product.badge || "",
    stock,
    stock_quantity: stock,
    image_url: imageUrl,
    image: imageUrl,
    images: parsedImages.filter(url => url && url !== imageUrl),
    colors: parsedColors,
    storage_options: parsedStorage,
    is_active: product.is_active !== false,
    rating: Number(product.rating || 4.8),
    reviews_count: Number(product.reviews_count || 0)
  };
}

function toStorefrontProduct(product) {
  const normalized = normalizeProduct(product);
  return {
    ...normalized,
    category: normalized.category_id,
    stock_quantity: normalized.stock,
    image: normalized.image_url
  };
}

function normalizeCategory(category) {
  const slug = slugify(category.slug || category.name || category.id || "category");
  return {
    id: category.id || slug,
    name: category.name || titleCase(slug.replace(/-/g, " ")),
    slug,
    sort_order: Number(category.sort_order || 999)
  };
}

function normalizeOrder(order) {
  const rawItems = parseJsonMaybe(order.items, []);
  const items = rawItems.map(item => ({
    product_id: item.product_id || item.id || "",
    name: item.product_name || item.name || item.title || "Product",
    image: item.product_image || item.image || item.image_url || "",
    selected_color: item.selected_color || item.color || "",
    selected_storage: item.selected_storage || item.storage || "",
    quantity: Number(item.quantity || item.qty || 1),
    unit_price: Number(item.unit_price || item.price || 0),
    line_total: Number(item.line_total || item.total || (Number(item.quantity || 1) * Number(item.unit_price || item.price || 0)))
  }));
  const subtotal = Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.line_total || 0), 0));
  const deliveryFee = Number(order.delivery_fee || 0);
  return {
    ...order,
    id: order.id || order.order_number || order.reference_code || crypto.randomUUID(),
    order_number: order.order_number || order.reference_code || `VM-${String(order.id || Date.now()).slice(0, 8).toUpperCase()}`,
    customer_id: order.customer_id || "",
    customer: {
      id: order.customer_id || order.customer_phone || order.customer_email || order.id,
      name: order.customer_name || order.name || "Customer",
      phone: order.customer_phone || order.phone || "",
      email: order.customer_email || order.email || "",
      address: order.delivery_address || [order.customer_area, order.customer_street].filter(Boolean).join(", ") || order.address || ""
    },
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total: Number(order.total ?? order.total_amount ?? subtotal + deliveryFee),
    payment_method: order.payment_method || "",
    status: normalizeStatus(order.status || order.order_status || "Pending"),
    admin_notes: order.admin_notes || "",
    estimated_delivery_date: order.estimated_delivery_date || order.estimated_delivery || "",
    created_at: order.created_at || new Date().toISOString()
  };
}

function normalizeCustomer(customer) {
  return {
    ...customer,
    id: customer.id || customer.phone || customer.email || crypto.randomUUID(),
    name: customer.name || customer.customer_name || "Customer",
    phone: customer.phone || customer.customer_phone || "",
    email: customer.email || customer.customer_email || "",
    addresses: parseJsonMaybe(customer.addresses, []),
    orders: [],
    total_spent: 0
  };
}

function normalizeReview(review) {
  return {
    ...review,
    id: review.id || crypto.randomUUID(),
    product_id: review.product_id || "",
    customer_name: review.customer_name || review.name || "Customer",
    customer_email: review.customer_email || review.email || "",
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    comment: review.comment || "",
    photo_url: review.photo_url || "",
    is_verified_buyer: review.is_verified_buyer !== false,
    is_approved: review.is_approved === true,
    created_at: review.created_at || new Date().toISOString()
  };
}

function attachCustomersToOrders(orders, customers) {
  const customerMap = new Map(customers.map(customer => [String(customer.id), normalizeCustomer(customer)]));
  return orders.map(order => {
    const normalizedOrder = normalizeOrder(order);
    const customer = customerMap.get(String(normalizedOrder.customer_id));
    if (!customer) return normalizedOrder;
    return {
      ...normalizedOrder,
      customer: {
        id: customer.id,
        name: customer.name || normalizedOrder.customer.name,
        phone: customer.phone || normalizedOrder.customer.phone,
        email: customer.email || normalizedOrder.customer.email,
        address: formatAddress(customer.addresses?.[0]) || normalizedOrder.customer.address
      }
    };
  });
}

function mergeCustomersWithOrders(customers, orders) {
  const map = new Map();
  customers.map(normalizeCustomer).forEach(customer => map.set(customerKey(customer), customer));
  orders.map(normalizeOrder).forEach(order => {
    const base = normalizeCustomer({ id: order.customer.id, name: order.customer.name, phone: order.customer.phone, email: order.customer.email, addresses: order.customer.address ? [{ street: order.customer.address }] : [] });
    const key = customerKey(base);
    const existing = map.get(key) || base;
    existing.orders = existing.orders || [];
    existing.orders.push(order);
    existing.total_spent = (existing.total_spent || 0) + (normalizeStatus(order.status) === "Cancelled" ? 0 : Number(order.total || 0));
    const addressText = order.customer.address;
    if (addressText && !existing.addresses.some(address => formatAddress(address) === addressText)) existing.addresses.push({ street: addressText });
    map.set(key, existing);
  });
  return Array.from(map.values()).sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
}

function customerKey(customer) {
  return String(customer.id || customer.phone || customer.email || customer.name).toLowerCase();
}

function getBestSellingProducts() {
  const map = new Map();
  state.orders.filter(order => normalizeStatus(order.status) !== "Cancelled").forEach(order => {
    order.items.forEach(item => {
      const key = item.product_id || item.name;
      const existing = map.get(key) || { name: item.name, quantity: 0, revenue: 0 };
      existing.quantity += Number(item.quantity || 0);
      existing.revenue += Number(item.line_total || 0);
      map.set(key, existing);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
}

function getCategoryName(id) {
  const category = state.categories.find(item => String(item.id) === String(id) || String(item.slug) === String(id));
  return category ? category.name : titleCase(String(id || "Uncategorized").replace(/[-_]/g, " "));
}

function getProductName(id) {
  const product = state.products.find(item => String(item.id) === String(id));
  return product ? product.name : "Unknown product";
}

function normalizeStatus(status) {
  const value = titleCase(String(status || "Pending").replace(/[-_]/g, " ").trim());
  const allowed = ["Pending", "Paid", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  return allowed.includes(value) ? value : "Pending";
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "Delivered" || normalized === "Confirmed" || normalized === "Paid") return "badge-green";
  if (normalized === "Cancelled") return "badge-red";
  return "badge-amber";
}

function parseJsonMaybe(value, fallback) {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function titleCase(value) {
  return String(value || "").replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
}

function formatCurrency(value) {
  return `GH₵ ${Number(value || 0).toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.name, address.zone, address.street, address.landmark].filter(Boolean).join(", ") || address.address || "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function emptyState(message) {
  return `<div class="rounded-xl border border-dashed border-slate-700 bg-[#071126] p-5 text-center text-sm font-bold text-slate-500">${escapeHtml(message)}</div>`;
}

function showToast(message) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}
