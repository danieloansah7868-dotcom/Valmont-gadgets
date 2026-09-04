/**
 * src/data/keywords.js — single source of truth for the search vocabulary.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Ghanaian customers do not search the way the catalog is labelled. A product
 * titled "iPhone 15 Pro Max 256GB — Dual SIM" is found by someone typing
 * "iphone 15 pro max", "iphone", "phone", or even "foni". This module holds,
 * per category/brand/service, the colloquial short terms customers type
 * (`terms`) plus the long-tail intent phrases they search (`phrases`).
 *
 * It is consumed by three pieces of the site:
 *   1. The visible "also searched as / also known as" copy on every category
 *      and brand landing page (visible body text is what ranks).
 *   2. The meta-keywords array on each landing page (harmless; Bing/Yandex
 *      still look at it, Google ignores it since 2009).
 *   3. The client-side synonym expansion used by on-site search in app.js
 *      (a score boost — exact matches still win).
 *
 * DO NOT treat this file as a hidden keyword dump. Every term listed here
 * MUST appear somewhere visible on the page that targets it, otherwise
 * Google will treat it as keyword stuffing.
 */

// Location axis: the primary market we serve. Short enough to add as a
// visible suffix on titles/descriptions without becoming doorway spam.
// Only Accra has real differentiated logistics (same-day free delivery above
// GH₵ 5,000), so we do NOT generate city × category combo pages for every
// town in Ghana — that would be a doorway-page pattern.
const LOCATIONS = ['Accra', 'Ghana'];

// Site-wide terms: words people use for anything Valmont sells.
const SITE_TERMS = [
  'gadgets', 'electronics', 'phones', 'phone shop', 'electronics shop',
  'valmont', 'valmont gadgets', 'genuine phones', 'original phones',
  'sealed phones', 'uk used phones', 'london used', 'home used',
  'momo', 'mobile money', 'pay on delivery', 'free delivery accra',
  'swap phone', 'trade in', 'installment', 'hire purchase',
  'ghana phones', 'accra phones', 'cheap phones ghana',
];

/**
 * Each category object:
 *   slug       URL path segment under /c/ (also the `category` id in catalog.js)
 *   h1         primary phrase, shown as H1
 *   intro      ~160 word body block written for a human
 *   terms      short colloquial synonyms Ghanaians type, including wrong-
 *              but-common spellings and regional slang
 *   phrases    long-tail intent phrases used in FAQ and visible copy
 *   minPrice   filled at build time from real catalogue data (do not hardcode)
 */
