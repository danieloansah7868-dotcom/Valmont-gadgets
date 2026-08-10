"use client";
import { useState, useMemo, useEffect } from "react";

// PRIVATE WHOLESALE PROFIT FORMULA ARCHITECTURE
// Only retail prices are rendered publicly.
// Profit = retail - wholesale - delivery/payment costs
// Wholesale ledger stays private in backend calculation, never in UI.

type ThemeId = "light" | "navy" | "gold";

type CategoryId = "all" | "iphones" | "samsung" | "laptops" | "audio" | "chargers";

type Product = {
  id: string;
  name: string;
  category: CategoryId;
  retail: number;
  compareAt: number;
  badge: "HOT" | "SEALED" | "DEAL";
  specs: string;
  stock: string;
  image: string;
  wholesale: number; // private, never render
  deliveryCost: number;
  paymentCost: number;
};

type CartItem = { id: string; qty: number };

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "iphones", label: "iPhones & Apple" },
  { id: "samsung", label: "Samsung Galaxy" },
  { id: "laptops", label: "Executive Laptops" },
  { id: "audio", label: "Smart Audio & AirPods" },
  { id: "chargers", label: "Chargers & Power Banks" },
];

/** Official Valmont Group social & support channels */
const SOCIAL_LINKS = {
  whatsappChannel: "https://whatsapp.com/channel/0029Vb9DIKG8V0terg2V4K2Y",
  tiktok: "https://www.tiktok.com/@valmont.group?_r=1&_t=ZS-98lPDWz9Okx",
  facebook: "https://www.facebook.com/share/1TA1PNVaCP/?mibextid=wwXIfr",
  whatsappSupport: "https://wa.me/233542451578",
  supportEmail: "support@valmontdata.com",
} as const;

