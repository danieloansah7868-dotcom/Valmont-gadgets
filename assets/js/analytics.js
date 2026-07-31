/**
 * ValmontAnalytics — Lightweight, zero-dependency GA4 & Meta Pixel helper
 */
(function (global) {
  'use strict';

  const PREFIX = '[VALMONT-ANALYTICS]';

  function audit(event, valueStr, refStr) {
    if (typeof console !== 'undefined' && console.log) {
      console.log(PREFIX + ' Event: ' + event + ' | Value: ' + (valueStr || 'GHS 0.00') + ' | Ref: ' + (refStr || '-'));
    }
  }

  function safeCall(fn /*, ...args */) {
    try {
      return fn.apply(null, Array.prototype.slice.call(arguments, 1));
    } catch (e) {
      // Silent fallback for ad blockers, unloaded tags, or missing APIs
    }
  }

  // Helper to read config from meta tags or window globals
  function getConfig() {
    return {
      gaId: (global.GA_MEASUREMENT_ID) || (global.GA4_ID) || (function () {
        var el = typeof document !== 'undefined' ? document.querySelector('meta[name="ga-measurement-id"]') : null;
        return el ? el.content : null;
      })() || null,
      pixelId: (global.META_PIXEL_ID) || (global.META_PIXEL) || (function () {
        var el = typeof document !== 'undefined' ? document.querySelector('meta[name="meta-pixel-id"]') : null;
        return el ? el.content : null;
      })() || null
    };
  }

  const ValmontAnalytics = {
    /**
     * Initialize GA4 (gtag) and Meta Pixel (fbq) if IDs are present.
     * @param {string} gaId     Google Analytics 4 Measurement ID (optional)
     * @param {string} pixelId  Meta Pixel ID (optional)
     */
    initAnalytics: function (gaId, pixelId) {
      var cfg = getConfig();
      var ga = gaId || cfg.gaId;
      var px = pixelId || cfg.pixelId;

      // ---- GA4 ----
      if (ga) {
        global.dataLayer = global.dataLayer || [];
        global.gtag = global.gtag || function () {
          global.dataLayer.push(arguments);
        };
        global.gtag('js', new Date());
        global.gtag('config', ga, { send_page_view: true });

        // Load script if not already present
        if (typeof document !== 'undefined' && !document.querySelector('script[src*="googletagmanager.com/gtag/js?id=' + ga + '"]')) {
          var s = document.createElement('script');
          s.async = true;
          s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga;
          document.head.appendChild(s);
        }
      }

      // ---- Meta Pixel ----
      if (px) {
        if (typeof document !== 'undefined' && !document.querySelector('script[src*="connect.facebook.net/en_US/fbevents.js"]')) {
          var fbScript = document.createElement('script');
          fbScript.async = true;
          fbScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
          fbScript.onload = function () {
            if (typeof global.fbq === 'function') {
              global.fbq('init', px);
              global.fbq('track', 'PageView');
            }
          };
          document.head.appendChild(fbScript);
        } else if (typeof global.fbq === 'function') {
          global.fbq('init', px);
          global.fbq('track', 'PageView');
        }
      }
    },

    /**
     * trackViewItem(product)
     */
    trackViewItem: function (product) {
      try {
        var item = {
          item_id: (product && (product.id || product.item_id)) || '',
          item_name: (product && (product.name || product.item_name)) || '',
          price: Number((product && product.price) || 0)
        };
        var payload = {
          currency: 'GHS',
          value: Number((product && product.price) || 0),
          items: [item]
        };

        if (global.gtag) safeCall(global.gtag, 'event', 'view_item', payload);
        if (global.fbq) {
          safeCall(global.fbq, 'track', 'ViewContent', {
            value: payload.value,
            currency: 'GHS',
            content_ids: [item.item_id],
            content_name: item.item_name,
            content_type: 'product'
          });
        }
        audit('view_item', 'GHS ' + payload.value.toFixed(2), item.item_id);
      } catch (e) {
        // Safe fallback
      }
    },

    /**
     * trackAddToCart(product, qty)
     */
    trackAddToCart: function (product, qty) {
      try {
        var q = Number(qty || 1);
        var item = {
          item_id: (product && (product.id || product.item_id)) || '',
          item_name: (product && (product.name || product.item_name)) || '',
          price: Number((product && product.price) || 0),
          quantity: q
        };
        var payload = {
          currency: 'GHS',
          value: Number((product && product.price) || 0) * q,
          items: [item]
        };

        if (global.gtag) safeCall(global.gtag, 'event', 'add_to_cart', payload);
        if (global.fbq) {
          safeCall(global.fbq, 'track', 'AddToCart', {
            value: payload.value,
            currency: 'GHS',
            content_ids: [item.item_id],
            content_name: item.item_name,
            content_type: 'product',
            contents: [{
              id: item.item_id,
              quantity: q,
              name: item.item_name,
              item_price: item.price
            }]
          });
        }
        audit('add_to_cart', 'GHS ' + payload.value.toFixed(2), item.item_id);
      } catch (e) {
        // Safe fallback
      }
    },

    /**
     * trackBeginCheckout(order)
     */
    trackBeginCheckout: function (order) {
      try {
        var orderData = order || {};
        var items = Array.isArray(orderData.items) ? orderData.items.map(function (i) {
          return {
            item_id: (i && (i.id || i.item_id)) || '',
            item_name: (i && (i.name || i.item_name)) || '',
            price: Number((i && i.price) || 0),
            quantity: Number((i && (i.qty || i.quantity)) || 1)
          };
        }) : [];
        var total = Number(orderData.total_amount || orderData.total || 0);
        var payload = {
          currency: 'GHS',
          value: total,
          items: items
        };

        if (global.gtag) safeCall(global.gtag, 'event', 'begin_checkout', payload);
        if (global.fbq) {
          safeCall(global.fbq, 'track', 'InitiateCheckout', {
            value: total,
            currency: 'GHS',
            content_ids: items.map(function (it) { return it.item_id; }),
            contents: items.map(function (it) {
              return {
                id: it.item_id,
                quantity: it.quantity,
                name: it.item_name,
                item_price: it.price
              };
            })
          });
        }
        audit('begin_checkout', 'GHS ' + total.toFixed(2), orderData.reference_code || orderData.reference || '-');
      } catch (e) {
        // Safe fallback
      }
    },

    /**
     * trackPurchase(order)
     */
    trackPurchase: function (order) {
      try {
        var orderData = order || {};
        var ref = (orderData.reference_code || orderData.reference || orderData.id || '').toString();
        var total = Number(orderData.total_amount || orderData.total || 0);
        var items = Array.isArray(orderData.items) ? orderData.items.map(function (i) {
          return {
            item_id: (i && (i.id || i.item_id)) || '',
            item_name: (i && (i.name || i.item_name)) || '',
            price: Number((i && i.price) || 0),
            quantity: Number((i && (i.qty || i.quantity)) || 1)
          };
        }) : [];
        var payload = {
          transaction_id: ref,
          currency: 'GHS',
          value: total,
          items: items
        };

        if (global.gtag) safeCall(global.gtag, 'event', 'purchase', payload);
        if (global.fbq) {
          safeCall(global.fbq, 'track', 'Purchase', {
            value: total,
            currency: 'GHS',
            content_ids: items.map(function (it) { return it.item_id; }),
            content_name: items.map(function (it) { return it.item_name; }).join(', '),
            contents: items.map(function (it) {
              return {
                id: it.item_id,
                quantity: it.quantity,
                name: it.item_name,
                item_price: it.price
              };
            }),
            order_id: ref
          });
        }
        audit('purchase', 'GHS ' + total.toFixed(2), ref);
      } catch (e) {
        // Safe fallback
      }
    }
  };

  // Expose globally
  global.ValmontAnalytics = ValmontAnalytics;

  // CommonJS / module fallback
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ValmontAnalytics;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
