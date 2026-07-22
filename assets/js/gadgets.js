// Valmont Gadgets Storefront JS Logic
// Clean production build

const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";

// Default Seed Products
const DEFAULT_PRODUCTS_SEED = [
  {
    id: "vmp-001",
    name: "iPhone 15 Pro Max",
    slug: "iphone-15-pro-max",
    category: "iphones",
    price: 16500,
    wholesale_price: 13900,
    compare_at_price: 18000,
    specs: "Titanium, A17 Pro, Sealed, eSIM plus Physical SIM",
    description: "The ultimate iPhone featuring a strong and lightweight aerospace-grade titanium design with new contoured edges. Powerful camera upgrades enable the equivalent of seven pro lenses with incredible image quality, including a 5x Telephoto camera on iPhone 15 Pro Max.",
    badge: "HOT",
    rating: 4.9,
    reviews_count: 3,
    stock_quantity: 8,
    image_url: "https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop"
    ],
    colors: [
      { name: "Natural Titanium", hex: "#8a8883", available: true },
      { name: "Black Titanium", hex: "#232426", available: true },
      { name: "Blue Titanium", hex: "#2f4452", available: true },
      { name: "White Titanium", hex: "#e3e2de", available: false }
    ],
    storage_options: [
      { size: "256GB", price_adjustment: 0 },
      { size: "512GB", price_adjustment: 2000 },
      { size: "1TB", price_adjustment: 4000 }
    ],
    is_active: true
  },
  {
    id: "vmp-002",
    name: "Samsung Galaxy S24 Ultra",
    slug: "samsung-galaxy-s24-ultra",
    category: "samsung",
    price: 15200,
    wholesale_price: 12800,
    compare_at_price: 16800,
    specs: "Titanium Gray, S Pen, 200MP, Snapdragon 8 Gen 3",
    description: "Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity and possibility starting with the most important device in your life. Your smartphone.",
    badge: "SEALED",
    rating: 4.8,
    reviews_count: 2,
    stock_quantity: 12,
    image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop"
    ],
    colors: [
      { name: "Titanium Gray", hex: "#5c5c5c", available: true },
      { name: "Titanium Black", hex: "#1a1a1a", available: true },
      { name: "Titanium Yellow", hex: "#dfd2a7", available: false }
    ],
    storage_options: [
      { size: "256GB", price_adjustment: -1000 },
      { size: "512GB", price_adjustment: 0 },
      { size: "1TB", price_adjustment: 3000 }
    ],
    is_active: true
  },
  {
    id: "vmp-003",
    name: "MacBook Pro M3",
    slug: "macbook-pro-m3",
    category: "laptops",
    price: 22500,
    wholesale_price: 19200,
    compare_at_price: 24500,
    specs: "14-inch Liquid Retina XDR, M3, 16GB RAM, 512GB SSD",
    description: "The 14-inch MacBook Pro with M3 is the ultimate pro laptop for everyone. Featuring a brilliant Liquid Retina XDR display, a wide array of ports, and an incredibly fast processor that runs silently without draining battery.",
    badge: "BESTSELLER",
    rating: 4.9,
    reviews_count: 1,
    stock_quantity: 5,
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop"
    ],
    colors: [
      { name: "Space Black", hex: "#1d1d1f", available: true },
      { name: "Silver", hex: "#e3e4e5", available: true }
    ],
    storage_options: [
      { size: "512GB", price_adjustment: 0 },
      { size: "1TB", price_adjustment: 2500 }
    ],
    is_active: true
  },
  {
    id: "vmp-004",
    name: "AirPods Pro 2nd Gen USB-C",
    slug: "airpods-pro-2nd-gen-usb-c",
    category: "audio",
    price: 3200,
    wholesale_price: 2550,
    compare_at_price: 3800,
    specs: "MagSafe, Adaptive Smart Audio, H2 Chip, Active Noise Cancellation",
    description: "Rebuilt from the sound up. AirPods Pro feature up to 2x more Active Noise Cancellation than the previous generation, plus Adaptive Audio that dynamically tailors noise control to your environment.",
    badge: "DEAL",
    rating: 4.7,
    reviews_count: 1,
    stock_quantity: 15,
    image_url: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop"
    ],
    colors: [
      { name: "White", hex: "#ffffff", available: true }
    ],
    storage_options: [
      { size: "Standard size", price_adjustment: 0 }
    ],
    is_active: true
  },
  {
    id: "vmp-005",
    name: "Anker 20,000mAh 65W Power Bank",
    slug: "anker-20k-65w-power-bank",
    category: "power",
    price: 1250,
    wholesale_price: 960,
    compare_at_price: 1500,
    specs: "65W Fast Charge, PowerCore 24K, LED Digital Display",
    description: "Equipped with two high-power USB-C ports and one USB-A port, you can charge three devices simultaneously. The intelligent digital display shows remaining battery life, charge speed, and output wattage.",
    badge: "HOT",
    rating: 4.8,
    reviews_count: 0,
    stock_quantity: 3,
    image_url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop"
    ],
    colors: [
      { name: "Black", hex: "#1c1c1c", available: true },
      { name: "Silver", hex: "#c0c0c0", available: true }
    ],
    storage_options: [
      { size: "20000mAh", price_adjustment: 0 }
    ],
    is_active: true
  }
];

const DEFAULT_REVIEWS_SEED = [
  {
    id: "rev-001",
    product_id: "vmp-001",
    customer_name: "Emmanuel Boateng",
    rating: 5,
    comment: "This is a great premium device. Excellent service and original sealed packaging.",
    is_approved: true,
    created_at: "2026-07-20T10:30:00.000Z"
  },
  {
    id: "rev-002",
    product_id: "vmp-001",
    customer_name: "Priscilla Ansah",
    rating: 5,
    comment: "Absolutely genuine iPhone. Same day delivery in East Legon as promised.",
    is_approved: true,
    created_at: "2026-07-21T14:45:00.000Z"
  },
  {
    id: "rev-003",
    product_id: "vmp-002",
    customer_name: "Daniel Mensah",
    rating: 4,
    comment: "Outstanding camera and the S Pen is super smooth. S24 Ultra is unmatched.",
    is_approved: true,
    created_at: "2026-07-19T09:15:00.000Z"
  }
];

