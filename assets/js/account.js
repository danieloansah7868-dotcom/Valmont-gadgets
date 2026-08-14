// Valmont Gadgets — Account Page JS
// Full authentication, profile, orders, addresses, wishlist, history, settings

let currentUser = null;
let customerAddresses = [];
let customerOrders = [];
let browsingHistory = [];
let userWishlist = [];
let editingProfile = false;
let allProducts = [];

const GHANA_MOBILE_PREFIXES = ['020', '023', '024', '025', '026', '027', '028', '050', '053', '054', '055', '056', '057', '059'];

// HTML-escape for anything interpolated into innerHTML (product names from
// the DB, addresses, statuses) and JSON.parse that never throws on corrupt
// localStorage.
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safeParseJSON(raw, fallback) { try { const v = JSON.parse(raw); return v === undefined ? fallback : v; } catch (e) { return fallback; } }
function accountStorageKey(base) {
  // Account-specific browser preferences must not bleed between users sharing
  // the same device. Authentication is verified before these sections load.
  return `${base}:${currentUser && currentUser.id ? currentUser.id : 'signed-out'}`;
}

function safeProductImage(value) {
  const fallback = 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400';
  try {
    const url = new URL(String(value || ''));
    const allowed = url.protocol === 'https:' && (
      url.hostname === 'images.unsplash.com' ||
      (url.hostname === 'eydsoqnpetqczaeqrscc.supabase.co' && url.pathname.startsWith('/storage/v1/object/public/'))
    );
    return allowed ? url.href : fallback;
  } catch (error) { return fallback; }
}

function normalizeGhanaLocalPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (/^233\d{9}$/.test(digits)) digits = '0' + digits.slice(3);
  if (!/^0\d{9}$/.test(digits)) return '';
  return GHANA_MOBILE_PREFIXES.some(prefix => digits.startsWith(prefix)) ? digits : '';
}

const VALMONT_AUTH = {
  url: 'https://eydsoqnpetqczaeqrscc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc'
};