const CATEGORIES = [
  {
    slug: 'iphones',
    h1: 'iPhones & Apple Phones in Ghana',
    shortLabel: 'iPhones',
    terms: ['iphone', 'iphones', 'apple phone', 'apple phones', 'ios', 'ifon', 'foni', 'iphones ghana', 'iphone accra', 'apple ghana', 'dual sim iphone', 'sealed iphone', 'uk used iphone'],
    phrases: [
      'iphone price in ghana',
      'buy iphone in accra',
      'original sealed iphone ghana',
      'best iphone for the money in ghana',
      'uk used iphone accra',
      'iphone 15 pro max price ghana',
      'dual sim iphone ghana',
    ],
  },
  {
    slug: 'samsung',
    h1: 'Samsung Galaxy Phones in Ghana',
    shortLabel: 'Samsung Galaxy',
    terms: ['samsung', 'galaxy', 'samsung phone', 'samsung phones', 'android', 'samsung ghana', 's pen phone', 's24 ultra', 's23 ultra', 'galaxy a', 'samsung fold'],
    phrases: [
      'samsung phone price in ghana',
      'samsung galaxy s24 ultra accra',
      'buy samsung in ghana',
      'sealed samsung ghana',
      'samsung a55 price ghana',
      'uk used samsung phones',
    ],
  },
  {
    slug: 'android',
    h1: 'Android Flagship Phones in Ghana',
    shortLabel: 'Android Flagships',
    terms: ['android', 'android phone', 'google pixel', 'oneplus', 'xiaomi', 'redmi', 'tecno', 'infinix', 'cheap android', 'flagship android'],
    phrases: [
      'android phone price in ghana',
      'best android phone ghana',
      'google pixel ghana',
      'xiaomi redmi ghana',
      'oneplus ghana price',
    ],
  },
  {
    slug: 'tablets',
    h1: 'iPads & Tablets in Ghana',
    shortLabel: 'Tablets & iPads',
    terms: ['ipad', 'ipads', 'tablet', 'tablets', 'apple ipad', 'ipad pro', 'ipad air', 'samsung tab', 'android tablet'],
    phrases: [
      'ipad price in ghana',
      'buy ipad accra',
      'ipad pro m4 ghana',
      'tablet for students ghana',
      'sealed ipad ghana',
    ],
  },
  {
    slug: 'smartwatches',
    h1: 'Smartwatches & Wearables in Ghana',
    shortLabel: 'Smartwatches',
    terms: ['smartwatch', 'smart watch', 'apple watch', 'iwatch', 'samsung watch', 'galaxy watch', 'wearable', 'fitness watch'],
    phrases: [
      'apple watch price in ghana',
      'samsung galaxy watch ghana',
      'buy smartwatch accra',
      'best smartwatch ghana',
    ],
  },
  {
    slug: 'laptops',
    h1: 'Executive Laptops in Ghana',
    shortLabel: 'Laptops',
    terms: ['laptop', 'laptops', 'macbook', 'mac book', 'apple laptop', 'hp laptop', 'dell laptop', 'hp spectre', 'dell xps', 'executive laptop', 'work laptop'],
    phrases: [
      'laptop price in ghana',
      'macbook price in ghana',
      'hp laptop accra',
      'dell xps ghana',
      'buy laptop in accra',
      'sealed laptop ghana',
      'best laptop for work ghana',
    ],
  },
  {
    slug: 'laptop_acc',
    h1: 'Laptop Accessories in Ghana',
    shortLabel: 'Laptop Accessories',
    terms: ['laptop stand', 'mouse', 'usb hub', 'laptop accessory', 'wireless mouse', 'logitech mouse', 'ugreen stand'],
    phrases: [
      'laptop accessories in ghana',
      'wireless mouse accra',
      'usb-c hub ghana',
      'logitech mx master ghana',
    ],
  },
  {
    slug: 'audio',
    h1: 'AirPods, Headphones & Smart Audio in Ghana',
    shortLabel: 'Smart Audio',
    terms: ['airpod', 'airpods', 'headset', 'headphones', 'earpiece', 'earbuds', 'wireless earpiece', 'bluetooth speaker', 'jbl speaker', 'sony headset', 'airpod pro', 'airpod max', 'noise cancelling'],
    phrases: [
      'airpods price in ghana',
      'original airpods accra',
      'sony headphones ghana',
      'jbl bluetooth speaker ghana',
      'wireless earpiece ghana',
    ],
  },
  {
    slug: 'gaming',
    h1: 'Gaming Consoles & Accessories in Ghana',
    shortLabel: 'Gaming & Consoles',
    terms: ['ps5', 'playstation', 'playstation 5', 'nintendo switch', 'console', 'gaming', 'game', 'ps5 ghana', 'slim ps5'],
    phrases: [
      'ps5 price in ghana',
      'playstation 5 accra',
      'buy ps5 in ghana',
      'nintendo switch ghana',
      'uk used ps5 ghana',
    ],
  },
  {
    slug: 'phone_acc',
    h1: 'Phone Cases & Accessories in Ghana',
    shortLabel: 'Phone Accessories',
    terms: ['phone case', 'case', 'pouch', 'screen protector', 'tempered glass', 'magsafe case', 'spigen case', 'phone holder', 'car mount', 'airtag', 'car charger'],
    phrases: [
      'iphone case in ghana',
      'magsafe case accra',
      'screen protector ghana',
      'spigen case ghana',
      'phone car mount ghana',
    ],
  },
  {
    slug: 'phone_parts',
    h1: 'Phone Parts & Spares in Ghana',
    shortLabel: 'Phone Parts',
    terms: ['phone parts', 'screen', 'replacement screen', 'battery', 'phone battery', 'camera glass', 'sim pin', 'gevey sim', 'r-sim', 'unlock chip', 'spares'],
    phrases: [
      'iphone screen replacement ghana',
      'original iphone battery accra',
      'phone parts shop accra',
      'gevey sim ghana',
      'samsung camera glass replacement',
    ],
  },
  {
    slug: 'travel_acc',
    h1: 'Travel, Car & Everyday Gadgets in Ghana',
    shortLabel: 'Travel & Gadgets',
    terms: ['travel gadgets', 'car charger', 'car mount', 'ring light', 'tripod', 'lavalier mic', 'car accessories'],
    phrases: [
      'car phone mount ghana',
      'ring light accra',
      'lavalier microphone ghana',
      'travel gadgets accra',
    ],
  },
  {
    slug: 'chargers',
    h1: 'Chargers, Power Banks & Cables in Ghana',
    shortLabel: 'Power & Chargers',
    terms: ['charger', 'chargers', 'power bank', 'powerbank', 'fast charger', 'usb c', 'type c', 'cable', 'usb cable', 'apple charger', 'samsung charger', 'anker charger', 'gan charger', '65w charger'],
    phrases: [
      'fast charger price in ghana',
      'power bank accra',
      'anker charger ghana',
      'original iphone charger accra',
      'usb c cable ghana',
      '65w gan charger ghana',
    ],
  },
  {
    slug: 'smart_home',
    h1: 'Smart Home & Security Gadgets in Ghana',
    shortLabel: 'Smart Home & Security',
    terms: ['smart bulb', 'wifi bulb', 'security camera', 'smart camera', 'tapo camera', 'smart home', 'home security'],
    phrases: [
      'smart bulb ghana',
      'security camera accra',
      'tapo camera ghana',
      'home security camera ghana',
    ],
  },
  {
    slug: 'networking',
    h1: 'Wi-Fi Routers & Networking in Ghana',
    shortLabel: 'Wi-Fi & Networking',
    terms: ['router', 'wifi', 'wi-fi', 'wifi router', 'mesh wifi', 'tplink', 'tp-link', 'deco mesh', 'archer router', 'internet router'],
    phrases: [
      'wifi router price in ghana',
      'tp-link router accra',
      'mesh wifi ghana',
      'best router for home ghana',
    ],
  },
  {
    slug: 'cameras',
    h1: 'Cameras & Creator Gear in Ghana',
    shortLabel: 'Creator Gear',
    terms: ['ring light', 'microphone', 'content creator', 'youtuber gear', 'lavalier mic', 'creator kit'],
    phrases: [
      'ring light price in ghana',
      'lavalier microphone accra',
      'content creator gear ghana',
      'youtube starter kit ghana',
    ],
  },
];