// Robust Supabase & LocalStorage API Wrapper Class
class ValmontDatabase {
  constructor() {
    this.useSupabase = false;
    this.supabaseClient = null;

    // Check for Supabase client
    if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.useSupabase = true;
        console.log("Supabase client initialized successfully");
      } catch (err) {
        console.warn("Supabase connection failed, using LocalStorage fallback:", err);
      }
    }
    this.initLocalStorage();
  }

  initLocalStorage() {
    if (!localStorage.getItem("valmont_products")) {
      localStorage.setItem("valmont_products", JSON.stringify(DEFAULT_PRODUCTS_SEED));
    }
    if (!localStorage.getItem("valmont_reviews")) {
      localStorage.setItem("valmont_reviews", JSON.stringify(DEFAULT_REVIEWS_SEED));
    }
    if (!localStorage.getItem("valmont_orders")) {
      localStorage.setItem("valmont_orders", JSON.stringify([]));
    }
  }

  // --- PRODUCTS ---
  async getProducts() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .select("*")
          .eq("is_active", true);
        if (error) throw error;
        if (data && data.length > 0) {
          // Sync to LocalStorage as backup
          localStorage.setItem("valmont_products", JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.error("Supabase getProducts error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_products")).filter(p => p.is_active);
  }

  async getProductById(id) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.error("Supabase getProductById error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_products")).find(p => p.id === id);
  }

  // --- REVIEWS ---
  async getApprovedReviews(productId) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("reviews")
          .select("*")
          .eq("product_id", productId)
          .eq("is_approved", true);
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Supabase getReviews error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_reviews"))
      .filter(r => r.product_id === productId && r.is_approved);
  }

  async createReview(review) {
    const newReview = {
      id: crypto.randomUUID(),
      product_id: review.product_id,
      customer_name: review.customer_name,
      rating: parseInt(review.rating),
      comment: review.comment,
      is_approved: false, // Must be approved by admin
      created_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("reviews")
          .insert([newReview]);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase createReview error, falling back:", err);
      }
    }

    const reviews = JSON.parse(localStorage.getItem("valmont_reviews"));
    reviews.push(newReview);
    localStorage.setItem("valmont_reviews", JSON.stringify(reviews));
    return true;
  }

  // --- ORDERS ---
  async createOrder(order) {
    const newOrder = {
      id: crypto.randomUUID(),
      reference_code: order.reference_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_area: order.customer_area,
      customer_street: order.customer_street || "",
      payment_method: order.payment_method,
      total_amount: parseFloat(order.total_amount),
      items: order.items,
      status: "Pending",
      created_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("orders")
          .insert([newOrder]);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase createOrder error, falling back:", err);
      }
    }

    const orders = JSON.parse(localStorage.getItem("valmont_orders"));
    orders.unshift(newOrder);
    localStorage.setItem("valmont_orders", JSON.stringify(orders));
    return true;
  }
}

// Instantiate Database Wrapper
const db = new ValmontDatabase();

// --- STATE MANAGEMENT ---
let allProducts = [];
let activeCategory = "all";
let activePriceFilter = "all";
let activeSort = "popular";
let activeSearch = "";

let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("valmont_wishlist") || "[]");
let recentlyViewed = JSON.parse(localStorage.getItem("valmont_recently_viewed") || "[]");
let userProfile = JSON.parse(localStorage.getItem("valmont_user") || "null");

let activeQuickViewProduct = null;
let selectedColorName = "";
let selectedStorageSize = "";
let selectedStoragePriceAdjustment = 0;
let quickViewRatingStars = 5;

// Elements
const productGrid = document.getElementById("productGrid");
const flashProductsRow = document.getElementById("flashProductsRow");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const cartBadgeCount = document.getElementById("cartBadgeCount");
const wishlistCountBadge = document.getElementById("wishlistCountBadge");
const topNoticeBanner = document.getElementById("topNoticeBanner");

// --- INITIALIZATION ---
window.addEventListener("DOMContentLoaded", async () => {
  // Load products
  await loadAndRenderProducts();
  
  // Flash sale timer
  initFlashSaleTimer();

  // Load User details
  initUserProfile();

  // UI Event Listeners
  initUIEventListeners();

  // Floating Actions
  initFloatingActions();
});

// --- LOAD AND RENDER CATALOGUE ---
async function loadAndRenderProducts() {
  allProducts = await db.getProducts();
  renderStorefrontGrid();
  renderFlashSale();
  renderRecentlyViewedGrid();
  updateCartBadge();
  updateWishlistBadge();
}

