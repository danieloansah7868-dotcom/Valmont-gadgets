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

export default function Page() {
  const [activeCat, setActiveCat] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [theme, setTheme] = useState<ThemeId>("light");

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
  const headerBg = theme === "navy" ? "bg-[#0b1a38] border-[#1e345e]" : theme === "gold" ? "bg-white border-[#f58c14] border-b-2" : "bg-white border-gray-200";
  const cardBg = theme === "navy" ? "bg-[#132144] border-[#1e345e] text-white" : theme === "gold" ? "bg-white border-amber-200 hover:border-[#f58c14] hover:shadow-[0_12px_28px_rgba(245,140,20,.16)]" : "bg-white border-gray-200";
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

  const buildWALink = (name: string, retail: number) => {
    const text = encodeURIComponent(`Hello Valmont Gadgets, I want to order the ${name} (${formatGH(retail)}). Please confirm stock and express Accra delivery!`);
    return `https://wa.me/233542451578?text=${text}`;
  };

  const checkoutText = useMemo(() => {
    const summary = cart
      .map((c) => {
        const p = PRODUCTS.find((x) => x.id === c.id);
        return p ? `${p.name} x${c.qty} (${formatGH(p.retail * c.qty)})` : "";
      })
      .join(", ");
    return encodeURIComponent(`Hello Valmont Gadgets, I want to order: ${summary}. Total ${formatGH(subtotal)}. Please confirm stock and express Accra delivery! My location is Accra.`);
  }, [cart, subtotal]);

  return (
    <div className={`min-h-screen ${pageBg} antialiased`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{font-family:'Inter',sans-serif;} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} .scrollbar-hide::-webkit-scrollbar{display:none} .theme-btn.is-active{background:#0b1a38;color:#fff}`}</style>

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
          <button onClick={() => setDrawerOpen(true)} className="bg-[#f58c14] hover:bg-[#e67f0f] text-white font-extrabold text-[12px] tracking-wide px-5 py-2.5 rounded-full shadow-sm transition">Cart ({totalQty})</button>
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
          <p className="text-[11px] md:text-[12px] font-extrabold tracking-[0.14em] uppercase text-[#f58c14]">EXECUTIVE MIDWEEK DEALS — WHILE STOCKS LAST • 100% Sealed & Verified</p>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-3 md:px-4 py-4 md:py-6">
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === cat.id).length;
              const active = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase border transition ${active ? (theme === "gold" ? "bg-[#f58c14] text-white border-[#f58c14] shadow" : "bg-[#0b1a38] text-white border-[#0b1a38] shadow") : `${pillInactive} hover:border-[#0b1a38]`}`}>
                  {cat.label} {cat.id === "all" ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <p className={`text-[11px] font-bold tracking-wide uppercase ${mutedText}`}>{filtered.length} VERIFIED PRODUCTS {activeCat !== "all" ? `IN ${CATEGORIES.find((c) => c.id === activeCat)?.label.toUpperCase()}` : ""} {query ? `FOR "${query.toUpperCase()}"` : ""}</p>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400"><span>Verified Stock</span><span className="w-2 h-2 bg-[#f58c14] rounded-full inline-block"></span></div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const badgeColor = product.badge === "HOT" ? "bg-[#f58c14]" : product.badge === "DEAL" ? "bg-[#f58c14]" : "bg-[#0b1a38]";
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
                  <p className="text-[10px] font-bold text-[#f58c14] mb-3 tracking-wide uppercase">{product.stock}</p>
                  <div className="flex gap-2">
                    <button onClick={() => addToCart(product.id)} className="bg-[#0b1a38] hover:bg-black text-white font-extrabold text-[11px] tracking-wide rounded-lg px-3 py-2.5 w-2/3 transition uppercase">Add to Cart</button>
                    <a href={buildWALink(product.name, product.retail)} target="_blank" rel="noopener noreferrer" className="bg-[#f58c14] hover:bg-[#e67f0f] text-white font-extrabold text-[11px] tracking-widest rounded-lg px-3 py-2.5 w-1/3 text-center transition uppercase">WA</a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">12-Month Warranty</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Every device sealed, verified IMEI, with official Valmont warranty card and receipt.</p></div>
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">Express Accra Delivery</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Same-day delivery in Accra. Pay on delivery available. Inter-regional dispatch within 24 hours.</p></div>
          <div className={`border rounded-xl p-4 ${cardBg}`}><p className="text-[11px] font-extrabold tracking-widest uppercase mb-1">Swap & Trade-In</p><p className="text-[12px] text-gray-600 leading-relaxed font-medium">Trade your old phone or laptop for instant value. MoMo, Bank Transfer, and Card accepted.</p></div>
        </div>
      </main>

      <footer className="bg-[#0b1a38] text-white mt-12">
        <div className="max-w-[1280px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div><p className="font-black text-[13px] tracking-widest uppercase mb-3">Valmont Gadgets</p><p className="text-[12px] leading-relaxed text-gray-300 font-medium">Ghana&apos;s executive source for genuine mobile phones and laptops. Franko Trading standard verification.</p><p className="text-[11px] mt-4 font-bold tracking-wide text-[#f58c14]">valmontgadgets.com</p></div>
          <div><p className="font-bold text-[11px] tracking-widest uppercase mb-3 text-gray-400">Shop</p><ul className="space-y-2 text-[12px] font-medium text-gray-300"><li>iPhones & Apple</li><li>Samsung Galaxy</li><li>Executive Laptops</li><li>Smart Audio & AirPods</li><li>Chargers & Power Banks</li></ul></div>
          <div><p className="font-bold text-[11px] tracking-widest uppercase mb-3 text-gray-400">Support</p><ul className="space-y-2 text-[12px] font-medium text-gray-300"><li>Call: 054 245 1578</li><li>WhatsApp Order</li><li>Warranty Policy</li><li>Swap & Trade-In</li><li>Store: East Legon, Accra</li></ul></div>
          <div><p className="font-bold text-[11px] tracking-widest uppercase mb-3 text-gray-400">Payment</p><ul className="space-y-2 text-[12px] font-medium text-gray-300"><li>MTN MoMo & Vodafone Cash</li><li>Visa / Mastercard</li><li>Bank Transfer</li><li>Pay on Delivery (Accra)</li><li className="text-[#f58c14] font-bold">100% Sealed & Verified</li></ul></div>
        </div>
        <div className="border-t border-white/10"><div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between gap-2 text-[10px] tracking-widest uppercase font-semibold text-gray-400"><span>© 2026 VALMONT GADGETS — ALL RIGHTS RESERVED</span><span>BUILT FOR GHANA • DEEP NAVY & GOLD • ZERO EMOJI CORPORATE STANDARD</span></div></div>
      </footer>

      <p className="sr-only" aria-live="polite">THEME ACTIVE: {theme.toUpperCase()}</p>
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className={`absolute right-0 top-0 h-full w-full max-w-[420px] shadow-2xl flex flex-col ${theme === "navy" ? "bg-[#0b1a38] text-white" : "bg-white"}`}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between"><h2 className="font-black text-[14px] tracking-widest uppercase">Your Cart</h2><button onClick={() => setDrawerOpen(false)} className="text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 border border-gray-300 rounded-lg">Close</button></div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? <div className="py-16 text-center"><p className="text-[12px] font-bold uppercase tracking-widest">Your cart is empty</p><p className="text-[11px] text-gray-500 mt-2">Add 2-column verified gadgets to checkout via WhatsApp</p></div> : cart.map((item) => {
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
                        <a href={buildWALink(prod.name, prod.retail)} target="_blank" className="text-[10px] font-bold uppercase px-2 py-1 bg-[#f58c14] text-white rounded">WA</a>
                        <button onClick={() => setCart((c) => c.filter((x) => x.id !== item.id))} className="text-[10px] font-bold uppercase px-2 py-1 text-[#f58c14]">Remove</button>
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
              <a href={`https://wa.me/233542451578?text=${checkoutText}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#f58c14] hover:bg-[#e67f0f] text-white text-center font-extrabold text-[12px] tracking-widest uppercase rounded-xl py-4 transition">Checkout via WhatsApp</a>
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
