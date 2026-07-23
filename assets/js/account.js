// Valmont Gadgets - Customer Account JS - White Template + Payments
const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";

let currentUser = null;
let customerAddresses = [];
let customerOrders = [];
let browsingHistory = [];
let userWishlist = [];
let savedPaymentMethods = [];

let supabaseClient = null;
try {
  if (typeof supabase !== "undefined") supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {}

window.addEventListener("DOMContentLoaded", () => { initCustomerAccount(); });

function initCustomerAccount() {
  currentUser = JSON.parse(localStorage.getItem("valmont_user") || "null");
  if (!currentUser) { window.location.href = "/index.html"; return; }
  populateProfileForm();
  loadCustomerAddresses();
  loadPaymentMethods();
  loadCustomerOrders();
  loadBrowsingHistory();
  loadWishlist();
  const welcome = document.getElementById("welcomeText");
  if (welcome) welcome.innerHTML = `Welcome back, <span class="font-black text-[#0b1a38]">${currentUser.name.split(" ")[0]}</span> — manage your addresses and payments`;
}

function populateProfileForm() {
  if (!currentUser) return;
  const n = document.getElementById("profileName"); if(n) n.value = currentUser.name || "";
  const p = document.getElementById("profilePhone"); if(p) p.value = currentUser.phone || "";
  const e = document.getElementById("profileEmail"); if(e) e.value = currentUser.email || "";
}

async function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById("profileName")?.value.trim();
  const phone = document.getElementById("profilePhone")?.value.trim();
  const email = document.getElementById("profileEmail")?.value.trim();
  if (!name || !phone || !email) { showToast("Please fill all fields"); return; }
  currentUser.name = name; currentUser.phone = phone; currentUser.email = email;
  localStorage.setItem("valmont_user", JSON.stringify(currentUser));
  showToast("Profile updated successfully!");
}

async function changePassword(e) {
  e.preventDefault();
  const current = document.getElementById("currentPass")?.value;
  const newPass = document.getElementById("newPass")?.value;
  if (!current || !newPass) { showToast("Enter both passwords"); return; }
  showToast("Password changed successfully!");
  const c = document.getElementById("currentPass"); if(c) c.value = "";
  const n = document.getElementById("newPass"); if(n) n.value = "";
}

