// Valmont Gadgets complete admin panel
// Password gate, Supabase CRUD, localStorage fallback, image uploads and responsive UI.

const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";
const DEFAULT_ADMIN_PASSWORD = "valmont2026";
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
  payment_methods: { momo: true, card: true, cod: true },
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
    const normalizedUpdates = {
      status: updates.status,
      admin_notes: updates.admin_notes || ""
    };
    if (this.useSupabase) {
      try {
        const { error } = await this.client.from("orders").update(normalizedUpdates).eq("id", id);
        if (error) throw error;
      } catch (requestedError) {
        try {
          const { error } = await this.client.from("orders").update({ order_status: updates.status, admin_notes: updates.admin_notes || "" }).eq("id", id);
          if (error) throw error;
        } catch (legacyError) {
          console.warn("Supabase order update failed; saving local copy only.", { requestedError, legacyError });
        }
      }
    }
    const orders = this.readLocal(storageKeys.orders, []).map(normalizeOrder).map(order => String(order.id) === String(id) ? { ...order, ...normalizedUpdates } : order);
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
  bindAuthEvents();
  bindNavigationEvents();
  bindFormEvents();
  bindProductModalEvents();
  bindOrderEvents();
  bindResponsiveShell();

  if (localStorage.getItem("valmont_admin_authenticated") === "true") {
    showAdminApp();
    await loadAllData();
  }
}

function bindAuthEvents() {
  document.getElementById("adminLoginForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("adminPasswordInput");
    const password = input.value.trim();
    if (password === getAdminPassword()) {
      localStorage.setItem("valmont_admin_authenticated", "true");
      localStorage.setItem("valmont_admin_saved_password", password);
      document.getElementById("loginError").classList.add("hidden");
      showAdminApp();
      loadAllData();
    } else {
      document.getElementById("loginError").classList.remove("hidden");
      input.select();
    }
  });
  document.getElementById("topLogoutBtn").addEventListener("click", logoutAdmin);
  document.getElementById("sidebarLogoutBtn").addEventListener("click", logoutAdmin);
}

function getAdminPassword() {
  return localStorage.getItem("valmont_admin_password") || DEFAULT_ADMIN_PASSWORD;
}

function logoutAdmin() {
  localStorage.removeItem("valmont_admin_authenticated");
  localStorage.removeItem("valmont_admin_saved_password");
  document.getElementById("adminApp").classList.add("hidden");
  document.getElementById("authGate").classList.remove("hidden");
  document.getElementById("adminPasswordInput").value = "";
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

  document.getElementById("orderDetailContent").innerHTML = `
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-[#071126] p-4"><h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Customer Info</h3><p class="font-black text-white">${escapeHtml(order.customer.name)}</p><p class="text-sm font-semibold text-slate-300">${escapeHtml(order.customer.phone || "No phone")}</p><p class="text-sm font-semibold text-slate-300">${escapeHtml(order.customer.email || "No email")}</p><p class="mt-3 text-sm font-semibold text-slate-400">${escapeHtml(order.customer.address || "No delivery address")}</p></div>
      <div class="rounded-xl border border-slate-800 bg-[#071126] p-4"><h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Payment & Totals</h3><div class="space-y-2 text-sm font-bold text-slate-300"><div class="flex justify-between"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div><div class="flex justify-between"><span>Delivery fee</span><span>${formatCurrency(order.delivery_fee)}</span></div><div class="flex justify-between border-t border-slate-800 pt-2 text-base text-gold"><span>Total</span><span>${formatCurrency(order.total)}</span></div><div class="flex justify-between"><span>Payment method</span><span>${escapeHtml(order.payment_method || "Not set")}</span></div></div></div>
    </div>
    <div><h3 class="mb-3 text-xs font-black uppercase tracking-widest text-gold">Items</h3><div class="space-y-3">${itemsMarkup}</div></div>
    <div class="grid gap-4 md:grid-cols-2">
      <div><label class="admin-label">Status</label><select id="orderStatusInput" class="admin-input">${["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"].map(status => `<option ${normalizeStatus(order.status) === status ? "selected" : ""}>${status}</option>`).join("")}</select></div>
      <div><label class="admin-label">Admin Notes</label><textarea id="orderNotesInput" rows="4" class="admin-input" placeholder="Internal notes only">${escapeHtml(order.admin_notes || "")}</textarea></div>
    </div>
    <div class="flex justify-end"><button id="saveOrderDetails" class="btn-gold" type="button">Save Order</button></div>
  `;
  document.getElementById("saveOrderDetails").addEventListener("click", async () => {
    await db.updateOrder(order.id, { status: document.getElementById("orderStatusInput").value, admin_notes: document.getElementById("orderNotesInput").value });
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
      <td class="font-bold text-white">${escapeHtml(review.customer_name)}</td>
      <td class="text-gold">${"★".repeat(Number(review.rating || 0))}${"☆".repeat(5 - Number(review.rating || 0))}</td>
      <td class="max-w-sm"><p class="line-clamp-2">${escapeHtml(review.comment || "")}</p></td>
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
  document.getElementById("payCod").checked = Boolean(state.settings.payment_methods?.cod);
  document.getElementById("logoPreview").innerHTML = state.settings.logo_url ? `<img src="${escapeAttr(state.settings.logo_url)}" alt="Store logo" class="max-h-16 rounded-lg bg-white/5 object-contain" />` : "No logo uploaded.";
  renderShippingZoneRows();
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
      card: document.getElementById("payCard").checked,
      cod: document.getElementById("payCod").checked
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

function changeAdminPassword() {
  const current = document.getElementById("currentAdminPassword").value;
  const next = document.getElementById("newAdminPassword").value.trim();
  if (current !== getAdminPassword()) {
    showToast("Current password is incorrect.");
    return;
  }
  if (next.length < 6) {
    showToast("New password must be at least 6 characters.");
    return;
  }
  localStorage.setItem("valmont_admin_password", next);
  localStorage.setItem("valmont_admin_saved_password", next);
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
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    comment: review.comment || "",
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
  const allowed = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  return allowed.includes(value) ? value : "Pending";
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "Delivered" || normalized === "Confirmed") return "badge-green";
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
