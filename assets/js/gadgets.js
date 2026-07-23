// Valmont Gadgets Storefront JS - White Template Mobile Redesign
const SUPABASE_URL = "https://yrrqrvbkdziuyosedfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_H3PK7UqMZcO2rsusl1_qQw_MypxJljs";

const DEFAULT_PRODUCTS_SEED = [
  { id: "vmp-001", name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", category: "iphones", price: 16500, wholesale_price: 13900, compare_at_price: 18975, specs: "Titanium, A17 Pro, Sealed", description: "Premium iPhone 15 Pro Max", badge: "HOT", rating: 4.9, reviews_count: 3, stock_quantity: 8, image_url: "https://images.unsplash.com/photo-1696446703255-020d67fa2f3b?q=80&w=800&auto=format&fit=crop", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-002", name: "iPhone 15 Pro", slug: "iphone-15-pro", category: "iphones", price: 14500, wholesale_price: 12200, compare_at_price: 16675, specs: "Titanium, A17 Pro", description: "iPhone 15 Pro", badge: "NEW", rating: 4.8, reviews_count: 5, stock_quantity: 10, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-003", name: "iPhone 15", slug: "iphone-15", category: "iphones", price: 12500, wholesale_price: 10500, compare_at_price: 14375, specs: "A16 Bionic", description: "iPhone 15", badge: "", rating: 4.7, reviews_count: 8, stock_quantity: 15, image_url: "", image: "/assets/images/products/iphone-16.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-004", name: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", category: "iphones", price: 15500, wholesale_price: 13000, compare_at_price: 17825, specs: "A16 Bionic, Dynamic Island", description: "iPhone 14 Pro Max", badge: "HOT", rating: 4.6, reviews_count: 4, stock_quantity: 6, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-005", name: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", category: "iphones", price: 13500, wholesale_price: 11200, compare_at_price: 15525, specs: "A15 Bionic", description: "iPhone 13 Pro Max", badge: "", rating: 4.5, reviews_count: 7, stock_quantity: 9, image_url: "", image: "/assets/images/products/iphone-13-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-006", name: "iPhone 13", slug: "iphone-13", category: "iphones", price: 9800, wholesale_price: 8200, compare_at_price: 11270, specs: "A15 Bionic", description: "iPhone 13", badge: "DEAL", rating: 4.4, reviews_count: 12, stock_quantity: 20, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-007", name: "iPhone 11", slug: "iphone-11", category: "iphones", price: 7200, wholesale_price: 5900, compare_at_price: 8280, specs: "A13 Bionic", description: "iPhone 11", badge: "", rating: 4.3, reviews_count: 9, stock_quantity: 14, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-008", name: "iPad Pro M4", slug: "ipad-pro-m4", category: "iphones", price: 18500, wholesale_price: 15500, compare_at_price: 21275, specs: "M4 Chip, 11-inch", description: "iPad Pro M4", badge: "NEW", rating: 4.9, reviews_count: 3, stock_quantity: 5, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-009", name: "iPad Air M2", slug: "ipad-air-m2", category: "iphones", price: 14200, wholesale_price: 11900, compare_at_price: 16330, specs: "M2 Chip", description: "iPad Air M2", badge: "", rating: 4.8, reviews_count: 6, stock_quantity: 8, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-010", name: "iPad 10th", slug: "ipad-10th", category: "iphones", price: 8900, wholesale_price: 7400, compare_at_price: 10235, specs: "A14 Bionic", description: "iPad 10th Gen", badge: "DEAL", rating: 4.6, reviews_count: 11, stock_quantity: 18, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-011", name: "Apple Watch S9", slug: "apple-watch-s9", category: "iphones", price: 5800, wholesale_price: 4800, compare_at_price: 6670, specs: "S9 Chip, Always-On", description: "Apple Watch S9", badge: "", rating: 4.7, reviews_count: 14, stock_quantity: 22, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-012", name: "Apple Watch Ultra 2", slug: "apple-watch-ultra-2", category: "iphones", price: 9200, wholesale_price: 7700, compare_at_price: 10580, specs: "Ultra 2, Rugged", description: "Apple Watch Ultra 2", badge: "HOT", rating: 4.9, reviews_count: 5, stock_quantity: 7, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-013", name: "Samsung Galaxy S24 Ultra", slug: "samsung-galaxy-s24-ultra", category: "samsung", price: 15200, wholesale_price: 12800, compare_at_price: 17480, specs: "Titanium, S Pen, 200MP", description: "Galaxy S24 Ultra", badge: "SEALED", rating: 4.8, reviews_count: 6, stock_quantity: 12, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-014", name: "Samsung Galaxy S24", slug: "samsung-galaxy-s24", category: "samsung", price: 12800, wholesale_price: 10700, compare_at_price: 14720, specs: "Snapdragon 8 Gen 3", description: "Galaxy S24", badge: "", rating: 4.7, reviews_count: 9, stock_quantity: 15, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-015", name: "Samsung Galaxy S23 Ultra", slug: "samsung-galaxy-s23-ultra", category: "samsung", price: 13500, wholesale_price: 11300, compare_at_price: 15525, specs: "200MP Camera", description: "Galaxy S23 Ultra", badge: "HOT", rating: 4.6, reviews_count: 8, stock_quantity: 10, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-016", name: "Samsung Galaxy S23", slug: "samsung-galaxy-s23", category: "samsung", price: 10500, wholesale_price: 8800, compare_at_price: 12075, specs: "Flagship 2023", description: "Galaxy S23", badge: "", rating: 4.5, reviews_count: 11, stock_quantity: 17, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-017", name: "Samsung Galaxy A55", slug: "samsung-galaxy-a55", category: "samsung", price: 6800, wholesale_price: 5600, compare_at_price: 7820, specs: "Exynos 1480", description: "Galaxy A55", badge: "DEAL", rating: 4.4, reviews_count: 7, stock_quantity: 25, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-018", name: "Samsung Galaxy A35", slug: "samsung-galaxy-a35", category: "samsung", price: 5200, wholesale_price: 4300, compare_at_price: 5980, specs: "Mid-range 2024", description: "Galaxy A35", badge: "", rating: 4.3, reviews_count: 6, stock_quantity: 30, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-019", name: "Samsung Galaxy Z Fold 5", slug: "samsung-galaxy-z-fold-5", category: "samsung", price: 17500, wholesale_price: 14600, compare_at_price: 20125, specs: "Foldable, S Pen", description: "Galaxy Z Fold 5", badge: "NEW", rating: 4.8, reviews_count: 4, stock_quantity: 4, image_url: "", image: "/assets/images/products/iphone-13-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-020", name: "Samsung Galaxy Z Flip 5", slug: "samsung-galaxy-z-flip-5", category: "samsung", price: 9800, wholesale_price: 8200, compare_at_price: 11270, specs: "Flip Phone", description: "Galaxy Z Flip 5", badge: "", rating: 4.6, reviews_count: 8, stock_quantity: 11, image_url: "", image: "/assets/images/products/iphone-13-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-021", name: "Samsung Galaxy A25", slug: "samsung-galaxy-a25", category: "samsung", price: 4200, wholesale_price: 3500, compare_at_price: 4830, specs: "Budget 2024", description: "Galaxy A25", badge: "DEAL", rating: 4.2, reviews_count: 5, stock_quantity: 28, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-022", name: "Samsung Galaxy S24 FE", slug: "samsung-galaxy-s24-fe", category: "samsung", price: 9200, wholesale_price: 7700, compare_at_price: 10580, specs: "Fan Edition", description: "Galaxy S24 FE", badge: "", rating: 4.5, reviews_count: 3, stock_quantity: 9, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-023", name: "Samsung Galaxy A15", slug: "samsung-galaxy-a15", category: "samsung", price: 3200, wholesale_price: 2650, compare_at_price: 3680, specs: "Entry-level", description: "Galaxy A15", badge: "", rating: 4.1, reviews_count: 4, stock_quantity: 35, image_url: "", image: "/assets/images/products/iphone-13.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-024", name: "MacBook Pro M3 Max", slug: "macbook-pro-m3-max", category: "laptops", price: 28500, wholesale_price: 23800, compare_at_price: 32775, specs: "M3 Max, 16-inch", description: "MacBook Pro M3 Max", badge: "HOT", rating: 4.9, reviews_count: 3, stock_quantity: 3, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-025", name: "MacBook Pro M3 Pro", slug: "macbook-pro-m3-pro", category: "laptops", price: 24500, wholesale_price: 20500, compare_at_price: 28175, specs: "M3 Pro, 14-inch", description: "MacBook Pro M3 Pro", badge: "BESTSELLER", rating: 4.8, reviews_count: 5, stock_quantity: 6, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-026", name: "MacBook Pro M3 Base", slug: "macbook-pro-m3-base", category: "laptops", price: 20500, wholesale_price: 17200, compare_at_price: 23575, specs: "M3, 14-inch", description: "MacBook Pro M3", badge: "", rating: 4.7, reviews_count: 7, stock_quantity: 8, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-027", name: "MacBook Air M3", slug: "macbook-air-m3", category: "laptops", price: 16800, wholesale_price: 14000, compare_at_price: 19320, specs: "M3 Chip, 13-inch", description: "MacBook Air M3", badge: "NEW", rating: 4.8, reviews_count: 9, stock_quantity: 12, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-028", name: "MacBook Air M2", slug: "macbook-air-m2", category: "laptops", price: 14200, wholesale_price: 11800, compare_at_price: 16330, specs: "M2 Chip", description: "MacBook Air M2", badge: "", rating: 4.6, reviews_count: 11, stock_quantity: 14, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-029", name: "HP Envy 14", slug: "hp-envy-14", category: "laptops", price: 13500, wholesale_price: 11200, compare_at_price: 15525, specs: "Intel i7, OLED", description: "HP Envy 14", badge: "DEAL", rating: 4.5, reviews_count: 6, stock_quantity: 10, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-030", name: "Dell XPS 14", slug: "dell-xps-14", category: "laptops", price: 17800, wholesale_price: 14900, compare_at_price: 20470, specs: "Intel Ultra 7", description: "Dell XPS 14", badge: "HOT", rating: 4.7, reviews_count: 4, stock_quantity: 5, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-031", name: "Lenovo ThinkPad X1 Carbon", slug: "lenovo-thinkpad-x1-carbon", category: "laptops", price: 16200, wholesale_price: 13500, compare_at_price: 18630, specs: "Business Ultrabook", description: "ThinkPad X1 Carbon", badge: "", rating: 4.6, reviews_count: 8, stock_quantity: 7, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-032", name: "HP Pavilion 15", slug: "hp-pavilion-15", category: "laptops", price: 8900, wholesale_price: 7400, compare_at_price: 10235, specs: "Ryzen 7", description: "HP Pavilion 15", badge: "DEAL", rating: 4.3, reviews_count: 10, stock_quantity: 19, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-033", name: "Asus ROG Strix", slug: "asus-rog-strix", category: "laptops", price: 19500, wholesale_price: 16300, compare_at_price: 22425, specs: "Gaming Laptop", description: "Asus ROG Strix", badge: "HOT", rating: 4.8, reviews_count: 5, stock_quantity: 4, image_url: "", image: "/assets/images/products/iphone-17-pro-max.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-034", name: "Surface Laptop 7", slug: "surface-laptop-7", category: "laptops", price: 15200, wholesale_price: 12700, compare_at_price: 17480, specs: "Snapdragon X Elite", description: "Surface Laptop 7", badge: "NEW", rating: 4.7, reviews_count: 6, stock_quantity: 8, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-035", name: "Lenovo Yoga 9i", slug: "lenovo-yoga-9i", category: "laptops", price: 12800, wholesale_price: 10700, compare_at_price: 14720, specs: "2-in-1 Convertible", description: "Lenovo Yoga 9i", badge: "", rating: 4.5, reviews_count: 7, stock_quantity: 11, image_url: "", image: "/assets/images/products/iphone-17-air.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-036", name: "AirPods Pro", slug: "airpods-pro", category: "audio", price: 3200, wholesale_price: 2550, compare_at_price: 3680, specs: "Active Noise Cancellation", description: "AirPods Pro", badge: "DEAL", rating: 4.7, reviews_count: 15, stock_quantity: 25, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-037", name: "AirPods 3rd Gen", slug: "airpods-3rd-gen", category: "audio", price: 2450, wholesale_price: 1950, compare_at_price: 2818, specs: "Spatial Audio", description: "AirPods 3rd Gen", badge: "", rating: 4.5, reviews_count: 12, stock_quantity: 30, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-038", name: "AirPods Max", slug: "airpods-max", category: "audio", price: 7800, wholesale_price: 6500, compare_at_price: 8970, specs: "Over-ear ANC", description: "AirPods Max", badge: "HOT", rating: 4.8, reviews_count: 4, stock_quantity: 6, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-039", name: "Galaxy Buds2 Pro", slug: "galaxy-buds2-pro", category: "audio", price: 2800, wholesale_price: 2250, compare_at_price: 3220, specs: "ANC, 360 Audio", description: "Galaxy Buds2 Pro", badge: "", rating: 4.4, reviews_count: 8, stock_quantity: 18, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-040", name: "Sony WH-1000XM5", slug: "sony-wh-1000xm5", category: "audio", price: 6500, wholesale_price: 5400, compare_at_price: 7475, specs: "Premium ANC Headphones", description: "Sony WH-1000XM5", badge: "BESTSELLER", rating: 4.9, reviews_count: 7, stock_quantity: 9, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-041", name: "Sony WF-1000XM5", slug: "sony-wf-1000xm5", category: "audio", price: 4200, wholesale_price: 3500, compare_at_price: 4830, specs: "Premium Earbuds", description: "Sony WF-1000XM5", badge: "", rating: 4.6, reviews_count: 6, stock_quantity: 14, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-042", name: "JBL Tune Beam", slug: "jbl-tune-beam", category: "audio", price: 1850, wholesale_price: 1480, compare_at_price: 2128, specs: "True Wireless", description: "JBL Tune Beam", badge: "DEAL", rating: 4.3, reviews_count: 9, stock_quantity: 22, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-043", name: "JBL Charge 5", slug: "jbl-charge-5", category: "audio", price: 3200, wholesale_price: 2600, compare_at_price: 3680, specs: "Portable Speaker", description: "JBL Charge 5", badge: "", rating: 4.5, reviews_count: 10, stock_quantity: 16, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-044", name: "JBL Flip 6", slug: "jbl-flip-6", category: "audio", price: 2450, wholesale_price: 1950, compare_at_price: 2818, specs: "Waterproof Speaker", description: "JBL Flip 6", badge: "", rating: 4.4, reviews_count: 8, stock_quantity: 20, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-045", name: "Beats Studio Buds", slug: "beats-studio-buds", category: "audio", price: 2950, wholesale_price: 2350, compare_at_price: 3392, specs: "ANC Earbuds", description: "Beats Studio Buds", badge: "HOT", rating: 4.5, reviews_count: 7, stock_quantity: 13, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-046", name: "Beats Fit Pro", slug: "beats-fit-pro", category: "audio", price: 2650, wholesale_price: 2120, compare_at_price: 3047, specs: "Wingtip Fit", description: "Beats Fit Pro", badge: "", rating: 4.4, reviews_count: 5, stock_quantity: 15, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-047", name: "JBL Tour Pro 2", slug: "jbl-tour-pro-2", category: "audio", price: 3800, wholesale_price: 3050, compare_at_price: 4370, specs: "Premium ANC", description: "JBL Tour Pro 2", badge: "NEW", rating: 4.6, reviews_count: 4, stock_quantity: 8, image_url: "", image: "/assets/images/products/airpods-pro-3.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-048", name: "Anker 20,000mAh 65W Power Bank", slug: "anker-20k-65w-power-bank", category: "power", price: 1250, wholesale_price: 960, compare_at_price: 1438, specs: "65W Fast Charge", description: "Anker Power Bank", badge: "HOT", rating: 4.8, reviews_count: 12, stock_quantity: 25, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-049", name: "Anker 10,000mAh Power Bank", slug: "anker-10k-power-bank", category: "power", price: 850, wholesale_price: 680, compare_at_price: 977, specs: "Compact Fast Charge", description: "Anker 10K", badge: "", rating: 4.6, reviews_count: 15, stock_quantity: 32, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-050", name: "Belkin 20K Wireless Power Bank", slug: "belkin-20k-wireless", category: "power", price: 1650, wholesale_price: 1320, compare_at_price: 1897, specs: "Wireless Charging", description: "Belkin Wireless", badge: "DEAL", rating: 4.5, reviews_count: 8, stock_quantity: 18, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-051", name: "Baseus 30,000mAh Power Bank", slug: "baseus-30k-power-bank", category: "power", price: 1850, wholesale_price: 1480, compare_at_price: 2128, specs: "High Capacity", description: "Baseus 30K", badge: "", rating: 4.4, reviews_count: 6, stock_quantity: 14, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-052", name: "Xiaomi 20K 65W Power Bank", slug: "xiaomi-20k-65w", category: "power", price: 980, wholesale_price: 780, compare_at_price: 1127, specs: "Fast Charge", description: "Xiaomi Power Bank", badge: "DEAL", rating: 4.3, reviews_count: 9, stock_quantity: 27, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-053", name: "UGREEN 20K GaN Charger", slug: "ugreen-20k-gan", category: "power", price: 1450, wholesale_price: 1150, compare_at_price: 1667, specs: "GaN Fast Charger", description: "UGREEN GaN", badge: "", rating: 4.7, reviews_count: 5, stock_quantity: 11, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-054", name: "Samsung 25W Wireless Charger", slug: "samsung-25w-wireless", category: "power", price: 1250, wholesale_price: 980, compare_at_price: 1438, specs: "Wireless Pad", description: "Samsung Wireless", badge: "", rating: 4.5, reviews_count: 7, stock_quantity: 16, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-055", name: "Apple 20W USB-C Charger", slug: "apple-20w-usbc", category: "power", price: 680, wholesale_price: 540, compare_at_price: 782, specs: "Official Charger", description: "Apple 20W", badge: "HOT", rating: 4.8, reviews_count: 18, stock_quantity: 40, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-056", name: "Anker 65W GaN Charger", slug: "anker-65w-gan", category: "power", price: 1350, wholesale_price: 1080, compare_at_price: 1552, specs: "Compact GaN", description: "Anker 65W GaN", badge: "", rating: 4.6, reviews_count: 10, stock_quantity: 22, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true },
  { id: "vmp-057", name: "Baseus 65W GaN Charger", slug: "baseus-65w-gan", category: "power", price: 1150, wholesale_price: 920, compare_at_price: 1322, specs: "Fast GaN Charger", description: "Baseus 65W", badge: "DEAL", rating: 4.4, reviews_count: 8, stock_quantity: 19, image_url: "", image: "/assets/images/products/airpods-4.jpg", images: [], colors: [], storage_options: [], is_active: true }
];
DEFAULT_PRODUCTS_SEED.forEach(p => { p.compare_at_price = Math.round(p.price * 1.15); });
const DEFAULT_REVIEWS_SEED = [
  { id: "rev-001", product_id: "vmp-001", customer_name: "Emmanuel Boateng", rating: 5, comment: "This is a great premium device. Excellent service and original sealed packaging.", is_approved: true, created_at: "2026-07-20T10:30:00.000Z" },
  { id: "rev-002", product_id: "vmp-001", customer_name: "Priscilla Ansah", rating: 5, comment: "Absolutely genuine iPhone. Same day delivery in East Legon as promised.", is_approved: true, created_at: "2026-07-21T14:45:00.000Z" },
  { id: "rev-003", product_id: "vmp-002", customer_name: "Daniel Mensah", rating: 4, comment: "Outstanding camera and the S Pen is super smooth. S24 Ultra is unmatched.", is_approved: true, created_at: "2026-07-19T09:15:00.000Z" }
];
class ValmontDatabase {
  constructor() {
    this.useSupabase = false;
    this.supabaseClient = null;
    if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        this.useSupabase = true;
      } catch (err) { console.warn("Supabase fallback", err); }
    }
    this.initLocalStorage();
  }
  initLocalStorage() {
    if (!localStorage.getItem("valmont_products")) localStorage.setItem("valmont_products", JSON.stringify(DEFAULT_PRODUCTS_SEED));
    if (!localStorage.getItem("valmont_reviews")) localStorage.setItem("valmont_reviews", JSON.stringify(DEFAULT_REVIEWS_SEED));
    if (!localStorage.getItem("valmont_orders")) localStorage.setItem("valmont_orders", JSON.stringify([]));
    if (!localStorage.getItem("valmont_customer_addresses")) localStorage.setItem("valmont_customer_addresses", JSON.stringify([]));
    if (!localStorage.getItem("valmont_saved_payment_methods")) localStorage.setItem("valmont_saved_payment_methods", JSON.stringify([]));
  }
  async getProducts() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient.from("products").select("*").eq("is_active", true);
        if (error) throw error;
        if (data && data.length > 0) {
          const normalized = data.map(normalizeStorefrontProduct);
          localStorage.setItem("valmont_products", JSON.stringify(normalized));
          return normalized;
        }
      } catch (err) { console.error(err); }
    }
    return JSON.parse(localStorage.getItem("valmont_products")).map(normalizeStorefrontProduct).filter(p => p.is_active);
  }
  async getProductById(id) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient.from("products").select("*").eq("id", id).single();
        if (error) throw error;
        if (data) return normalizeStorefrontProduct(data);
      } catch (err) { console.error(err); }
    }
    const product = JSON.parse(localStorage.getItem("valmont_products")).find(p => p.id === id);
    return product ? normalizeStorefrontProduct(product) : product;
  }
  async getApprovedReviews(productId) {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient.from("reviews").select("*").eq("product_id", productId).eq("is_approved", true);
        if (error) throw error;
        return data;
      } catch (err) { console.error(err); }
    }
    return JSON.parse(localStorage.getItem("valmont_reviews")).filter(r => r.product_id === productId && r.is_approved);
  }
  async createReview(review) {
    const newReview = { id: crypto.randomUUID(), product_id: review.product_id, customer_name: review.customer_name, rating: parseInt(review.rating), comment: review.comment, is_approved: false, created_at: new Date().toISOString() };
    if (this.useSupabase) {
      try { const { error } = await this.supabaseClient.from("reviews").insert([newReview]); if (error) throw error; return true; } catch (err) { console.error(err); }
    }
    const reviews = JSON.parse(localStorage.getItem("valmont_reviews")); reviews.push(newReview); localStorage.setItem("valmont_reviews", JSON.stringify(reviews)); return true;
  }
  async createOrder(order) {
    const subtotal = order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || item.quantity || 1), 0);
    const deliveryFee = Number(order.delivery_fee ?? (subtotal >= 5000 ? 0 : 150));
    const total = Number(order.total_amount ?? order.total ?? subtotal + deliveryFee);
    const customerId = crypto.randomUUID();
    const customerPayload = { id: customerId, name: order.customer_name, phone: order.customer_phone, email: order.customer_email || "", addresses: [{ zone: order.customer_area, street: order.customer_street || "" }] };
    const requestedOrder = {
      id: crypto.randomUUID(), order_number: order.reference_code || order.order_number, customer_id: customerId,
      items: order.items.map(item => ({ product_id: item.id || item.product_id, product_name: item.name || item.product_name, product_image: item.image_url || item.product_image || "", selected_color: item.selected_color || "", selected_storage: item.selected_storage || "", quantity: Number(item.qty || item.quantity || 1), unit_price: Number(item.price || item.unit_price || 0), line_total: Number(item.price || item.unit_price || 0) * Number(item.qty || item.quantity || 1) })),
      subtotal, delivery_fee: deliveryFee, total, status: "Pending", payment_method: order.payment_method, admin_notes: "", created_at: new Date().toISOString()
    };
    const legacyOrder = { ...requestedOrder, reference_code: requestedOrder.order_number, customer_name: order.customer_name, customer_phone: order.customer_phone, customer_area: order.customer_area, customer_street: order.customer_street || "", total_amount: total };
    if (this.useSupabase) {
      try {
        await this.supabaseClient.from("customers").upsert([customerPayload], { onConflict: "id" });
        const { error } = await this.supabaseClient.from("orders").insert([requestedOrder]); if (error) throw error; return true;
      } catch (err) {
        try { const { error } = await this.supabaseClient.from("orders").insert([legacyOrder]); if (error) throw error; return true; } catch (legacyErr) { console.error({ err, legacyErr }); }
      }
    }
    const orders = JSON.parse(localStorage.getItem("valmont_orders")); orders.unshift(legacyOrder); localStorage.setItem("valmont_orders", JSON.stringify(orders)); return true;
  }
}
const db = new ValmontDatabase();
function normalizeStorefrontProduct(product) {
  const images = Array.isArray(product.images) ? product.images : parseJSONOrDefault(product.images, []);
  const colors = Array.isArray(product.colors) ? product.colors : parseJSONOrDefault(product.colors, []);
  const storageOptions = Array.isArray(product.storage_options) ? product.storage_options : parseJSONOrDefault(product.storage_options, []);
  const stock = Number(product.stock ?? product.stock_quantity ?? 0);
  const category = product.category || product.category_id || "gadgets";
  const imageUrl = product.image_url || product.image || images[0] || "";
  return { ...product, category, category_id: product.category_id || category, stock, stock_quantity: stock, image_url: imageUrl, image: imageUrl, images, colors, storage_options: storageOptions, is_active: product.is_active !== false };
}
function parseJSONOrDefault(value, fallback) { if (!value) return fallback; if (typeof value !== "string") return value; try { return JSON.parse(value); } catch (_) { return fallback; } }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