const PRODUCTS: Product[] = [
  {
    id: "VG-IP15PM-256",
    name: "iPhone 15 Pro Max 256GB — Dual SIM",
    category: "iphones",
    retail: 16500,
    compareAt: 18000,
    badge: "HOT",
    specs: "Titanium • A17 Pro • Sealed • eSIM + Physical SIM",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop",
    wholesale: 13900,
    deliveryCost: 120,
    paymentCost: 280,
  },
  {
    id: "VG-IP15P-128",
    name: "iPhone 15 Pro 128GB — Natural Titanium",
    category: "iphones",
    retail: 14800,
    compareAt: 16200,
    badge: "SEALED",
    specs: "A17 Pro • 6.1-inch Super Retina • 12m Warranty",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop",
    wholesale: 12450,
    deliveryCost: 120,
    paymentCost: 251,
  },
  {
    id: "VG-IP14PM-256",
    name: "iPhone 14 Pro Max 256GB — Deep Purple",
    category: "iphones",
    retail: 13500,
    compareAt: 15000,
    badge: "DEAL",
    specs: "A16 Bionic • Dynamic Island • Physical Dual SIM",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1678911820864-e2c567c655d7?q=80&w=800&auto=format&fit=crop",
    wholesale: 11400,
    deliveryCost: 120,
    paymentCost: 229,
  },
  {
    id: "VG-IP13-128",
    name: "iPhone 13 128GB — Midnight",
    category: "iphones",
    retail: 6800,
    compareAt: 7500,
    badge: "HOT",
    specs: "A15 Bionic • 6.1-inch • Sealed US Variant",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop",
    wholesale: 5650,
    deliveryCost: 100,
    paymentCost: 115,
  },
  {
    id: "VG-IP15-128",
    name: "iPhone 15 128GB — Blue Dual SIM",
    category: "iphones",
    retail: 9900,
    compareAt: 11000,
    badge: "SEALED",
    specs: "A16 • USB-C • Pink / Blue / Black • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop",
    wholesale: 8300,
    deliveryCost: 110,
    paymentCost: 168,
  },
  {
    id: "VG-SS24U-512",
    name: "Samsung Galaxy S24 Ultra 512GB",
    category: "samsung",
    retail: 15200,
    compareAt: 16800,
    badge: "HOT",
    specs: "Titanium Black • S Pen • 200MP • Snapdragon 8 Gen 3",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
    wholesale: 12800,
    deliveryCost: 120,
    paymentCost: 258,
  },
  {
    id: "VG-SS23U-256",
    name: "Samsung Galaxy S23 Ultra 256GB",
    category: "samsung",
    retail: 11500,
    compareAt: 13000,
    badge: "DEAL",
    specs: "Phantom Black • 12GB RAM • 5000mAh • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?q=80&w=800&auto=format&fit=crop",
    wholesale: 9600,
    deliveryCost: 110,
    paymentCost: 195,
  },
  {
    id: "VG-SS24-256",
    name: "Samsung Galaxy S24 256GB — Marble Gray",
    category: "samsung",
    retail: 8900,
    compareAt: 9800,
    badge: "SEALED",
    specs: "8GB RAM • Exynos 2400 • Galaxy AI • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=800&auto=format&fit=crop",
    wholesale: 7450,
    deliveryCost: 100,
    paymentCost: 151,
  },
  {
    id: "VG-SSA55-256",
    name: "Samsung Galaxy A55 256GB — Awesome Navy",
    category: "samsung",
    retail: 4200,
    compareAt: 4800,
    badge: "DEAL",
    specs: "8GB RAM • 120Hz AMOLED • IP67 • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop",
    wholesale: 3480,
    deliveryCost: 80,
    paymentCost: 71,
  },
  {
    id: "VG-SSFOLD5-512",
    name: "Samsung Galaxy Z Fold 5 512GB",
    category: "samsung",
    retail: 18500,
    compareAt: 20500,
    badge: "HOT",
    specs: "Phantom Black • 12GB RAM • Foldable • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1662948402327-e5ef1ac44e93?q=80&w=800&auto=format&fit=crop",
    wholesale: 15600,
    deliveryCost: 150,
    paymentCost: 314,
  },
  {
    id: "VG-MBP-M3-16-512",
    name: "MacBook Pro M3 16GB/512GB — Space Black",
    category: "laptops",
    retail: 22500,
    compareAt: 24500,
    badge: "SEALED",
    specs: "14-inch Liquid Retina XDR • M3 Chip • 22H Battery",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    wholesale: 19200,
    deliveryCost: 200,
    paymentCost: 382,
  },
  {
    id: "VG-MBP-M3P-18-512",
    name: "MacBook Pro M3 Pro 18GB/512GB — Space Black",
    category: "laptops",
    retail: 28900,
    compareAt: 31000,
    badge: "HOT",
    specs: "14-inch • M3 Pro 11-Core • Sealed Apple Warranty",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop",
    wholesale: 24900,
    deliveryCost: 200,
    paymentCost: 491,
  },
  {
    id: "VG-MBA-M2-13-256",
    name: "MacBook Air M2 13-inch 8GB/256GB — Midnight",
    category: "laptops",
    retail: 12800,
    compareAt: 14000,
    badge: "DEAL",
    specs: "M2 Chip • 13.6-inch • 8GB/256GB • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
    wholesale: 10850,
    deliveryCost: 180,
    paymentCost: 217,
  },
  {
    id: "VG-MBA-M2-15-512",
    name: "MacBook Air M2 15-inch 8GB/512GB — Starlight",
    category: "laptops",
    retail: 16900,
    compareAt: 18200,
    badge: "SEALED",
    specs: "15.3-inch Liquid Retina • M2 • Sealed Apple",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop",
    wholesale: 14450,
    deliveryCost: 180,
    paymentCost: 287,
  },
  {
    id: "VG-HP-SPECTRE-16-1T",
    name: "HP Spectre x360 13.5-inch i7 16GB/1TB",
    category: "laptops",
    retail: 14500,
    compareAt: 16000,
    badge: "DEAL",
    specs: "OLED Touch • Intel i7-1355U • Convertible • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1583223667854-e0e05b1ad2ad?q=80&w=800&auto=format&fit=crop",
    wholesale: 12200,
    deliveryCost: 180,
    paymentCost: 246,
  },
  {
    id: "VG-DELL-XPS13P",
    name: "Dell XPS 13 Plus i7 16GB/512GB — Platinum",
    category: "laptops",
    retail: 13200,
    compareAt: 14800,
    badge: "SEALED",
    specs: "13.4-inch OLED • i7-1360P • InfinityEdge • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
    wholesale: 11100,
    deliveryCost: 180,
    paymentCost: 224,
  },
  {
    id: "VG-IPAD-PRO11-M4-256",
    name: "iPad Pro 11-inch M4 256GB — WiFi",
    category: "iphones",
    retail: 12500,
    compareAt: 13800,
    badge: "HOT",
    specs: "Ultra Retina XDR • M4 Chip • Space Black • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop",
    wholesale: 10600,
    deliveryCost: 100,
    paymentCost: 212,
  },
  {
    id: "VG-IPAD-AIR-M2-128",
    name: "iPad Air M2 11-inch 128GB — Blue",
    category: "iphones",
    retail: 6900,
    compareAt: 7600,
    badge: "SEALED",
    specs: "M2 Chip • Liquid Retina • Touch ID • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop",
    wholesale: 5780,
    deliveryCost: 90,
    paymentCost: 117,
  },
  {
    id: "VG-AIRPODS-PRO2-USBC",
    name: "AirPods Pro 2nd Gen USB-C",
    category: "audio",
    retail: 3200,
    compareAt: 3800,
    badge: "HOT",
    specs: "MagSafe • Adaptive Audio • H2 Chip • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=800&auto=format&fit=crop",
    wholesale: 2550,
    deliveryCost: 40,
    paymentCost: 54,
  },
  {
    id: "VG-AIRPODS-MAX-SG",
    name: "AirPods Max — Space Gray",
    category: "audio",
    retail: 6500,
    compareAt: 7200,
    badge: "SEALED",
    specs: "High-Fidelity • Active Noise Cancellation • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop",
    wholesale: 5450,
    deliveryCost: 60,
    paymentCost: 110,
  },
  {
    id: "VG-SONY-XM5-BLK",
    name: "Sony WH-1000XM5 Wireless Headset — Black",
    category: "audio",
    retail: 4100,
    compareAt: 4600,
    badge: "DEAL",
    specs: "Industry Leading ANC • 30H Battery • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop",
    wholesale: 3380,
    deliveryCost: 50,
    paymentCost: 69,
  },
  {
    id: "VG-JBL-CHARGE5-BLK",
    name: "JBL Charge 5 Bluetooth Speaker — Black",
    category: "audio",
    retail: 1650,
    compareAt: 1950,
    badge: "HOT",
    specs: "IP67 Waterproof • 20H Play • PartyBoost • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e11?q=80&w=800&auto=format&fit=crop",
    wholesale: 1280,
    deliveryCost: 50,
    paymentCost: 28,
  },
  {
    id: "VG-ANKER-PB-20K-65W",
    name: "Anker 20,000mAh 65W Power Bank — PowerCore",
    category: "chargers",
    retail: 1250,
    compareAt: 1500,
    badge: "SEALED",
    specs: "65W Fast Charge • PowerCore 24K • LED Display • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop",
    wholesale: 960,
    deliveryCost: 40,
    paymentCost: 21,
  },
  {
    id: "VG-APPLE-67W-CABLE",
    name: "Apple 67W USB-C Power Adapter + 2M Cable",
    category: "chargers",
    retail: 850,
    compareAt: 1050,
    badge: "DEAL",
    specs: "Genuine Apple • Fast Charge MacBook Air • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop",
    wholesale: 630,
    deliveryCost: 30,
    paymentCost: 14,
  },
  {
    id: "VG-SS-45W-BLK",
    name: "Samsung 45W Super Fast Charger — Black",
    category: "chargers",
    retail: 450,
    compareAt: 600,
    badge: "SEALED",
    specs: "Super Fast Charging 2.0 • USB-C • Sealed Original",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop",
    wholesale: 310,
    deliveryCost: 20,
    paymentCost: 7,
  },
  {
    id: "VG-ANKER-735-65W",
    name: "Anker 735 65W GaN Charger — 3 Port",
    category: "chargers",
    retail: 750,
    compareAt: 950,
    badge: "HOT",
    specs: "GaNPrime • 2x USB-C + USB-A • Foldable • Sealed",
    stock: "In stock • Sealed • 12m Warranty",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop",
    wholesale: 540,
    deliveryCost: 20,
    paymentCost: 12,
  },
];

