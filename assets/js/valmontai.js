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
  const WHATSAPP = '0542451578';
  const WHATSAPP_LINK = 'https://wa.me/233542451578';

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

    // Warranty
    if (/\b(warranty|guarantee|warranty|cover(ed)?)\b/.test(q)) {
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
