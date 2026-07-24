// Valmont Gadgets — Account Page JS
// Full authentication, profile, orders, addresses, wishlist, history, settings

let currentUser = null;
let customerAddresses = [];
let customerOrders = [];
let browsingHistory = [];
let userWishlist = [];
let editingProfile = false;
let allProducts = [];

window.addEventListener('DOMContentLoaded', initAccount);

function initAccount() {
  currentUser = JSON.parse(localStorage.getItem('valmont_user') || 'null');
  allProducts = JSON.parse(localStorage.getItem('valmont_products') || '[]');
  // Also try from inline PRODUCTS if available
  if (allProducts.length === 0 && typeof PRODUCTS !== 'undefined') {
    allProducts = PRODUCTS;
  }

  if (!currentUser) {
    showAuthScreen();
  } else {
    showAccountScreen();
  }
}

// ===== AUTH SCREEN =====
function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('accountScreen').classList.add('hidden');
}

function showAccountScreen() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('accountScreen').classList.remove('hidden');
  loadAllSections();
}

function switchAuthTab(tab) {
  document.getElementById('tabSignIn').classList.toggle('active', tab === 'signin');
  document.getElementById('tabSignUp').classList.toggle('active', tab === 'signup');
  document.getElementById('formSignIn').classList.toggle('hidden', tab !== 'signin');
  document.getElementById('formSignUp').classList.toggle('hidden', tab !== 'signup');
}

function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signInEmail').value.trim();
  const password = document.getElementById('signInPassword').value.trim();
  if (!email || !password) { showToast('Please enter email and password'); return; }

  // Check localStorage for existing users
  const users = JSON.parse(localStorage.getItem('valmont_registered_users') || '[]');
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (found && found.password === password) {
    currentUser = { name: found.name, email: found.email, phone: found.phone || '' };
  } else {
    // Auto-create profile for any email
    const baseName = email.split('@')[0];
    const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[._]/g, ' ');
    currentUser = { name: formattedName, email: email, phone: '' };
    
    // Register if not found
    if (!found) {
      users.push({ name: formattedName, email: email, password: password, phone: '' });
      localStorage.setItem('valmont_registered_users', JSON.stringify(users));
    }
  }

  localStorage.setItem('valmont_user', JSON.stringify(currentUser));
  showAccountScreen();
  showToast('Welcome back, ' + currentUser.name.split(' ')[0] + '!');
}

function handleSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('signUpName').value.trim();
  const email = document.getElementById('signUpEmail').value.trim();
  const phone = document.getElementById('signUpPhone').value.trim();
  const password = document.getElementById('signUpPassword').value.trim();

  if (!name || !email || !phone || !password) { showToast('Please fill all fields'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters'); return; }

  const users = JSON.parse(localStorage.getItem('valmont_registered_users') || '[]');
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    showToast('This email is already registered. Please sign in.');
    switchAuthTab('signin');
    return;
  }

  users.push({ name, email, password, phone });
  localStorage.setItem('valmont_registered_users', JSON.stringify(users));

  currentUser = { name, email, phone };
  localStorage.setItem('valmont_user', JSON.stringify(currentUser));
  showAccountScreen();
  showToast('Account created! Welcome, ' + name + '!');
}

function handlePasswordReset() {
  const email = prompt('Enter your email address to receive a password reset link:');
  if (!email) return;
  if (!email.includes('@')) { showToast('Please enter a valid email'); return; }
  showToast('If an account exists for ' + email + ', a reset link has been sent.');
}

function handleGoogleSignIn() {
  currentUser = {
    name: 'Daniel Kofi',
    email: 'daniel.kofi@gmail.com',
    phone: '054 245 1578'
  };
  localStorage.setItem('valmont_user', JSON.stringify(currentUser));
  showAccountScreen();
  showToast('Signed in with Google! Welcome, Daniel!');
}

function handleLogout() {
  if (confirm('Sign out of your account?')) {
    localStorage.removeItem('valmont_user');
    currentUser = null;
    showAuthScreen();
  }
}

// ===== LOAD ALL SECTIONS =====
function loadAllSections() {
  loadProfile();
  loadAddresses();
  loadOrders();
  loadWishlist();
  loadHistory();
  loadSettings();
}