// === ADDRESSES ===
function loadCustomerAddresses() {
  customerAddresses = JSON.parse(localStorage.getItem("valmont_customer_addresses") || "[]");
  renderAddresses();
}
function renderAddresses() {
  const container = document.getElementById("addressesList"); if (!container) return;
  if (customerAddresses.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-500 text-sm">No saved addresses. Add one to auto-fill checkout.</div>`;
    return;
  }
  container.innerHTML = customerAddresses.map(addr => `
    <div class="bg-white border ${addr.is_default ? 'border-[#0b1a38] shadow-md' : 'border-gray-200'} p-5 rounded-2xl relative">
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2"><span class="font-black text-sm text-[#0b1a38]">${addr.name}</span>${addr.is_default ? `<span class="text-[9px] px-2 py-0.5 bg-[#0b1a38] text-white font-black rounded-full">DEFAULT</span>` : ""}</div>
          <div class="text-xs mt-1 font-semibold text-gray-700">${addr.recipient || addr.name}</div>
          <div class="text-xs text-gray-500">${addr.phone}</div>
        </div>
        <div class="flex gap-1"><button onclick="editAddress('${addr.id}')" class="text-[11px] px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white text-[#0b1a38] font-bold">EDIT</button><button onclick="deleteAddress('${addr.id}')" class="text-[11px] px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 text-red-600 font-bold">DEL</button></div>
      </div>
      <div class="mt-3 pt-3 border-t border-gray-100 text-xs leading-tight"><div class="font-bold text-[#0b1a38]">${addr.zone}</div><div class="text-gray-500 mt-1">${addr.street}</div>${addr.landmark ? `<div class="text-[10px] text-gray-400 mt-1">Landmark: ${addr.landmark}</div>` : ""}</div>
      ${!addr.is_default ? `<button onclick="setDefaultAddress('${addr.id}')" class="mt-4 text-[11px] font-black text-[#f58c14] uppercase tracking-wider hover:underline">Set as Default</button>` : ""}
    </div>
  `).join("");
}
function showAddAddressModal(editId = null) {
  const modal = document.getElementById("addressModal"); const title = document.getElementById("addressModalTitle");
  const form = document.getElementById("addressForm"); if(!modal||!form) return;
  form.reset(); const idField = document.getElementById("addressId"); if(idField) idField.value = "";
  if (editId) {
    if(title) title.textContent = "Edit Address";
    const addr = customerAddresses.find(a => a.id === editId);
    if (addr) {
      if(idField) idField.value = addr.id;
      const map = { addrName: addr.name, addrRecipient: addr.recipient, addrPhone: addr.phone, addrZone: addr.zone, addrStreet: addr.street, addrLandmark: addr.landmark };
      Object.entries(map).forEach(([k,v])=>{ const el=document.getElementById(k); if(el) el.value=v||""; });
      const def = document.getElementById("addrDefault"); if(def) def.checked = !!addr.is_default;
    }
  } else {
    if(title) title.textContent = "Add New Address";
    if (currentUser) {
      const rec = document.getElementById("addrRecipient"); if(rec) rec.value = currentUser.name || "";
      const ph = document.getElementById("addrPhone"); if(ph) ph.value = currentUser.phone || "";
    }
  }
  modal.classList.remove("hidden"); modal.classList.add("flex");
}
function closeAddressModal() {
  const modal = document.getElementById("addressModal"); if(!modal) return; modal.classList.add("hidden"); modal.classList.remove("flex");
}
async function saveAddress(e) {
  e.preventDefault();
  const idField = document.getElementById("addressId");
  const id = (idField?.value) || crypto.randomUUID();
  const isEdit = !!idField?.value;
  const newAddr = {
    id: id,
    name: document.getElementById("addrName")?.value.trim(),
    recipient: document.getElementById("addrRecipient")?.value.trim(),
    phone: document.getElementById("addrPhone")?.value.trim(),
    zone: document.getElementById("addrZone")?.value,
    street: document.getElementById("addrStreet")?.value.trim(),
    landmark: document.getElementById("addrLandmark")?.value.trim(),
    is_default: document.getElementById("addrDefault")?.checked || false,
    created_at: new Date().toISOString()
  };
  if (!isEdit) {
    if (newAddr.is_default) customerAddresses.forEach(a => a.is_default = false);
    else if (customerAddresses.length === 0) newAddr.is_default = true;
    customerAddresses.unshift(newAddr);
  } else {
    const idx = customerAddresses.findIndex(a => a.id === id);
    if (idx !== -1) {
      if (newAddr.is_default) customerAddresses.forEach(a => a.is_default = false);
      customerAddresses[idx] = { ...customerAddresses[idx], ...newAddr };
    }
  }
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  closeAddressModal(); renderAddresses(); showToast("Address saved.");
}
function editAddress(id) { showAddAddressModal(id); }
function deleteAddress(id) {
  if (!confirm("Delete this address?")) return;
  customerAddresses = customerAddresses.filter(a => a.id !== id);
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  renderAddresses(); showToast("Address deleted.");
}
function setDefaultAddress(id) {
  customerAddresses.forEach(a => a.is_default = a.id === id);
  localStorage.setItem("valmont_customer_addresses", JSON.stringify(customerAddresses));
  renderAddresses(); showToast("Default address updated.");
}

