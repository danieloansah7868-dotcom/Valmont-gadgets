// ACCESSIBLE MODAL FOCUS TRAPPING AND ESCAPE-TO-CLOSE
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    const installmentModal = document.getElementById("installmentModal");
    if (installmentModal && !installmentModal.classList.contains("hidden")) {
      if (typeof closeInstallmentCatalog === "function") closeInstallmentCatalog();
      return;
    }
    const detailModal = document.getElementById("detailModal");
    if (detailModal && !detailModal.classList.contains("hidden")) {
      if (typeof closeProductDetail === "function") closeProductDetail();
      return;
    }
    const cartDrawer = document.getElementById("cartDrawer");
    if (cartDrawer && !cartDrawer.classList.contains("translate-x-full")) {
      if (typeof closeCart === "function") closeCart();
      return;
    }
    const wishlistModal = document.getElementById("wishlistModal");
    if (wishlistModal && !wishlistModal.classList.contains("hidden")) {
      if (typeof closeWishlistModal === "function") closeWishlistModal();
      return;
    }
    const loginModal = document.getElementById("loginModal");
    if (loginModal && !loginModal.classList.contains("hidden")) {
      if (typeof closeLoginModal === "function") closeLoginModal();
      return;
    }
  }
  if (e.key === "Tab") {
    const activeModal = ["installmentModal", "detailModal", "wishlistModal", "loginModal", "dealerModal"].map(id => document.getElementById(id)).find(el => el && !el.classList.contains("hidden"));
    const cartDrawer = document.getElementById("cartDrawer");
    const activeDialog = activeModal || (cartDrawer && !cartDrawer.classList.contains("translate-x-full") ? cartDrawer : null);
    if (activeDialog) {
      const focusable = activeDialog.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  }
});

// Static and prerendered controls use inert data attributes rather than inline
// JavaScript. This keeps product identifiers out of executable HTML and allows
// an enforced Content Security Policy without `unsafe-inline` scripts.
document.addEventListener('click', event => {
  const control = event.target.closest('[data-store-action]');
  if (!control) return;
  const action = control.dataset.storeAction;
  const productId = control.dataset.productId || '';
  const policyMessages = {
    warranty: 'Our 12-Month Official Warranty policy applies to all genuine smartphones, laptops, and tablets purchased directly from Valmont Gadgets.',
    delivery: 'We offer express courier delivery across Accra on the same day for orders placed before 3:00 PM.',
    returns: 'We allow returns and replacements within 7 days of delivery for sealed items or items with manufacturer defects.',
  };
  const handlers = {
    'open-mobile-menu': openMobileMenuModal,
    'open-login': openLoginModal,
    'open-wishlist': openWishlistModal,
    logout: handleLogout,
    'open-dealer': openDealerModal,
    'product-detail': () => openProductDetail(productId),
    'toggle-wishlist': () => toggleWishlist(productId),
    'add-to-cart': () => addToCart(productId),
    'toggle-review-form': toggleReviewForm,
    'close-wishlist': closeWishlistModal,
    'wishlist-to-cart': addWishlistToCart,
    'close-login': closeLoginModal,
    'login-tab': () => setLoginTab(control.dataset.loginTab),
    'password-reset': () => window.handlePasswordReset(),
    'cancel-password-reset': () => window.cancelPasswordReset(),
    'google-sign-in': handleGoogleSignIn,
    'close-dealer': closeDealerModal,
    'deactivate-dealer': deactivateDealerMode,
    'mobile-home': mobileGoHome,
    'open-mobile-categories': openMobileCategoriesModal,
    'open-cart': openCart,
    'close-mobile-categories': closeMobileCategoriesModal,
    'close-mobile-menu': closeMobileMenuModal,
    'mobile-login': () => { closeMobileMenuModal(); openLoginModal(); },
    'mobile-wishlist': () => { closeMobileMenuModal(); openWishlistModal(); },
    'mobile-dealer': () => { closeMobileMenuModal(); openDealerModal(); },
    policy: () => { closeMobileMenuModal(); window.alert(policyMessages[control.dataset.policy] || 'Please contact support for policy details.'); },
    'dismiss-pwa': dismissPwaBanner,
    'close-pwa-instructions': closePwaInstructionsModal,
    'view-bag': () => { openCart(); hideValmontToast(); },
  };
  const handler = handlers[action];
  if (!handler) return;
  event.preventDefault();
  event.stopPropagation();
  handler();
});

document.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-store-action][role="button"]')) {
    event.preventDefault();
    event.target.click();
  }
});

document.addEventListener('submit', event => {
  const form = event.target.closest('[data-store-form]');
  if (!form) return;
  const handlers = {
    'login-submit': handleLoginSubmit,
    'password-reset-request': (submitEvent) => window.handlePasswordResetRequest(submitEvent),
  };
  const handler = handlers[form.dataset.storeForm];
  if (handler) handler(event);
});