function renderStorefrontGrid() {
  if (!productGrid) return;

  // 1. Filter
  let filtered = allProducts.filter(p => {
    // Category match
    const categoryMatch = activeCategory === "all" || p.category === activeCategory;
    
    // Search match
    const cleanSearch = activeSearch.toLowerCase().trim();
    const productName = (p.name || "").toLowerCase();
    const productSpecs = (p.specs || "").toLowerCase();
    const productCategory = (p.category || "").toLowerCase();
    const searchMatch = !cleanSearch || 
                        productName.includes(cleanSearch) ||
                        productSpecs.includes(cleanSearch) ||
                        productCategory.includes(cleanSearch);
    
    // Price match
    let priceMatch = true;
    if (activePriceFilter === "under-5000") {
      priceMatch = p.price < 5000;
    } else if (activePriceFilter === "5000-15000") {
      priceMatch = p.price >= 5000 && p.price <= 15000;
    } else if (activePriceFilter === "above-15000") {
      priceMatch = p.price > 15000;
    }

    return categoryMatch && searchMatch && priceMatch;
  });

  // 2. Sort
  if (activeSort === "popular") {
    filtered.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
  } else if (activeSort === "newest") {
    filtered.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
  } else if (activeSort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (activeSort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (activeSort === "rating") {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // 3. Render
  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div class="col-span-full text-center py-16 text-slate-400 font-semibold text-sm">
        No premium products match your criteria. Try widening your search or filter.
      </div>
    `;
    return;
  }

  productGrid.innerHTML = filtered.map(p => {
    // Discount percentage
    let discBadge = "";
    if (p.compare_at_price && p.compare_at_price > p.price) {
      const discPercent = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
      discBadge = `<span class="discount-badge">-${discPercent}%</span>`;
    }

    // Badge styling
    let badgeMarkup = "";
    if (p.badge && p.badge !== "none" && p.badge !== "") {
      badgeMarkup = `<span class="product-badge">${p.badge}</span>`;
    }

    // Wishlist status
    const isWishlisted = wishlist.includes(p.id);
    const wishlistLabel = isWishlisted ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`;

    // Stock element
    let stockClass = "stock-in";
    let stockLabel = "In Stock";
    if (p.stock_quantity === 0) {
      stockClass = "stock-out";
      stockLabel = "Sold Out";
    } else if (p.stock_quantity < 10) {
      stockClass = "stock-low";
      stockLabel = `${p.stock_quantity} units left`;
    }

    const compareMarkup = p.compare_at_price
      ? `<span class="product-compare-price">GH₵ ${p.compare_at_price.toLocaleString()}</span>`
      : "";

    return `
      <div class="product-card group" onclick="openProductQuickView('${p.id}')">
        <div class="product-image-container">
          ${badgeMarkup}
          ${discBadge}

          <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="wishlist-heart${isWishlisted ? " active" : ""}" type="button" aria-label="${wishlistLabel}">
            <svg class="w-4 h-4" fill="${isWishlisted ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>

          <img src="${p.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800'}" alt="${p.name} product photo" loading="lazy" />
        </div>

        <div class="product-body">
          <span class="product-category">${p.category}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-specs">${p.specs || ""}</p>

          <div class="product-price-row">
            <span class="product-price">GH₵ ${p.price.toLocaleString()}</span>
            ${compareMarkup}
          </div>

          <div class="product-stock-row">
            <span class="${stockClass}">${stockLabel}</span>
            <div class="product-rating"><span class="star">★</span> ${p.rating || "4.8"} (${p.reviews_count || "0"})</div>
          </div>

          <button onclick="event.stopPropagation(); quickAddProduct('${p.id}')" ${p.stock_quantity === 0 ? 'disabled' : ''} class="add-to-bag-btn" type="button">
            ${p.stock_quantity === 0 ? 'Sold Out' : 'Add to Bag'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderFlashSale() {
  if (!flashProductsRow) return;

  // Filter hot/discounted products for flash sale
  const flashProducts = allProducts.filter(p => p.badge === "HOT" || (p.compare_at_price && p.compare_at_price > p.price)).slice(0, 6);

  if (flashProducts.length === 0) {
    document.getElementById("flashSaleSection").classList.add("hidden");
    return;
  }

  document.getElementById("flashSaleSection").classList.remove("hidden");
  flashProductsRow.innerHTML = flashProducts.map(p => {
    const discPercent = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
    return `
      <div class="bg-slate-900/60 rounded-lg p-2 border border-slate-800 shrink-0 w-36 hover:border-gold/40 transition-colors relative cursor-pointer" onclick="openProductQuickView('${p.id}')">
        <span class="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">-${discPercent}%</span>
        <div class="h-24 w-full flex items-center justify-center overflow-hidden mb-2 bg-slate-950/50 rounded p-1">
          <img src="${p.image_url}" alt="${p.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />
        </div>
        <h4 class="text-[11px] text-slate-200 font-bold truncate leading-tight">${p.name}</h4>
        <div class="mt-1 leading-tight flex flex-col">
          <span class="text-xs font-black text-white">GH₵ ${p.price.toLocaleString()}</span>
          <span class="text-[10px] text-slate-500 line-through font-bold">GH₵ ${p.compare_at_price.toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join("");
}

// --- PRODUCT QUICK VIEW MODAL & VARIANT SYSTEM ---
async function openProductQuickView(id) {
  const p = await db.getProductById(id);
  if (!p) return;

  activeQuickViewProduct = p;

  // Add to recently viewed
  updateRecentlyViewed(p.id);

  // 1. Breadcrumb
  const categoryLabels = {
    iphones: "iPhones and Apple",
    samsung: "Samsung Galaxy",
    laptops: "Executive Laptops",
    audio: "Smart Audio",
    power: "Power and Chargers"
  };
  document.getElementById("qvBreadcrumb").innerHTML = `
    <span class="hover:text-gold cursor-pointer" onclick="closeQuickView();">Store</span>
    <span class="mx-1.5">/</span>
    <span class="hover:text-gold cursor-pointer" onclick="filterCategory('${p.category}'); closeQuickView();">${categoryLabels[p.category] || p.category}</span>
    <span class="mx-1.5">/</span>
    <span class="text-slate-400 truncate max-w-[150px] inline-block align-bottom">${p.name}</span>
  `;

  // 2. Main details
  document.getElementById("qvName").textContent = p.name;
  document.getElementById("qvSpecs").textContent = p.specs || "";
  document.getElementById("qvDescription").textContent = p.description || "";
  
  // Stock message
  const stockEl = document.getElementById("qvStock");
  if (p.stock_quantity === 0) {
    stockEl.className = "text-xs font-black text-red-500 uppercase tracking-wider";
    stockEl.textContent = "Sold Out";
  } else if (p.stock_quantity < 10) {
    stockEl.className = "text-xs font-black text-amber-500 uppercase tracking-wider";
    stockEl.textContent = `${p.stock_quantity} Items Left`;
  } else {
    stockEl.className = "text-xs font-black text-green-500 uppercase tracking-wider";
    stockEl.textContent = "In Stock";
  }

  // 3. Carousel/Images
  const carouselEl = document.getElementById("qvCarousel");
  const thumbnailsEl = document.getElementById("qvThumbnails");
  
  // Combine image_url with other images array
  const allImages = [p.image_url, ...(p.images || [])].filter(x => !!x);
  
  if (allImages.length > 0) {
    carouselEl.innerHTML = `<img id="qvActiveImg" src="${allImages[0]}" alt="${p.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />`;
    if (allImages.length > 1) {
      thumbnailsEl.classList.remove("hidden");
      thumbnailsEl.innerHTML = allImages.map((img, idx) => `
        <button onclick="changeQvActiveImage('${img}')" class="h-12 w-12 rounded bg-slate-900 border border-slate-700 hover:border-gold p-1 flex items-center justify-center overflow-hidden shrink-0">
          <img src="${img}" alt="${p.name} product view ${idx + 1}" loading="lazy" class="max-h-full max-w-full object-contain" />
        </button>
      `).join("");
    } else {
      thumbnailsEl.classList.add("hidden");
    }
  } else {
    carouselEl.innerHTML = `<div class="text-slate-500 text-sm">No Photo Available</div>`;
    thumbnailsEl.classList.add("hidden");
  }

  // 4. Color Swatches
  const colorsContainer = document.getElementById("qvColorsContainer");
  const colorSection = document.getElementById("qvColorsSection");
  if (p.colors && p.colors.length > 0) {
    colorSection.classList.remove("hidden");
    selectedColorName = ""; // reset
    colorsContainer.innerHTML = p.colors.map(c => {
      const availClass = c.available ? "" : "disabled";
      const title = c.available ? c.name : `${c.name} (Unavailable)`;
      return `
        <button onclick="selectColor('${c.name}', ${c.available})" class="color-swatch ${availClass}" style="background-color: ${c.hex};" title="${title}" id="swatch-${c.name.replace(/\s+/g, '-')}"></button>
      `;
    }).join("");

    // Auto-select first available color
    const firstAvail = p.colors.find(c => c.available);
    if (firstAvail) selectColor(firstAvail.name, true);
  } else {
    colorSection.classList.add("hidden");
    selectedColorName = "";
  }

  // 5. Storage Options
  const storageContainer = document.getElementById("qvStorageContainer");
  const storageSection = document.getElementById("qvStorageSection");
  if (p.storage_options && p.storage_options.length > 0) {
    storageSection.classList.remove("hidden");
    selectedStorageSize = "";
    selectedStoragePriceAdjustment = 0;
    
    storageContainer.innerHTML = p.storage_options.map(s => {
      const priceAdj = s.price_adjustment > 0 ? ` (+GH₵ ${s.price_adjustment})` : s.price_adjustment < 0 ? ` (-GH₵ ${Math.abs(s.price_adjustment)})` : "";
      return `
        <button onclick="selectStorage('${s.size}', ${s.price_adjustment})" class="storage-option" id="storage-${s.size.replace(/\s+/g, '-')}">
          ${s.size}${priceAdj}
        </button>
      `;
    }).join("");

    // Auto-select first option
    selectStorage(p.storage_options[0].size, p.storage_options[0].price_adjustment);
  } else {
    storageSection.classList.add("hidden");
    selectedStorageSize = "";
    selectedStoragePriceAdjustment = 0;
    updateQvPrice();
  }

  // 6. Review count & Approved list
  document.getElementById("qvReviewRatingText").innerHTML = `
    <span class="text-gold font-bold">${p.rating || "4.8"} Stars</span>
    <span class="text-slate-400">(${p.reviews_count || "0"} reviews)</span>
  `;
  await renderApprovedReviewsList(p.id);

  // Reset Review Form stars
  setReviewFormStars(5);

  // 7. Customers also viewed (related)
  renderRelatedProducts(p);

  // Show Quickview Modal
  const modal = document.getElementById("quickViewModal");
  modal.classList.remove("hidden");
  modal.scrollTop = 0;
}

function changeQvActiveImage(imgSrc) {
  const activeImg = document.getElementById("qvActiveImg");
  if (activeImg) activeImg.src = imgSrc;
}

function selectColor(name, available) {
  if (!available) return;
  selectedColorName = name;
  
  // Highlight active
  document.querySelectorAll("#qvColorsContainer .color-swatch").forEach(el => el.classList.remove("active"));
  const cleanId = name.replace(/\s+/g, '-');
  const target = document.getElementById(`swatch-${cleanId}`);
  if (target) target.classList.add("active");
  
  updateQvPrice();
}

function selectStorage(size, priceAdjustment) {
  selectedStorageSize = size;
  selectedStoragePriceAdjustment = priceAdjustment;

  // Highlight active
  document.querySelectorAll("#qvStorageContainer .storage-option").forEach(el => el.classList.remove("active"));
  const cleanId = size.replace(/\s+/g, '-');
  const target = document.getElementById(`storage-${cleanId}`);
  if (target) target.classList.add("active");

  updateQvPrice();
}

function updateQvPrice() {
  if (!activeQuickViewProduct) return;
  const basePrice = activeQuickViewProduct.price;
  const currentPrice = basePrice + selectedStoragePriceAdjustment;
  
  document.getElementById("qvPrice").textContent = `GH₵ ${currentPrice.toLocaleString()}`;

  // Update Compare price if exists
  const compEl = document.getElementById("qvComparePrice");
  const discPercentEl = document.getElementById("qvDiscPercent");
  
  if (activeQuickViewProduct.compare_at_price) {
    const baseCompare = activeQuickViewProduct.compare_at_price;
    const currentCompare = baseCompare + selectedStoragePriceAdjustment;
    compEl.classList.remove("hidden");
    compEl.textContent = `GH₵ ${currentCompare.toLocaleString()}`;

    const discPercent = Math.round(((currentCompare - currentPrice) / currentCompare) * 100);
    discPercentEl.classList.remove("hidden");
    discPercentEl.textContent = `-${discPercent}%`;
  } else {
    compEl.classList.add("hidden");
    discPercentEl.classList.add("hidden");
  }
}

function closeQuickView() {
  document.getElementById("quickViewModal").classList.add("hidden");
  activeQuickViewProduct = null;
}

// --- RELATED PRODUCTS ---
function renderRelatedProducts(product) {
  const relatedGrid = document.getElementById("qvRelatedGrid");
  if (!relatedGrid) return;

  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id && p.is_active)
    .slice(0, 4);

  if (related.length === 0) {
    relatedGrid.innerHTML = `
      <div class="col-span-full text-center text-slate-500 py-4 text-xs font-semibold">
        No similar category items currently in stock.
      </div>
    `;
    return;
  }

  relatedGrid.innerHTML = related.map(p => `
    <div onclick="openProductQuickView('${p.id}')" class="bg-slate-900 border border-slate-800 hover:border-gold/40 rounded-lg p-2.5 text-left transition-colors cursor-pointer flex flex-col justify-between">
      <div class="h-20 w-full flex items-center justify-center bg-slate-950/40 rounded p-1 overflow-hidden mb-2">
        <img src="${p.image_url}" alt="${p.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />
      </div>
      <h5 class="text-xs font-bold text-white truncate">${p.name}</h5>
      <span class="text-xs font-black text-gold mt-1">GH₵ ${p.price.toLocaleString()}</span>
    </div>
  `).join("");
}

// --- REVIEWS SYSTEM ---
async function renderApprovedReviewsList(productId) {
  const container = document.getElementById("approvedReviewsList");
  if (!container) return;

  const approved = await db.getApprovedReviews(productId);

  if (approved.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-500 text-xs font-semibold">
        No reviews posted yet for this product. Be the first to share your experience!
      </div>
    `;
    return;
  }

  container.innerHTML = approved.map(r => {
    const starHTML = Array(5).fill("").map((_, i) => `
      <svg class="w-3 h-3 ${i < r.rating ? 'text-gold fill-current' : 'text-slate-700'}" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
    `).join("");

    const dateStr = new Date(r.created_at).toLocaleDateString("en-GH", { year: 'numeric', month: 'short', day: 'numeric' });

    return `
      <div class="border-b border-slate-800 pb-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-extrabold text-white">${r.customer_name}</span>
          <span class="text-[10px] text-slate-500">${dateStr}</span>
        </div>
        <div class="flex gap-0.5 mb-1.5">${starHTML}</div>
        <p class="text-xs text-slate-300 leading-relaxed font-medium">${r.comment || ""}</p>
      </div>
    `;
  }).join("");
}

function setReviewFormStars(stars) {
  quickViewRatingStars = stars;
  const starButtons = document.querySelectorAll("#writeReviewStars button");
  starButtons.forEach((btn, idx) => {
    const starSvg = btn.querySelector("svg");
    if (idx < stars) {
      starSvg.classList.add("text-gold", "fill-current");
      starSvg.classList.remove("text-slate-600");
    } else {
      starSvg.classList.remove("text-gold", "fill-current");
      starSvg.classList.add("text-slate-600");
    }
  });
}

async function submitReviewForm() {
  if (!activeQuickViewProduct) return;

  const nameInput = document.getElementById("reviewName");
  const commentInput = document.getElementById("reviewComment");
  
  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!name) {
    showToast("Please provide your name.");
    return;
  }

  const reviewData = {
    product_id: activeQuickViewProduct.id,
    customer_name: name,
    rating: quickViewRatingStars,
    comment: comment
  };

  const success = await db.createReview(reviewData);
  if (success) {
    nameInput.value = "";
    commentInput.value = "";
    setReviewFormStars(5);
    showToast("Review submitted successfully and is awaiting admin approval.");
  } else {
    showToast("Could not submit review. Please try again.");
  }
}

// --- WISHLIST SYSTEMS ---
function toggleWishlist(id) {
  const idx = wishlist.indexOf(id);
  if (idx !== -1) {
    wishlist.splice(idx, 1);
    showToast("Removed from wishlist.");
  } else {
    wishlist.push(id);
    showToast("Added to wishlist.");
  }
  localStorage.setItem("valmont_wishlist", JSON.stringify(wishlist));
  updateWishlistBadge();
  renderStorefrontGrid();
  renderWishlistItems();
}

function updateWishlistBadge() {
  if (wishlistCountBadge) {
    wishlistCountBadge.textContent = wishlist.length;
  }
}

function openWishlistDrawer() {
  document.getElementById("wishlistDrawer").classList.remove("translate-x-full");
  renderWishlistItems();
}

function closeWishlistDrawer() {
  document.getElementById("wishlistDrawer").classList.add("translate-x-full");
}

function renderWishlistItems() {
  const container = document.getElementById("wishlistDrawerItems");
  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-500 font-semibold text-xs">
        Your Wishlist is empty. Tap the heart icons to save your favorite gadgets!
      </div>
    `;
    document.getElementById("addAllWishlistToCartBtn").classList.add("hidden");
    return;
  }

  document.getElementById("addAllWishlistToCartBtn").classList.remove("hidden");

  // Fetch full details of wishlisted products
  const savedProducts = allProducts.filter(p => wishlist.includes(p.id));

  container.innerHTML = savedProducts.map(p => `
    <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
      <div class="h-14 w-14 bg-slate-900 border border-slate-800 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
        <img src="${p.image_url}" alt="${p.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />
      </div>
      <div class="flex-1 min-w-0">
        <h5 class="text-xs font-bold text-white truncate leading-tight">${p.name}</h5>
        <span class="text-xs font-black text-gold mt-0.5 block">GH₵ ${p.price.toLocaleString()}</span>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="quickAddProduct('${p.id}'); closeWishlistDrawer();" class="bg-gold hover:bg-gold/90 text-slate-900 font-extrabold text-[10px] px-2.5 py-1.5 rounded uppercase tracking-wider transition-colors">
          Add
        </button>
        <button onclick="toggleWishlist('${p.id}')" class="text-red-500 hover:text-red-600 p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join("");
}

function addAllWishlistToCart() {
  wishlist.forEach(id => {
    const p = allProducts.find(x => x.id === id);
    if (p && p.stock_quantity > 0) {
      const exist = cart.find(c => c.id === id);
      if (exist) {
        exist.qty++;
      } else {
        cart.push({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
          qty: 1,
          selected_color: p.colors && p.colors.length > 0 ? p.colors.find(c => c.available)?.name || "" : "",
          selected_storage: p.storage_options && p.storage_options.length > 0 ? p.storage_options[0].size : "",
          price_adjustment: 0
        });
      }
    }
  });

  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  closeWishlistDrawer();
  openCartDrawer();
  showToast("Added all available wishlist items to bag.");
}

// --- RECENTLY VIEWED TRACKER ---
function updateRecentlyViewed(productId) {
  // Remove duplicates
  recentlyViewed = recentlyViewed.filter(id => id !== productId);
  // Add to top
  recentlyViewed.unshift(productId);
  // Limit to 6 items
  if (recentlyViewed.length > 6) recentlyViewed.pop();
  
  localStorage.setItem("valmont_recently_viewed", JSON.stringify(recentlyViewed));
  renderRecentlyViewedGrid();
}

function renderRecentlyViewedGrid() {
  const container = document.getElementById("recentlyViewedGrid");
  const section = document.getElementById("recentlyViewedSection");
  if (!container || !section) return;

  if (recentlyViewed.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  
  // Find products matching recently viewed list
  const items = recentlyViewed
    .map(id => allProducts.find(p => p.id === id && p.is_active))
    .filter(p => !!p);

  if (items.length === 0) {
    section.classList.add("hidden");
    return;
  }

  container.innerHTML = items.map(p => `
    <div onclick="openProductQuickView('${p.id}')" class="bg-slate-panel rounded-lg p-2 border border-slate-800 shrink-0 w-32 hover:border-gold/30 transition-all cursor-pointer">
      <div class="h-20 w-full flex items-center justify-center bg-slate-900/60 rounded p-1 overflow-hidden mb-2">
        <img src="${p.image_url}" alt="${p.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />
      </div>
      <h5 class="text-[11px] font-bold text-white truncate leading-tight">${p.name}</h5>
      <span class="text-xs font-black text-gold mt-1 block">GH₵ ${p.price.toLocaleString()}</span>
    </div>
  `).join("");
}

// --- MULTI-STEP CART DRAWER ---
let checkoutStep = 1; // 1: Summary, 2: Shipping, 3: Payment

function openCartDrawer() {
  document.getElementById("cartDrawer").classList.remove("translate-x-full");
  checkoutStep = 1;
  renderCartStep();
}

function closeCartDrawer() {
  document.getElementById("cartDrawer").classList.add("translate-x-full");
}

function updateCartBadge() {
  if (cartBadgeCount) {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    cartBadgeCount.textContent = total;
  }
}

function quickAddProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  if (p.stock_quantity === 0) {
    showToast("This item is currently sold out.");
    return;
  }

  const selectedColor = p.colors && p.colors.length > 0 ? p.colors.find(c => c.available)?.name || "" : "";
  const selectedStorage = p.storage_options && p.storage_options.length > 0 ? p.storage_options[0].size : "";
  
  const existingItem = cart.find(item => item.id === id && item.selected_color === selectedColor && item.selected_storage === selectedStorage);

  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      qty: 1,
      selected_color: selectedColor,
      selected_storage: selectedStorage,
      price_adjustment: 0
    });
  }

  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  openCartDrawer();
  showToast("Product added to your bag.");
}

function addActiveProductToCart() {
  if (!activeQuickViewProduct) return;
  const p = activeQuickViewProduct;

  if (p.stock_quantity === 0) {
    showToast("This item is currently sold out.");
    return;
  }

  // Check if a color needs selection and is missing
  if (p.colors && p.colors.length > 0 && !selectedColorName) {
    showToast("Please select a color variant.");
    return;
  }

  const existingItem = cart.find(item => item.id === p.id && item.selected_color === selectedColorName && item.selected_storage === selectedStorageSize);

  if (existingItem) {
    existingItem.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      qty: 1,
      selected_color: selectedColorName,
      selected_storage: selectedStorageSize,
      price_adjustment: selectedStoragePriceAdjustment
    });
  }

  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  closeQuickView();
  openCartDrawer();
  showToast("Product added to your bag.");
}

function modifyCartQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  }
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  renderCartStep();
}

function removeCartItem(idx) {
  cart.splice(idx, 1);
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  renderCartStep();
}

function renderCartStep() {
  const summaryStep = document.getElementById("cartStepSummary");
  const shippingStep = document.getElementById("cartStepShipping");
  const paymentStep = document.getElementById("cartStepPayment");

  const tab1 = document.getElementById("stepTab1");
  const tab2 = document.getElementById("stepTab2");
  const tab3 = document.getElementById("stepTab3");

  const backBtn = document.getElementById("cartBackActionBtn");
  const nextBtn = document.getElementById("cartNextActionBtn");

  // Reset steps
  summaryStep.classList.add("hidden");
  shippingStep.classList.add("hidden");
  paymentStep.classList.add("hidden");

  tab1.className = "pb-1 text-slate-500";
  tab2.className = "pb-1 text-slate-500";
  tab3.className = "pb-1 text-slate-500";

  if (checkoutStep === 1) {
    summaryStep.classList.remove("hidden");
    tab1.className = "pb-1 border-b-2 border-gold text-gold font-black";
    backBtn.classList.add("hidden");
    nextBtn.querySelector("span").textContent = "Proceed to Shipping";
    renderCartSummaryTab();
  } else if (checkoutStep === 2) {
    shippingStep.classList.remove("hidden");
    tab2.className = "pb-1 border-b-2 border-gold text-gold font-black";
    backBtn.classList.remove("hidden");
    nextBtn.querySelector("span").textContent = "Proceed to Payment";
  } else if (checkoutStep === 3) {
    paymentStep.classList.remove("hidden");
    tab3.className = "pb-1 border-b-2 border-gold text-gold font-black";
    backBtn.classList.remove("hidden");
    nextBtn.querySelector("span").textContent = "Submit Secure Order";
  }
}

function renderCartSummaryTab() {
  const itemsContainer = document.getElementById("cartItemsList");
  const subtotalEl = document.getElementById("cartSubtotal");
  const deliveryEl = document.getElementById("cartDeliveryFee");
  const totalEl = document.getElementById("cartTotal");

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="py-16 text-center text-slate-500 font-semibold text-xs">
        Your Shopping Cart is empty. Select a premium gadget to begin!
      </div>
    `;
    subtotalEl.textContent = "GH₵ 0";
    deliveryEl.textContent = "GH₵ 0";
    totalEl.textContent = "GH₵ 0";
    document.getElementById("cartNextActionBtn").disabled = true;
    document.getElementById("cartNextActionBtn").classList.add("opacity-50", "cursor-not-allowed");
    return;
  }

  document.getElementById("cartNextActionBtn").disabled = false;
  document.getElementById("cartNextActionBtn").classList.remove("opacity-50", "cursor-not-allowed");

  itemsContainer.innerHTML = cart.map((item, idx) => {
    const itemPrice = item.price + (item.price_adjustment || 0);
    const itemTotal = itemPrice * item.qty;
    const variantsLabel = [item.selected_color, item.selected_storage].filter(Boolean).join(" / ");

    return `
      <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div class="h-14 w-14 bg-slate-900 border border-slate-800 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
          <img src="${item.image_url}" alt="${item.name} product photo" loading="lazy" class="max-h-full max-w-full object-contain" />
        </div>
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-bold text-white truncate leading-tight">${item.name}</h5>
          ${variantsLabel ? `<p class="text-[10px] text-slate-400 mt-0.5 truncate">${variantsLabel}</p>` : ""}
          <p class="text-[11px] text-gold font-black mt-0.5">GH₵ ${itemPrice.toLocaleString()}</p>
          
          <div class="flex items-center gap-2 mt-1.5">
            <button onclick="modifyCartQty(${idx}, -1)" class="bg-slate-800 hover:bg-slate-700 h-5 w-5 font-bold flex items-center justify-center rounded text-xs text-white">-</button>
            <span class="text-xs font-bold text-white w-4 text-center">${item.qty}</span>
            <button onclick="modifyCartQty(${idx}, 1)" class="bg-slate-800 hover:bg-slate-700 h-5 w-5 font-bold flex items-center justify-center rounded text-xs text-white">+</button>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="text-xs font-black text-white block">GH₵ ${itemTotal.toLocaleString()}</span>
          <button onclick="removeCartItem(${idx})" class="text-red-500 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider mt-1 block">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");

  const subtotalValue = cart.reduce((sum, item) => sum + (item.price + (item.price_adjustment || 0)) * item.qty, 0);
  const deliveryValue = subtotalValue >= 5000 ? 0 : 150; // free delivery above 5k

  subtotalEl.textContent = `GH₵ ${subtotalValue.toLocaleString()}`;
  deliveryEl.textContent = deliveryValue === 0 ? "FREE" : `GH₵ ${deliveryValue.toLocaleString()}`;
  totalEl.textContent = `GH₵ ${(subtotalValue + deliveryValue).toLocaleString()}`;
}

function handleCartNextAction() {
  if (checkoutStep === 1) {
    // Proceed to shipping
    checkoutStep = 2;
    renderCartStep();
  } else if (checkoutStep === 2) {
    // Validate Shipping Fields
    const name = document.getElementById("shippingName").value.trim();
    const phone = document.getElementById("shippingPhone").value.trim();
    
    if (!name || !phone) {
      showToast("Please enter your full name and contact number.");
      return;
    }
    
    checkoutStep = 3;
    renderCartStep();
  } else if (checkoutStep === 3) {
    // Submit order
    submitCheckoutOrder();
  }
}

function handleCartBackAction() {
  if (checkoutStep > 1) {
    checkoutStep--;
    renderCartStep();
  }
}

async function submitCheckoutOrder() {
  const name = document.getElementById("shippingName").value.trim();
  const phone = document.getElementById("shippingPhone").value.trim();
  const area = document.getElementById("shippingArea").value;
  const street = document.getElementById("shippingStreet").value.trim();
  const paymentMethod = document.querySelector('input[name="paymentOption"]:checked').value;

  const subtotalValue = cart.reduce((sum, item) => sum + (item.price + (item.price_adjustment || 0)) * item.qty, 0);
  const deliveryValue = subtotalValue >= 5000 ? 0 : 150;
  const totalAmount = subtotalValue + deliveryValue;

  const referenceCode = "VG-" + Date.now().toString().slice(-6);

  const orderData = {
    reference_code: referenceCode,
    customer_name: name,
    customer_phone: phone,
    customer_area: area,
    customer_street: street,
    payment_method: paymentMethod,
    total_amount: totalAmount,
    items: cart.map(i => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price + (i.price_adjustment || 0),
      selected_color: i.selected_color,
      selected_storage: i.selected_storage
    }))
  };

  if (paymentMethod === "card") {
    // Trigger Paystack secure modal
    openPaystackTerminal(orderData);
  } else {
    // Save directly and redirect to WhatsApp
    const success = await db.createOrder(orderData);
    if (success) {
      finalizeSuccessfulOrder(orderData);
    } else {
      showToast("Failed to record order. Please try again.");
    }
  }
}

function finalizeSuccessfulOrder(order) {
  // Build WhatsApp text receipt
  const itemsText = order.items.map(i => {
    const variants = [i.selected_color, i.selected_storage].filter(Boolean).join("/");
    return `* ${i.name} ${variants ? `(${variants})` : ""} - Qty ${i.qty} - GH₵ ${(i.price * i.qty).toLocaleString()}`;
  }).join("\n");

  const paymentNames = {
    momo: "Mobile Money Invoice",
    cod: "Cash on Delivery",
    card: "Paid via Paystack Secure Card"
  };

  const textReceipt = `*VALMONT GADGETS - NEW ORDER*
Reference Code: *#${order.reference_code}*

*ITEMS:*
${itemsText}

*SHIPPING SUMMARY:*
Subtotal: GH₵ ${(order.total_amount - (order.total_amount >= 5150 || order.total_amount === order.total_amount ? (order.total_amount >= 5000 ? 0 : 150) : 150)).toLocaleString()}
Delivery Fee: ${order.total_amount >= 5000 ? "FREE" : "GH₵ 150"}
*TOTAL BILL: GH₵ ${order.total_amount.toLocaleString()}*

*PAYMENT METHOD:* ${paymentNames[order.payment_method]}

*DELIVERY DETAILS:*
Recipient: ${order.customer_name}
Phone: ${order.customer_phone}
Region/Area: ${order.customer_area}
Address/Landmark: ${order.customer_street || "To be provided via chat"}

_Thank you for choosing Valmont Gadgets Ghana. We are preparing your shipment!_`;

  const waUrl = `https://wa.me/233542451578?text=${encodeURIComponent(textReceipt)}`;
  
  // Clear cart
  cart = [];
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  updateCartBadge();
  closeCartDrawer();
  
  // Open WhatsApp Link
  window.open(waUrl, "_blank");

  showToast(`Order #${order.reference_code} submitted. Opening WhatsApp checkout...`);
}

// --- SIMULATED PAYSTACK PAYMENTS TERMINAL ---
let currentPendingOrder = null;

function openPaystackTerminal(order) {
  currentPendingOrder = order;

  document.getElementById("paystackAmount").textContent = `GH₵ ${order.total_amount.toLocaleString()}`;
  
  const formContainer = document.getElementById("paystackFormContainer");
  formContainer.innerHTML = `
    <div class="space-y-3">
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Holder Name</label>
        <input type="text" value="${order.customer_name}" class="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-white text-xs outline-none focus:border-gold" />
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Number</label>
        <input type="text" placeholder="4012 8834 1120 4456" class="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-white text-xs outline-none focus:border-gold" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
          <input type="text" placeholder="MM/YY" class="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-white text-xs outline-none focus:border-gold" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">CVV</label>
          <input type="password" placeholder="332" class="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-white text-xs outline-none focus:border-gold" />
        </div>
      </div>
    </div>
  `;

  // Show Modal
  document.getElementById("paystackModal").classList.remove("hidden");
  document.getElementById("paystackFormContainer").classList.remove("hidden");
  document.getElementById("paystackLoader").classList.add("hidden");
  document.getElementById("paystackSuccess").classList.add("hidden");
  document.getElementById("paystackFooter").classList.remove("hidden");
}

function closePaystackTerminal() {
  document.getElementById("paystackModal").classList.add("hidden");
  currentPendingOrder = null;
}

async function processSimulatedPaystackPayment() {
  if (!currentPendingOrder) return;

  // Show Loader
  document.getElementById("paystackFormContainer").classList.add("hidden");
  document.getElementById("paystackFooter").classList.add("hidden");
  document.getElementById("paystackLoader").classList.remove("hidden");
  
  const statusMsg = document.getElementById("paystackLoaderStatus");
  
  statusMsg.textContent = "Validating card details with your bank...";
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  statusMsg.textContent = "Authorizing transaction via secure 3D-Secure gate...";
  await new Promise(resolve => setTimeout(resolve, 1500));

  statusMsg.textContent = "Finalizing secure GH₵ settlement...";
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Success state
  document.getElementById("paystackLoader").classList.add("hidden");
  document.getElementById("paystackSuccess").classList.remove("hidden");

  await new Promise(resolve => setTimeout(resolve, 1500));

  // Save order to database
  const success = await db.createOrder(currentPendingOrder);
  if (success) {
    const orderToFinalize = { ...currentPendingOrder };
    closePaystackTerminal();
    finalizeSuccessfulOrder(orderToFinalize);
  } else {
    showToast("Error recording payment. Please contact support.");
    closePaystackTerminal();
  }
}

// --- USER PROFILE SIGN IN MANAGEMENT ---
function initUserProfile() {
  const profileLabel = document.getElementById("accountLabel");
  const profileForm = document.getElementById("profileModalForm");
  const profileEditView = document.getElementById("profileEditView");
  const profileDetailsView = document.getElementById("profileDetailsView");

  if (!userProfile) {
    if (profileLabel) profileLabel.textContent = "Sign In";
    if (profileForm) profileForm.classList.remove("hidden");
    if (profileDetailsView) profileDetailsView.classList.add("hidden");
  } else {
    if (profileLabel) profileLabel.textContent = userProfile.name.split(" ")[0];
    if (profileForm) profileForm.classList.add("hidden");
    if (profileDetailsView) {
      profileDetailsView.classList.remove("hidden");
      document.getElementById("profileDispName").textContent = userProfile.name;
      document.getElementById("profileDispPhone").textContent = userProfile.phone;
      document.getElementById("profileDispEmail").textContent = userProfile.email;
    }

    // Auto-fill checkout fields
    if (document.getElementById("shippingName")) {
      document.getElementById("shippingName").value = userProfile.name;
      document.getElementById("shippingPhone").value = userProfile.phone;
    }
  }
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("profileInputName").value.trim();
  const phone = document.getElementById("profileInputPhone").value.trim();
  const email = document.getElementById("profileInputEmail").value.trim();

  if (!name || !phone || !email) {
    showToast("Please fill in all details.");
    return;
  }

  userProfile = { name, phone, email };
  localStorage.setItem("valmont_user", JSON.stringify(userProfile));
  
  initUserProfile();
  closeProfileModal();
  showToast(`Welcome to Valmont Gadgets, ${name}!`);
}

function handleProfileSignOut() {
  userProfile = null;
  localStorage.removeItem("valmont_user");
  
  // Clear autofill
  if (document.getElementById("shippingName")) {
    document.getElementById("shippingName").value = "";
    document.getElementById("shippingPhone").value = "";
  }

  initUserProfile();
  closeProfileModal();
  showToast("Signed out of your customer profile.");
}

function openProfileModal() {
  document.getElementById("profileModal").classList.remove("hidden");
}

function closeProfileModal() {
  document.getElementById("profileModal").classList.add("hidden");
}

// --- WHATSAPP UTILITIES ---
function shareProductOnWhatsApp() {
  if (!activeQuickViewProduct) return;
  const p = activeQuickViewProduct;
  const totalVal = p.price + selectedStoragePriceAdjustment;
  
  const text = `Hello, check out this amazing premium gadget from Valmont Gadgets:\n\n*${p.name}*\nSpecs: ${p.specs}\nPrice: GH₵ ${totalVal.toLocaleString()}\nLink: ${window.location.origin}/index.html?id=${p.id}\n\nGenuine phones and laptops with warranty in Ghana!`;
  
  window.open(`https://wa.me/233542451578?text=${encodeURIComponent(text)}`, "_blank");
}

function launchWhatsAppHelp() {
  const text = "Hello Valmont Gadgets, I need help with purchasing some genuine electronics. Please connect me to an executive sales rep.";
  window.open(`https://wa.me/233542451578?text=${encodeURIComponent(text)}`, "_blank");
}

// --- FLASH SALE & INTERACTIVE HELP FLOATER ---
function initFlashSaleTimer() {
  // Sets a perpetual countdown timer for 4h 23m 11s that resets every 24h
  const display = document.getElementById("flashClockDisplay");
  if (!display) return;

  // Let's set count down target to end of today
  const updateTimer = () => {
    const now = new Date();
    const tonight = new Date();
    tonight.setHours(23, 59, 59, 999);
    
    let diff = tonight - now;
    if (diff < 0) diff = 1000 * 60 * 60 * 4; // safety reset

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    display.textContent = `${h.toString().padStart(2, "0")}h : ${m.toString().padStart(2, "0")}m : ${s.toString().padStart(2, "0")}s`;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

function initFloatingActions() {
  const topBtn = document.getElementById("backToTopBtn");
  
  // Show / Hide back to top
  window.addEventListener("scroll", () => {
    if (window.scrollY > 500) {
      topBtn.classList.remove("opacity-0", "invisible");
      topBtn.classList.add("opacity-100", "visible");
    } else {
      topBtn.classList.add("opacity-0", "invisible");
      topBtn.classList.remove("opacity-100", "visible");
    }
  });

  if (topBtn) {
    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

// --- INTERACTIVE EVENT LISTENERS ---
function initUIEventListeners() {
  // Category Pill Filter Buttons
  document.querySelectorAll("[data-category-pill]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-category-pill]").forEach(p => {
        p.classList.remove("bg-gold", "text-slate-900");
        p.classList.add("bg-slate-panel", "text-slate-300");
      });
      btn.classList.remove("bg-slate-panel", "text-slate-300");
      btn.classList.add("bg-gold", "text-slate-900");

      activeCategory = btn.dataset.categoryPill;
      renderStorefrontGrid();
    });
  });

  // Price Filter Buttons
  document.querySelectorAll("[data-price-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-price-filter]").forEach(p => {
        p.classList.remove("bg-gold", "text-slate-900");
        p.classList.add("bg-slate-900", "text-slate-400");
      });
      btn.classList.remove("bg-slate-900", "text-slate-400");
      btn.classList.add("bg-gold", "text-slate-900");

      activePriceFilter = btn.dataset.priceFilter;
      renderStorefrontGrid();
    });
  });

  // Sort Grid Selector
  const sortSel = document.getElementById("sortSelector");
  if (sortSel) {
    sortSel.addEventListener("change", (e) => {
      activeSort = e.target.value;
      renderStorefrontGrid();
    });
  }

  // Search input and trigger buttons
  const bindSearchInput = (inputEl, buttonEl) => {
    if (!inputEl || !buttonEl) return;

    const handleSearch = () => {
      activeSearch = inputEl.value;
      if (searchInput && searchInput !== inputEl) searchInput.value = activeSearch;
      if (mobileSearchInput && mobileSearchInput !== inputEl) mobileSearchInput.value = activeSearch;
      renderStorefrontGrid();
      // Scroll to grid
      document.getElementById("store-feed").scrollIntoView({ behavior: "smooth" });
    };

    buttonEl.addEventListener("click", handleSearch);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  };

  bindSearchInput(searchInput, searchBtn);
  bindSearchInput(mobileSearchInput, mobileSearchBtn);

  // FAQ Accordion click
  document.querySelectorAll(".faq-header").forEach(hdr => {
    hdr.addEventListener("click", () => {
      const item = hdr.parentElement;
      const body = item.querySelector(".faq-body");
      const active = item.classList.contains("active");

      // Close other accordions
      document.querySelectorAll(".faq-item").forEach(other => {
        other.classList.remove("active");
        other.querySelector(".faq-body").style.maxHeight = null;
      });

      if (!active) {
        item.classList.add("active");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  });
}

function filterCategory(cat) {
  const btn = document.querySelector(`[data-category-pill="${cat}"]`);
  if (btn) {
    btn.click();
    document.getElementById("store-feed").scrollIntoView({ behavior: "smooth" });
  }
}

// Toast alerts utility (Plain, elegant, zero emojis)
function showToast(message) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}