// === PAYMENT METHODS ===
function loadPaymentMethods() {
  savedPaymentMethods = JSON.parse(localStorage.getItem("valmont_saved_payment_methods") || "[]");
  renderPaymentMethods();
}
function renderPaymentMethods() {
  const container = document.getElementById("paymentsList"); if(!container) return;
  if (savedPaymentMethods.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-500 text-sm">No saved payment methods. Add MoMo or card for faster checkout.</div>`;
    return;
  }
  container.innerHTML = savedPaymentMethods.map(pm => {
    const icon = pm.type === 'momo' ? '📱' : pm.type === 'card' ? '💳' : '💵';
    const providerColor = pm.type === 'momo' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : pm.type === 'card' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700';
    return `<div class="bg-white border ${pm.is_default ? 'border-[#0b1a38] shadow-md' : 'border-gray-200'} p-5 rounded-2xl relative">
      <div class="flex justify-between items-start">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl ${providerColor} border flex items-center justify-center text-lg">${icon}</div>
          <div>
            <div class="flex items-center gap-2"><span class="font-black text-sm text-[#0b1a38]">${pm.label}</span>${pm.is_default ? `<span class="text-[9px] px-2 py-0.5 bg-[#0b1a38] text-white font-black rounded-full">DEFAULT</span>` : ""}<span class="text-[9px] px-2 py-0.5 ${providerColor} border rounded-full font-black uppercase">${pm.type}</span></div>
            <div class="text-xs mt-1 text-gray-600 font-semibold">${pm.provider || ''} ${pm.last4 ? '• ****' + pm.last4 : ''}</div>
          </div>
        </div>
        <div class="flex gap-1"><button onclick="editPaymentMethod('${pm.id}')" class="text-[11px] px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white text-[#0b1a38] font-bold">EDIT</button><button onclick="deletePaymentMethod('${pm.id}')" class="text-[11px] px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 text-red-600 font-bold">DEL</button></div>
      </div>
      ${!pm.is_default ? `<button onclick="setDefaultPayment('${pm.id}')" class="mt-4 text-[11px] font-black text-[#f58c14] uppercase tracking-wider hover:underline">Set as Default</button>` : ""}
    </div>`;
  }).join("");
}
function showAddPaymentModal(editId=null) {
  const modal = document.getElementById("paymentModal"); const form = document.getElementById("paymentForm"); const title = document.getElementById("paymentModalTitle");
  if(!modal||!form) return; form.reset(); const idField = document.getElementById("paymentId"); if(idField) idField.value="";
  if(editId){
    if(title) title.textContent="Edit Payment Method";
    const pm = savedPaymentMethods.find(x=>x.id===editId); if(pm){
      if(idField) idField.value=pm.id;
      const t = document.getElementById("payType"); if(t) t.value=pm.type;
      const l = document.getElementById("payLabel"); if(l) l.value=pm.label;
      const prov = document.getElementById("payProvider"); if(prov) prov.value=pm.provider||"";
      const last4 = document.getElementById("payLast4"); if(last4) last4.value=pm.last4||"";
      const def = document.getElementById("payDefault"); if(def) def.checked=!!pm.is_default;
    }
  } else { if(title) title.textContent="Add Payment Method"; }
  modal.classList.remove("hidden"); modal.classList.add("flex");
}
function closePaymentModal(){ const modal=document.getElementById("paymentModal"); if(!modal) return; modal.classList.add("hidden"); modal.classList.remove("flex"); }
function savePaymentMethod(e){
  e.preventDefault();
  const idField=document.getElementById("paymentId"); const id=idField?.value || crypto.randomUUID(); const isEdit=!!idField?.value;
  const pm = {
    id,
    type: document.getElementById("payType")?.value || "momo",
    label: document.getElementById("payLabel")?.value.trim() || "My MoMo",
    provider: document.getElementById("payProvider")?.value.trim() || "",
    last4: document.getElementById("payLast4")?.value.trim() || "",
    is_default: document.getElementById("payDefault")?.checked || false,
    created_at: new Date().toISOString()
  };
  if(!isEdit){
    if(pm.is_default) savedPaymentMethods.forEach(x=>x.is_default=false);
    else if(savedPaymentMethods.length===0) pm.is_default=true;
    savedPaymentMethods.unshift(pm);
  } else {
    const idx=savedPaymentMethods.findIndex(x=>x.id===id);
    if(idx!==-1){ if(pm.is_default) savedPaymentMethods.forEach(x=>x.is_default=false); savedPaymentMethods[idx]={...savedPaymentMethods[idx],...pm}; }
  }
  localStorage.setItem("valmont_saved_payment_methods", JSON.stringify(savedPaymentMethods));
  closePaymentModal(); renderPaymentMethods(); showToast("Payment method saved.");
}
function editPaymentMethod(id){ showAddPaymentModal(id); }
function deletePaymentMethod(id){
  if(!confirm("Delete this payment method?")) return;
  savedPaymentMethods=savedPaymentMethods.filter(x=>x.id!==id);
  localStorage.setItem("valmont_saved_payment_methods", JSON.stringify(savedPaymentMethods));
  renderPaymentMethods(); showToast("Payment method deleted.");
}
function setDefaultPayment(id){
  savedPaymentMethods.forEach(x=>x.is_default=x.id===id);
  localStorage.setItem("valmont_saved_payment_methods", JSON.stringify(savedPaymentMethods));
  renderPaymentMethods(); showToast("Default payment updated.");
}

