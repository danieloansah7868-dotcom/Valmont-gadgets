/**
 * Valmont Gadgets — Wholesale dealer portal
 *
 * Dealer cost is the sensitive number on this page, so it is not in the HTML:
 * `get_wholesale_catalog()` only returns rows (prices + volume tiers) once
 * Postgres has confirmed the caller's `wholesale_dealers` row is approved.
 * Order totals are recomputed by `place_wholesale_order()`; the browser sends
 * quantities only, never prices. Classic script (CSP forbids inline JS).
 */
(function () {
  'use strict';

  const state = {
    user: null,
    profile: null,
    catalog: [],
    orders: [],
    page: 'dashboard',
    cart: {},
    error: '',
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.VG.escapeHtml(value);
  const value = (id) => String($(id) ? $(id).value : '').trim();
  const text = (id, out) => { const el = $(id); if (el) el.textContent = out; };
  const cedis = (n) => `GH₵ ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}`;
  const modal = (open) => { const el = $('modal'); if (el) el.classList[open ? 'add' : 'remove']('open'); };

  let toastTimer = null;
  function toast(message) {
    const box = $('toast');
    const msg = $('toastMsg');
    if (!box || !msg) return;
    msg.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 3200);
  }

  function fail(id, error) {
    const el = $(id);
    if (el) el.textContent = (error && error.message) || 'Something went wrong. Please try again.';
  }
  function clearError(id) { const el = $(id); if (el) el.textContent = ''; }

  // ── auth ──────────────────────────────────────────────────────────
  async function boot() {
    try {
      state.user = await window.VDB.auth.current();
    } catch (e) {
      state.user = null;
    }
    if (!state.user) { showGate(); return; }
    await enterPortal();
  }

  function showGate() {
    $('loginScreen').style.display = '';
    $('wsDashboard').style.display = 'none';
  }

  $('loginBtn').addEventListener('click', async () => {
    clearError('loginErr');
    const email = value('wsEmail');
    const password = value('wsPass');
    if (!email || !password) return fail('loginErr', { message: 'Enter your email and password.' });
    if (!window.VG.canPerform('ws_login', 5, 900000)) {
      return fail('loginErr', { message: 'Too many attempts. Please wait 15 minutes.' });
    }
    const button = $('loginBtn');
    button.disabled = true;
    try {
      state.user = await window.VDB.auth.signin(email, password);
      $('wsPass').value = '';
      window.VG.resetAttempts('ws_login');
      await enterPortal();
    } catch (error) {
      fail('loginErr', error);
    } finally {
      button.disabled = false;
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    await window.VDB.auth.signout();
    state.user = null;
    state.profile = null;
    state.catalog = [];
    state.orders = [];
    showGate();
    toast('Signed out of the wholesale portal.');
  });

  async function enterPortal() {
    try {
      state.profile = await window.VGA.wholesale.profile();
    } catch (error) {
      state.profile = null;
      state.error = (error && error.message) || '';
    }
    if (!state.profile || state.profile.status !== 'approved') {
      $('loginScreen').style.display = '';
      $('wsDashboard').style.display = 'none';
      // Someone with no application at all gets the form; an applicant who is
      // pending or rejected only gets the answer, not a second submission.
      showApplyPanel(!state.profile);
      fail('loginErr', { message: pendingCopy() });
      return;
    }
    showApplyPanel(false);
    $('loginScreen').style.display = 'none';
    $('wsDashboard').style.display = '';
    text('dealerName', state.profile.businessName || 'Approved dealer');
    try {
      const result = await window.VGA.wholesale.catalog();
      state.catalog = result.products;
    } catch (error) {
      state.catalog = [];
      state.error = (error && error.message) || '';
    }
    try {
      state.orders = await window.VGA.wholesale.orders();
    } catch (error) {
      state.orders = [];
    }
    loadPage('dashboard');
  }

  function pendingCopy() {
    if (!state.profile) return 'Wholesale prices are released to approved dealers only. Send the application below and our purchasing team will review it.';
    if (state.profile.status === 'pending') return 'Your dealer application is pending — prices unlock once our purchasing team approves it.';
    return 'This dealer account is not active. Please contact Valmont wholesale on WhatsApp.';
  }

  // ── dealer application ────────────────────────────────────────────
  function showApplyPanel(show) {
    const panel = $('wsApplyPanel');
    if (panel) panel.hidden = !show;
  }

  $('openApplyBtn').addEventListener('click', () => {
    const panel = $('wsApplyPanel');
    const open = panel && panel.hidden;
    showApplyPanel(open);
    if (open) {
      const first = $('waBusiness');
      if (first) first.focus();
    }
  });

  $('applySubmitBtn').addEventListener('click', async () => {
    clearError('applyErr');
    const input = {
      businessName: window.VG.cleanText(value('waBusiness'), 90),
      contactName: window.VG.cleanText(value('waContact'), 80),
      phone: value('waPhone').replace(/[^0-9+]/g, ''),
      email: value('waEmail').toLowerCase(),
      city: window.VG.cleanText(value('waCity'), 60),
    };
    if (input.businessName.length < 3) return fail('applyErr', { message: 'Enter your business or shop name.' });
    if (input.contactName.length < 3) return fail('applyErr', { message: 'Enter the name of the person we should call.' });
    if (input.phone && !/^\+?[0-9]{7,15}$/.test(input.phone)) return fail('applyErr', { message: 'That phone number looks incomplete.' });
    if (input.email && !window.VG.isValidEmail(input.email)) return fail('applyErr', { message: 'That email address looks incomplete.' });
    if (!state.user) return fail('applyErr', { message: 'Sign in first — the application is tied to your login.' });
    if (!window.VG.canPerform('ws_apply', 3, 3600000)) {
      return fail('applyErr', { message: 'Too many applications from this device. Please try again later.' });
    }
    const button = $('applySubmitBtn');
    button.disabled = true;
    try {
      await window.VGA.wholesale.apply(input);
      showApplyPanel(false);
      ['waBusiness', 'waContact', 'waPhone', 'waEmail', 'waCity'].forEach((id) => { const el = $(id); if (el) el.value = ''; });
      state.profile = await window.VGA.wholesale.profile();
      fail('loginErr', { message: pendingCopy() });
      toast('Application sent. Our purchasing team will call you.');
    } catch (error) {
      fail('applyErr', error);
    } finally {
      button.disabled = false;
    }
  });

  // ── navigation ────────────────────────────────────────────────────
  const renderers = {
    dashboard: renderDashboard,
    catalog: renderCatalog,
    orders: renderOrders,
    calculator: renderCalculator,
    pricing: renderPriceList,
    profile: renderProfile,
  };

  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.addEventListener('click', () => loadPage(item.dataset.page, item));
  });

  function loadPage(page, item) {
    state.page = page;
    document.querySelectorAll('.nav-item[data-page]').forEach((other) => other.classList.remove('active'));
    const active = item || document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');
    text('pageTitle', active ? active.textContent.trim() : 'Wholesale');
    $('sidebar').classList.remove('open');
    if (renderers[page]) renderers[page]();
  }

  const menuToggle = $('menuToggle');
  if (menuToggle) {
    if (window.innerWidth <= 768) menuToggle.style.display = '';
    menuToggle.addEventListener('click', () => $('sidebar').classList.toggle('open'));
  }

  $('closeModal').addEventListener('click', () => modal(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') modal(false); });

  // ── dashboard ─────────────────────────────────────────────────────
  function renderDashboard() {
    const pending = state.orders.filter((o) => o.status === 'pending').length;
    const spend = state.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    $('pageContent').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Products priced for you</div><div class="value">${state.catalog.length}</div><div class="change up">Live tier list</div></div>
        <div class="stat-card"><div class="label">My orders</div><div class="value">${state.orders.length}</div><div class="change up">${pending} pending</div></div>
        <div class="stat-card"><div class="label">Lifetime spend</div><div class="value">${cedis(spend)}</div><div class="change up">Ex-VAT</div></div>
        <div class="stat-card"><div class="label">Account</div><div class="value" style="font-size:18px">Approved</div><div class="change up">Since ${esc(state.profile.since || '—')}</div></div>
      </div>
      ${state.error ? `<div class="table-card"><div class="hd"><h3>Notice</h3></div><div style="padding:14px;font-size:12px;color:#92400e">${esc(state.error)}</div></div>` : ''}
      <div class="table-card">
        <div class="hd"><h3>Recent orders</h3><button type="button" class="btn btn-outline btn-sm" data-ws-page="orders">View all</button></div>
        <table>
          <thead><tr><th>Order</th><th>Units</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${state.orders.slice(0, 5).map((o) => `<tr>
            <td>${esc(o.orderNumber)}</td>
            <td>${esc(o.items.reduce((n, i) => n + (i.qty || 0), 0))}</td>
            <td>${esc(cedis(o.total))}</td>
            <td><span class="badge ${o.status === 'delivered' ? 'badge-green' : o.status === 'pending' ? 'badge-yellow' : 'badge-blue'}">${esc(o.status)}</span></td>
          </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:14px">No wholesale orders yet</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  document.addEventListener('click', (event) => {
    const jump = event.target.closest ? event.target.closest('[data-ws-page]') : null;
    if (jump) { loadPage(jump.dataset.wsPage); return; }

    const order = event.target.closest ? event.target.closest('[data-order]') : null;
    if (order) { openOrderModal(order.dataset.order); return; }

    const remove = event.target.closest ? event.target.closest('[data-cart-remove]') : null;
    if (remove) { delete state.cart[remove.dataset.cartRemove]; renderCatalog(); }

    const qty = event.target.closest ? event.target.closest('[data-cart-qty]') : null;
    if (qty) {
      const input = document.querySelector(`[data-cart-value="${qty.dataset.cartQty}"]`);
      if (input) {
        const next = window.VG.safeInteger(input.value, 0, 500, 0);
        if (next <= 0) delete state.cart[qty.dataset.cartQty];
        else state.cart[qty.dataset.cartQty] = next;
        renderCatalog();
      }
    }
  });

  // ── catalog ───────────────────────────────────────────────────────
  let catalogFilter = 'all';

  function renderCatalog() {
    const categories = Array.from(new Set(state.catalog.map((p) => p.category).filter(Boolean)));
    $('pageContent').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:900;color:var(--navy)">Wholesale catalog</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" data-cat="all">All</button>
          ${categories.map((c) => `<button type="button" class="btn btn-outline btn-sm" data-cat="${esc(c)}">${esc(c.replace(/_/g, ' '))}</button>`).join('')}
        </div>
      </div>
      <div id="catalogGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div>
      <div id="cartSummary"></div>`;

    document.querySelectorAll('[data-cat]').forEach((button) => {
      button.addEventListener('click', () => {
        catalogFilter = button.dataset.cat;
        renderCatalogGrid();
      });
    });
    renderCatalogGrid();
  }

  function renderCatalogGrid() {
    const grid = $('catalogGrid');
    if (!state.catalog.length) {
      grid.innerHTML = '<div class="table-card" style="grid-column:1/-1"><div style="padding:18px;font-size:13px;color:#6b7280">No wholesale rows are active right now. Your account is approved — ask our team to publish the current price list.</div></div>';
      return;
    }
    const rows = catalogFilter === 'all' ? state.catalog : state.catalog.filter((p) => p.category === catalogFilter);
    grid.innerHTML = rows.map((product) => {
      const save = product.retail ? Math.round((1 - product.wholesale / product.retail) * 100) : 0;
      const tiers = (product.tiers || []).map((tier) => `<div class="tier-card">
          <div class="qty">${esc(tier.qty)}+ units</div>
          <div class="price">${esc(cedis(tier.price))}</div>
          <div class="save">${esc(product.retail ? `${cedis(Math.max(0, product.retail - tier.price))}/unit off retail` : 'dealer price')}</div>
        </div>`).join('');
      const inCart = state.cart[product.id] || 0;
      return `<div class="table-card" style="margin:0;overflow:visible">
        <div style="height:150px;background:#f9fafb;display:flex;align-items:center;justify-content:center;position:relative">
          <img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" width="160" height="120" style="max-height:80%;max-width:80%;object-fit:contain">
          <span class="badge badge-gold" style="position:absolute;top:8px;left:8px">Dealer price</span>
          ${save > 0 ? `<span class="badge badge-green" style="position:absolute;top:8px;right:8px">-${save}%</span>` : ''}
        </div>
        <div style="padding:14px">
          <h4 style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:4px">${esc(product.name)}</h4>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:8px">${esc(product.storage || '')}${product.stock ? ` • ${esc(product.stock)} in stock` : ''}</p>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">
            <span style="font-size:18px;font-weight:900;color:var(--navy)">${esc(cedis(product.wholesale))}</span>
            ${product.retail ? `<span style="font-size:12px;color:#9ca3af;text-decoration:line-through">${esc(cedis(product.retail))}</span>` : ''}
          </div>
          ${tiers ? `<div class="tier-grid">${tiers}</div>` : ''}
          <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
            <input data-cart-value="${esc(product.id)}" type="number" min="0" max="500" value="${inCart}" aria-label="Units of ${esc(product.name)}" style="width:74px;padding:9px;border:1.5px solid #d1d5db;border-radius:8px;font:inherit">
            <button type="button" class="btn btn-primary" data-cart-add="${esc(product.id)}" style="flex:1;justify-content:center">Add to order</button>
          </div>
        </div>
      </div>`;
    }).join('') || '<div class="table-card" style="grid-column:1/-1"><div style="padding:18px;font-size:13px;color:#6b7280">Nothing in this category right now.</div></div>';

    document.querySelectorAll('[data-cart-add]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.cartAdd;
        const input = document.querySelector(`[data-cart-value="${id}"]`);
        const qty = window.VG.safeInteger(input ? input.value : 0, 1, 500, 0);
        if (!qty) return toast('Enter how many units you need.');
        state.cart[id] = qty;
        renderCartSummary();
        toast(`${qty} × ${nameOf(id)} added to your order draft.`);
      });
    });
    renderCartSummary();
  }

  function nameOf(id) {
    const found = state.catalog.find((p) => p.id === id);
    return found ? found.name : 'units';
  }

  function renderCartSummary() {
    const wrap = $('cartSummary');
    if (!wrap) return;
    const ids = Object.keys(state.cart);
    if (!ids.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="table-card" style="margin-top:16px">
        <div class="hd"><h3>Order draft</h3><button type="button" class="btn btn-green btn-sm" id="submitOrderBtn">Send order request</button></div>
        <table>
          <thead><tr><th>Product</th><th>Units</th><th></th></tr></thead>
          <tbody>${ids.map((id) => `<tr>
            <td>${esc(nameOf(id))}</td>
            <td>${esc(state.cart[id])}</td>
            <td style="text-align:right"><button type="button" class="btn btn-outline btn-sm" data-cart-remove="${esc(id)}">Remove</button></td>
          </tr>`).join('')}</tbody>
        </table>
        <div style="padding:12px 18px;font-size:11px;color:#6b7280">Unit prices and the total are computed by Valmont from this list — nothing on this page can change them.</div>
      </div>`;
    const submit = $('submitOrderBtn');
    if (submit) submit.addEventListener('click', openOrderModal);
  }

  // ── order modal ───────────────────────────────────────────────────
  async function openOrderModal() {
    modal(true);
    $('modalTitle').textContent = 'Confirm wholesale order';
    const items = Object.keys(state.cart).map((id) => ({ product_id: id, qty: state.cart[id] }));
    $('modalBody').innerHTML = '<div style="padding:18px;font-size:13px;color:#6b7280">Pricing your order…</div>';
    let quote;
    try {
      quote = await window.VGA.wholesale.quote(items);
    } catch (error) {
      $('modalBody').innerHTML = `<div style="padding:18px"><p style="font-size:13px;color:#991b1b;font-weight:700">${esc((error && error.message) || 'We could not price that order.')}</p></div>`;
      return;
    }
    const lines = (quote && quote.items) || [];
    $('modalBody').innerHTML = `
      <div style="padding:18px">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <tbody>${lines.map((line) => `<tr>
            <td style="padding:6px 0">${esc(line.name)}</td>
            <td style="padding:6px 0;text-align:center">${esc(line.qty)}</td>
            <td style="padding:6px 0;text-align:right">${esc(cedis(line.unit_price))}</td>
            <td style="padding:6px 0;text-align:right;font-weight:800">${esc(cedis(line.line_total))}</td>
          </tr>`).join('')}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin:14px 0;font-size:16px;font-weight:900;color:var(--navy)">
          <span>Total</span><span>${esc(cedis(quote && quote.total))}</span>
        </div>
        <div class="fg"><label for="orderAddress">Delivery address</label><textarea id="orderAddress" maxlength="240" rows="3" placeholder="Shop name, street, landmark, city"></textarea></div>
        <p style="font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:14px">This sends the request to Valmont purchasing. We confirm stock and share a MoMo / bank reference for payment; nothing is charged from this page.</p>
        <p id="orderErr" style="color:#dc2626;font-size:12px;font-weight:700;min-height:16px" role="alert" aria-live="polite"></p>
        <button type="button" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" id="confirmOrderBtn">Send order request</button>
      </div>`;
    $('confirmOrderBtn').addEventListener('click', async () => {
      const button = $('confirmOrderBtn');
      clearError('orderErr');
      const address = window.VG.cleanText($('orderAddress').value, 240);
      if (address.length < 8) return fail('orderErr', { message: 'Add a delivery address so we can route your stock.' });
      if (!window.VG.canPerform('ws_order', 3, 3600000)) return fail('orderErr', { message: 'You have sent 3 order requests this hour. Please try again later.' });
      button.disabled = true;
      try {
        const placed = await window.VGA.wholesale.placeOrder(items, address);
        state.cart = {};
        modal(false);
        try { state.orders = await window.VGA.wholesale.orders(); } catch (e) { /* keep previous */ }
        loadPage('orders');
        toast(`Order ${placed && placed.order_number ? placed.order_number : 'request'} sent to Valmont purchasing.`);
      } catch (error) {
        fail('orderErr', error);
      } finally {
        button.disabled = false;
      }
    });
  }

  // ── orders ────────────────────────────────────────────────────────
  async function renderOrders() {
    try {
      state.orders = await window.VGA.wholesale.orders();
    } catch (error) {
      state.orders = [];
    }
    $('pageContent').innerHTML = `
      <div class="table-card">
        <div class="hd"><h3>My wholesale orders</h3><span style="font-size:11px;color:#6b7280">${state.orders.length} total</span></div>
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${state.orders.map((o) => `<tr>
            <td>${esc(o.orderNumber)}</td>
            <td>${esc(o.date || '—')}</td>
            <td>${esc(o.items.map((i) => `${i.qty} × ${i.name}`).join(', ') || '—')}</td>
            <td>${esc(cedis(o.total))}</td>
            <td><span class="badge ${o.status === 'delivered' ? 'badge-green' : o.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}">${esc(o.status)}</span></td>
          </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">No orders yet — build a draft from the catalog.</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  // ── profit calculator ─────────────────────────────────────────────
  function renderCalculator() {
    const options = state.catalog.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(cedis(p.wholesale))}</option>`).join('');
    $('pageContent').innerHTML = `
      <div class="table-card" style="max-width:640px">
        <div class="hd"><h3>Profit calculator</h3></div>
        <div style="padding:18px">
          <div class="fg-row">
            <div class="fg"><label for="calcProduct">Product</label><select id="calcProduct">${options}</select></div>
            <div class="fg"><label for="calcQty">Units</label><input id="calcQty" type="number" min="1" max="500" value="5"></div>
          </div>
          <div class="fg-row">
            <div class="fg"><label for="calcSell">Your selling price (GH₵)</label><input id="calcSell" type="number" min="1" max="2000000" value="1"></div>
            <div class="fg"><label for="calcExtras">Extras per unit (delivery, box, warranty)</label><input id="calcExtras" type="number" min="0" max="100000" value="0"></div>
          </div>
          <div id="calcOut" style="background:#f9fafb;border-radius:10px;padding:14px;font-size:12px;color:#374151;line-height:1.9"></div>
        </div>
      </div>`;
    ['calcProduct', 'calcQty', 'calcSell', 'calcExtras'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('input', updateCalc);
    });
    updateCalc();
  }

  function updateCalc() {
    const out = $('calcOut');
    if (!out) return;
    const product = state.catalog.find((p) => p.id === value('calcProduct'));
    if (!product) { out.textContent = 'Approve a catalog row first — this calculator reads your live dealer price.'; return; }
    const qty = window.VG.safeInteger(value('calcQty'), 1, 500, 1);
    const sell = window.VG.safeDecimal(value('calcSell'), 1, 2000000, 0);
    const extras = window.VG.safeDecimal(value('calcExtras'), 0, 100000, 0);
    const unit = tierPrice(product, qty);
    const costPerUnit = unit + extras;
    const profitPerUnit = sell - costPerUnit;
    const totalProfit = profitPerUnit * qty;
    const margin = sell > 0 ? Math.round((profitPerUnit / sell) * 100) : 0;
    out.innerHTML = [
      `<div>Dealer unit price at ${esc(qty)} units: <b>${esc(cedis(unit))}</b></div>`,
      `<div>Cost per unit incl. extras: <b>${esc(cedis(costPerUnit))}</b></div>`,
      `<div>Profit per unit at ${esc(cedis(sell))}: <b style="color:${profitPerUnit >= 0 ? '#047857' : '#dc2626'}">${esc(cedis(profitPerUnit))}</b> (${esc(margin)}% margin)</div>`,
      `<div>Total profit on ${esc(qty)} units: <b style="color:${totalProfit >= 0 ? '#047857' : '#dc2626'}">${esc(cedis(totalProfit))}</b></div>`,
      `<div style="color:#9ca3af;font-size:11px">Retail reference ${esc(cedis(product.retail))} — pricing, taxes and duties are yours to plan for.</div>`,
    ].join('');
  }

  function tierPrice(product, qty) {
    const tiers = (product.tiers || []).slice().sort((a, b) => (b.qty || 0) - (a.qty || 0));
    for (const tier of tiers) if (qty >= tier.qty) return tier.price;
    return product.wholesale;
  }

  // ── printable price list ──────────────────────────────────────────
  function renderPriceList() {
    const rows = state.catalog.map((product) => {
      const tiers = (product.tiers || []).map((tier) => `${tier.qty}+ · ${cedis(tier.price)}`).join('  |  ');
      return `<tr>
        <td>${esc(product.name)}</td>
        <td style="text-align:right">${esc(cedis(product.wholesale))}</td>
        <td style="text-align:right">${esc(product.retail ? cedis(product.retail) : '—')}</td>
        <td>${esc(tiers || 'single price')}</td>
      </tr>`;
    }).join('');
    $('pageContent').innerHTML = `
      <div class="table-card">
        <div class="hd"><h3>Dealer price list</h3><button type="button" class="btn btn-outline btn-sm" id="printPriceList">🖨️ Print</button></div>
        <table>
          <thead><tr><th>Product</th><th style="text-align:right">Dealer</th><th style="text-align:right">Retail</th><th>Volume tiers</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:16px">No rows published yet.</td></tr>'}</tbody>
        </table>
        <div style="padding:12px 18px;font-size:11px;color:#9ca3af">Prices are for your approved account only. Sharing this list with non-dealers voids wholesale access.</div>
      </div>`;
    const print = $('printPriceList');
    if (print) print.addEventListener('click', () => window.print());
  }

  // ── profile ───────────────────────────────────────────────────────
  function renderProfile() {
    const profile = state.profile || {};
    $('pageContent').innerHTML = `
      <div class="table-card" style="max-width:600px">
        <div class="hd"><h3>Dealer account</h3><span class="badge badge-green">${esc(profile.status || 'pending')}</span></div>
        <div style="padding:18px;font-size:13px;color:#374151;line-height:2">
          <div><b>${esc(profile.businessName || '—')}</b></div>
          <div>Contact: ${esc(profile.contactName || '—')}</div>
          <div>Phone: ${esc(profile.phone || '—')}</div>
          <div>Signed in: ${esc(state.user ? state.user.email : '—')}</div>
          <div>Approved since: ${esc(profile.since || '—')}</div>
        </div>
        <div style="padding:0 18px 18px;font-size:11px;color:#9ca3af">Wholesale status is set by Valmont in the database; this page cannot change it.</div>
      </div>`;
  }

  boot();
})();
