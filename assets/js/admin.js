// Valmont Gadgets Admin JS Logic
// BRAND: Deep navy #0b1a38, Gold-orange #f58c14, Slate panels #12234a
// ZERO EMOJIS anywhere in UI.

const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";

// Same robust Database manager synced with Supabase & LocalStorage fallbacks
class ValmontAdminDatabase {
  constructor() {
    this.useSupabase = false;
    this.supabaseClient = null;

    if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.useSupabase = true;
        console.log("Admin Supabase initialized successfully");
      } catch (err) {
        console.warn("Admin Supabase connection failed, using LocalStorage fallback:", err);
      }
    }
  }

  // --- PRODUCTS ---
  async getProducts() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          localStorage.setItem("valmont_products", JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.error("Supabase getProducts error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_products") || "[]");
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
    const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
    return products.find(p => p.id === id);
  }

  async createProduct(product) {
    const newProduct = {
      id: crypto.randomUUID(),
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: parseFloat(product.price),
      wholesale_price: parseFloat(product.wholesale_price || 0),
      compare_at_price: parseFloat(product.compare_at_price || 0),
      specs: product.specs || "",
      description: product.description || "",
      badge: product.badge || "none",
      rating: 4.8,
      reviews_count: 0,
      stock_quantity: parseInt(product.stock_quantity || 0),
      image_url: product.image_url || "",
      images: product.images || [],
      colors: product.colors || [],
      storage_options: product.storage_options || [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .insert([newProduct]);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase createProduct error, falling back:", err);
      }
    }

    const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
    products.unshift(newProduct);
    localStorage.setItem("valmont_products", JSON.stringify(products));
    return true;
  }

  async updateProduct(id, product) {
    const updatedFields = {
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: parseFloat(product.price),
      wholesale_price: parseFloat(product.wholesale_price || 0),
      compare_at_price: parseFloat(product.compare_at_price || 0),
      specs: product.specs || "",
      description: product.description || "",
      badge: product.badge || "none",
      stock_quantity: parseInt(product.stock_quantity || 0),
      image_url: product.image_url,
      images: product.images,
      colors: product.colors,
      storage_options: product.storage_options,
      updated_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .update(updatedFields)
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase updateProduct error, falling back:", err);
      }
    }

    const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updatedFields };
      localStorage.setItem("valmont_products", JSON.stringify(products));
      return true;
    }
    return false;
  }

  async deleteProduct(id) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase deleteProduct error, falling back:", err);
      }
    }

    const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem("valmont_products", JSON.stringify(filtered));
    return true;
  }

  // --- REVIEWS ---
  async getReviews() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          localStorage.setItem("valmont_reviews", JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.error("Supabase getReviews error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_reviews") || "[]");
  }

  async approveReview(id) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("reviews")
          .update({ is_approved: true })
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase approveReview error, falling back:", err);
      }
    }

    const reviews = JSON.parse(localStorage.getItem("valmont_reviews") || "[]");
    const idx = reviews.findIndex(r => r.id === id);
    if (idx !== -1) {
      reviews[idx].is_approved = true;
      localStorage.setItem("valmont_reviews", JSON.stringify(reviews));
      return true;
    }
    return false;
  }

  async deleteReview(id) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("reviews")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase deleteReview error, falling back:", err);
      }
    }

    const reviews = JSON.parse(localStorage.getItem("valmont_reviews") || "[]");
    const filtered = reviews.filter(r => r.id !== id);
    localStorage.setItem("valmont_reviews", JSON.stringify(filtered));
    return true;
  }

  // --- ORDERS ---
  async getOrders() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          localStorage.setItem("valmont_orders", JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.error("Supabase getOrders error, falling back:", err);
      }
    }
    return JSON.parse(localStorage.getItem("valmont_orders") || "[]");
  }

  async updateOrderStatus(id, status) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("orders")
          .update({ status: status })
          .eq("id", id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase updateOrderStatus error, falling back:", err);
      }
    }

    const orders = JSON.parse(localStorage.getItem("valmont_orders") || "[]");
    const idx = orders.findIndex(o => o.id === id || o.reference_code === id);
    if (idx !== -1) {
      orders[idx].status = status;
      localStorage.setItem("valmont_orders", JSON.stringify(orders));
      return true;
    }
    return false;
  }

  // --- IMAGES STORAGE UPLOADER ---
  async uploadProductImage(file, onProgress) {
    if (this.useSupabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        // Simulated progress bar triggers on client
        onProgress(20);
        
        const { data, error } = await this.supabaseClient.storage
          .from("product-images")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (error) throw error;
        onProgress(80);

        const { data: { publicUrl } } = this.supabaseClient.storage
          .from("product-images")
          .getPublicUrl(filePath);

        onProgress(100);
        return publicUrl;
      } catch (err) {
        console.error("Supabase image upload failed, falling back to Base64:", err);
      }
    }

    // Local Storage Mock Upload - Read as Base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 100);

      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }
}