// State
let allProducts = [];
let activeCategory = "all";
let activePriceFilter = "all";
let activeSort = "popular";
let activeSearch = "";
let cart = JSON.parse(localStorage.getItem("valmont_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("valmont_wishlist") || "[]");
let recentlyViewed = JSON.parse(localStorage.getItem("valmont_recently_viewed") || "[]");
let userProfile = JSON.parse(localStorage.getItem("valmont_user") || "null");
let activeQuickViewProduct = null;
let selectedColorName = "";
let selectedStorageSize = "";
let selectedStoragePriceAdjustment = 0;
let quickViewRatingStars = 5;

const productGrid = document.getElementById("productGrid");
const flashProductsRow = document.getElementById("flashProductsRow");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const cartBadgeCount = document.getElementById("cartBadgeCount");
const wishlistCountBadge = document.getElementById("wishlistCountBadge");
const bottomCartBadge = document.getElementById("bottomCartBadge");

window.addEventListener("DOMContentLoaded", async () => {
  await loadAndRenderProducts();
  await applyAdminSiteSettings();
  initStorefrontRealtime();
  initFlashSaleTimer();
  initUserProfile();
  initUIEventListeners();
  initFloatingActions();
  loadSavedAddressesToCheckout();
  loadSavedPaymentsToCheckout();
});

async function loadAndRenderProducts() {
  allProducts = await db.getProducts();
  allProducts = allProducts.map(normalizeStorefrontProduct);
  renderStorefrontGrid();
  renderFlashSale();
  renderRecentlyViewedGrid();
  updateCartBadge();
  updateWishlistBadge();
}

async function applyAdminSiteSettings() {
  const settings = await getAdminSiteSettings();
  if (!settings) return;
  const announcement = settings.announcement;
  const announcementEl = document.querySelector("body > div:first-of-type p");
  if (announcement && announcementEl) announcementEl.textContent = announcement;
  const heroHeading = document.querySelector(".hero-deals h2");
  if (settings.hero_headline && heroHeading) heroHeading.textContent = settings.hero_headline;
  const heroSubtitle = document.querySelector(".hero-deals p");
  if (settings.hero_subtitle && heroSubtitle) heroSubtitle.textContent = settings.hero_subtitle;
  const infoBannerSpans = document.querySelectorAll(".bg-white.border-b span");
  if (infoBannerSpans[0] && settings.whatsapp) infoBannerSpans[0].innerHTML = `Call / WhatsApp to Order: <a href="https://wa.me/${settings.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="text-[#f58c14] hover:underline">${settings.whatsapp}</a>`;
}

async function getAdminSiteSettings() {
  const local = parseJSONOrDefault(localStorage.getItem("valmont_site_settings"), null);
  let settings = local;
  if (db.useSupabase) {
    try {
      const { data, error } = await db.supabaseClient.from("site_settings").select("key,value");
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        settings = data.reduce((acc, row) => ({ ...acc, [row.key]: parseJSONOrDefault(row.value, row.value) }), settings || {});
        localStorage.setItem("valmont_site_settings", JSON.stringify(settings));
      }
    } catch (error) { console.warn(error); }
  }
  return settings;
}
function initStorefrontRealtime() {
  if (!db.useSupabase || !db.supabaseClient.channel) return;
  try {
    db.supabaseClient.channel("valmont-storefront-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadAndRenderProducts).on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => activeQuickViewProduct && renderApprovedReviewsList(activeQuickViewProduct.id)).on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, applyAdminSiteSettings).subscribe();
  } catch (error) { console.warn(error); }
}

function renderStorefrontGrid() {
  if (!productGrid) return;
  let filtered = allProducts.filter(p => {
    const categoryMatch = activeCategory === "all" || p.category === activeCategory;
    const cleanSearch = activeSearch.toLowerCase().trim();
    const productName = (p.name || "").toLowerCase();
    const productSpecs = (p.specs || "").toLowerCase();
    const productCategory = (p.category || "").toLowerCase();
    const searchMatch = !cleanSearch || productName.includes(cleanSearch) || productSpecs.includes(cleanSearch) || productCategory.includes(cleanSearch);
    let priceMatch = true;
    if (activePriceFilter === "under-5000") priceMatch = p.price < 5000;
    else if (activePriceFilter === "5000-15000") priceMatch = p.price >= 5000 && p.price <= 15000;
    else if (activePriceFilter === "above-15000") priceMatch = p.price > 15000;
    return categoryMatch && searchMatch && priceMatch;
  });
  if (activeSort === "popular") filtered.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
  else if (activeSort === "newest") filtered.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
  else if (activeSort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (activeSort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (activeSort === "rating") filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  if (filtered.length === 0) {
    productGrid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-500 font-semibold text-sm">No premium products match your criteria. Try widening your search or filter.</div>`;
    return;
  }
  productGrid.innerHTML = filtered.map(p => {
    let discPct = ""; let compareMarkup = "";
    if (p.compare_at_price && p.compare_at_price > p.price) {
      const discPercent = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
      discPct = `<span class="card-discount-pct">-${discPercent}%</span>`;
      compareMarkup = `<span class="card-compare-price">GH₵ ${p.compare_at_price.toLocaleString()}</span>`;
    }
    let badgeMarkup = "";
    const allowedBadges = ["HOT", "SEALED", "DEAL", "BESTSELLER", "NEW"];
    if (p.badge && allowedBadges.includes(p.badge.toUpperCase())) {
      const cls = p.badge.toUpperCase() === "HOT" ? "badge-premium hot" : "badge-premium";
      badgeMarkup = `<span class="${cls}">${p.badge}</span>`;
    }
    const isWishlisted = wishlist.includes(p.id);
    const wishlistLabel = isWishlisted ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`;
    const ratingStars = "★".repeat(Math.floor(p.rating || 4.8)) + "☆".repeat(5 - Math.floor(p.rating || 4.8));
    const imgSrc = p.image || p.image_url || '/assets/images/products/iphone-17-pro-max.jpg';
    return `
      <div class="product-card" onclick="openProductQuickView('${p.id}')">
        <div class="product-card-image">
          ${badgeMarkup}
          <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="wishlist-heart${isWishlisted ? " active" : ""}" type="button" aria-label="${wishlistLabel}">
            <svg class="w-4 h-4" fill="${isWishlisted ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          </button>
          <img src="${imgSrc}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-card-body">
          <span class="card-category">${(p.category || "gadgets").toUpperCase()}</span>
          <h3 class="card-title">${p.name}</h3>
          <p class="card-specs">${p.specs || ""}</p>
          <div class="card-price-row"><span class="card-price">GH₵ ${p.price.toLocaleString()}</span>${compareMarkup}${discPct}</div>
          <div class="card-rating">${ratingStars}</div>
          <button onclick="event.stopPropagation(); quickAddProduct('${p.id}')" ${p.stock_quantity === 0 ? 'disabled' : ''} class="card-add-btn" type="button">${p.stock_quantity === 0 ? 'SOLD OUT' : 'ADD TO BAG'}</button>
        </div>
      </div>`;
  }).join("");
}

function renderFlashSale() {
  if (!flashProductsRow) return;
  const flashProducts = allProducts.filter(p => p.badge === "HOT" || (p.compare_at_price && p.compare_at_price > p.price)).slice(0, 6);
  const section = document.getElementById("flashSaleSection");
  if (flashProducts.length === 0) { if(section) section.classList.add("hidden"); return; }
  if(section) section.classList.remove("hidden");
  flashProductsRow.innerHTML = flashProducts.map(p => {
    const discPercent = Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
    const imgSrc = p.image_url || p.image || '/assets/images/products/iphone-17-pro-max.jpg';
    return `<div class="bg-white rounded-xl p-2.5 border border-gray-200 shrink-0 w-36 hover:border-orange-200 transition-all cursor-pointer shadow-sm" onclick="openProductQuickView('${p.id}')"><span class="absolute top-2 left-2 bg-[#f58c14] text-white text-[9px] font-black px-2 py-0.5 rounded-full">-${discPercent}%</span><div class="h-24 w-full flex items-center justify-center overflow-hidden mb-2 bg-gray-50 rounded-lg p-2 border border-gray-100"><img src="${imgSrc}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain" /></div><h4 class="text-[11px] text-[#0b1a38] font-bold truncate leading-tight">${p.name}</h4><div class="mt-1 leading-tight flex flex-col"><span class="text-xs font-black text-[#0b1a38]">GH₵ ${p.price.toLocaleString()}</span><span class="text-[10px] text-gray-400 line-through font-bold">GH₵ ${p.compare_at_price.toLocaleString()}</span></div></div>`;
  }).join("");
}

// Quick View
async function openProductQuickView(id) {
  const p = await db.getProductById(id);
  if (!p) return;
  activeQuickViewProduct = p;
  updateRecentlyViewed(p.id);
  const categoryLabels = { iphones: "iPhones and Apple", samsung: "Samsung Galaxy", laptops: "Executive Laptops", audio: "Smart Audio", power: "Power and Chargers" };
  const bc = document.getElementById("qvBreadcrumb");
  if(bc) bc.innerHTML = `<span class="hover:text-[#0b1a38] cursor-pointer" onclick="closeQuickView();">Store</span><span class="mx-1.5">/</span><span class="hover:text-[#0b1a38] cursor-pointer" onclick="filterCategory('${p.category}'); closeQuickView();">${categoryLabels[p.category] || p.category}</span><span class="mx-1.5">/</span><span class="text-gray-400 truncate max-w-[150px] inline-block align-bottom">${p.name}</span>`;
  const qvName = document.getElementById("qvName"); if(qvName) qvName.textContent = p.name;
  const qvSpecs = document.getElementById("qvSpecs"); if(qvSpecs) qvSpecs.textContent = p.specs || "";
  const qvDesc = document.getElementById("qvDescription"); if(qvDesc) qvDesc.textContent = p.description || "";
  const stockEl = document.getElementById("qvStock");
  if(stockEl){
    if (p.stock_quantity === 0) { stockEl.className = "shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-red-50 text-red-600 border border-red-200"; stockEl.textContent = "Sold Out"; }
    else if (p.stock_quantity < 10) { stockEl.className = "shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"; stockEl.textContent = `${p.stock_quantity} Items Left`; }
    else { stockEl.className = "shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-50 text-green-600 border border-green-200"; stockEl.textContent = "In Stock"; }
  }
  const carouselEl = document.getElementById("qvCarousel");
  const thumbnailsEl = document.getElementById("qvThumbnails");
  const allImages = [p.image_url, ...(p.images || [])].filter(x => !!x);
  if (allImages.length > 0 && carouselEl) {
    carouselEl.innerHTML = `<img id="qvActiveImg" src="${allImages[0]}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain" />`;
    if (thumbnailsEl) {
      if (allImages.length > 1) { thumbnailsEl.classList.remove("hidden"); thumbnailsEl.innerHTML = allImages.map((img, idx) => `<button onclick="changeQvActiveImage('${img}')" class="h-12 w-12 rounded-xl bg-white border border-gray-200 hover:border-[#f58c14] p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"><img src="${img}" alt="${p.name} view ${idx + 1}" loading="lazy" class="max-h-full max-w-full object-contain" /></button>`).join(""); }
      else thumbnailsEl.classList.add("hidden");
    }
  } else if(carouselEl){ carouselEl.innerHTML = `<div class="text-gray-400 text-sm">No Photo Available</div>`; if(thumbnailsEl) thumbnailsEl.classList.add("hidden"); }

  const colorsContainer = document.getElementById("qvColorsContainer");
  const colorSection = document.getElementById("qvColorsSection");
  if (p.colors && p.colors.length > 0 && colorsContainer && colorSection) {
    colorSection.classList.remove("hidden"); selectedColorName = "";
    colorsContainer.innerHTML = p.colors.map(c => { const availClass = c.available ? "" : "disabled"; const title = c.available ? c.name : `${c.name} (Unavailable)`; return `<button onclick="selectColor('${c.name}', ${c.available})" class="color-swatch ${availClass}" style="background-color: ${c.hex};" title="${title}" id="swatch-${c.name.replace(/\s+/g, '-')}"></button>`; }).join("");
    const firstAvail = p.colors.find(c => c.available); if (firstAvail) selectColor(firstAvail.name, true);
  } else { if(colorSection) colorSection.classList.add("hidden"); selectedColorName = ""; }

  const storageContainer = document.getElementById("qvStorageContainer");
  const storageSection = document.getElementById("qvStorageSection");
  if (p.storage_options && p.storage_options.length > 0 && storageContainer && storageSection) {
    storageSection.classList.remove("hidden"); selectedStorageSize = ""; selectedStoragePriceAdjustment = 0;
    storageContainer.innerHTML = p.storage_options.map(s => { const priceAdj = s.price_adjustment > 0 ? ` (+GH₵ ${s.price_adjustment})` : s.price_adjustment < 0 ? ` (-GH₵ ${Math.abs(s.price_adjustment)})` : ""; return `<button onclick="selectStorage('${s.size}', ${s.price_adjustment})" class="storage-option" id="storage-${s.size.replace(/\s+/g, '-')}">${s.size}${priceAdj}</button>`; }).join("");
    selectStorage(p.storage_options[0].size, p.storage_options[0].price_adjustment);
  } else { if(storageSection) storageSection.classList.add("hidden"); selectedStorageSize = ""; selectedStoragePriceAdjustment = 0; updateQvPrice(); }

  const ratingEl = document.getElementById("qvReviewRatingText");
  if(ratingEl) ratingEl.innerHTML = `<span class="text-[#0b1a38] font-bold">${p.rating || "4.8"} Stars</span><span class="text-gray-400">(${p.reviews_count || "0"} reviews)</span>`;
  await renderApprovedReviewsList(p.id);
  setReviewFormStars(5);
  renderRelatedProducts(p);
  const modal = document.getElementById("quickViewModal"); if(modal){ modal.classList.remove("hidden"); modal.scrollTop = 0; }
}
function changeQvActiveImage(imgSrc){ const activeImg = document.getElementById("qvActiveImg"); if (activeImg) activeImg.src = imgSrc; }
function selectColor(name, available){ if (!available) return; selectedColorName = name; document.querySelectorAll("#qvColorsContainer .color-swatch").forEach(el => el.classList.remove("active")); const cleanId = name.replace(/\s+/g, '-'); const target = document.getElementById(`swatch-${cleanId}`); if (target) target.classList.add("active"); updateQvPrice(); }
function selectStorage(size, priceAdjustment){ selectedStorageSize = size; selectedStoragePriceAdjustment = priceAdjustment; document.querySelectorAll("#qvStorageContainer .storage-option").forEach(el => el.classList.remove("active")); const cleanId = size.replace(/\s+/g, '-'); const target = document.getElementById(`storage-${cleanId}`); if (target) target.classList.add("active"); updateQvPrice(); }
function updateQvPrice(){ if (!activeQuickViewProduct) return; const basePrice = activeQuickViewProduct.price; const currentPrice = basePrice + selectedStoragePriceAdjustment; const priceEl = document.getElementById("qvPrice"); if(priceEl) priceEl.textContent = `GH₵ ${currentPrice.toLocaleString()}`; const compEl = document.getElementById("qvComparePrice"); const discPercentEl = document.getElementById("qvDiscPercent"); if (activeQuickViewProduct.compare_at_price && compEl && discPercentEl) { const baseCompare = activeQuickViewProduct.compare_at_price; const currentCompare = baseCompare + selectedStoragePriceAdjustment; compEl.classList.remove("hidden"); compEl.textContent = `GH₵ ${currentCompare.toLocaleString()}`; const discPercent = Math.round(((currentCompare - currentPrice) / currentCompare) * 100); discPercentEl.classList.remove("hidden"); discPercentEl.textContent = `-${discPercent}%`; } else { if(compEl) compEl.classList.add("hidden"); if(discPercentEl) discPercentEl.classList.add("hidden"); } }
function closeQuickView(){ const m = document.getElementById("quickViewModal"); if(m) m.classList.add("hidden"); activeQuickViewProduct = null; }

function renderRelatedProducts(product){
  const relatedGrid = document.getElementById("qvRelatedGrid"); if (!relatedGrid) return;
  const related = allProducts.filter(p => p.category === product.category && p.id !== product.id && p.is_active).slice(0, 4);
  if (related.length === 0) { relatedGrid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-4 text-xs font-semibold">No similar category items currently in stock.</div>`; return; }
  relatedGrid.innerHTML = related.map(p => { const img = p.image_url || p.image || ''; return `<div onclick="openProductQuickView('${p.id}')" class="bg-white border border-gray-200 hover:border-orange-200 rounded-xl p-2.5 text-left transition cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"><div class="h-20 w-full flex items-center justify-center bg-gray-50 rounded-lg p-2 overflow-hidden mb-2 border border-gray-100"><img src="${img}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain" /></div><h5 class="text-xs font-bold text-[#0b1a38] truncate">${p.name}</h5><span class="text-xs font-black text-[#f58c14] mt-1">GH₵ ${p.price.toLocaleString()}</span></div>`; }).join("");
}

async function renderApprovedReviewsList(productId){
  const container = document.getElementById("approvedReviewsList"); if (!container) return;
  const approved = await db.getApprovedReviews(productId);
  if (approved.length === 0) { container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs font-semibold">No reviews posted yet for this product. Be the first to share your experience!</div>`; return; }
  container.innerHTML = approved.map(r => {
    const starHTML = Array(5).fill("").map((_, i) => `<svg class="w-3 h-3 ${i < r.rating ? 'text-[#f58c14] fill-current' : 'text-gray-200'}" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`).join("");
    const dateStr = new Date(r.created_at).toLocaleDateString("en-GH", { year: 'numeric', month: 'short', day: 'numeric' });
    return `<div class="border-b border-gray-100 pb-3"><div class="flex items-center justify-between mb-1"><span class="text-xs font-extrabold text-[#0b1a38]">${r.customer_name}</span><span class="text-[10px] text-gray-400">${dateStr}</span></div><div class="flex gap-0.5 mb-1.5">${starHTML}</div><p class="text-xs text-gray-600 leading-relaxed font-medium">${r.comment || ""}</p></div>`;
  }).join("");
}
function setReviewFormStars(stars){
  quickViewRatingStars = stars;
  const starButtons = document.querySelectorAll("#writeReviewStars button");
  starButtons.forEach((btn, idx) => {
    const starSvg = btn.querySelector("svg");
    if (!starSvg) return;
    if (idx < stars) { starSvg.classList.add("text-[#f58c14]", "fill-current"); starSvg.classList.remove("text-gray-300"); }
    else { starSvg.classList.remove("text-[#f58c14]", "fill-current"); starSvg.classList.add("text-gray-300"); }
  });
}
async function submitReviewForm(){
  if (!activeQuickViewProduct) return;
  const nameInput = document.getElementById("reviewName"); const commentInput = document.getElementById("reviewComment");
  const name = nameInput ? nameInput.value.trim() : ""; const comment = commentInput ? commentInput.value.trim() : "";
  if (!name) { showToast("Please provide your name."); return; }
  const reviewData = { product_id: activeQuickViewProduct.id, customer_name: name, rating: quickViewRatingStars, comment: comment };
  const success = await db.createReview(reviewData);
  if (success) { if(nameInput) nameInput.value = ""; if(commentInput) commentInput.value = ""; setReviewFormStars(5); showToast("Review submitted successfully and is awaiting admin approval."); }
  else showToast("Could not submit review. Please try again.");
}

// Wishlist
function toggleWishlist(id){
  const idx = wishlist.indexOf(id);
  if (idx !== -1) { wishlist.splice(idx, 1); showToast("Removed from wishlist."); }
  else { wishlist.push(id); showToast("Added to wishlist."); }
  localStorage.setItem("valmont_wishlist", JSON.stringify(wishlist));
  updateWishlistBadge(); renderStorefrontGrid(); renderWishlistItems();
}
function updateWishlistBadge(){
  const badges = [wishlistCountBadge, document.getElementById("wishlist-count"), document.getElementById("bottomWishlistBadge")];
  badges.forEach(b => { if(!b) return; const c = wishlist.length; b.textContent = c > 0 ? c : ""; b.setAttribute("data-count", c); });
}
function openWishlistDrawer(){ const d = document.getElementById("wishlistDrawer"); if(d) d.classList.remove("translate-x-full"); renderWishlistItems(); }
function closeWishlistDrawer(){ const d = document.getElementById("wishlistDrawer"); if(d) d.classList.add("translate-x-full"); }
function renderWishlistItems(){
  const container = document.getElementById("wishlistDrawerItems"); if (!container) return;
  if (wishlist.length === 0) {
    container.innerHTML = `<div class="py-16 text-center text-gray-400 font-semibold text-xs">Your Wishlist is empty. Tap the heart icons to save your favorite gadgets!</div>`;
    const btn = document.getElementById("addAllWishlistToCartBtn"); if(btn) btn.classList.add("hidden"); return;
  }
  const btn = document.getElementById("addAllWishlistToCartBtn"); if(btn) btn.classList.remove("hidden");
  const savedProducts = allProducts.filter(p => wishlist.includes(p.id));
  container.innerHTML = savedProducts.map(p => {
    const img = p.image_url || p.image || '';
    return `<div class="flex items-center gap-3 border-b border-gray-100 pb-3"><div class="h-14 w-14 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden"><img src="${img}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain" /></div><div class="flex-1 min-w-0"><h5 class="text-xs font-bold text-[#0b1a38] truncate leading-tight">${p.name}</h5><span class="text-xs font-black text-[#f58c14] mt-0.5 block">GH₵ ${p.price.toLocaleString()}</span></div><div class="flex items-center gap-2"><button onclick="quickAddProduct('${p.id}'); closeWishlistDrawer();" class="bg-[#0b1a38] hover:bg-black text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase">Add</button><button onclick="toggleWishlist('${p.id}')" class="text-red-500 hover:text-red-600 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></div>`;
  }).join("");
}
function addAllWishlistToCart(){
  wishlist.forEach(id => {
    const p = allProducts.find(x => x.id === id);
    if (p && p.stock_quantity > 0) {
      const exist = cart.find(c => c.id === id);
      if (exist) exist.qty++;
      else cart.push({ id: p.id, name: p.name, price: p.price, image_url: p.image_url || p.image, qty: 1, selected_color: p.colors && p.colors.length > 0 ? p.colors.find(c => c.available)?.name || "" : "", selected_storage: p.storage_options && p.storage_options.length > 0 ? p.storage_options[0].size : "", price_adjustment: 0 });
    }
  });
  localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); closeWishlistDrawer(); openCartDrawer(); showToast("Added all available wishlist items to bag.");
}

// Recently Viewed
function updateRecentlyViewed(productId){
  recentlyViewed = recentlyViewed.filter(id => id !== productId); recentlyViewed.unshift(productId); if (recentlyViewed.length > 6) recentlyViewed.pop(); localStorage.setItem("valmont_recently_viewed", JSON.stringify(recentlyViewed)); renderRecentlyViewedGrid();
}
function renderRecentlyViewedGrid(){
  const container = document.getElementById("recentlyViewedGrid"); const section = document.getElementById("recentlyViewedSection"); if (!container || !section) return;
  if (recentlyViewed.length === 0) { section.classList.add("hidden"); return; } section.classList.remove("hidden");
  const items = recentlyViewed.map(id => allProducts.find(p => p.id === id && p.is_active)).filter(p => !!p);
  if (items.length === 0) { section.classList.add("hidden"); return; }
  container.innerHTML = items.map(p => {
    const img = p.image_url || p.image || ''; return `<div onclick="openProductQuickView('${p.id}')" class="bg-white rounded-xl p-2.5 border border-gray-200 shrink-0 w-32 hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer"><div class="h-20 w-full flex items-center justify-center bg-gray-50 rounded-lg p-1 overflow-hidden mb-2 border border-gray-100"><img src="${img}" alt="${p.name}" loading="lazy" class="max-h-full max-w-full object-contain" /></div><h5 class="text-[11px] font-bold text-[#0b1a38] truncate leading-tight">${p.name}</h5><span class="text-xs font-black text-[#f58c14] mt-1 block">GH₵ ${p.price.toLocaleString()}</span></div>`;
  }).join("");
}

// Cart
let checkoutStep = 1;
function openCartDrawer(){ const d = document.getElementById("cartDrawer"); if(d) d.classList.remove("translate-x-full"); checkoutStep = 1; renderCartStep(); loadSavedAddressesToCheckout(); loadSavedPaymentsToCheckout(); }
function closeCartDrawer(){ const d = document.getElementById("cartDrawer"); if(d) d.classList.add("translate-x-full"); }
function updateCartBadge(){
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  const targets = [cartBadgeCount, document.getElementById("cart-count"), bottomCartBadge, document.getElementById("bottomCartBadge")];
  targets.forEach(el => { if(!el) return; el.textContent = total > 0 ? total : ""; el.setAttribute("data-count", total); });
}
function quickAddProduct(id){
  const p = allProducts.find(x => x.id === id); if (!p) return; if (p.stock_quantity === 0) { showToast("This item is currently sold out."); return; }
  const selectedColor = p.colors && p.colors.length > 0 ? p.colors.find(c => c.available)?.name || "" : "";
  const selectedStorage = p.storage_options && p.storage_options.length > 0 ? p.storage_options[0].size : "";
  const existingItem = cart.find(item => item.id === id && item.selected_color === selectedColor && item.selected_storage === selectedStorage);
  if (existingItem) existingItem.qty++; else cart.push({ id: p.id, name: p.name, price: p.price, image_url: p.image_url || p.image, qty: 1, selected_color: selectedColor, selected_storage: selectedStorage, price_adjustment: 0 });
  localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); openCartDrawer(); showToast("Product added to your bag.");
}
function addActiveProductToCart(){
  if (!activeQuickViewProduct) return; const p = activeQuickViewProduct; if (p.stock_quantity === 0) { showToast("This item is currently sold out."); return; }
  if (p.colors && p.colors.length > 0 && !selectedColorName) { showToast("Please select a color variant."); return; }
  const existingItem = cart.find(item => item.id === p.id && item.selected_color === selectedColorName && item.selected_storage === selectedStorageSize);
  if (existingItem) existingItem.qty++; else cart.push({ id: p.id, name: p.name, price: p.price, image_url: p.image_url || p.image, qty: 1, selected_color: selectedColorName, selected_storage: selectedStorageSize, price_adjustment: selectedStoragePriceAdjustment });
  localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); closeQuickView(); openCartDrawer(); showToast("Product added to your bag.");
}
function modifyCartQty(idx, delta){ cart[idx].qty += delta; if (cart[idx].qty <= 0) cart.splice(idx, 1); localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); renderCartStep(); }
function removeCartItem(idx){ cart.splice(idx, 1); localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); renderCartStep(); }
function renderCartStep(){
  const summaryStep = document.getElementById("cartStepSummary"); const shippingStep = document.getElementById("cartStepShipping"); const paymentStep = document.getElementById("cartStepPayment");
  const tab1 = document.getElementById("stepTab1"); const tab2 = document.getElementById("stepTab2"); const tab3 = document.getElementById("stepTab3");
  const backBtn = document.getElementById("cartBackActionBtn"); const nextBtn = document.getElementById("cartNextActionBtn");
  if(!summaryStep || !shippingStep || !paymentStep) return;
  summaryStep.classList.add("hidden"); shippingStep.classList.add("hidden"); paymentStep.classList.add("hidden");
  [tab1, tab2, tab3].forEach(t=>{ if(t) t.className = "step-tab"; });
  if (checkoutStep === 1) { summaryStep.classList.remove("hidden"); if(tab1) tab1.className = "step-tab active"; if(backBtn) backBtn.classList.add("hidden"); if(nextBtn) nextBtn.querySelector("span").textContent = "Proceed to Shipping"; renderCartSummaryTab(); }
  else if (checkoutStep === 2) { shippingStep.classList.remove("hidden"); if(tab2) tab2.className = "step-tab active"; if(backBtn) backBtn.classList.remove("hidden"); if(nextBtn) nextBtn.querySelector("span").textContent = "Proceed to Payment"; }
  else if (checkoutStep === 3) { paymentStep.classList.remove("hidden"); if(tab3) tab3.className = "step-tab active"; if(backBtn) backBtn.classList.remove("hidden"); if(nextBtn) nextBtn.querySelector("span").textContent = "Submit Secure Order"; }
}
function renderCartSummaryTab(){
  const itemsContainer = document.getElementById("cartItemsList"); const subtotalEl = document.getElementById("cartSubtotal"); const deliveryEl = document.getElementById("cartDeliveryFee"); const totalEl = document.getElementById("cartTotal");
  if(!itemsContainer) return;
  if (cart.length === 0) {
    itemsContainer.innerHTML = `<div class="py-16 text-center text-gray-500 font-semibold text-xs">Your Shopping Cart is empty. Select a premium gadget to begin!</div>`;
    if(subtotalEl) subtotalEl.textContent = "GH₵ 0"; if(deliveryEl) deliveryEl.textContent = "GH₵ 0"; if(totalEl) totalEl.textContent = "GH₵ 0";
    const nextBtn = document.getElementById("cartNextActionBtn"); if(nextBtn){ nextBtn.disabled = true; nextBtn.classList.add("opacity-50","cursor-not-allowed"); } return;
  }
  const nextBtn = document.getElementById("cartNextActionBtn"); if(nextBtn){ nextBtn.disabled = false; nextBtn.classList.remove("opacity-50","cursor-not-allowed"); }
  itemsContainer.innerHTML = cart.map((item, idx) => {
    const itemPrice = item.price + (item.price_adjustment || 0); const itemTotal = itemPrice * item.qty; const variantsLabel = [item.selected_color, item.selected_storage].filter(Boolean).join(" / ");
    return `<div class="flex items-center gap-3 border-b border-gray-100 pb-3"><div class="h-14 w-14 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden"><img src="${item.image_url}" alt="${item.name}" loading="lazy" class="max-h-full max-w-full object-contain" /></div><div class="flex-1 min-w-0"><h5 class="text-xs font-bold text-[#0b1a38] truncate leading-tight">${item.name}</h5>${variantsLabel ? `<p class="text-[10px] text-gray-500 mt-0.5 truncate">${variantsLabel}</p>` : ""}<p class="text-[11px] text-[#f58c14] font-black mt-0.5">GH₵ ${itemPrice.toLocaleString()}</p><div class="flex items-center gap-2 mt-1.5"><button onclick="modifyCartQty(${idx}, -1)" class="bg-white hover:bg-gray-50 border border-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded-lg text-xs text-[#0b1a38]">-</button><span class="text-xs font-bold text-[#0b1a38] w-4 text-center">${item.qty}</span><button onclick="modifyCartQty(${idx}, 1)" class="bg-white hover:bg-gray-50 border border-gray-200 h-6 w-6 font-bold flex items-center justify-center rounded-lg text-xs text-[#0b1a38]">+</button></div></div><div class="text-right shrink-0"><span class="text-xs font-black text-[#0b1a38] block">GH₵ ${itemTotal.toLocaleString()}</span><button onclick="removeCartItem(${idx})" class="text-red-500 hover:text-red-600 text-[10px] font-bold uppercase mt-1 block">Remove</button></div></div>`;
  }).join("");
  const subtotalValue = cart.reduce((sum, item) => sum + (item.price + (item.price_adjustment || 0)) * item.qty, 0); const deliveryValue = subtotalValue >= 5000 ? 0 : 150;
  if(subtotalEl) subtotalEl.textContent = `GH₵ ${subtotalValue.toLocaleString()}`; if(deliveryEl) deliveryEl.textContent = deliveryValue === 0 ? "FREE" : `GH₵ ${deliveryValue.toLocaleString()}`; if(totalEl) totalEl.textContent = `GH₵ ${(subtotalValue + deliveryValue).toLocaleString()}`;
}
function handleCartNextAction(){
  if (checkoutStep === 1) { checkoutStep = 2; renderCartStep(); }
  else if (checkoutStep === 2) {
    const name = document.getElementById("shippingName")?.value.trim(); const phone = document.getElementById("shippingPhone")?.value.trim();
    if (!name || !phone) { showToast("Please enter your full name and contact number."); return; }
    checkoutStep = 3; renderCartStep();
  } else if (checkoutStep === 3) { submitCheckoutOrder(); }
}
function handleCartBackAction(){ if (checkoutStep > 1) { checkoutStep--; renderCartStep(); } }

async function submitCheckoutOrder(){
  const name = document.getElementById("shippingName")?.value.trim() || ""; const phone = document.getElementById("shippingPhone")?.value.trim() || ""; const area = document.getElementById("shippingArea")?.value || ""; const street = document.getElementById("shippingStreet")?.value.trim() || "";
  const paymentOpt = document.querySelector('input[name="paymentOption"]:checked'); const paymentMethod = paymentOpt ? paymentOpt.value : "momo";
  const subtotalValue = cart.reduce((sum, item) => sum + (item.price + (item.price_adjustment || 0)) * item.qty, 0); const deliveryValue = subtotalValue >= 5000 ? 0 : 150; const totalAmount = subtotalValue + deliveryValue;
  const referenceCode = "VG-" + Date.now().toString().slice(-6);
  const orderData = { reference_code: referenceCode, customer_name: name, customer_phone: phone, customer_area: area, customer_street: street, payment_method: paymentMethod, total_amount: totalAmount, items: cart.map(i => ({ id: i.id, name: i.name, image_url: i.image_url, qty: i.qty, price: i.price + (i.price_adjustment || 0), selected_color: i.selected_color, selected_storage: i.selected_storage })) };
  if (paymentMethod === "card") openPaystackTerminal(orderData); else { const success = await db.createOrder(orderData); if (success) finalizeSuccessfulOrder(orderData); else showToast("Failed to record order. Please try again."); }
}
function finalizeSuccessfulOrder(order){
  const itemsText = order.items.map(i => { const variants = [i.selected_color, i.selected_storage].filter(Boolean).join("/"); return `* ${i.name} ${variants ? `(${variants})` : ""} - Qty ${i.qty} - GH₵ ${(i.price * i.qty).toLocaleString()}`; }).join("\\n");
  const paymentNames = { momo: "Mobile Money Invoice", cod: "Cash on Delivery", card: "Paid via Paystack Secure Card" };
  const textReceipt = `*VALMONT GADGETS - NEW ORDER*\\nReference Code: *#${order.reference_code}*\\n\\n*ITEMS:*\\n${itemsText}\\n\\n*SHIPPING SUMMARY:*\\nSubtotal: GH₵ ${(order.total_amount - (order.total_amount >= 5000 ? 0 : 150)).toLocaleString()}\\nDelivery Fee: ${order.total_amount >= 5000 ? "FREE" : "GH₵ 150"}\\n*TOTAL BILL: GH₵ ${order.total_amount.toLocaleString()}*\\n\\n*PAYMENT METHOD:* ${paymentNames[order.payment_method]}\\n\\n*DELIVERY DETAILS:*\\nRecipient: ${order.customer_name}\\nPhone: ${order.customer_phone}\\nRegion/Area: ${order.customer_area}\\nAddress/Landmark: ${order.customer_street || "To be provided via chat"}\\n\\n_Thank you for choosing Valmont Gadgets Ghana. We are preparing your shipment!_`;
  const waUrl = `https://wa.me/233542451578?text=${encodeURIComponent(textReceipt)}`;
  cart = []; localStorage.setItem("valmont_cart", JSON.stringify(cart)); updateCartBadge(); closeCartDrawer(); window.open(waUrl, "_blank"); showToast(`Order #${order.reference_code} submitted. Opening WhatsApp checkout...`);
}

// Paystack
let currentPendingOrder = null;
function openPaystackTerminal(order){
  currentPendingOrder = order;
  const amountEl = document.getElementById("paystackAmount"); if(amountEl) amountEl.textContent = `GH₵ ${order.total_amount.toLocaleString()}`;
  const formContainer = document.getElementById("paystackFormContainer");
  if(formContainer) formContainer.innerHTML = `<div class="space-y-3"><div><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Card Holder Name</label><input type="text" value="${order.customer_name}" class="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-[#0b1a38] text-xs outline-none focus:border-[#f58c14]" /></div><div><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Card Number</label><input type="text" placeholder="4012 8834 1120 4456" class="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-[#0b1a38] text-xs outline-none focus:border-[#f58c14]" /></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expiry Date</label><input type="text" placeholder="MM/YY" class="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-[#0b1a38] text-xs outline-none focus:border-[#f58c14]" /></div><div><label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">CVV</label><input type="password" placeholder="332" class="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-[#0b1a38] text-xs outline-none focus:border-[#f58c14]" /></div></div></div>`;
  const modal = document.getElementById("paystackModal"); if(modal) modal.classList.remove("hidden");
  const fc = document.getElementById("paystackFormContainer"); if(fc) fc.classList.remove("hidden");
  const loader = document.getElementById("paystackLoader"); if(loader) loader.classList.add("hidden");
  const success = document.getElementById("paystackSuccess"); if(success) success.classList.add("hidden");
  const footer = document.getElementById("paystackFooter"); if(footer) footer.classList.remove("hidden");
}
function closePaystackTerminal(){ const m = document.getElementById("paystackModal"); if(m) m.classList.add("hidden"); currentPendingOrder = null; }
async function processSimulatedPaystackPayment(){
  if (!currentPendingOrder) return;
  const fc = document.getElementById("paystackFormContainer"); const pf = document.getElementById("paystackFooter"); const loader = document.getElementById("paystackLoader");
  if(fc) fc.classList.add("hidden"); if(pf) pf.classList.add("hidden"); if(loader) loader.classList.remove("hidden"); loader.classList.add("flex");
  const statusMsg = document.getElementById("paystackLoaderStatus");
  if(statusMsg) statusMsg.textContent = "Validating card details with your bank..."; await new Promise(r => setTimeout(r, 1500));
  if(statusMsg) statusMsg.textContent = "Authorizing transaction via secure 3D-Secure gate..."; await new Promise(r => setTimeout(r, 1500));
  if(statusMsg) statusMsg.textContent = "Finalizing secure GH₵ settlement..."; await new Promise(r => setTimeout(r, 1200));
  if(loader) loader.classList.add("hidden");
  const successEl = document.getElementById("paystackSuccess"); if(successEl){ successEl.classList.remove("hidden"); successEl.classList.add("flex"); }
  await new Promise(r => setTimeout(r, 1500));
  const success = await db.createOrder(currentPendingOrder);
  if (success) { const orderToFinalize = { ...currentPendingOrder }; closePaystackTerminal(); finalizeSuccessfulOrder(orderToFinalize); } else { showToast("Error recording payment. Please contact support."); closePaystackTerminal(); }
}

// Profile
function initUserProfile(){
  const profileLabel = document.getElementById("accountLabel"); const profileForm = document.getElementById("profileModalForm"); const profileDetailsView = document.getElementById("profileDetailsView");
  if (!userProfile) { if (profileLabel) profileLabel.textContent = "Sign In"; if (profileForm) profileForm.classList.remove("hidden"); if (profileDetailsView) profileDetailsView.classList.add("hidden"); }
  else {
    if (profileLabel) profileLabel.textContent = userProfile.name.split(" ")[0]; if (profileForm) profileForm.classList.add("hidden");
    if (profileDetailsView) { profileDetailsView.classList.remove("hidden"); const dn = document.getElementById("profileDispName"); if(dn) dn.textContent = userProfile.name; const dp = document.getElementById("profileDispPhone"); if(dp) dp.textContent = userProfile.phone; const de = document.getElementById("profileDispEmail"); if(de) de.textContent = userProfile.email; }
    const sn = document.getElementById("shippingName"); if(sn) sn.value = userProfile.name; const sp = document.getElementById("shippingPhone"); if(sp) sp.value = userProfile.phone;
  }
}
function handleProfileSubmit(event){
  event.preventDefault();
  const name = document.getElementById("profileInputName")?.value.trim(); const phone = document.getElementById("profileInputPhone")?.value.trim(); const email = document.getElementById("profileInputEmail")?.value.trim();
  if (!name || !phone || !email) { showToast("Please fill in all details."); return; }
  userProfile = { name, phone, email }; localStorage.setItem("valmont_user", JSON.stringify(userProfile)); initUserProfile(); closeProfileModal(); showToast(`Welcome to Valmont Gadgets, ${name}!`);
}
function handleProfileSignOut(){ userProfile = null; localStorage.removeItem("valmont_user"); const sn = document.getElementById("shippingName"); if(sn) sn.value = ""; const sp = document.getElementById("shippingPhone"); if(sp) sp.value = ""; initUserProfile(); closeProfileModal(); showToast("Signed out of your customer profile."); }
function openProfileModal(){ const m = document.getElementById("profileModal"); if(m) m.classList.remove("hidden"); }
function closeProfileModal(){ const m = document.getElementById("profileModal"); if(m) m.classList.add("hidden"); }

// Saved Address/Payment for Checkout (customer profile feature)
function loadSavedAddressesToCheckout(){
  const wrap = document.getElementById("savedAddressSelectWrap"); const sel = document.getElementById("savedAddressSelect");
  if(!wrap || !sel) return;
  const addresses = JSON.parse(localStorage.getItem("valmont_customer_addresses") || "[]");
  if(addresses.length === 0){ wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  sel.innerHTML = `<option value="">-- Choose saved address --</option>` + addresses.map(a=>`<option value="${a.id}">${a.name} • ${a.zone} • ${a.street.slice(0,30)}</option>`).join("");
  sel.onchange = () => {
    const chosen = addresses.find(x=>x.id===sel.value); if(!chosen) return;
    const n = document.getElementById("shippingName"); if(n) n.value = chosen.recipient || chosen.name || "";
    const ph = document.getElementById("shippingPhone"); if(ph) ph.value = chosen.phone || "";
    const area = document.getElementById("shippingArea"); if(area) area.value = chosen.zone || "Accra Central";
    const street = document.getElementById("shippingStreet"); if(street) street.value = `${chosen.street||""} ${chosen.landmark? '('+chosen.landmark+')':''}`.trim();
  };
}
function loadSavedPaymentsToCheckout(){
  const wrap = document.getElementById("savedPaymentWrap"); const sel = document.getElementById("savedPaymentSelect");
  if(!wrap || !sel) return;
  const methods = JSON.parse(localStorage.getItem("valmont_saved_payment_methods") || "[]");
  if(methods.length === 0){ wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  sel.innerHTML = `<option value="">-- Choose saved payment --</option>` + methods.map(m=>`<option value="${m.id}">${m.type.toUpperCase()} • ${m.label} • ${m.last4? '****'+m.last4 : ''}</option>`).join("");
  sel.onchange = () => {
    const chosen = methods.find(x=>x.id===sel.value); if(!chosen) return;
    const radio = document.querySelector(`input[name="paymentOption"][value="${chosen.type}"]`); if(radio) radio.checked = true;
  };
}

// WhatsApp - label fix
function shareProductOnWhatsApp(){
  if (!activeQuickViewProduct) return; const p = activeQuickViewProduct; const totalVal = p.price + selectedStoragePriceAdjustment;
  const text = `Hello Valmont Gadgets, I would like to order *${p.name}* (GH₵ ${totalVal.toLocaleString()}). Specs: ${p.specs}. Please confirm genuine sealed stock and delivery to Accra. Link: ${window.location.origin}/?product=${p.id}`;
  window.open(`https://wa.me/233542451578?text=${encodeURIComponent(text)}`, "_blank");
}
function launchWhatsAppHelp(){
  const text = "Hello Valmont Gadgets, I need help with purchasing some genuine electronics. Please connect me to an executive sales rep. I am contacting from the website.";
  window.open(`https://wa.me/233542451578?text=${encodeURIComponent(text)}`, "_blank");
}

function initFlashSaleTimer(){
  const display = document.getElementById("flashClockDisplay"); if (!display) return;
  const updateTimer = () => {
    const now = new Date(); const tonight = new Date(); tonight.setHours(23, 59, 59, 999); let diff = tonight - now; if (diff < 0) diff = 1000 * 60 * 60 * 4;
    const h = Math.floor(diff / (1000 * 60 * 60)); const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((diff % (1000 * 60)) / 1000);
    display.textContent = `${h.toString().padStart(2, "0")}h : ${m.toString().padStart(2, "0")}m : ${s.toString().padStart(2, "0")}s`;
  }; updateTimer(); setInterval(updateTimer, 1000);
}
function initFloatingActions(){
  const topBtn = document.getElementById("backToTopBtn");
  window.addEventListener("scroll", () => {
    if (!topBtn) return;
    if (window.scrollY > 500) { topBtn.classList.add("show"); }
    else { topBtn.classList.remove("show"); }
  });
  if (topBtn) topBtn.addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); });
}

