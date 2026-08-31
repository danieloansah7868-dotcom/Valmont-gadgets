/* =====================================================================
   VALMONT AI — 24/7 Website Assistant
   ---------------------------------------------------------------------
   Rule-based chat assistant for Valmont Gadgets (Ghana).
   Handles: greetings, products, prices, warranty, delivery, payment,
            categories, flash deals, purchase guidance, contact fallback.
   Rules defined by BUSINESS INFO — never invents data.
   ===================================================================== */

(function () {
  'use strict';

  // ---------- BUSINESS KNOWLEDGE BASE ----------
  const PRODUCTS = {
    'iphone 15 pro': {
      name: 'iPhone 15 Pro 256GB',
      price: 'GHS 11,200',
      detail: 'Titanium build, A17 Pro chip, 256GB storage',
      warranty: '12-month warranty',
      category: 'Shop > Phones',
      search: 'iPhone 15 Pro'
    },
    'iphone 13 pro max': {
      name: 'iPhone 13 Pro Max 256GB',
      price: 'GHS 7,900',
      detail: '256GB storage, ProMotion display',
      warranty: '12-month warranty',
      category: 'Shop > Phones',
      search: 'iPhone 13 Pro Max'
    },
    'hp elitebook': {
      name: 'HP EliteBook 840 G5',
      price: 'GHS 3,900',
      detail: 'Intel Core i5, 8GB RAM, 256GB SSD',
      warranty: '12-month warranty',
      category: 'Shop > Laptops',
      search: 'HP EliteBook 840 G5'
    },
    'hp elitebook 840': {
      name: 'HP EliteBook 840 G5',
      price: 'GHS 3,900',
      detail: 'Intel Core i5, 8GB RAM, 256GB SSD',
      warranty: '12-month warranty',
      category: 'Shop > Laptops',
      search: 'HP EliteBook 840 G5'
    }
  };

  const CATEGORIES = {
    'phones': 'Shop > Phones',
    'laptops': 'Shop > Laptops',
    'accessories': 'Shop > Accessories',
    'charger': 'Shop > Accessories',
    'chargers': 'Shop > Accessories',
    'case': 'Shop > Accessories',
    'cases': 'Shop > Accessories',
    'airpods': 'Shop > Accessories',
    'deals': 'Deals (Executive Midweek Deals / Flash Deals)'
  };

  const QUICK_REPLIES = [
    'iPhone prices',
    'Laptop prices',
    'Warranty',
    'Delivery',
    'Flash Deals',
    'How to pay'
  ];

  const WEBSITE = 'https://valmontgadgets.com';
  const VALMONTWEB = 'https://valmontweb.com/?utm_source=valmont_gadgets&utm_medium=ai_assistant&utm_campaign=website_enquiry';
  const WHATSAPP = '0542451578';
  const WHATSAPP_LINK = 'https://wa.me/233542451578';

  // ---------- LIVE CATALOGUE HELPERS ----------
  const money = new Intl.NumberFormat('en-GH', {
    style: 'currency', currency: 'GHS', maximumFractionDigits: 0
  });
  const SEARCH_STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'can', 'do', 'for', 'have', 'how', 'i', 'in',
    'is', 'it', 'me', 'of', 'on', 'please', 'price', 'show', 'the', 'to',
    'want', 'what', 'with', 'you', 'your'
  ]);

  function liveCatalog() {
    return Array.isArray(window.VALMONT_CATALOG) ? window.VALMONT_CATALOG : [];
  }

  function productMatches(query) {
    const tokens = query.split(/\s+/).filter((word) => word.length > 1 && !SEARCH_STOP_WORDS.has(word));
    if (!tokens.length) return [];
    return liveCatalog().map((product) => {
      const haystack = `${product.name} ${product.category} ${product.specs || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { product, score };
    }).filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.product.retail - b.product.retail);
  }

  function productReply(matches, query) {
    if (!matches.length) return null;
    const meaningful = query.split(/\s+/).filter((word) => word.length > 2 && !SEARCH_STOP_WORDS.has(word)).length;
    const bestScore = matches[0].score;
    if (meaningful > 1 && bestScore < Math.min(2, meaningful)) return null;
    const items = matches.slice(0, 4).map(({ product }) => {
      const price = Number.isFinite(Number(product.retail)) ? money.format(Number(product.retail)) : 'price available on request';
      return `<strong>${product.name}</strong> — ${price}${product.stock ? ` · ${product.stock}` : ''}`;
    });
    return `Here ${items.length === 1 ? 'is the closest match' : 'are the closest matches'} in our current catalogue:<br>${items.join('<br>')}<br>Use the store search to open a product, or ask me about a specific model.`;
  }

  // ---------- RESPONSE ENGINE ----------
  function getResponse(text) {
    const q = text.toLowerCase().trim()
      .replace(/[?!.,]/g, ' ')
      .replace(/\s+/g, ' ');

    if (!q) return { reply: "Please type your question so I can assist you.", quick: true };

    // Greetings
    if (/\b(hi|hello|hey|good (morning|afternoon|evening)|yo|hiya)\b/.test(q)) {
      return {
        reply: "Hello! Welcome to Valmont Gadgets. How can I help you find a phone or laptop today?",
        quick: true
      };
    }

    // Contact / human agent
    if (/\b(call|contact|whatsapp|human|agent|person|speak|talk to|support)\b/.test(q)) {
      return {
        reply: `You can reach us on WhatsApp at <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">${WHATSAPP}</a> for further assistance.`
      };
    }

    // Explain the complete site when the shopper asks what Valmont offers.
    if (/\b(what (?:can|do) (?:you|valmont)|what (?:is|does) valmont|services|help me with|what do you sell)\b/.test(q)) {
      return {
        reply: `Valmont Gadgets sells phones, laptops, audio, gaming gear and accessories. The site also includes installment plans, UK/US used phones, Swap & Sell listings, Daily Drop rewards, approved-dealer wholesale access, order tracking, and ValmontWeb website services. Tell me which one you need.`,
        quick: true
      };
    }

    // Daily Drop
    if (/\b(daily drop|today s drop|flip (?:a )?card|golden card|reward card)\b/.test(q)) {
      return { reply: `Daily Drop lets a signed-in customer flip one card each day for a chance to reveal a real offer. <a href="/drop.html">Open today's Daily Drop</a>.` };
    }

    // Swap & Sell marketplace
    if (/\b(swap|trade[ -]?in|trade my phone|sell my phone|list my phone|phone listing)\b/.test(q)) {
      return { reply: `Use <a href="/swap.html">Swap & Sell</a> to list a phone, receive interest and arrange a public meetup. Valmont provides the marketplace but is not a party to user-to-user transactions. Check the IMEI, inspect the device and never send an unsafe deposit.` };
    }

    // UK/US used stock
    if (/\b(uk used|us used|used phone|preowned|pre owned|second hand|battery health|graded phone)\b/.test(q)) {
      return { reply: `Browse individually graded UK and US used phones on the <a href="/used.html">Used Phones page</a>. Listings show condition and battery information when available; confirm the exact device details before buying.` };
    }

    // Installment plans
    if (/\b(installment|instalment|pay small small|payment plan|pay weekly|12 weeks|forty percent|40 percent|40%)\b/.test(q)) {
      return { reply: `Eligible products can be purchased with 40% paid today and the balance spread over 12 weeks. A Ghana Card and one guarantor are required. Open an eligible product and choose the installment option to review the plan.` };
    }

    // Customer accounts and order tracking
    if (/\b(my account|sign in|log in|login|register|create account|track (?:my )?order|order history|my orders|reset (?:my )?password|forgot password|address book)\b/.test(q)) {
      return { reply: `Open <a href="/account.html">My Account</a> to sign in, create an account, manage addresses, view orders or reset your password.` };
    }

    // Business owners may need wholesale access, a partner page, or a complete
    // website. Do not confuse the word "shop" here with store navigation.
    if (/\b(i have|i own|i run|my) (?:a )?(?:physical |retail |phone |electronics )?(?:shop|store|business)\b|\b(?:shop|store|business) owner\b/.test(q)) {
      return {
        reply: `Great — Valmont has three options for an existing business:<br><strong>Wholesale:</strong> apply for approved dealer pricing in the <a href="/wholesale.html">Wholesale Portal</a>.<br><strong>Partner:</strong> get a Valmont store page through the <a href="/partner.html">Partner programme</a>.<br><strong>Your own website:</strong> launch under your own brand with <a href="${VALMONTWEB}" target="_blank" rel="noopener">ValmontWeb</a>.<br>Which one would you like to explore?`
      };
    }

    // Partner programme
    if (/\b(partner program|partner programme|become a partner|store page|phone shop|grow my business)\b/.test(q)) {
      return { reply: `The <a href="/partner.html">Valmont Partner programme</a> is for phone businesses that want a Valmont store page and business-growth tools. Review the options and submit the partner application on that page.` };
    }

    // Returns, problems and after-sales support. Do not invent a return window.
    if (/\b(return|refund|exchange|faulty|damaged|problem with|repair|after sales)\b/.test(q)) {
      return { reply: `Returns and warranty support depend on the product, condition and order details. Keep your receipt and packaging, then contact Valmont on <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP}</a> with your order number so the team can review the correct remedy.` };
    }

    // ValmontWeb / website-building enquiries. Keep this before the generic
    // "website" navigation rule so "build my own site" is not mistaken for
    // somebody asking for the Valmont Gadgets shop URL.
    if (/\b(valmont\s*web|web\s*design|website\s*design|build(?:ing)?\s+(?:me\s+)?(?:my|a|an|your|our|own)?\s*(?:web\s*site|website|site|online\s*store)|(?:create|make|launch|start|need|want|get)\s+(?:me\s+)?(?:my|a|an|your|our|own)?\s*(?:web\s*site|website|site|online\s*store)|(?:own|business)\s+(?:web\s*site|website|site|online\s*store))\b/.test(q)) {
      return {
        reply: `Yes. If you already have a product, service or business, ValmontWeb can build a professional website under your own brand. <a href="${VALMONTWEB}" target="_blank" rel="noopener">Visit ValmontWeb to get started</a>. Your website. Your customers. Your brand.`
      };
    }

    // Be accurate about the supplier concept: it is a future upgrade, not a
    // service Valmont currently promises to website clients.
    if (/\b(supplier|suppliers|dropship|dropshipping|provide (?:me )?(?:with )?(?:stock|products)|source (?:my )?(?:stock|products))\b/.test(q)) {
      return {
        reply: `Valmont does not currently provide an automated supplier or dropshipping service. If you already have something to sell, ValmontWeb can build your website. For existing Valmont dealer and wholesale enquiries, please <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">contact us on WhatsApp</a>.`
      };
    }

    // Wholesale / dealer access
    if (/\b(wholesale|dealer price|dealer account|bulk price|buy in bulk)\b/.test(q)) {
      return {
        reply: `Wholesale access is available to approved Valmont dealers. <a href="/wholesale.html">Open the Wholesale Portal</a> to sign in or apply for access.`
      };
    }

    // Warranty
    if (/\b(warranty|guarantee|cover(ed)?)\b/.test(q)) {
      return { reply: "All genuine phones and laptops come with a 12-month warranty." };
    }

    // Delivery / shipping
    if (/\b(deliver(y|ies|ed|ing)?|ship(ping|ped)?|nationwide|send to|delivery fee)\b/.test(q)) {
      return { reply: "We offer nationwide delivery across Ghana. The delivery fee is calculated at checkout based on your location." };
    }

    // Payment / pay / momo / card
    if (/\b(pay(ment|ments)?|momo|mobile money|card|checkout|valmont pay)\b/.test(q)) {
      return { reply: "You can pay directly on our website with Mobile Money or Card via Valmont Pay. Simply add items to cart and proceed to checkout." };
    }

    // Flash deals / offers / promotions / midweek
    if (/\b(flash deals?|deals?|midweek|offers?|promotions?|discounts?|sales?|limited time|executive)\b/.test(q)) {
      return {
        reply: "Check our Flash Deals section for limited-time offers — Executive Midweek Deals are live! The countdown timer shows remaining days, hours, minutes, and seconds. You can find it under <a href=\"" + WEBSITE + "\" target=\"_blank\" rel=\"noopener\">Deals</a>."
      };
    }

    // Purchase guidance / cart / buy / order
    if (/\b(buy|purchase|order|add to cart|checkout|how (do|can) i (buy|get|order|purchase)|check out)\b/.test(q)) {
      return {
        reply: "You can add any item to your cart and pay with Mobile Money or Card directly on the website via Valmont Pay. We deliver nationwide across Ghana."
      };
    }

    // Search the actual storefront catalogue rather than relying on stale,
    // hardcoded product answers. This covers model, brand, category and spec.
    if (/\b(price|cost|stock|available|find|show|looking for|need|want|phone|iphone|samsung|pixel|laptop|macbook|ipad|watch|airpod|audio|gaming|charger|case|accessor|router|camera)\b/.test(q)) {
      const answer = productReply(productMatches(q), q);
      if (answer) return { reply: answer, quick: true };
    }

    // Categories / navigation / where to find
    if (/\b(where|find|category|navigate|section|page|shop|menu)\b/.test(q)) {
      // try to match a category keyword
      for (const key in CATEGORIES) {
        if (q.includes(key)) {
          return {
            reply: `You can find ${key} under <strong>${CATEGORIES[key]}</strong>, or use the search bar at the top of our website. Also check Deals for Executive Midweek Deals.`
          };
        }
      }
      return {
        reply: "You can browse categories: Home, Shop, Phones, Laptops, Accessories, and Deals. Use the search bar at the top to find any product quickly.",
        quick: true
      };
    }

    // Product: iPhone 15 Pro
    if (/\b(iphone\s*15\s*pro|15\s*pro)\b/.test(q)) {
      const p = PRODUCTS['iphone 15 pro'];
      return {
        reply: `${p.name} is ${p.price} as listed on our website. ${p.detail}; ${p.warranty}. You can find it under ${p.category}, or search "${p.search}" at the top.`,
        product: 'iphone-15-pro'
      };
    }

    // Product: iPhone 13 Pro Max
    if (/\b(iphone\s*13\s*pro\s*max|13\s*pro\s*max)\b/.test(q)) {
      const p = PRODUCTS['iphone 13 pro max'];
      return {
        reply: `${p.name} is ${p.price} as listed on our website. ${p.detail}; ${p.warranty}. You can find it under ${p.category}, or search "${p.search}" at the top.`
      };
    }

    // Generic iPhone inquiry
    if (/\b(iphone|i phone|apple phone)\b/.test(q)) {
      return {
        reply: `We stock genuine iPhones. Current listings: <strong>iPhone 15 Pro 256GB — GHS 11,200</strong> (Titanium); <strong>iPhone 13 Pro Max 256GB — GHS 7,900</strong>. Both include 12-month warranty. Find them under Shop > Phones.`,
        quick: true
      };
    }

    // HP EliteBook
    if (/\b(hp|elitebook|elite book|laptop|notebook)\b/.test(q)) {
      const p = PRODUCTS['hp elitebook'];
      return {
        reply: `${p.name} is ${p.price} as listed on our website. ${p.detail}; ${p.warranty}. You can find it under ${p.category}, or search "${p.search}" at the top.`,
        quick: true
      };
    }

    // Accessories (chargers, cases, airpods)
    if (/\b(chargers?|cases?|airpods?|accessor(y|ies)|earpods?|usbs?|cables?|screen protectors?)\b/.test(q)) {
      return {
        reply: "We have genuine accessories including chargers, cases, and AirPods. You can find them under Shop > Accessories on the website."
      };
    }

    // Price list / how much / price of / cost
    if (/\b(price|prices|cost|how much|pricing|rate|ghs|cedis|ghana cedi)\b/.test(q)) {
      return {
        reply: "Current prices as listed on our website: iPhone 15 Pro 256GB — GHS 11,200; iPhone 13 Pro Max 256GB — GHS 7,900; HP EliteBook 840 G5 — GHS 3,900. All genuine phones and laptops include 12-month warranty.",
        quick: true
      };
    }

    // Stock / availability / in stock
    if (/\b(stock|available|availability|in stock|do you have)\b/.test(q)) {
      return {
        reply: `Stock levels update in real time on our website. Please check the product page at <a href="${WEBSITE}" target="_blank" rel="noopener">valmontgadgets.com</a> for current availability, or WhatsApp us at <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">${WHATSAPP}</a>.`
      };
    }

    // Location / address / where are you / accra
    if (/\b(location|address|where are you|branch|shop|office|accra|ghana)\b/.test(q)) {
      return { reply: "Valmont Gadgets by Valmont Group is based in Accra, Ghana. Order directly online — we deliver nationwide." };
    }

    // Website / valmontgadgets.com / URL
    if (/\b(website|site|url|online|valmontgadgets\.com)\b/.test(q)) {
      return { reply: `Visit our website at <a href="${WEBSITE}" target="_blank" rel="noopener">valmontgadgets.com</a> to browse and order.` };
    }

    // Thank you
    if (/\b(thank|thanks|appreciate|thx|tnx)\b/.test(q)) {
      return { reply: "You're welcome! Is there anything else I can help you with today?", quick: true };
    }

    // Yes / no handling
    if (/^(yes|yeah|yep|sure|ok|okay|ya)/.test(q)) {
      return { reply: "Great! Let me know what you're looking for — phones, laptops, or accessories.", quick: true };
    }
    if (/^(no|nope|not really|that's all|thats all)$/.test(q)) {
      return { reply: "Thank you for visiting Valmont Gadgets. Feel free to chat again anytime!" };
    }

    // Fallback — WhatsApp contact per Rule 7
    return {
      reply: `For more information on that, please WhatsApp us at <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">${WHATSAPP}</a>. In the meantime, feel free to ask about our phones, laptops, accessories, delivery, or warranty.`,
      quick: true
    };
  }

  // ---------- DOM / UI ----------
  const OPEN_LABEL_TIMEOUT = 6000; // show "Chat with us" label for 6s on load

  function nowTime() {
    const d = new Date();
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildWidget() {
    if (document.getElementById('valmontai-root')) return;

    // Root
    const root = el('div');
    root.id = 'valmontai-root';

    // Toggle button
    const btn = el('button');
    btn.className = 'valmontai-btn show-label';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Chat with ValmontAI, Valmont Gadgets assistant');
    btn.innerHTML = `
      <span class="valmontai-pulse" aria-hidden="true"></span>
      <span class="valmontai-label">Chat with ValmontAI</span>
      <svg class="valmontai-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg class="valmontai-btn-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
    `;

    // Panel
    const panel = el('div');
    panel.className = 'valmontai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'ValmontAI chat assistant');
    panel.innerHTML = `
      <div class="valmontai-header">
        <div class="valmontai-avatar">AI</div>
        <div class="valmontai-head-text">
          <div class="valmontai-head-name">ValmontAI <span class="valmontai-status-dot"></span></div>
          <div class="valmontai-head-sub">24/7 Website Assistant • Valmont Gadgets</div>
        </div>
        <button class="valmontai-close" type="button" aria-label="Close chat">&times;</button>
      </div>
      <div class="valmontai-messages" id="vaiMessages"></div>
      <div class="valmontai-typing" id="vaiTyping">
        <div class="valmontai-msg-avatar">AI</div>
        <div class="valmontai-typing-dots"><span></span><span></span><span></span></div>
      </div>
      <div class="valmontai-quick" id="vaiQuick"></div>
      <div class="valmontai-input-wrap">
        <input class="valmontai-input" id="vaiInput" type="text" placeholder="Ask about phones, laptops, delivery..." autocomplete="off" aria-label="Type your message">
        <button class="valmontai-send" id="vaiSend" type="button" aria-label="Send message">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
      <div class="valmontai-footer-note">Powered by ValmontAI • <a href="${WHATSAPP_LINK}" target="_blank" rel="noopener">WhatsApp ${WHATSAPP}</a></div>
    `;

    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Wire up
    const msgsEl = panel.querySelector('#vaiMessages');
    const typingEl = panel.querySelector('#vaiTyping');
    const quickEl = panel.querySelector('#vaiQuick');
    const input = panel.querySelector('#vaiInput');
    const sendBtn = panel.querySelector('#vaiSend');
    const closeBtn = panel.querySelector('.valmontai-close');

    let isOpen = false;
    let greeted = false;

    function addBubble(text, who) {
      const wrap = el('div', 'valmontai-msg ' + (who === 'user' ? 'valmontai-msg-user' : 'valmontai-msg-bot'));
      const av = el('div', 'valmontai-msg-avatar');
      av.textContent = who === 'user' ? 'You' : 'AI';
      const bub = el('div', 'valmontai-bubble');
      bub.innerHTML = text;
      wrap.appendChild(av);
      wrap.appendChild(bub);
      msgsEl.appendChild(wrap);
      // Time
      const t = el('div', 'valmontai-time', nowTime());
      wrap.appendChild(t);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function renderQuick(showAll) {
      quickEl.innerHTML = '';
      const items = showAll ? QUICK_REPLIES : QUICK_REPLIES.slice(0, 4);
      items.forEach(label => {
        const b = el('button', 'valmontai-quick-btn', label);
        b.type = 'button';
        b.addEventListener('click', () => {
          quickEl.innerHTML = '';
          sendMessage(label);
        });
        quickEl.appendChild(b);
      });
    }

    function showTyping() {
      typingEl.classList.add('is-typing');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    function hideTyping() {
      typingEl.classList.remove('is-typing');
    }

    function botReply(text, quick) {
      showTyping();
      const delay = 500 + Math.min(800, text.length * 8);
      setTimeout(() => {
        hideTyping();
        addBubble(text, 'bot');
        if (quick) renderQuick(true);
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }, delay);
    }

    function sendMessage(raw) {
      const text = (raw || input.value || '').trim();
      if (!text) return;
      addBubble(text.replace(/</g, '&lt;'), 'user');
      input.value = '';
      quickEl.innerHTML = '';
      const res = getResponse(text);
      botReply(res.reply, res.quick);
    }

    function openPanel() {
      isOpen = true;
      panel.classList.add('is-open');
      btn.classList.add('is-open');
      btn.classList.remove('show-label');
      if (!greeted) {
        greeted = true;
        setTimeout(() => {
          botReply("Hello! Welcome to Valmont Gadgets. How can I help you find a phone or laptop today?", true);
        }, 250);
      }
      setTimeout(() => input.focus(), 300);
    }

    function closePanel() {
      isOpen = false;
      panel.classList.remove('is-open');
      btn.classList.remove('is-open');
    }

    btn.addEventListener('click', () => {
      if (isOpen) closePanel(); else openPanel();
    });
    closeBtn.addEventListener('click', closePanel);
    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    // Auto-open after a short delay on first load (non-intrusive: just pulses; we won't auto-open).
    // Hide the "Chat with ValmontAI" label after OPEN_LABEL_TIMEOUT
    setTimeout(() => btn.classList.remove('show-label'), OPEN_LABEL_TIMEOUT);

    // Escape closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();
})();