function formatGH(amount: number) {
  return `GH₵ ${amount.toLocaleString("en-GH")}`;
}

function getPrivateProfit(p: Product) {
  // Private backend logic: Profit = retail - wholesale - delivery/payment costs
  return p.retail - p.wholesale - p.deliveryCost - p.paymentCost;
}

function getVariants(product: Product) {
  const source = `${product.name} ${product.specs}`.toLowerCase();
  const colorMap: [string, string][] = [["black", "#111827"], ["midnight", "#1f2937"], ["titanium", "#94a3b8"], ["blue", "#2563eb"], ["purple", "#7e22ce"], ["pink", "#ec4899"], ["white", "#f8fafc"], ["silver", "#cbd5e1"], ["green", "#16a34a"], ["gold", "#d4a72c"], ["navy", "#172554"]];
  const colors = colorMap.filter(([name]) => source.includes(name)).map(([, value]) => value).slice(0, 3);
  const sizes = [...new Set((`${product.name} ${product.specs}`.match(/\b(?:\d+(?:\.\d+)?(?:GB|TB)|\d+GB RAM)\b/gi) || []).map((value) => value.toUpperCase()))].slice(0, 3);
  return { colors: colors.length ? colors : ["#111827", "#94a3b8", "#f8fafc"], sizes };
}