// === ORDERS ===
function loadCustomerOrders() {
  const allOrders = JSON.parse(localStorage.getItem("valmont_orders") || "[]");
  customerOrders = allOrders.filter(o => (currentUser && (o.customer_phone === currentUser.phone || o.customer_name === currentUser.name)) || (o.customer_phone && currentUser && o.customer_phone.includes(currentUser.phone.slice(-8))));
  renderOrderHistory();
}
function renderOrderHistory() {
  const container = document.getElementById("orderHistoryList"); if (!container) return;
  if (customerOrders.length === 0) { container.innerHTML = `<div class="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-500">You have no orders yet. Start shopping to see them here.</div>`; return; }
  container.innerHTML = customerOrders.map(order => {
    const date = new Date(order.created_at || Date.now()).toLocaleDateString("en-GH", {month:"short", day:"numeric", year:"numeric"});
    const itemCount = (order.items || []).length;
    return `<div onclick="viewOrderDetails('${order.id || order.reference_code}')" class="border border-gray-200 hover:border-[#0b1a38] hover:shadow-sm transition cursor-pointer bg-white p-5 rounded-2xl flex justify-between items-center"><div><div class="font-black text-sm text-[#0b1a38]">#${order.reference_code}</div><div class="text-xs text-gray-500">${date}</div></div><div class="text-right"><div class="font-black text-xs">${itemCount} item${itemCount > 1 ? "s" : ""}</div><div class="text-xs text-[#f58c14] font-black">GH₵ ${parseFloat(order.total_amount || 0).toLocaleString()}</div><div class="inline-block mt-1 px-3 py-0.5 text-[10px] font-black rounded-full ${getStatusBadgeClass(order.status)}">${order.status || "Pending"}</div></div></div>`;
  }).join("");
}
function getStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("deliv")) return "bg-green-50 text-green-700 border border-green-200";
  if (s.includes("disp")) return "bg-purple-50 text-purple-700 border border-purple-200";
  if (s.includes("conf") || s.includes("proc")) return "bg-blue-50 text-blue-700 border border-blue-200";
  return "bg-yellow-50 text-yellow-700 border border-yellow-200";
}
function viewOrderDetails(orderId) {
  const order = customerOrders.find(o => o.id === orderId || o.reference_code === orderId); if (!order) return;
  document.getElementById("orderModalRef").textContent = `#${order.reference_code}`;
  const custInfo = document.getElementById("orderCustomerInfo");
  if(custInfo) custInfo.innerHTML = `<div><span class="text-gray-400 text-[10px] font-black uppercase tracking-widest">Name</span><br><span class="font-bold text-[#0b1a38]">${order.customer_name}</span></div><div><span class="text-gray-400 text-[10px] font-black uppercase tracking-widest">Phone</span><br><span class="font-bold text-[#0b1a38]">${order.customer_phone}</span></div><div class="md:col-span-2"><span class="text-gray-400 text-[10px] font-black uppercase tracking-widest">Delivery Address</span><br><span class="font-medium text-[#0b1a38]">${order.customer_area || ""} — ${order.customer_street || "—"}</span></div>`;
  const itemsContainer = document.getElementById("orderItemsList");
  if(itemsContainer){
    itemsContainer.innerHTML = (order.items || []).map(item => {
      const lineTotal = (item.price || 0) * (item.qty || 1); const variant = [item.selected_color, item.selected_storage].filter(Boolean).join(" / ");
      return `<div class="flex gap-4 border-b border-gray-100 pb-4 last:border-0"><div class="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-shrink-0"><img src="${item.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=300'}" class="w-full h-full object-contain"></div><div class="flex-1 text-sm"><div class="font-bold text-[#0b1a38]">${item.name}</div>${variant ? `<div class="text-xs text-gray-500">${variant}</div>` : ""}<div class="flex justify-between text-xs mt-1"><span>Qty: ${item.qty}</span><span class="font-black text-[#f58c14]">GH₵ ${lineTotal.toLocaleString()}</span></div></div></div>`;
    }).join("") || `<div class="text-xs text-gray-400">No items listed.</div>`;
  }
  const subtotal = (order.items || []).reduce((sum, i) => sum + ((i.price || 0) * (i.qty || 1)), 0); const delivery = order.total_amount > 5000 ? 0 : 150;
  const subEl = document.getElementById("orderModalSubtotal"); if(subEl) subEl.textContent = `GH₵ ${subtotal.toLocaleString()}`;
  const delEl = document.getElementById("orderModalDelivery"); if(delEl) delEl.textContent = delivery === 0 ? "FREE" : `GH₵ ${delivery}`;
  const totEl = document.getElementById("orderModalTotal"); if(totEl) totEl.textContent = `GH₵ ${parseFloat(order.total_amount || 0).toLocaleString()}`;
  renderOrderTimeline(order);
  const modal = document.getElementById("orderDetailsModal"); if(modal){ modal.classList.remove("hidden"); modal.classList.add("flex"); }
}
function renderOrderTimeline(order) {
  const container = document.getElementById("orderTimeline"); if(!container) return;
  const status = (order.status || "Pending").toLowerCase();
  const steps = [{ label: "Placed", done: true }, { label: "Stock Confirmed", done: ["confirmed", "processing", "dispatched", "delivered"].includes(status) }, { label: "Dispatched", done: ["dispatched", "delivered"].includes(status) }, { label: "Delivered", done: status.includes("delivered") }];
  container.innerHTML = steps.map((step, i) => `<div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full flex-shrink-0 ${step.done ? 'bg-[#0b1a38]' : 'bg-gray-200'}"></div><div class="text-xs flex-1 font-bold text-[#0b1a38]">${step.label}</div>${i < steps.length - 1 ? `<div class="flex-1 h-px bg-gray-200"></div>` : ""}</div>`).join("");
}
function closeOrderModal() { const modal = document.getElementById("orderDetailsModal"); if(!modal) return; modal.classList.add("hidden"); modal.classList.remove("flex"); }
function reorderFromOrder() {
  const refText = document.getElementById("orderModalRef")?.textContent.replace("#", ""); const order = customerOrders.find(o => o.reference_code === refText);
  if (!order || !order.items) { showToast("Unable to reorder."); return; }
  let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
  order.items.forEach(item => {
    const existing = cart.findIndex(c => c.id === item.id && c.selected_color === item.selected_color && c.selected_storage === item.selected_storage);
    if (existing !== -1) cart[existing].qty += item.qty || 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, image_url: item.image_url || "", qty: item.qty || 1, selected_color: item.selected_color || "", selected_storage: item.selected_storage || "", price_adjustment: 0 });
  });
  localStorage.setItem("valmont_cart", JSON.stringify(cart)); closeOrderModal(); showToast("Items added to your cart!"); setTimeout(() => window.location.href = "/index.html", 900);
}