// ===== PROFILE =====
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('displayName').textContent = currentUser.name || '--';
  document.getElementById('displayEmail').textContent = currentUser.email || '--';
  document.getElementById('displayPhone').textContent = currentUser.phone || '--';
  document.getElementById('editName').value = currentUser.name || '';
  document.getElementById('editEmail').value = currentUser.email || '';
  document.getElementById('editPhone').value = currentUser.phone || '';
}

function toggleProfileEdit() {
  editingProfile = !editingProfile;
  document.getElementById('profileView').classList.toggle('hidden', editingProfile);
  document.getElementById('profileForm').classList.toggle('hidden', !editingProfile);
}

function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  if (!name || !email) { showToast('Name and email are required'); return; }
  currentUser.name = name;
  currentUser.email = email;
  currentUser.phone = phone;
  localStorage.setItem('valmont_user', JSON.stringify(currentUser));
  loadProfile();
  toggleProfileEdit();
  showToast('Profile updated!');
}

// ===== ADDRESSES =====
function loadAddresses() {
  customerAddresses = JSON.parse(localStorage.getItem('valmont_customer_addresses') || '[]');
  renderAddresses();
}

function renderAddresses() {
  const container = document.getElementById('addressesList');
  if (!container) return;
  if (customerAddresses.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">No addresses saved yet.</div>';
    return;
  }
  container.innerHTML = customerAddresses.map(addr => `
    <div class="address-card ${addr.is_default ? 'default' : ''}">
      <div class="addr-info">
        <h4>${addr.name} ${addr.is_default ? '<span class="default-badge">Default</span>' : ''}</h4>
        <p><strong>${addr.recipient}</strong> · ${addr.phone}</p>
        <p>${addr.zone} — ${addr.street}</p>
        ${addr.landmark ? '<p style="font-size:11px;color:#94a3b8;">Landmark: ' + addr.landmark + '</p>' : ''}
      </div>
      <div class="addr-actions">
        <button class="addr-action-btn edit" onclick="editAddress('${addr.id}')">Edit</button>
        <button class="addr-action-btn delete" onclick="deleteAddress('${addr.id}')">Del</button>
        ${!addr.is_default ? `<button class="addr-action-btn set-default" onclick="setDefaultAddress('${addr.id}')">Default</button>` : ''}
      </div>
    </div>
  `).join('');
}

function openAddressForm(editId) {
  const overlay = document.getElementById('addressFormOverlay');
  const title = document.getElementById('addressFormTitle');
  const form = document.getElementById('addressFormElem');
  form.reset();
  document.getElementById('addrFormId').value = '';

  if (editId) {
    title.textContent = 'Edit Address';
    const addr = customerAddresses.find(a => a.id === editId);
    if (addr) {
      document.getElementById('addrFormId').value = addr.id;
      document.getElementById('addrLabel').value = addr.name || '';
      document.getElementById('addrRecipient').value = addr.recipient || '';
      document.getElementById('addrPhone').value = addr.phone || '';
      document.getElementById('addrZone').value = addr.zone || 'Accra Central';
      document.getElementById('addrStreet').value = addr.street || '';
      document.getElementById('addrLandmark').value = addr.landmark || '';
      document.getElementById('addrIsDefault').checked = !!addr.is_default;
    }
  } else {
    title.textContent = 'Add New Address';
    if (currentUser) {
      document.getElementById('addrRecipient').value = currentUser.name || '';
      document.getElementById('addrPhone').value = currentUser.phone || '';
    }
  }
  overlay.classList.add('open');
}

function closeAddressForm() {
  document.getElementById('addressFormOverlay').classList.remove('open');
}

function saveAddress(e) {
  e.preventDefault();
  const idField = document.getElementById('addrFormId');
  const isEdit = !!idField.value;
  const id = idField.value || crypto.randomUUID();

  const addr = {
    id,
    name: document.getElementById('addrLabel').value.trim(),
    recipient: document.getElementById('addrRecipient').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    zone: document.getElementById('addrZone').value,
    street: document.getElementById('addrStreet').value.trim(),
    landmark: document.getElementById('addrLandmark').value.trim(),
    is_default: document.getElementById('addrIsDefault').checked || false,
    created_at: new Date().toISOString()
  };

  if (!isEdit) {
    if (addr.is_default) customerAddresses.forEach(a => a.is_default = false);
    else if (customerAddresses.length === 0) addr.is_default = true;
    customerAddresses.unshift(addr);
  } else {
    const idx = customerAddresses.findIndex(a => a.id === id);
    if (idx !== -1) {
      if (addr.is_default) customerAddresses.forEach(a => a.is_default = false);
      customerAddresses[idx] = { ...customerAddresses[idx], ...addr };
    }
  }
  localStorage.setItem('valmont_customer_addresses', JSON.stringify(customerAddresses));
  closeAddressForm();
  renderAddresses();
  showToast('Address saved!');
}

