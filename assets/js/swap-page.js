/**
 * Valmont Gadgets — Swap & Sell page controller
 *
 * Loaded as a classic script at the end of swap.html, so it may not be inline:
 * the production CSP is `script-src 'self'` with `script-src-attr 'none'`, and
 * scripts/build-production.mjs fails the build on inline scripts or on*
 * attributes. Every value that reaches markup goes through VG.esc, and every
 * write goes through VDB.rpc (a Postgres SECURITY DEFINER function).
 */
(function () {
  'use strict';

  const VGEsc = window.VG.escapeHtml.bind(window.VG);
  const PAGE_SIZE = 12;
  const AD_PLANS = [24, 72, 168, 720];

  const state = {
    user: null,
    browse: [],
    mine: [],
    leads: [],
    tab: 'all',
    filters: { brand: 'all', grade: 'all' },
    shown: PAGE_SIZE,
    promoHours: 24,
    promoListingId: '',
    interestListingId: '',
    interestListingModel: '',
    viewsSent: loadSeen(),
    loadError: '',
  };

  // ── tiny helpers ──────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const on = (id, type, handler) => {
    const el = $(id);
    if (el) el.addEventListener(type, handler);
    return el;
  };
  const esc = VGEsc;
  const text = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const show = (id, visible) => { const el = $(id); if (el) el.style.display = visible ? '' : 'none'; };
  const modal = (id, open) => { const el = $(id); if (el) el.classList[open ? 'add' : 'remove']('open'); };
  const cedis = (value) => `GH₵ ${Number(value || 0).toLocaleString('en-GH')}`;
  const value = (id) => String($(id) ? $(id).value : '').trim();
  const timeAgo = (iso) => {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return 'recently';
    const hours = Math.floor((Date.now() - then) / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  function loadSeen() {
    const seen = window.VG.storage.get('vg_swap_viewed', []);
    return Array.isArray(seen) ? seen : [];
  }

  function markViewed(id) {
    if (state.viewsSent.indexOf(id) !== -1) return false;
    state.viewsSent.push(id);
    window.VG.storage.set('vg_swap_viewed', state.viewsSent.slice(-200));
    return true;
  }

  let toastTimer = null;
  function toast(message) {
    const box = $('toast');
    const msg = $('toastMsg');
    if (!box || !msg) return;
    msg.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 3600);
  }

  function fail(id, error) {
    const el = $(id);
    if (el) el.textContent = (error && error.message) || 'Something went wrong. Please try again.';
  }

  function clearError(id) {
    const el = $(id);
    if (el) el.textContent = '';
  }

  // ── views ─────────────────────────────────────────────────────────
  function showView(view) {
    show('authView', view === 'auth');
    show('dashView', view === 'dash');
    show('browseView', view === 'browse');
    const signedIn = view === 'dash';
    show('quickActions', signedIn || view === 'browse');
  }

  // ── auth ──────────────────────────────────────────────────────────
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach((other) => other.classList.remove('on'));
      tab.classList.add('on');
      const signingIn = tab.dataset.auth === 'signin';
      show('signinForm', signingIn);
      show('signupForm', !signingIn);
      clearError('authErr');
    });
  });

  on('signinBtn', 'click', async () => {
    clearError('authErr');
    const button = $('signinBtn');
    const email = value('authEmail');
    const password = value('authPass');
    if (!email || !password) return fail('authErr', { message: 'Enter your email and password.' });
    if (button) button.disabled = true;
    try {
      state.user = await window.VDB.auth.signin(email, password);
      window.VG.resetAttempts('swap_login');
      if (password) $('authPass').value = '';
      toast(`Welcome back, ${state.user.name.split(' ')[0]}!`);
      await refresh();
    } catch (error) {
      fail('authErr', error);
    } finally {
      if (button) button.disabled = false;
    }
  });

  on('signupBtn', 'click', async () => {
    clearError('authErr');
    const button = $('signupBtn');
    const input = {
      name: window.VG.cleanText(value('suName'), 80),
      email: value('suEmail').toLowerCase(),
      phone: value('suPhone'),
      password: value('suPass'),
      city: window.VG.cleanText(value('suCity'), 60),
      ghanaCard: value('suGhanaCard').toUpperCase(),
    };
    const errors = [];
    if (input.name.length < 3) errors.push('Enter your full name.');
    if (!window.VG.isValidEmail(input.email)) errors.push('Enter a valid email address.');
    if (!window.VG.isValidGhanaPhone(input.phone)) errors.push('Enter a Ghana phone number, e.g. 0241234567.');
    if (!window.VG.hasUsablePassword(input.password)) errors.push('Password needs 8+ characters including a number.');
    if (!input.city) errors.push('Enter your city.');
    if (!window.VG.isValidGhanaCard(input.ghanaCard)) errors.push('Ghana Card format should be GHA-123456789-0.');
    if (errors.length) return fail('authErr', { message: errors[0] });
    if (!window.VG.canPerform('swap_signup', 3, 3600000)) {
      return fail('authErr', { message: 'Too many sign-up attempts from this device. Please try again in an hour.' });
    }

    if (button) button.disabled = true;
    try {
      const result = await window.VDB.auth.signup(input);
      ['suName', 'suEmail', 'suPhone', 'suPass', 'suCity', 'suGhanaCard'].forEach(clearInput);
      if (!result.confirmed) {
        document.querySelectorAll('.auth-tab')[0].click();
        return toast('Account created. Confirm your email link, then sign in to list.');
      }
      state.user = result.user;
      toast('Account created. Add your first listing to get leads.');
      await refresh();
    } catch (error) {
      fail('authErr', error);
    } finally {
      if (button) button.disabled = false;
    }
  });

  function clearInput(id) {
    const el = $(id);
    if (el) el.value = '';
  }

  on('logoutBtn', 'click', async () => {
    await window.VDB.auth.signout();
    state.user = null;
    state.mine = [];
    state.leads = [];
    toast('Signed out.');
    await refresh();
  });

  // ── data ──────────────────────────────────────────────────────────
  async function refresh() {
    await Promise.all([renderBrowse(), state.user ? renderDashboard() : Promise.resolve()]);
    if (state.user) showView('dash');
    else showView('browse');
  }

  function browseRows() {
    let rows = state.browse.slice();
    if (state.tab === 'swap') rows = rows.filter((l) => l.type === 'swap' || l.type === 'both');
    else if (state.tab === 'sell') rows = rows.filter((l) => l.type === 'sell' || l.type === 'both');
    else if (state.tab === 'matches') {
      const wanted = state.mine
        .filter((l) => l.status === 'active')
        .map((l) => String(l.model || '').toLowerCase().split(' ')[0])
        .filter((word) => word.length > 2);
      rows = rows.filter((l) => {
        if (state.user && l.sellerName === state.user.name) return false;
        const want = String(l.want || '').toLowerCase();
        return want.length > 0 && wanted.some((word) => want.indexOf(word) !== -1);
      });
    }
    if (state.filters.brand !== 'all') rows = rows.filter((l) => brandKey(l.brand) === state.filters.brand);
    if (state.filters.grade !== 'all') rows = rows.filter((l) => l.grade === state.filters.grade);
    return rows;
  }

  function brandKey(brand) {
    const b = String(brand || '').toLowerCase();
    if (b.indexOf('apple') !== -1) return 'apple';
    if (b.indexOf('samsung') !== -1) return 'samsung';
    if (b.indexOf('google') !== -1 || b.indexOf('pixel') !== -1) return 'google';
    return 'other';
  }

  async function renderBrowse() {
    const status = $('browseStatus');
    if (status) {
      status.className = 'browse-status';
      status.textContent = 'Loading listings…';
      show('loadMoreWrap', false);
      show('browseEmpty', false);
    }
    let rows;
    try {
      rows = await window.VGA.swap.browse();
      state.browse = rows;
      state.loadError = '';
    } catch (error) {
      state.browse = [];
      state.loadError = (error && error.message) || '';
      if (status) {
        status.className = 'browse-status err';
        status.innerHTML = `${esc(state.loadError || 'Listings are unavailable right now.')} <button type="button" id="browseRetry">Try again</button>`;
        const retry = $('browseRetry');
        if (retry) retry.addEventListener('click', renderBrowse);
      }
      $('browseGrid').innerHTML = '';
      renderStats();
      return;
    }

    const grid = $('browseGrid');
    const visible = rows.slice(0, state.shown);
    if (!visible.length) {
      grid.innerHTML = '';
      show('loadMoreWrap', false);
      show('browseEmpty', true);
      if (status) { status.className = 'browse-status'; status.textContent = rows.length ? 'No listings match these filters.' : 'No approved listings yet. Yours could be the first.'; }
    } else {
      show('browseEmpty', false);
      if (status) { status.className = 'browse-status'; status.textContent = `${rows.length} approved listing${rows.length === 1 ? '' : 's'} • reviewed by Valmont before going live`; }
      grid.innerHTML = visible.map((listing) => cardHtml(listing, false)).join('');
      show('loadMoreWrap', rows.length > state.shown);
    }
    renderStats();
    renderPromo();
  }

  function renderStats() {
    const all = state.browse;
    text('hTotal', all.length);
    text('hSwaps', all.filter((l) => l.type === 'swap' || l.type === 'both').length);
    text('hSells', all.filter((l) => l.type === 'sell' || l.type === 'both').length);
    text('hVerified', all.filter((l) => l.verified).length);
    text('cAll', all.length);
    text('cSwap', all.filter((l) => l.type === 'swap' || l.type === 'both').length);
    text('cSell', all.filter((l) => l.type === 'sell' || l.type === 'both').length);
    text('cMatch', state.tab === 'matches' ? browseRows().length : all.length);
  }

  function renderPromo() {
    const promoted = state.browse.filter((l) => l.promoted).slice(0, 4);
    show('promoSection', promoted.length > 0);
    if (!promoted.length) return;
    $('promoItems').innerHTML = promoted.map((listing) => {
      const image = listing.images[0] || listing.fallbackImage;
      return `<button type="button" class="promo-item" data-action="jump" data-id="${esc(listing.id)}">
        <img src="${esc(image)}" alt="" loading="lazy" width="48" height="48">
        <span>
          <span class="pi-name">${esc(listing.model)}</span>
          <span class="pi-price">${esc(listing.price ? cedis(listing.price) : 'Swap')}</span>
          <span class="pi-type">${esc(listing.type === 'swap' ? '🔄 Swap' : listing.type === 'sell' ? '💰 Sale' : '🔄💰 Both')}</span>
        </span>
      </button>`;
    }).join('');
  }

  function galleryHtml(listing) {
    const images = listing.images.length ? listing.images : [listing.fallbackImage];
    const slides = images.map((src, index) => `<img src="${esc(src)}" alt="${esc(listing.model)} photo ${index + 1}" loading="lazy" class="${index ? 'hid' : ''}" data-index="${index}" width="280" height="180">`).join('');
    if (images.length < 2) return `<div class="ig">${slides}</div>`;
    const dots = images.map((_, index) => `<span class="ig-dot${index ? '' : ' on'}" data-gi="${index}"></span>`).join('');
    return `<div class="ig" data-count="${images.length}" data-active="0">
      ${slides}
      <span class="ig-arr l" data-step="-1" role="button" tabindex="0" aria-label="Previous photo">‹</span>
      <span class="ig-arr r" data-step="1" role="button" tabindex="0" aria-label="Next photo">›</span>
      <div class="ig-dots">${dots}</div>
      <span class="ig-ctr">1/${images.length}</span>
    </div>`;
  }

  function cardHtml(listing, isOwner) {
    const grade = listing.grade ? `<span class="bdg bdg-grade-${listing.grade.toLowerCase()}">Grade ${esc(listing.grade)}</span>` : '';
    const typeBadge = listing.type === 'swap'
      ? '<span class="bdg bdg-swap">🔄 Swap</span>'
      : listing.type === 'sell' ? '<span class="bdg bdg-sell">💰 For Sale</span>' : '<span class="bdg bdg-swap">🔄💰 Both</span>';
    const promo = listing.promoted ? '<span class="bdg bdg-promo">⭐ Promoted</span>' : '';
    const verified = listing.verified ? '<span class="bdg bdg-verified">✓ Verified</span>' : '';
    const conditions = [];
    if (listing.screen) conditions.push(`<div class="cr"><span class="cl">Screen:</span>${esc(listing.screen)}</div>`);
    if (listing.body) conditions.push(`<div class="cr"><span class="cl">Body:</span>${esc(listing.body)}</div>`);
    if (listing.included) conditions.push(`<div class="cr"><span class="cl">Includes:</span>${esc(listing.included)}</div>`);
    const budget = listing.budgetMin || listing.budgetMax
      ? `<div style="font-size:12px;color:#374151;margin-bottom:8px"><b>Budget:</b> ${esc(listing.budgetMin ? cedis(listing.budgetMin) : 'Open')}${esc(listing.budgetMax ? ` — ${cedis(listing.budgetMax)}` : '')} <span style="font-size:10px;color:#6b7280">(gadget + cash)</span></div>`
      : '';
    const actions = isOwner
      ? `<button type="button" class="btn btn-outline" data-action="promote" data-id="${esc(listing.id)}">${listing.promoted ? '⭐ Promoted' : '☆ Promote'}</button>
         <button type="button" class="btn btn-outline" data-action="close-listing" data-id="${esc(listing.id)}">${listing.status === 'sold' ? 'Reopen' : 'Mark sold'}</button>
         <button type="button" class="btn btn-outline" data-action="remove" data-id="${esc(listing.id)}">Remove</button>`
      : `<button type="button" class="btn btn-orange" data-action="interest" data-id="${esc(listing.id)}" data-model="${esc(listing.model)}">💬 Message seller</button>`;
    const statusNote = isOwner && listing.status !== 'active'
      ? `<div style="font-size:11px;font-weight:800;color:${listing.status === 'pending' ? '#92400e' : '#6b7280'};margin-bottom:8px">${esc(statusCopy(listing.status))}</div>`
      : '';

    return `<article class="sc${listing.promoted ? ' promoted' : ''}" data-listing="${esc(listing.id)}">
      <div class="sc-img">${galleryHtml(listing)}<div class="sc-badges">${typeBadge}${grade}${promo}${verified}</div></div>
      <div class="sc-body">
        <h3>${esc(listing.model)}</h3>
        <div class="sc-meta">${esc(listing.storage)}${listing.color ? ` • ${esc(listing.color)}` : ''}${listing.battery ? ` • 🔋 ${esc(listing.battery)}%` : ''}${listing.city ? ` • ${esc(listing.city)}` : ''} • ${esc(timeAgo(listing.date))}</div>
        ${statusNote}
        ${conditions.length ? `<div class="sc-cond">${conditions.join('')}</div>` : ''}
        ${listing.want ? `<div class="sc-want"><b>Looking for:</b> ${esc(listing.want)}</div>` : ''}
        ${budget}
        ${listing.price ? `<div class="sc-price"><span class="cur">${esc(cedis(listing.price))}</span></div>` : ''}
        ${listing.notes ? `<div style="font-size:11px;color:#9ca3af;margin-bottom:10px">${esc(listing.notes)}</div>` : ''}
        <div class="sc-actions">${actions}</div>
      </div>
      <div class="sc-footer"><span>${esc(listing.sellerName)}${listing.verified ? ' ✓' : ''}</span><span>👁 ${esc(listing.views || 0)} views</span></div>
    </article>`;
  }

  function statusCopy(status) {
    if (status === 'pending') return 'Awaiting Valmont review — buyers cannot see this yet.';
    if (status === 'sold') return 'Marked sold/swapped.';
    if (status === 'removed') return 'Removed from the marketplace.';
    if (status === 'rejected') return 'Rejected by Valmont review.';
    return '';
  }

  // ── dashboard ─────────────────────────────────────────────────────
  async function renderDashboard() {
    if (!state.user) return;
    text('dashName', String(state.user.name || 'Seller').split(' ')[0]);
    try {
      const [listings, leads] = await Promise.all([
        window.VGA.swap.mine().catch(() => []),
        window.VGA.swap.leads().catch(() => []),
      ]);
      state.mine = listings;
      state.leads = leads;
    } catch (error) {
      state.mine = [];
      state.leads = [];
    }

    const active = state.mine.filter((l) => l.status === 'active');
    text('dsActive', active.length);
    text('dsLeads', state.leads.filter((l) => l.status === 'new').length);
    text('dsSold', state.mine.filter((l) => l.status === 'sold').length);
    text('dsViews', state.mine.reduce((sum, l) => sum + (l.views || 0), 0));

    const grid = $('myListingsGrid');
    if (!state.mine.length) {
      grid.innerHTML = '';
      show('myEmpty', true);
    } else {
      show('myEmpty', false);
      grid.innerHTML = state.mine.map((listing) => cardHtml(listing, true)).join('');
    }

    const list = $('leadsList');
    if (!state.leads.length) {
      list.innerHTML = '';
      show('leadsEmpty', true);
    } else {
      show('leadsEmpty', false);
      list.innerHTML = state.leads.map((lead) => {
        const waNumber = window.VG.toWhatsAppNumber(lead.buyerPhone);
        const reply = waNumber
          ? `<a class="lc-btn" style="background:#25d366;color:#fff;text-decoration:none" href="https://wa.me/${esc(waNumber)}?text=${encodeURIComponent(`Hi ${lead.buyerName}! Thanks for your interest in my ${lead.listingModel}.`)}</a>`
          : '';
        return `<div class="lead-card">
          <img src="${esc(lead.listingImage)}" alt="" loading="lazy" width="50" height="50">
          <div class="lc-info">
            <div class="lc-name">${esc(lead.buyerName)} — ${esc(lead.listingModel)}</div>
            <div class="lc-msg">${esc(lead.message)}</div>
            <div class="lc-time">${esc(lead.date)} • ${lead.status === 'new' ? '🆕 New' : '✅ Replied'}</div>
          </div>
          <div class="lc-actions">${reply}</div>
        </div>`;
      }).join('');
    }
  }

  // ── listing form ──────────────────────────────────────────────────
  on('newListingBtn', 'click', () => openListingForm('swap'));
  on('quickListBtn', 'click', () => {
    if (!state.user) { showView('auth'); toast('Sign in to list your gadget.'); return; }
    openListingForm('swap');
  });

  function openListingForm(type) {
    const select = $('lType');
    if (select) {
      select.value = type;
      select.dispatchEvent(new Event('change'));
    }
    modal('listingModal', true);
  }

  on('closeListingModal', 'click', () => modal('listingModal', false));
  on('lType', 'change', () => {
    const type = value('lType');
    show('wantField', type !== 'sell');
    show('priceField', type !== 'swap');
  });

  on('submitListingBtn', 'click', async () => {
    const button = $('submitListingBtn');
    clearError('listingErr');
    if (!state.user) { showView('auth'); toast('Sign in first to create a listing.'); return; }
    const agree = $('agreeTerms');
    if (agree && !agree.checked) return fail('listingErr', { message: 'Tick the terms before submitting.' });

    const photos = String($('lPhotos') ? $('lPhotos').value : '')
      .split('\n')
      .map((line) => window.VG.safeImageRef(line))
      .filter(Boolean)
      .slice(0, 6);

    const type = value('lType');
    const listing = {
      type,
      category: value('lCategory') || 'phones',
      brand: window.VG.cleanText(value('lBrand'), 40),
      model: window.VG.cleanText(value('lModel'), 90),
      storage: window.VG.cleanText(value('lStorage'), 20),
      color: window.VG.cleanText(value('lColor'), 40),
      grade: value('lGrade'),
      battery: window.VG.safeInteger(value('lBattery'), 40, 100, null),
      screen: value('lScreen'),
      body: value('lBody'),
      included: window.VG.cleanText(value('lIncluded'), 160),
      want: type === 'sell' ? '' : window.VG.cleanText(value('lWant'), 400),
      price: type === 'swap' ? null : window.VG.safeInteger(value('lPrice'), 1, 2000000, null),
      budgetMin: window.VG.safeInteger(value('lBudgetMin'), 0, 2000000, null),
      budgetMax: window.VG.safeInteger(value('lBudgetMax'), 0, 2000000, null),
      notes: window.VG.cleanText(value('lNotes'), 400),
      images: photos,
    };

    const problems = [];
    if (!listing.brand) problems.push('Choose a brand.');
    if (listing.model.length < 3) problems.push('Give the item a clear model name.');
    if (!listing.storage) problems.push('Choose storage.');
    if (!['A', 'B', 'C'].includes(listing.grade)) problems.push('Choose a condition grade.');
    if (!listing.screen) problems.push('Describe the screen.');
    if (!listing.body) problems.push('Describe the body.');
    if (type !== 'sell' && listing.want.length < 5) problems.push('Say what you want in return.');
    if (type !== 'swap' && !listing.price) problems.push('Add an asking price.');
    if (listing.budgetMin && listing.budgetMax && listing.budgetMax < listing.budgetMin) problems.push('Budget max is below budget min.');
    if (problems.length) return fail('listingErr', { message: problems[0] });
    if (!window.VG.canPerform('swap_listing', 5, 3600000)) {
      return fail('listingErr', { message: 'You have posted 5 listings this hour. Please try again later.' });
    }

    if (button) button.disabled = true;
    try {
      await window.VGA.swap.create(listing);
      modal('listingModal', false);
      ['lModel', 'lColor', 'lIncluded', 'lWant', 'lPrice', 'lBattery', 'lBudgetMin', 'lBudgetMax', 'lPhotos', 'lNotes'].forEach(clearInput);
      if (agree) agree.checked = false;
      toast('Listing submitted for review. It appears once Valmont approves it.');
      await refresh();
    } catch (error) {
      fail('listingErr', error);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // ── delegated card actions (no inline handlers) ───────────────────
  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!trigger) return;
    const action = trigger.dataset.action;
    const id = trigger.dataset.id;

    if (action === 'jump') {
      const grid = $('browseGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (action === 'interest') { openInterest(id, trigger.dataset.model); return; }
    if (action === 'promote') { openPromotion(id); return; }
    if (action === 'close-listing') { await changeStatus(id, currentStatus(id) === 'sold' ? 'active' : 'sold'); return; }
    if (action === 'remove') {
      if (!window.confirm('Remove this listing from the marketplace?')) return;
      await changeStatus(id, 'removed');
    }
  });

  function currentStatus(id) {
    const listing = state.mine.find((l) => l.id === id);
    return listing ? listing.status : '';
  }

  async function changeStatus(id, status) {
    try {
      await window.VGA.swap.setStatus(id, status);
      toast(status === 'removed' ? 'Listing removed.' : status === 'sold' ? 'Marked sold/swapped.' : 'Listing reopened.');
      await refresh();
    } catch (error) {
      toast(error.message || 'Could not update that listing.');
    }
  }

  // ── gallery navigation ────────────────────────────────────────────
  document.addEventListener('click', (event) => {
    const frame = event.target.closest ? event.target.closest('.ig') : null;
    if (!frame) return;
    const count = Number(frame.dataset.count || 0);
    if (count < 2) return;
    const arrow = event.target.closest('.ig-arr');
    const dot = event.target.closest('.ig-dot');
    if (!arrow && !dot) return;
    let index = Number(frame.dataset.active || 0);
    if (arrow) index = (index + Number(arrow.dataset.step) + count) % count;
    if (dot) index = Number(dot.dataset.gi || 0);
    frame.dataset.active = String(index);
    frame.querySelectorAll('img').forEach((img, i) => img.classList.toggle('hid', i !== index));
    frame.querySelectorAll('.ig-dot').forEach((el, i) => el.classList.toggle('on', i !== index));
    const counter = frame.querySelector('.ig-ctr');
    if (counter) counter.textContent = `${index + 1}/${count}`;
  });

  // ── interest / lead ───────────────────────────────────────────────
  function openInterest(id, model) {
    if (!state.user) { showView('auth'); toast('Sign in to message a seller.'); return; }
    if (markViewed(id)) window.VGA.swap.recordView(id).catch(() => { /* non-critical */ });
    state.interestListingId = id;
    state.interestListingModel = model || 'this listing';
    const field = $('interestListingName');
    if (field) field.value = state.interestListingModel;
    const message = $('interestMessage');
    if (message) message.value = '';
    clearError('interestErr');
    modal('interestModal', true);
  }

  on('closeInterestModal', 'click', () => modal('interestModal', false));

  on('sendInterestBtn', 'click', async () => {
    const button = $('sendInterestBtn');
    clearError('interestErr');
    const message = window.VG.cleanText(value('interestMessage'), 600);
    if (message.length < 5) return fail('interestErr', { message: 'Write a short message for the seller.' });
    if (!window.VG.canPerform('swap_lead', 10, 3600000)) {
      return fail('interestErr', { message: 'You have sent 10 messages this hour. Please wait a bit.' });
    }
    if (button) button.disabled = true;
    try {
      await window.VGA.swap.expressInterest(state.interestListingId, message);
      modal('interestModal', false);
      toast('Sent. The seller sees your message in their dashboard.');
    } catch (error) {
      fail('interestErr', error);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // ── promotion request ─────────────────────────────────────────────
  function openPromotion(id) {
    const listing = state.mine.find((l) => l.id === id) || state.browse.find((l) => l.id === id);
    if (!listing) return;
    if (listing.promoted) { toast('This listing is already promoted.'); return; }
    state.promoListingId = id;
    state.promoHours = 24;
    text('promoTargetName', listing.model || 'Your listing');
    updatePromoSummary();
    document.querySelectorAll('#promoPlans .ad-plan').forEach((plan) => {
      const on24 = plan.dataset.hours === '24';
      plan.classList.toggle('on', on24);
      plan.setAttribute('aria-checked', on24 ? 'true' : 'false');
    });
    clearError('promoErr');
    modal('promoModal', true);
  }

  on('closePromoModal', 'click', () => modal('promoModal', false));

  document.querySelectorAll('#promoPlans .ad-plan').forEach((plan) => {
    plan.addEventListener('click', () => {
      document.querySelectorAll('#promoPlans .ad-plan').forEach((other) => {
        other.classList.remove('on');
        other.setAttribute('aria-checked', 'false');
      });
      plan.classList.add('on');
      plan.setAttribute('aria-checked', 'true');
      state.promoHours = Number(plan.dataset.hours);
      updatePromoSummary();
    });
  });

  function updatePromoSummary() {
    // The displayed price mirrors the server-side schedule; the RPC prices the
    // request itself so a tampered page cannot change what is charged.
    const index = AD_PLANS.indexOf(state.promoHours);
    const prices = [15, 35, 60, 150];
    text('promoSummaryPrice', cedis(index >= 0 ? prices[index] : prices[0]));
  }

  on('submitPromoBtn', 'click', async () => {
    const button = $('submitPromoBtn');
    clearError('promoErr');
    if (!state.promoListingId) return fail('promoErr', { message: 'Choose a listing to promote.' });
    if (!window.VG.canPerform('swap_promo', 5, 3600000)) {
      return fail('promoErr', { message: 'Too many promotion requests. Please try again later.' });
    }
    if (button) button.disabled = true;
    try {
      const result = await window.VGA.swap.promote(state.promoListingId, state.promoHours);
      modal('promoModal', false);
      const amount = result && result.amount ? cedis(result.amount) : 'the quoted price';
      toast(`Request sent. Pay ${amount} on Valmont Pay or at the Accra store — the boost starts once payment is recorded.`);
      await refresh();
    } catch (error) {
      fail('promoErr', error);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // ── tabs, filters, paging ─────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((other) => other.classList.remove('active'));
      tab.classList.add('active');
      state.tab = tab.dataset.tab;
      state.shown = PAGE_SIZE;
      renderBrowse();
    });
  });

  document.querySelectorAll('.fc').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.f;
      document.querySelectorAll(`.fc[data-f="${key}"]`).forEach((other) => other.classList.remove('on'));
      chip.classList.add('on');
      state.filters[key] = chip.dataset.v;
      state.shown = PAGE_SIZE;
      renderBrowse();
    });
  });

  on('loadMoreBtn', 'click', () => {
    state.shown += PAGE_SIZE;
    renderBrowse();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    ['listingModal', 'promoModal', 'interestModal'].forEach((id) => modal(id, false));
  });

  // ── boot ──────────────────────────────────────────────────────────
  async function boot() {
    try {
      state.user = await window.VDB.auth.current();
    } catch (error) {
      state.user = null;
    }
    await refresh();
  }

  boot();
})();
