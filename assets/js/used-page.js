/**
 * Valmont Gadgets — UK & US Used board
 *
 * The board is a read-only projection: `get_used_inventory()` returns only the
 * units that are physically in the shop and not marked sold. There is no
 * seeded sample stock — a shopper must never be able to "order" a phone that a
 * human never listed. Classic script (CSP forbids inline JS) at the end of
 * used.html.
 */
(function () {
  'use strict';

  const SUPPORT_WHATSAPP = '233542451578';
  const PAGE_SIZE = 12;
  const REFRESH_HOUR = 8; // stock board is republished each morning at 08:00 GMT

  const state = {
    rows: [],
    tab: 'all',
    filters: { brand: 'all', storage: 'all', battery: 'all', grade: 'all' },
    shown: PAGE_SIZE,
    error: '',
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => window.VG.escapeHtml(value);
  const cedis = (value) => `GH₵ ${Number(value || 0).toLocaleString('en-GH')}`;
  const show = (id, visible) => { const el = $(id); if (el) el.style.display = visible ? '' : 'none'; };

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

  function storageGb(row) {
    const match = /(\d+)\s*(tb|gb)/i.exec(String(row.storage || ''));
    if (!match) return 0;
    return Number(match[1]) * (match[2].toLowerCase() === 'tb' ? 1024 : 1);
  }

  function filtered() {
    let rows = state.rows.slice();
    if (state.tab === 'uk' || state.tab === 'us') rows = rows.filter((r) => r.origin === state.tab);
    if (state.filters.brand !== 'all') rows = rows.filter((r) => String(r.brand).toLowerCase() === state.filters.brand);
    if (state.filters.storage !== 'all') rows = rows.filter((r) => storageGb(r) === Number(state.filters.storage));
    if (state.filters.battery !== 'all') rows = rows.filter((r) => Number(r.battery || 0) >= Number(state.filters.battery));
    if (state.filters.grade !== 'all') rows = rows.filter((r) => r.grade === state.filters.grade);
    return rows;
  }

  async function load() {
    const status = $('boardStatus');
    if (status) { status.className = 'board-status'; status.textContent = 'Loading today’s board…'; }
    let rows;
    try {
      rows = await window.VGA.used.inventory(state.tab === 'uk' || state.tab === 'us' ? state.tab : null);
      state.rows = rows;
      state.error = '';
    } catch (error) {
      state.rows = [];
      state.error = (error && error.message) || 'The stock board is unavailable right now.';
    }
    render();
  }

  function render() {
    const grid = $('usedGrid');
    const status = $('boardStatus');
    const rows = filtered();

    const weekAgo = Date.now() - 7 * 86400000;
    $('statAvailable').textContent = state.rows.length;
    $('statNew').textContent = state.rows.filter((r) => new Date(r.date).getTime() >= weekAgo).length;
    $('statRefresh').textContent = lastUpdateLabel();

    $('countAll').textContent = state.rows.length;
    $('countUK').textContent = state.rows.filter((r) => r.origin === 'uk').length;
    $('countUS').textContent = state.rows.filter((r) => r.origin === 'us').length;

    if (state.error) {
      grid.innerHTML = '';
      show('loadMoreWrap', false);
      show('emptyState', false);
      status.className = 'board-status err';
      status.innerHTML = `${esc(state.error)} <button type="button" id="boardRetry">Retry</button>`;
      const retry = $('boardRetry');
      if (retry) retry.addEventListener('click', load);
      return;
    }

    if (!rows.length) {
      grid.innerHTML = '';
      show('loadMoreWrap', false);
      show('emptyState', true);
      status.className = 'board-status';
      status.textContent = state.rows.length
        ? `${rows.length} of ${state.rows.length} units match these filters.`
        : 'Inspected units appear here as soon as the team lists them.';
      return;
    }

    show('emptyState', false);
    const visible = rows.slice(0, state.shown);
    grid.innerHTML = visible.map(cardHtml).join('');
    show('loadMoreWrap', rows.length > state.shown);
    status.className = 'board-status';
    status.textContent = `${rows.length} unit${rows.length === 1 ? '' : 's'} available • every unit is inspected in Accra before it is listed`;
  }

  function lastUpdateLabel() {
    const dates = state.rows.map((r) => new Date(r.date).getTime()).filter(Number.isFinite);
    if (!dates.length) return '—';
    const newest = new Date(Math.max.apply(null, dates));
    const days = Math.floor((Date.now() - newest.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  function batteryClass(battery) {
    const n = Number(battery || 0);
    if (n >= 90) return 'bh-high';
    if (n >= 80) return 'bh-mid';
    return 'bh-low';
  }

  function cardHtml(row) {
    const images = row.images.length ? row.images : [row.fallbackImage];
    const slides = images.map((src, index) =>
      `<img src="${esc(src)}" alt="${esc(row.name)} — photo ${index + 1}" loading="lazy" class="${index ? 'hidden' : ''}" width="320" height="200">`).join('');
    const multi = images.length > 1;
    const arrows = multi
      ? '<span class="img-arrow left" data-step="-1" role="button" tabindex="0" aria-label="Previous photo">‹</span><span class="img-arrow right" data-step="1" role="button" tabindex="0" aria-label="Next photo">›</span>'
      : '';
    const dots = multi
      ? `<div class="img-dots">${images.map((_, index) => `<span class="img-dot${index ? '' : ' active'}" data-index="${index}"></span>`).join('')}</div>`
      : '';
    const counter = multi ? `<span class="img-counter">1/${images.length}</span>` : '';

    const conditions = [row.screen, row.body, row.charger].filter(Boolean)
      .map((line) => `<div class="cond-row">${esc(line)}</div>`).join('');
    const discount = row.was && row.price && row.was > row.price
      ? `<span class="pct">${Math.round((1 - row.price / row.was) * 100)}%</span>` : '';
    const isNew = new Date(row.date).getTime() > Date.now() - 2 * 86400000;
    const question = encodeURIComponent(`Hi Valmont! Is the ${row.name} (${row.storage}, Grade ${row.grade}) from your UK/US used board still available?`);

    return `<article class="prod-card" data-used="${esc(row.id)}">
      <div class="prod-img">
        <div class="img-gallery" data-count="${images.length}" data-cur="0">
          ${slides}${arrows}${dots}${counter}
        </div>
        <div class="prod-badges">
          <span class="badge badge-${esc(row.origin)}">${row.origin === 'uk' ? '🇬🇧 UK Used' : '🇺🇸 US Used'}</span>
          ${row.grade ? `<span class="badge badge-grade-${esc(row.grade.toLowerCase())}">Grade ${esc(row.grade)}</span>` : ''}
          ${isNew ? '<span class="badge badge-new-arrival">New arrival</span>' : ''}
        </div>
      </div>
      <div class="prod-body">
        <h3>${esc(row.name)}</h3>
        <div class="prod-specs">${esc(row.storage)}${row.color ? ` • ${esc(row.color)}` : ''}</div>
        <div class="prod-battery">🔋 ${esc(row.battery || '—')}%
          <div class="bar"><div class="bar-fill ${batteryClass(row.battery)}" style="width:${esc(Math.max(0, Math.min(Number(row.battery || 0), 100)))}%"></div></div>
        </div>
        ${conditions ? `<div class="condition-details">${conditions}</div>` : ''}
        <div class="prod-price">
          <span class="current">${esc(cedis(row.price))}</span>
          ${row.was > row.price ? `<span class="old">${esc(cedis(row.was))}</span>` : ''}
          ${discount}
        </div>
        <div class="prod-actions">
          <a class="btn-buy wa" href="https://wa.me/${esc(SUPPORT_WHATSAPP)}?text=${question}" target="_blank" rel="noopener">Ask about this unit</a>
        </div>
      </div>
      <div class="prod-footer">
        <span>${row.origin === 'uk' ? 'UK' : 'US'} Used • Grade ${esc(row.grade || '—')}</span>
        <span>✅ Available</span>
      </div>
    </article>`;
  }

  // ── interactions ──────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((other) => other.classList.remove('active'));
      tab.classList.add('active');
      state.tab = tab.dataset.tab;
      state.shown = PAGE_SIZE;
      load();
    });
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.filter;
      document.querySelectorAll(`.filter-chip[data-filter="${key}"]`).forEach((other) => other.classList.remove('active'));
      chip.classList.add('active');
      state.filters[key] = chip.dataset.val;
      state.shown = PAGE_SIZE;
      render();
    });
  });

  const loadMore = $('loadMoreBtn');
  if (loadMore) loadMore.addEventListener('click', () => { state.shown += PAGE_SIZE; render(); toast('Showing more units.'); });

  // Gallery navigation, delegated so it survives re-renders.
  document.addEventListener('click', (event) => {
    const gallery = event.target.closest ? event.target.closest('.img-gallery') : null;
    if (!gallery) return;
    const count = Number(gallery.dataset.count || 0);
    if (count < 2) return;
    const arrow = event.target.closest('.img-arrow');
    const dot = event.target.closest('.img-dot');
    if (!arrow && !dot) return;
    let index = Number(gallery.dataset.cur || 0);
    if (arrow) index = (index + Number(arrow.dataset.step) + count) % count;
    if (dot) index = Number(dot.dataset.index || 0);
    gallery.dataset.cur = String(index);
    gallery.querySelectorAll('img').forEach((img, i) => img.classList.toggle('hidden', i !== index));
    gallery.querySelectorAll('.img-dot').forEach((el, i) => el.classList.toggle('active', i !== index));
    const label = gallery.querySelector('.img-counter');
    if (label) label.textContent = `${index + 1}/${count}`;
  });

  load();
})();
