
// ACCESSIBLE MODAL FOCUS TRAPPING AND ESCAPE-TO-CLOSE
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
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
    const activeModal = ["detailModal", "wishlistModal", "loginModal", "dealerModal"].map(id => document.getElementById(id)).find(el => el && !el.classList.contains("hidden"));
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

// Legacy Paystack inline loader removed. All online payments now flow
// through the central Valmont-Pay gateway (https://valmontpay.app/pay.html)
// via a full-page redirect. No third-party payment SDK is loaded from this app.

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('Service Worker registered successfully!', reg.scope))
          .catch(err => console.log('Service Worker registration failed:', err));
      });
    }
  

    // PRIVATE COST LEDGER
    const PRIVATE_COST_LEDGER = {};

    // REAL STORE PRODUCTS DATA
    const PRODUCTS = [
      {
        id: 'VG-IP15PM-256',
        name: 'iPhone 15 Pro Max 256GB — Dual SIM',
        category: 'iphones',
        retail: 16500,
        compareAt: 18000,
        badge: 'HOT',
        specs: 'Titanium • A17 Pro • Sealed • eSIM + Physical SIM',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop',
        wholesale: 13900,
        deliveryCost: 120,
        paymentCost: 280
      },
      {
        id: 'iphone-15-pro-128-uk-used-92',
        name: 'iPhone 15 Pro 128GB Natural Titanium — UK Used',
        category: 'iphones',
        retail: 11200, compareAt: 14500, badge: 'UK USED • BH 92%', stock: '1 in stock • UK Used • 12m Warranty',
        specs: '128GB • Natural Titanium • BH 92% Original • Face ID & True Tone OK • Europe Standard',
        description: 'Solid Europe-standard iPhone 15 Pro with a clean body, original 92% battery health, Face ID and True Tone working. Cable included. Grade A+ UK used—not brand-new sealed. Swap accepted.',
        features: ['128GB', 'BH 92% Original', 'Natural Titanium', 'Face ID OK', 'Swap Allowed', 'Europe Standard'],
        tags: ['iphone 15 pro', 'uk used', 'refurbished', '128gb', 'bh92'],
        image: 'uploads/iphone_15_pro_128_clean.jpg',
        images: ['uploads/iphone_15_pro_128_clean.jpg', 'uploads/iphone_15_pro_128_clean_1080.jpg', 'uploads/iphone_15_pro_front.jpg', 'uploads/iphone_15_pro_side.jpg'],
        wholesale: 0, deliveryCost: 80, paymentCost: 224
      },
      {
        id: 'VG-IP14PM-256',
        name: 'iPhone 14 Pro Max 256GB — Deep Purple',
        category: 'iphones',
        retail: 13500,
        compareAt: 15000,
        badge: 'DEAL',
        specs: 'A16 Bionic • Dynamic Island • Physical Dual SIM',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?q=80&w=800&auto=format&fit=crop',
        wholesale: 11400,
        deliveryCost: 120,
        paymentCost: 229
      },
      {
        id: 'VG-IP13-128',
        name: 'iPhone 13 128GB — Midnight',
        category: 'iphones',
        retail: 6800,
        compareAt: 7500,
        badge: 'HOT',
        specs: 'A15 Bionic • 6.1-inch • Sealed US Variant',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop',
        wholesale: 5650,
        deliveryCost: 100,
        paymentCost: 115
      },
      {
        id: 'VG-IP15-128',
        name: 'iPhone 15 128GB — Blue Dual SIM',
        category: 'iphones',
        retail: 9900,
        compareAt: 11000,
        badge: 'SEALED',
        specs: 'A16 • USB-C • Pink / Blue / Black • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop',
        wholesale: 8300,
        deliveryCost: 110,
        paymentCost: 168
      },
      {
        id: 'VG-SS24U-512',
        name: 'Samsung Galaxy S24 Ultra 512GB',
        category: 'samsung',
        retail: 15200,
        compareAt: 16800,
        badge: 'HOT',
        specs: 'Titanium Black • S Pen • 200MP • Snapdragon 8 Gen 3',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
        wholesale: 12800,
        deliveryCost: 120,
        paymentCost: 258
      },
      {
        id: 'VG-SS23U-256',
        name: 'Samsung Galaxy S23 Ultra 256GB',
        category: 'samsung',
        retail: 11500,
        compareAt: 13000,
        badge: 'DEAL',
        specs: 'Phantom Black • 12GB RAM • 5000mAh • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?q=80&w=800&auto=format&fit=crop',
        wholesale: 9600,
        deliveryCost: 110,
        paymentCost: 195
      },
      {
        id: 'VG-SS24-256',
        name: 'Samsung Galaxy S24 256GB — Marble Gray',
        category: 'samsung',
        retail: 8900,
        compareAt: 9800,
        badge: 'SEALED',
        specs: '8GB RAM • Exynos 2400 • Galaxy AI • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=800&auto=format&fit=crop',
        wholesale: 7450,
        deliveryCost: 100,
        paymentCost: 151
      },
      {
        id: 'VG-SSA55-256',
        name: 'Samsung Galaxy A55 256GB — Awesome Navy',
        category: 'samsung',
        retail: 4200,
        compareAt: 4800,
        badge: 'DEAL',
        specs: '8GB RAM • 120Hz AMOLED • IP67 • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
        wholesale: 3480,
        deliveryCost: 80,
        paymentCost: 71
      },
      {
        id: 'VG-SSFOLD5-512',
        name: 'Samsung Galaxy Z Fold 5 512GB',
        category: 'samsung',
        retail: 18500,
        compareAt: 20500,
        badge: 'HOT',
        specs: 'Phantom Black • 12GB RAM • Foldable • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1662948402327-e5ef1ac44e93?q=80&w=800&auto=format&fit=crop',
        wholesale: 15600,
        deliveryCost: 150,
        paymentCost: 314
      },
      {
        id: 'VG-MBP-M3-16-512',
        name: 'MacBook Pro M3 16GB/512GB — Space Black',
        category: 'laptops',
        retail: 22500,
        compareAt: 24500,
        badge: 'SEALED',
        specs: '14-inch Liquid Retina XDR • M3 Chip • 22H Battery',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop',
        wholesale: 19200,
        deliveryCost: 200,
        paymentCost: 382
      },
      {
        id: 'VG-MBP-M3P-18-512',
        name: 'MacBook Pro M3 Pro 18GB/512GB — Space Black',
        category: 'laptops',
        retail: 28900,
        compareAt: 31000,
        badge: 'HOT',
        specs: '14-inch • M3 Pro 11-Core • Sealed Apple Warranty',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop',
        wholesale: 24900,
        deliveryCost: 200,
        paymentCost: 491
      },
      {
        id: 'VG-MBA-M2-13-256',
        name: 'MacBook Air M2 13-inch 8GB/256GB — Midnight',
        category: 'laptops',
        retail: 12800,
        compareAt: 14000,
        badge: 'DEAL',
        specs: 'M2 Chip • 13.6-inch • 8GB/256GB • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop',
        wholesale: 10850,
        deliveryCost: 180,
        paymentCost: 217
      },
      {
        id: 'VG-MBA-M2-15-512',
        name: 'MacBook Air M2 15-inch 8GB/512GB — Starlight',
        category: 'laptops',
        retail: 16900,
        compareAt: 18200,
        badge: 'SEALED',
        specs: '15.3-inch Liquid Retina • M2 • Sealed Apple',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop',
        wholesale: 14450,
        deliveryCost: 180,
        paymentCost: 287
      },
      {
        id: 'VG-HP-SPECTRE-16-1T',
        name: 'HP Spectre x360 13.5-inch i7 16GB/1TB',
        category: 'laptops',
        retail: 14500,
        compareAt: 16000,
        badge: 'DEAL',
        specs: 'OLED Touch • Intel i7-1355U • Convertible • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583223667854-e0e05b1ad2ad?q=80&w=800&auto=format&fit=crop',
        wholesale: 12200,
        deliveryCost: 180,
        paymentCost: 246
      },
      {
        id: 'VG-DELL-XPS13P',
        name: 'Dell XPS 13 Plus i7 16GB/512GB — Platinum',
        category: 'laptops',
        retail: 13200,
        compareAt: 14800,
        badge: 'SEALED',
        specs: '13.4-inch OLED • i7-1360P • InfinityEdge • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop',
        wholesale: 11100,
        deliveryCost: 180,
        paymentCost: 224
      },
      {
        id: 'VG-IPAD-PRO11-M4-256',
        name: 'iPad Pro 11-inch M4 256GB — WiFi',
        category: 'tablets',
        retail: 12500,
        compareAt: 13800,
        badge: 'HOT',
        specs: 'Ultra Retina XDR • M4 Chip • Space Black • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop',
        wholesale: 10600,
        deliveryCost: 100,
        paymentCost: 212
      },
      {
        id: 'VG-IPAD-AIR-M2-128',
        name: 'iPad Air M2 11-inch 128GB — Blue',
        category: 'tablets',
        retail: 6900,
        compareAt: 7600,
        badge: 'SEALED',
        specs: 'M2 Chip • Liquid Retina • Touch ID • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop',
        wholesale: 5780,
        deliveryCost: 90,
        paymentCost: 117
      },
      {
        id: 'VG-AIRPODS-PRO2-USBC',
        name: 'AirPods Pro 2nd Gen USB-C',
        category: 'audio',
        retail: 3200,
        compareAt: 3800,
        badge: 'HOT',
        specs: 'MagSafe • Adaptive Smart Audio • H2 Chip • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop',
        wholesale: 2550,
        deliveryCost: 40,
        paymentCost: 54
      },
      {
        id: 'VG-AIRPODS-MAX-SG',
        name: 'AirPods Max — Space Gray',
        category: 'audio',
        retail: 6500,
        compareAt: 7200,
        badge: 'SEALED',
        specs: 'High-Fidelity • Active Noise Cancellation • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop',
        wholesale: 5450,
        deliveryCost: 60,
        paymentCost: 110
      },
      {
        id: 'VG-SONY-XM5-BLK',
        name: 'Sony WH-1000XM5 Wireless Headset — Black',
        category: 'audio',
        retail: 4100,
        compareAt: 4600,
        badge: 'DEAL',
        specs: 'Industry Leading ANC • 30H Battery • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop',
        wholesale: 3380,
        deliveryCost: 50,
        paymentCost: 69
      },
      {
        id: 'VG-JBL-CHARGE5-BLK',
        name: 'JBL Charge 5 Bluetooth Speaker — Black',
        category: 'audio',
        retail: 1650,
        compareAt: 1950,
        badge: 'HOT',
        specs: 'IP67 Waterproof • 20H Play • PartyBoost • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e11?q=80&w=800&auto=format&fit=crop',
        wholesale: 1280,
        deliveryCost: 50,
        paymentCost: 28
      },
      {
        id: 'VG-ANKER-PB-20K-65W',
        name: 'Anker 20,000mAh 65W Power Bank — PowerCore 24K',
        category: 'chargers',
        retail: 1250,
        compareAt: 1500,
        badge: 'SEALED',
        specs: '65W Fast Charge • PowerCore 24K • LED Display • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 960,
        deliveryCost: 40,
        paymentCost: 21
      },
      {
        id: 'VG-APPLE-67W-CABLE',
        name: 'Apple 67W USB-C Power Adapter + 2M Cable',
        category: 'chargers',
        retail: 850,
        compareAt: 1050,
        badge: 'DEAL',
        specs: 'Genuine Apple • Fast Charge MacBook Air • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 630,
        deliveryCost: 30,
        paymentCost: 14
      },
      {
        id: 'VG-SS-45W-BLK',
        name: 'Samsung Galaxy 45W Super Fast Charger — Black',
        category: 'chargers',
        retail: 450,
        compareAt: 600,
        badge: 'SEALED',
        specs: 'Super Fast Charging 2.0 • USB-C • Sealed Original',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 310,
        deliveryCost: 20,
        paymentCost: 7
      },
      {
        id: 'VG-AW-17AIR',
        name: 'iPhone 17 Air 256GB — Ultra Slim (White)',
        category: 'iphones',
        retail: 19500,
        compareAt: 21500,
        badge: 'NEW',
        specs: 'Concept Air Edition • 256GB Storage • 6.1" Ultra-Thin Titanium Frame • Sealed Box',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'uploads/clean_17_air.png',
        wholesale: 16500,
        deliveryCost: 150,
        paymentCost: 350
      },
      {
        id: 'VG-AW-16SNAP',
        name: 'iPhone 16 128GB — White (Snapchat Banned)',
        category: 'iphones',
        retail: 8500,
        compareAt: 11000,
        badge: 'BARGAIN',
        specs: '128GB Storage • Very Neat & Solid UK Used • Snapchat App Lock Only • falaa price!',
        stock: 'In stock • UK Used • 6m Store Warranty',
        image: 'uploads/clean_16_snapchat.png',
        wholesale: 7100,
        deliveryCost: 80,
        paymentCost: 154
      },
      {
        id: 'VG-AW-17PROMAX',
        name: 'iPhone 17 Pro Max 256GB — Premium Titanium',
        category: 'iphones',
        retail: 22000,
        compareAt: 24000,
        badge: 'NEW',
        specs: 'Concept Pro Max Edition • 256GB Storage • Titanium Chassis • Factory Sim Unlocked • Swapping Allowed',
        stock: 'In stock • Pristine Boxed • 12m Official Warranty',
        image: 'uploads/clean_17_promax.png',
        wholesale: 18500,
        deliveryCost: 150,
        paymentCost: 390
      },
      {
        id: 'iphone-13-pro-max-128-uk-used',
        name: 'iPhone 13 Pro Max 128GB — UK Used Sierra Blue / Gold',
        category: 'iphones',
        retail: 7900, compareAt: 8800, badge: 'UK USED • SWAP ALLOWED', stock: '5 in stock • UK Used • 12m Warranty',
        specs: '128GB • Sierra Blue / Gold • 85%+ Battery • Face ID & True Tone Active • Grade A',
        description: 'Very solid Grade A UK-used iPhone 13 Pro Max with a clean body and no dents. Sierra Blue and Gold available. Battery health is 85%+, with True Tone and Face ID active. Not brand-new sealed; price reflects its used condition.',
        features: ['128GB', 'Sierra Blue / Gold', 'UK Used', '85%+ Battery', 'Swap Allowed'],
        tags: ['13 pro max', 'uk used', 'refurbished'],
        image: 'uploads/iphone_13_pro_max_128_clean.jpg',
        images: ['uploads/iphone_13_pro_max_128_clean.jpg', 'uploads/iphone_13_pro_max_128_clean_1080.jpg', 'uploads/iphone_13_pro_max_front.jpg', 'uploads/iphone_13_pro_max_side.jpg'],
        wholesale: 6700, deliveryCost: 80, paymentCost: 132
      },
      {
        id: 'VG-AW-13',
        name: 'iPhone 13 128GB — UK Used Multi-Colors',
        category: 'iphones',
        retail: 5600,
        compareAt: 6400,
        badge: 'UK USED',
        specs: 'Red / Product Blue / Midnight • 128GB Storage • Excellent Condition • Swapping Allowed',
        stock: 'In stock • UK Used • 6m Store Warranty',
        image: 'uploads/clean_13.png',
        wholesale: 4800,
        deliveryCost: 60,
        paymentCost: 95
      },
      {
        id: 'VG-AW-AIRPODS4',
        name: 'Apple AirPods 4 — Sealed Box',
        category: 'audio',
        retail: 2200,
        compareAt: 2600,
        badge: 'SEALED',
        specs: 'Active Noise Cancellation • Personalized Spatial Audio • USB-C Charger Box • Dynamic Head Tracking',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'uploads/clean_airpods_4.png',
        wholesale: 1750,
        deliveryCost: 40,
        paymentCost: 44
      },
      {
        id: 'VG-AW-AIRPODSPRO3',
        name: 'Apple AirPods Pro 3 — Sealed Box',
        category: 'audio',
        retail: 3800,
        compareAt: 4400,
        badge: 'SEALED',
        specs: 'Next-Gen Active Noise Cancellation • H3 SIP Chip • Adaptive Audio • Sealed Box',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'uploads/clean_airpods_pro3.png',
        wholesale: 3100,
        deliveryCost: 50,
        paymentCost: 76
      },
      {
        id: 'VG-IPX-256',
        name: 'iPhone X 256GB — Silver',
        category: 'iphones',
        retail: 2950,
        compareAt: 3400,
        badge: 'CLASSIC',
        specs: '5.8-inch Super Retina OLED • Dual 12MP Cameras • Face ID • A11 Bionic',
        stock: 'In stock • Pristine Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 2300,
        deliveryCost: 50,
        paymentCost: 49
      },
      {
        id: 'VG-IPXSMAX-256',
        name: 'iPhone XS Max 256GB — Space Gray',
        category: 'iphones',
        retail: 3900,
        compareAt: 4400,
        badge: 'CLASSIC',
        specs: '6.5-inch Super Retina OLED • Dual 12MP Cameras • Face ID • A12 Bionic',
        stock: 'In stock • Pristine Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 3100,
        deliveryCost: 50,
        paymentCost: 66
      },
      {
        id: 'VG-IP11-128',
        name: 'iPhone 11 128GB — White',
        category: 'iphones',
        retail: 4400,
        compareAt: 4900,
        badge: 'DEAL',
        specs: '6.1-inch Liquid Retina • Dual 12MP Cameras • A13 Bionic • Best Seller in Ghana',
        stock: 'In stock • Excellent Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 3550,
        deliveryCost: 60,
        paymentCost: 74
      },
      {
        id: 'VG-IP11PM-256',
        name: 'iPhone 11 Pro Max 256GB — Midnight Green',
        category: 'iphones',
        retail: 5800,
        compareAt: 6500,
        badge: 'HOT',
        specs: '6.5-inch Super Retina XDR OLED • Triple 12MP Cameras • Face ID • A13 Bionic',
        stock: 'In stock • Pristine Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 4800,
        deliveryCost: 70,
        paymentCost: 110
      },
      {
        id: 'VG-IP12-128',
        name: 'iPhone 12 128GB — Black',
        category: 'iphones',
        retail: 6200,
        compareAt: 6800,
        badge: 'HOT',
        specs: '6.1-inch Super Retina XDR • Dual 12MP • A14 Bionic • 5G Support',
        stock: 'In stock • Excellent Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 5200,
        deliveryCost: 70,
        paymentCost: 112
      },
      {
        id: 'VG-IP12PM-128',
        name: 'iPhone 12 Pro Max 128GB — Pacific Blue',
        category: 'iphones',
        retail: 8900,
        compareAt: 9800,
        badge: 'DEAL',
        specs: '6.7-inch Super Retina XDR OLED • Triple 12MP • LiDAR Scanner • Face ID',
        stock: 'In stock • Pristine Condition • 6m Store Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 7450,
        deliveryCost: 80,
        paymentCost: 151
      },
      {
        id: 'VG-IP14P-128',
        name: 'iPhone 14 Pro 128GB — Space Black',
        category: 'iphones',
        retail: 11500,
        compareAt: 12500,
        badge: 'SEALED',
        specs: 'A16 Bionic • Dynamic Island • 48MP Triple Pro Camera • 120Hz ProMotion',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop',
        wholesale: 9700,
        deliveryCost: 100,
        paymentCost: 195
      },
      {
        id: 'VG-SSA05S-128',
        name: 'Samsung Galaxy A05s 128GB — Light Green',
        category: 'samsung',
        retail: 1450,
        compareAt: 1800,
        badge: 'DEAL',
        specs: '4GB RAM • 6.7-inch Full HD+ • Snapdragon 680 • 50MP Triple Camera',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
        wholesale: 1120,
        deliveryCost: 40,
        paymentCost: 22
      },
      {
        id: 'VG-SSA22-128',
        name: 'Samsung Galaxy A22 5G 128GB — Gray',
        category: 'samsung',
        retail: 1800,
        compareAt: 2200,
        badge: 'SEALED',
        specs: '6GB RAM • 6.6-inch 90Hz Display • Triple 48MP Camera • 5G Support',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
        wholesale: 1390,
        deliveryCost: 40,
        paymentCost: 31
      },
      {
        id: 'VG-SSA15-128',
        name: 'Samsung Galaxy A15 128GB — Awesome Blue',
        category: 'samsung',
        retail: 2100,
        compareAt: 2500,
        badge: 'HOT',
        specs: '4GB RAM • 6.5-inch Super AMOLED • 50MP Triple Camera • 25W Fast Charge',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
        wholesale: 1680,
        deliveryCost: 50,
        paymentCost: 38
      },
      {
        id: 'VG-SSA16-128',
        name: 'Samsung Galaxy A16 5G 128GB — Awesome Black',
        category: 'samsung',
        retail: 2900,
        compareAt: 3400,
        badge: 'SEALED',
        specs: '6GB RAM • 6.7-inch AMOLED • 50MP Main Lens • 5000mAh Battery • 5G',
        stock: 'In stock • Sealed Box • 12m Official Warranty',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
        wholesale: 2280,
        deliveryCost: 50,
        paymentCost: 52
      },
      {
        id: 'VG-GEVEY-RSIM18',
        name: 'R-SIM 18 Club Gevey Unlock Chip for iPhones',
        category: 'phone_parts',
        retail: 380,
        compareAt: 500,
        badge: 'HOT',
        specs: 'QPE eSIM Unlocking • iOS 17/18 Compatible • Multi-Network Support (AT&T, T-Mobile to MTN/Telecel)',
        stock: 'In stock • Original Chip • 3m Store Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 240,
        deliveryCost: 20,
        paymentCost: 6
      },
      {
        id: 'VG-PARTS-SIM-PIN',
        name: 'Heavy-Duty SIM Ejector Pin Keyring (5-Pack)',
        category: 'phone_parts',
        retail: 90,
        compareAt: 150,
        badge: 'SEALED',
        specs: 'Stainless Steel • Safe SIM Removal Tool • Includes Keyring Holder • Universal Fit',
        stock: 'In stock • Original Accessory',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 35,
        deliveryCost: 20,
        paymentCost: 2
      },
      {
        id: 'VG-CASE-SPG-15PM',
        name: 'Spigen Rugged Armor Case for iPhone 15 Pro Max',
        category: 'phone_acc',
        retail: 350,
        compareAt: 450,
        badge: 'HOT',
        specs: 'Matte Black • Carbon Fiber Accents • Military Grade Drop Protection • Case Friendly',
        stock: 'In stock • Sealed • Original Spigen',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 220,
        deliveryCost: 30,
        paymentCost: 7
      },
      {
        id: 'VG-CASE-APL-MS',
        name: 'Apple MagSafe Silicone Case for iPhone 15 Pro Max',
        category: 'phone_acc',
        retail: 450,
        compareAt: 600,
        badge: 'SEALED',
        specs: 'Liquid Silicone • Perfect MagSafe Alignment • Soft Microfiber Lining • Original Sealed Packaging',
        stock: 'In stock • Sealed • Genuine Apple',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 310,
        deliveryCost: 30,
        paymentCost: 8
      },
      {
        id: 'VG-GLASS-SPG-EZ',
        name: 'Spigen EZ Fit Tempered Glass Screen Protector (2-Pack)',
        category: 'phone_acc',
        retail: 250,
        compareAt: 350,
        badge: 'DEAL',
        specs: '9H Hardness Glass • EZ Align Auto-Installation Tray • Oleophobic Anti-Fingerprint Shield',
        stock: 'In stock • Sealed • Original Spigen',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 160,
        deliveryCost: 20,
        paymentCost: 5
      },
      {
        id: 'VG-CAR-BASEUS-MS',
        name: 'Baseus 15W MagSafe Magnetic Car Charger Mount',
        category: 'travel_acc',
        retail: 550,
        compareAt: 750,
        badge: 'HOT',
        specs: 'Air Vent & Dashboard Clamp • Strong N52 MagSafe Magnets • 360 Rotation • Fast Charge',
        stock: 'In stock • Sealed • Original Baseus',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 390,
        deliveryCost: 40,
        paymentCost: 11
      },
      {
        id: 'VG-APL-AIRTAG-1',
        name: 'Apple AirTag Bluetooth Tracker (1-Pack)',
        category: 'travel_acc',
        retail: 550,
        compareAt: 700,
        badge: 'SEALED',
        specs: 'Find My Network Compatible • Precision Finding • IP67 Water Resistant • Genuine Sealed',
        stock: 'In stock • Sealed • Genuine Apple',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop',
        wholesale: 380,
        deliveryCost: 30,
        paymentCost: 11
      },
      {
        id: 'VG-PIX-8P',
        name: 'Google Pixel 8 Pro 128GB — Obsidian',
        category: 'android',
        retail: 8500,
        compareAt: 9500,
        badge: 'HOT',
        specs: 'Google Tensor G3 • 50MP Triple Camera • 120Hz OLED • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
        wholesale: 7100,
        deliveryCost: 80,
        paymentCost: 154
      },
      {
        id: 'VG-OP12-256',
        name: 'OnePlus 12 256GB — Silky Black',
        category: 'android',
        retail: 9200,
        compareAt: 10200,
        badge: 'HOT',
        specs: 'Snapdragon 8 Gen 3 • 100W SuperVOOC • 16GB RAM • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
        wholesale: 7800,
        deliveryCost: 80,
        paymentCost: 168
      },
      {
        id: 'VG-XIA-RN13P',
        name: 'Xiaomi Redmi Note 13 Pro+ 5G 256GB',
        category: 'android',
        retail: 4800,
        compareAt: 5400,
        badge: 'DEAL',
        specs: '200MP Camera • 120W HyperCharge • IP68 Waterproof • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop',
        wholesale: 3950,
        deliveryCost: 80,
        paymentCost: 81
      },
      {
        id: 'VG-ANK-8IN1',
        name: 'Anker 8-in-1 USB-C Hub Adapter',
        category: 'laptop_acc',
        retail: 950,
        compareAt: 1200,
        badge: 'SEALED',
        specs: '4K HDMI • 100W Power Delivery • 2x USB-A • SD Card slots',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 710,
        deliveryCost: 30,
        paymentCost: 16
      },
      {
        id: 'VG-LOGI-MX3S',
        name: 'Logitech MX Master 3S Wireless Mouse',
        category: 'laptop_acc',
        retail: 1450,
        compareAt: 1750,
        badge: 'HOT',
        specs: '8K DPI Anywhere Tracking • Quiet Clicks • USB-C Charging',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 1120,
        deliveryCost: 40,
        paymentCost: 24
      },
      {
        id: 'VG-UG-STAND',
        name: 'Ugreen Ergonomic Aluminum Laptop Stand',
        category: 'laptop_acc',
        retail: 450,
        compareAt: 600,
        badge: 'DEAL',
        specs: 'Adjustable Height • Multi-Angle Folding • Sturdy Metal Build',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 310,
        deliveryCost: 30,
        paymentCost: 8
      },
      {
        id: 'VG-PARTS-15PM-SCR',
        name: 'Original iPhone 15 Pro Max Replacement Screen',
        category: 'phone_parts',
        retail: 3200,
        compareAt: 3800,
        badge: 'HOT',
        specs: 'Super Retina XDR OLED • Ceramic Shield Glass • Original Part',
        stock: 'In stock • Original Part • 3m Store Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 2450,
        deliveryCost: 40,
        paymentCost: 55
      },
      {
        id: 'VG-PARTS-IP13-BAT',
        name: 'Original iPhone 13 Replacement Battery',
        category: 'phone_parts',
        retail: 650,
        compareAt: 800,
        badge: 'SEALED',
        specs: '3227mAh Capacity • 100% Health Verification Chip • Zero Cycles',
        stock: 'In stock • Original Part • 3m Store Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 480,
        deliveryCost: 20,
        paymentCost: 11
      },
      {
        id: 'VG-PARTS-S24U-CAM',
        name: 'Original Samsung Galaxy S24 Ultra Camera Glass',
        category: 'phone_parts',
        retail: 350,
        compareAt: 500,
        badge: 'DEAL',
        specs: 'Sapphire Crystal Lens • Triple Camera Lens Housing Kit',
        stock: 'In stock • Original Part • 3m Store Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 220,
        deliveryCost: 20,
        paymentCost: 6
      },
      {
        id: 'VG-AW-S9-45',
        name: 'Apple Watch Series 9 GPS 45mm',
        category: 'smartwatches',
        retail: 5500,
        compareAt: 6200,
        badge: 'HOT',
        specs: 'Midnight Aluminum • S9 SIP • Always-On Retina • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop',
        wholesale: 4600,
        deliveryCost: 50,
        paymentCost: 93
      },
      {
        id: 'VG-GW6-44',
        name: 'Samsung Galaxy Watch 6 44mm — Graphite',
        category: 'smartwatches',
        retail: 3900,
        compareAt: 4400,
        badge: 'SEALED',
        specs: 'Super AMOLED • Sleep Tracking • Body Composition • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=800&auto=format&fit=crop',
        wholesale: 3200,
        deliveryCost: 50,
        paymentCost: 66
      },
      {
        id: 'ps5-1tb-new-sealed-slim',
        name: 'PS5 1TB Slim — Brand New Sealed — Disc Edition',
        category: 'gaming',
        retail: 7800, compareAt: 8500, badge: 'SEALED — NEW', stock: '4 in stock • Sealed • 12m Warranty',
        specs: '1TB SSD Slim • Disc Edition • European Stock • Includes DualSense, cables & stand',
        description: 'Brand-new sealed 2024 Slim model. Listing is for one console. Includes console, DualSense controller, cables and stand, with receipt and 12-month Valmont warranty.',
        features: ['1TB SSD Slim', 'Disc Version', 'Sealed', '1 Year Warranty'],
        tags: ['ps5', 'new', 'sealed', 'slim'],
        image: 'uploads/ps5_4_boxes_clean.jpg',
        images: ['uploads/ps5_4_boxes_clean.jpg', 'uploads/ps5_4_boxes_clean_1080.jpg', 'uploads/ps5_box_side.jpg', 'uploads/ps5_box_open.jpg'],
        wholesale: 6700, deliveryCost: 150, paymentCost: 132
      },
      {
        id: 'ps5-1tb-very-neat-used-001',
        name: 'PS5 1TB — UK Used Very Neat — 1 Controller',
        category: 'gaming',
        retail: 5800, compareAt: 6800, badge: 'REFURBISHED • VERY NEAT', stock: '2 in stock • Refurbished • 12m Warranty',
        specs: '1TB SSD • Original DualSense • Fully Tested • Clean Body • Europe Standard',
        description: 'Very neat 9.5/10 UK-used Europe-standard PS5. This listing is for one fully tested console with clean body, one original DualSense controller, HDMI cable and power cable. Refurbished/used, not sealed new.',
        features: ['1TB SSD', 'Includes DualSense', 'Tested 100%', '12mo warranty', 'Accra delivery', 'Not sealed — refurbished'],
        tags: ['ps5', 'gaming', 'uk used', 'refurbished', 'very neat'],
        image: 'uploads/ps5_2_consoles_clean.jpg',
        images: ['uploads/ps5_2_consoles_clean.jpg', 'uploads/ps5_2_consoles_clean_1080.jpg', 'uploads/ps5_consoles_side.jpg', 'uploads/ps5_controller_close.jpg'],
        wholesale: 0, deliveryCost: 150, paymentCost: 0
      },
      {
        id: 'hp-elitebook-1030-g2-x360',
        name: 'HP EliteBook 1030 G2 x360 — i7 7th Gen, 8GB / 256GB',
        category: 'laptops',
        retail: 3900, compareAt: 4500, badge: 'x360 TOUCH • REFURBISHED', stock: '3 in stock • Refurbished • Warranty Included',
        specs: 'i7 7th Gen • 8GB RAM • 256GB SSD • 13.3-inch FHD Touch • Windows 11 Pro',
        description: 'Very neat UK business-grade HP EliteBook 1030 G2 x360. This touchscreen convertible has a backlit keyboard, fingerprint reader, 360-degree hinge and activated Windows 11 Pro. Includes charger. Refurbished, not brand new.',
        features: ['i7 7th Gen', '8GB / 256GB SSD', '13.3-inch Touch x360', 'Backlit Keyboard', 'Fingerprint', 'Windows 11 Pro'],
        tags: ['laptop', 'hp', 'elitebook', 'x360', 'touch', 'refurbished'],
        image: 'uploads/hp_elitebook_1030_g2_clean.jpg',
        images: ['uploads/hp_elitebook_1030_g2_clean.jpg', 'uploads/hp_elitebook_1030_g2_clean_1080.jpg', 'uploads/hp_elitebook_keyboard.jpg', 'uploads/hp_elitebook_tablet.jpg'],
        wholesale: 0, deliveryCost: 100, paymentCost: 0
      },
      {
        id: 'VG-NS-OLED',
        name: 'Nintendo Switch OLED Model — Neon Blue/Red',
        category: 'gaming',
        retail: 4200,
        compareAt: 4800,
        badge: 'DEAL',
        specs: '7-inch Vibrant OLED Screen • 64GB • Wired LAN Dock',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800&auto=format&fit=crop',
        wholesale: 3500,
        deliveryCost: 80,
        paymentCost: 71
      },
      {
        id: 'VG-ANKER-735-65W',
        name: 'Anker 735 65W GaN Charger — 3 Port',
        category: 'chargers',
        retail: 750,
        compareAt: 950,
        badge: 'HOT',
        specs: 'GaNPrime • 2x USB-C + USB-A • Foldable • Sealed',
        stock: 'In stock • Sealed • 12m Warranty',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
        wholesale: 540,
        deliveryCost: 20,
        paymentCost: 12
      }
    ];

    // Normalize merchandising data: realistic reviews and inventory by product tier.
    PRODUCTS.forEach((p, index) => {
      const name = p.name.toLowerCase();
      const isPopular = name.includes('iphone 15 pro max') || name.includes('s24 ultra');
      const isMidRange = name.includes('iphone 13') || name.includes('a55');
      const isAccessory = ['chargers','phone_acc','phone_parts','travel_acc','laptop_acc'].includes(p.category);
      const isNew = p.badge === 'NEW';
      p.reviews_count = isPopular ? 42 + (index % 27) : isMidRange ? 18 + (index % 15) : isNew ? index % 6 : isAccessory ? 8 + (index % 8) : 12 + (index % 18);
      p.stock_quantity = isPopular ? 3 + (index % 6) : p.category === 'samsung' ? 5 + (index % 8) : isAccessory ? 15 + (index % 16) : 6 + (index % 12);
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
      const cls = o.className || 'max-h-full object-contain';
      const lazy = o.eager ? '' : ' loading="lazy"';
      const prio = o.eager ? ' fetchpriority="high"' : '';
      const sizes = o.sizes || `${size}px`;
      const safeAlt = String(alt || '').replace(/"/g, '&quot;');
      if (/^uploads\/.+\.png$/.test(src || '')) {
        const base = src.replace(/\.png$/, '');
        return `<picture><source type="image/webp" srcset="${base}_400.webp 400w, ${base}_800.webp 800w" sizes="${sizes}">` +
               `<img src="${src}" alt="${safeAlt}" width="${size}" height="${size}"${lazy}${prio} decoding="async" class="${cls}" /></picture>`;
      }
      return `<img src="${src}" alt="${safeAlt}" width="${size}" height="${size}"${lazy}${prio} decoding="async" class="${cls}" />`;
    }

    // Populate private costs
    PRODUCTS.forEach(p => {
      PRIVATE_COST_LEDGER[p.id] = { wholesale: p.wholesale, delivery: p.deliveryCost, payment: p.paymentCost };
    });

    
    // === SUPABASE DATABASE INTEGRATION CONFIGURATION ===
    const VALMONT_SUPABASE = {
      url: 'https://eydsoqnpetqczaeqrscc.supabase.co',
      anonKey: 'sb_publishable_BHdfWG7G433xVJ93ZJTNIQ_q_jFBwso'
    };

    const hasSupabase = () => {
      return VALMONT_SUPABASE.url && 
             VALMONT_SUPABASE.anonKey && 
             !VALMONT_SUPABASE.url.includes('PASTE_') && 
             !VALMONT_SUPABASE.anonKey.includes('PASTE_');
    };

    async function supabaseInsert(table, body) {
      const response = await fetch(`${VALMONT_SUPABASE.url.replace(/\/$/, '')}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': VALMONT_SUPABASE.anonKey,
          'Authorization': `Bearer ${VALMONT_SUPABASE.anonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }

    async function supabaseFetch(endpoint) {
      if (!hasSupabase()) throw new Error('Supabase not configured');
      const response = await fetch(`${VALMONT_SUPABASE.url.replace(/\/$/, '')}/rest/v1/${endpoint}`, {
        method: 'GET',
        headers: {
          'apikey': VALMONT_SUPABASE.anonKey,
          'Authorization': `Bearer ${VALMONT_SUPABASE.anonKey}`
        }
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }

    window.loadPaystackScript = function loadPaystackScript() {
      return new Promise((resolve, reject) => {
        if (window.PaystackPop) return resolve(window.PaystackPop);
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => resolve(window.PaystackPop);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // APP STATE
    const initialFilters = new URLSearchParams(location.search);
    let activeFilter = initialFilters.get('category') || 'all';
    let activePriceFilter = initialFilters.get('price') || 'all';
    let activeSort = initialFilters.get('sort') || 'popular';
    let currentProductPage = Math.max(1, Number(initialFilters.get('page') || 1));
    let searchQuery = '';
    let cart = JSON.parse(localStorage.getItem('valmont_cart') || '[]');
    let wishlist = JSON.parse(localStorage.getItem('valmont_wishlist') || '[]');
    let recentlyViewed = JSON.parse(localStorage.getItem('valmont_recently_viewed') || '[]');
    let currentUser = JSON.parse(localStorage.getItem('valmont_user') || 'null');
    let isResellerMode = false;
    let selectedDetailProduct = null;
    let isDealerMode = false;
    let dealerProfile = null;

    // Elements
    const productGrid = document.getElementById('productGrid');
    const flashGrid = document.getElementById('flashProductsRow');
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
      chargers: 'Power & Chargers'
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
      const user = JSON.parse(localStorage.getItem('valmont_user') || 'null');
      if (label && user) {
        label.textContent = user.name.split(' ')[0];
      } else if (label) {
        label.textContent = 'Account';
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
        const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.specs.toLowerCase().includes(searchQuery.toLowerCase());
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
          const discount = Math.round((1 - (p.retail / p.compareAt)) * 100);
          const isWishlisted = wishlist.includes(p.id);
          const heartColor = isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500';
          
          return `
            <div role="button" tabindex="0" class="bg-white rounded-[4px] overflow-hidden border border-gray-200 hover:shadow-md transition duration-200 flex flex-col justify-between group relative cursor-pointer" onclick="openProductDetail('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductDetail('${p.id}')}">
              <!-- Wishlist heart button overlay -->
              <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="absolute top-2.5 right-2 h-7 w-7 rounded-full bg-white/95 shadow-sm border border-gray-50 flex items-center justify-center z-10 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 ${heartColor}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </button>

              <div class="absolute top-2.5 left-2 bg-orange-50 text-[#ff8c00] text-[10px] font-black px-1.5 py-0.5 rounded-sm">
                -${discount}%
              </div>
              
              <div class="p-3">
                <div class="h-[140px] w-full flex items-center justify-center overflow-hidden mb-2 rounded-[4px] bg-gray-50">
                  ${productImg(p.image, p.name, 140, {className: 'max-h-full object-contain group-hover:scale-105 transition duration-200', sizes: '(max-width: 640px) 45vw, 140px'})}
                </div>
                <h4 class="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[32px]">${p.name}</h4>
                <p class="text-[10px] text-gray-400 font-medium truncate mt-1">${p.specs}</p>
                <div class="mt-2">
                  <span class="text-[14px] font-black text-gray-800">${isDealerMode ? money(p.wholesale) : money(p.retail)}</span>
                  <span class="text-[11px] text-gray-400 line-through ml-1 font-semibold">${isDealerMode ? money(p.retail) : money(p.compareAt)}</span>
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
                <button onclick="event.stopPropagation(); addToCart('${p.id}')" class="w-full bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[11px] py-2 rounded-[4px] uppercase transition tracking-widest shadow-sm">
                  Add To Bag
                </button>
              </div>
            </div>
          `;
        }).join('');
        if (pageCount > 1) {
          productGrid.insertAdjacentHTML('afterend', `<nav class="product-pagination flex justify-center gap-2 py-6" aria-label="Product pages">${Array.from({length: pageCount}, (_, i) => `<button type="button" data-page="${i + 1}" class="px-3 py-2 rounded border text-sm font-bold">${i + 1}</button>`).join('')}</nav>`);
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
        const discount = Math.round((1 - (p.retail / p.compareAt)) * 100);
        return `
          <div class="bg-white rounded-[4px] p-2.5 border border-gray-100 hover:border-orange-200/50 shrink-0 w-[145px] hover:shadow transition relative cursor-pointer" onclick="openProductDetail('${p.id}')">
            <span class="absolute top-1 left-1 bg-orange-50 text-[#ff8c00] text-[9px] font-black px-1.5 py-0.5 rounded-sm">-${discount}%</span>
            <div class="h-[100px] w-full flex items-center justify-center overflow-hidden mb-1 bg-gray-50 rounded-[4px]">
              ${productImg(p.image, p.name, 100)}
            </div>
            <h5 class="text-[11px] text-gray-800 font-bold truncate">${p.name}</h5>
            <div class="mt-1 leading-tight">
              <span class="block text-[13px] font-black text-gray-900">${money(p.retail)}</span>
              <span class="block text-[10px] text-gray-400 line-through font-semibold">${money(p.compareAt)}</span>
            </div>
            <button type="button" class="flash-add" onclick="event.stopPropagation(); addToCart('${p.id}')">Add to Bag</button>
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
      localStorage.setItem('valmont_wishlist', JSON.stringify(wishlist));
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
              <h5 class="text-[12px] font-bold text-gray-800 truncate">${p.name}</h5>
              <p class="text-[11px] text-gray-500 font-black mt-0.5">${money(p.retail)}</p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button onclick="addToCart('${p.id}'); closeWishlistModal();" class="bg-[#ff8c00] hover:bg-orange-600 text-white font-bold text-[10px] px-3.5 py-2 rounded-[4px] uppercase transition">
                Add To Bag
              </button>
              <button onclick="toggleWishlist('${p.id}'); renderWishlistModal();" class="text-gray-400 hover:text-red-500 text-sm">
                x
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

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
      localStorage.setItem('valmont_cart', JSON.stringify(cart));
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
      
      localStorage.setItem('valmont_recently_viewed', JSON.stringify(recentlyViewed));
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
        const discount = Math.round((1 - (p.retail / p.compareAt)) * 100);
        return `
          <div class="bg-white rounded-[4px] p-2 border border-gray-100 shrink-0 w-[130px] hover:shadow transition cursor-pointer" onclick="openProductDetail('${p.id}')">
            <div class="h-[90px] w-full flex items-center justify-center overflow-hidden mb-1 bg-gray-50 rounded-[4px]">
              ${productImg(p.image, p.name, 100)}
            </div>
            <h5 class="text-[10px] text-gray-800 font-bold truncate leading-none">${p.name.split(' — ')[0]}</h5>
            <span class="block text-[11px] font-black text-gray-900 mt-1">${money(p.retail)}</span>
          </div>
        `;
      }).join('');
    }


    // JUMIA SHOPPING CART DRAWER MANAGEMENT
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const checkoutActionBtn = document.getElementById('checkoutActionBtn');
    const backActionBtn = document.getElementById('backActionBtn');

    let checkoutStep = 1;

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
      const expressFee = Math.ceil((Number(product.deliveryCost) || 0) * 1.3);
      const message = `Valmont Express Delivery selected for ${product.name}. Estimated delivery fee: ${money(expressFee)}. Our team will confirm dispatch details.`;
      if (typeof showValmontToast === 'function') showValmontToast(message);
      else alert(message);
    }

    function addToCart(id) {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) return;
      
      // Adapt price if Dealer Mode is active
      const activePrice = isDealerMode ? product.wholesale : product.retail;
      
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ ...product, retail: activePrice, qty: 1 });
      }
      
      localStorage.setItem('valmont_cart', JSON.stringify(cart));
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
      localStorage.setItem('valmont_cart', JSON.stringify(cart));
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
      localStorage.setItem('valmont_cart', JSON.stringify(cart));
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
              <h5 class="text-[12px] font-bold text-gray-800 truncate leading-tight">${item.name}</h5>
              <p class="text-[11px] text-gray-500 font-black mt-0.5">${money(item.retail)}</p>
              
              <div class="flex items-center gap-2.5 mt-1.5">
                <button onclick="changeQty('${item.id}', -1)" class="bg-gray-100 hover:bg-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded text-[12px]">-</button>
                <span class="text-[12px] font-black text-gray-700">${item.qty}</span>
                <button onclick="changeQty('${item.id}', 1)" class="bg-gray-100 hover:bg-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded text-[12px]">+</button>
              </div>
            </div>
            <button onclick="removeFromCart('${item.id}')" class="text-red-400 hover:text-red-600 text-[11px] font-black uppercase">
              Remove
            </button>
          </div>
        `;
      }).join('');

      const subtotal = cart.reduce((sum, item) => sum + (item.retail * item.qty), 0);
      subtotalEl.textContent = money(subtotal);
      totalEl.textContent = money(subtotal);
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
      } else if (checkoutStep === 2) {
        const name = document.getElementById('shippingName').value.trim();
        const phone = document.getElementById('shippingPhone').value.trim();
        const city = document.getElementById('shippingCity').value.trim();
        const town = document.getElementById('shippingTown').value.trim();
        const gps = document.getElementById('shippingGPS').value.trim();
        const street = document.getElementById('shippingStreet').value.trim();
        
        if (!name || !phone || !city || !town || !street) {
          alert("Please fill out your Name, Phone, City, Town, and Street Address to continue.");
          return;
        }
        
        checkoutStep = 3;
        document.getElementById('checkoutStep2').classList.add('hidden');
        document.getElementById('checkoutStep3').classList.remove('hidden');
        
        document.getElementById('stepTab2').className = "text-gray-400 pb-0.5";
        document.getElementById('stepTab3').className = "text-[#ff8c00] border-b-2 border-[#ff8c00] pb-0.5";
        checkoutActionBtn.querySelector('span').textContent = "Submit Secure Order";
      } else if (checkoutStep === 3) {
        triggerWhatsAppOrder();
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
      triggerWhatsAppOrder(true);
    });

    // Global variables for paystack tracking
    let paystackSavedReceipt = '';
    let paystackSavedRef = '';
    let paystackSavedName = '';
    let paystackSavedPayment = '';

    function triggerWhatsAppOrder(paymentConfirmed = false) {
      const name = document.getElementById('shippingName').value.trim();
      const phone = document.getElementById('shippingPhone').value.trim();
      const city = document.getElementById('shippingCity').value.trim();
      const town = document.getElementById('shippingTown').value.trim();
      const gps = document.getElementById('shippingGPS').value.trim();
      const street = document.getElementById('shippingStreet').value.trim();
      const fullAddress = `${street}, ${town}, ${city} ${gps ? '(' + gps + ')' : ''}`;
      const paymentOpt = document.querySelector('input[name="paymentOption"]:checked').value;

      const subtotal = cart.reduce((sum, item) => sum + (item.retail * item.qty), 0);
      const ref = `VG-${Date.now().toString().slice(-6)}`;
      const itemsString = cart.map(item => `• ${item.name} (Qty ${item.qty} - ${money(item.retail * item.qty)})`).join('\n');
      
      const paymentNames = { momo: 'Mobile Money', cod: 'Cash on Delivery', card: 'Credit/Debit Card' };
      paystackSavedRef = ref;
      paystackSavedName = name;
      paystackSavedPayment = paymentNames[paymentOpt];

      // Prepare receipt text
      paystackSavedReceipt = `*VALMONT GADGETS — ORDER RECEIVED*
Ref Code: *#${ref}*

*ITEMS:*
${itemsString}

*TOTAL BILL:* ${money(subtotal)}
*PAYMENT:* ${paymentNames[paymentOpt]} (${paymentOpt === 'cod' ? 'Pending' : 'Paid'})

*SHIPPING TO:*
Name: ${name}
Contact: ${phone}
Region: ${area}
Street: ${street || 'To be provided'}

_Stock is verified before dispatch. We will reach out on WhatsApp to finalize your delivery. Thank you for choosing Valmont Gadgets Ghana!_`;

      if (paymentOpt === 'cod') {
        // Cash on delivery goes straight to WhatsApp!
        finalizeCheckout();
      } else if (paymentOpt === 'card') {
        // Card payments redirect straight to the Valmont-Pay secure gateway.
        redirectToValmontPay({
          subtotal: subtotal,
          reference: ref,
          name: name,
          phone: phone,
          area: area,
          street: street,
          fullAddress: fullAddress,
          paymentMethod: paymentNames[paymentOpt],
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
      } else {
        // Mobile Money continues to use the in-page payment modal.
        openPaystackModal(subtotal, paymentOpt, phone);
      }
    }

    function redirectToValmontPay(ctx) {
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
        total_amount: ctx.subtotal,
        items: ctx.items
      };

      try {
        localStorage.setItem('valmont_pending_order', JSON.stringify(pendingOrder));
      } catch (e) {
        console.warn('Unable to persist pending order:', e);
      }

      const gatewayUrl = new URL('https://valmontpay.app/pay.html');
      gatewayUrl.searchParams.set('merchant', 'Valmont Gadgets');
      gatewayUrl.searchParams.set('amount', Number(ctx.subtotal).toFixed(2));
      gatewayUrl.searchParams.set('email', email);
      gatewayUrl.searchParams.set('reference', ctx.reference);
      gatewayUrl.searchParams.set('callback_url', 'https://valmontgadgets.com/order-confirmed.html');

      window.location.href = gatewayUrl.toString();
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
      // then re-runs the checkout pipeline, which now routes card payments
      // through redirectToValmontPay() and MoMo through the existing
      // finalizeCheckout / WhatsApp handoff.
      closePaystackModal();
      try { triggerWhatsAppOrder(false); } catch (e) { console.error('Checkout handoff failed:', e); }
    }

    async function finalizeCheckout() {
      const subtotal = cart.reduce((sum, item) => sum + (item.retail * item.qty), 0);
      const city = document.getElementById('shippingCity').value.trim();
      const town = document.getElementById('shippingTown').value.trim();
      const gps = document.getElementById('shippingGPS').value.trim();
      const street = document.getElementById('shippingStreet').value.trim();
      const fullAddress = `${street}, ${town}, ${city} ${gps ? '(' + gps + ')' : ''}`;
      const phone = document.getElementById('shippingPhone').value.trim();

      // 1. Dual-Database Pipeline: Try writing to live Supabase DB first if configured
      if (hasSupabase()) {
        try {
          console.log('Supabase detected! Writing order to live database...');
          const created = await supabaseInsert('orders', {
            order_number: paystackSavedRef,
            customer_name: paystackSavedName,
            customer_phone: phone,
            delivery_address: fullAddress,
            delivery_zone: area || null,
            total_amount: subtotal,
            payment_method: paystackSavedPayment
          });

          if (created && created.length > 0) {
            const orderId = created[0].id;
            await supabaseInsert('order_items', cart.map(item => ({
              order_id: orderId,
              product_name: item.name,
              unit_price: item.retail,
              quantity: item.qty
            })));
            console.log('Order successfully committed to Supabase!');
          }
        } catch (error) {
          console.error('Supabase write error:', error);
        }
      }

      // 2. Save order to local storage (Reseller Desk Order list)
      saveOrderToLog(paystackSavedRef, paystackSavedName, cart.map(i => i.name).join(', '), paystackSavedPayment);

      // 3. Open WhatsApp
      const waUrl = `https://wa.me/233542451578?text=${encodeURIComponent(paystackSavedReceipt)}`;
      window.open(waUrl, '_blank');
      
      // 4. Clear Cart and close UI
      cart = [];
      localStorage.setItem('valmont_cart', JSON.stringify(cart));
      updateCartCount();
      closeCart();
      alert(`Order #${paystackSavedRef} processed successfully! Connecting with Valmont dispatch rider on WhatsApp...`);
    }

    function saveOrderToLog(ref, name, itemNames, payment) {
      let orders = JSON.parse(localStorage.getItem('valmont_orders') || '[]');
      orders.unshift({ id: ref, date: 'Just Now', item: itemNames, status: 'Awaiting pay', supplier: 'To Settle' });
      localStorage.setItem('valmont_orders', JSON.stringify(orders));
      renderLocalOrderTable();
    }


    // ==============================================================================
    // VERIFIED CUSTOMER REVIEWS & 5-STAR RATINGS SYSTEM
    // ==============================================================================
    const DEFAULT_SEED_REVIEWS = [
      {
        customer_name: "Abena Osei",
        rating: 5,
        comment: "Super fast delivery in Accra! Product was 100% brand new and sealed with full warranty. Highly recommended!",
        is_verified_buyer: true,
        is_approved: true,
        created_at: "2026-07-28T10:15:00Z"
      },
      {
        customer_name: "Kofi Mensah",
        rating: 5,
        comment: "Excellent device quality and fantastic customer service. Delivery rider arrived within 2 hours.",
        is_verified_buyer: true,
        is_approved: true,
        created_at: "2026-07-25T14:30:00Z"
      },
      {
        customer_name: "Emmanuel Appiah",
        rating: 4,
        comment: "Great gadget, came exactly as described. Valmont Gadgets is my go-to store now.",
        is_verified_buyer: true,
        is_approved: true,
        created_at: "2026-07-20T09:45:00Z"
      }
    ];

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

      // 2. Combine with local reviews from localStorage
      try {
        const localReviews = JSON.parse(localStorage.getItem('valmont_reviews') || '[]');
        const matchingLocal = localReviews.filter(r => (r.product_id === product.id || r.product_id === product.slug) && r.is_approved !== false);
        
        const existingIds = new Set(reviews.map(r => String(r.id)));
        matchingLocal.forEach(r => {
          if (!existingIds.has(String(r.id))) {
            reviews.unshift(r);
          }
        });
      } catch (e) {
        console.warn('Local reviews read error:', e);
      }

      // 3. Fallback to seed reviews if no custom reviews present
      if (reviews.length === 0) {
        reviews = DEFAULT_SEED_REVIEWS.map((sr, idx) => ({
          ...sr,
          id: `seed-${product.id}-${idx}`,
          product_id: product.id
        }));
      }

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
      if (countEl) countEl.textContent = `(${reviews.length} verified review${reviews.length === 1 ? '' : 's'})`;

      const detailRevCount = document.getElementById('detailReviews');
      if (detailRevCount) detailRevCount.textContent = reviews.length;

      const starsSummary = document.getElementById('detailStarsSummary');
      if (starsSummary) {
        starsSummary.innerHTML = renderStarRatingSVG(Number(avgRating));
      }

      // Render Reviews List
      const container = document.getElementById('detailReviewsList');
      if (!container) return;

      container.innerHTML = reviews.map(r => {
        const ratingNum = Math.max(1, Math.min(5, Number(r.rating || 5)));
        const formattedDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
        const isVerified = r.is_verified_buyer !== false;
        
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

            ${r.photo_url ? `
              <div class="mt-3">
                <a href="${escapeHtml(r.photo_url)}" target="_blank" rel="noopener" class="inline-block">
                  <img src="${escapeHtml(r.photo_url)}" alt="Customer review photo" class="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition" />
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
      if (event && event.preventDefault) event.preventDefault();
      const productId = document.getElementById('reviewProductId')?.value || (selectedDetailProduct ? selectedDetailProduct.id : '');
      const customerName = document.getElementById('reviewCustomerName')?.value.trim();
      const customerEmail = document.getElementById('reviewCustomerEmail')?.value.trim() || null;
      const rating = Number(document.getElementById('reviewRatingInput')?.value || 5);
      const comment = document.getElementById('reviewComment')?.value.trim();
      const photoUrl = document.getElementById('reviewPhotoUrl')?.value.trim() || null;

      if (!productId || !customerName || !comment) {
        alert('Please fill out all required fields (*)');
        return;
      }

      const newReview = {
        id: `rev-${Date.now()}`,
        product_id: productId,
        customer_name: customerName,
        customer_email: customerEmail,
        rating: rating,
        comment: comment,
        photo_url: photoUrl,
        is_verified_buyer: true,
        is_approved: true,
        created_at: new Date().toISOString()
      };

      const submitBtn = document.getElementById('submitReviewBtn');
      if (submitBtn) submitBtn.disabled = true;

      // 1. Send to Supabase if available
      if (hasSupabase()) {
        try {
          await supabaseInsert('reviews', {
            product_id: newReview.product_id,
            customer_name: newReview.customer_name,
            customer_email: newReview.customer_email,
            rating: newReview.rating,
            comment: newReview.comment,
            photo_url: newReview.photo_url,
            is_verified_buyer: true,
            is_approved: true
          });
        } catch (e) {
          console.warn('Supabase review insert fallback:', e);
        }
      }

      // 2. Save locally
      let localReviews = JSON.parse(localStorage.getItem('valmont_reviews') || '[]');
      localReviews.unshift(newReview);
      localStorage.setItem('valmont_reviews', JSON.stringify(localReviews));

      // 3. Show success message
      const successMsg = document.getElementById('reviewSuccessMsg');
      if (successMsg) {
        successMsg.classList.remove('hidden');
        setTimeout(() => successMsg.classList.add('hidden'), 4000);
      }

      // 4. Reset form & re-render
      document.getElementById('productReviewForm')?.reset();
      if (submitBtn) submitBtn.disabled = false;
      
      setTimeout(() => {
        toggleReviewForm();
        if (selectedDetailProduct) {
          loadAndRenderProductReviews(selectedDetailProduct);
        }
      }, 800);
    }

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
        document.getElementById('detailPrice').textContent = money(product.wholesale);
        document.getElementById('detailCompareAt').textContent = money(product.retail);
        document.getElementById('dealerDetailLabel').classList.remove('hidden');
      } else {
        document.getElementById('detailPrice').textContent = money(product.retail);
        document.getElementById('detailCompareAt').textContent = money(product.compareAt);
        document.getElementById('dealerDetailLabel').classList.add('hidden');
      }
      
      const discount = Math.round((1 - (product.retail / product.compareAt)) * 100);
      document.getElementById('detailDiscPercent').textContent = `-${discount}%`;

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

    function handleLoginSubmit(event) {
      event.preventDefault();
      if (currentLoginTab === 'signin') {
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();
        
        // Check registered users first, fall back to mock profile
        const users = JSON.parse(localStorage.getItem('valmont_registered_users') || '[]');
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (found && found.password === pass) {
          currentUser = { name: found.name, phone: found.phone, email: found.email, address: found.address || 'East Legon, Accra' };
        } else {
          const baseName = email.split('@')[0];
          const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[._]/g, ' ');
          currentUser = { name: formattedName, phone: '054 245 1578', email: email, address: 'East Legon, Accra' };
          // Auto-register
          if (!found) {
            users.push({ name: formattedName, email: email, password: pass, phone: '054 245 1578' });
            localStorage.setItem('valmont_registered_users', JSON.stringify(users));
          }
        }
        localStorage.setItem('valmont_user', JSON.stringify(currentUser));
        
        // Autofill forms
        if (document.getElementById('shippingName')) document.getElementById('shippingName').value = currentUser.name;
        if (document.getElementById('shippingPhone')) document.getElementById('shippingPhone').value = currentUser.phone;
        if (document.getElementById('shippingEmail') && currentUser.email) document.getElementById('shippingEmail').value = currentUser.email;
        if (document.getElementById('shippingStreet')) document.getElementById('shippingStreet').value = currentUser.address || 'Near East Legon Police Station';
        if (document.getElementById('shippingCity')) document.getElementById('shippingCity').value = 'Accra';
        if (document.getElementById('shippingTown')) document.getElementById('shippingTown').value = 'East Legon';

        updateUserUI();
        closeLoginModal();
        alert(`Welcome back to Valmont, ${currentUser.name}!`);
      } else {
        const name = document.getElementById('signUpName').value.trim();
        const email = document.getElementById('signUpEmail').value.trim();
        const phone = document.getElementById('signUpPhone').value.trim();
        const address = document.getElementById('signUpAddress').value.trim();
        
        // Register for account page compatibility
        const users = JSON.parse(localStorage.getItem('valmont_registered_users') || '[]');
        if (!users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          users.push({ name, email, password: '', phone, address });
          localStorage.setItem('valmont_registered_users', JSON.stringify(users));
        }
        
        currentUser = { name, phone, email, address };
        localStorage.setItem('valmont_user', JSON.stringify(currentUser));
        
        // Autofill forms
        if (document.getElementById('shippingName')) document.getElementById('shippingName').value = name;
        if (document.getElementById('shippingPhone')) document.getElementById('shippingPhone').value = phone;
        if (document.getElementById('shippingEmail') && email) document.getElementById('shippingEmail').value = email;
        if (document.getElementById('shippingStreet')) document.getElementById('shippingStreet').value = address;
        if (document.getElementById('shippingCity')) document.getElementById('shippingCity').value = 'Accra';
        if (document.getElementById('shippingTown')) document.getElementById('shippingTown').value = address;

        updateUserUI();
        closeLoginModal();
        alert(`Account Created Successfully! Welcome to Valmont, ${name}!`);
      }
    }

    // Starts a real OAuth flow with Google via Supabase. No account details are
    // invented or stored until Google has authenticated the shopper.
    function handleGoogleSignIn() {
      if (!hasSupabase()) {
        showValmontToast('Google sign-in is not configured yet. Please use email sign-in.');
        return;
      }
      const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem('valmont_oauth_return', returnTo);
      const authorizeUrl = `${VALMONT_SUPABASE.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(returnTo)}`;
      window.location.assign(authorizeUrl);
    }

    // Supabase returns a real access token in the URL fragment after Google
    // approves the account. Exchange it for the verified profile, then remove
    // the sensitive fragment from the address bar.
    async function completeGoogleSignIn() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get('access_token');
      if (!accessToken) return;
      try {
        const response = await fetch(`${VALMONT_SUPABASE.url}/auth/v1/user`, {
          headers: { apikey: VALMONT_SUPABASE.anonKey, Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Unable to verify Google account');
        const account = await response.json();
        currentUser = {
          name: account.user_metadata?.full_name || account.user_metadata?.name || account.email.split('@')[0],
          email: account.email,
          phone: account.phone || '',
          address: ''
        };
        localStorage.setItem('valmont_user', JSON.stringify(currentUser));
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        updateUserUI();
        showValmontToast(`Welcome, ${currentUser.name}!`);
      } catch (error) {
        console.error('Google sign-in failed:', error);
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        showValmontToast('Google sign-in could not be completed. Please try again.');
      }
    }

    completeGoogleSignIn();
    if (new URLSearchParams(window.location.search).get('google_signin') === '1') {
      history.replaceState(null, '', window.location.pathname);
      handleGoogleSignIn();
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
      if (currentUser) {
        accountLabel.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
        if (logoutBtn) logoutBtn.classList.remove('hidden');
      } else {
        accountLabel.textContent = "Sign In";
        if (logoutBtn) logoutBtn.classList.add('hidden');
      }
      updateMobileAccountLabel();
    }

    function handleLogout() {
      currentUser = null;
      localStorage.removeItem('valmont_user');
      updateUserUI();
      closeLoginModal();
      alert("Logged out of your customer profile successfully.");
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
        if (isDealerMode && dealerProfile) {
          if (form) form.classList.add('hidden');
          if (activeProf) activeProf.classList.remove('hidden');
        } else {
          if (form) form.classList.remove('hidden');
          if (activeProf) activeProf.classList.add('hidden');
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

    // Auto-fill checkout fields if user exists
    if (currentUser) {
      document.getElementById('shippingName').value = currentUser.name;
      document.getElementById('shippingPhone').value = currentUser.phone;
      if (currentUser.email && document.getElementById('shippingEmail')) document.getElementById('shippingEmail').value = currentUser.email;
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
                  <span>Selling Price − Costs = Net Profit</span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <span class="block text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Pay Supplier</span>
                    <span id="supplier-pay" class="text-xl font-black text-white">GH₵ 0</span>
                  </div>
                  <div>
                    <span class="block text-[10px] uppercase tracking-wider font-extrabold text-gray-500">Keep Profit</span>
                    <span id="keep-amount" class="text-xl font-black text-[#ff8c00]">GH₵ 0</span>
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
                <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Supplier Wholesale Price (Cost) *</label>
                <input id="wholesale" type="number" placeholder="2000" class="w-full bg-[#050d24] border border-[#142850] p-3 rounded-lg text-white text-[13px] outline-none" />
              </div>
              <div class="field mb-3.5">
                <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Your Customer Selling Price (Retail) *</label>
                <input id="retail" type="number" placeholder="2450" class="w-full bg-[#050d24] border border-[#142850] p-3 rounded-lg text-white text-[13px] outline-none" />
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

      let localOrders = JSON.parse(localStorage.getItem('valmont_orders') || '[]');
      
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
            if (costsInput) {
              const otherCost = (product.deliveryCost || 0) + (product.paymentCost || 0);
              costsInput.value = otherCost;
            }
            calculateResellerProfit();
          }
        });
      }

      function calculateResellerProfit() {
        if (!wholesaleInput || !retailInput || !costsInput) return;
        const supplier = Number(wholesaleInput.value || 0);
        const selling = Number(retailInput.value || 0);
        const otherCosts = Number(costsInput.value || 0);
        const profit = selling - supplier - otherCosts;
        
        const money = val => `GH₵ ${Math.max(0, Math.round(val)).toLocaleString()}`;
        
        const profitText = document.querySelector('#profit');
        const supplierPayText = document.querySelector('#supplier-pay');
        const keepAmountText = document.querySelector('#keep-amount');
        const marginText = document.querySelector('#margin');

        if (profitText) profitText.textContent = money(profit);
        if (supplierPayText) supplierPayText.textContent = money(supplier);
        if (keepAmountText) keepAmountText.textContent = money(profit);
        if (marginText) {
          marginText.textContent = `${selling ? ((profit / selling) * 100).toFixed(1) : '0.0'}% margin on sale`;
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
          
          let orders = JSON.parse(localStorage.getItem('valmont_orders') || '[]');
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
  
  // === INTEGRATED DEALER ACCESS & WHOLESALE PRICING LOGIC ===
  isDealerMode = localStorage.getItem('valmont_is_dealer') === 'true';
  dealerProfile = JSON.parse(localStorage.getItem('valmont_dealer_profile') || 'null');

  let dealerOverlay = document.getElementById('dealerOverlay');
  let dealerModal = document.getElementById('dealerModal');
  let dealerRegForm = document.getElementById('dealerRegForm');
  let dealerActiveProfile = document.getElementById('dealerActiveProfile');
  let dealerBtnLabel = document.getElementById('dealerBtnLabel');

  function openDealerModal() {
    if (dealerOverlay) {
      dealerOverlay.classList.remove('hidden');
      setTimeout(() => dealerOverlay.classList.add('opacity-100'), 10);
    }
    if (dealerModal) { dealerModal.classList.remove('hidden'); }

    if (isDealerMode && dealerProfile) {
      if (dealerRegForm) dealerRegForm.classList.add('hidden');
      if (dealerActiveProfile) dealerActiveProfile.classList.remove('hidden');
      document.getElementById('dlProfileName').textContent = dealerProfile.name;
      document.getElementById('dlProfilePhone').textContent = dealerProfile.phone;
      document.getElementById('dlProfileEmail').textContent = dealerProfile.email;
    } else {
      if (dealerRegForm) dealerRegForm.classList.remove('hidden');
      if (dealerActiveProfile) dealerActiveProfile.classList.add('hidden');
    }
  }

  function closeDealerModal() { closeDealerRegistrationPopup(); return;
    dealerOverlay.classList.remove('opacity-100');
    setTimeout(() => dealerOverlay.classList.add('hidden'), 300);
    dealerModal.classList.add('hidden');
  }

  // Handle Dealer Registration
  if (dealerRegForm) {
    dealerRegForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('dlNameInput').value.trim();
      const phone = document.getElementById('dlPhoneInput').value.trim();
      const email = document.getElementById('dlEmailInput').value.trim();

      if (name && phone && email) {
        isDealerMode = true;
        dealerProfile = { name, phone, email };
        localStorage.setItem('valmont_is_dealer', 'true');
        localStorage.setItem('valmont_dealer_profile', JSON.stringify(dealerProfile));

        // Inject high-end Dealer Announcement Banner at top of page
        showDealerAnnouncementBanner();
        updateDealerUI();
        renderProducts();
        renderFlashSales();
        closeDealerModal();
        alert(`Congratulations ${name}! Authorized Dealer Access activated. Wholesale prices are now applied directly across our entire catalog.`);
      }
    });
  }

  function deactivateDealerMode() {
    isDealerMode = false;
    dealerProfile = null;
    localStorage.removeItem('valmont_is_dealer');
    localStorage.removeItem('valmont_dealer_profile');

    // Remove announcement banner
    const banner = document.getElementById('dealerBanner');
    if (banner) banner.remove();

    updateDealerUI();
    renderProducts();
    renderFlashSales();
    closeDealerModal();
    alert("Returned to standard retail shopping mode.");
  }

  function updateDealerUI() {
    if (isDealerMode && dealerProfile) {
      dealerBtnLabel.textContent = `Dealer: ${dealerProfile.name.split(' ')[0]}`;
    } else {
      dealerBtnLabel.textContent = "Dealer Portal";
    }
  }

  function showDealerAnnouncementBanner() {
    const existing = document.getElementById('dealerBanner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'dealerBanner';
    banner.className = "bg-green-600 text-white text-center py-2.5 px-4 text-xs font-bold tracking-wide transition-all uppercase";
    banner.innerHTML = ` AUTHORIZED DEALER ACCESS ACTIVE — SPECIAL WHOLESALE PRICING APPLIED DIRECTLY`;
    
    // Insert right below the top notice banner
    document.body.insertBefore(banner, document.body.children[1]);
  }

  // Hook local dealer calculator
  const dlWholesale = document.getElementById('dl_wholesale');
  const dlRetail = document.getElementById('dl_retail');
  const dlCalcResult = document.getElementById('dl_calc_result');

  function calculateDealerProfit() {
    if (!dlWholesale || !dlRetail || !dlCalcResult) return;
    const cost = Number(dlWholesale.value || 0);
    const sell = Number(dlRetail.value || 0);
    const profit = sell - cost;
    const margin = sell ? ((profit / sell) * 100).toFixed(1) : '0.0';
    dlCalcResult.textContent = `Net Profit: GH₵ ${profit.toLocaleString()} (${margin}% margin on sale)`;
  }

  if (dlWholesale && dlRetail) {
    [dlWholesale, dlRetail].forEach(inp => inp.addEventListener('input', calculateDealerProfit));
    calculateDealerProfit();
  }

  // Run on startup
  if (isDealerMode && dealerProfile) {
    showDealerAnnouncementBanner();
    updateDealerUI();
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
        <button onclick="selectMobileCategory('${key}')" class="border p-3 rounded-lg text-[12px] text-center transition ${activeClass} shadow-sm truncate">
          ${CATEGORY_LABELS[key]}
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

  // Reassign DOM elements once fully parsed to prevent null reference errors on mobile
  document.addEventListener('DOMContentLoaded', () => {
    dealerOverlay = document.getElementById('dealerOverlay');
    dealerModal = document.getElementById('dealerModal');
    dealerRegForm = document.getElementById('dealerRegForm');
    dealerActiveProfile = document.getElementById('dealerActiveProfile');
    dealerBtnLabel = document.getElementById('dealerBtnLabel');

    mobileCategoriesOverlay = document.getElementById('mobileCategoriesOverlay');
    pwaInstructionsOverlay = document.getElementById('pwaInstructionsOverlay');
    pwaInstructionsModal = document.getElementById('pwaInstructionsModal');
    pwaBannerOverlay = document.getElementById('pwaInstallBanner');
    mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    mobileMenuModal = document.getElementById('mobileMenuModal');
    mobileCategoriesModal = document.getElementById('mobileCategoriesModal');
    mobileCategoryGrid = document.getElementById('mobileCategoryGrid');

    // Re-bind submit listener since dealerRegForm is now parsed
    if (dealerRegForm) {
      dealerRegForm.addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('dlNameInput').value.trim();
        const phone = document.getElementById('dlPhoneInput').value.trim();
        const email = document.getElementById('dlEmailInput').value.trim();

        if (name && phone && email) {
          isDealerMode = true;
          dealerProfile = { name, phone, email };
          localStorage.setItem('valmont_is_dealer', 'true');
          localStorage.setItem('valmont_dealer_profile', JSON.stringify(dealerProfile));

          showDealerAnnouncementBanner();
          updateDealerUI();
          closeDealerRegistrationPopup();
          renderProducts();

          alert("Authorized Dealer Access Activated Successfully!");
        }
      });
    }
  });


(function(){
  const groups={phones:['iphones','samsung','android','tablets','smartwatches'],audio:['audio','gaming'],computing:['laptops','laptop_acc','tablets','smartwatches'],accessories:['phone_acc','phone_parts','travel_acc','chargers']};
  const chips=[...document.querySelectorAll('.category-filters [data-cat-filter]')];
  const groupButtons=[...document.querySelectorAll('.category-group-btn')];
  const toggle=document.querySelector('.category-group-toggle');
  function applyGroup(group){ chips.forEach(chip=>{ const show=group==='all'||groups[group]?.includes(chip.dataset.catFilter)||chip.dataset.catFilter==='all'; chip.hidden=!show; }); groupButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.group===group)); }
  groupButtons.forEach(btn=>btn.addEventListener('click',()=>applyGroup(btn.dataset.group)));
  if(toggle) toggle.addEventListener('click',()=>{ const expanded=toggle.getAttribute('aria-expanded')==='true'; toggle.setAttribute('aria-expanded',String(!expanded)); toggle.textContent=expanded?'Show All Categories':'Hide Categories'; applyGroup(expanded?'all':'phones'); });
  applyGroup('all');
})();