function initUIEventListeners(){
  // Category pills - white template active state
  const setActivePill = (activeBtn) => {
    const activeCat = activeBtn?.dataset?.categoryPill || activeBtn?.getAttribute('data-category-pill');
    document.querySelectorAll("[data-category-pill]").forEach(p => {
      // Reset all to inactive style
      p.classList.remove("bg-[#0b1a38]", "bg-gold", "text-white", "text-slate-900", "bg-slate-panel", "text-slate-300");
      p.classList.add("bg-white", "text-[#0b1a38]", "border", "border-gray-200");
      // mobile pills are rounded-full, keep accordingly but ensure not active bg
      if (p.classList.contains("mobile-cat-pill")) {
        p.classList.remove("bg-[#0b1a38]", "text-white");
        p.classList.add("bg-white", "text-[#0b1a38]");
      }
    });
    if (!activeBtn) return;
    // Active style
    activeBtn.classList.remove("bg-white", "text-[#0b1a38]", "bg-slate-panel", "text-slate-300", "border", "border-gray-200");
    activeBtn.classList.add("bg-[#0b1a38]", "text-white");
  };
  document.querySelectorAll("[data-category-pill]").forEach(btn => {
    btn.addEventListener("click", () => {
      setActivePill(btn);
      activeCategory = btn.dataset.categoryPill;
      renderStorefrontGrid();
    });
  });

  // Price filter
  document.querySelectorAll("[data-price-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-price-filter]").forEach(p => {
        p.classList.remove("bg-[#0b1a38]", "text-white"); p.classList.add("text-gray-500");
      });
      btn.classList.remove("text-gray-500"); btn.classList.add("bg-[#0b1a38]", "text-white");
      activePriceFilter = btn.dataset.priceFilter; renderStorefrontGrid();
    });
  });

  const sortSel = document.getElementById("sortSelector");
  if (sortSel) sortSel.addEventListener("change", (e) => { activeSort = e.target.value; renderStorefrontGrid(); });

  const bindSearchInput = (inputEl, buttonEl) => {
    if (!inputEl) return;
    const handleSearch = () => {
      activeSearch = inputEl.value;
      if (searchInput && searchInput !== inputEl) searchInput.value = activeSearch;
      if (mobileSearchInput && mobileSearchInput !== inputEl) mobileSearchInput.value = activeSearch;
      // sync visible mobile input if hidden duplicate
      renderStorefrontGrid();
      const feed = document.getElementById("store-feed"); if(feed) feed.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if(buttonEl) buttonEl.addEventListener("click", handleSearch);
    inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });
    // live search debounce
    let debounce; inputEl.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(()=>{ activeSearch = inputEl.value; renderStorefrontGrid(); }, 400); });
  };
  bindSearchInput(searchInput, searchBtn);
  bindSearchInput(mobileSearchInput, mobileSearchBtn);
  bindFaqAccordions();
}
function bindFaqAccordions(){
  document.querySelectorAll(".faq-header").forEach(hdr => {
    hdr.onclick = () => {
      const item = hdr.parentElement; const body = item.querySelector(".faq-body"); const active = item.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach(other => { other.classList.remove("active"); const otherBody = other.querySelector(".faq-body"); if (otherBody) otherBody.style.maxHeight = null; });
      if (!active && body) { item.classList.add("active"); body.style.maxHeight = body.scrollHeight + "px"; }
    };
  });
}
function filterCategory(cat){ const btn = document.querySelector(`[data-category-pill="${cat}"]`); if (btn) { btn.click(); const feed = document.getElementById("store-feed"); if(feed) feed.scrollIntoView({ behavior: "smooth" }); } }
function showToast(message){ const toast = document.getElementById("toastNotification"); if (!toast) return; toast.textContent = message; toast.classList.add("show"); setTimeout(() => { toast.classList.remove("show"); }, 3500); }