// Instantiate Database
const db = new ValmontAdminDatabase();

// --- STATE MANAGEMENT ---
let allProducts = [];
let allOrders = [];
let allReviews = [];

let editingProductId = null;

// Temporary states for current adding/editing form
let uploadedImages = []; // Array of image URLs / Base64 Data
let productColors = []; // Array of [{name, hex, available}]
let productStorageOptions = []; // Array of [{size, price_adjustment}]

// --- PAGE INITIALIZATION ---
window.addEventListener("DOMContentLoaded", () => {
  // Check authorization
  checkAdminAuth();
});

function checkAdminAuth() {
  const isLoggedIn = sessionStorage.getItem("valmont_admin_logged_in") === "true";
  
  if (!isLoggedIn) {
    document.getElementById("authGateOverlay").classList.remove("hidden");
    document.getElementById("adminMainContent").classList.add("hidden");
  } else {
    document.getElementById("authGateOverlay").classList.add("hidden");
    document.getElementById("adminMainContent").classList.remove("hidden");
    initializeDashboard();
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const pass = document.getElementById("authPasswordInput").value.trim();
  
  if (pass === "valmont2026") {
    sessionStorage.setItem("valmont_admin_logged_in", "true");
    checkAdminAuth();
    showAdminToast("Access granted.");
  } else {
    document.getElementById("authErrorMessage").classList.remove("hidden");
    document.getElementById("authPasswordInput").value = "";
  }
}

function handleAdminLogout() {
  sessionStorage.removeItem("valmont_admin_logged_in");
  checkAdminAuth();
  showAdminToast("Logged out successfully.");
}

async function initializeDashboard() {
  // 1. Fetch data
  allProducts = await db.getProducts();
  allOrders = await db.getOrders();
  allReviews = await db.getReviews();

  // 2. Render Dashboard stats
  renderStats();

  // 3. Render list tables
  renderProductsTable();
  renderOrdersTable();
  renderReviewsTable();

  // 4. Fill products dropdown for Bulk Image Upload
  populateBulkProductsDropdown();

  // 5. Init general click handlers and drag-and-drop zone
  initImageUploaderListeners();
}

// --- STATS COMPUTATION & RENDER ---
function renderStats() {
  // Product count
  document.getElementById("statTotalProducts").textContent = allProducts.length;

  // Order count
  document.getElementById("statTotalOrders").textContent = allOrders.length;

  // Revenue stats
  const revenue = allOrders
    .filter(o => o.status !== "Cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  document.getElementById("statRevenue").textContent = `GH₵ ${revenue.toLocaleString()}`;

  // Private Profit stats
  // For each order, find wholesale cost of items
  let totalProfit = 0;
  allOrders.filter(o => o.status !== "Cancelled").forEach(order => {
    order.items.forEach(item => {
      const match = allProducts.find(p => p.id === item.id);
      if (match) {
        const itemWholesale = match.wholesale_price || 0;
        const profitPerItem = item.price - itemWholesale - (order.total_amount >= 5000 ? 0 : 25); // simple flat estimates for extra shipping/momo fees
        totalProfit += profitPerItem * item.qty;
      }
    });
  });

  document.getElementById("statProfit").textContent = `GH₵ ${Math.max(0, Math.round(totalProfit)).toLocaleString()}`;
}

// --- TAB ROUTING ---
function switchTab(tabId) {
  // Hide all sections
  document.querySelectorAll(".admin-tab-section").forEach(sec => sec.classList.add("hidden"));
  // Remove active styling from buttons
  document.querySelectorAll("[data-tab-nav]").forEach(btn => {
    btn.classList.remove("border-gold", "text-gold");
    btn.classList.add("border-transparent", "text-slate-400");
  });

  // Show selected section
  document.getElementById(`section-${tabId}`).classList.remove("hidden");
  
  // Highlight navigation button
  const activeBtn = document.querySelector(`[data-tab-nav="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.remove("border-transparent", "text-slate-400");
    activeBtn.classList.add("border-gold", "text-gold");
  }

  // Refresh data if switching tabs
  if (tabId === "dashboard") {
    initializeDashboard();
  }
}

// --- PRODUCTS MANAGEMENT ---
function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  if (allProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-slate-500 font-semibold text-xs">
          No products found. Click "Add Product" to populate your inventory.
        </td>
      </tr>
    `;
    return;
  }

  const categoryLabels = {
    iphones: "iPhones and Apple",
    samsung: "Samsung Galaxy",
    laptops: "Executive Laptops",
    audio: "Smart Audio",
    power: "Power and Chargers"
  };

  tbody.innerHTML = allProducts.map(p => {
    const isChecked = p.is_active ? "checked" : "";
    return `
      <tr class="border-b border-slate-850 hover:bg-slate-900/40">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="h-10 w-10 rounded bg-slate-900 border border-slate-800 p-1 flex items-center justify-center overflow-hidden">
            <img src="${p.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800'}" class="max-h-full max-w-full object-contain" />
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-xs font-bold text-white">${p.name}</div>
          <div class="text-[10px] text-slate-500 font-mono">${p.slug}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-semibold">
          ${categoryLabels[p.category] || p.category}
        </td>
        <td class="px-6 py-4 whitespace-nowrap leading-tight">
          <div class="text-xs font-extrabold text-white">GH₵ ${p.price.toLocaleString()}</div>
          <div class="text-[10px] text-slate-400 font-bold">Wholesale: GH₵ ${(p.wholesale_price || 0).toLocaleString()}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs font-bold ${p.stock_quantity === 0 ? 'text-red-500' : 'text-slate-300'}">
          ${p.stock_quantity}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.is_active ? 'bg-green-950 text-green-400' : 'bg-slate-950 text-slate-500'}">
            ${p.is_active ? 'Active' : 'Draft'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
          <div class="flex items-center justify-end gap-3">
            <button onclick="openEditProductForm('${p.id}')" class="text-gold hover:text-white transition-colors" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button onclick="triggerDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-white transition-colors" title="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Auto generate slug from title input
function autoFillSlug() {
  const name = document.getElementById("prodName").value;
  const slugInput = document.getElementById("prodSlug");
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  slugInput.value = slug;
}

// Trigger edit mode
async function openEditProductForm(id) {
  const p = await db.getProductById(id);
  if (!p) return;

  editingProductId = p.id;
  document.getElementById("formTitleText").textContent = "Edit Product";

  // Pre-fill fields
  document.getElementById("prodName").value = p.name;
  document.getElementById("prodSlug").value = p.slug;
  document.getElementById("prodCategory").value = p.category;
  document.getElementById("prodPrice").value = p.price;
  document.getElementById("prodComparePrice").value = p.compare_at_price || "";
  document.getElementById("prodWholesalePrice").value = p.wholesale_price || "";
  document.getElementById("prodSpecs").value = p.specs || "";
  document.getElementById("prodDescription").value = p.description || "";
  document.getElementById("prodBadge").value = p.badge || "none";
  document.getElementById("prodStock").value = p.stock_quantity || 0;

  // Restore arrays
  uploadedImages = [p.image_url, ...(p.images || [])].filter(x => !!x);
  productColors = p.colors || [];
  productStorageOptions = p.storage_options || [];

  // Update lists
  renderUploadedThumbnails();
  renderColorsList();
  renderStorageList();

  // Scroll to form or switch tab if needed
  switchTab("product-form");
}

function resetProductForm() {
  editingProductId = null;
  document.getElementById("formTitleText").textContent = "Add Premium Product";
  document.getElementById("productCrudForm").reset();

  uploadedImages = [];
  productColors = [];
  productStorageOptions = [];

  renderUploadedThumbnails();
  renderColorsList();
  renderStorageList();
}

async function handleProductFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("prodName").value.trim();
  const slug = document.getElementById("prodSlug").value.trim();
  const category = document.getElementById("prodCategory").value;
  const price = document.getElementById("prodPrice").value;
  const comparePrice = document.getElementById("prodComparePrice").value || 0;
  const wholesalePrice = document.getElementById("prodWholesalePrice").value || 0;
  const specs = document.getElementById("prodSpecs").value.trim();
  const description = document.getElementById("prodDescription").value.trim();
  const badge = document.getElementById("prodBadge").value;
  const stock = document.getElementById("prodStock").value || 0;

  if (!name || !slug || !price) {
    showAdminToast("Please fill in Name, Slug and Price.");
    return;
  }

  // Validate images
  const mainImage = uploadedImages.length > 0 ? uploadedImages[0] : "";
  const additionalImages = uploadedImages.length > 1 ? uploadedImages.slice(1) : [];

  const productData = {
    name: name,
    slug: slug,
    category: category,
    price: price,
    compare_at_price: comparePrice,
    wholesale_price: wholesalePrice,
    specs: specs,
    description: description,
    badge: badge,
    stock_quantity: stock,
    image_url: mainImage,
    images: additionalImages,
    colors: productColors,
    storage_options: productStorageOptions
  };

  let success = false;
  if (editingProductId) {
    success = await db.updateProduct(editingProductId, productData);
    if (success) showAdminToast("Product updated successfully.");
  } else {
    success = await db.createProduct(productData);
    if (success) showAdminToast("Product created successfully.");
  }

  if (success) {
    resetProductForm();
    switchTab("dashboard");
  } else {
    showAdminToast("Failed to save product details.");
  }
}

async function triggerDeleteProduct(id, name) {
  const confirmDel = confirm(`Are you sure you want to permanently delete: ${name}?`);
  if (!confirmDel) return;

  const success = await db.deleteProduct(id);
  if (success) {
    showAdminToast("Product successfully deleted.");
    initializeDashboard();
  } else {
    showAdminToast("Could not delete product.");
  }
}

// --- IMAGE UPLOADER HANDLERS (VANILLA & ROBUST DRAG-DROP) ---
function initImageUploaderListeners() {
  const zone = document.getElementById("imageDragZone");
  const input = document.getElementById("imageFileInput");

  if (!zone || !input) return;

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFilesUpload(e.dataTransfer.files);
    }
  });

  input.addEventListener("change", () => {
    if (input.files && input.files.length > 0) {
      handleImageFilesUpload(input.files);
      input.value = ""; // Reset
    }
  });
}

async function handleImageFilesUpload(files) {
  if (uploadedImages.length >= 5) {
    showAdminToast("Max 5 images per product reached.");
    return;
  }

  const progressBar = document.getElementById("uploaderProgressBar");
  const progressContainer = document.getElementById("uploaderProgressContainer");

  progressContainer.classList.remove("hidden");

  // Filter out non-images
  const validFiles = Array.from(files).filter(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type));

  if (validFiles.length === 0) {
    showAdminToast("Please provide JPG, PNG, or WebP formats.");
    progressContainer.classList.add("hidden");
    return;
  }

  for (const file of validFiles) {
    if (uploadedImages.length >= 5) break;

    try {
      const publicUrl = await db.uploadProductImage(file, (progress) => {
        progressBar.style.width = `${progress}%`;
      });

      if (publicUrl) {
        uploadedImages.push(publicUrl);
        renderUploadedThumbnails();
      }
    } catch (err) {
      console.error("Upload error:", err);
      showAdminToast("Image upload failed.");
    }
  }

  setTimeout(() => {
    progressContainer.classList.add("hidden");
    progressBar.style.width = "0%";
  }, 1000);
}

function deleteUploadedImage(index) {
  uploadedImages.splice(index, 1);
  renderUploadedThumbnails();
}

function moveImageOrder(index, direction) {
  if (direction === "left" && index > 0) {
    const temp = uploadedImages[index];
    uploadedImages[index] = uploadedImages[index - 1];
    uploadedImages[index - 1] = temp;
  } else if (direction === "right" && index < uploadedImages.length - 1) {
    const temp = uploadedImages[index];
    uploadedImages[index] = uploadedImages[index + 1];
    uploadedImages[index + 1] = temp;
  }
  renderUploadedThumbnails();
}

function renderUploadedThumbnails() {
  const container = document.getElementById("uploaderPreviewContainer");
  if (!container) return;

  if (uploadedImages.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-slate-500 font-semibold text-xs uppercase tracking-wide">
        No images uploaded yet.
      </div>
    `;
    return;
  }

  container.innerHTML = uploadedImages.map((img, idx) => {
    const isMain = idx === 0 ? `<span class="absolute bottom-1 left-1 bg-gold text-slate-900 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Main</span>` : "";
    return `
      <div class="preview-thumbnail">
        <img src="${img}" class="object-contain" />
        ${isMain}
        <button onclick="deleteUploadedImage(${idx})" type="button" class="preview-thumbnail-delete">✕</button>
        
        <!-- Order shifting buttons -->
        <div class="absolute bottom-1 right-1 flex gap-0.5 bg-slate-950/80 px-1 py-0.5 rounded">
          <button onclick="moveImageOrder(${idx}, 'left')" type="button" class="text-white hover:text-gold text-[9px] font-bold px-0.5" ${idx === 0 ? 'disabled' : ''}>&lt;</button>
          <button onclick="moveImageOrder(${idx}, 'right')" type="button" class="text-white hover:text-gold text-[9px] font-bold px-0.5" ${idx === uploadedImages.length - 1 ? 'disabled' : ''}>&gt;</button>
        </div>
      </div>
    `;
  }).join("");
}

// --- COLORS SELECTION LISTS ---
function addColorOption() {
  const nameInput = document.getElementById("colorNameInput");
  const hexInput = document.getElementById("colorHexInput");

  const name = nameInput.value.trim();
  const hex = hexInput.value;

  if (!name) {
    showAdminToast("Please enter a color name.");
    return;
  }

  // Check duplicate
  if (productColors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    showAdminToast("Color already added.");
    return;
  }

  productColors.push({
    name: name,
    hex: hex,
    available: true
  });

  nameInput.value = "";
  renderColorsList();
}

function toggleColorAvailability(idx) {
  productColors[idx].available = !productColors[idx].available;
  renderColorsList();
}

function deleteColorOption(idx) {
  productColors.splice(idx, 1);
  renderColorsList();
}

function renderColorsList() {
  const container = document.getElementById("formColorsList");
  if (!container) return;

  if (productColors.length === 0) {
    container.innerHTML = `<span class="text-slate-500 font-semibold text-xs">No color variants added yet.</span>`;
    return;
  }

  container.innerHTML = productColors.map((c, idx) => `
    <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-2 text-xs">
      <div class="flex items-center gap-2">
        <span class="h-4.5 w-4.5 rounded-full border border-slate-700" style="background-color: ${c.hex};"></span>
        <span class="text-white font-bold">${c.name}</span>
      </div>
      <div class="flex items-center gap-2.5">
        <label class="flex items-center gap-1 cursor-pointer select-none">
          <input type="checkbox" onchange="toggleColorAvailability(${idx})" ${c.available ? 'checked' : ''} class="accent-gold h-3.5 w-3.5" />
          <span class="text-[10px] text-slate-400 font-bold uppercase">Available</span>
        </label>
        <button onclick="deleteColorOption(${idx})" type="button" class="text-red-500 hover:text-red-600 font-bold">
          ✕
        </button>
      </div>
    </div>
  `).join("");
}

// --- STORAGE OPTIONS LISTS ---
function addStorageOption() {
  const sizeInput = document.getElementById("storageSizeInput");
  const priceAdjInput = document.getElementById("storagePriceAdjustmentInput");

  const size = sizeInput.value.trim();
  const adj = parseFloat(priceAdjInput.value || 0);

  if (!size) {
    showAdminToast("Please provide storage size (e.g. 128GB).");
    return;
  }

  // Duplicate Check
  if (productStorageOptions.some(s => s.size.toLowerCase() === size.toLowerCase())) {
    showAdminToast("Storage size already added.");
    return;
  }

  productStorageOptions.push({
    size: size,
    price_adjustment: adj
  });

  sizeInput.value = "";
  priceAdjInput.value = "";
  renderStorageList();
}

function deleteStorageOption(idx) {
  productStorageOptions.splice(idx, 1);
  renderStorageList();
}

function renderStorageList() {
  const container = document.getElementById("formStorageList");
  if (!container) return;

  if (productStorageOptions.length === 0) {
    container.innerHTML = `<span class="text-slate-500 font-semibold text-xs">No storage adjustments added yet.</span>`;
    return;
  }

  container.innerHTML = productStorageOptions.map((s, idx) => `
    <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-2 text-xs">
      <span class="text-white font-extrabold">${s.size}</span>
      <div class="flex items-center gap-3">
        <span class="text-gold font-bold">${s.price_adjustment > 0 ? `+GH₵ ${s.price_adjustment}` : s.price_adjustment < 0 ? `-GH₵ ${Math.abs(s.price_adjustment)}` : 'No adjustment'}</span>
        <button onclick="deleteStorageOption(${idx})" type="button" class="text-red-500 hover:text-red-600 font-bold">
          ✕
        </button>
      </div>
    </div>
  `).join("");
}

// --- BULK IMAGE UPLOAD PANEL ---
function populateBulkProductsDropdown() {
  const select = document.getElementById("bulkProductSelect");
  if (!select) return;

  select.innerHTML = `<option value="">-- Select Product --</option>` + 
    allProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

async function triggerBulkImageUpload(files) {
  const pId = document.getElementById("bulkProductSelect").value;
  if (!pId) {
    showAdminToast("Please select a target product first.");
    return;
  }

  const p = allProducts.find(x => x.id === pId);
  if (!p) return;

  const validFiles = Array.from(files).filter(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type));
  if (validFiles.length === 0) {
    showAdminToast("No valid JPG, PNG, or WebP images found.");
    return;
  }

  // Current images count
  const curImages = [p.image_url, ...(p.images || [])].filter(Boolean);
  if (curImages.length + validFiles.length > 5) {
    showAdminToast("Target product can only hold a maximum of 5 images total.");
    return;
  }

  const listContainer = document.getElementById("bulkUploadResultsList");
  listContainer.innerHTML = `<span class="text-xs font-bold text-slate-400">Uploading bulk images...</span>`;

  let uploadedCount = 0;
  for (const file of validFiles) {
    try {
      const publicUrl = await db.uploadProductImage(file, () => {});
      if (publicUrl) {
        curImages.push(publicUrl);
        uploadedCount++;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Save changes to db
  if (uploadedCount > 0) {
    const updated = {
      ...p,
      image_url: curImages[0],
      images: curImages.slice(1)
    };
    await db.updateProduct(p.id, updated);
    showAdminToast(`Successfully bulk-uploaded ${uploadedCount} images to ${p.name}.`);
    listContainer.innerHTML = `<span class="text-xs font-bold text-green-500">Successfully added ${uploadedCount} images to ${p.name}!</span>`;
    
    // Refresh
    initializeDashboard();
  } else {
    listContainer.innerHTML = `<span class="text-xs font-bold text-red-500">Upload failed.</span>`;
  }
}

// --- ORDERS LIST MANAGEMENT ---
function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  if (allOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-slate-500 font-semibold text-xs">
          No customer orders recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allOrders.map(o => {
    const formattedDate = new Date(o.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });
    
    const itemsDescription = o.items.map(i => {
      const colorStorage = [i.selected_color, i.selected_storage].filter(Boolean).join("/");
      return `${i.name} ${colorStorage ? `(${colorStorage})` : ""} x${i.qty}`;
    }).join(", ");

    return `
      <tr class="border-b border-slate-850 hover:bg-slate-900/40">
        <td class="px-6 py-4 whitespace-nowrap text-xs font-black text-gold">
          #${o.reference_code}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs text-white">
          <div class="font-extrabold">${o.customer_name}</div>
          <div class="text-[10px] text-slate-500 font-bold">${o.customer_phone}</div>
          <div class="text-[9px] text-slate-500 truncate max-w-[150px]">${o.customer_area}</div>
        </td>
        <td class="px-6 py-4 text-xs text-slate-300 font-medium max-w-[200px] truncate" title="${itemsDescription}">
          ${itemsDescription}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs font-black text-white">
          GH₵ ${parseFloat(o.total_amount || 0).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <select onchange="changeOrderStatus('${o.id}', this.value)" class="bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] font-black text-white outline-none focus:border-gold">
            <option value="Pending" ${o.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Processing" ${o.status === "Processing" ? "selected" : ""}>Processing</option>
            <option value="Dispatched" ${o.status === "Dispatched" ? "selected" : ""}>Dispatched</option>
            <option value="Delivered" ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
            <option value="Cancelled" ${o.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
          ${formattedDate}
        </td>
      </tr>
    `;
  }).join("");
}

async function changeOrderStatus(id, newStatus) {
  const success = await db.updateOrderStatus(id, newStatus);
  if (success) {
    showAdminToast(`Order status updated to: ${newStatus}`);
    // Refresh stats
    allOrders = await db.getOrders();
    renderStats();
  } else {
    showAdminToast("Failed to update order status.");
  }
}

// --- REVIEWS MANAGEMENT ---
function renderReviewsTable() {
  const tbody = document.getElementById("reviewsTableBody");
  if (!tbody) return;

  if (allReviews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-8 text-center text-slate-500 font-semibold text-xs">
          No reviews submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allReviews.map(r => {
    // Find target product name
    const prod = allProducts.find(p => p.id === r.product_id);
    const prodName = prod ? prod.name : "Unknown Product";
    const dateStr = new Date(r.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });

    const stars = Array(5).fill("").map((_, i) => `
      <svg class="w-3 h-3 ${i < r.rating ? 'text-gold fill-current' : 'text-slate-700'}" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
    `).join("");

    const approveButton = r.is_approved ? 
      `<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-950 text-green-400">Approved</span>` : 
      `<button onclick="triggerApproveReview('${r.id}')" class="bg-gold hover:bg-gold/90 text-slate-900 font-extrabold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider transition-colors">Approve</button>`;

    return `
      <tr class="border-b border-slate-850 hover:bg-slate-900/40">
        <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-white">
          ${r.customer_name}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium max-w-[150px] truncate" title="${prodName}">
          ${prodName}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex gap-0.5">${stars}</div>
        </td>
        <td class="px-6 py-4 text-xs text-slate-300 font-medium max-w-[200px] truncate" title="${r.comment || ''}">
          ${r.comment || ""}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          ${approveButton}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right">
          <button onclick="triggerDeleteReview('${r.id}')" class="text-red-500 hover:text-white transition-colors" title="Delete">
            <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function triggerApproveReview(id) {
  const success = await db.approveReview(id);
  if (success) {
    showAdminToast("Review successfully approved and visible on storefront.");
    allReviews = await db.getReviews();
    renderReviewsTable();
  } else {
    showAdminToast("Could not approve review.");
  }
}

async function triggerDeleteReview(id) {
  const confirmDel = confirm("Are you sure you want to permanently delete this customer review?");
  if (!confirmDel) return;

  const success = await db.deleteReview(id);
  if (success) {
    showAdminToast("Review deleted successfully.");
    allReviews = await db.getReviews();
    renderReviewsTable();
  } else {
    showAdminToast("Failed to delete review.");
  }
}

// --- ADMIN TOAST ALERT ---
function showAdminToast(msg) {
  const toast = document.getElementById("adminToast");
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}
