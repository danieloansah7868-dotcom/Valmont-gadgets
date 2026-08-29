/**
 * Valmont Gadgets — Platform admin console (swap, used, wholesale, partners)
 *
 * This shell holds no credentials and trusts nothing it renders. Every screen
 * is a read of an `admin_platform_board()` call and every button is a narrow
 * `admin_*()` Postgres function that (a) re-checks `public.is_valmont_admin()`
 * and (b) writes its own row into public.admin_audit_log. A shopper who edits
 * this file in devtools still cannot approve a listing, ban a seller or switch
 * on a paid promotion, because the browser is not the one deciding.
 *
 * Products, orders, reviews and delivery settings stay in admin.html — this
 * page deliberately duplicates nothing that already has an authoritative UI.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.VG.escapeHtml(value);
  const cedis = (n) => `GH₵ ${Number(n || 0).toLocaleString('en-GH')}`;

  const state = {
    admin: null,
    section: 'dashboard',
    board: { rows: [], summary: {} },
    error: '',
    lastRefresh: 0,
  };

  let toastTimer = null;
  function toast(message) {
    const box = $('toast');
    const msg = $('toastMsg');
    if (!box || !msg) return;
    msg.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 3400);
  }

  function gateCopy(message) {
    const el = $('loginErr');
    if (el) el.textContent = message;
  }

  // ── authorization ─────────────────────────────────────────────────
  async function boot() {
    let user = null;
    try {
      user = await window.VDB.auth.current();
    } catch (e) {
      user = null;
    }
    if (!user) {
      gateCopy('You are not signed in. Admin access is granted to the allowlisted owner account only.');
      return;
    }
    let allowed = false;
    try {
      const result = await window.VDB.rpc.isAdmin();
      allowed = result === true || (result && result.is_admin === true);
    } catch (e) {
      allowed = false;
    }
    if (!allowed) {
      gateCopy('This account is not on the Valmont admin allowlist.');
      await window.VDB.auth.signout();
      return;
    }
    state.admin = user;
    $('loginScreen').style.display = 'none';
    $('adminDashboard').style.display = '';
    $('adminName').textContent = user.email || 'Valmont admin';
    await load('dashboard');
  }

  $('logoutAdmin').addEventListener('click', async () => {
    await window.VDB.auth.signout();
    window.location.assign('admin-login.html');
  });

  // ── navigation ────────────────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.addEventListener('click', () => load(item.dataset.page, item));
  });

  const menuToggle = $('menuToggle');
  if (menuToggle) {
    if (window.innerWidth <= 768) menuToggle.style.display = '';
    menuToggle.addEventListener('click', () => $('sidebar').classList.toggle('open'));
  }

  $('closeModal').addEventListener('click', () => $('modal').classList.remove('open'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') $('modal').classList.remove('open');
  });

  async function load(section, item) {
    state.section = section;
    document.querySelectorAll('.nav-item[data-page]').forEach((other) => other.classList.remove('active'));
    const active = item || document.querySelector(`.nav-item[data-page="${section}"]`);
    if (active) active.classList.add('active');
    if (active) $('pageTitle').textContent = active.textContent.trim();
    $('sidebar').classList.remove('open');
    $('pageContent').innerHTML = '<p style="font-size:13px;color:#6b7280;font-weight:700">Loading…</p>';
    try {
      const board = await window.VDB.rpc.adminBoard(section, 100);
      state.board = board || { rows: [], summary: {} };
      state.error = '';
      state.lastRefresh = Date.now();
    } catch (error) {
      state.board = { rows: [], summary: {} };
      state.error = (error && error.message) || 'The board could not be loaded.';
    }
    render();
  }

  // ── rendering ─────────────────────────────────────────────────────
  function render() {
    const views = {
      dashboard: viewDashboard,
      swap: viewSwap,
      ads: viewAds,
      used: viewUsed,
      sellers: viewSellers,
      dealers: viewDealers,
      orders: viewOrders,
      partners: viewPartners,
      logs: viewLogs,
    };
    const target = $('pageContent');
    if (state.error) {
      target.innerHTML = `<div class="table-card"><div style="padding:18px;font-size:13px;color:#991b1b;font-weight:700">${esc(state.error)}
        <button type="button" class="btn btn-outline btn-sm" data-reload>Retry</button></div></div>`;
      const retry = target.querySelector('[data-reload]');
      if (retry) retry.addEventListener('click', () => load(state.section));
      return;
    }
    (views[state.section] || viewDashboard)(target);
  }

  const statCard = (label, value, tone) =>
    `<div class="stat-card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${tone ? `<div class="change ${tone === 'ok' ? 'up' : 'down'}">${esc('')}</div>` : ''}</div>`;

  function table(columns, rows, empty) {
    if (!rows.length) return `<div class="table-card"><div style="padding:18px;font-size:13px;color:#6b7280">${esc(empty)}</div></div>`;
    return `<div class="table-card"><table>
      <thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  const pill = (status) => {
    const tone = /approved|active|completed|delivered|shipped/.test(status) ? 'badge-green'
      : /rejected|cancelled|banned|removed/.test(status) ? 'badge-red' : 'badge-yellow';
    return `<span class="badge ${tone}">${esc(status || 'pending')}</span>`;
  };

  function viewDashboard(target) {
    const summary = state.board.summary || {};
    target.innerHTML = `
      <div class="stat-grid">
        ${statCard('Swap listings awaiting review', summary.pending_listings || 0)}
        ${statCard('Active swap listings', summary.active_listings || 0)}
        ${statCard('Promotion requests', summary.promo_requests || 0)}
        ${statCard('Used stock available', summary.used_available || 0)}
        ${statCard('Sellers', summary.sellers || 0)}
        ${statCard('Dealer applications', summary.dealers_pending || 0)}
        ${statCard('Partner applications', summary.partners_pending || 0)}
        ${statCard('Ad revenue recorded', cedis(summary.ad_revenue || 0))}
      </div>
      <div class="table-card"><div class="hd"><h3>Latest activity</h3><span style="font-size:11px;color:#6b7280">Refreshed ${new Date(state.lastRefresh).toLocaleTimeString('en-GB')}</span></div>
      ${table(['When', 'Admin', 'Action', 'Detail'], (state.board.rows || []).slice(0, 8).map((row) => [
        esc(new Date(row.created_at).toLocaleString('en-GB')),
        esc(row.admin_user || 'system'),
        esc(row.action || ''),
        esc(shortDetail(row.details)),
      ]), 'Nothing logged yet.')}</div>`;
  }

  function shortDetail(details) {
    const text = typeof details === 'string' ? details : JSON.stringify(details || {});
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }

  function viewSwap(target) {
    target.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px;flex-wrap:wrap">
        <p style="font-size:12px;color:#6b7280;font-weight:700;margin:0">Approved listings go live on swap.html. Ghana Card numbers are never stored in the clear — review them with the seller in person or on a video call.</p>
        <button type="button" class="btn btn-outline btn-sm" data-reload>Refresh</button>
      </div>
      ${table(['Seller', 'Item', 'Type', 'Grade', 'Price / want', 'Status', 'Actions'], state.board.rows.map((row) => [
        `<b>${esc(row.seller_name || '')}</b><div style="font-size:10px;color:#9ca3af">${esc(row.seller_phone || '')} • ${esc(row.city || '')}</div>`,
        `${esc(row.model || '')}<div style="font-size:10px;color:#9ca3af">${esc(row.brand || '')} • ${esc(row.storage || '')}</div>`,
        esc(row.listing_type || 'swap'),
        esc(row.grade || '—'),
        `${row.price ? esc(cedis(row.price)) : '—'}<div style="font-size:10px;color:#9ca3af">${esc(String(row.want || '').slice(0, 60))}</div>`,
        pill(row.status),
        row.status === 'pending'
          ? `<button type="button" class="btn btn-green btn-sm" data-act="approve_listing" data-id="${esc(row.id)}">Approve</button>
             <button type="button" class="btn btn-red btn-sm" data-act="reject_listing" data-id="${esc(row.id)}">Reject</button>`
          : `<button type="button" class="btn btn-outline btn-sm" data-act="remove_listing" data-id="${esc(row.id)}">Take down</button>`,
      ]), 'No swap listings yet.')}`;
  }

  function viewAds(target) {
    target.innerHTML = table(['Seller', 'Listing', 'Plan', 'Amount', 'Status', 'Requested', 'Actions'], state.board.rows.map((row) => [
      esc(row.seller_name || ''),
      esc(row.listing_model || ''),
      `${esc(row.plan_hours || 0)} h`,
      esc(cedis(row.amount)),
      pill(row.status),
      esc(new Date(row.created_at).toLocaleDateString('en-GB')),
      row.status === 'pending'
        ? `<button type="button" class="btn btn-green btn-sm" data-act="activate_promo" data-id="${esc(row.id)}">Payment received → activate</button>
           <button type="button" class="btn btn-red btn-sm" data-act="decline_promo" data-id="${esc(row.id)}">Decline</button>`
        : `<button type="button" class="btn btn-outline btn-sm" data-act="stop_promo" data-id="${esc(row.id)}">Stop boost</button>`,
    ]), 'No promotion requests.') + '<p style="font-size:11px;color:#9ca3af;margin-top:12px">Activating marks the payment completed and starts the boost timer in the database; the listing gains its ⭐ placement on the next page load.</p>';
  }

  function viewUsed(target) {
    target.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px;flex-wrap:wrap">
        <p style="font-size:12px;color:#6b7280;font-weight:700;margin:0">Only units listed here appear on the public UK/US board. Mark a unit sold as soon as it leaves the counter.</p>
        <button type="button" class="btn btn-primary btn-sm" data-act="new_used">＋ List a unit</button>
      </div>
      ${table(['Unit', 'Origin', 'Grade', 'Battery', 'Price', 'Listed', 'Actions'], state.board.rows.map((row) => [
        `<b>${esc(row.name || '')}</b><div style="font-size:10px;color:#9ca3af">${esc(row.storage || '')} • ${esc(row.color || '')}</div>`,
        esc((row.origin || '').toUpperCase()),
        esc(row.grade || '—'),
        esc(row.battery_health || '—') + '%',
        esc(cedis(row.price)),
        esc(row.listed_date || ''),
        `${row.is_sold
          ? `<button type="button" class="btn btn-outline btn-sm" data-act="restock_used" data-id="${esc(row.id)}">Return to board</button>`
          : `<button type="button" class="btn btn-gold btn-sm" data-act="sold_used" data-id="${esc(row.id)}">Mark sold</button>`}
         <button type="button" class="btn btn-red btn-sm" data-act="delete_used" data-id="${esc(row.id)}">Delete</button>`,
      ]), 'No used inventory yet.')}
      <div class="table-card"><div class="hd"><h3>Image links must come from an approved host</h3></div>
      <div style="padding:14px;font-size:12px;color:#6b7280;line-height:1.6">Upload device photos to Supabase storage (bucket <code>uploads</code>) or place them under <code>/uploads/</code>. Pastes from random hosts are rejected by the CSP when a shopper loads the page.</div></div>`;
  }

  function viewSellers(target) {
    target.innerHTML = table(['Seller', 'Phone', 'City', 'Ghana Card', 'Listings', 'Status', 'Actions'], state.board.rows.map((row) => [
      `<b>${esc(row.name || '')}</b><div style="font-size:10px;color:#9ca3af">${esc(row.email || '')}</div>`,
      esc(row.phone || '—'),
      esc(row.city || '—'),
      row.ghana_card_masked ? `${esc(row.ghana_card_masked)}${row.ghana_card_verified ? ' ✓' : ''}` : 'not provided',
      esc(row.listings || 0),
      row.is_banned ? '<span class="badge badge-red">banned</span>' : (row.face_verified ? '<span class="badge badge-green">face verified</span>' : '<span class="badge badge-yellow">unverified</span>'),
      `${row.face_verified ? '' : `<button type="button" class="btn btn-green btn-sm" data-act="verify_seller" data-id="${esc(row.id)}">Verify</button>`}
       ${row.is_banned ? '' : `<button type="button" class="btn btn-outline btn-sm" data-act="ban_seller" data-id="${esc(row.id)}">Ban</button>`}`,
    ]), 'No seller accounts yet.');
  }

  function viewDealers(target) {
    target.innerHTML = table(['Business', 'Contact', 'Phone', 'Ghana Card', 'Status', 'Actions'], state.board.rows.map((row) => [
      esc(row.business_name || ''),
      esc(row.contact_name || ''),
      esc(row.phone || ''),
      row.ghana_card_masked ? esc(row.ghana_card_masked) : '—',
      pill(row.status),
      row.status === 'pending'
        ? `<button type="button" class="btn btn-green btn-sm" data-act="approve_dealer" data-id="${esc(row.id)}">Approve</button>
           <button type="button" class="btn btn-red btn-sm" data-act="reject_dealer" data-id="${esc(row.id)}">Reject</button>`
        : `<button type="button" class="btn btn-outline btn-sm" data-act="revoke_dealer" data-id="${esc(row.id)}">Revoke access</button>`,
    ]), 'No wholesale applications.');
  }

  function viewOrders(target) {
    target.innerHTML = table(['Order', 'Dealer', 'Units', 'Total', 'Status', 'Actions'], state.board.rows.map((row) => [
      esc(row.order_number || ''),
      esc(row.dealer_name || ''),
      esc(row.unit_count || 0),
      esc(cedis(row.total)),
      pill(row.status),
      `<select data-order-id="${esc(row.id)}" aria-label="Order status">
        ${['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => `<option value="${status}" ${status === row.status ? 'selected' : ''}>${status}</option>`).join('')}
       </select>`,
    ]), 'No dealer orders yet.');

    target.querySelectorAll('[data-order-id]').forEach((select) => {
      select.addEventListener('change', () => act('set_order_status', select.dataset.orderId, { p_status: select.value }));
    });
  }

  function viewPartners(target) {
    target.innerHTML = table(['Shop', 'Contact', 'Phone', 'Plan', 'City', 'Status', 'Actions'], state.board.rows.map((row) => [
      esc(row.shop_name || ''),
      esc(row.contact_name || ''),
      esc(row.phone || ''),
      esc(row.plan || 'starter'),
      esc(row.city || ''),
      pill(row.status),
      row.status === 'pending'
        ? `<button type="button" class="btn btn-green btn-sm" data-act="approve_partner" data-id="${esc(row.id)}">Approve</button>
           <button type="button" class="btn btn-red btn-sm" data-act="reject_partner" data-id="${esc(row.id)}">Reject</button>`
        : '',
    ]), 'No partner applications.');
  }

  function viewLogs(target) {
    target.innerHTML = table(['When', 'Admin', 'Action', 'Detail'], state.board.rows.map((row) => [
      esc(new Date(row.created_at).toLocaleString('en-GB')),
      esc(row.admin_user || 'system'),
      esc(row.action || ''),
      esc(shortDetail(row.details)),
    ]), 'Nothing logged yet.')
      + '<p style="font-size:11px;color:#9ca3af;margin-top:12px">The log lives in public.admin_audit_log and can only be written by the database. Clearing browser storage does not erase it.</p>';
  }

  // ── actions ───────────────────────────────────────────────────────
  const CONFIRM = {
    reject_listing: 'Reject this listing? The seller is told it was not approved.',
    remove_listing: 'Take this listing down from the marketplace?',
    ban_seller: 'Ban this seller? Their listings stop appearing.',
    delete_used: 'Delete this unit from the used inventory?',
    revoke_dealer: 'Revoke wholesale access for this dealer?',
    decline_promo: 'Decline this promotion request?',
  };

  const ID_PARAM = {
    approve_listing: 'p_listing_id',
    reject_listing: 'p_listing_id',
    remove_listing: 'p_listing_id',
    activate_promo: 'p_payment_id',
    decline_promo: 'p_payment_id',
    stop_promo: 'p_payment_id',
    unban_seller: 'p_seller_id',
    restock_used: 'p_used_id',
    delete_used: 'p_used_id',
    sold_used: 'p_used_id',
    verify_seller: 'p_seller_id',
    ban_seller: 'p_seller_id',
    approve_dealer: 'p_dealer_id',
    reject_dealer: 'p_dealer_id',
    revoke_dealer: 'p_dealer_id',
    set_order_status: 'p_order_id',
    approve_partner: 'p_partner_id',
    reject_partner: 'p_partner_id',
  };

  async function act(action, id, extra) {
    if (CONFIRM[action] && !window.confirm(CONIRM[action])) return false;
    const params = Object.assign({}, extra || {});
    const idKey = ID_PARAM[action];
    if (idKey) params[idKey] = id;
    try {
      await window.VDB.rpc.admin(action, params);
      toast('Done.');
      await load(state.section, document.querySelector(`.nav-item[data-page="${state.section}"]`));
      return true;
    } catch (error) {
      toast((error && error.message) || 'That action was refused.');
      return false;
    }
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest ? event.target.closest('[data-act]') : null;
    if (!trigger) return;
    const action = trigger.dataset.act;
    if (action === 'new_used') return openUsedForm();
    if (trigger.dataset.id) return act(action, trigger.dataset.id);
    return act(action, null);
  });

  // ── add a used unit ───────────────────────────────────────────────
  function openUsedForm() {
    $('modalTitle').textContent = 'List a unit on the UK/US board';
    $('modalBody').innerHTML = `
      <div style="padding:18px">
        <div class="fg-row">
          <div class="fg"><label for="uOrigin">Origin</label><select id="uOrigin"><option value="uk">UK used</option><option value="us">US used</option></select></div>
          <div class="fg"><label for="uBrand">Brand</label><input id="uBrand" maxlength="40" placeholder="Apple"></div>
        </div>
        <div class="fg"><label for="uName">Model and storage</label><input id="uName" maxlength="90" placeholder="iPhone 13 Pro Max 256GB"></div>
        <div class="fg-row">
          <div class="fg"><label for="uStorage">Storage</label><input id="uStorage" maxlength="20" placeholder="256GB"></div>
          <div class="fg"><label for="uColor">Colour</label><input id="uColor" maxlength="40" placeholder="Sierra Blue"></div>
        </div>
        <div class="fg-row">
          <div class="fg"><label for="uGrade">Grade</label><select id="uGrade"><option>A</option><option>B</option><option>C</option></select></div>
          <div class="fg"><label for="uBattery">Battery health %</label><input id="uBattery" type="number" min="40" max="100" value="85"></div>
        </div>
        <div class="fg-row">
          <div class="fg"><label for="uPrice">Selling price GH₵</label><input id="uPrice" type="number" min="1" max="2000000"></div>
          <div class="fg"><label for="uWas">Was price GH₵</label><input id="uWas" type="number" min="0" max="2000000"></div>
        </div>
        <div class="fg"><label for="uScreen">Screen</label><input id="uScreen" maxlength="90" placeholder="Perfect — no scratches"></div>
        <div class="fg"><label for="uBody">Body</label><input id="uBody" maxlength="90" placeholder="Minor wear on edges"></div>
        <div class="fg"><label for="uCharger">Charger / box</label><input id="uCharger" maxlength="90" placeholder="Cable included"></div>
        <div class="fg"><label for="uImages">Photo URLs (approved hosts, one per line)</label><textarea id="uImages" rows="3" placeholder="uploads/clean_13_promax.png"></textarea></div>
        <p id="usedErr" style="color:#dc2626;font-size:12px;font-weight:700;min-height:16px" role="alert" aria-live="polite"></p>
        <button type="button" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px" id="saveUsedBtn">Publish to board</button>
      </div>`;
    $('modal').classList.add('open');
    $('saveUsedBtn').addEventListener('click', async () => {
      const images = String($('uImages').value).split('\n').map((line) => window.VG.safeImageRef(line)).filter(Boolean).slice(0, 6);
      const item = {
        origin: $('uOrigin').value,
        brand: window.VG.cleanText($('uBrand').value, 40),
        name: window.VG.cleanText($('uName').value, 90),
        storage: window.VG.cleanText($('uStorage').value, 20),
        color: window.VG.cleanText($('uColor').value, 40),
        grade: $('uGrade').value,
        battery: window.VG.safeInteger($('uBattery').value, 40, 100, null),
        price: window.VG.safeDecimal($('uPrice').value, 1, 2000000, 0),
        was_price: window.VG.safeDecimal($('uWas').value, 0, 2000000, 0),
        screen: window.VG.cleanText($('uScreen').value, 90),
        body: window.VG.cleanText($('uBody').value, 90),
        charger: window.VG.cleanText($('uCharger').value, 90),
        images,
      };
      const problems = [];
      if (item.name.length < 4) problems.push('Give the unit a clear name.');
      if (!item.price) problems.push('Set a selling price.');
      if (!images.length) problems.push('Add at least one photo from an approved host.');
      if (problems.length) { $('usedErr').textContent = problems[0]; return; }
      const button = $('saveUsedBtn');
      button.disabled = true;
      try {
        await window.VDB.rpc.admin('upsert_used', { p_item: item });
        $('modal').classList.remove('open');
        toast('Published to the used board.');
        await load('used');
      } catch (error) {
        $('usedErr').textContent = (error && error.message) || 'The unit could not be saved.';
      } finally {
        button.disabled = false;
      }
    });
  }

  boot();
})();