// Legacy Paystack inline loader removed. All online payments now flow
// through the central Valmont-Pay gateway (https://valmontpay.app/pay.html)
// via a full-page redirect. No third-party payment SDK is loaded from this app.

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then(reg => {
            console.log('Service Worker registered successfully!', reg.scope);
            reg.update().catch(() => {});
          })
          .catch(err => console.log('Service Worker registration failed:', err));
      });
    }
  

    // Public fallback data is loaded before this application. It intentionally
    // excludes supplier costs and approved-dealer prices.
    const PRODUCTS = Array.isArray(window.VALMONT_CATALOG)
      ? window.VALMONT_CATALOG.map((product) => ({ ...product }))
      : [];

    PRODUCTS.forEach((p, index) => {
      const name = p.name.toLowerCase();
      const isPopular = name.includes('iphone 15 pro max') || name.includes('s24 ultra');
      const isMidRange = name.includes('iphone 13') || name.includes('a55');
      const isAccessory = ['chargers','phone_acc','phone_parts','travel_acc','laptop_acc','smart_home','networking','cameras'].includes(p.category);
      const isNew = p.badge === 'NEW';
      p.reviews_count = isPopular ? 42 + (index % 27) : isMidRange ? 18 + (index % 15) : isNew ? index % 6 : isAccessory ? 8 + (index % 8) : 12 + (index % 18);
      p.stock_quantity = isPopular ? 3 + (index % 6) : p.category === 'samsung' ? 5 + (index % 8) : isAccessory ? 15 + (index % 16) : 6 + (index % 12);
      
      // Auto-enable installments only for the specific iPhones from the images
      // (`name` is already declared above in this scope.)
      const isEligibleiPhone = name.includes('iphone') && 
        (name.includes('12') || name.includes('13') || name.includes('14') || 
         name.includes('15') || name.includes('16') || name.includes('17'));

      if (isEligibleiPhone) {
        p.has_installments = true;
      }
    });

    // INSTALLMENT PLAN CALCULATOR
    // Defined with the catalog code so the plans can always render when a
    // customer taps the banner, even if unrelated page setup later fails.
    const VALMONT_INSTALLMENT_MARKUP = 300;

    function getInstallmentPlan(cashPrice) {
      const p = Number(cashPrice) + VALMONT_INSTALLMENT_MARKUP;
      const weeklyDown = round2(p * 0.40);
      const weeklyAmount = round2(((p * 0.60) * 1.5) / 12);
      const monthlyDown = round2(p * 0.50);
      const monthlyAmount = round2(((p * 0.50) * 1.6) / 3);

      return {
        totalWithMarkup: p,
        weekly: { down: weeklyDown, installment: weeklyAmount },
        monthly: { down: monthlyDown, installment: monthlyAmount }
      };
    }

    // INSTALLMENT CATALOG MODAL LOGIC
    function openInstallmentCatalog() {
      const overlay = document.getElementById('installmentOverlay');
      const modal = document.getElementById('installmentModal');
      if (!overlay || !modal) return;

      renderInstallmentCatalog();
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }

    function closeInstallmentCatalog() {
      const overlay = document.getElementById('installmentOverlay');
      const modal = document.getElementById('installmentModal');
      if (!overlay || !modal) return;

      overlay.classList.remove('opacity-100');
      modal.classList.add('hidden');
      setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    function renderInstallmentCatalog() {
      const body = document.getElementById('installmentCatalogBody');
      if (!body) return;

      const items = PRODUCTS.filter(p => p.has_installments).sort((a,b) => a.retail - b.retail);
      
      body.innerHTML = items.map(p => {
        const plan = getInstallmentPlan(p.retail);
        return `
          <tr class="hover:bg-blue-50/20 transition border-b border-gray-100">
            <td class="p-4 flex items-center gap-3">
              <div class="h-8 w-8 bg-white rounded border border-gray-100 flex items-center justify-center shrink-0">
                ${productImg(p.image, p.name, 30)}
              </div>
              <span class="truncate">${escapeHtml(p.name)}</span>
            </td>
            <td class="p-4 text-right font-black text-gray-900">${money(plan.totalWithMarkup)}</td>
            <td class="p-4 bg-blue-50/20 text-blue-900">${money(plan.weekly.down)}</td>
            <td class="p-4 bg-blue-50/20 text-blue-900">${money(plan.weekly.installment)}/wk</td>
            <td class="p-4 bg-indigo-50/20 text-indigo-900">${money(plan.monthly.down)}</td>
            <td class="p-4 bg-indigo-50/20 text-indigo-900">${money(plan.monthly.installment)}/mo</td>
          </tr>
        `;
      }).join('');
    }

    window.openInstallmentCatalog = openInstallmentCatalog;
    window.closeInstallmentCatalog = closeInstallmentCatalog;

    // Use real event listeners rather than relying on inline onclick handlers.
    // This keeps the banner working in browsers/extensions that block inline JS
    // and also covers installment links added by client-side rendering.
    document.addEventListener('click', event => {
      const openTrigger = event.target.closest('[data-open-installments]');
      if (openTrigger) {
        event.preventDefault();
        openInstallmentCatalog();
        return;
      }

      if (event.target.closest('[data-close-installments]')) {
        event.preventDefault();
        closeInstallmentCatalog();
      }
    });

    /**
     * Renders a product image. Local uploads/*.png have pre-generated 400/800
     * WebP derivatives (scripts/optimize-images.sh), so they are served through
     * <picture> with a PNG fallback; remote images are emitted as plain <img>.
     * Keeps client-rendered cards on the same optimised assets as the
     * pre-rendered ones.
     */
    function productImg(src, alt, size, opts) {
      const o = opts || {};
      const isLocalProductPhoto = /^uploads\//.test(src || '');
      const cls = `${o.className || 'max-h-full object-contain'}${isLocalProductPhoto ? ' product-media-local' : ''}`;
      const lazy = o.eager ? '' : ' loading="lazy"';
      const prio = o.eager ? ' fetchpriority="high"' : '';
      const sizes = o.sizes || `${size}px`;
      const safeAlt = String(alt || '').replace(/"/g, '&quot;');
      const safeSrc = String(src || '').replace(/"/g, '&quot;');
      if (/^uploads\/.+\.png$/.test(src || '')) {
        const base = src.replace(/\.png$/, '');
        const safeBase = String(base).replace(/"/g, '&quot;');
        return `<picture><source type="image/webp" srcset="${safeBase}_400.webp 400w, ${safeBase}_800.webp 800w" sizes="${sizes}">` +
               `<img src="${safeSrc}" alt="${safeAlt}" width="${size}" height="${size}"${lazy}${prio} decoding="async" class="${cls}" /></picture>`;
      }
      return `<img src="${safeSrc}" alt="${safeAlt}" width="${size}" height="${size}"${lazy}${prio} decoding="async" class="${cls}" />`;
    }

    // === SUPABASE DATABASE INTEGRATION CONFIGURATION ===
    const VALMONT_SUPABASE = {
      url: 'https://eydsoqnpetqczaeqrscc.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHNvcW5wZXRxY3phZXFyc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODc1NjYsImV4cCI6MjEwMDQ2MzU2Nn0.ISD7IRYWwr_VMb8YutGlyJuWjBF9UWm1tijzMBAEBmc'
    };

    const hasSupabase = () => {
      return VALMONT_SUPABASE.url && 
             VALMONT_SUPABASE.anonKey && 
             !VALMONT_SUPABASE.url.includes('PASTE_') && 
             !VALMONT_SUPABASE.anonKey.includes('PASTE_');
    };

    async function authenticatedSupabaseRpc(functionName, body) {
      if (!/^[a-z][a-z0-9_]*$/.test(functionName)) throw new Error('Invalid RPC name');
      const accessToken = localStorage.getItem('valmont_access_token');
      if (!accessToken) throw new Error('Please sign in before continuing.');
      const response = await fetch(`${VALMONT_SUPABASE.url.replace(/\/$/, '')}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': VALMONT_SUPABASE.anonKey,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) throw new Error('Your session expired. Please sign in again.');
        throw new Error(data?.message || 'The request could not be completed.');
      }
      return data;
    }

    async function supabaseFetch(endpoint, options = {}) {
      if (!hasSupabase()) throw new Error('Supabase not configured');
      const method = options.method || 'GET';
      const headers = {
        'apikey': VALMONT_SUPABASE.anonKey,
        'Authorization': `Bearer ${VALMONT_SUPABASE.anonKey}`
      };
      if (options.body !== undefined) headers['content-type'] = 'application/json';
      const response = await fetch(`${VALMONT_SUPABASE.url.replace(/\/$/, '')}/rest/v1/${endpoint}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }

    // === SUPABASE PRODUCT SYNC ===
    // Fetches products added via the admin panel and merges them into the
    // storefront PRODUCTS array so they appear on the shop automatically.
    async function syncProductsFromSupabase() {
      if (!hasSupabase()) return;
      try {
        // Product tables are admin-only. This reviewed RPC exposes only the
        // customer-visible catalog and cannot return dealer or supplier costs.
        const remote = await supabaseFetch('rpc/get_storefront_catalog', { method: 'POST', body: {} });
        if (!Array.isArray(remote) || !remote.length) return;

        const existingIds = new Set(PRODUCTS.map(p => String(p.id)));

        remote.forEach(rp => {
          const id = String(rp.id);
          let parsedImages = rp.images || [];
          if (typeof rp.images === 'string') { parsedImages = safeParseJSON(rp.images, []); if (!Array.isArray(parsedImages)) parsedImages = []; }
          const imageUrl = rp.image_url || rp.image || parsedImages[0] || '';
          const otherImages = parsedImages.filter(u => u && u !== imageUrl);

          const mapped = {
            id: id,
            name: rp.name || 'Untitled Product',
            category: rp.category_id || rp.category || 'uncategorized',
            retail: Number(rp.price || 0),
            compareAt: Number(rp.compare_at_price || 0),
            badge: rp.badge || '',
            stock: String(rp.stock ?? rp.stock_quantity ?? ''),
            specs: rp.specs || '',
            description: rp.description || '',
            features: [],
            tags: [],
            image: imageUrl,
            images: [imageUrl, ...otherImages].filter(Boolean),
            reviews_count: Number(rp.reviews_count || 0),
            stock_quantity: Number(rp.stock ?? rp.stock_quantity ?? 0),
            colors: (() => { const v = typeof rp.colors === 'string' ? safeParseJSON(rp.colors, []) : (rp.colors || []); return Array.isArray(v) ? v : []; })(),
            storage_options: (() => { const v = typeof rp.storage_options === 'string' ? safeParseJSON(rp.storage_options, []) : (rp.storage_options || []); return Array.isArray(v) ? v : []; })()
          };

          if (existingIds.has(id)) {
            const idx = PRODUCTS.findIndex(p => String(p.id) === id);
            if (idx >= 0) PRODUCTS[idx] = { ...PRODUCTS[idx], ...mapped };
          } else {
            PRODUCTS.push(mapped);
            existingIds.add(id);
          }
        });

        // Re-normalize review/stock counts for new products
        PRODUCTS.forEach((p, index) => {
          if (p.reviews_count == null) {
            const name = p.name.toLowerCase();
            const isPopular = name.includes('iphone 15 pro max') || name.includes('s24 ultra');
            const isMidRange = name.includes('iphone 13') || name.includes('a55');
            const isNew = p.badge === 'NEW';
            p.reviews_count = isPopular ? 42 + (index % 27) : isMidRange ? 18 + (index % 15) : isNew ? index % 6 : 12 + (index % 18);
          }
          if (p.stock_quantity == null) p.stock_quantity = 6 + (index % 12);
        });

        // Re-evaluate account pricing after adding remote SKUs so a catalog/auth
        // race cannot display retail while authoritative checkout uses dealer.
        if (currentUser) await refreshDealerAuthorization();
        else {
          renderProducts();
          renderFlashSales();
        }
        console.info(`Synced ${remote.length} product(s) from Supabase.`);
      } catch (e) {
        console.warn('Supabase product sync skipped:', e.message || e);
      }
    }

    // APP STATE
    const initialFilters = new URLSearchParams(location.search);
    let activeFilter = initialFilters.get('category') || 'all';
    let activePriceFilter = initialFilters.get('price') || 'all';
    let activeSort = initialFilters.get('sort') || 'popular';
    let currentProductPage = Math.max(1, Number(initialFilters.get('page') || 1));
    let searchQuery = '';
    let shopperStorageScope = 'guest';
    const shopperStorageKey = (base, scope = shopperStorageScope) => `${base}:${scope}`;
    function readShopperStorage(base, fallback, scope = shopperStorageScope) {
      let raw = localStorage.getItem(shopperStorageKey(base, scope));
      // One-time migration of pre-hardening browser data into the guest scope.
      if (raw == null && scope === 'guest') {
        raw = localStorage.getItem(base);
        if (raw != null) {
          localStorage.setItem(shopperStorageKey(base, 'guest'), raw);
          localStorage.removeItem(base);
        }
      }
      return safeParseJSON(raw, fallback);
    }
    const writeShopperStorage = (base, value) => localStorage.setItem(shopperStorageKey(base), JSON.stringify(value));

    let cart = readShopperStorage('valmont_cart', []);
    if (!Array.isArray(cart)) cart = [];
    let wishlist = readShopperStorage('valmont_wishlist', []);
    if (!Array.isArray(wishlist)) wishlist = [];
    let recentlyViewed = readShopperStorage('valmont_recently_viewed', []);
    if (!Array.isArray(recentlyViewed)) recentlyViewed = [];
    // Cached browser objects are display caches only, never authentication.
    let currentUser = null;
    localStorage.removeItem('valmont_user');
    localStorage.removeItem('valmont_is_dealer');
    localStorage.removeItem('valmont_dealer_profile');
    let isResellerMode = false;
    let selectedDetailProduct = null;
    let isDealerMode = false;
    let dealerProfile = null;

    function activateShopperStorage(accountId, mergeGuest = false) {
      const nextScope = accountId || 'guest';
      if (nextScope === shopperStorageScope) return;
      const guestCart = mergeGuest ? readShopperStorage('valmont_cart', [], 'guest') : [];
      const guestWishlist = mergeGuest ? readShopperStorage('valmont_wishlist', [], 'guest') : [];
      shopperStorageScope = nextScope;
      cart = readShopperStorage('valmont_cart', []);
      wishlist = readShopperStorage('valmont_wishlist', []);
      recentlyViewed = readShopperStorage('valmont_recently_viewed', []);
      if (!Array.isArray(cart)) cart = [];
      if (!Array.isArray(wishlist)) wishlist = [];
      if (!Array.isArray(recentlyViewed)) recentlyViewed = [];

      // Preserve a guest's active shopping intent on first sign-in, then clear
      // the guest data so a later user on the device cannot see it.
      if (mergeGuest && Array.isArray(guestCart)) {
        for (const item of guestCart) {
          const existing = cart.find(entry => entry.id === item.id &&
            (entry.selected_color || '') === (item.selected_color || '') &&
            (entry.selected_storage || '') === (item.selected_storage || ''));
          if (existing) existing.qty = Math.min(99, Number(existing.qty || 0) + Number(item.qty || 1));
          else cart.push(item);
        }
        wishlist = [...new Set([...wishlist, ...(Array.isArray(guestWishlist) ? guestWishlist : [])])];
        writeShopperStorage('valmont_cart', cart);
        writeShopperStorage('valmont_wishlist', wishlist);
        localStorage.removeItem(shopperStorageKey('valmont_cart', 'guest'));
        localStorage.removeItem(shopperStorageKey('valmont_wishlist', 'guest'));
      }
      if (typeof updateCartCount === 'function') updateCartCount();
      if (typeof updateWishlistUI === 'function') updateWishlistUI();
      if (typeof renderRecentlyViewed === 'function') renderRecentlyViewed();
    }

    // ── Delivery-fee live config (Task 2) ──────────────────────────────────
    // Fetched once per checkout open via anon RPC get_delivery_config().
    // Shape: { free_over: number, default_fee: number, regions: [{region, fee}...] }
    let deliveryConfig = null;
    let deliveryConfigPromise = null;
    let selectedDeliveryRegion = null; // canonical region string or null

    function getDeliveryFeeForRegion(subtotal, region) {
      if (!deliveryConfig) return 0;
      const freeOver = Number(deliveryConfig.free_over ?? 5000);
      if (subtotal >= freeOver) return 0;
      if (!region) return Number(deliveryConfig.default_fee ?? 50);
      const entry = deliveryConfig.regions.find(r => r.region === region);
      if (entry) return Number(entry.fee ?? deliveryConfig.default_fee);
      return Number(deliveryConfig.default_fee ?? 50);
    }

    function fetchDeliveryConfig() {
      if (deliveryConfig) return Promise.resolve(deliveryConfig);
      if (deliveryConfigPromise) return deliveryConfigPromise;
      deliveryConfigPromise = (async () => {
        try {
          const sbUrl = VALMONT_SUPABASE.url.replace(/\/$/, '');
          const anonKey = VALMONT_SUPABASE.anonKey;
          const res = await fetch(`${sbUrl}/rest/v1/rpc/get_delivery_config`, {
            method: 'POST',
            headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({})
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // RPC may return {free_over, default_fee, regions[]} directly or inside jsonb
          let cfg = data;
          if (Array.isArray(data) && data[0]) cfg = data[0];
          if (cfg && cfg.get_delivery_config) cfg = cfg.get_delivery_config;
          // Normalize
          const free_over = Number(cfg.free_over ?? cfg.freeOver ?? 5000);
          const default_fee = Number(cfg.default_fee ?? cfg.defaultFee ?? 50);
          let regions = cfg.regions || cfg.delivery_fees || [];
          if (!Array.isArray(regions)) regions = [];
          regions = regions.map(r => ({ region: String(r.region || r.name || '').trim(), fee: Number(r.fee ?? r.delivery_fee ?? 0), sort_order: Number(r.sort_order ?? 999) })).filter(r => r.region).sort((a,b)=>a.sort_order-b.sort_order || a.region.localeCompare(b.region));
          deliveryConfig = { free_over, default_fee, regions };
          return deliveryConfig;
        } catch (e) {
          console.warn('Delivery config fetch failed, using fallback:', e);
          deliveryConfig = { free_over: 5000, default_fee: 50, regions: [
            {region:'Greater Accra', fee:25, sort_order:1},{region:'Ashanti', fee:40, sort_order:2},{region:'Western', fee:45, sort_order:3},{region:'Central', fee:45, sort_order:4},{region:'Eastern', fee:40, sort_order:5},{region:'Volta', fee:50, sort_order:6},{region:'Northern', fee:60, sort_order:7},{region:'Upper East', fee:70, sort_order:8},{region:'Upper West', fee:70, sort_order:9},{region:'Bono', fee:50, sort_order:10},{region:'Bono East', fee:55, sort_order:11},{region:'Ahafo', fee:55, sort_order:12},{region:'Savannah', fee:65, sort_order:13},{region:'North East', fee:65, sort_order:14},{region:'Oti', fee:55, sort_order:15},{region:'Western North', fee:50, sort_order:16}
          ]};
          return deliveryConfig;
        }
      })();
      return deliveryConfigPromise;
    }

    function populateRegionSelect() {
      const sel = document.getElementById('shippingRegion');
      if (!sel || !deliveryConfig) return;
      const current = sel.value || selectedDeliveryRegion || '';
      sel.innerHTML = '<option value="">Select your region</option>' +
        deliveryConfig.regions.map(r => `<option value="${escapeHtml(r.region)}">${escapeHtml(r.region)} — ${money(r.fee)}</option>`).join('');
      if (current && deliveryConfig.regions.some(r => r.region === current)) {
        sel.value = current;
        selectedDeliveryRegion = current;
      }
      // Clear previous handler to avoid duplicates
      sel.onchange = () => {
        selectedDeliveryRegion = sel.value || null;
        sel.style.borderColor = '';
        const errEl = sel.parentElement.querySelector('.shipping-field-error');
        if (errEl) errEl.remove();
        updateCartDeliveryDisplay();
      };
    }

    function updateCartDeliveryDisplay() {
      const labelEl = document.getElementById('cartDeliveryLabel');
      const valueEl = document.getElementById('cartDeliveryValue');
      if (!labelEl || !valueEl) return;
      const subtotal = cart.reduce((s, i) => s + (Number(i.retail || 0) * Number(i.qty || 1)), 0);
      const freeOver = deliveryConfig ? Number(deliveryConfig.free_over) : 5000;
      if (subtotal >= freeOver) {
        labelEl.textContent = 'Delivery:';
        valueEl.textContent = 'FREE';
        valueEl.className = 'font-black text-green-600';
      } else {
        const fee = getDeliveryFeeForRegion(subtotal, selectedDeliveryRegion);
        if (selectedDeliveryRegion) {
          labelEl.textContent = `Delivery (${selectedDeliveryRegion}):`;
        } else {
          labelEl.textContent = 'Delivery:';
        }
        valueEl.textContent = money(fee);
        valueEl.className = 'font-bold text-gray-800';
      }
      // Also update total display
      const subtotalEl = document.getElementById('cartSubtotal');
      const totalEl = document.getElementById('cartTotal');
      if (subtotalEl && totalEl) {
        const feeLive = subtotal >= freeOver ? 0 : getDeliveryFeeForRegion(subtotal, selectedDeliveryRegion);
        if (subtotalEl) subtotalEl.textContent = money(subtotal);
        if (totalEl) totalEl.textContent = money(subtotal + feeLive);
      }
    }

    // Elements
    const productGrid = document.getElementById('productGrid');
    const flashGrid = document.getElementById('flashProductsRow');

    function handleProductGridAction(event) {
      const wishlistButton = event.target.closest('[data-wishlist-product]');
      if (wishlistButton) {
        event.stopPropagation();
        toggleWishlist(wishlistButton.dataset.wishlistProduct);
        return;
      }
      const addButton = event.target.closest('[data-add-product]');
      if (addButton) {
        event.stopPropagation();
        addToCart(addButton.dataset.addProduct);
        return;
      }
      const card = event.target.closest('[data-open-product]');
      if (card) openProductDetail(card.dataset.openProduct);
    }

    productGrid?.addEventListener('click', handleProductGridAction);
    flashGrid?.addEventListener('click', handleProductGridAction);
    function handleProductCardKeydown(event) {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-product]')) {
        event.preventDefault();
        openProductDetail(event.target.dataset.openProduct);
      }
    }
    productGrid?.addEventListener('keydown', handleProductCardKeydown);
    flashGrid?.addEventListener('keydown', handleProductCardKeydown);
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const cartCountBadge = document.getElementById('cartBadgeCount');
    
    // Global Category Labels for spacious layout and mobile sync
    const CATEGORY_LABELS = {
      all: 'Verified Premium Stock',
      iphones: 'iPhones & Apple Devices',
      samsung: 'Samsung Galaxy Series',
      android: 'Android Flagship Phones',
      tablets: 'Tablets & iPads',
      smartwatches: 'Smartwatches & Wearables',
      laptops: 'Executive Laptops',
      laptop_acc: 'Premium Laptop Accessories',
      audio: 'Smart Audio & AirPods',
      gaming: 'Gaming & Consoles',
      phone_acc: 'Phone Cases & Accessories',
      phone_parts: 'Phone Parts & Spares',
      travel_acc: 'Smart Travel & Car Accessories',
      chargers: 'Power & Chargers',
      smart_home: 'Smart Home & Security',
      networking: 'Wi-Fi & Networking',
      cameras: 'Cameras & Creator Gear'
    };
    
    
    const customerStoreView = document.getElementById('customer-store-view');
    const resellerDeskView = document.getElementById('dealer-desk-view');
    const wishlistCountBadge = document.getElementById('wishlistCountBadge');
    
    // User Profile Elements
    const accountLabel = document.getElementById('accountLabel');
    const navMyProfileBtn = document.getElementById('navMyProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Jumia Flash Sales Timer
    function startFlashTimer() {
      let seconds = 15791; // 4 hours, 23 minutes, 11 seconds
      const clockEl = document.getElementById('flash-clock');
      setInterval(() => {
        seconds--;
        if (seconds <= 0) seconds = 15791;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        clockEl.textContent = `${h.toString().padStart(2, '0')}h : ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`;
      }, 1000);
    }

    // Money formatter (GH₵)
    const money = value => `GH₵ ${Math.max(0, Number(value || 0)).toLocaleString()}`;

    // ── Safe pricing/parsing helpers (regression-tested by npm test) ─────────
    // Discount vs compare-at price, immune to missing/zero/inverted compareAt
    // (admin-added DB products default compare_at_price to 0 → the old formula
    // rendered "-Infinity%" on every one of them).
    function safeDiscountPercent(retail, compareAt) {
      const r = Number(retail), c = Number(compareAt);
      if (!Number.isFinite(r) || !Number.isFinite(c) || c <= 0 || c <= r) return 0;
      return Math.round((1 - r / c) * 100);
    }
    // The price a customer pays for one unit. Dealer/wholesale pricing only
    // applies when a positive wholesale price exists — several SKUs carry
    // wholesale: 0, which the old code happily added to the cart at GH₵0.
    function effectiveUnitPrice(product, dealerMode) {
      const retail = Number(product && product.retail);
      if (!Number.isFinite(retail) || retail <= 0) return 0;
      if (dealerMode) {
        const wholesale = Number(product && product.wholesale);
        if (Number.isFinite(wholesale) && wholesale > 0) return wholesale;
      }
      return retail;
    }
    // JSON.parse that can never throw the whole page on corrupt localStorage.
    function safeParseJSON(raw, fallback) {
      if (raw === null || raw === undefined || raw === '') return fallback;
      try { const v = JSON.parse(raw); return v === undefined ? fallback : v; } catch (e) { return fallback; }
    }
    function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

    // Highlights only the active tab in accent color and turns others gray
    function updateMobileNavHighlights(activeTab) {
      const items = document.querySelectorAll('.bottom-nav-item');
      items.forEach(item => item.classList.remove('active'));
      
      const idMap = {
        home: 'navHome',
        categories: 'navCategories',
        saved: 'navSaved',
        account: 'navAccount',
        bag: 'navBag',
        dealer: 'navAccount'
      };
      
      const activeId = idMap[activeTab];
      if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
      }
    }

    // Update mobile account label to show user name if logged in
    function updateMobileAccountLabel() {
      const label = document.getElementById('mobileAccountLabel');
      const navAccount = document.getElementById('navAccount');
      const user = localStorage.getItem('valmont_access_token') ? safeParseJSON(localStorage.getItem('valmont_user'), null) : null;
      if (label && user) {
        label.textContent = user.name.split(' ')[0];
        if (navAccount) { navAccount.classList.add('signed-in'); navAccount.setAttribute('aria-label', `Signed in as ${user.name}`); }
      } else {
        if (label) label.textContent = 'Account';
        if (navAccount) { navAccount.classList.remove('signed-in'); navAccount.setAttribute('aria-label', 'Account sign in'); }
      }
    }

    // RENDER PRODUCTS GRID & FLASH SALES
    function syncFilterUrl() {
      const params = new URLSearchParams(location.search);
      activeFilter === 'all' ? params.delete('category') : params.set('category', activeFilter);
      activePriceFilter === 'all' ? params.delete('price') : params.set('price', activePriceFilter);
      activeSort === 'popular' ? params.delete('sort') : params.set('sort', activeSort);
      currentProductPage > 1 ? params.set('page', currentProductPage) : params.delete('page');
      const query = params.toString();
      history.replaceState({}, '', `${location.pathname}${query ? '?' + query : ''}${location.hash}`);
    }

    function getProductVariants(product) {
      const source = `${product.name} ${product.specs}`.toLowerCase();
      const palette = [
        ['black', '#111827'], ['midnight', '#1f2937'], ['obsidian', '#171717'], ['titanium', '#94a3b8'],
        ['blue', '#2563eb'], ['purple', '#7e22ce'], ['pink', '#ec4899'], ['white', '#f8fafc'],
        ['silver', '#cbd5e1'], ['green', '#16a34a'], ['gray', '#6b7280'], ['grey', '#6b7280'],
        ['gold', '#d4a72c'], ['cream', '#f5f0df'], ['navy', '#172554']
      ];
      const colors = palette.filter(([name]) => source.includes(name)).map(([, value]) => value).slice(0, 3);
      const storage = [...new Set((`${product.name} ${product.specs}`.match(/\b(?:\d+(?:\.\d+)?(?:GB|TB)|\d+GB RAM)\b/gi) || []).map(value => value.toUpperCase()))].slice(0, 3);
      return { colors: colors.length ? colors : ['#111827', '#94a3b8', '#f8fafc'], storage };
    }

    function renderProductVariants(product) {
      const { colors, storage } = getProductVariants(product);
      return `<div class="mt-1.5 space-y-1" aria-label="Available colour and storage variations">
        <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-gray-500">Colours:</span>${colors.map(color => `<span class="w-2 h-2 rounded-full border border-gray-300" style="background:${color}" aria-hidden="true"></span>`).join('')}</div>
        ${storage.length ? `<div class="flex items-center gap-1 flex-wrap"><span class="text-[9px] font-bold text-gray-500">Size:</span>${storage.map(size => `<span class="border border-gray-200 rounded px-1.5 py-0.5 text-[8px] font-bold text-gray-600">${size}</span>`).join('')}</div>` : ''}
      </div>`;
    }

    function renderProducts() {
      document.querySelector('.product-pagination')?.remove();
      let filtered = PRODUCTS.filter(p => {
        const matchesCategory = activeFilter === 'all' || p.category === activeFilter;
        const normalizedSearch = searchQuery.trim().toLowerCase().replace(/\biphones\b/g, 'iphone').replace(/\bmacbooks\b/g, 'macbook').replace(/\bairpods\b/g, 'airpod').replace(/\blaptops\b/g, 'laptop').replace(/\baccessories\b/g, 'accessory');
        const categoryMatch = (normalizedSearch === 'iphone' && p.category === 'iphones') || (normalizedSearch === 'laptop' && p.category === 'laptops') || (normalizedSearch === 'accessory' && ['chargers', 'phone_acc', 'laptop_acc', 'travel_acc'].includes(p.category)) || (normalizedSearch === 'audio' && p.category === 'audio');
        const matchesSearch = normalizedSearch === '' || p.name.toLowerCase().includes(normalizedSearch) || p.specs.toLowerCase().includes(normalizedSearch) || categoryMatch;
        const price = Number(p.retail || 0);
        const matchesPrice = activePriceFilter === 'all' || (activePriceFilter === 'under-5000' && price < 5000) || (activePriceFilter === '5000-15000' && price >= 5000 && price <= 15000) || (activePriceFilter === 'above-15000' && price > 15000);
        return matchesCategory && matchesSearch && matchesPrice;
      });

      if (activeSort === 'price-asc') filtered.sort((a,b) => a.retail - b.retail);
      if (activeSort === 'price-desc') filtered.sort((a,b) => b.retail - a.retail);
      if (activeSort === 'popular') filtered.sort((a,b) => (b.reviews_count || 0) - (a.reviews_count || 0));
      const pageSize = 20;
      const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
      currentProductPage = Math.min(currentProductPage, pageCount);
      const visibleProducts = filtered.slice((currentProductPage - 1) * pageSize, currentProductPage * pageSize);
      syncFilterUrl();
      // Update count
      document.getElementById('itemCountDisplay').textContent = `${filtered.length} Products`;
      document.getElementById('currentFeedTitle').textContent = CATEGORY_LABELS[activeFilter] || 'Premium Gadget Stock';

      if (filtered.length === 0) {
        productGrid.innerHTML = `
          <div class="col-span-full py-12 text-center text-gray-400 font-semibold text-[13px]">
            No matching products found. Try another search.
          </div>
        `;
      } else {
        productGrid.innerHTML = visibleProducts.map(p => {
          const discount = safeDiscountPercent(p.retail, p.compareAt);
          const isWishlisted = wishlist.includes(p.id);
          const heartColor = isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500';
          
          return `
            <div role="button" tabindex="0" data-open-product="${escapeHtml(p.id)}" class="bg-white rounded-[4px] overflow-hidden border border-gray-200 hover:shadow-md transition duration-200 flex flex-col justify-between group relative cursor-pointer">
              <!-- Wishlist heart button overlay -->
              <button type="button" data-wishlist-product="${escapeHtml(p.id)}" aria-label="Toggle ${escapeHtml(p.name)} in saved items" class="absolute top-2.5 right-2 h-7 w-7 rounded-full bg-white/95 shadow-sm border border-gray-50 flex items-center justify-center z-10 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 ${heartColor}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </button>

              <div class="p-3">
                <div class="product-image-frame h-[140px] w-full flex items-center justify-center overflow-hidden mb-2 rounded-[4px] bg-gray-50">
                  ${productImg(p.image, p.name, 140, {className: 'max-h-full object-contain group-hover:scale-105 transition duration-200', sizes: '(max-width: 640px) 45vw, 140px'})}
                </div>
                <h4 class="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[32px]">${escapeHtml(p.name)}</h4>
                <p class="text-[10px] text-gray-400 font-medium truncate mt-1">${escapeHtml(p.specs)}</p>
                <div class="mt-2">
                  <span class="text-[14px] font-black text-gray-800">${money(effectiveUnitPrice(p, isDealerMode))}</span>
                  <span class="text-[11px] text-gray-400 line-through ml-1 font-semibold">${isDealerMode ? money(p.retail) : (Number(p.compareAt) > Number(p.retail) ? money(p.compareAt) : '')}</span>
                  <span class="text-[10px] text-[#ff8c00] font-black ml-1">-${discount}%</span>
                  ${isDealerMode ? '<span class="text-[9px] text-green-600 font-extrabold ml-1 uppercase">Wholesale</span>' : ''}
                  ${p.retail > 5000 ? '<span class="card-free-delivery">Free Delivery</span>' : ''}
                </div>
                <div class="flex items-center gap-0.5 text-[9px] text-amber-500 font-black mt-1">
                  
    <div class="flex items-center gap-0.5 text-amber-500">
      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
    </div>
                  <span class="text-gray-400 font-bold ml-1">(${p.reviews_count || 0})</span>
                </div>
                ${renderProductVariants(p)}

                <!-- Jumia-Style Dynamic Stock Depletion Progress Bar (Vibrant and Professional!) -->
                <div class="mt-2.5">
                  <div class="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                    <span>${p.stock_quantity || 0} items left</span>
                  </div>
                  <div class="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div class="bg-[#ff8c00] h-full" style="width: ${Math.min(100, (p.stock_quantity || 0) * 4)}%"></div>
                  </div>
                </div>
              </div>
              <div class="px-3 pb-3 hidden md:block">
                <button type="button" data-add-product="${escapeHtml(p.id)}" class="w-full bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[11px] py-2 rounded-[4px] uppercase transition tracking-widest shadow-sm">
                  Add To Bag
                </button>
              </div>
            </div>
          `;
        }).join('');
        if (pageCount > 1) {
          // The page you are on is painted in brand orange so it reads as
          // "current" at a glance; the rest stay white with an orange hover.
          productGrid.insertAdjacentHTML('afterend', `<nav class="product-pagination flex justify-center gap-2 py-6" aria-label="Product pages">${Array.from({length: pageCount}, (_, i) => {
            const isActive = i + 1 === currentProductPage;
            // NB: the weight lives in the branch, not the shared base — Tailwind
            // emits .font-bold after .font-black, so a base `font-bold` would
            // silently win over the active `font-black`.
            const state = isActive
              ? 'bg-[#ff8c00] border-[#ff8c00] text-white font-black shadow-md scale-105'
              : 'bg-white border-gray-200 text-gray-700 font-bold hover:bg-orange-50 hover:border-[#ff8c00] hover:text-[#ff8c00]';
            return `<button type="button" data-page="${i + 1}"${isActive ? ' aria-current="page"' : ''} class="px-3 py-2 rounded border text-sm transition-all duration-150 ${state}">${i + 1}</button>`;
          }).join('')}</nav>`);
          document.querySelectorAll('.product-pagination [data-page]').forEach(btn => btn.addEventListener('click', () => { currentProductPage = Number(btn.dataset.page); renderProducts(); document.getElementById('store-feed')?.scrollIntoView({behavior:'smooth'}); }));
        }
      }
    }

    // Render Flash Sales row. Keep the live inventory supplied by the store at
    // the front of the homepage instead of showing older placeholder deals.
    const FLASH_FEATURED_IDS = [
      'iphone-15-pro-128-uk-used-92',
      'iphone-13-pro-max-128-uk-used',
      'hp-elitebook-1030-g2-x360',
      'ps5-1tb-very-neat-used-001',
      'ps5-1tb-new-sealed-slim'
    ];

    function renderFlashSales() {
      const flashItems = FLASH_FEATURED_IDS
        .map(id => PRODUCTS.find(product => product.id === id))
        .filter(Boolean);
      flashGrid.innerHTML = flashItems.map(p => {
        const discount = safeDiscountPercent(p.retail, p.compareAt);
        return `
          <div role="button" tabindex="0" data-open-product="${escapeHtml(p.id)}" class="bg-white rounded-[4px] p-2.5 border border-gray-100 hover:border-orange-200/50 shrink-0 w-[145px] hover:shadow transition relative cursor-pointer">
            <div class="product-image-frame h-[100px] w-full flex items-center justify-center overflow-hidden mb-1 bg-gray-50 rounded-[4px]">
              ${productImg(p.image, p.name, 100)}
            </div>
            <h5 class="text-[11px] text-gray-800 font-bold truncate">${escapeHtml(p.name)}</h5>
            <div class="mt-1 leading-tight">
              <span class="block text-[13px] font-black text-gray-900">${money(p.retail)}</span>
              <span class="flex items-center gap-1">
                <span class="text-[10px] text-gray-400 line-through font-semibold">${money(p.compareAt)}</span>
                <span class="text-[9px] text-[#ff8c00] font-black">-${discount}%</span>
              </span>
            </div>
            <button type="button" class="flash-add" data-add-product="${escapeHtml(p.id)}">Add to Bag</button>
          </div>
        `;
      }).join('');
    }

    // WISHLIST / SAVED ITEMS SYSTEM
    function toggleWishlist(id) {
      const idx = wishlist.indexOf(id);
      if (idx !== -1) {
        wishlist.splice(idx, 1);
      } else {
        wishlist.push(id);
      }
      writeShopperStorage('valmont_wishlist', wishlist);
      updateWishlistUI();
      renderProducts();
    }

    function updateWishlistUI() {
      const count = wishlist.length;
      const badge = document.getElementById('wishlistCountBadge');
      const mobBadge = document.getElementById('mobileWishlistBadge');

      [badge, mobBadge].forEach(b => {
        if (b) {
          if (count === 0) {
            b.classList.add('hidden');
          } else {
            b.classList.remove('hidden');
            b.textContent = count;
          }
        }
      });
    }

    const wishlistOverlay = document.getElementById('wishlistOverlay');
    const wishlistModal = document.getElementById('wishlistModal');
    const wishlistModalItems = document.getElementById('wishlistModalItems');

    function openWishlistModal() {
      // Close cart drawer if open
      const cartDrawer = document.getElementById('cartDrawer');
      if (cartDrawer && !cartDrawer.classList.contains('translate-x-full')) {
        cartDrawer.classList.add('translate-x-full');
      }
      // Close categories modal if open
      const catModal = document.getElementById('mobileCategoriesModal');
      if (catModal && !catModal.classList.contains('hidden') && !catModal.classList.contains('translate-y-full')) {
        catModal.classList.add('translate-y-full');
        const catOverlay = document.getElementById('mobileCategoriesOverlay');
        if (catOverlay) { catOverlay.classList.remove('opacity-100'); setTimeout(() => catOverlay.classList.add('hidden'), 300); }
      }
      wishlistOverlay.classList.remove('hidden');
      setTimeout(() => wishlistOverlay.classList.add('opacity-100'), 10);
      wishlistModal.classList.remove('hidden');
      renderWishlistModal();
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('saved');
    }

    function closeWishlistModal() {
      wishlistOverlay.classList.remove('opacity-100');
      setTimeout(() => wishlistOverlay.classList.add('hidden'), 300);
      wishlistModal.classList.add('hidden');
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('home');
    }

    function renderWishlistModal() {
      if (wishlist.length === 0) {
        wishlistModalItems.innerHTML = `
          <div class="py-12 text-center text-gray-400 font-semibold text-[13px]">
            Your wishlist is empty. Tap hearts on products to save them!
          </div>
        `;
        document.getElementById('addAllWishlistBtn').classList.add('hidden');
        return;
      }

      document.getElementById('addAllWishlistBtn').classList.remove('hidden');
      const savedProducts = PRODUCTS.filter(p => wishlist.includes(p.id));
      
      wishlistModalItems.innerHTML = savedProducts.map(p => {
        return `
          <div class="flex items-center gap-3 border-b pb-3.5">
            <div class="h-14 w-14 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0">
              ${productImg(p.image, p.name, 100)}
            </div>
            <div class="flex-1 min-w-0">
              <h5 class="text-[12px] font-bold text-gray-800 truncate">${escapeHtml(p.name)}</h5>
              <p class="text-[11px] text-gray-500 font-black mt-0.5">${money(p.retail)}</p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button type="button" data-wishlist-add="${escapeHtml(p.id)}" class="bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[10px] px-3.5 py-2 rounded-[4px] uppercase transition">
                Add To Bag
              </button>
              <button type="button" data-wishlist-remove="${escapeHtml(p.id)}" aria-label="Remove ${escapeHtml(p.name)} from saved items" class="text-gray-400 hover:text-red-500 text-sm">
                x
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    wishlistModalItems?.addEventListener('click', event => {
      const addButton = event.target.closest('[data-wishlist-add]');
      if (addButton) {
        addToCart(addButton.dataset.wishlistAdd);
        closeWishlistModal();
        return;
      }
      const removeButton = event.target.closest('[data-wishlist-remove]');
      if (removeButton) {
        toggleWishlist(removeButton.dataset.wishlistRemove);
        renderWishlistModal();
      }
    });

    function addWishlistToCart() {
      wishlist.forEach(id => {
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          const existing = cart.find(item => item.id === id);
          if (existing) {
            existing.qty++;
          } else {
            cart.push({ ...product, qty: 1 });
          }
        }
      });
      writeShopperStorage('valmont_cart', cart);
      updateCartCount();
      closeWishlistModal();
      openCart();
    }


    // RECENTLY VIEWED PRODUCTS LOGIC
    const recentlyViewedSection = document.getElementById('recentlyViewedSection');
    const recentlyViewedGrid = document.getElementById('recentlyViewedGrid');

    function addToRecentlyViewed(id) {
      // Remove duplicates
      recentlyViewed = recentlyViewed.filter(x => x !== id);
      // Unshift to top
      recentlyViewed.unshift(id);
      // Limit to 6 items
      if (recentlyViewed.length > 6) recentlyViewed.pop();
      
      writeShopperStorage('valmont_recently_viewed', recentlyViewed);
      renderRecentlyViewed();
    }

    function renderRecentlyViewed() {
      if (recentlyViewed.length === 0) {
        recentlyViewedSection.classList.add('hidden');
        return;
      }

      recentlyViewedSection.classList.remove('hidden');
      const items = PRODUCTS.filter(p => recentlyViewed.includes(p.id));

      recentlyViewedGrid.innerHTML = items.map(p => {
        const discount = safeDiscountPercent(p.retail, p.compareAt);
        return `
          <div role="button" tabindex="0" data-recent-product="${escapeHtml(p.id)}" class="bg-white rounded-[4px] p-2 border border-gray-100 shrink-0 w-[130px] hover:shadow transition cursor-pointer">
            <div class="h-[90px] w-full flex items-center justify-center overflow-hidden mb-1 bg-gray-50 rounded-[4px]">
              ${productImg(p.image, p.name, 100)}
            </div>
            <h5 class="text-[10px] text-gray-800 font-bold truncate leading-none">${escapeHtml(p.name.split(' — ')[0])}</h5>
            <span class="block text-[11px] font-black text-gray-900 mt-1">${money(p.retail)}</span>
          </div>
        `;
      }).join('');
    }


    recentlyViewedGrid?.addEventListener('click', event => {
      const card = event.target.closest('[data-recent-product]');
      if (card) openProductDetail(card.dataset.recentProduct);
    });
    recentlyViewedGrid?.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-recent-product]')) {
        event.preventDefault();
        openProductDetail(event.target.dataset.recentProduct);
      }
    });

    // JUMIA SHOPPING CART DRAWER MANAGEMENT
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const checkoutActionBtn = document.getElementById('checkoutActionBtn');
    const backActionBtn = document.getElementById('backActionBtn');
    const cartItemsList = document.getElementById('cartItemsList');

    let checkoutStep = 1;

    cartItemsList?.addEventListener('click', event => {
      const quantityButton = event.target.closest('[data-cart-quantity]');
      if (quantityButton) {
        changeQty(quantityButton.dataset.cartQuantity, Number(quantityButton.dataset.delta));
        return;
      }
      const removeButton = event.target.closest('[data-cart-remove]');
      if (removeButton) removeFromCart(removeButton.dataset.cartRemove);
    });

    function openCart() {
      // Close categories modal if open
      const catModal = document.getElementById('mobileCategoriesModal');
      if (catModal && !catModal.classList.contains('hidden') && !catModal.classList.contains('translate-y-full')) {
        catModal.classList.add('translate-y-full');
        const catOverlay = document.getElementById('mobileCategoriesOverlay');
        if (catOverlay) { catOverlay.classList.remove('opacity-100'); setTimeout(() => catOverlay.classList.add('hidden'), 300); }
      }
      cartOverlay.classList.remove('hidden');
      setTimeout(() => cartOverlay.classList.add('opacity-100'), 10);
      cartDrawer.classList.remove('translate-x-full');
      // Task 2: fetch delivery config on checkout open (anon RPC)
      fetchDeliveryConfig().then(() => { populateRegionSelect(); updateCartDeliveryDisplay(); }).catch(()=>{});
      renderCartUI();
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('bag');
    }

    function closeCart() {
      cartOverlay.classList.remove('opacity-100');
      setTimeout(() => cartOverlay.classList.add('hidden'), 300);
      cartDrawer.classList.add('translate-x-full');
      resetCheckoutSteps();
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('home');
    }

    document.getElementById('cartBtn').addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    function addExpressDelivery(product) {
      const message = `Valmont Express Delivery selected for ${product.name}. Choose your region at checkout to see the authoritative delivery fee.`;
      if (typeof showValmontToast === 'function') showValmontToast(message);
      else alert(message);
    }

    function addToCart(id) {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;
      
      // Adapt price if Dealer Mode is active (falls back to retail when the
      // SKU has no wholesale price — never adds an item at GH₵0).
      const activePrice = effectiveUnitPrice(product, isDealerMode);
      
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.qty++;
      } else {
        const cartProduct = { ...product, retail: activePrice, qty: 1 };
        delete cartProduct.wholesale;
        cart.push(cartProduct);
      }
      
      writeShopperStorage('valmont_cart', cart);
      updateCartCount();
      const cartIcon = document.getElementById('cartBtn') || document.getElementById('mobileCartBtn');
      if (cartIcon) { cartIcon.classList.remove('pulse'); void cartIcon.offsetWidth; cartIcon.classList.add('pulse'); }
      
      // Responsive Native feel: Mobile shows a floating toast, desktop opens side drawer!
      if (window.innerWidth < 768) {
        if (typeof showValmontToast === 'function') {
          showValmontToast(`Added "${product.name.split(' — ')[0]}" to Bag successfully!`);
        }
      } else {
        openCart();
      }

      if (typeof ValmontAnalytics !== 'undefined' && ValmontAnalytics.trackAddToCart) {
        try { ValmontAnalytics.trackAddToCart(product, 1); } catch (e) {}
      }
    }

    function removeFromCart(id) {
      cart = cart.filter(item => item.id !== id);
      writeShopperStorage('valmont_cart', cart);
      updateCartCount();
      renderCartUI();
    }

    function updateCartCount() {
      const count = cart.reduce((sum, item) => sum + item.qty, 0);
      const badge = document.getElementById('cartBadgeCount');
      const mobBadge = document.getElementById('mobileCartBadge');
      const mobBadgeTop = document.getElementById('mobileCartBadgeTop');

      [badge, mobBadge, mobBadgeTop].forEach(b => {
        if (b) {
          if (count === 0) {
            b.classList.add('hidden');
          } else {
            b.classList.remove('hidden');
            b.textContent = count;
          }
        }
      });
    }

    function changeQty(id, delta) {
      const item = cart.find(item => item.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) {
        removeFromCart(id);
      } else {
        renderCartUI();
      }
      writeShopperStorage('valmont_cart', cart);
      updateCartCount();
    }

    function renderCartUI() {
      const listContainer = document.getElementById('cartItemsList');
      const subtotalEl = document.getElementById('cartSubtotal');
      const totalEl = document.getElementById('cartTotal');

      if (cart.length === 0) {
        listContainer.innerHTML = `
          <div class="py-16 text-center text-gray-400 font-semibold text-[13px]">
            Your Valmont Bag is empty.<br>Select a gadget and start shopping!
          </div>
        `;
        subtotalEl.textContent = money(0);
        totalEl.textContent = money(0);
        checkoutActionBtn.disabled = true;
        checkoutActionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return;
      }

      checkoutActionBtn.disabled = false;
      checkoutActionBtn.classList.remove('opacity-50', 'cursor-not-allowed');

      listContainer.innerHTML = cart.map(item => {
        return `
          <div class="flex items-center gap-3 border-b pb-3">
            <div class="h-13 w-14 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0">
              ${productImg(item.image, item.name, 60)}
            </div>
            <div class="flex-1 min-w-0">
              <h5 class="text-[12px] font-bold text-gray-800 truncate leading-tight">${escapeHtml(item.name)}</h5>
              <p class="text-[11px] text-gray-500 font-black mt-0.5">${money(item.retail)}</p>
              
              <div class="flex items-center gap-2.5 mt-1.5">
                <button type="button" data-cart-quantity="${escapeHtml(item.id)}" data-delta="-1" aria-label="Reduce ${escapeHtml(item.name)} quantity" class="bg-gray-100 hover:bg-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded text-[12px]">-</button>
                <span class="text-[12px] font-black text-gray-700">${item.qty}</span>
                <button type="button" data-cart-quantity="${escapeHtml(item.id)}" data-delta="1" aria-label="Increase ${escapeHtml(item.name)} quantity" class="bg-gray-100 hover:bg-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded text-[12px]">+</button>
              </div>
            </div>
            <button type="button" data-cart-remove="${escapeHtml(item.id)}" class="text-red-400 hover:text-red-600 text-[11px] font-black uppercase">
              Remove
            </button>
          </div>
        `;
      }).join('');

      const subtotal = cart.reduce((sum, item) => sum + (item.retail * item.qty), 0);
      subtotalEl.textContent = money(subtotal);
      // Delivery fee is region-aware and free over threshold. Delegate to helper which also updates label.
      if (typeof updateCartDeliveryDisplay === 'function') updateCartDeliveryDisplay();
      else totalEl.textContent = money(subtotal);
    }

    // MULTI-STEP CHECKOUT ACTION LOGIC
    function resetCheckoutSteps() {
      checkoutStep = 1;
      document.getElementById('checkoutStep1').classList.remove('hidden');
      document.getElementById('checkoutStep2').classList.add('hidden');
      document.getElementById('checkoutStep3').classList.add('hidden');
      backActionBtn.classList.add('hidden');
      
      document.getElementById('stepTab1').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
      document.getElementById('stepTab2').className = "pb-0.5";
      document.getElementById('stepTab3').className = "pb-0.5";
      
      checkoutActionBtn.querySelector('span').textContent = "Proceed to Shipping";
    }

    // Clear inline shipping errors on user input
    ['shippingName', 'shippingPhone', 'shippingEmail', 'shippingRegion', 'shippingCity', 'shippingTown', 'shippingGPS', 'shippingStreet'].forEach(function(fieldId) {
      var fieldEl = document.getElementById(fieldId);
      if (fieldEl) {
        fieldEl.addEventListener('input', function() {
          this.style.borderColor = '';
          var errEl = this.parentElement.querySelector('.shipping-field-error');
          if (errEl) errEl.remove();
        });
      }
    });

    checkoutActionBtn.addEventListener('click', () => {
      if (checkoutStep === 1) {
        var checkoutOrderData = {
          items: (typeof cart !== 'undefined' ? cart : []).map(function (i) {
            return { id: i.id || i.item_id || '', name: i.name || i.item_name || '', price: Number(i.retail || i.price || 0), qty: Number(i.qty || 1) };
          }),
          total_amount: (typeof cart !== 'undefined' ? cart.reduce(function (s, i) { return s + (Number(i.retail || i.price || 0) * Number(i.qty || 1)); }, 0) : 0),
          reference_code: 'checkout-' + Date.now()
        };
        if (typeof ValmontAnalytics !== 'undefined' && ValmontAnalytics.trackBeginCheckout) {
          try { ValmontAnalytics.trackBeginCheckout(checkoutOrderData); } catch (e) {}
        }
        checkoutStep = 2;
        document.getElementById('checkoutStep1').classList.add('hidden');
        document.getElementById('checkoutStep2').classList.remove('hidden');
        backActionBtn.classList.remove('hidden');
        
        document.getElementById('stepTab1').className = "text-gray-400 pb-0.5";
        document.getElementById('stepTab2').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
        checkoutActionBtn.querySelector('span').textContent = "Proceed to Payment";
        // Load delivery regions for shipping step (Task 2)
        fetchDeliveryConfig().then(() => { populateRegionSelect(); updateCartDeliveryDisplay(); }).catch(()=>{});
      } else if (checkoutStep === 2) {
        // --- Inline field validation for Shipping step ---
        const fieldIds = ['shippingName', 'shippingPhone', 'shippingEmail', 'shippingRegion', 'shippingCity', 'shippingTown', 'shippingGPS', 'shippingStreet'];
        let hasError = false;

        // Helper: show inline error under a field
        function showFieldError(id, msg) {
          const el = document.getElementById(id);
          if (!el) return;
          el.style.borderColor = '#ef4444';
          let errEl = el.parentElement.querySelector('.shipping-field-error');
          if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'shipping-field-error';
            errEl.style.cssText = 'color:#ef4444;font-size:11px;margin-top:3px;';
            el.parentElement.appendChild(errEl);
          }
          errEl.textContent = msg;
        }

        // Helper: clear inline error for a field
        function clearFieldError(id) {
          const el = document.getElementById(id);
          if (!el) return;
          el.style.borderColor = '';
          const errEl = el.parentElement.querySelector('.shipping-field-error');
          if (errEl) errEl.remove();
        }

        // Clear all previous errors
        fieldIds.forEach(function(id) { clearFieldError(id); });

        // Read values
        const name = document.getElementById('shippingName').value.trim();
        const phone = document.getElementById('shippingPhone').value.trim();
        const email = document.getElementById('shippingEmail').value.trim();
        const city = document.getElementById('shippingCity').value.trim();
        const town = document.getElementById('shippingTown').value.trim();
        const gps = document.getElementById('shippingGPS').value.trim();
        const street = document.getElementById('shippingStreet').value.trim();
        const regionEl = document.getElementById('shippingRegion');
        const region = regionEl ? regionEl.value.trim() : (selectedDeliveryRegion || '');

        // Name: required, at least 2 chars, must contain a letter
        if (!name || name.length < 2 || !/[a-zA-Z]/.test(name)) {
          showFieldError('shippingName', 'Please enter a valid name (at least 2 characters, must contain a letter).');
          hasError = true;
        }

        // Phone: Ghana number validation
        // Accepts 0XXXXXXXXX, +233XXXXXXXXX, 233XXXXXXXXX (ignoring spaces/parens/dashes)
        var phoneDigits = phone.replace(/[\s()\-]/g, '');
        var ghanaPhoneValid = false;
        if (/^0\d{9}$/.test(phoneDigits)) ghanaPhoneValid = true;
        else if (/^\+?233\d{9}$/.test(phoneDigits)) ghanaPhoneValid = true;
        if (!ghanaPhoneValid) {
          showFieldError('shippingPhone', 'Please enter a valid Ghana phone number (e.g. 054 245 1578 or +233 54 245 1578).');
          hasError = true;
        }

        // Email: standard pattern
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailPattern.test(email)) {
          showFieldError('shippingEmail', 'Please enter a valid email address.');
          hasError = true;
        }

        // City: required
        if (!city) {
          showFieldError('shippingCity', 'City is required.');
          hasError = true;
        }

        // Town/Suburb: required
        if (!town) {
          showFieldError('shippingTown', 'Town or suburb is required.');
          hasError = true;
        }

        // Region: required (canonical string from get_delivery_config)
        if (!region) {
          showFieldError('shippingRegion', 'Please select your region.');
          hasError = true;
        } else if (region.length > 60) {
          showFieldError('shippingRegion', 'Region must be 60 characters or fewer.');
          hasError = true;
        } else {
          selectedDeliveryRegion = region;
        }

        // Ghana Post GPS: optional, but if filled must match XX-###-####
        if (gps && !/^[A-Za-z]{2}-\d{3}-\d{4}$/.test(gps)) {
          showFieldError('shippingGPS', 'Ghana Post GPS must be in the format XX-###-#### (e.g. GA-123-4567).');
          hasError = true;
        }

        // Street address: required
        if (!street) {
          showFieldError('shippingStreet', 'Street address is required.');
          hasError = true;
        }

        if (hasError) return;
        // --- End inline validation ---
        
        checkoutStep = 3;
        document.getElementById('checkoutStep2').classList.add('hidden');
        document.getElementById('checkoutStep3').classList.remove('hidden');
        
        document.getElementById('stepTab2').className = "text-gray-400 pb-0.5";
        document.getElementById('stepTab3').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
        checkoutActionBtn.querySelector('span').textContent = "Submit Secure Order";
      } else if (checkoutStep === 3) {
        // Send all prepaid methods to the single Valmont-Pay checkout.
        triggerPaymentCheckout();
      }
    });

    backActionBtn.addEventListener('click', () => {
      if (checkoutStep === 3) {
        checkoutStep = 2;
        document.getElementById('checkoutStep3').classList.add('hidden');
        document.getElementById('checkoutStep2').classList.remove('hidden');
        
        document.getElementById('stepTab3').className = "text-gray-400 pb-0.5";
        document.getElementById('stepTab2').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
        checkoutActionBtn.querySelector('span').textContent = "Proceed to Payment";
      } else if (checkoutStep === 2) {
        checkoutStep = 1;
        document.getElementById('checkoutStep2').classList.add('hidden');
        document.getElementById('checkoutStep1').classList.remove('hidden');
        backActionBtn.classList.add('hidden');
        
        document.getElementById('stepTab2').className = "text-gray-400 pb-0.5";
        document.getElementById('stepTab1').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
        checkoutActionBtn.querySelector('span').textContent = "Proceed to Shipping";
      }
    });

    
    document.getElementById('paymentSentBtn')?.addEventListener('click', () => {
      triggerPaymentCheckout();
    });

    // Global variables for paystack tracking
    let paystackSavedReceipt = '';
    let paystackSavedRef = '';
    let paystackSavedName = '';
    let paystackSavedPayment = '';

    function triggerPaymentCheckout() {
      if (!Array.isArray(cart) || cart.length === 0) {
        if (typeof showValmontToast === 'function') showValmontToast('Your bag is empty — add a gadget before checking out.');
        else alert('Your bag is empty — add a gadget before checking out.');
        return;
      }
      const name = document.getElementById('shippingName').value.trim();
      const phone = document.getElementById('shippingPhone').value.trim();
      const city = document.getElementById('shippingCity').value.trim();
      const town = document.getElementById('shippingTown').value.trim();
      const area = city;
      const gps = document.getElementById('shippingGPS').value.trim();
      const street = document.getElementById('shippingStreet').value.trim();
      const fullAddress = `${street}, ${town}, ${city} ${gps ? '(' + gps + ')' : ''}`;
      const regionEl = document.getElementById('shippingRegion');
      const deliveryRegion = regionEl ? regionEl.value.trim() : (selectedDeliveryRegion || '');
      const paymentOpt = document.querySelector('input[name="paymentOption"]:checked').value;

      const subtotal = cart.reduce((sum, item) => sum + (item.retail * item.qty), 0);
      const ref = `VG-${Date.now().toString().slice(-6)}`;
      const itemsString = cart.map(item => `• ${item.name} (Qty ${item.qty} - ${money(item.retail * item.qty)})`).join('\n');
      
      const paymentNames = { momo: 'Mobile Money', card: 'Credit/Debit Card' };
      paystackSavedRef = ref;
      paystackSavedName = name;
      paystackSavedPayment = paymentNames[paymentOpt];

      // Prepare receipt text
      paystackSavedReceipt = `*VALMONT GADGETS — ORDER RECEIVED*
Ref Code: *#${ref}*

*ITEMS:*
${itemsString}

*TOTAL BILL:* ${money(subtotal)}
*PAYMENT:* ${paymentNames[paymentOpt]} (Paid)

*SHIPPING TO:*
Name: ${name}
Contact: ${phone}
Region: ${area}
Street: ${street || 'To be provided'}

_Stock is verified before dispatch. We will contact you to finalize your delivery. Thank you for choosing Valmont Gadgets Ghana!_`;

      // Both card and Mobile Money use the same secure Valmont-Pay checkout.
      // Ensure region is validated before proceeding (required)
      if (!deliveryRegion) {
        // Fallback validation if trigger called outside step 2 validation
        if (typeof showValmontToast === 'function') showValmontToast('Please select your delivery region.');
        else alert('Please select your delivery region.');
        return;
      }
      redirectToValmontPay({
          subtotal: subtotal,
          reference: ref,
          name: name,
          phone: phone,
          area: area,
          street: street,
          fullAddress: fullAddress,
          paymentMethod: paymentNames[paymentOpt],
          delivery_region: deliveryRegion,
          items: cart.map(function (item) {
            return {
              id: item.id,
              name: item.name,
              image_url: item.image || item.image_url,
              qty: item.qty,
              price: item.retail
            };
          })
        });
    }

    let valmontPayInFlight = false;
    async function redirectToValmontPay(ctx) {
      // Double-submit guard: one gateway checkout in flight at a time.
      if (valmontPayInFlight) return;
      valmontPayInFlight = true;
      const emailEl = document.getElementById('shippingEmail');
      const email = (emailEl && emailEl.value ? emailEl.value.trim() : '') || 'sales@valmontgadgets.com';

      const pendingOrder = {
        reference_code: ctx.reference,
        customer_name: ctx.name,
        customer_phone: ctx.phone,
        customer_email: email,
        email: email,
        customer_area: ctx.area,
        customer_street: ctx.street,
        delivery_address: ctx.fullAddress,
        payment_method: ctx.paymentMethod,
        // total/subtotal/delivery_fee will be overwritten by RPC-authoritative values below
        total_amount: ctx.subtotal,
        subtotal: ctx.subtotal,
        delivery_fee: 0,
        delivery_region: ctx.delivery_region || selectedDeliveryRegion || null,
        items: ctx.items
      };

      try {
        localStorage.setItem('valmont_pending_order', JSON.stringify(pendingOrder));
      } catch (e) {
        console.warn('Unable to persist pending order:', e);
      }

      // Secure Valmont-Pay tenant flow: /api/valmontpay/initialize recomputes
      // every price from the database (client amounts are never charged),
      // records the Pending order and returns the hosted checkout URL signed
      // server-side with the tenant secret key. See api/valmontpay/*.js.
      const btnSpan = checkoutActionBtn && checkoutActionBtn.querySelector('span');
      try {
        if (checkoutActionBtn) checkoutActionBtn.disabled = true;
        if (btnSpan) btnSpan.textContent = 'Opening secure payment…';
        const checkoutToken = localStorage.getItem('valmont_access_token');
        const res = await fetch('/api/valmontpay/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(checkoutToken ? { 'Authorization': `Bearer ${checkoutToken}` } : {})
          },
          body: JSON.stringify({
            items: ctx.items.map(i => ({
              id: i.id,
              qty: i.qty,
              selected_color: i.selected_color || null,
              selected_storage: i.selected_storage || null
            })),
            customer: { name: ctx.name, phone: ctx.phone, email: email, area: ctx.area, street: ctx.street, full_address: ctx.fullAddress },
            payment_method: ctx.paymentMethod,
            delivery_region: ctx.delivery_region || selectedDeliveryRegion || null
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || data.status !== true || !data.url) {
          throw new Error((data && data.message) || ('Payment gateway error (' + res.status + ')'));
        }
        // Sync the pending order to the server-issued order number/reference.
        // ALWAYS use RPC-RETURNED subtotal/delivery_fee/total (never locally computed)
        paystackSavedRef = data.order_number;
        pendingOrder.reference_code = data.order_number;
        pendingOrder.payment_reference = data.reference || null;
        if (data.subtotal != null) pendingOrder.subtotal = Number(data.subtotal);
        if (data.delivery_fee != null) pendingOrder.delivery_fee = Number(data.delivery_fee);
        if (data.delivery_region != null) pendingOrder.delivery_region = String(data.delivery_region);
        if (data.fee_source != null) pendingOrder.fee_source = String(data.fee_source);
        if (data.total != null) pendingOrder.total_amount = Number(data.total);
        else if (data.subtotal != null && data.delivery_fee != null) pendingOrder.total_amount = Number(data.subtotal) + Number(data.delivery_fee);
        // Mirror fee_source for debug
        pendingOrder.total = pendingOrder.total_amount;
        try { localStorage.setItem('valmont_pending_order', JSON.stringify(pendingOrder)); } catch (e) { /* non-fatal */ }
        window.location.href = data.url;
      } catch (err) {
        console.error('Valmont-Pay initialize failed:', err);
        valmontPayInFlight = false;
        alert('Could not open the secure payment page: ' + (err && err.message ? err.message : 'please try again.'));
        if (checkoutActionBtn) checkoutActionBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = 'Submit Secure Order';
      }
    }

    // Legacy in-page Paystack modal removed. The DOM elements below (if still
    // present in cached HTML) are hidden by default and the compatibility stubs
    // ensure legacy inline handlers (e.g. onclick="processSimulatedPayment()")
    // simply forward the customer to the Valmont-Pay gateway.
    const paystackOverlay = document.getElementById('paystackOverlay');
    const paystackModal = document.getElementById('paystackModal');
    const paystackForm = document.getElementById('paystackFormContainer');
    const paystackLoader = document.getElementById('paystackLoader');
    const paystackSuccess = document.getElementById('paystackSuccess');
    const paystackPayBtn = document.getElementById('paystackPayBtn');
    const paystackFooter = document.getElementById('paystackFooter');

    // Mobile Money is still collected via the in-page modal (network + phone).
    // Card payments bypass this modal entirely and redirect straight to the
    // Valmont-Pay gateway via redirectToValmontPay() above.
    function openPaystackModal(amount, option, phone) {
      if (paystackOverlay) paystackOverlay.classList.remove('hidden');
      if (paystackModal) paystackModal.classList.remove('hidden');

      const amtEl = document.getElementById('paystackAmount');
      if (amtEl) amtEl.textContent = money(amount);

      if (paystackForm) paystackForm.classList.remove('hidden');
      if (paystackLoader) paystackLoader.classList.add('hidden');
      if (paystackSuccess) paystackSuccess.classList.add('hidden');
      if (paystackFooter) paystackFooter.classList.remove('hidden');

      if (paystackForm && option === 'momo') {
        paystackForm.innerHTML = `
          <div>
            <label class="block text-[11px] font-black uppercase text-gray-400 mb-1">Select Network *</label>
            <select id="paystackNetwork" class="w-full border p-2.5 rounded-lg text-[13px] outline-none font-bold bg-white focus:border-[#3bb75e]">
              <option value="mtn">MTN Mobile Money</option>
              <option value="telecel">Telecel Cash</option>
              <option value="at">AT Money</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-black uppercase text-gray-400 mb-1">Mobile Money Phone Number *</label>
            <input id="paystackPhone" type="tel" value="${phone}" class="w-full border p-2.5 rounded-lg text-[13px] outline-none font-semibold focus:border-[#3bb75e]" required />
          </div>
        `;
      }
    }

    function closePaystackModal() {
      if (paystackOverlay) paystackOverlay.classList.add('hidden');
      if (paystackModal) paystackModal.classList.add('hidden');
    }

    function processSimulatedPayment() {
      // Compatibility shim: the "Pay" button in the legacy in-page modal used
      // to invoke this. For MoMo the modal collects the network + phone and
      // then re-runs the checkout pipeline, which routes all prepaid methods
      // through the server-side Valmont-Pay tenant flow (redirectToValmontPay).
      closePaystackModal();
      try { triggerPaymentCheckout(); } catch (e) { console.error('Checkout handoff failed:', e); }
    }

    // NOTE: the old finalizeCheckout()/saveOrderToLog() client-priced path was
    // retired (HTTP 410 policy server-side). Orders are recorded by
    // POST /api/valmontpay/initialize with database-priced totals only.

    // ==============================================================================
    // VERIFIED CUSTOMER REVIEWS & 5-STAR RATINGS SYSTEM
    // ==============================================================================
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const REVIEW_PHOTO_HOSTS = new Set([
      'images.unsplash.com',
      'eydsoqnpetqczaeqrscc.supabase.co'
    ]);

    function normalizeReviewPhotoUrl(value) {
      const candidate = String(value || '').trim();
      if (!candidate) return '';
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return '';
        if (!REVIEW_PHOTO_HOSTS.has(parsed.hostname.toLowerCase())) return '';
        if (parsed.hostname.toLowerCase().endsWith('.supabase.co') &&
            !parsed.pathname.startsWith('/storage/v1/object/public/')) return '';
        return parsed.href;
      } catch (_) {
        return '';
      }
    }

    function renderStarRatingSVG(rating) {
      const rounded = Math.round(Number(rating) || 5);
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        const isFilled = i <= rounded;
        starsHtml += `
          <svg class="w-4 h-4 ${isFilled ? 'text-amber-400 fill-current' : 'text-gray-300 fill-current'}" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        `;
      }
      return starsHtml;
    }

    async function loadAndRenderProductReviews(product) {
      if (!product) return;

      let reviews = [];

      // 1. Try fetching approved reviews from Supabase
      if (hasSupabase()) {
        try {
          const remoteData = await supabaseFetch(`reviews?product_id=eq.${encodeURIComponent(product.id)}&is_approved=eq.true&order=created_at.desc`);
          if (Array.isArray(remoteData)) {
            reviews = remoteData;
          }
        } catch (e) {
          console.warn('Supabase reviews fetch fallback:', e);
        }
      }

      // Reviews are loaded only from the moderated database view. Browser
      // storage is not a source of truth and cannot create a "verified" badge.

      // Calculate average rating score
      const totalRating = reviews.reduce((sum, r) => sum + Math.max(1, Math.min(5, Number(r.rating || 5))), 0);
      const avgRating = (reviews.length ? (totalRating / reviews.length) : 4.9).toFixed(1);

      // Update product object reviews_count & rating for storefront syncing
      product.reviews_count = reviews.length;
      product.rating = Number(avgRating);

      // Update UI elements in product detail modal
      const avgEl = document.getElementById('detailAvgRating');
      if (avgEl) avgEl.textContent = avgRating;

      const countEl = document.getElementById('detailReviewsCount');
      if (countEl) countEl.textContent = `(${reviews.length} review${reviews.length === 1 ? '' : 's'})`;

      const detailRevCount = document.getElementById('detailReviews');
      if (detailRevCount) detailRevCount.textContent = reviews.length;

      const starsSummary = document.getElementById('detailStarsSummary');
      if (starsSummary) {
        starsSummary.innerHTML = renderStarRatingSVG(Number(avgRating));
      }

      // Render Reviews List
      const container = document.getElementById('detailReviewsList');
      if (!container) return;

      if (reviews.length === 0) {
        container.innerHTML = '<p class="text-xs font-semibold text-gray-500">No approved reviews yet. Be the first to submit one.</p>';
        return;
      }

      container.innerHTML = reviews.map(r => {
        const ratingNum = Math.max(1, Math.min(5, Number(r.rating || 5)));
        const formattedDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
        const isVerified = r.is_verified_buyer === true;
        const approvedPhotoUrl = normalizeReviewPhotoUrl(r.photo_url);
        
        return `
          <div class="bg-white border border-gray-150 rounded-xl p-4 shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-xs text-gray-900">${escapeHtml(r.customer_name || 'Verified Buyer')}</span>
                ${isVerified ? `
                  <span class="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <svg class="w-3 h-3 fill-current text-green-600" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                    Verified Buyer
                  </span>
                ` : ''}
              </div>
              <span class="text-[11px] font-semibold text-gray-400">${formattedDate}</span>
            </div>
            
            <div class="flex items-center gap-1 mb-2 text-amber-400">
              ${renderStarRatingSVG(ratingNum)}
            </div>

            <p class="text-xs text-gray-700 leading-relaxed font-medium">${escapeHtml(r.comment || '')}</p>

            ${approvedPhotoUrl ? `
              <div class="mt-3">
                <a href="${escapeHtml(approvedPhotoUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="inline-block">
                  <img src="${escapeHtml(approvedPhotoUrl)}" alt="Customer review photo" referrerpolicy="no-referrer" loading="lazy" decoding="async" class="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition" />
                </a>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    function toggleReviewForm() {
      const formSec = document.getElementById('addReviewSection');
      if (!formSec) return;
      const isHidden = formSec.classList.contains('hidden');
      if (isHidden) {
        formSec.classList.remove('hidden');
        initInteractiveStarRating(5);
      } else {
        formSec.classList.add('hidden');
      }
    }

    function initInteractiveStarRating(initialRating = 5) {
      const container = document.getElementById('interactiveRatingStars');
      const ratingInput = document.getElementById('reviewRatingInput');
      if (!container || !ratingInput) return;

      ratingInput.value = initialRating;

      const updateStars = (val) => {
        ratingInput.value = val;
        const btns = container.querySelectorAll('button');
        btns.forEach((btn, index) => {
          const starSvg = btn.querySelector('svg');
          if (index < val) {
            starSvg.classList.remove('text-gray-300');
            starSvg.classList.add('text-amber-400');
          } else {
            starSvg.classList.remove('text-amber-400');
            starSvg.classList.add('text-gray-300');
          }
        });
      };

      container.innerHTML = [1, 2, 3, 4, 5].map(val => `
        <button type="button" data-rating-val="${val}" aria-label="Rate ${val} star${val > 1 ? 's' : ''}" class="p-1 focus:outline-none transition hover:scale-110">
          <svg class="w-6 h-6 ${val <= initialRating ? 'text-amber-400' : 'text-gray-300'} fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      `).join('');

      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const v = Number(btn.getAttribute('data-rating-val'));
          updateStars(v);
        });
      });
    }

    async function handleReviewSubmit(event) {
      if (event?.preventDefault) event.preventDefault();
      const productId = document.getElementById('reviewProductId')?.value || selectedDetailProduct?.id || '';
      const rating = Number(document.getElementById('reviewRatingInput')?.value || 5);
      const comment = document.getElementById('reviewComment')?.value.trim() || '';
      const photoInput = document.getElementById('reviewPhotoUrl')?.value.trim() || '';
      const photoUrl = normalizeReviewPhotoUrl(photoInput) || null;

      if (!currentUser || !localStorage.getItem('valmont_access_token')) {
        showValmontToast('Please sign in before submitting a review.');
        openLoginModal();
        return;
      }
      if (!productId || comment.length < 10 || comment.length > 2000 || rating < 1 || rating > 5) {
        showValmontToast('Write a review of 10–2,000 characters and choose a rating.');
        return;
      }
      if (photoInput && !photoUrl) {
        showValmontToast('Review photos must use an approved HTTPS image host.');
        return;
      }

      const submitBtn = document.getElementById('submitReviewBtn');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await authenticatedSupabaseRpc('submit_product_review', {
          p_product_id: productId,
          p_rating: rating,
          p_comment: comment,
          p_photo_url: photoUrl
        });
        const successMsg = document.getElementById('reviewSuccessMsg');
        if (successMsg) {
          successMsg.classList.remove('hidden');
          setTimeout(() => successMsg.classList.add('hidden'), 5000);
        }
        document.getElementById('productReviewForm')?.reset();
        initInteractiveStarRating(5);
        setTimeout(toggleReviewForm, 900);
      } catch (error) {
        console.warn('Review submission failed:', error);
        showValmontToast(error.message || 'Your review could not be submitted.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    document.getElementById('productReviewForm')?.addEventListener('submit', handleReviewSubmit);
    window.toggleReviewForm = toggleReviewForm;
    window.handleReviewSubmit = handleReviewSubmit;
    window.loadAndRenderProductReviews = loadAndRenderProductReviews;

    // PRODUCT DETAILED VIEW MODAL
    const detailOverlay = document.getElementById('detailOverlay');
    const detailModal = document.getElementById('detailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');

    function openProductDetail(id) {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;

      selectedDetailProduct = product;
      const productIdInput = document.getElementById('reviewProductId');
      if (productIdInput) productIdInput.value = product.id;

      const detailImg = document.getElementById('detailImg');
      // Prefer the optimised WebP for local uploads; the PNG stays as fallback.
      detailImg.src = /^uploads\/.+\.png$/.test(product.image || '')
        ? product.image.replace(/\.png$/, '_800.webp')
        : product.image;
      detailImg.alt = product.name;
      document.getElementById('detailName').textContent = product.name;
      const reviewEl = document.getElementById('detailReviews'); if (reviewEl) reviewEl.textContent = product.reviews_count || 0;
      document.getElementById('detailSpecs').textContent = product.specs;
      document.getElementById('detailStock').textContent = product.stock;
      if (isDealerMode) {
        document.getElementById('detailPrice').textContent = money(effectiveUnitPrice(product, true));
        document.getElementById('detailCompareAt').textContent = money(product.retail);
        document.getElementById('dealerDetailLabel').classList.remove('hidden');
      } else {
        document.getElementById('detailPrice').textContent = money(product.retail);
        document.getElementById('detailCompareAt').textContent = money(product.compareAt);
        document.getElementById('dealerDetailLabel').classList.add('hidden');
      }
      
      const discount = safeDiscountPercent(product.retail, product.compareAt);
      document.getElementById('detailDiscPercent').textContent = discount > 0 ? `-${discount}%` : '';

      // Handle Installment Plan Summary
      const instSummary = document.getElementById('installmentSummary');
      const instBtn = document.getElementById('detailInstallmentBtn');
      if (instSummary) {
        if (product.has_installments) {
          const plan = getInstallmentPlan(product.retail);
          document.getElementById('weeklyInstallment').textContent = `${money(plan.weekly.installment)}/wk`;
          document.getElementById('weeklyDown').textContent = `Deposit: ${money(plan.weekly.down)}`;
          document.getElementById('monthlyInstallment').textContent = `${money(plan.monthly.installment)}/mo`;
          document.getElementById('monthlyDown').textContent = `Deposit: ${money(plan.monthly.down)}`;
          instSummary.classList.remove('hidden');
          
          if (instBtn) {
            instBtn.classList.remove('hidden');
            instBtn.onclick = () => {
              const text = encodeURIComponent(`Hello Valmont Gadgets, I'm interested in the installment deal for the ${product.name}.\n\nPrice: ${money(plan.totalWithMarkup)}\nDeposit (40%): ${money(plan.weekly.down)}\n\nI have my Ghana Card ready and my Guarantor's number for confirmation. Please link me to the processing unit!`);
              window.open(`https://wa.me/233542451578?text=${text}`, '_blank', 'noopener');
            };
          }
        } else {
          instSummary.classList.add('hidden');
          if (instBtn) instBtn.classList.add('hidden');
        }
      }

      detailOverlay.classList.remove('hidden');
      setTimeout(() => detailOverlay.classList.add('opacity-100'), 10);
      detailModal.classList.remove('hidden'); detailModal.classList.add('active');

      // Load verified customer reviews
      loadAndRenderProductReviews(product);

      // Add to recently viewed!
      addToRecentlyViewed(product.id);

      if (typeof ValmontAnalytics !== 'undefined' && ValmontAnalytics.trackViewItem) {
        try { ValmontAnalytics.trackViewItem(product); } catch (e) {}
      }
    }

    function closeProductDetail() {
      detailOverlay.classList.remove('opacity-100');
      setTimeout(() => detailOverlay.classList.add('hidden'), 300);
      detailModal.classList.add('hidden'); detailModal.classList.remove('active');
    }

    closeDetailBtn.addEventListener('click', closeProductDetail);
    detailOverlay.addEventListener('click', closeProductDetail);

    document.getElementById('detailAddToCart').addEventListener('click', () => {
      if (selectedDetailProduct) {
        addToCart(selectedDetailProduct.id);
        closeProductDetail();
      }
    });

    document.getElementById('detailExpressDelivery').addEventListener('click', () => {
      if (selectedDetailProduct) addExpressDelivery(selectedDetailProduct);
    });


    // CUSTOMER PROFILE & LOGIN SIMULATOR
    const loginOverlay = document.getElementById('loginOverlay');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const profileView = document.getElementById('profileView');
    
    let currentLoginTab = 'signin';

    function setLoginTab(tab) {
      currentLoginTab = tab;
      const tabSignIn = document.getElementById('tabSignIn');
      const tabSignUp = document.getElementById('tabSignUp');
      const viewSignIn = document.getElementById('viewSignIn');
      const viewSignUp = document.getElementById('viewSignUp');
      const submitBtn = document.getElementById('loginSubmitBtn');
      
      if (tab === 'signin') {
        if (tabSignIn) tabSignIn.className = "flex-1 text-center pb-2.5 text-[13px] font-black uppercase tracking-wider border-b-2 border-[#ff8c00] text-[#ff8c00] transition-all";
        if (tabSignUp) tabSignUp.className = "flex-1 text-center pb-2.5 text-[13px] text-gray-400 font-bold uppercase tracking-wider hover:text-gray-700 transition-all";
        if (viewSignIn) viewSignIn.classList.remove('hidden');
        if (viewSignUp) viewSignUp.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = "Sign In";
        
        // Inputs validation toggle
        if (document.getElementById('signUpName')) document.getElementById('signUpName').required = false;
        if (document.getElementById('signUpEmail')) document.getElementById('signUpEmail').required = false;
        if (document.getElementById('signUpPhone')) document.getElementById('signUpPhone').required = false;
        if (document.getElementById('signUpPassword')) document.getElementById('signUpPassword').required = false;
        
        if (document.getElementById('loginEmail')) document.getElementById('loginEmail').required = true;
        if (document.getElementById('loginPassword')) document.getElementById('loginPassword').required = true;
      } else {
        if (tabSignUp) tabSignUp.className = "flex-1 text-center pb-2.5 text-[13px] font-black uppercase tracking-wider border-b-2 border-[#ff8c00] text-[#ff8c00] transition-all";
        if (tabSignIn) tabSignIn.className = "flex-1 text-center pb-2.5 text-[13px] text-gray-400 font-bold uppercase tracking-wider hover:text-gray-700 transition-all";
        if (viewSignIn) viewSignIn.classList.add('hidden');
        if (viewSignUp) viewSignUp.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = "Register & Continue";
        
        if (document.getElementById('signUpName')) document.getElementById('signUpName').required = true;
        if (document.getElementById('signUpEmail')) document.getElementById('signUpEmail').required = true;
        if (document.getElementById('signUpPhone')) document.getElementById('signUpPhone').required = true;
        if (document.getElementById('signUpPassword')) document.getElementById('signUpPassword').required = true;
        
        if (document.getElementById('loginEmail')) document.getElementById('loginEmail').required = false;
        if (document.getElementById('loginPassword')) document.getElementById('loginPassword').required = false;
      }
    }

    function openLoginModal() {
      loginOverlay.classList.remove('hidden');
      setTimeout(() => loginOverlay.classList.add('opacity-100'), 10);
      loginModal.classList.remove('hidden');
      
      if (currentUser) {
        // Show Profile Mode
        if (document.getElementById('loginFormContainer')) document.getElementById('loginFormContainer').classList.add('hidden');
        profileView.classList.remove('hidden');
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phone;
      } else {
        // Show Login Form Mode
        if (document.getElementById('loginFormContainer')) document.getElementById('loginFormContainer').classList.remove('hidden');
        profileView.classList.add('hidden');
        setLoginTab('signin'); // Default back to signin
      }
    }

    function closeLoginModal() {
      loginOverlay.classList.remove('opacity-100');
      setTimeout(() => loginOverlay.classList.add('hidden'), 300);
      loginModal.classList.add('hidden');
    }

    async function authRequest(path, body) {
      const response = await fetch(`${VALMONT_SUPABASE.url}/auth/v1/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: VALMONT_SUPABASE.anonKey },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error_description || data.msg || data.message || 'Authentication failed');
      return data;
    }

    function clearDealerPricing() {
      PRODUCTS.forEach((product) => { delete product.wholesale; });
      cart.forEach((item) => {
        const product = PRODUCTS.find((candidate) => candidate.id === item.id);
        if (product) item.retail = product.retail;
        delete item.wholesale;
        delete item.wholesale_price;
      });
      writeShopperStorage('valmont_cart', cart);
    }

    function repriceCartForCurrentMode() {
      cart.forEach((item) => {
        const product = PRODUCTS.find((candidate) => candidate.id === item.id);
        if (product) item.retail = effectiveUnitPrice(product, isDealerMode);
        delete item.wholesale;
        delete item.wholesale_price;
      });
      writeShopperStorage('valmont_cart', cart);
      if (typeof renderCartUI === 'function') renderCartUI();
    }

    async function loadApprovedDealerPrices() {
      const prices = await authenticatedSupabaseRpc('get_my_dealer_prices', {});
      if (!Array.isArray(prices)) throw new Error('Dealer pricing service returned an invalid response.');
      clearDealerPricing();
      const byId = new Map(prices.map((entry) => [String(entry.product_id), Number(entry.wholesale_price)]));
      PRODUCTS.forEach((product) => {
        const price = byId.get(String(product.id));
        if (Number.isFinite(price) && price > 0) product.wholesale = price;
      });
    }

    async function refreshDealerAuthorization() {
      isDealerMode = false;
      dealerProfile = null;
      clearDealerPricing();
      try {
        const profile = await authenticatedSupabaseRpc('get_my_dealer_profile', {});
        if (profile && profile.status === 'approved') {
          // Pricing is fetched only after PostgreSQL confirms this account is
          // approved. Any profile or price failure leaves retail mode active.
          await loadApprovedDealerPrices();
          isDealerMode = true;
          dealerProfile = {
            id: currentUser.id,
            name: profile.business_name,
            phone: profile.phone,
            email: profile.email,
            status: profile.status,
          };
        } else if (profile) {
          dealerProfile = {
            id: currentUser.id,
            name: profile.business_name,
            phone: profile.phone,
            email: profile.email,
            status: profile.status,
          };
        }
      } catch (error) {
        // Failure is deliberately fail-closed: cached metadata cannot enable
        // dealer pricing when authorization is unavailable.
        clearDealerPricing();
        dealerProfile = null;
        console.warn('Dealer authorization unavailable:', error.message || error);
      }
      repriceCartForCurrentMode();
      updateDealerUI();
      if (isDealerMode) showDealerAnnouncementBanner();
      else document.getElementById('dealerBanner')?.remove();
      renderProducts();
      renderFlashSales();
    }

    async function setAuthenticatedUser(account, accessToken, mergeGuest = true) {
      const metadata = account && account.user_metadata || {};
      const email = account && account.email || '';
      currentUser = {
        id: account.id,
        name: metadata.full_name || metadata.name || (email ? email.split('@')[0] : 'Valmont Customer'),
        email,
        phone: metadata.phone || account.phone || '',
        address: metadata.address || '',
        role: 'customer',
      };
      localStorage.setItem('valmont_user', JSON.stringify(currentUser));
      localStorage.removeItem('valmont_is_dealer');
      localStorage.removeItem('valmont_dealer_profile');
      if (accessToken) localStorage.setItem('valmont_access_token', accessToken);
      activateShopperStorage(account.id, mergeGuest);
      await refreshDealerAuthorization();
      populateAuthenticatedCheckout();
    }

    async function handleLoginSubmit(event) {
      event.preventDefault();
      const submitBtn = document.getElementById('loginSubmitBtn');
      if (submitBtn) submitBtn.disabled = true;
      try {
        if (currentLoginTab === 'signin') {
          const email = document.getElementById('loginEmail').value.trim().toLowerCase();
          const password = document.getElementById('loginPassword').value;
          const result = await authRequest('token?grant_type=password', { email, password });
          await setAuthenticatedUser(result.user, result.access_token);
          if (isDealerMode) showDealerAnnouncementBanner();
          updateUserUI(); closeLoginModal(); showValmontToast(`Welcome back, ${currentUser.name}!`);
        } else {
          const name = document.getElementById('signUpName').value.trim();
          const email = document.getElementById('signUpEmail').value.trim().toLowerCase();
          const phone = document.getElementById('signUpPhone').value.trim();
          const password = document.getElementById('signUpPassword').value;
          const address = document.getElementById('signUpAddress').value.trim();
          const result = await authRequest('signup', { email, password, data: { full_name: name, phone, address } });
          if (result.session && result.user) {
            await setAuthenticatedUser(result.user, result.session.access_token); updateUserUI(); closeLoginModal(); showValmontToast(`Account created. Welcome, ${name}!`);
          } else { setLoginTab('signin'); showValmontToast('Account created. Check your email to confirm it, then sign in.'); }
        }
      } catch (error) { console.error('Authentication error:', error); showValmontToast(error.message || 'Unable to authenticate. Please try again.'); }
      finally { if (submitBtn) submitBtn.disabled = false; }
    }

    // Starts a real OAuth flow with Google via Supabase. No account details are
    // invented or stored until Google has authenticated the shopper.
    function handleGoogleSignIn(isHandOff = false) {
      if (!hasSupabase()) {
        showValmontToast('Google sign-in is not configured yet. Please use email sign-in.');
        return;
      }
      // The account page pre-seeds valmont_oauth_return with its own URL before
      // handing off here with ?google_signin=1. Only reuse a stored destination
      // when we are in that hand-off flow; a direct button click on the storefront
      // defaults to the current storefront URL so stale sessionStorage destinations
      // cannot misdirect a homepage sign-in.
      const handOffFlag = (typeof isHandOff !== 'undefined' && isHandOff === true) || new URLSearchParams(window.location.search).get('google_signin') === '1';
      const cleanPath = window.location.pathname === '/index.html' ? '/' : window.location.pathname;
      const currentUrl = `${window.location.origin}${cleanPath}`;
      const oauthReturn = (handOffFlag && sessionStorage.getItem('valmont_oauth_return')) || currentUrl;
      sessionStorage.setItem('valmont_oauth_return', oauthReturn);
      // Supabase must bounce the shopper back to a URL in the project's
      // redirect allowlist; keep the callback to the bare site page (no query
      // string) so it can never be rejected by the allowlist check.
      let callbackUrl = currentUrl;
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && callbackUrl.startsWith('http://')) {
        callbackUrl = callbackUrl.replace(/^http:\/\//i, 'https://');
      }
      const authorizeUrl = `${VALMONT_SUPABASE.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}`;
      window.location.assign(authorizeUrl);
    }

    // Supabase returns a real access token in the URL fragment after Google
    // approves the account. Exchange it for the verified profile, then remove
    // the sensitive fragment from the address bar.
    // Map known Supabase OAuth callback error codes to shopper-friendly
    // messages so the actual failure is visible instead of a generic toast.
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
    async function completeGoogleSignIn() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const searchParams = new URLSearchParams(window.location.search.slice(1));
      const getParam = (k) => hashParams.get(k) || searchParams.get(k);
      const accessToken = getParam('access_token');
      const cleanUrl = () => {
        try {
          const u = new URL(window.location.href);
          u.hash = '';
          ['access_token', 'refresh_token', 'token_type', 'expires_in', 'error', 'error_description', 'error_code', 'code', 'state'].forEach(k => u.searchParams.delete(k));
          const searchStr = u.searchParams.toString() ? `?${u.searchParams.toString()}` : '';
          history.replaceState(null, '', `${u.pathname}${searchStr}`);
        } catch (e) {
          history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
      };
      if (!accessToken) {
        // Google bounced us back without a token (consent denied, sign-up
        // rejected, expired flow…): clear the fragment/search error so it doesn't linger,
        // then tell the shopper exactly why — including the Supabase error
        // code when we don't have a tailored message for it.
        const error = getParam('error');
        const errorDescription = getParam('error_description');
        if (error || errorDescription) {
          sessionStorage.removeItem('valmont_oauth_return');
          cleanUrl();
          const code = String(error || '').toLowerCase();
          const message = OAUTH_ERROR_MESSAGES[code] || OAUTH_ERROR_MESSAGES.default;
          if (!OAUTH_ERROR_MESSAGES[code]) {
            console.error('Google OAuth failed — Supabase code:', code, '| description:', errorDescription);
          }
          const hint = OAUTH_ERROR_MESSAGES[code] ? '' : ` (Code: ${code})`;
          showValmontToast(`${message}${hint}`);
        }
        return false;
      }
      try {
        const response = await fetch(`${VALMONT_SUPABASE.url}/auth/v1/user`, {
          headers: { apikey: VALMONT_SUPABASE.anonKey, Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Unable to verify Google account');
        const account = await response.json();
        await setAuthenticatedUser(account, accessToken);
        cleanUrl();
        // Hand the shopper back to where they started (e.g. the account page
        // after a "Sign up with Google") instead of stranding them on the store.
        const returnTo = sessionStorage.getItem('valmont_oauth_return');
        sessionStorage.removeItem('valmont_oauth_return');
        const currentClean = `${window.location.origin}${window.location.pathname === '/index.html' ? '/' : window.location.pathname}`;
        if (returnTo && returnTo !== currentClean && returnTo !== `${window.location.origin}${window.location.pathname}`) {
          window.location.assign(returnTo);
          return true;
        }
        updateUserUI();
        showValmontToast(`Welcome, ${currentUser.name}!`);
        return true;
      } catch (error) {
        console.error('Google sign-in failed:', error);
        sessionStorage.removeItem('valmont_oauth_return');
        cleanUrl();
        showValmontToast('Google sign-in could not be completed. Please try again.');
        return false;
      }
    }

    async function restoreAuthenticatedSession() {
      const accessToken = localStorage.getItem('valmont_access_token');
      if (!accessToken) return;
      try {
        const response = await fetch(`${VALMONT_SUPABASE.url}/auth/v1/user`, {
          headers: { apikey: VALMONT_SUPABASE.anonKey, Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Session expired');
        const account = await response.json();
        if (!account || !account.id) throw new Error('Invalid account response');
        await setAuthenticatedUser(account, null, true);
        updateUserUI();
      } catch (error) {
        currentUser = null;
        isDealerMode = false;
        dealerProfile = null;
        localStorage.removeItem('valmont_user');
        localStorage.removeItem('valmont_access_token');
        localStorage.removeItem('valmont_refresh_token');
        activateShopperStorage(null);
        updateUserUI();
      }
    }

    completeGoogleSignIn().then(completed => {
      if (!completed) restoreAuthenticatedSession();
    });
    const isGoogleSigninHandOff = new URLSearchParams(window.location.search).get('google_signin') === '1';
    if (isGoogleSigninHandOff) {
      history.replaceState(null, '', window.location.pathname);
      handleGoogleSignIn(true);
    }

    // Consolidated closeLoginModal override (Unified)
    const originalCloseLoginModal = closeLoginModal;
    closeLoginModal = function() {
      if (typeof originalCloseLoginModal === 'function') originalCloseLoginModal();
      
      // Reset Mobile Nav Highlight states
      if (typeof updateMobileNavHighlights === 'function') {
        updateMobileNavHighlights('home');
      }
    };

    function updateUserUI() {
      const mobileHeaderBtn = document.getElementById('mobileHeaderAccountBtn');
      const mobileHeaderLabel = document.getElementById('mobileHeaderAccountLabel');
      if (currentUser) {
        accountLabel.textContent = currentUser.name.split(' ')[0];
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (mobileHeaderBtn) mobileHeaderBtn.classList.add('signed-in');
        if (mobileHeaderLabel) mobileHeaderLabel.textContent = currentUser.name.split(' ')[0];
      } else {
        accountLabel.textContent = "Sign In";
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (mobileHeaderBtn) mobileHeaderBtn.classList.remove('signed-in');
        if (mobileHeaderLabel) mobileHeaderLabel.textContent = 'Sign In';
      }
      updateMobileAccountLabel();
    }

    async function handleLogout() {
      const accessToken = localStorage.getItem('valmont_access_token');
      try {
        if (accessToken) {
          await fetch(`${VALMONT_SUPABASE.url}/auth/v1/logout`, {
            method: 'POST',
            headers: { apikey: VALMONT_SUPABASE.anonKey, Authorization: `Bearer ${accessToken}` }
          });
        }
      } catch (error) {
        console.warn('Remote sign-out could not be confirmed; clearing this device session.', error);
      } finally {
        currentUser = null;
        localStorage.removeItem('valmont_user');
        localStorage.removeItem('valmont_access_token');
        localStorage.removeItem('valmont_refresh_token');
        localStorage.removeItem('valmont_is_dealer');
        localStorage.removeItem('valmont_dealer_profile');
        isDealerMode = false;
        dealerProfile = null;
        clearDealerPricing();
        if (isResellerMode) showCustomerMode();
        activateShopperStorage(null);
        updateUserUI();
        closeLoginModal();
        showValmontToast('You have been signed out successfully.');
      }
    }


    // SWITCH BETWEEN CATALOGUE & RESELLER DESK (Optimized)
    function openDealerModal() {
      if (isDealerMode && dealerProfile) {
        // Active dealer: toggles the private Reseller Desk View
        if (isResellerMode) {
          showCustomerMode();
        } else {
          showResellerDesk();
        }
      } else {
        // Guest: opens registration popup
        openDealerRegistrationPopup();
      }
    }

    function showResellerDesk() {
      isResellerMode = true;
      customerStoreView.classList.add('hidden');
      resellerDeskView.classList.remove('hidden');
      
      const label = document.getElementById('dealerBtnLabel');
      if (label) label.textContent = "Exit Reseller Desk";
      
      const mobLabel = document.getElementById('mobileDealerBtnText');
      if (mobLabel) mobLabel.textContent = "Exit Desk";
      
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('dealer');
    }

    function showCustomerMode() {
      isResellerMode = false;
      customerStoreView.classList.remove('hidden');
      resellerDeskView.classList.add('hidden');
      
      const label = document.getElementById('dealerBtnLabel');
      if (label) label.textContent = "Dealer Portal";
      
      const mobLabel = document.getElementById('mobileDealerBtnText');
      if (mobLabel) mobLabel.textContent = "Dealer";
      
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('home');
    }

    function openDealerRegistrationPopup() {
      const overlay = document.getElementById('dealerOverlay');
      const modal = document.getElementById('dealerModal');
      if (overlay && modal) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
        modal.classList.remove('hidden');
        
        const form = document.getElementById('dealerRegForm');
        const activeProf = document.getElementById('dealerActiveProfile');
        if (dealerProfile?.status === 'approved') {
          if (form) form.classList.add('hidden');
          if (activeProf) activeProf.classList.remove('hidden');
          const modeButton = activeProf && activeProf.querySelector('[data-store-action="deactivate-dealer"]');
          if (modeButton) modeButton.textContent = isDealerMode
            ? 'Use Retail Prices'
            : 'Activate Approved Dealer Prices';
          const name = document.getElementById('dlProfileName');
          const phone = document.getElementById('dlProfilePhone');
          const email = document.getElementById('dlProfileEmail');
          if (name) name.textContent = dealerProfile.name || '';
          if (phone) phone.textContent = dealerProfile.phone || '';
          if (email) email.textContent = dealerProfile.email || '';
        } else {
          if (form) form.classList.remove('hidden');
          if (activeProf) activeProf.classList.add('hidden');
          const emailInput = document.getElementById('dlEmailInput');
          const passwordInput = document.getElementById('dlPasswordInput');
          const passwordGroup = passwordInput && passwordInput.closest('div');
          const submitButton = form && form.querySelector('button[type="submit"]');
          if (currentUser) {
            if (emailInput) { emailInput.value = currentUser.email || ''; emailInput.readOnly = true; }
            if (passwordInput) { passwordInput.required = false; passwordInput.value = ''; }
            if (passwordGroup) passwordGroup.classList.add('hidden');
            if (submitButton) submitButton.textContent = dealerProfile?.status === 'pending'
              ? 'Update Pending Application'
              : 'Submit Dealer Application';
          } else {
            if (emailInput) emailInput.readOnly = false;
            if (passwordInput) passwordInput.required = true;
            if (passwordGroup) passwordGroup.classList.remove('hidden');
            if (submitButton) submitButton.textContent = 'Create Account & Submit Application';
          }
        }
      }
    }

    function closeDealerRegistrationPopup() {
      const overlay = document.getElementById('dealerOverlay');
      const modal = document.getElementById('dealerModal');
      if (overlay && modal) {
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        modal.classList.add('hidden');
      }
      if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('home');
    }



    // Premium Category Sync Function for Spacious Layout
    function syncCategoryPills(key) {
      document.querySelectorAll('.cat-pill').forEach(btn => {
        const isDesktop = btn.classList.contains('desktop-cat') || btn.closest('aside') !== null;
        if (isDesktop) {
          if (btn.dataset.catFilter === key) {
            btn.className = "cat-pill desktop-cat w-full text-left px-3 py-1.5 text-[12.5px] font-bold rounded-[4px] transition flex items-center gap-2 text-[#ff8c00] bg-orange-50/50";
          } else {
            btn.className = "cat-pill desktop-cat w-full text-left px-3 py-1.5 text-[12.5px] font-medium rounded-[4px] transition hover:bg-gray-50 flex items-center gap-2 text-gray-700 hover:text-[#ff8c00]";
          }
        } else {
          // Mobile chip
          if (btn.dataset.catFilter === key) {
            btn.className = "cat-pill mobile-chip bg-[#ff8c00] text-white text-[12px] font-bold px-4 py-2 rounded-[4px] whitespace-nowrap shadow-sm";
          } else {
            btn.className = "cat-pill mobile-chip bg-white border border-gray-200 text-gray-700 text-[12px] font-semibold px-4 py-2 rounded-[4px] whitespace-nowrap shadow-sm";
          }
        }
      });
    }

    // CATEGORY FILTERS EVENT LISTENERS (With Premium Mobile Skeleton Loading!)
    document.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.catFilter;
        currentProductPage = 1;
        syncCategoryPills(activeFilter);
        
        // Show simulated product skeletons on mobile before loading for high-fidelity app feedback!
        if (window.innerWidth < 768) {
          showProductSkeletons();
          setTimeout(renderProducts, 350);
        } else {
          renderProducts();
        }
      });
    });

    const sortSelector = document.getElementById('sortSelector');
    const priceSelector = document.getElementById('priceSelector');
    if (sortSelector) { sortSelector.value = activeSort; sortSelector.addEventListener('change', e => { activeSort = e.target.value; currentProductPage = 1; renderProducts(); }); }
    if (priceSelector) { priceSelector.value = activePriceFilter; priceSelector.addEventListener('change', e => { activePriceFilter = e.target.value; currentProductPage = 1; renderProducts(); }); }

    // SEARCH INPUT TRIGGER (Supports both Desktop and Full-Width Mobile search!)
    function triggerSearch() {
      const desktopQuery = searchInput ? searchInput.value.trim() : '';
      const mobileSearchEl = document.getElementById('mobileSearchInput');
      const mobileQuery = mobileSearchEl ? mobileSearchEl.value.trim() : '';
      
      searchQuery = desktopQuery || mobileQuery;
      renderProducts();
      
      const feedEl = document.getElementById('store-feed'); 
      if (feedEl && typeof feedEl.scrollIntoView === 'function') { 
        feedEl.scrollIntoView({ behavior: 'smooth' }); 
      }
    }

    if (searchBtn) searchBtn.addEventListener('click', triggerSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') triggerSearch();
      });
    }

    const mobSearchEl = document.getElementById('mobileSearchInput');
    if (mobSearchEl) {
      mobSearchEl.addEventListener('keydown', event => {
        if (event.key === 'Enter') triggerSearch();
      });
      // Fast instant-search as you type on mobile!
      mobSearchEl.addEventListener('input', () => {
        const desktopQuery = searchInput ? searchInput.value.trim() : '';
        const mobileQuery = mobSearchEl.value.trim();
        searchQuery = mobileQuery || desktopQuery;
        renderProducts();
      });
    }

  // === DYNAMIC PWA DUAL-INSTALLATION STATE CONTROLLER ===
  let deferredPrompt;
  let pwaBannerOverlay = document.getElementById('pwaInstallBanner');
  
  // Stash DOM elements for re-binding
  document.addEventListener('DOMContentLoaded', () => {
    pwaBannerOverlay = document.getElementById('pwaInstallBanner');
    
    // Bind all PWA install buttons dynamically
    const installButtons = [
      document.getElementById('pwaInstallBtn'),
      document.getElementById('footerInstallBtn'),
      document.getElementById('drawerInstallBtn')
    ];

    installButtons.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', async () => {
          // If already marked as installed, do nothing
          if (btn.classList.contains('pwa-installed-badge')) return;

          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA Install Prompt outcome: ${outcome}`);
            deferredPrompt = null;
            dismissPwaBanner();
          } else {
            openPwaInstructionsModal();
          }
        });
      }
    });

    // Run standalone check on start
    checkStandalonePWAStatus();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Only show if they haven't explicitly dismissed it in this session
    if (localStorage.getItem('valmont_pwa_dismissed') !== 'true') {
      if (pwaBannerOverlay) {
        pwaBannerOverlay.classList.remove('hidden');
      }
    }
  });

  window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed successfully!');
    markPwaAsInstalledUI();
    dismissPwaBanner();
  });

  function dismissPwaBanner() {
    if (pwaBannerOverlay) {
      pwaBannerOverlay.classList.add('hidden');
    }
    localStorage.setItem('valmont_pwa_dismissed', 'true');
  }

  function checkStandalonePWAStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      markPwaAsInstalledUI();
    }
  }

  function markPwaAsInstalledUI() {
    // Style buttons exactly like your screenshot (App installed in slate box with checkmark!)
    const footerBtn = document.getElementById('footerInstallBtn');
    const drawerBtn = document.getElementById('drawerInstallBtn');
    const footerText = document.getElementById('footerInstallBtnText');
    const drawerText = document.getElementById('drawerInstallBtnText');

    [footerBtn, drawerBtn].forEach(btn => {
      if (btn) {
        btn.className = "pwa-installed-badge bg-[#0a1f1d] border border-emerald-950 text-[#3bb75e] text-[11px] font-bold py-2 px-4 rounded-[4px] flex items-center gap-1.5 cursor-default select-none shadow-inner";
        // Update SVGs inside to show checkmark
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> App installed`;
      }
    });
  }

    // INIT ALL PRODUCTS ON DOCUMENT LOAD
    startFlashTimer();
    renderProducts();
    renderFlashSales();
    updateWishlistUI();
    renderRecentlyViewed();
    updateUserUI();

    // Merge products added via admin panel (async, re-renders on completion)
    syncProductsFromSupabase();

    // Auto-fill checkout fields only after Supabase has verified the account.
    function populateAuthenticatedCheckout() {
      if (!currentUser) return;
      const shippingName = document.getElementById('shippingName');
      const shippingPhone = document.getElementById('shippingPhone');
      const shippingEmail = document.getElementById('shippingEmail');
      if (shippingName) shippingName.value = currentUser.name;
      if (shippingPhone) shippingPhone.value = currentUser.phone;
      if (shippingEmail && currentUser.email) shippingEmail.value = currentUser.email;
      try {
        const savedAddresses = safeParseJSON(localStorage.getItem(shopperStorageKey('valmont_customer_addresses')), []);
        const address = savedAddresses.find(item => item.is_default) || savedAddresses[0];
        if (address) {
          const city = document.getElementById('shippingCity');
          const town = document.getElementById('shippingTown');
          const street = document.getElementById('shippingStreet');
          if (city) city.value = address.zone || '';
          if (town) town.value = address.name || '';
          if (street) street.value = [address.street, address.landmark].filter(Boolean).join(', ');
        }
        const preference = safeParseJSON(localStorage.getItem(shopperStorageKey('valmont_payment_preference')), null);
        if (preference?.method) {
          const paymentRadio = document.querySelector(`input[name="paymentOption"][value="${preference.method}"]`);
          if (paymentRadio) paymentRadio.checked = true;
        }
      } catch (error) { console.warn('Saved checkout data could not be loaded:', error); }
    }
  

    const resellerDeskHTML = `
      <!-- A Simple, Safe Flow -->
      <section class="how-it-works" id="how-it-works">
        <div class="wrap">
          <div class="k">A Simple, Safe Flow</div>
          <h2 class="t">Customer Pays You.<br>You Settle the Supplier.</h2>
          <p class="lead">This is a reseller business model. You set the retail price; your supplier charges you the wholesale price. Record the difference as your direct profit.</p>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 text-[13px]">
            <div class="bg-[#0d1e3d] p-4 rounded-lg border border-[#142850]">
              <span class="block text-2xl font-bold text-[#ff8c00] mb-2">01</span>
              <h4 class="font-extrabold text-[12px] uppercase mb-1.5">Get Price List</h4>
              <p class="text-gray-400 font-medium">Verify wholesale price, storage options, and current stock with the supplier before listing items.</p>
            </div>
            <div class="bg-[#0d1e3d] p-4 rounded-lg border border-[#142850]">
              <span class="block text-2xl font-bold text-[#ff8c00] mb-2">02</span>
              <h4 class="font-extrabold text-[12px] uppercase mb-1.5">Set Selling Price</h4>
              <p class="text-gray-400 font-medium">Add your custom markup and profit margin. Publish one clear, all-inclusive selling price.</p>
            </div>
            <div class="bg-[#0d1e3d] p-4 rounded-lg border border-[#142850]">
              <span class="block text-2xl font-bold text-[#ff8c00] mb-2">03</span>
              <h4 class="font-extrabold text-[12px] uppercase mb-1.5">Confirm Stock</h4>
              <p class="text-gray-400 font-medium">Always confirm product availability with the supplier before sending payment details to a customer.</p>
            </div>
            <div class="bg-[#0d1e3d] p-4 rounded-lg border border-[#142850]">
              <span class="block text-2xl font-bold text-[#ff8c00] mb-2">04</span>
              <h4 class="font-extrabold text-[12px] uppercase mb-1.5">Receive & Settle</h4>
              <p class="text-gray-400 font-medium">Customer pays you retail, you pay supplier wholesale. Keep the difference as instant business profit!</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Profit Calculator Desk -->
      <section class="pricing-section bg-[#0d1e3d]" id="calculator">
        <div class="wrap">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            <div class="pricing-copy">
              <div class="k">Your Pricing Desk</div>
              <h2 class="t" style="text-align:left;">Know Your Profit<br>Before You Post.</h2>
              <p class="lead">Use this interactive estimator for every product. Keep wholesale costs, shipping expenses, and actual retail profit separate and clear.</p>
              
              <div class="bg-[#050d24] p-5 rounded-lg border border-[#142850]">
                <div class="flex justify-between items-center pb-2 border-b border-gray-800 font-semibold text-[13px] text-gray-400">
                  <span>Selling Price = Cost + Profit + Delivery</span>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Pay Supplier</span>
                    <span id="supplier-pay" class="text-lg font-black text-white">GH₵ 0</span>
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Keep Profit</span>
                    <span id="keep-amount" class="text-lg font-black text-[#ff8c00]">GH₵ 0</span>
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Final Retail</span>
                    <span id="profit" class="text-lg font-black text-white">GH₵ 0</span>
                  </div>
                </div>
                <div class="mt-3 text-[12px] font-bold text-[#ff8c00]" id="margin">0.0% margin on sale</div>
              </div>
            </div>

            <div class="calc-box bg-[#0b1a38] p-6 rounded-xl border border-[#142850]">
              <div class="field mb-4">
                <label for="product-selector" style="font-weight: 700; color: #ff8c00; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">
                  Quick Fill from Store Stock
                </label>
                <select id="product-selector" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #142850; background-color: #050d24; color: #ffffff; font-weight: 600; font-size: 14px; outline: none; transition: border-color 0.2s;">
                  <option value="">-- Choose a Product --</option>
                </select>
              </div>

              <div class="field mb-3.5">
                <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Wholesale Cost *</label>
                <input id="wholesale" type="number" placeholder="2000" class="w-full bg-[#050d24] border border-[#142850] p-3 rounded-lg text-white text-[13px] outline-none" />
              </div>
              <div class="field mb-3.5">
                <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Your Markup (Desired Profit) *</label>
                <input id="retail" type="number" placeholder="450" class="w-full bg-[#050d24] border border-[#142850] p-3 rounded-lg text-white text-[13px] outline-none" />
              </div>
              <div class="field">
                <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Other Costs (Accra Delivery + MoMo Fees)</label>
                <input id="costs" type="number" placeholder="80" class="w-full bg-[#050d24] border border-[#142850] p-3 rounded-lg text-white text-[13px] outline-none" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Order Tracking Management -->
      <section class="order-system-section bg-[#0b1a38]" id="orders">
        <div class="wrap">
          <div class="order-grid grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="col-span-1">
              <div class="k">Keep the Business Organized</div>
              <h2 class="t" style="text-align:left;">One Order Sheet.<br>Every Sale Visible.</h2>
              <p class="lead">Do not rely on memory or WhatsApp chats alone. Use this structured order log to manage delivery statuses, wholesale settlements, and business profits.</p>
              <button id="new-order" class="bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[11px] tracking-widest px-6 py-3 rounded-[4px] uppercase transition shadow">
                + Add Example Order
              </button>
            </div>
            
            <div class="col-span-2 bg-[#0d1e3d] p-4 rounded-xl border border-[#142850] overflow-hidden overflow-x-auto">
              <div class="order-table min-w-[500px]" id="localOrderTable">
                <div class="row font-bold text-gray-400 border-b border-[#142850] pb-2 text-[11px] uppercase tracking-wider">
                  <span>Order Ref</span>
                  <span>Product Item</span>
                  <span>Payment status</span>
                  <span>Supplier Settle</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Reseller FAQ Rules Section -->
      <section class="faq-section bg-[#0d1e3d]" id="faq">
        <div class="wrap">
          <div class="k">The Important Rules</div>
          <h2 class="t text-center mb-12">Keep It Fair for Both Sides</h2>
          
          <div class="space-y-4 max-w-[800px] mx-auto text-left">
            <div class="faq-item">
              <div class="faq-header">
                <span>How do I know what to pay my supplier?</span>
                <span class="faq-icon text-[#ff8c00] text-lg">+</span>
              </div>
              <div class="faq-body">
                <p>Verify wholesale pricing agreements with your supplier before listing. Pay exactly the wholesale price recorded for each transaction rather than a variable percentage, unless otherwise negotiated in writing.</p>
              </div>
            </div>
            <div class="faq-item">
              <div class="faq-header">
                <span>What is my exact retail commission or profit?</span>
                <span class="faq-icon text-[#ff8c00] text-lg">+</span>
              </div>
              <div class="faq-body">
                <p>Your direct retail profit is calculated as: *Customer Retail Price − Supplier Wholesale Price − Shipping/MoMo Fees*. Example: GH₵ 2,450 selling price − GH₵ 2,000 wholesale − GH₵ 80 shipping costs = GH₵ 370 net business profit.</p>
              </div>
            </div>
            <div class="faq-item">
              <div class="faq-header">
                <span>Should customers pay my business or the supplier?</span>
                <span class="faq-icon text-[#ff8c00] text-lg">+</span>
              </div>
              <div class="faq-body">
                <p>Customers pay your authorized Valmont Gadgets channels (Mobile Money or Bank Account) after you confirm stock availability. You immediately pay the supplier's wholesale invoice to dispatch the order, keeping your profit.</p>
              </div>
            </div>
            <div class="faq-item">
              <div class="faq-header">
                <span>What warranty is guaranteed on phones and gadgets?</span>
                <span class="faq-icon text-[#ff8c00] text-lg">+</span>
              </div>
              <div class="faq-body">
                <p>All premium devices (iPhones & Apple, Samsung Galaxy flagship phones, MacBooks) come with an official 12-month manufacturer warranty. Accessories and batteries feature standard 3-6 month store guarantees.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('dealer-desk-view').innerHTML = resellerDeskHTML;

    // LOCAL ORDERS LOG DATABASE SYNC
    function renderLocalOrderTable() {
      const logContainer = document.getElementById('localOrderTable');
      if (!logContainer) return;

      const headerHTML = `
        <div class="row font-bold text-gray-400 border-b border-[#142850] pb-2 text-[11px] uppercase tracking-wider">
          <span>Order Ref</span>
          <span>Product Item</span>
          <span>Payment status</span>
          <span>Supplier Settle</span>
        </div>
      `;

      let localOrders = safeParseJSON(localStorage.getItem('valmont_orders'), []);
      
      if (localOrders.length === 0) {
        localOrders = [
          { id: 'VG-1042', date: 'Today', item: 'Nova X1 128GB', status: 'Awaiting pay', supplier: 'To Settle' },
          { id: 'VG-1041', date: 'Yesterday', item: 'Pulse Buds Air', status: 'Paid to You', supplier: 'Settled OK' }
        ];
        localStorage.setItem('valmont_orders', JSON.stringify(localOrders));
      }

      const rowsHTML = localOrders.map(ord => {
        const isPaid = ord.status.toLowerCase().includes('paid');
        const isSettled = ord.supplier.toLowerCase().includes('settled');
        return `
          <div class="row text-[12px] border-b border-gray-800 py-3 font-medium">
            <span><b>#${ord.id}</b><br><small class="text-gray-500">${ord.date}</small></span>
            <span class="truncate pr-2">${ord.item}</span>
            <span><span class="status ${isPaid ? 'success' : 'pending'}">${ord.status}</span></span>
            <span><span class="status ${isSettled ? 'success' : 'pending'}">${ord.supplier}</span></span>
          </div>
        `;
      }).join('');

      logContainer.innerHTML = headerHTML + rowsHTML;
    }

    // Connect product selection dropdown dynamically inside reseller scripts
    function setupResellerPortalCalculators() {
      const productDropdown = document.getElementById('product-selector');
      const wholesaleInput = document.getElementById('wholesale');
      const retailInput = document.getElementById('retail');
      const costsInput = document.getElementById('costs');

      if (productDropdown && typeof PRODUCTS !== 'undefined') {
        productDropdown.innerHTML = '<option value="">-- Choose a Product --</option>';
        PRODUCTS.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name} (Sell: GH₵ ${p.retail.toLocaleString()})`;
          productDropdown.appendChild(opt);
        });

        productDropdown.addEventListener('change', () => {
          const selectedId = productDropdown.value;
          if (!selectedId) return;
          const product = PRODUCTS.find(p => p.id === selectedId);
          if (product) {
            if (wholesaleInput) wholesaleInput.value = product.wholesale || 0;
            if (retailInput) retailInput.value = product.retail || 0;
            // Dealer operating costs are user-entered. Supplier delivery and
            // payment expenses are never embedded in the public storefront.
            if (costsInput) costsInput.value = 0;
            calculateResellerProfit();
          }
        });
      }

      function calculateResellerProfit() {
        if (!wholesaleInput || !retailInput || !costsInput) return;
        const supplier = Number(wholesaleInput.value || 0);
        const markup = Number(retailInput.value || 0);
        const otherCosts = Number(costsInput.value || 0);
        const selling = supplier + markup + otherCosts;
        
        const money = val => `GH₵ ${Math.max(0, Math.round(val)).toLocaleString()}`;
        
        const profitText = document.querySelector('#profit');
        const supplierPayText = document.querySelector('#supplier-pay');
        const keepAmountText = document.querySelector('#keep-amount');
        const marginText = document.querySelector('#margin');

        if (profitText) profitText.textContent = money(selling); // Using profit label to show Total Selling Price now
        if (supplierPayText) supplierPayText.textContent = money(supplier);
        if (keepAmountText) keepAmountText.textContent = money(markup);
        if (marginText) {
          marginText.textContent = `${selling ? ((markup / selling) * 100).toFixed(1) : '0.0'}% margin on sale`;
        }
      }

      [wholesaleInput, retailInput, costsInput].forEach(inp => {
        if (inp) inp.addEventListener('input', calculateResellerProfit);
      });

      calculateResellerProfit();
    }

    function setupResellerOrdersButton() {
      const btnNewOrder = document.getElementById('new-order');
      if (btnNewOrder) {
        btnNewOrder.addEventListener('click', () => {
          const id = Math.floor(1050 + Math.random() * 300);
          const randomProduct = typeof PRODUCTS !== 'undefined' ? PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)].name : 'New product order';
          
          let orders = safeParseJSON(localStorage.getItem('valmont_orders'), []);
          orders.unshift({ id: `VG-${id}`, date: 'Just Now', item: randomProduct.split(' — ')[0], status: 'Awaiting pay', supplier: 'To Settle' });
          localStorage.setItem('valmont_orders', JSON.stringify(orders));
          renderLocalOrderTable();
        });
      }
    }

    function setupResellerFAQs() {
      const faqHeaders = document.querySelectorAll('.faq-header');
      if (faqHeaders.length > 0) {
        faqHeaders.forEach(header => {
          header.addEventListener('click', () => {
            const item = header.parentElement;
            const body = item.querySelector('.faq-body');
            const isActive = item.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(other => {
              if (other !== item) {
                other.classList.remove('active');
                const otherBody = other.querySelector('.faq-body');
                if (otherBody) otherBody.style.maxHeight = null;
              }
            });

            if (isActive) {
              item.classList.remove('active');
              if (body) body.style.maxHeight = null;
            } else {
              item.classList.add('active');
              if (body) body.style.maxHeight = body.scrollHeight + 'px';
            }
          });
        });
      }
    }

    // Init reseller scripts
    renderLocalOrderTable();
    setupResellerPortalCalculators();
    setupResellerOrdersButton();
    setupResellerFAQs();
  
  // === AUTHORITATIVE DEALER APPLICATION & PRICING ===
  // Account creation never grants dealer access. PostgreSQL owns application
  // status, approval and the price list returned to an approved account.
  function closeDealerModal() {
    closeDealerRegistrationPopup();
  }

  async function registerDealerAccount(event) {
    event.preventDefault();
    const name = document.getElementById('dlNameInput').value.trim();
    const phone = document.getElementById('dlPhoneInput').value.trim();
    const email = document.getElementById('dlEmailInput').value.trim().toLowerCase();
    const password = document.getElementById('dlPasswordInput').value;
    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (!/^[\p{L}][\p{L} .&'\-]{1,79}$/u.test(name)) return showValmontToast('Enter a valid business name only.');
    if (!/^\+233\d{9}$/.test(normalizedPhone) && !/^0\d{9}$/.test(normalizedPhone)) return showValmontToast('Enter a valid Ghana phone number.');
    if (!currentUser && password.length < 6) return showValmontToast('Password must be at least 6 characters.');
    if (!currentUser && !/^\S+@\S+\.\S+$/.test(email)) return showValmontToast('Enter a valid email address.');

    const button = event.currentTarget.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      if (!currentUser) {
        const result = await authRequest('signup', {
          email,
          password,
          data: { full_name: name, phone: normalizedPhone }
        });
        if (!result.session || !result.user) {
          closeDealerModal();
          showValmontToast('Account created. Confirm your email, sign in, then submit your dealer application.');
          return;
        }
        await setAuthenticatedUser(result.user, result.session.access_token);
        updateUserUI();
      }

      const application = await authenticatedSupabaseRpc('apply_for_dealer', {
        p_business_name: name,
        p_phone: normalizedPhone
      });
      await refreshDealerAuthorization();
      closeDealerModal();
      if (application?.status === 'approved' && isDealerMode) {
        showDealerAnnouncementBanner();
        showValmontToast('Your approved dealer pricing is active.');
      } else {
        showValmontToast('Dealer application submitted for review. Retail pricing remains active until approval.');
      }
    } catch (error) {
      console.error('Dealer application error:', error);
      showValmontToast(error.message || 'Dealer application failed.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function deactivateDealerMode() {
    try {
      if (!isDealerMode && dealerProfile?.status === 'approved') {
        await loadApprovedDealerPrices();
        isDealerMode = true;
        repriceCartForCurrentMode();
        showDealerAnnouncementBanner();
        showValmontToast('Approved dealer pricing is active.');
      } else {
        isDealerMode = false;
        clearDealerPricing();
        repriceCartForCurrentMode();
        const banner = document.getElementById('dealerBanner');
        if (banner) banner.remove();
        if (isResellerMode) showCustomerMode();
        showValmontToast('Retail pricing is active on this device.');
      }
      updateDealerUI();
      renderProducts();
      renderFlashSales();
      closeDealerModal();
    } catch (error) {
      isDealerMode = false;
      clearDealerPricing();
      updateDealerUI();
      showValmontToast('Dealer pricing could not be verified. Retail pricing remains active.');
    }
  }

  function updateDealerUI() {
    const label = document.getElementById('dealerBtnLabel');
    if (label) label.textContent = isDealerMode && dealerProfile
      ? `Dealer: ${(dealerProfile.name || 'Approved').split(' ')[0]}`
      : 'Dealer Portal';
  }

  function showDealerAnnouncementBanner() {
    const existing = document.getElementById('dealerBanner');
    if (existing) existing.remove();
    if (!isDealerMode || dealerProfile?.status !== 'approved') return;
    const banner = document.createElement('div');
    banner.id = 'dealerBanner';
    banner.className = 'bg-green-600 text-white text-center py-2.5 px-4 text-xs font-bold tracking-wide transition-all uppercase';
    banner.textContent = 'AUTHORIZED DEALER ACCESS ACTIVE — APPROVED WHOLESALE PRICING APPLIED';
    document.body.insertBefore(banner, document.body.children[1] || null);
  }

    // Hook local dealer calculator
    const dlWholesale = document.getElementById('dl_wholesale');
    const dlMarkup = document.getElementById('dl_markup');
    const dlCalcResult = document.getElementById('dl_calc_result');
    const dlMarginText = document.getElementById('dl_margin_text');

    function calculateDealerPrice() {
      if (!dlWholesale || !dlMarkup || !dlCalcResult) return;
      const cost = Number(dlWholesale.value || 0);
      const markup = Number(dlMarkup.value || 0);
      const retail = cost + markup;
      const margin = retail ? ((markup / retail) * 100).toFixed(1) : '0.0';
      
      dlCalcResult.textContent = money(retail);
      if (dlMarginText) {
        dlMarginText.textContent = `${margin}% margin on sale`;
      }
    }

    if (dlWholesale && dlMarkup) {
      [dlWholesale, dlMarkup].forEach(inp => inp.addEventListener('input', calculateDealerPrice));
      calculateDealerPrice();
    }

  // === VALMONT PREMIUM MOBILE NATIVE-UX UPGRADES ===
  function showProductSkeletons() {
    const skeletonHTML = Array.from({ length: 6 }).map(() => `
      <div class="bg-white rounded-[4px] border border-gray-150 p-3 flex flex-col justify-between animate-pulse">
        <div class="h-[140px] w-full bg-gray-100 rounded-[4px] mb-3"></div>
        <div class="h-3.5 bg-gray-200 rounded w-5/6 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-1/2 mb-3"></div>
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-3.5 bg-gray-100 rounded w-1/4"></div>
      </div>
    `).join('');
    document.getElementById('productGrid').innerHTML = skeletonHTML;
  }

  function showValmontToast(message) {
    const toast = document.getElementById('valmontToast');
    const toastText = document.getElementById('valmontToastText');
    if (toast && toastText) {
      toastText.textContent = message;
      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-20');
      toast.classList.add('opacity-100', 'translate-y-0');
      
      // Auto-hide after 3 seconds
      setTimeout(hideValmontToast, 3000);
    }
  }

  function hideValmontToast() {
    const toast = document.getElementById('valmontToast');
    if (toast) {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-20');
    }
  }

    // === JUMIA-STYLE MOBILE BOTTOM NAVIGATION LOGIC ===
  let mobileCategoriesOverlay = document.getElementById('mobileCategoriesOverlay');
  let pwaInstructionsOverlay = document.getElementById('pwaInstructionsOverlay');
  let pwaInstructionsModal = document.getElementById('pwaInstructionsModal');
  let mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  let mobileMenuModal = document.getElementById('mobileMenuModal');
  let mobileCategoriesModal = document.getElementById('mobileCategoriesModal');
  let mobileCategoryGrid = document.getElementById('mobileCategoryGrid');
  mobileCategoryGrid?.addEventListener('click', event => {
    const button = event.target.closest('[data-mobile-category]');
    if (button) selectMobileCategory(button.dataset.mobileCategory);
  });

  function mobileGoHome() {
    activeFilter = 'all';
    renderProducts();
    // Scroll smoothly to home grid
    const feedEl = document.getElementById('store-feed'); if (feedEl && typeof feedEl.scrollIntoView === 'function') { feedEl.scrollIntoView({ behavior: 'smooth' }); }
    updateMobileNavHighlights('home');
  }

  function openMobileCategoriesModal() {
    // Close shopping bag drawer if it's open
    const cartDrawer = document.getElementById('cartDrawer');
    if (cartDrawer && !cartDrawer.classList.contains('translate-x-full')) {
      cartDrawer.classList.add('translate-x-full');
    }
    if (mobileCategoriesOverlay) {
      mobileCategoriesOverlay.classList.remove('hidden');
      setTimeout(() => mobileCategoriesOverlay.classList.add('opacity-100'), 10);
    }
    if (mobileCategoriesModal) {
      mobileCategoriesModal.classList.remove('hidden');
      mobileCategoriesModal.classList.remove('translate-y-full');
    }
    renderMobileCategoriesGrid();
    updateMobileNavHighlights('categories');
  }

  function closeMobileCategoriesModal() {
    if (mobileCategoriesOverlay) {
      mobileCategoriesOverlay.classList.remove('opacity-100');
      setTimeout(() => mobileCategoriesOverlay.classList.add('hidden'), 300);
    }
    if (mobileCategoriesModal) {
      mobileCategoriesModal.classList.add('translate-y-full');
      setTimeout(() => mobileCategoriesModal.classList.add('hidden'), 300);
    }
  }

  function renderMobileCategoriesGrid() {
    if (!mobileCategoryGrid || typeof CATEGORY_LABELS === 'undefined') return;

    // Build the grid list from the category keys
    const keys = Object.keys(CATEGORY_LABELS);
    mobileCategoryGrid.innerHTML = keys.map(key => {
      const isSelected = activeFilter === key;
      const activeClass = isSelected ? 'bg-orange-50 border-[#ff8c00] text-[#ff8c00] font-bold' : 'bg-gray-50 border-gray-100 text-gray-700 font-medium';
      return `
        <button type="button" data-mobile-category="${escapeHtml(key)}" class="border p-3 rounded-lg text-[12px] text-center transition ${activeClass} shadow-sm truncate">
          ${escapeHtml(CATEGORY_LABELS[key])}
        </button>
      `;
    }).join('');
  }

  function selectMobileCategory(key) {
    activeFilter = key;
    renderProducts();
    closeMobileCategoriesModal();
    
    // Sync active category pills
    syncCategoryPills(key);

    // Scroll smoothly to products grid
    const feedEl = document.getElementById('store-feed'); if (feedEl && typeof feedEl.scrollIntoView === 'function') { feedEl.scrollIntoView({ behavior: 'smooth' }); }
    updateMobileNavHighlights('categories');
  }

  // Run initial badge checks and set core listeners (no fragile overrides)
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const feedEl = document.getElementById('store-feed'); if (feedEl && typeof feedEl.scrollIntoView === 'function') { feedEl.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  setTimeout(() => {
    if (typeof updateCartCount === 'function') updateCartCount();
    if (typeof updateWishlistUI === 'function') updateWishlistUI();
    if (typeof updateMobileNavHighlights === 'function') updateMobileNavHighlights('home');
    if (typeof updateMobileAccountLabel === 'function') updateMobileAccountLabel();
  }, 300);


    // Bind Desktop Account Button to open login modal
    const desktopAccountBtn = document.getElementById('accountBtn');
    if (desktopAccountBtn) {
      desktopAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openLoginModal();
      });
    }
  // === CUSTOM PWA DETAILED INSTRUCTIONS MODAL SYSTEM ===

  function openPwaInstructionsModal() {
    if (pwaInstructionsOverlay && pwaInstructionsModal) {
      pwaInstructionsOverlay.classList.remove('hidden');
      setTimeout(() => pwaInstructionsOverlay.classList.add('opacity-100'), 10);
      pwaInstructionsModal.classList.remove('hidden');
      pwaInstructionsModal.classList.remove('translate-y-full');
    }
  }

  function closePwaInstructionsModal() {
    if (pwaInstructionsOverlay && pwaInstructionsModal) {
      pwaInstructionsOverlay.classList.remove('opacity-100');
      setTimeout(() => pwaInstructionsOverlay.classList.add('hidden'), 300);
      pwaInstructionsModal.classList.add('translate-y-full');
      setTimeout(() => pwaInstructionsModal.classList.add('hidden'), 300);
    }
  }

  // === MOBILE LEFT SETTINGS DRAWER NAVIGATION LOGIC ===

  function openMobileMenuModal() {
    if (mobileMenuOverlay && mobileMenuModal) {
      mobileMenuOverlay.classList.remove('hidden');
      setTimeout(() => mobileMenuOverlay.classList.add('opacity-100'), 10);
      mobileMenuModal.classList.remove('-translate-x-full');
    }
  }

  function closeMobileMenuModal() {
    if (mobileMenuOverlay && mobileMenuModal) {
      mobileMenuOverlay.classList.remove('opacity-100');
      setTimeout(() => mobileMenuOverlay.classList.add('hidden'), 300);
      mobileMenuModal.classList.add('-translate-x-full');
    }
  }

  // Resolve deferred controls once the document is fully parsed.
  document.addEventListener('DOMContentLoaded', () => {
    const parsedDealerForm = document.getElementById('dealerRegForm');

    mobileCategoriesOverlay = document.getElementById('mobileCategoriesOverlay');
    pwaInstructionsOverlay = document.getElementById('pwaInstructionsOverlay');
    pwaInstructionsModal = document.getElementById('pwaInstructionsModal');
    pwaBannerOverlay = document.getElementById('pwaInstallBanner');
    mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    mobileMenuModal = document.getElementById('mobileMenuModal');
    mobileCategoriesModal = document.getElementById('mobileCategoriesModal');
    mobileCategoryGrid = document.getElementById('mobileCategoryGrid');

    if (parsedDealerForm) parsedDealerForm.addEventListener('submit', registerDealerAccount);
  });


(function(){
  const groups={phones:['iphones','samsung','android','tablets','smartwatches'],audio:['audio','gaming'],computing:['laptops','laptop_acc','tablets','smartwatches'],accessories:['phone_acc','phone_parts','travel_acc','chargers','smart_home','networking','cameras']};
  const chips=[...document.querySelectorAll('.category-filters [data-cat-filter]')];
  const groupButtons=[...document.querySelectorAll('.category-group-btn')];
  const toggle=document.querySelector('.category-group-toggle');
  function applyGroup(group){ chips.forEach(chip=>{ const show=group==='all'||groups[group]?.includes(chip.dataset.catFilter)||chip.dataset.catFilter==='all'; chip.hidden=!show; }); groupButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.group===group)); }
  groupButtons.forEach(btn=>btn.addEventListener('click',()=>applyGroup(btn.dataset.group)));
  if(toggle) toggle.addEventListener('click',()=>{ const expanded=toggle.getAttribute('aria-expanded')==='true'; toggle.setAttribute('aria-expanded',String(!expanded)); toggle.textContent=expanded?'Show All Categories':'Hide Categories'; applyGroup(expanded?'all':'phones'); });
  applyGroup('all');
})();