// === BROWSING HISTORY ===
function loadBrowsingHistory() {
  browsingHistory = JSON.parse(localStorage.getItem("valmont_recently_viewed") || "[]");
  const container = document.getElementById("browsingHistoryGrid"); if (!container) return;
  if (browsingHistory.length === 0) { container.innerHTML = `<div class="col-span-full py-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-500 text-sm">No products viewed recently.</div>`; return; }
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]");
  container.innerHTML = browsingHistory.slice(0, 20).map(productId => {
    const prod = products.find(p => p.id === productId); if (!prod) return "";
    return `<div onclick="window.location.href='/index.html#store-feed'" class="bg-white border border-gray-200 hover:border-orange-200 hover:shadow-sm cursor-pointer p-3 rounded-2xl transition"><div class="h-28 flex items-center justify-center bg-gray-50 mb-2 rounded-xl overflow-hidden border border-gray-100"><img src="${prod.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=300'}" class="max-h-full max-w-full object-contain"></div><div class="text-xs font-bold line-clamp-2 text-[#0b1a38]">${prod.name}</div><div class="text-[#f58c14] text-xs font-black mt-1">GH₵ ${prod.price.toLocaleString()}</div></div>`;
  }).join("");
}
function clearBrowsingHistory() {
  if (!confirm("Clear all browsing history?")) return;
  localStorage.removeItem("valmont_recently_viewed"); browsingHistory = [];
  const grid = document.getElementById("browsingHistoryGrid"); if(grid) grid.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 text-sm">History cleared.</div>`;
}

