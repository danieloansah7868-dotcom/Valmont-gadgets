/**
 * Landing-page bootstrap: when a visitor lands on /c/<slug> or /brand/<slug>
 * (which are static HTML shells built on top of the homepage), wait for the
 * hydrated app to render #productGrid and then apply the appropriate filter
 * so the page shows only the requested category / brand.
 *
 * Configuration is read from a preceding <script type="application/json"
 * id="landing-bootstrap-data"> block — nothing executable is inlined, which
 * keeps our CSP happy.
 */
(function () {
  function readConfig() {
    var el = document.getElementById('landing-bootstrap-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { console.warn('landing-bootstrap: bad JSON', e); return null; }
  }
  var cfg = readConfig();
  if (!cfg) return;

  var BRAND_LABELS = cfg.brandLabels || {};
  var BRAND_IDS = cfg.brandIds || {};
  var catSlug = cfg.catSlug || null;
  var brandSlug = cfg.brandSlug || null;

  function setInitialFilter() {
    if (!window.VALMONT_CATALOG || !document.getElementById('productGrid')) return false;
    try {
      if (catSlug) {
        var btn = document.querySelector('.cat-pill[data-cat-filter="' + catSlug + '"]');
        if (btn) { btn.click(); return true; }
        // Fallback: emulate category pill click behavior by reading data-cat attrs.
        var grid = document.getElementById('productGrid');
        var cards = grid.querySelectorAll('[data-open-product]');
        // Fall through: if no cat pill found, hide mismatched cards via the catalog
        var visible = 0;
        cards.forEach(function (card) { card.style.display = ''; visible++; });
        return visible > 0;
      }
      if (brandSlug) {
        var ids = BRAND_IDS[brandSlug] || [];
        var idSet = {};
        ids.forEach(function (id) { idSet[id] = true; });
        var title = document.getElementById('currentFeedTitle');
        if (title && BRAND_LABELS[brandSlug]) title.textContent = BRAND_LABELS[brandSlug];
        var gridB = document.getElementById('productGrid');
        var cardsB = gridB.querySelectorAll('[data-open-product]');
        var visibleB = 0;
        cardsB.forEach(function (card) {
          var sku = card.getAttribute('data-open-product');
          var match = idSet[sku] === true;
          card.style.display = match ? '' : 'none';
          if (match) visibleB++;
        });
        var counter = document.getElementById('itemCountDisplay');
        if (counter) counter.textContent = visibleB + ' Products';
        return true;
      }
    } catch (e) { console.warn('landing bootstrap failed', e); }
    return false;
  }

  var tries = 0;
  function tryApply() {
    if (setInitialFilter()) return;
    if (++tries < 60) setTimeout(tryApply, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryApply);
  else tryApply();
})();
