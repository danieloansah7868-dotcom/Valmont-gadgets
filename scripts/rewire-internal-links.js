#!/usr/bin/env node
/**
 * scripts/rewire-internal-links.js
 *
 * After landing pages exist at /c/<slug>/ and /brand/<slug>/, every internal
 * reference that previously pointed at a ?category= query string must now
 * point at the real SEO URL instead. If a single non-canonical reference to
 * `/?category=iphones` remains in the nav, link equity gets split and Google
 * keeps treating the query URL as a separate page.
 *
 * This script patches index.html (and other HTML pages that ship nav chrome)
 * in place:
 *   - every <button data-cat-filter="slug"> (that is NOT slug=all) becomes
 *     <a href="/c/slug/"> with the same classes, reusing data-cat-filter so
 *     the existing JS progressive-enhancement filter still fires on click.
 *   - mobile .mobile-chip buttons (also data-cat-filter) follow the same rule.
 *   - adds a small inline script that upgrades in-page filter clicks to use
 *     history navigation (so desktop users who click category pills while
 *     already on a category page don't full-reload unnecessarily, but crawlers
 *     always see the clean href).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// eslint-disable-next-line import/no-dynamic-require
const { CATEGORIES, BRANDS } = require(path.join(ROOT, 'src/data/keywords.js'));

function patchFile(file) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) return;
  let html = fs.readFileSync(fp, 'utf8');
  let changed = false;

  // 1. Convert sidebar/desktop category <button data-cat-filter="slug"> into
  //    <a href="/c/slug/"> (skip "all" — that stays as a filter to /).
  for (const c of CATEGORIES) {
    const btnRe = new RegExp(
      `<button([^>]*?)data-cat-filter=["']${c.slug}["']([^>]*)>([\\s\\S]*?)</button>`,
      'g'
    );
    html = html.replace(btnRe, (m, attrs1, attrs2, inner) => {
      changed = true;
      // Preserve classes and other attributes; replace role=button semantics.
      const allAttrs = `${attrs1} ${attrs2}`.replace(/\s+type=["']button["']/g, '');
      return `<a href="/c/${c.slug}"${allAttrs} data-cat-filter="${c.slug}">${inner}</a>`;
    });
  }

  // 2. Convert mobile-chip filter buttons (same pattern).
  for (const c of CATEGORIES) {
    const chipRe = new RegExp(
      `<button([^>]*?)class="([^"]*mobile-chip[^"]*)"([^>]*?)data-cat-filter=["']${c.slug}["']([^>]*)>([\\s\\S]*?)</button>`,
      'g'
    );
    html = html.replace(chipRe, (m, pre, cls, mid1, mid2, inner) => {
      changed = true;
      return `<a href="/c/${c.slug}" class="${cls}"${mid1} data-cat-filter="${c.slug}"${mid2}>${inner}</a>`;
    });
  }

  // 3. Strip any old inline SEO enhancer (we moved it to a real JS file).
  const inlineRe = /\s*<script data-seo-link-enhancer>[\s\S]*?<\/script>/;
  if (inlineRe.test(html)) {
    html = html.replace(inlineRe, '');
    changed = true;
  }
  // 4. Ensure the seo-links progressive-enhancement script is included so
  //    in-page category pills behave like filters (fast) instead of full-page
  //    navigations when the user is already on the homepage. Crawlers and
  //    no-JS users still follow the clean href.
  const seoScript = '<script src="assets/js/seo-links.js" defer></script>';
  if (!html.includes('seo-links.js')) {
    html = html.replace(/<script src="assets\/js\/analytics\.js"/, seoScript + '\n    <script src="assets/js/analytics.js"');
    changed = true;
  }

  // 5. Inject a "Shop by brand" row of links into the desktop category strip
  //    on the homepage only (landing pages don't have this desktop pill bar).
  const VALID_BRANDS = BRANDS.filter(b => ['apple','samsung-brand','sony','anker','hp','tp-link'].includes(b.slug));
  const isHomepage = /<title>[^<]*Phones,\s*Laptops/i.test(html) || !/<main/.test(html) && html.includes('id="store-feed"');
  if (isHomepage && !html.includes('data-brand-strip')) {
    const brandChip = b => `<a href="/brand/${b.slug}" class="cat-pill desktop-cat text-[#ff8c00] font-bold" data-brand-strip>${b.shortLabel}</a>`;
    const brandStrip = `<div class="flex items-center gap-2 flex-wrap mt-2" data-brand-strip aria-label="Shop by brand">\n        <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">Brands:</span>\n        ${VALID_BRANDS.map(brandChip).join('\n        ')}\n      </div>`;
    // Insert after the closing </div> of the desktop category-pill bar.
    // Look for the </div> that follows the last desktop-cat anchor.
    const lastCat = html.lastIndexOf('data-cat-filter="cameras"');
    if (lastCat !== -1) {
      const endDiv = html.indexOf('</div>', lastCat);
      if (endDiv !== -1) {
        html = html.slice(0, endDiv + 6) + '\n      ' + brandStrip + html.slice(endDiv + 6);
        changed = true;
      }
    }
  }

  // 6. Add a "Shop by brand" column to the footer on homepage only.
  if (isHomepage && !html.includes('data-footer-brands')) {
    const brandLi = b => `<li><a href="/brand/${b.slug}" class="hover:text-[#ff8c00] text-gray-300" data-footer-brands>${b.shortLabel}</a></li>`;
    const brandCol = `<div data-footer-brands>\n        <h4 class="font-extrabold text-[12px] uppercase text-gray-400 tracking-widest mb-4">Shop by brand</h4>\n        <ul class="text-[12px] space-y-2 text-gray-300 font-medium">\n          ${VALID_BRANDS.map(brandLi).join('\n          ')}\n        </ul>\n      </div>`;
    const colsMarker = 'vg-footer-cols';
    const colsIdx = html.indexOf(colsMarker);
    if (colsIdx !== -1) {
      // Insert before the closing </div> of vg-footer-cols (look for mb-8 border-b after colsMarker).
      const insertAt = html.indexOf('mb-8 border-b', colsIdx);
      if (insertAt !== -1) {
        const closingDiv = html.indexOf('</div>', insertAt);
        if (closingDiv !== -1) {
          html = html.slice(0, closingDiv) + '\n      ' + brandCol + '\n    ' + html.slice(closingDiv);
          changed = true;
        }
      }
    }
  }

  // 7. Insert a supplier / wholesale WhatsApp CTA banner above the product
  //    feed so any phone-shop owner who lands on the site can tap through to
  //    Daniel on WhatsApp without hunting for the partner portal. Only add
  //    once.
  // Always replace any existing supplier banner so copy/CTA updates apply on
  // rebuild (otherwise the data-supplier-cta guard would leave stale copy).
  html = html.replace(/\s*<div data-supplier-cta[\s\S]*?<\/div>\s*(?=<div class="bg-white|<main|<footer)/g, '\n');
  if (!html.includes('data-supplier-cta')) {
    const supplierBanner = `<div data-supplier-cta class="mb-4 bg-gradient-to-r from-[#128c7e] to-[#075e54] text-white rounded-[4px] px-4 py-4 md:px-5 md:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div class="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-7 h-7 shrink-0 fill-white mt-0.5" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 89.4-184.5 184.6-184.5 46 0 89.3 18 121.9 50.6 32.6 32.5 50.5 75.9 50.5 122.1-.1 101.8-94.9 184.5-184.6 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
          <div>
            <p class="font-black text-[13px] md:text-[15px] uppercase tracking-wider leading-tight mb-1">Do you run a phone or gadget shop in Ghana?</p>
            <p class="text-[12px] md:text-[13px] font-medium text-white/95 leading-relaxed">Valmont supplies <strong>genuine sealed and UK-used phones, laptops, chargers, accessories</strong> in bulk to resellers across Accra, Kumasi, Takoradi and beyond. Carton and half-carton pricing, same-day pickup from our Accra warehouse, warranty on every unit, consistent restocks of iPhones and Samsung flagships — and we do <strong>no-minimum orders</strong> for small shops just starting out. Stop buying from Circle. Chat Daniel directly on WhatsApp for a dealer price list today.</p>
          </div>
        </div>
        <a href="https://wa.me/233542451578?text=Hi%20Valmont%2C%20I%20run%20a%20phone%2Fgadget%20shop%20and%20I%27d%20like%20to%20buy%20in%20bulk.%20Can%20I%20get%20your%20dealer%20price%20list%3F" target="_blank" rel="noopener" class="shrink-0 inline-flex items-center gap-2 bg-white text-[#075e54] font-black text-[12px] md:text-[13px] tracking-wider uppercase px-5 py-3 rounded-[4px] hover:bg-[#25d366] hover:text-white transition shadow-md">
          WhatsApp Valmont
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>`;
    const feedMarker = 'id="store-feed"';
    const feedIdx = html.indexOf(feedMarker);
    if (feedIdx !== -1) {
      const divStart = html.lastIndexOf('<div', feedIdx);
      if (divStart !== -1) {
        html = html.slice(0, divStart) + supplierBanner + '\n      ' + html.slice(divStart);
        changed = true;
      }
    } else {
      // Pages without a product feed: insert above footer if present,
      // otherwise before </body> (covers wholesale.html and similar pages
      // that have no footer chrome).
      const wrapped = `<main class="max-w-[1200px] mx-auto px-4 py-6">\n      ${supplierBanner}\n    </main>\n  `;
      const footerIdx = html.indexOf('<footer');
      if (footerIdx !== -1) {
        html = html.slice(0, footerIdx) + wrapped + html.slice(footerIdx);
        changed = true;
      } else {
        const bodyIdx = html.indexOf('</body>');
        if (bodyIdx !== -1) {
          html = html.slice(0, bodyIdx) + wrapped + html.slice(bodyIdx);
          changed = true;
        }
      }
    }
  }

  // 8. Add a matching green "Chat on WhatsApp" CTA next to the existing "Enter
  //    Dealer Desk" button in the footer for resellers who scroll to the
  //    footer instead of seeing the top banner.
  if (isHomepage && !html.includes('data-footer-whatsapp-supplier')) {
    const dealerBtn = 'data-store-action="open-dealer">\n          Enter Dealer Desk';
    const idx = html.indexOf(dealerBtn);
    if (idx !== -1) {
      const endTag = html.indexOf('</button>', idx);
      if (endTag !== -1) {
        const waBtn = `\n        <a href="https://wa.me/233542451578?text=Hi%20Valmont%2C%20I%20run%20a%20gadget%20shop%20and%20want%20to%20stock%20from%20you.%20Send%20me%20your%20wholesale%20price%20list." target="_blank" rel="noopener" data-footer-whatsapp-supplier class="bg-[#25d366] hover:bg-[#128c7e] text-white font-bold text-[11px] tracking-widest px-4 py-2.5 rounded-[4px] uppercase transition inline-flex items-center gap-1.5">
          WhatsApp Supplier
        </a>`;
        html = html.slice(0, endTag + 9) + waBtn + html.slice(endTag + 9);
        changed = true;
      }
    }
  }

  if (isHomepage && !html.includes('data-resellers-strip')) {
    // "Authorized Valmont Resellers" strip — honest launch version. The first
    // few authorized reseller slots are open; we show a real WhatsApp CTA to
    // apply, not fabricated shop names. Once the first cohort is live, replace
    // the slots below with real shops (name + area).
    const resellersStrip = `<div data-resellers-strip class="mb-6 bg-white rounded-[4px] border border-gray-100 card-shadow p-4 md:p-5">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-[#ff8c00]">Valmont Network</p>
            <h3 class="font-extrabold text-[15px] md:text-[17px] text-[#0b1a38] tracking-tight">Authorized Valmont Resellers</h3>
            <p class="text-[12px] text-gray-600 font-medium mt-1">Shops we supply directly with genuine stock and warranty backing. New slots open each quarter — apply to join.</p>
          </div>
          <a href="https://wa.me/233542451578?text=Hi%20Valmont%2C%20I%20run%20a%20phone%2Fgadget%20shop%20and%20I%27d%20like%20to%20become%20an%20Authorized%20Valmont%20Reseller." target="_blank" rel="noopener" class="shrink-0 inline-flex items-center gap-2 bg-[#ff8c00] hover:bg-orange-600 text-white font-black text-[11px] tracking-widest uppercase px-4 py-2.5 rounded-[4px] transition shadow-sm">
            Become a reseller
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div class="border border-dashed border-gray-300 rounded-[4px] p-3 text-center bg-gray-50/50">
            <p class="font-black text-[12px] text-gray-800">Slot 01</p>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Accra • Open</p>
          </div>
          <div class="border border-dashed border-gray-300 rounded-[4px] p-3 text-center bg-gray-50/50">
            <p class="font-black text-[12px] text-gray-800">Slot 02</p>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Kumasi • Open</p>
          </div>
          <div class="border border-dashed border-gray-300 rounded-[4px] p-3 text-center bg-gray-50/50">
            <p class="font-black text-[12px] text-gray-800">Slot 03</p>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Takoradi • Open</p>
          </div>
          <div class="border border-dashed border-gray-300 rounded-[4px] p-3 text-center bg-gray-50/50">
            <p class="font-black text-[12px] text-gray-800">Slot 04</p>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Tamale • Open</p>
          </div>
        </div>
      </div>`;
    // Insert directly after the supplier banner (so supplier CTA -> resellers
    // strip -> product feed).
    const marker = 'data-supplier-cta';
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      const closingDiv = html.indexOf('</div>', idx);
      if (closingDiv !== -1) {
        html = html.slice(0, closingDiv + 6) + '\n      ' + resellersStrip + html.slice(closingDiv + 6);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(fp, html);
    console.log(`rewired ${file}`);
  }
}

patchFile('index.html');
// Patch top-level HTML pages that share chrome so the supplier CTA is visible
// there too (partner.html, used.html, swap.html, wholesale.html, drop.html).
['partner.html','used.html','swap.html','wholesale.html','drop.html','account.html'].forEach(file => {
  patchFile(file);
});
module.exports = { patchFile };