// === WISHLIST ===
function loadWishlist() {
  userWishlist = JSON.parse(localStorage.getItem("valmont_wishlist") || "[]");
  const container = document.getElementById("wishlistAccountGrid"); if (!container) return;
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]"); const saved = products.filter(p => userWishlist.includes(p.id));
  if (saved.length === 0) { container.innerHTML = `<div class="col-span-full py-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-500 text-sm">No saved items yet.</div>`; return; }
  container.innerHTML = saved.map(p => `
    <div class="bg-white border border-gray-200 p-3 rounded-2xl relative shadow-sm">
      <div class="h-24 mb-3 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden border border-gray-100"><img src="${p.image_url}" class="max-h-full max-w-full object-contain"></div>
      <div class="font-bold text-xs line-clamp-2 text-[#0b1a38]">${p.name}</div><div class="text-[#f58c14] text-xs font-black mt-1">GH₵ ${p.price.toLocaleString()}</div>
      <div class="flex gap-2 mt-3"><button onclick="moveWishlistToCart('${p.id}', this)" class="flex-1 bg-[#0b1a38] hover:bg-black text-white text-[10px] font-black py-2 rounded-xl">MOVE TO CART</button><button onclick="removeFromWishlist('${p.id}', this)" class="px-3 text-xs text-red-500 font-bold border border-red-100 bg-red-50 rounded-xl">×</button></div>
    </div>
  `).join("");
}
function moveWishlistToCart(productId, btn) {
  const products = JSON.parse(localStorage.getItem("valmont_products") || "[]"); const prod = products.find(p => p.id === productId); if (!prod) return;
  let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
  const existing = cart.findIndex(c => c.id === productId);
  if (existing !== -1) cart[existing].qty++; else cart.push({ id: prod.id, name: prod.name, price: prod.price, image_url: prod.image_url, qty: 1, selected_color: "", selected_storage: "", price_adjustment: 0 });
  localStorage.setItem("valmont_cart", JSON.stringify(cart));
  userWishlist = userWishlist.filter(id => id !== productId); localStorage.setItem("valmont_wishlist", JSON.stringify(userWishlist));
  btn.closest(".bg-white").remove(); showToast("Moved to cart.");
}
function removeFromWishlist(productId, btn) {
  userWishlist = userWishlist.filter(id => id !== productId); localStorage.setItem("valmont_wishlist", JSON.stringify(userWishlist));
  btn.closest(".bg-white").remove(); showToast("Removed from wishlist.");
}

function showToast(msg) {
  const toast = document.getElementById("toastNotification"); if (!toast) return;
  toast.textContent = msg; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800);
}
function logoutCustomer() {
  if (confirm("Sign out of your account?")) { localStorage.removeItem("valmont_user"); window.location.href = "/index.html"; }
}
window.ValmontAccount = { showAddAddressModal, viewOrderDetails, showAddPaymentModal: showAddPaymentModal };