async function authRequest(path, body) {
  const response = await fetch(`${VALMONT_AUTH.url}/auth/v1/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: VALMONT_AUTH.anonKey }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.msg || data.message || 'Authentication failed');
  return data;
}

function saveAuthUser(account, accessToken) {
  const metadata = account && account.user_metadata || {};
  const email = account && account.email || '';
  const rawPhone = metadata.phone || account.phone || '';
  currentUser = {
    id: account.id,
    name: metadata.full_name || metadata.name || (email ? email.split('@')[0] : 'Valmont Customer'),
    email,
    phone: normalizeGhanaLocalPhone(rawPhone) || rawPhone,
  };
  localStorage.setItem('valmont_user', JSON.stringify(currentUser));
  if (accessToken) localStorage.setItem('valmont_access_token', accessToken);
}

function clearAuthSession() {
  localStorage.removeItem('valmont_user');
  localStorage.removeItem('valmont_customer');
  localStorage.removeItem('valmont_access_token');
  localStorage.removeItem('valmont_refresh_token');
  localStorage.removeItem('valmont_token_expires');
  localStorage.removeItem('valmont_logged_in');
  currentUser = null;
}

window.addEventListener('DOMContentLoaded', initAccount);

const OAUTH_ERROR_MESSAGES = {
  access_denied: 'You closed the Google sign-in window, so no account was created.',
  user_already_exists: 'An account with this email already exists. Please sign in with your email and password instead.',
  email_exists: 'An account with this email already exists. Please sign in with your email and password instead.',
  signup_disabled: 'New account sign-ups are currently disabled on the store. Please contact support.',
  server_error: 'Google sign-in could not create your account (server error). Please try again or use email sign-up.',
  invalid_state: 'The Google sign-in session expired. Please try again.',
  flow_state_not_found: 'The Google sign-in session expired. Please try again.',
  default: 'Google sign-in failed. Please try again or use email sign-up.'
};

async function completeAccountOAuth() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const searchParams = new URLSearchParams(window.location.search.slice(1));
  const getParam = (k) => hashParams.get(k) || searchParams.get(k);
  const accessToken = getParam('access_token');

  const cleanUrl = () => {
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      ['access_token', 'refresh_token', 'token_type', 'expires_in', 'error', 'error_description', 'error_code', 'code', 'state'].forEach(k => url.searchParams.delete(k));
      const searchStr = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
      history.replaceState(null, '', `${url.pathname}${searchStr}`);
    } catch (e) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  if (!accessToken) {
    const error = getParam('error');
    const errorDescription = getParam('error_description');
    if (error || errorDescription) {
      try { sessionStorage.removeItem('valmont_oauth_return'); } catch (e) {}
      cleanUrl();
      const code = String(error || '').toLowerCase();
      const message = OAUTH_ERROR_MESSAGES[code] || OAUTH_ERROR_MESSAGES.default;
      if (!OAUTH_ERROR_MESSAGES[code]) {
        console.error('Google OAuth failed — Supabase code:', code, '| description:', errorDescription);
      }
      const hint = OAUTH_ERROR_MESSAGES[code] ? '' : ` (Code: ${code})`;
      showToast(`${message}${hint}`);
    }
    return false;
  }

  try {
    const response = await fetch(`${VALMONT_AUTH.url}/auth/v1/user`, {
      headers: { apikey: VALMONT_AUTH.anonKey, Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Unable to verify Google account');
    const account = await response.json();
    saveAuthUser(account, accessToken);
    cleanUrl();
    try { sessionStorage.removeItem('valmont_oauth_return'); } catch (e) {}
    showAccountScreen();
    const firstName = currentUser && currentUser.name ? currentUser.name.split(' ')[0] : 'Customer';
    showToast(`Welcome, ${firstName}!`);
    return true;
  } catch (error) {
    console.error('Google sign-in failed on account page:', error);
    try { sessionStorage.removeItem('valmont_oauth_return'); } catch (e) {}
    cleanUrl();
    showToast('Google sign-in could not be completed. Please try again.');
    return false;
  }
}

async function initAccount() {
  const oauthHandled = await completeAccountOAuth();
  if (oauthHandled) return;

  allProducts = safeParseJSON(localStorage.getItem('valmont_products'), []);
  if (allProducts.length === 0 && typeof PRODUCTS !== 'undefined') allProducts = PRODUCTS;

  const accessToken = localStorage.getItem('valmont_access_token');
  if (!accessToken) {
    clearAuthSession();
    showAuthScreen();
    return;
  }

  try {
    const response = await fetch(`${VALMONT_AUTH.url}/auth/v1/user`, {
      headers: { apikey: VALMONT_AUTH.anonKey, Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Session verification failed');
    const account = await response.json();
    if (!account || !account.id) throw new Error('Invalid account response');
    // The server-verified user, not editable browser storage, is authoritative.
    saveAuthUser(account);
    showAccountScreen();
  } catch (error) {
    clearAuthSession();
    showAuthScreen();
    showToast('Your session could not be verified. Please sign in again.');
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

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signInEmail').value.trim().toLowerCase();
  const password = document.getElementById('signInPassword').value;
  if (!email || !password) { showToast('Please enter email and password'); return; }
  try {
    const result = await authRequest('token?grant_type=password', { email, password });
    saveAuthUser(result.user, result.access_token);
    showAccountScreen(); showToast('Welcome back, ' + currentUser.name.split(' ')[0] + '!');
  } catch (error) { console.error('Sign-in error:', error); showToast(error.message || 'Invalid email or password.'); }
}

async function handleSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('signUpName').value.trim();
  const email = document.getElementById('signUpEmail').value.trim().toLowerCase();
  const phone = normalizeGhanaLocalPhone(document.getElementById('signUpPhone').value.trim());
  const password = document.getElementById('signUpPassword').value;
  if (!name || !email || !phone || !password) {
    showToast(phone ? 'Please fill all fields' : 'Enter a valid Ghana mobile number, e.g. 024 123 4567.');
    return;
  }
  if (password.length < 6) { showToast('Password must be at least 6 characters'); return; }
  try {
    const result = await authRequest('signup', { email, password, data: { full_name: name, phone, role: 'customer' } });
    if (result.session && result.user) { saveAuthUser(result.user, result.session.access_token); showAccountScreen(); showToast('Account created! Welcome, ' + name + '!'); }
    else { switchAuthTab('signin'); showToast('Account created. Check your email to confirm it, then sign in.'); }
  } catch (error) { console.error('Sign-up error:', error); showToast(error.message || 'Unable to create account.'); }
}

function handlePasswordReset() {
  const email = prompt('Enter your email address to receive a password reset link:');
  if (!email) return;
  if (!email.includes('@')) { showToast('Please enter a valid email'); return; }
  authRequest('recover', { email }).then(() => {
    showToast('If an account exists for ' + email + ', a password reset email has been sent.');
  }).catch(() => showToast('Unable to send the reset email. Please try again.'));
}

function handleGoogleSignIn() {
  // Google OAuth is handled by the storefront's Supabase integration. Redirect
  // there rather than creating a pretend signed-in customer locally, but tell
  // the storefront to bring the shopper back here once Google is done so a
  // "Sign up with Google" finishes on the account page, not the store.
  try {
    sessionStorage.setItem('valmont_oauth_return', `${window.location.origin}${window.location.pathname}`);
  } catch (e) { /* sessionStorage unavailable; storefront falls back to its own URL */ }
  window.location.assign('/?google_signin=1');
}

async function handleLogout() {
  if (!confirm('Sign out of your account?')) return;
  const token = localStorage.getItem('valmont_access_token');
  try {
    if (token) {
      await fetch(`${VALMONT_AUTH.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: VALMONT_AUTH.anonKey, Authorization: `Bearer ${token}` }
      });
    }
  } catch (error) {
    console.warn('Remote session revocation was unavailable; clearing this device session.', error);
  } finally {
    clearAuthSession();
    showAuthScreen();
  }
}