/**
 * Brand pages — we only emit a page for a brand when we actually stock enough
 * of it to say something real. Each brand page targets brand-intent searches
 * ("samsung s24 ultra", "macbook pro price", "airpods pro 2", "jbl speaker").
 */
const BRANDS = [
  {
    slug: 'apple',
    h1: 'Apple Store Ghana — iPhones, MacBooks, iPads, AirPods, Watch',
    shortLabel: 'Apple',
    match: (p) => /apple|iphone|ipad|macbook|airpod|airtag/i.test(p.brand || '') || /iphone|ipad|macbook|airpod|airtag|apple watch/i.test(p.name),
    terms: ['apple', 'apple store', 'apple ghana', 'apple accra', 'original apple', 'sealed apple', 'apple products'],
    phrases: ['apple store ghana', 'buy apple products accra', 'apple price in ghana', 'original apple ghana'],
  },
  {
    slug: 'samsung-brand',
    h1: 'Samsung Phones & Gadgets in Ghana',
    shortLabel: 'Samsung',
    match: (p) => /samsung/i.test(p.brand || '') || /samsung|galaxy/i.test(p.name),
    terms: ['samsung', 'samsung store', 'samsung ghana', 'galaxy phone', 'original samsung'],
    phrases: ['samsung store ghana', 'samsung galaxy price accra', 'original samsung phones ghana'],
  },
  {
    slug: 'sony',
    h1: 'Sony Headsets & Consoles in Ghana',
    shortLabel: 'Sony',
    match: (p) => /sony|playstation|ps5/i.test(p.brand || '') || /sony|wh-1000xm|playstation|ps5/i.test(p.name),
    terms: ['sony', 'playstation', 'ps5', 'sony headset'],
    phrases: ['sony headphones ghana', 'ps5 price in ghana'],
  },
  {
    slug: 'jbl',
    h1: 'JBL Bluetooth Speakers in Ghana',
    shortLabel: 'JBL',
    match: (p) => /jbl/i.test(p.brand || '') || /jbl/i.test(p.name),
    terms: ['jbl', 'jbl speaker', 'jbl bluetooth'],
    phrases: ['jbl speaker ghana', 'jbl charge 5 price ghana'],
  },
  {
    slug: 'anker',
    h1: 'Anker Chargers & Power Banks in Ghana',
    shortLabel: 'Anker',
    match: (p) => /anker/i.test(p.brand || '') || /anker/i.test(p.name),
    terms: ['anker', 'anker charger', 'anker power bank'],
    phrases: ['anker charger ghana', 'power bank anker accra'],
  },
  {
    slug: 'hp',
    h1: 'HP Laptops in Ghana',
    shortLabel: 'HP',
    match: (p) => /hp/i.test(p.brand || '') || /hp |hp\b/i.test(p.name),
    terms: ['hp laptop', 'hp spectre', 'hp elitebook'],
    phrases: ['hp laptop price ghana', 'hp spectre x360 accra'],
  },
  {
    slug: 'dell',
    h1: 'Dell Laptops in Ghana — XPS, Latitude, Inspiron',
    shortLabel: 'Dell',
    match: (p) => /dell/i.test(p.brand || '') || /dell/i.test(p.name),
    terms: ['dell laptop', 'dell xps', 'xps laptop'],
    phrases: ['dell xps ghana', 'dell laptop price accra'],
  },
  {
    slug: 'logitech',
    h1: 'Logitech Mice & Accessories in Ghana',
    shortLabel: 'Logitech',
    match: (p) => /logitech/i.test(p.brand || '') || /logitech/i.test(p.name),
    terms: ['logitech mouse', 'logitech mx', 'mx master'],
    phrases: ['logitech mx master ghana'],
  },
  {
    slug: 'nintendo',
    h1: 'Nintendo Switch in Ghana',
    shortLabel: 'Nintendo',
    match: (p) => /nintendo/i.test(p.brand || '') || /nintendo/i.test(p.name),
    terms: ['nintendo switch', 'switch oled'],
    phrases: ['nintendo switch ghana price'],
  },
  {
    slug: 'xiaomi',
    h1: 'Xiaomi & Redmi Phones in Ghana',
    shortLabel: 'Xiaomi',
    match: (p) => /xiaomi|redmi/i.test(p.brand || '') || /xiaomi|redmi/i.test(p.name),
    terms: ['xiaomi', 'redmi', 'redmi note'],
    phrases: ['redmi note 13 ghana price', 'xiaomi phone accra'],
  },
  {
    slug: 'google',
    h1: 'Google Pixel Phones in Ghana',
    shortLabel: 'Google',
    match: (p) => /google/i.test(p.brand || '') || /google pixel/i.test(p.name),
    terms: ['google pixel', 'pixel phone'],
    phrases: ['google pixel ghana price'],
  },
  {
    slug: 'oneplus',
    h1: 'OnePlus Phones in Ghana',
    shortLabel: 'OnePlus',
    match: (p) => /oneplus/i.test(p.brand || '') || /oneplus/i.test(p.name),
    terms: ['oneplus', 'one plus'],
    phrases: ['oneplus 12 ghana price'],
  },
  {
    slug: 'tp-link',
    h1: 'TP-Link Routers, Tapo Cameras & Smart Home in Ghana',
    shortLabel: 'TP-Link',
    match: (p) => /tp-link|tplink/i.test(p.brand || '') || /tp-link|tapo|archer|deco/i.test(p.name),
    terms: ['tp-link', 'tplink', 'tapo', 'archer router', 'deco mesh'],
    phrases: ['tp-link router ghana', 'tapo camera accra', 'deco mesh wifi ghana'],
  },
];

/**
 * Service pages that already exist as HTML files but whose SEO can be
 * tightened. We list them here so the sitemap generator can set priorities
 * correctly and the keyword module can make sure they appear in cross-links.
 */
const SERVICES = [
  { slug: 'used',      file: 'used.html',    h1: 'UK & US Used Phones in Ghana' },
  { slug: 'swap',      file: 'swap.html',    h1: 'Phone Swap & Trade-In in Ghana' },
  { slug: 'drop',      file: 'drop.html',    h1: "Today's Drop — Daily Flash Deals" },
  { slug: 'partner',   file: 'partner.html', h1: 'Dealer & Wholesale Portal' },
  { slug: 'wholesale', file: 'wholesale.html', h1: 'Wholesale Account — Buy in Bulk' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, BRANDS, SERVICES, LOCATIONS, SITE_TERMS };
}
if (typeof window !== 'undefined') {
  window.VALMONT_KEYWORDS = { CATEGORIES, BRANDS, SERVICES, LOCATIONS, SITE_TERMS };
}
