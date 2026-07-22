// Valmont Gadgets - Customer Account JS
// Full customer profile, addresses, orders, history & wishlist

const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";

let currentUser = null;
let customerAddresses = [];
let customerOrders = [];
let browsingHistory = [];
let userWishlist = [];

// Supabase client (if available)
let supabaseClient = null;
try {
  if (typeof supabase !== "undefined") {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {}

// Initialize page
window.addEventListener("DOMContentLoaded", () => {
  initCustomerAccount();
});

function initCustomerAccount() {
  // Load user
  currentUser = JSON.parse(localStorage.getItem("valmont_user") || "null");
  
  if (!currentUser) {
    // Redirect to login or show prompt
    window.location.href = "/index.html";
    return;
  }

  // Populate profile
  populateProfileForm();
  
  // Load addresses
  loadCustomerAddresses();
  
  // Load orders
  loadCustomerOrders();
  
  // Load browsing history
  loadBrowsingHistory();
  
  // Load wishlist
  loadWishlist();
  
  // Welcome text
  document.getElementById("welcomeText").innerHTML = `Welcome back, <span class="font-bold text-white">${currentUser.name.split(" ")[0]}</span>`;
}

function populateProfileForm() {
  if (!currentUser) return;
  
  document.getElementById("profileName").value = currentUser.name || "";
  document.getElementById("profilePhone").value = currentUser.phone || "";
  document.getElementById("profileEmail").value = currentUser.email || "";
}

async function saveProfile(e) {
  e.preventDefault();
  
  const name = document.getElementById("profileName").value.trim();
  const phone = document.getElementById("profilePhone").value.trim();
  const email = document.getElementById("profileEmail").value.trim();
  
  if (!name || !phone || !email) {
    showToast("Please fill all fields");
    return;
  }
  
  currentUser.name = name;
  currentUser.phone = phone;
  currentUser.email = email;
  
  localStorage.setItem("valmont_user", JSON.stringify(currentUser));
  
  // Sync to Supabase if possible (placeholder)
  if (supabaseClient) {
    try {
      // Future: await supabaseClient.from("customers").update({...}).eq("id", currentUser.id);
    } catch (_) {}
  }
  
  showToast("Profile updated successfully!");
}

async function changePassword(e) {
  e.preventDefault();
  
  const current = document.getElementById("currentPass").value;
  const newPass = document.getElementById("newPass").value;
  
  if (!current || !newPass) {
    showToast("Enter both passwords");
    return;
  }
  
  // Simulated password change
  showToast("Password changed successfully!");
  document.getElementById("currentPass").value = "";
  document.getElementById("newPass").value = "";
}

// === ADDRESSES ===
function loadCustomerAddresses() {
  customerAddresses = JSON.parse(localStorage.getItem("valmont_customer_addresses") || "[]");
  renderAddresses();
}

function renderAddresses() {
  const container = document.getElementById("addressesList");
  if (!container) return;
  
  if (customerAddresses.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-sm">No saved addresses. Add one to auto-fill checkout.</div>`;
    return;
  }
  
  container.innerHTML = customerAddresses.map(addr => `
    <div class="bg-navy-deep border border-slate-700 p-5 rounded-xl relative">
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-black text-sm">${addr.name}</span>
            ${addr.is_default ? `<span class="text-[9px] px-2 py-0.5 bg-gold text-navy-deep font-black rounded">DEFAULT</span>` : ""}
          </div>
          <div class="text-xs mt-1 text-slate-300">${addr.recipient || addr.name}</div>
          <div class="text-xs text-slate-400">${addr.phone}</div>
        </div>
        <div class="flex gap-1">
          <button onclick="editAddress('${addr.id}')" class="text-xs px-2 py-1 text-gold hover:text-white">EDIT</button>
          <button onclick="deleteAddress('${addr.id}')" class="text-xs px-2 py-1 text-red-400 hover:text-red-300">DEL</button>
        </div>
      </div>
      
      <div class="mt-3 pt-3 border-t border-slate-700 text-xs leading-tight">
        <div class="font-medium">${addr.zone}</div>
        <div class="text-slate-400">${addr.street}</div>
        ${addr.landmark ? `<div class="text-[10px] text-slate-500">${addr.landmark}</div>` : ""}
      </div>
      
      ${!addr.is_default ? `
        <button onclick="setDefaultAddress('${addr.id}')" class="mt-3 text-xs font-black text-gold">Set as Default</button>
      ` : ""}
    </div>
  `).join("");
}

function showAddAddressModal(editId = null) {
  const modal = document.getElementById("addressModal");
  const form = document.getElementById("addressForm");
  const title = document.getElementById("addressModalTitle");
  
  form.reset();
  document.getElementById("addressId").value = "";
  
  if (editId) {
    title.textContent = "Edit Address";
    const addr = customerAddresses.find(a => a.id === editId);
    if (addr) {
      document.getElementById("addressId").value = addr.id;
      document.getElementById("addrName").value = addr.name || "";
      document.getElementById("addrRecipient").value = addr.recipient || "";
      document.getElementById("addrPhone").value = addr.phone || "";
      document.getElementById("addrZone").value = addr.zone || "";
      document.getElementById("addrStreet").value = addr.street || "";
      document.getElementById("addrLandmark").value = addr.landmark || "";
      document.getElementById("addrDefault").checked = addr.is_default || false;
    }
  } else {
    title.textContent = "Add New Address";
    // Prefill from profile
    if (currentUser) {
      document.getElementById("addrRecipient").value = currentUser.name || "";
      document.getElementById("addrPhone").value = currentUser.phone || "";
    }
  }
  
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAddressModal() {
  const modal = document.getElementById("addressModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function saveAddress(e) {
  e.preventDefault();
  
  const id = document.getElementById("addressId").value || crypto.randomUUID();
  const isEdit = !!document.getElementById("addressId").value;
  
  const newAddr = {
    id: id,
    name: document.getElementById("addrName").value.trim(),
    recipient: document.getElementById("addrRecipient").value.trim(),
    phone: document.getElementById("addrPhone").value.trim(),
    zone: document.getElementById("addrZone").value,
    street: document.getElementById("addrStreet").value.trim(),
    landmark: document.getElementById("addrLandmark").value.trim(),
    is_default: document.getElementById("addrDefault").checked,
    created_at: new Date().toISOString()
  };
  
  if (!isEdit) {
    // If this is first or marked default, unset others
    if (newAddr.is_default) {
      customerAddresses.forEach(a => a.is_default = false);
    } else if (customerAddresses.length === 0) {
      newAddr.is_default = true;
    }
    customerAddresses.unshift(newAddr);
  } else {
    const idx = customerAddresses.findIndex(a => a.id === id);
    if (idx !== -1) {
      if (newAddr.is_default) {
        customerAddresses.forEach(a => a.is_default = false);
      }
      customerAddresses[idx] = { ...customerAddresses[idx], ...newAddr };
    }
  }
  
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  closeAddressModal();
  renderAddresses();
  showToast("Address saved.");
}

function editAddress(id) {
  showAddAddressModal(id);
}

function deleteAddress(id) {
  if (!confirm("Delete this address?")) return;
  customerAddresses = customerAddresses.filter(a => a.id !== id);
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  renderAddresses();
}

function setDefaultAddress(id) {
  customerAddresses.forEach(a => a.is_default = a.id === id);
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  renderAddresses();
}

// === ORDERS ===
function loadCustomerOrders() {
  const allOrders = JSON.parse(localStorage.getItem("valmont_orders") || "[]");
  
  // Filter by current user (match phone or name)
  customerOrders = allOrders.filter(o => 
    (currentUser && (o.customer_phone === currentUser.phone || o.customer_name === currentUser.name)) ||
    (o.customer_phone && currentUser && o.customer_phone.includes(currentUser.phone.slice(-8)))
  );
  
  renderOrderHistory();
}

function renderOrderHistory() {
  const container = document.getElementById("orderHistoryList");
  if (!container) return;
  
  if (customerOrders.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400">You have no orders yet.</div>`;
    return;
  }
  
  container.innerHTML = customerOrders.map(order => {
    const date = new Date(order.created_at || Date.now()).toLocaleDateString("en-GH", {month:"short", day:"numeric", year:"numeric"});
    const itemCount = (order.items || []).length;
    
    return `
      <div onclick="viewOrderDetails('${order.id || order.reference_code}')" class="border border-slate-700 hover:border-gold transition cursor-pointer bg-navy-deep p-5 rounded-xl flex justify-between items-center">
        <div>
          <div class="font-black text-sm text-gold">#${order.reference_code}</div>
          <div class="text-xs text-slate-400">${date}</div>
        </div>
        <div class="text-right">
          <div class="font-black">${itemCount} item${itemCount > 1 ? "s" : ""}</div>
          <div class="text-xs text-gold font-bold">GH₵ ${parseFloat(order.total_amount || 0).toLocaleString()}</div>
          <div class="inline-block mt-1 px-3 py-0.5 text-xs font-black rounded-full ${getStatusBadgeClass(order.status)}">${order.status || "Pending"}</div>
        </div>
      </div>
    `;
  }).join("");
}

function getStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("deliv")) return "bg-green-950 text-green-400";
  if (s.includes("disp")) return "bg-purple-950 text-purple-400";
  if (s.includes("conf") || s.includes("proc")) return "bg-blue-950 text-blue-400";
  return "bg-yellow-950 text-yellow-400";
}

function viewOrderDetails(orderId) {
  const order = customerOrders.find(o => o.id === orderId || o.reference_code === orderId);
  if (!order) return;
  
  const modal = document.getElementById("orderDetailsModal");
  
  document.getElementById("orderModalRef").textContent = `#${order.reference_code}`;
  
  // Customer info
  const custInfo = document.getElementById("orderCustomerInfo");
  custInfo.innerHTML = `
    <div><span class="text-slate-400 text-xs">NAME</span><br><span class="font-bold">${order.customer_name}</span></div>
    <div><span class="text-slate-400 text-xs">PHONE</span><br><span class="font-bold">${order.customer_phone}</span></div>
    <div class="md:col-span-2"><span class="text-slate-400 text-xs">DELIVERY ADDRESS</span><br>
      <span class="font-medium">${order.customer_area || ""} — ${order.customer_street || "—"}</span>
    </div>
  `;
  
  // Items
  const itemsContainer = document.getElementById("orderItemsList");
  const itemsHTML = (order.items || []).map(item => {
    const lineTotal = (item.price || 0) * (item.qty || 1);
    const variant = [item.selected_color, item.selected_storage].filter(Boolean).join(" / ");
    
    return `
      <div class="flex gap-4 border-b border-slate-700 pb-4">
        <div class="w-14 h-14 bg-slate-900 border border-slate-700 rounded overflow-hidden flex-shrink-0">
          <img src="${item.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=300'}" class="w-full h-full object-contain">
        </div>
        <div class="flex-1 text-sm">
          <div class="font-bold">${item.name}</div>
          ${variant ? `<div class="text-xs text-slate-400">${variant}</div>` : ""}
          <div class="flex justify-between text-xs mt-1">
            <span>Qty: ${item.qty}</span>
            <span class="font-black text-gold">GH₵ ${lineTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  itemsContainer.innerHTML = itemsHTML || `<div class="text-xs text-slate-400">No items listed.</div>`;
  
  // Totals
  const subtotal = (order.items || []).reduce((sum, i) => sum + ((i.price || 0) * (i.qty || 1)), 0);
  const delivery = order.total_amount > 5000 ? 0 : 150;
  
  document.getElementById("orderModalSubtotal").textContent = `GH₵ ${subtotal.toLocaleString()}`;
  document.getElementById("orderModalDelivery").textContent = delivery === 0 ? "FREE" : `GH₵ ${delivery}`;
  document.getElementById("orderModalTotal").textContent = `GH₵ ${parseFloat(order.total_amount || 0).toLocaleString()}`;
  
  // Timeline
  renderOrderTimeline(order);
  
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function renderOrderTimeline(order) {
  const container = document.getElementById("orderTimeline");
  const status = (order.status || "Pending").toLowerCase();
  
  const steps = [
    { label: "Placed", done: true },
    { label: "Stock Confirmed", done: ["confirmed", "processing", "dispatched", "delivered"].includes(status) },
    { label: "Dispatched", done: ["dispatched", "delivered"].includes(status) },
    { label: "Delivered", done: status.includes("delivered") }
  ];
  
  container.innerHTML = steps.map((step, i) => `
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 rounded-full flex-shrink-0 ${step.done ? 'bg-gold' : 'bg-slate-700'}"></div>
      <div class="text-xs flex-1 font-bold">${step.label}</div>
      ${i < steps.length - 1 ? `<div class="flex-1 h-px bg-slate-700"></div>` : ""}
    </div>
  `).join("");
}

function closeOrderModal() {
  const modal = document.getElementById("orderDetailsModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function reorderFromOrder() {
  const modal = document.getElementById("orderDetailsModal");
  // Get current order from reference
  const refText = document.getElementById("orderModalRef").textContent.replace("#", "");
  const order = customerOrders.find(o => o.reference_code === refText);
  
  if (!order || !order.items) {
    showToast("Unable to reorder.");
    return;
  }
  
  let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
  
  order.items.forEach(item => {
    const existing = cart.findIndex(c => c.id === item.id && c.selected_color === item.selected_color && c.selected_storage === item.selected_storage);
    
    if (existing !== -1) {
      cart[existing].qty += item.qty || 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url || "",
        qty: item.qty || 1,
        selected_color: item.selected_color || "",
        selected_storage: item.selected_storage || "",
        price_adjustment: 0
      });
    }
  });
  
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  closeOrderModal();
  
  showToast("Items added to your cart!");
  setTimeout(() => window.location.href = "/index.html", 1200);
}

// === BROWSING HISTORY ===
function loadBrowsingHistory() {
  browsingHistory = JSON.parse(localStorage.getItem("valmont_recently_viewed") || "[]");
  
  const container = document.getElementById("browsingHistoryGrid");
  if (!container) return;
  
  if (browsingHistory.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-sm">No products viewed recently.</div>`;
    return;
  }
  
  // Get products from localStorage
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
  
  const html = browsingHistory.slice(0, 20).map(productId => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return "";
    
    return `
      <div onclick="window.location.href='/index.html#store-feed'" class="bg-navy-deep border border-slate-700 hover:border-gold cursor-pointer p-3 rounded-xl">
        <div class="h-28 flex items-center justify-center bg-slate-900 mb-2 rounded overflow-hidden">
          <img src="${prod.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=300'}" class="max-h-full max-w-full object-contain">
        </div>
        <div class="text-xs font-bold line-clamp-2">${prod.name}</div>
        <div class="text-gold text-xs font-black mt-1">GH₵ ${prod.price.toLocaleString()}</div>
      </div>
    `;
  }).join("");
  
  container.innerHTML = html;
}

function clearBrowsingHistory() {
  if (!confirm("Clear all browsing history?")) return;
  localStorage.removeItem("valmont_recently_viewed");
  browsingHistory = [];
  document.getElementById("browsingHistoryGrid").innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-sm">History cleared.</div>`;
}

// === WISHLIST ===
function loadWishlist() {
  userWishlist = JSON.parse(localStorage.getItem("valmont_wishlist") || "[]");
  
  const container = document.getElementById("wishlistAccountGrid");
  if (!container) return;
  
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
  const saved = products.filter(p => userWishlist.includes(p.id));
  
  if (saved.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-sm">No saved items yet.</div>`;
    return;
  }
  
  container.innerHTML = saved.map(p => `
    <div class="bg-navy-deep border border-slate-700 p-3 rounded-xl relative">
      <div class="h-24 mb-3 flex items-center justify-center bg-slate-900 rounded overflow-hidden">
        <img src="${p.image_url}" class="max-h-full max-w-full object-contain">
      </div>
      <div class="font-bold text-xs line-clamp-2">${p.name}</div>
      <div class="text-gold text-xs font-black mt-1">GH₵ ${p.price.toLocaleString()}</div>
      
      <div class="flex gap-2 mt-3">
        <button onclick="moveWishlistToCart('${p.id}', this)" class="flex-1 bg-gold hover:bg-gold/90 text-navy-deep text-xs font-black py-1.5 rounded">MOVE TO CART</button>
        <button onclick="removeFromWishlist('${p.id}', this)" class="px-3 text-xs text-red-400">×</button>
      </div>
    </div>
  `).join("");
}

function moveWishlistToCart(productId, btn) {
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  
  let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
  
  const existing = cart.findIndex(c => c.id === productId);
  if (existing !== -1) {
    cart[existing].qty++;
  } else {
    cart.push({
      id: prod.id, name: prod.name, price: prod.price, image_url: prod.image_url,
      qty: 1, selected_color: "", selected_storage: "", price_adjustment: 0
    });
  }
  
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  
  // remove from wishlist
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem("valmont_wishlist", JSON.stringify(userWishlist));
  
  btn.closest(".bg-navy-deep").remove();
  showToast("Moved to cart.");
}

function removeFromWishlist(productId, btn) {
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem("valmont_wishlist", JSON.stringify(userWishlist));
  btn.closest(".bg-navy-deep").remove();
  showToast("Removed from wishlist.");
}

// === UTILS ===
function showToast(msg) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function logoutCustomer() {
  if (confirm("Sign out of your account?")) {
    localStorage.removeItem("valmont_user");
    window.location.href = "/index.html";
  }
}

// Expose functions for external calls (optional)
window.ValmontAccount = { showAddAddressModal, viewOrderDetails };