// ===== LOAD ALL SECTIONS =====
function loadAllSections() {
  loadProfile();
  loadAddresses();
  loadPaymentPreference();
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

async function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim().toLowerCase();
  const phoneInput = document.getElementById('editPhone').value.trim();
  const phone = phoneInput ? normalizeGhanaLocalPhone(phoneInput) : '';
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) { showToast('A valid name and email are required'); return; }
  if (phoneInput && !phone) { showToast('Enter a valid Ghana mobile number.'); return; }

  const token = localStorage.getItem('valmont_access_token');
  if (!token) { clearAuthSession(); showAuthScreen(); return; }
  try {
    const response = await fetch(`${VALMONT_AUTH.url}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', apikey: VALMONT_AUTH.anonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, data: { full_name: name, phone } })
    });
    const account = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(account.msg || account.message || 'Profile update failed');
    saveAuthUser(account);
    loadProfile();
    toggleProfileEdit();
    const pendingEmail = account.new_email || (account.email !== email ? email : '');
    showToast(pendingEmail ? `Profile saved. Confirm ${pendingEmail} to change your email.` : 'Profile updated!');
  } catch (error) {
    showToast(error.message || 'Unable to update your profile.');
  }
}

// ===== ADDRESSES =====
function loadAddresses() {
  customerAddresses = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_customer_addresses')), []);
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
        <h4>${esc(addr.name)} ${addr.is_default ? '<span class="default-badge">Default</span>' : ''}</h4>
        <p><strong>${esc(addr.recipient)}</strong> · ${esc(addr.phone)}</p>
        <p>${esc(addr.zone)} — ${esc(addr.street)}</p>
        ${addr.landmark ? '<p style="font-size:11px;color:#94a3b8;">Landmark: ' + esc(addr.landmark) + '</p>' : ''}
      </div>
      <div class="addr-actions">
        <button class="addr-action-btn edit" data-account-action="edit-address" data-id="${esc(addr.id)}">Edit</button>
        <button class="addr-action-btn delete" data-account-action="delete-address" data-id="${esc(addr.id)}">Del</button>
        ${!addr.is_default ? `<button class="addr-action-btn set-default" data-account-action="default-address" data-id="${esc(addr.id)}">Default</button>` : ''}
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
  localStorage.setItem(accountStorageKey('valmont_customer_addresses'), JSON.stringify(customerAddresses));
  closeAddressForm();
  renderAddresses();
  showToast('Address saved!');
}

function editAddress(id) { openAddressForm(id); }

function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  customerAddresses = customerAddresses.filter(a => a.id !== id);
  localStorage.setItem(accountStorageKey('valmont_customer_addresses'), JSON.stringify(customerAddresses));
  renderAddresses();
  showToast('Address deleted');
}

function setDefaultAddress(id) {
  customerAddresses.forEach(a => a.is_default = a.id === id);
  localStorage.setItem(accountStorageKey('valmont_customer_addresses'), JSON.stringify(customerAddresses));
  renderAddresses();
  showToast('Default address updated');
}

// ===== ORDERS =====
function loadPaymentPreference() {
  const preference = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_payment_preference')), null);
  if (!preference) return;
  const method = document.getElementById('savedPaymentMethod');
  const network = document.getElementById('savedMomoNetwork');
  const phone = document.getElementById('savedMomoPhone');
  if (method) method.value = preference.method || 'momo';
  if (network) network.value = preference.network || 'mtn';
  if (phone) phone.value = preference.phone || '';
  const status = document.getElementById('paymentPreferenceStatus');
  if (status) status.textContent = preference.method === 'card' ? 'Card will be entered securely on Valmont-Pay.' : `Saved ${preference.network?.toUpperCase() || 'MoMo'} number ending ${String(preference.phone || '').slice(-4)}.`;
}

function savePaymentPreference(event) {
  event.preventDefault();
  const method = document.getElementById('savedPaymentMethod').value;
  const network = document.getElementById('savedMomoNetwork').value;
  const phone = document.getElementById('savedMomoPhone').value.trim();
  if (method === 'momo' && !phone) { showToast('Enter your Mobile Money phone number.'); return; }
  const preference = { method, network, phone };
  localStorage.setItem(accountStorageKey('valmont_payment_preference'), JSON.stringify(preference));
  loadPaymentPreference();
  showToast('Payment preference saved securely.');
}

async function loadOrders() {
  const container = document.getElementById('orderHistoryList');
  const token = localStorage.getItem('valmont_access_token');
  if (!currentUser || !token) {
    customerOrders = [];
    renderOrders();
    return;
  }
  if (container) container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">Loading your orders…</div>';

  try {
    const response = await fetch(`${VALMONT_AUTH.url}/rest/v1/rpc/get_my_orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: VALMONT_AUTH.anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired.' : 'Order history is temporarily unavailable.');
    const orders = await response.json();
    customerOrders = Array.isArray(orders) ? orders : [];
    renderOrders();
  } catch (error) {
    customerOrders = [];
    if (container) container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">${esc(error.message || 'Unable to load order history.')}</div>`;
  }
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
    const orderId = order.id || order.order_number || order.reference_code;
    const orderRef = order.order_number || order.reference_code || order.id;
    return `
      <div class="order-card" data-account-action="view-order" data-id="${esc(orderId)}" role="button" tabindex="0">
        <div class="order-card-top">
          <div>
            <div class="order-card-ref">#${esc(orderRef)}</div>
            <div class="order-card-date">${date}</div>
          </div>
          <span class="order-status ${statusClass}">${esc(order.status || 'Pending')}</span>
        </div>
        <div class="order-card-mid">
          <span class="order-card-items">${itemCount} item${itemCount > 1 ? 's' : ''} — ${esc(String(itemName).substring(0, 30))}</span>
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
  const order = customerOrders.find(o => o.id === orderId || o.order_number === orderId || o.reference_code === orderId);
  if (!order) return;

  document.getElementById('orderDetailRef').textContent = 'Order #' + (order.order_number || order.reference_code || order.id);
  const items = order.items || [];
  const subtotal = items.reduce((sum, i) => sum + ((i.price || i.unit_price || 0) * (i.qty || i.quantity || 1)), 0);
  const delivery = (order.total_amount || 0) >= 5000 ? 0 : 150;
  const total = parseFloat(order.total_amount || subtotal + delivery);

  const content = document.getElementById('orderDetailContent');
  content.innerHTML = `
    <div style="margin-bottom:16px;">
      <h4 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin:0 0 8px 0;">Customer & Delivery</h4>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Name</span><br><strong>${esc(order.customer_name || '—')}</strong></div>
        <div><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Phone</span><br><strong>${esc(order.customer_phone || '—')}</strong></div>
        <div style="grid-column:1/-1;"><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Address</span><br><strong>${esc(order.customer_area || '')} — ${esc(order.customer_street || '—')}</strong></div>
        <div style="grid-column:1/-1;"><span style="color:var(--text-secondary);font-size:10px;font-weight:700;text-transform:uppercase;">Payment</span><br><strong>${esc(order.payment_method || 'Mobile Money')}</strong></div>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <h4 style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-secondary);margin:0 0 8px 0;">Items Ordered</h4>
      ${items.length === 0 ? '<p style="font-size:13px;color:var(--text-secondary);">No items listed.</p>' : items.map(item => `
        <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="width:48px;height:48px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${esc(safeProductImage(item.image_url || item.product_image))}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="">
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;">${esc(item.name || item.product_name || 'Product')}</div>
            ${item.selected_color || item.selected_storage ? `<div style="font-size:10px;color:var(--text-secondary);">${esc([item.selected_color, item.selected_storage].filter(Boolean).join(' / '))}</div>` : ''}
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

    <button data-account-action="reorder" data-id="${esc(orderId)}" style="width:100%;margin-top:16px;background:#0b1a38;color:white;border:none;padding:14px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Reorder Items</button>
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
  const order = customerOrders.find(o => o.id === orderId || o.order_number === orderId || o.reference_code === orderId);
  if (!order || !order.items) { showToast('Unable to reorder'); return; }

  let cart = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_cart')), []);
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
  localStorage.setItem(accountStorageKey('valmont_cart'), JSON.stringify(cart));
  closeOrderDetail();
  showToast('Items added to cart!');
  setTimeout(() => { window.location.href = 'index.html'; }, 800);
}

// ===== WISHLIST =====
function loadWishlist() {
  userWishlist = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_wishlist')), []);
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
    const img = safeProductImage(p.image || p.image_url);
    return `
      <div class="wishlist-item">
        <div class="wishlist-item-img">
          <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
        </div>
        <div class="wishlist-item-body">
          <h4>${esc(p.name)}</h4>
          <div class="price">GH₵ ${(p.retail || p.price || 0).toLocaleString()}</div>
        </div>
        <div class="wishlist-item-actions">
          <button class="wl-move-btn" data-account-action="move-to-cart" data-id="${esc(p.id)}">Move to Cart</button>
          <button class="wl-remove-btn" data-account-action="remove-wishlist" data-id="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from wishlist">×</button>
        </div>
      </div>
    `;
  }).join('');
}

function moveToCart(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;
  let cart = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_cart')), []);
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
  localStorage.setItem(accountStorageKey('valmont_cart'), JSON.stringify(cart));
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem(accountStorageKey('valmont_wishlist'), JSON.stringify(userWishlist));
  renderWishlist();
  showToast('Moved to cart!');
}

function removeFromWishlist(productId) {
  userWishlist = userWishlist.filter(id => id !== productId);
  localStorage.setItem(accountStorageKey('valmont_wishlist'), JSON.stringify(userWishlist));
  renderWishlist();
  showToast('Removed from wishlist');
}

// ===== BROWSING HISTORY =====
function loadHistory() {
  browsingHistory = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_recently_viewed')), []);
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
    const img = safeProductImage(p.image || p.image_url);
    return `
      <div class="history-item" data-account-action="shop" role="link" tabindex="0">
        <div class="history-item-img">
          <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
        </div>
        <div class="history-item-body">
          <h4>${esc(p.name)}</h4>
          <div class="price">GH₵ ${(p.retail || p.price || 0).toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (!confirm('Clear all browsing history?')) return;
  localStorage.removeItem(accountStorageKey('valmont_recently_viewed'));
  browsingHistory = [];
  renderHistory();
  showToast('History cleared');
}

// ===== SETTINGS =====
function loadSettings() {
  const settings = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_settings')), {notifications: true, email: true, dark: false});
  updateToggle('toggleNotif', settings.notifications !== false);
  updateToggle('toggleEmail', settings.email !== false);
  updateToggle('toggleDark', settings.dark === true);
}

function toggleSetting(key) {
  const settings = safeParseJSON(localStorage.getItem(accountStorageKey('valmont_settings')), {notifications: true, email: true, dark: false});
  settings[key] = !settings[key];
  localStorage.setItem(accountStorageKey('valmont_settings'), JSON.stringify(settings));
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

async function changePassword(e) {
  e.preventDefault();
  const newPass = document.getElementById('newPassword').value.trim();
  if (!newPass || newPass.length < 6) { showToast('Password must be at least 6 characters'); return; }

  const token = localStorage.getItem('valmont_access_token');
  try {
    const response = await fetch(`${VALMONT_AUTH.url}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', apikey: VALMONT_AUTH.anonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPass })
    });
    if (!response.ok) throw new Error('Password update failed');
    document.getElementById('newPassword').value = '';
    showToast('Password changed successfully!');
  } catch (error) { showToast('Unable to change password. Please sign in again.'); }
}

// ===== DELEGATED ACCOUNT INTERACTIONS =====
// Keeping identifiers in inert data attributes prevents executable HTML from
// being created when account/order data originates outside this page.
document.addEventListener('click', event => {
  const overlay = event.target.closest('[data-account-overlay]');
  if (overlay && event.target === overlay) {
    if (overlay.dataset.accountOverlay === 'order-detail') closeOrderDetail();
    if (overlay.dataset.accountOverlay === 'address-form') closeAddressForm();
    return;
  }

  const control = event.target.closest('[data-account-action]');
  if (!control) return;
  const action = control.dataset.accountAction;
  const id = control.dataset.id || '';
  const handlers = {
    'auth-tab': () => switchAuthTab(control.dataset.tab),
    'google-sign-in': handleGoogleSignIn,
    'password-reset': handlePasswordReset,
    logout: handleLogout,
    'toggle-profile': toggleProfileEdit,
    'add-address': () => openAddressForm(),
    'clear-history': clearHistory,
    'toggle-setting': () => toggleSetting(control.dataset.setting),
    'close-order': closeOrderDetail,
    'close-address': closeAddressForm,
    'edit-address': () => editAddress(id),
    'delete-address': () => deleteAddress(id),
    'default-address': () => setDefaultAddress(id),
    'view-order': () => viewOrderDetail(id),
    reorder: () => reorderItems(id),
    'move-to-cart': () => moveToCart(id),
    'remove-wishlist': () => removeFromWishlist(id),
    shop: () => { window.location.href = 'index.html'; },
  };
  if (handlers[action]) {
    event.preventDefault();
    handlers[action]();
  }
});

document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-account-action][role="button"], [data-account-action][role="link"]')) {
    event.preventDefault();
    event.target.click();
  }
});

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-account-form]');
  if (!form) return;
  const handlers = {
    'sign-in': handleSignIn,
    'sign-up': handleSignUp,
    'save-profile': saveProfile,
    'save-payment': savePaymentPreference,
    'change-password': changePassword,
    'save-address': saveAddress,
  };
  const handler = handlers[form.dataset.accountForm];
  if (handler) handler(event);
});

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
