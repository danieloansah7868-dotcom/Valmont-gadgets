/**
 * assets/js/seo-links.js
 *
 * Progressive enhancement for the new static landing pages at /c/<slug> and
 * /brand/<slug>. Desktop category pills and mobile chips now render as
 * real <a href="/c/<slug>"> elements so crawlers discover the new URLs and
 * link equity flows correctly. This script intercepts clicks on those links
 * when the visitor is ALREADY on a page that has a hydrated product grid:
 * instead of doing a full page navigation, it fires the existing JS filter
 * and updates the URL via history.pushState for a snappier experience.
 *
 * Users without JS, and search engines, follow the clean href.
 */
(function () {
  'use strict';

  function enhance() {
    document.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      var a = e.target.closest('a[href^="/c/"], a[href^="/brand/"]');
      if (!a) return;
      var grid = document.getElementById('productGrid');
      if (!grid) return; // no hydrated grid on this page — let navigation happen
      var cat = a.getAttribute('data-cat-filter');
      if (!cat) return; // brand link / cross-link without a client-side filter
      e.preventDefault();
      var btn = document.querySelector('.cat-pill[data-cat-filter="' + cat + '"]');
      if (btn && btn.click) btn.click();
      try { history.pushState(null, '', a.getAttribute('href')); } catch (_) {}
      var feed = document.getElementById('store-feed');
      if (feed && feed.scrollIntoView) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