function editAddress(id) { openAddressForm(id); }

function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  customerAddresses = customerAddresses.filter(a => a.id !== id);
  localStorage.setItem('valmont_customer_addresses', JSON.stringify(customerAddresses));
  renderAddresses();
  showToast('Address deleted');
}

function setDefaultAddress(id) {
  customerAddresses.forEach(a => a.is_default = a.id === id);
  localStorage.setItem('valmont_customer_addresses', JSON.stringify(customerAddresses));
  renderAddresses();
  showToast('Default address updated');
}

// ===== ORDERS =====
function loadOrders() {
  const allOrders = JSON.parse(localStorage.getItem('valmont_orders') || '[]');
  customerOrders = allOrders.filter(o => {
    if (!currentUser) return false;
    return (o.customer_phone && currentUser.phone && o.customer_phone.includes(currentUser.phone.slice(-8))) ||
           (o.customer_name && currentUser.name && o.customer_name.toLowerCase() === currentUser.name.toLowerCase());
  });
  renderOrders();
}

function renderOrders() {
  const container = document.getElementById('orderHistoryList');
  if (!container) return;
  if (customerOrders.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">No orders yet. Start shopping!</div>';
    return;
  }
  container.innerHTML = customerOrders.map(order => {
    const date = new Date(order.created_at || Date.now()).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });
    const itemCount = (order.items || []).length || 1;
    const itemName = order.items?.[0]?.name || order.item || 'Product';
    const statusClass = getStatusClass(order.status);
    return `
      <div class="order-card" onclick="viewOrderDetail('${order.id || order.reference_code}')">
        <div class="order-card-top">
          <div>
            <div class="order-card-ref">#${order.reference_code || order.id}</div>
            <div class="order-card-date">${date}</div>
          </div>
          <span class="order-status ${statusClass}">${order.status || 'Pending'}</span>
        </div>
        <div class="order-card-mid">
          <span class="order-card-items">${itemCount} item${itemCount > 1 ? 's' : ''} — ${itemName.substring(0, 30)}</span>
          <span class="order-card-total">GH₵ ${parseFloat(order.total_amount || 0).toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('deliv')) return 'delivered';
  if (s.includes('disp')) return 'dispatched';
  if (s.includes('conf') || s.includes('proc')) return 'confirmed';
  if (s.includes('cancel')) return 'cancelled';
  return 'pending';
}

function viewOrderDetail(orderId) {
  const order = customerOrders.find(o => o.id === orderId || o.reference_code === orderId);
  if (!order) return;

  document.getElementById('orderDetailRef').textContent = 'Order #' + (order.reference_code || order.id);
  const items = order.items || [];
  const subtotal = items.reduce((sum, i) => sum + ((i.price || i.unit_price || 0) * (i.qty || i.quantity || 1)), 0);
  const delivery = (order.total_amount || 0) >= 5000 ? 0 : 150;
  const total = parseFloat(order.total_amount || subtotal + delivery);

  const content = document.getElementById('orderDetailContent');
  content.innerHTML = `
    <div style="margin-bottom:16px;">
      <h4 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin:0 0 8px 0;">Customer & Delivery</h4>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Name</span><br><strong>${order.customer_name || '—'}</strong></div>
        <div><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Phone</span><br><strong>${order.customer_phone || '—'}</strong></div>
        <div style="grid-column:1/-1;"><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Address</span><br><strong>${order.customer_area || ''} — ${order.customer_street || '—'}</strong></div>
        <div style="grid-column:1/-1;"><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Payment</span><br><strong>${order.payment_method || 'Mobile Money'}</strong></div>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <h4 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin:0 0 8px 0;">Items Ordered</h4>
      ${items.length === 0 ? '<p style="font-size:13px;color:var(--text-secondary);">No items listed.</p>' : items.map(item => `
        <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="width:48px;height:48px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${item.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=100'}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="">
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">${item.name || item.product_name || 'Product'}</div>
            ${item.selected_color || item.selected_storage ? `<div style="font-size:10px;color:var(--text-secondary);">${[item.selected_color, item.selected_storage].filter(Boolean).join(' / ')}</div>` : ''}
            <div style="font-size:11px;color:var(--text-secondary);">Qty: ${item.qty || item.quantity || 1} × GH₵ ${(item.price || item.unit_price || 0).toLocaleString()}</div>
          </div>
          <div style="font-size:13px;font-weight:800;color:var(--accent);">GH₵ ${((item.price || item.unit_price || 0) * (item.qty || item.quantity || 1)).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>

    <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px;"><span>Subtotal</span><span>GH₵ ${subtotal.toLocaleString()}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px;"><span>Delivery</span><span>${delivery === 0 ? 'FREE' : 'GH₵ ' + delivery}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;"><span>Total</span><span style="color:var(--accent);">GH₵ ${total.toLocaleString()}</span></div>
    </div>

    <div style="margin-top:16px;">
      <h4 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin:0 0 8px 0;">Status Timeline</h4>
      <div style="display:flex;align-items:center;gap:0;">
        ${renderTimeline(order.status)}
      </div>
    </div>

    <button onclick="reorderItems('${orderId}')" style="width:100%;margin-top:16px;background:#0b1a38;color:white;border:none;padding:14px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Reorder Items</button>
  `;

  document.getElementById('orderDetailOverlay').classList.add('open');
}

function renderTimeline(status) {
  const s = (status || 'Pending').toLowerCase();
  const steps = [
    { label: 'Placed', done: true },
    { label: 'Confirmed', done: ['confirmed', 'processing', 'dispatched', 'delivered'].some(x => s.includes(x)) },
    { label: 'Dispatched', done: ['dispatched', 'delivered'].some(x => s.includes(x)) },
    { label: 'Delivered', done: s.includes('deliv') }
  ];
  return steps.map((step, i) => `
    <div style="flex:1;text-align:center;position:relative;">
      <div style="width:12px;height:12px;border-radius:50%;background:${step.done ? 'var(--accent)' : '#e2e8f0'};margin:0 auto 4px;"></div>
      <div style="font-size:9px;font-weight:700;color:${step.done ? 'var(--text-primary)' : 'var(--text-secondary)'};">${step.label}</div>
      ${i < steps.length - 1 ? `<div style="position:absolute;top:5px;left:60%;width:80%;height:2px;background:${step.done ? 'var(--accent)' : '#e2e8f0'};"></div>` : ''}
    </div>
  `).join('');
}

function closeOrderDetail() {
  document.getElementById('orderDetailOverlay').classList.remove('open');
}

function reorderItems(orderId) {
  const order = customerOrders.find(o => o.id === orderId || o.reference_code === orderId);
  if (!order || !order.items) { showToast('Unable to reorder'); return; }

  let cart = JSON.parse(localStorage.getItem('valmont_cart') || '[]');
  order.items.forEach(item => {
    const existing = cart.findIndex(c => c.id === item.id && c.selected_color === (item.selected_color || '') && c.selected_storage === (item.selected_storage || ''));
    if (existing !== -1) {
      cart[existing].qty += (item.qty || item.quantity || 1);
    } else {
      cart.push({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        price: item.price || item.unit_price || 0,
        image_url: item.image_url || item.product_image || '',
        qty: item.qty || item.quantity || 1,
        selected_color: item.selected_color || '',
        selected_storage: item.selected_storage || '',
        price_adjustment: 0
      });
    }
  });
  localStorage.setItem('valmont_cart', JSON.stringify(cart));
  closeOrderDetail();
  showToast('Items added to cart!');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

// ===== WISHLIST =====
function loadWishlist() {
  userWishlist = JSON.parse(localStorage.getItem('valmont_wishlist') || '[]');
  renderWishlist();
}

function renderWishlist() {
  const container = document.getElementById('wishlistGrid');
  if (!container) return;

  const saved = allProducts.filter(p => userWishlist.includes(p.id));
  if (saved.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">No saved items yet. ❤️ products while shopping!</div>';
    return;
  }

  container.innerHTML = saved.map(p => {
    const img = p.image || p.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400';
    return `
      <div class="wishlist-item">
        <div class="wishlist-item-img">
          <img src="${img}" alt="${p.name}" loading="lazy">
        </div>
        <div class="wishlist-item-body">
          <h4>${p.name}</h4>
          <div class="price">GH₵ ${(p.retail || p.price || 0).toLocaleString()}</div>
        </div>
        <div class="wishlist-item-actions">
          <button class="wl-move-btn" onclick="moveToCart('${p.id}')">Move to Cart</button>
          <button class="wl-remove-btn" onclick="removeFromWishlist('${p.id}')">×</button>
        </div>
      </div>
    `;
  }).join('');
}

function moveToCart(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;
  let cart = JSON.parse(localStorage.getItem('valmont_cart') || '[]');
  const existing = cart.findIndex(c => c.id === productId);
  if (existing !== -1) {
    cart[existing].qty++;
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.retail || prod.price || 0,
      image_url: prod.image || prod.image_url || '',
      qty: 1,
      selected_color: '',
      selected_storage: '',
      price_adjustment: 0
    });
  }
  localStorage.setItem('valmont_cart', JSON.stringify(cart));
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem('valmont_wishlist', JSON.stringify(userWishlist));
  renderWishlist();
  showToast('Moved to cart!');
}

function removeFromWishlist(productId) {
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem('valmont_wishlist', JSON.stringify(userWishlist));
  renderWishlist();
  showToast('Removed from wishlist');
}

// ===== BROWSING HISTORY =====
function loadHistory() {
  browsingHistory = JSON.parse(localStorage.getItem('valmont_recently_viewed') || '[]');
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyScroll');
  if (!container) return;
  if (browsingHistory.length === 0) {
    container.innerHTML = '<div style="padding:24px;color:var(--text-secondary);font-size:13px;">No browsing history yet.</div>';
    return;
  }
  const items = browsingHistory.slice(0, 20).map(id => allProducts.find(p => p.id === id)).filter(p => !!p);
  if (items.length === 0) {
    container.innerHTML = '<div style="padding:24px;color:var(--text-secondary);font-size:13px;">No products in history.</div>';
    return;
  }
  container.innerHTML = items.map(p => {
    const img = p.image || p.image_url || 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400';
    return `
      <div class="history-item" onclick="window.location.href='index.html'">
        <div class="history-item-img">
          <img src="${img}" alt="${p.name}" loading="lazy">
        </div>
        <div class="history-item-body">
          <h4>${p.name}</h4>
          <div class="price">GH₵ ${(p.retail || p.price || 0).toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (!confirm('Clear all browsing history?')) return;
  localStorage.removeItem('valmont_recently_viewed');
  browsingHistory = [];
  renderHistory();
  showToast('History cleared');
}

// ===== SETTINGS =====
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('valmont_settings') || '{"notifications":true,"email":true,"dark":false}');
  updateToggle('toggleNotif', settings.notifications !== false);
  updateToggle('toggleEmail', settings.email !== false);
  updateToggle('toggleDark', settings.dark === true);
}

function toggleSetting(key) {
  const settings = JSON.parse(localStorage.getItem('valmont_settings') || '{"notifications":true,"email":true,"dark":false}');
  settings[key] = !settings[key];
  localStorage.setItem('valmont_settings', JSON.stringify(settings));
  const elId = key === 'notifications' ? 'toggleNotif' : key === 'email' ? 'toggleEmail' : 'toggleDark';
  updateToggle(elId, settings[key]);
  showToast(key.charAt(0).toUpperCase() + key.slice(1) + ': ' + (settings[key] ? 'ON' : 'OFF'));
}

function updateToggle(elId, isOn) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (isOn) el.classList.add('on');
  else el.classList.remove('on');
}

function changePassword(e) {
  e.preventDefault();
  const newPass = document.getElementById('newPassword').value.trim();
  if (!newPass || newPass.length < 6) { showToast('Password must be at least 6 characters'); return; }

  // Update in registered users
  const users = JSON.parse(localStorage.getItem('valmont_registered_users') || '[]');
  const idx = users.findIndex(u => u.email === currentUser.email);
  if (idx !== -1) {
    users[idx].password = newPass;
    localStorage.setItem('valmont_registered_users', JSON.stringify(users));
  }
  document.getElementById('newPassword').value = '';
  showToast('Password changed successfully!');
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