export default function Page() {
  const [activeCat, setActiveCat] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [theme, setTheme] = useState<ThemeId>("light");
  const [deliveryMessage, setDeliveryMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("valmont_theme");
    const initial: ThemeId = saved === "navy" || saved === "gold" ? saved : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const applyTheme = (nextTheme: ThemeId) => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("valmont_theme", nextTheme);
  };

  // Theme-specific corporate surface classes.
  const headerBg = theme === "navy" ? "bg-[#0b1a38] border-[#1e345e]" : theme === "gold" ? "bg-white border-[#ff8c00] border-b-2" : "bg-white border-gray-200";
  const cardBg = theme === "navy" ? "bg-[#132144] border-[#1e345e] text-white" : theme === "gold" ? "bg-white border-amber-200 hover:border-[#ff8c00] hover:shadow-[0_12px_28px_rgba(255,140,0,.16)]" : "bg-white border-gray-200";
  const searchBg = theme === "navy" ? "bg-[#122040] border-[#1e345e]" : "bg-white border-gray-300";
  const pillInactive = theme === "navy" ? "bg-[#132144] text-[#8aa0c8] border-[#1e345e]" : theme === "gold" ? "bg-[#fffef7] text-[#0b1a38] border-amber-200" : "bg-white text-[#0b1a38] border-gray-300";
  const pageBg = theme === "navy" ? "bg-[#070e20] text-white" : theme === "gold" ? "bg-[#fffaf0] text-[#0b1a38]" : "bg-[#f6f7f9] text-[#0b1a38]";
  const mutedText = theme === "navy" ? "text-[#8aa0c8]" : "text-gray-500";

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const catMatch = activeCat === "all" || p.category === activeCat;
      const q = query.trim().toLowerCase();
      const searchMatch = !q || p.name.toLowerCase().includes(q) || p.specs.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [activeCat, query]);

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => {
    const prod = PRODUCTS.find((p) => p.id === c.id);
    return s + (prod ? prod.retail * c.qty : 0);
  }, 0);

  const addToCart = (id: string) => {
    setCart((prev) => {
      const ex = prev.find((p) => p.id === id);
      if (ex) return prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id, qty: 1 }];
    });
  };

  const addExpressDelivery = (product: Product) => {
    const estimatedFee = Math.ceil(product.deliveryCost * 1.3);
    setDeliveryMessage(`Valmont Express Delivery selected for ${product.name}. Estimated delivery fee: ${formatGH(estimatedFee)}.`);
  };

  const buildWALink = (name: string, retail: number) => {
    const text = encodeURIComponent(`Hello Valmont Gadgets, I want to order the ${name} (${formatGH(retail)}). Please confirm stock and express Accra delivery!`);
    return `https://wa.me/233542451578?text=${text}`;
  };

  // Secure Valmont-Pay tenant flow: the server (/api/valmontpay/initialize)
  // recomputes every price from the database and signs the checkout with the
  // tenant secret key. Client-side amounts are never sent to the gateway.
  const [paying, setPaying] = useState(false);
  const checkoutWithValmontPay = async () => {
    if (!cart.length || paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/valmontpay/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ id: item.id, qty: item.qty })),
          customer: { email: "sales@valmontgadgets.com" },
          payment_method: "Valmont-Pay",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || data.status !== true || !data.url) {
        throw new Error((data && data.message) || `Payment gateway error (${res.status})`);
      }
      window.location.href = data.url;
    } catch (err) {
      setDeliveryMessage(`Could not open Valmont-Pay: ${err instanceof Error ? err.message : "please try again."}`);
      setPaying(false);
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} antialiased`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{font-family:'Inter',sans-serif;} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} .scrollbar-hide::-webkit-scrollbar{display:none} .theme-btn.is-active{background:#0b1a38;color:#fff} @keyframes vg-wa-dot-pulse{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.55)}70%{transform:scale(1.07);box-shadow:0 0 0 8px rgba(239,68,68,0)}100%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,0)}}`}</style>

      <div className="bg-[#0b1a38] text-white text-center py-2.5 px-4">
        <p className="text-[10px] md:text-[11px] font-extrabold tracking-[0.14em] uppercase leading-relaxed">
          GENUINE PHONES & LAPTOPS WITH 12-MONTH WARRANTY • FREE DELIVERY IN ACCRA ABOVE GH₵ 5,000
        </p>
      </div>

      <header className={`sticky top-0 z-40 border-b ${headerBg}`}>
        <div className="max-w-[1280px] mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`font-black text-[15px] md:text-[18px] tracking-tight truncate ${theme === "navy" ? "text-white" : "text-[#0b1a38]"}`}>VALMONT GADGETS <span className={`font-medium hidden md:inline ${mutedText}`}>— Phones · Laptops · Smart Audio · Accessories</span></h1>
            <p className={`md:hidden text-[10px] font-semibold tracking-wide uppercase mt-0.5 ${mutedText}`}>Phones · Laptops · Smart Audio · Accessories</p>
          </div>
          <div className={`hidden md:flex items-center rounded-full border p-1 ${theme === "navy" ? "bg-[#122040] border-[#1e345e]" : theme === "gold" ? "bg-[#fff7e6] border-amber-200" : "bg-gray-100 border-gray-300"}`} role="group" aria-label="Theme selection">
            <span className={`px-2 text-[9px] font-black tracking-widest uppercase ${mutedText}`}>Theme</span>
            {(["light", "navy", "gold"] as ThemeId[]).map((choice) => <button key={choice} data-theme={choice} onClick={() => applyTheme(choice)} aria-pressed={theme === choice} className={`theme-btn px-2 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${theme === choice ? "is-active" : ""}`}>{choice}</button>)}
          </div>
          <button onClick={() => setDrawerOpen(true)} className="bg-[#ff8c00] hover:bg-[#e67e00] text-white font-extrabold text-[12px] tracking-wide px-5 py-2.5 rounded-full shadow-sm transition">Cart ({totalQty})</button>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 pb-3.5">
          <div className="md:hidden flex justify-center mb-3"><div className={`flex items-center rounded-full border p-1 ${theme === "navy" ? "bg-[#122040] border-[#1e345e]" : theme === "gold" ? "bg-[#fff7e6] border-amber-200" : "bg-gray-100 border-gray-300"}`} role="group" aria-label="Theme selection"><span className={`px-2 text-[9px] font-black tracking-widest uppercase ${mutedText}`}>Theme</span>{(["light", "navy", "gold"] as ThemeId[]).map((choice) => <button key={choice} data-theme={choice} onClick={() => applyTheme(choice)} aria-pressed={theme === choice} className={`theme-btn px-2 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${theme === choice ? "is-active" : ""}`}>{choice}</button>)}</div></div>
          <div className={`flex w-full rounded-xl overflow-hidden border focus-within:border-[#0b1a38] ${searchBg}`}>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setQuery(searchInput)} placeholder="Search iPhones, MacBooks, Samsung Galaxy, audio..." className={`flex-1 px-4 py-3 text-[14px] font-medium placeholder:text-gray-400 outline-none ${theme === "navy" ? "bg-[#122040] text-white" : "bg-white"}`} />
            <button onClick={() => setQuery(searchInput)} className="bg-[#0b1a38] hover:bg-black text-white font-extrabold text-[13px] tracking-widest px-7 md:px-8 py-3 transition">GO</button>
          </div>
        </div>
      </header>

      <div className={`border-b ${theme === "navy" ? "bg-[#0e1a33] border-[#1e345e]" : "bg-white border-gray-200"}`}>
        <div className="max-w-[1280px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center md:justify-between gap-2 text-center">
          <p className="text-[11px] md:text-[12px] font-bold tracking-wide uppercase">Call to Order: 054 245 1578 · Pay with MoMo & Card · Swap Deals Accepted</p>
          <p className={`hidden md:block text-[10px] font-semibold tracking-wide uppercase ${mutedText}`}>Accra Showroom • East Legon • Open Mon-Sat 9AM-7PM</p>
        </div>
      </div>

      <div className="bg-[#fff7e6] border-b border-amber-200">
        <div className="max-w-[1280px] mx-auto px-4 py-2.5 text-center">
          <p className="text-[11px] md:text-[12px] font-extrabold tracking-[0.14em] uppercase text-[#ff8c00]">EXECUTIVE MIDWEEK DEALS — WHILE STOCKS LAST • 100% Sealed & Verified</p>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === cat.id).length;
              const active = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase border transition ${active ? (theme === "gold" ? "bg-[#ff8c00] text-white border-[#ff8c00] shadow" : "bg-[#0b1a38] text-white border-[#0b1a38] shadow") : `${pillInactive} hover:border-[#0b1a38]`}`}>
                  {cat.label} {cat.id === "all" ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <p className={`text-[11px] font-bold tracking-wide uppercase ${mutedText}`}>{filtered.length} VERIFIED PRODUCTS {activeCat !== "all" ? `IN ${CATEGORIES.find((c) => c.id === activeCat)?.label.toUpperCase()}` : ""} {query ? `FOR "${query.toUpperCase()}"` : ""}</p>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400"><span>Verified Stock</span><span className="w-2 h-2 bg-[#ff8c00] rounded-full inline-block"></span></div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const badgeColor = product.badge === "HOT" ? "bg-[#ff8c00]" : product.badge === "DEAL" ? "bg-[#ff8c00]" : "bg-[#0b1a38]";
            return (
              <div key={product.id} className={`rounded-xl border p-3 flex flex-col hover:shadow-md transition-shadow ${cardBg}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded ${badgeColor} text-white`}>{product.badge}</span>
                  <span className="text-[9px] font-semibold text-gray-400 tracking-wide">{product.id}</span>
                </div>
                <div className={`rounded-lg aspect-square flex items-center justify-center mb-3 p-3 border overflow-hidden ${theme === "navy" ? "bg-[#0e1a33] border-[#1e345e]" : "bg-[#fcfcfd] border-gray-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} loading="lazy" className="object-contain w-full h-full max-h-[160px] mix-blend-multiply" />
                </div>
                <h3 className={`font-extrabold text-[12.5px] leading-[1.25] mb-1 line-clamp-2 min-h-[32px] ${theme === "navy" ? "text-white" : "text-[#0b1a38]"}`}>{product.name}</h3>
                <p className={`text-[10.5px] mb-2 leading-[1.3] font-medium line-clamp-2 min-h-[28px] ${theme === "navy" ? "text-[#8aa0c8]" : "text-gray-500"}`}>{product.specs}</p>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-black text-[15px] tracking-tight ${theme === "navy" ? "text-white" : "text-[#0b1a38]"}`}>{formatGH(product.retail)}</span>
                    <span className="text-[11px] text-gray-400 line-through font-medium">{formatGH(product.compareAt)}</span>
                  </div>
                  {(() => { const variants = getVariants(product); return <div className="mb-2 space-y-1"><div className="flex items-center gap-1"><span className="text-[9px] font-bold text-gray-500">Colours:</span>{variants.colors.map((color) => <span key={color} className="h-2.5 w-2.5 rounded-full border border-gray-300" style={{ backgroundColor: color }} />)}</div>{variants.sizes.length > 0 && <div className="flex items-center gap-1 flex-wrap"><span className="text-[9px] font-bold text-gray-500">Size:</span>{variants.sizes.map((size) => <span key={size} className="rounded border border-gray-200 px-1.5 py-0.5 text-[8px] font-bold text-gray-600">{size}</span>)}</div>}</div>; })()}
                  <p className="text-[10px] font-bold text-[#ff8c00] mb-3 tracking-wide uppercase">{product.stock}</p>
                  <div className="flex gap-2">
                    <button onClick={() => addToCart(product.id)} className="bg-[#0b1a38] hover:bg-black text-white font-extrabold text-[11px] tracking-wide rounded-lg px-3 py-2.5 w-2/3 transition uppercase">Add to Cart</button>
                    <button onClick={() => addExpressDelivery(product)} className="bg-[#ff8c00] hover:bg-[#e67e00] text-white font-extrabold text-[10px] tracking-wide rounded-lg px-2 py-2.5 w-1/3 text-center transition uppercase">Express</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">12-Month Warranty</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Every device sealed, verified IMEI, with official Valmont warranty card and receipt.</p></div>
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">Express Accra Delivery</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Same-day delivery in Accra. Secure payment before dispatch. Inter-regional dispatch within 24 hours.</p></div>
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">Swap & Trade-In</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Trade your old phone or laptop for instant value. MoMo, Bank Transfer, and Card accepted.</p></div>
        </div>
      </main>

      {/* COMMUNITY BANNER + FOOTER — official Valmont Group social channels */}
      <footer className="bg-[#0b1a38] text-white border-t-4 border-[#ff8c00]">
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <a href={SOCIAL_LINKS.whatsappChannel} target="_blank" rel="noopener" aria-label="Join the official Valmont Group WhatsApp Channel" className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-white/15 bg-gradient-to-r from-[#0d4f45] via-[#128C7E] to-[#25D366] px-4 py-3.5 shadow-[0_10px_24px_rgba(18,140,126,.3)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(18,140,126,.42)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-6 w-6 fill-white" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 89.4-184.5 184.6-184.5 46 0 89.3 18 121.9 50.6 32.6 32.5 50.5 75.9 50.5 122.1-.1 101.8-94.9 184.5-184.6 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-extrabold tracking-tight">Join our WhatsApp Channel for Updates</span>
              <span className="text-[11.5px] font-medium text-white/90">Flash drops, restock alerts &amp; exclusive Valmont Group deals — straight to your WhatsApp.</span>
            </span>
            <span className="rounded-full bg-white px-3.5 py-2 text-[10.5px] font-black uppercase tracking-[0.12em] text-[#0b1a38]">Follow Channel&nbsp;&#8594;</span>
          </a>

          <div className="mt-8 grid grid-cols-1 gap-7 border-b border-white/10 pb-7 md:grid-cols-3">
            <div>
              <p className="text-[15px] font-black uppercase tracking-[0.14em] text-[#ff8c00]">Valmont Gadgets</p>
              <p className="mt-2.5 text-[12px] font-medium leading-relaxed text-gray-300">Ghana&#8217;s trusted marketplace for certified smartphones, executive laptops, premium audio &amp; genuine accessories.</p>
              <p className="mt-4 mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Follow Valmont Group</p>
              <div className="flex items-center gap-2.5">
                <a href={SOCIAL_LINKS.whatsappChannel} target="_blank" rel="noopener" aria-label="Valmont Group WhatsApp Channel" title="WhatsApp Channel" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:-translate-y-0.5 hover:border-[#25D366] hover:bg-[#25D366]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-[19px] w-[19px] fill-current" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 89.4-184.5 184.6-184.5 46 0 89.3 18 121.9 50.6 32.6 32.5 50.5 75.9 50.5 122.1-.1 101.8-94.9 184.5-184.6 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                </a>
                <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener" aria-label="Valmont Group on Facebook" title="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:-translate-y-0.5 hover:border-[#1877F2] hover:bg-[#1877F2]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-[19px] w-[19px] fill-current" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.492 0-1.957.925-1.957 1.874v2.25h3.328l-.532 3.469h-2.796v8.386C19.612 23.027 24 18.061 24 12.073z"/></svg>
                </a>
                <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener" aria-label="Valmont Group on TikTok" title="TikTok" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:-translate-y-0.5 hover:border-[#FE2C55] hover:bg-black">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-[19px] w-[19px] fill-current" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Contact Info</p>
              <ul className="space-y-2.5 text-[12.5px] font-medium text-gray-300">
                <li className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-[#ff8c00]" aria-hidden="true"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>
                  <a href={"mailto:" + SOCIAL_LINKS.supportEmail} className="hover:text-[#ff8c00] hover:underline">{SOCIAL_LINKS.supportEmail}</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-[#ff8c00]" aria-hidden="true"><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
                  <span>Accra, Ghana</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-[#ff8c00]" aria-hidden="true"><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  <span>Mon - Sun: 8AM - 9PM</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Support</p>
              <a href={SOCIAL_LINKS.whatsappSupport} target="_blank" rel="noopener" className="text-[12.5px] font-extrabold text-[#25D366] hover:underline">&#128172; WhatsApp Support &#8594;</a>
              <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-gray-400">Call to order: 054 245 1578 &#8226; MoMo &amp; Card accepted &#8226; 12-month official warranty on every device.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-center justify-between gap-2 text-center text-[10.5px] font-bold uppercase tracking-[0.08em] text-gray-400 md:flex-row">
            <span>&#169; 2026 Valmont Gadgets &#8212; All rights reserved</span>
            <span>Accra, Ghana</span>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP SUPPORT WIDGET — bottom-left with red notification dot */}
      <a href={SOCIAL_LINKS.whatsappSupport} target="_blank" rel="noopener" aria-label="Chat with Valmont Gadgets support on WhatsApp" className="fixed bottom-5 left-5 z-[70] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-[0_6px_16px_rgba(18,140,126,.45)] transition hover:scale-110 active:scale-95">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-7 w-7 fill-current" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-93.8-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 89.4-184.5 184.6-184.5 46 0 89.3 18 121.9 50.6 32.6 32.5 50.5 75.9 50.5 122.1-.1 101.8-94.9 184.5-184.6 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
        <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#ef4444] px-1 text-[11px] font-extrabold leading-none text-white" style={{ animation: "vg-wa-dot-pulse 2s ease-out infinite" }}>1</span>
      </a>

      <p className="sr-only" aria-live="polite">THEME ACTIVE: {theme.toUpperCase()}</p>
      {deliveryMessage && <div role="status" className="fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#0b1a38] px-4 py-3 text-center text-[11px] font-bold text-white shadow-xl">{deliveryMessage}<button onClick={() => setDeliveryMessage("")} className="ml-3 text-[#ff8c00]" aria-label="Dismiss delivery message">Close</button></div>}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className={`absolute right-0 top-0 h-full w-full max-w-[420px] shadow-2xl flex flex-col ${theme === "navy" ? "bg-[#0b1a38] text-white" : "bg-white"}`}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between"><h2 className="font-black text-[14px] tracking-widest uppercase">Your Cart</h2><button onClick={() => setDrawerOpen(false)} className="text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 border border-gray-300 rounded-lg">Close</button></div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? <div className="py-16 text-center"><p className="text-[12px] font-bold uppercase tracking-widest">Your cart is empty</p><p className="text-[11px] text-gray-500 mt-2">Add verified gadgets to begin secure checkout</p></div> : cart.map((item) => {
                const prod = PRODUCTS.find((p) => p.id === item.id)!;
                return (
                  <div key={item.id} className="bg-[#fcfcfd] border border-gray-200 rounded-xl p-3 flex gap-3">
                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prod.image} alt={prod.name} className="object-contain w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] leading-tight line-clamp-2">{prod.name}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{formatGH(prod.retail)} • Qty {item.qty}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setCart((c) => c.map((x) => (x.id === item.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} className="text-[10px] font-bold uppercase px-2 py-1 border border-gray-300 rounded">-</button>
                        <button onClick={() => setCart((c) => c.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x)))} className="text-[10px] font-bold uppercase px-2 py-1 border border-gray-300 rounded">+</button>
                        <a href={buildWALink(prod.name, prod.retail)} target="_blank" rel="noopener" className="text-[10px] font-bold uppercase px-2 py-1 bg-[#ff8c00] text-white rounded">WA</a>
                        <button onClick={() => setCart((c) => c.filter((x) => x.id !== item.id))} className="text-[10px] font-bold uppercase px-2 py-1 text-[#ff8c00]">Remove</button>
                      </div>
                    </div>
                    <p className="font-black text-[12px] text-[#0b1a38]">{formatGH(prod.retail * item.qty)}</p>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-gray-200 bg-[#fcfcfd]">
              <div className="flex justify-between mb-2 text-[12px] font-semibold text-gray-500 uppercase tracking-wide"><span>Subtotal</span><span>{formatGH(subtotal)}</span></div>
              <div className="flex justify-between mb-4 text-[14px] font-black text-[#0b1a38]"><span>Total Retail</span><span>{formatGH(subtotal)}</span></div>
              <p className="text-[10px] font-medium text-gray-500 mb-4 leading-relaxed uppercase tracking-wide">12-month warranty included. Free Accra delivery above GH₵ 5,000. MoMo & Card accepted.</p>
                <button type="button" onClick={checkoutWithValmontPay} disabled={!cart.length || paying} aria-disabled={!cart.length || paying} className={`block w-full bg-[#ff8c00] hover:bg-[#e67e00] text-white text-center font-extrabold text-[12px] tracking-widest uppercase rounded-xl py-4 transition disabled:pointer-events-none disabled:opacity-50 ${!cart.length ? "pointer-events-none opacity-50" : ""}`}>{paying ? "Opening Valmont-Pay…" : "Pay securely with Valmont-Pay"}</button>
              <button onClick={() => setCart([])} className="w-full mt-2 text-[11px] font-bold tracking-widest uppercase text-gray-500 py-2">Clear Cart</button>
              {/* Private profit summary - console only, not rendered publicly. Ledger accessible only in backend. */}
              <div className="hidden">
                {PRODUCTS.map((p) => (
                  <span key={p.id}>{getPrivateProfit(p)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
