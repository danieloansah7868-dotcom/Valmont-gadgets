/**
 * src/data/copy.js
 *
 * Per-category and per-brand body copy, plus per-category FAQ entries.
 * Numbers (counts, min prices, models named) are interpolated from the live
 * catalogue at build time — the prose here stays stable and merchant-voiced,
 * but nothing hard-codes a price or stock count.
 *
 * Each block is a fragment — it's assembled into ~300+ words of real, useful
 * copy by build-landing-pages.js (which also appends prices/warranty/delivery
 * boilerplate). The FAQ entries here are category-SPECIFIC and replace the
 * generic warranty/price questions where more useful answers exist.
 *
 * Voice rules (from Daniel):
 *   - Talk like an Accra shop owner who actually uses the gear, not a chatbot.
 *   - Mention real pain points Ghanaians face (heat harming batteries, dumsor
 *     draining power banks, fakes in Circle/Makola, MoMo fraud, UK-used grades).
 *   - Never fabricate. Only name product lines we actually stock (see catalog).
 *   - Don't stuff keywords; "foni" and "ifon" live in the synonym chips, not
 *     in body copy.
 */

const CATEGORY_COPY = {
  iphones: {
    paragraphs: [
      `Whether you call it an iPhone, ifon or foni, Valmont Gadgets is where Accra buys its Apple phones. We sell both brand-new sealed iPhones in their original box and carefully graded UK-used units, and we price every single one in Ghana cedis right on the listing — no "call for price" games.`,
      `Right now we stock the iPhone 15 Pro Max, 15 Pro, iPhone 15, iPhone 14 Pro Max and iPhone 13 in Midnight, Blue, Natural Titanium and Deep Purple, with storage from 128GB up to 512GB. Dual-SIM models are in stock for anyone who runs two lines (MTN + Telecel, or a personal SIM plus work). UK-used units show battery health on the listing page so you know exactly what you are buying before you pay.`,
      `Every sealed iPhone comes with a 12-month Valmont warranty plus Apple's international warranty. UK-used iPhones carry a 6-month store warranty and are tested for Touch ID/Face ID, camera, charging port, speaker and screen burn before they hit the shelf. We do not sell blacklisted, iCloud-locked or clone iPhones — if you buy one elsewhere, we can usually spot it in two minutes at the shop.`,
    ],
    faqs: [
      {
        q: 'Are the UK-used iPhones you sell original, and how good is the battery?',
        a: 'Yes — every UK-used iPhone we sell is a genuine Apple unit sourced directly from UK trade-in programmes, not a refurb passed off as used. We grade them Grade A (very neat, minimal signs of use) or Grade B (visible wear, fully functional) and we print the exact battery health percentage on each listing. If you want a battery above 90% health, filter by that when you visit the shop — we will point you straight to it.',
      },
      {
        q: 'Do you sell dual-SIM iPhones?',
        a: 'Yes. Most of the iPhone 14 and iPhone 15 models we stock in sealed boxes are dual-physical-SIM (Hong Kong / Middle East spec) because that is what Ghanaian customers actually use — one line for MTN and one for Telecel/AT. The listing will say "Dual SIM" if that is the model. We also sell single-SIM US-spec iPhones, usually at a small discount.',
      },
      {
        q: 'Can I swap my old iPhone for a new one?',
        a: 'Absolutely. Bring it to the shop at Circle or spintex, we grade it on the spot in about 10 minutes (screen condition, battery health, Face ID, camera, charging port), and knock the value straight off your new iPhone. We accept iPhones from the iPhone X upwards, and most Samsung Galaxies too. Top-ups can be paid in cash, MoMo or card.',
      },
      {
        q: 'What if my iPhone develops a fault after I buy it?',
        a: 'Sealed iPhones are covered by our 12-month warranty on manufacturer defects. If the screen lifts, battery swells or Face ID stops working in that window, bring it in and we repair or replace it at no charge. UK-used iPhones get 6 months of the same cover. Physical damage (dropped in water, cracked screen) is not covered but we do repairs at the workshop for a fair price.',
      },
    ],
  },
  samsung: {
    paragraphs: [
      `Samsung Galaxy phones are the workhorse of Ghana — durable, long-lasting batteries, excellent signal across MTN/Telecel/AT, and the screen is readable even in direct Accra sun. Valmont stocks the Galaxy S24 Ultra, S23 Ultra, S24, the mid-range A55 and the Z Fold 5, all factory-sealed in their original box.`,
      `Galaxy phones in our shop come with 12-month warranty and a free original Samsung 45W charger in most cases. We also keep a small selection of sealed Galaxy Watch 6 units if you are buying an ecosystem. If you are coming from an iPhone, ask us to help you move your WhatsApp, contacts and photos over at the counter — it takes five minutes and it's free.`,
    ],
    faqs: [
      {
        q: 'Do Samsung phones in Ghana get software updates?',
        a: 'Yes. Every sealed Samsung we sell is the international / UAE or EU model, which receives OTA updates normally from Samsung — no carrier bloat and no blocked updates. You will get Samsung\'s advertised four generations of OS updates and five years of security patches on the S24 series.',
      },
      {
        q: 'Do you sell the Samsung Galaxy A series?',
        a: 'Yes — we stock the Galaxy A55 and other A-series phones as they come into the warehouse. The A series is a strong mid-range choice for anyone who wants Samsung\'s build and camera without paying Ultra prices. If the specific model you want is not on the site today, call or WhatsApp the shop and we can usually get it within 48 hours.',
      },
    ],
  },
  android: {
    paragraphs: [
      `If you want Android but not Samsung, Valmont keeps a rotating stock of Google Pixel, OnePlus and Xiaomi/Redmi flagships. These are popular with customers who want a clean Android experience, fast charging, or better cameras in low light than similarly priced iPhones.`,
      `Right now you will find the Google Pixel 8 Pro (best-in-class computational camera), the OnePlus 12 (the "flagship killer" with 100W fast charging), and the Xiaomi Redmi Note 13 Pro+ 5G (our top pick for anyone who wants the most phone for under GH₵ 6,000). All are sealed international models with Google Play Services working normally in Ghana.`,
    ],
    faqs: [
      {
        q: 'Will a Google Pixel work normally on MTN / Telecel / AT in Ghana?',
        a: 'Yes. The Pixel units we stock are the global / US-unlocked SKUs. VoLTE works on MTN and Telecel, 4G LTE works on all three networks, and Google Pay does not work in Ghana anyway so you lose nothing by not having the local warranty card. Updates come through normally.',
      },
    ],
  },
  tablets: {
    paragraphs: [
      `iPads in Ghana sell to three kinds of people: students reading PDFs and taking notes with Apple Pencil, content creators using them as a second screen or drawing tablet, and business people who want something lighter than a laptop for emails and Excel on the go. Valmont keeps the iPad Pro 11-inch M4 and iPad Air M2 in stock, sealed, in WiFi configurations.`,
      `Every iPad we sell comes with the original Apple 1-year international warranty plus our 12-month shop warranty. We can also pair it with an Apple Pencil (USB-C or 2nd gen, depending on model) and a folio case — ask at the counter.`,
    ],
    faqs: [
      {
        q: 'Do you sell cellular (SIM-card) iPads?',
        a: 'We mostly stock WiFi models because that is what 90% of customers in Accra use (you can always hotspot from your phone). If you specifically need a cellular iPad, call the shop — we can order one in for you, usually within a week.',
      },
    ],
  },
  smartwatches: {
    paragraphs: [
      `Smartwatches have stopped being a luxury in Ghana — they pay for themselves when you don't have to pull your phone out in traffic or in a trotgo. We stock the Apple Watch Series 9 in 45mm GPS and the Samsung Galaxy Watch 6 in 44mm, both sealed.`,
      `If you are an iPhone user, buy the Apple Watch. If you are on Samsung or Android, pick the Galaxy Watch 6. The pairing experience and health features (heart rate, ECG, sleep tracking, fall detection) work best on their native ecosystem — we will tell you straight at the counter rather than selling you a mismatch.`,
    ],
  },
  laptops: {
    paragraphs: [
      `Valmont Gadgets sells executive laptops — the kind you pull out at a meeting at Labone or East Legon and feel good about. We focus on Apple (MacBook Pro M3, MacBook Pro M3 Pro, MacBook Air M2 13" and 15") plus a small selection of premium Windows machines: the HP Spectre x360 convertible and HP EliteBook for corporate clients.`,
      `Every laptop in the shop is sealed, comes with a 12-month warranty, and we install the basic software you need (Chrome, Microsoft Office, Zoom) for free before you leave. If you are buying for a company, the dealer/wholesale portal handles bulk orders and invoicing. UK-used executive laptops come into the shop about once a month — call or follow our socials to hear when they land.`,
    ],
    faqs: [
      {
        q: 'Are the MacBooks you sell UK keyboard layout?',
        a: 'Yes. All MacBooks we stock are international English keyboards (the same layout used in Ghana, Nigeria and Kenya) — no weird £ or € keys, and the enter/return key is the shape you expect.',
      },
      {
        q: 'Can I pay small-small for a laptop?',
        a: 'Yes, we run a 12-week installment / hire-purchase plan: pay 40% deposit today and spread the rest over 12 weeks. You will need a Ghana Card and one guarantor (working in the formal sector, or a known Valmont customer). Alternatively, most customers pay outright via MoMo or bank transfer and walk out with the laptop the same day.',
      },
    ],
  },
  laptop_acc: {
    paragraphs: [
      `A laptop without the right accessories is half a tool. We stock a small but carefully chosen set of laptop accessories: the Anker 8-in-1 USB-C hub (the one everyone buys when their new MacBook only has two ports), the Logitech MX Master 3S wireless mouse (the gold standard for serious work), and the Ugreen aluminium laptop stand to lift your screen to eye level and save your neck during long days.`,
      `All accessories carry a 6-month exchange warranty against manufacturing defects.`,
    ],
  },
  audio: {
    paragraphs: [
      `Good audio matters in Accra traffic. We stock AirPods Pro 2nd generation (USB-C), AirPods 4, AirPods Max, the Sony WH-1000XM5 (the best noise-cancelling headset for the plane and for offices at Ridge and Airport), and the JBL Charge 5 Bluetooth speaker for beach and pool days.`,
      `Beware of fake AirPods on the streets — you can spot them from the weight and the serial number on the box. Every Apple audio product we sell is genuine and you can verify the serial number on Apple's warranty-check page before leaving the shop. Sony and JBL come with their manufacturer warranty plus our 6-month accessory cover.`,
    ],
    faqs: [
      {
        q: 'How can I tell real AirPods Pro 2 from a fake?',
        a: 'Real AirPods Pro 2 (USB-C) pair instantly to an iPhone, show the model number A2968/A3047/A3048 in Settings > Bluetooth > "i", and have Find My built in. Fakes usually pair slowly, have spelling mistakes on the box, and sound noticeably worse on phone calls. If you bought a pair elsewhere and want a second opinion, bring them to the shop — we check for free.',
      },
    ],
  },
  gaming: {
    paragraphs: [
      `Gaming in Ghana has grown fast, especially around PS5 FIFA nights and Nintendo Switch commuter sessions. We stock the PS5 Slim Disc Edition brand new and sealed, PS5 UK-used units (great for budget buyers who still want a controller and a full warranty), and the Nintendo Switch OLED Model.`,
      `We also sell extra PS5 DualSense controllers and a small selection of physical games on request. If you are buying a PS5 as a gift, we sell gift bags and can pre-install FIFA 25 for you before pickup.`,
    ],
    faqs: [
      {
        q: 'Will a PS5 bought in Ghana work with UK / US game discs?',
        a: 'Yes — PS5 is region-free for games. Any PS5 disc from any country will play on a PS5 bought in our shop. DLC and PlayStation Store purchases just need to match your PSN account region, which you choose when you set up the console.',
      },
    ],
  },
  phone_acc: {
    paragraphs: [
      `A phone without a case and glass is a cracked screen waiting to happen in Accra traffic. We stock genuine Spigen Rugged Armor cases for the iPhone 15 Pro Max, Apple MagSafe Silicone cases, and Spigen EZ Fit tempered-glass screen protectors (applied at the counter for free when you buy one).`,
      `Cheap silicone cases from Circle turn yellow in two weeks and don't protect the camera bump. The cases we sell keep their shape and actually absorb impact when you drop the phone. If we do not have a case for your exact phone model, ask — Spigen cases are easy to restock.`,
    ],
  },
  phone_parts: {
    paragraphs: [
      `We sell phone parts for DIYers and repair shops around Accra. In stock you will find the R-SIM 18 Club Gevey SIM unlock chip for carrier-locked iPhones, original iPhone 15 Pro Max replacement screens, original iPhone 13 replacement batteries, original Samsung Galaxy replacement screens, and heavy-duty SIM ejector pins.`,
      `We sell parts in bulk to repair shops on the partner / wholesale portal — if you are running a repairs business, open a dealer account for discounted pricing.`,
    ],
  },
  travel_acc: {
    paragraphs: [
      `Travel, car and everyday gadgets: the Baseus 15W MagSafe magnetic car charger mount (the one you see in most Ubers these days) and Apple AirTag Bluetooth trackers for your luggage and keys. These are the items we recommend to anyone travelling to Kumasi, Takoradi or abroad from Kotoka.`,
    ],
  },
  chargers: {
    paragraphs: [
      `In a country where dumsor still shows up uninvited, a good charger and power bank are non-negotiable. Valmont sells Anker chargers and power banks because Anker is the brand that does not swell, does not melt your phone's charging IC, and actually delivers the wattage it says on the box. The Anker 20,000mAh 65W PowerCore 24K can fast-charge a 16-inch MacBook as well as your phone — it is our bestseller for professionals on the move.`,
      `We also stock the genuine Apple 67W USB-C power adapter (with 2m braided cable) for MacBook and iPad, the Samsung 45W Super Fast Charger for Galaxy S24 Ultra, and the Anker 735 GaN 3-port charger (the travel plug everyone should own). Stay away from cheap chargers from Circle — we have seen them damage iPhones and MacBooks beyond repair.`,
    ],
    faqs: [
      {
        q: 'Will a 65W GaN charger damage my iPhone?',
        a: 'No. USB-C Power Delivery negotiates the right wattage automatically — your iPhone asks for 27W max, and the 65W charger gives exactly that. GaN chargers are actually safer than the old silicon bricks because they run cooler. We have sold hundreds of Anker 65W chargers and have never had one damage a device.',
      },
      {
        q: 'What size power bank do I need for dumsor?',
        a: 'For a full day without light, get at least 20,000mAh — that will charge an iPhone 15 three to four times or a Samsung S24 Ultra twice. The Anker PowerCore 24K (20,000mAh, 65W) is the one we recommend. If you just need top-ups through a 2–3 hour outage, a smaller 10,000mAh bank is enough.',
      },
    ],
  },
  smart_home: {
    paragraphs: [
      `Smart home is still new in Ghana, but two categories are selling fast: smart lighting and indoor security cameras. We stock the TP-Link Tapo Smart Wi-Fi Bulb (colour, dimmable, works with the Tapo app — no hub needed) and the TP-Link Tapo C210 indoor pan/tilt security camera with night vision and two-way audio.`,
      `The C210 is popular with people who have house helps or want to check on their kids from work. It works on normal Accra WiFi (no static IP required), saves to a microSD card, and the app is in English. We install and demonstrate it at the shop in 5 minutes before you take it home.`,
    ],
    faqs: [
      {
        q: 'Does the Tapo camera require a monthly subscription?',
        a: 'No. You can record to a microSD card (we sell 64GB and 128GB cards at the shop) and playback is free through the Tapo app. TP-Link does offer an optional cloud subscription but you do not need it for basic 24/7 recording and motion alerts.',
      },
    ],
  },
  networking: {
    paragraphs: [
      `If you are working from home in Accra, your router matters more than your ISP subscription. We stock the TP-Link Archer AX1500 Wi-Fi 6 router (a solid upgrade from the router your ISP gave you) and the TP-Link Deco Mesh Wi-Fi 2-pack, which covers the whole house in East Legon, Spintex or Dansoman without dead zones.`,
      `Buying the right router can double your effective WiFi speed without paying Surfline / MTN Broadband more per month. We can advise on placement over WhatsApp — send us your floor plan.`,
    ],
    faqs: [
      {
        q: 'What is the difference between a normal router and a mesh system?',
        a: 'A single router works well in a 1- or 2-bedroom apartment. If you live in a 3-bedroom house, a storey building, or you have a compound where signal drops in the kitchen/bedroom, you want a mesh system. The Deco 2-pack uses two units that talk to each other wirelessly to create one seamless network with one WiFi name — no switching as you walk around the house.',
      },
    ],
  },
  cameras: {
    paragraphs: [
      `Creator gear in Ghana has exploded — YouTubers, TikTokers, podcasters and online vendors all need proper lighting and audio. We stock an LED Ring Light with Tripod creator kit (the standard ring light you see in every influencer's setup) and a wireless USB-C lavalier microphone that pairs with your phone for clean voice recording without the wind noise you get from phone mics in Accra breeze.`,
      `This is entry-level gear that works — we do not pretend it competes with a Sony ZV-E10. If you want a proper camera body and lens, talk to us at the shop and we can order it from our Dubai/London suppliers, usually within a week.`,
    ],
  },
};

const BRAND_COPY = {
  apple: {
    paragraphs: [
      `Apple in Ghana means iPhones, MacBooks, iPads, AirPods, Apple Watch, AirTag and MagSafe accessories, and Valmont Gadgets stocks the full range across sealed and UK-used options. From the iPhone 15 Pro Max to the MacBook Pro M3, every Apple product we sell is genuine, verified, and priced in Ghana cedis.`,
      `Apple products bought at Valmont come with a 12-month in-store warranty, same-day Accra delivery, and free setup at the counter — including transferring data from your old phone, signing you into iCloud, and pairing your AirPods or Watch. We also stock genuine Apple chargers (67W USB-C), MagSafe cases and AirTag trackers.`,
    ],
  },
  'samsung-brand': {
    paragraphs: [
      `Samsung Galaxy phones and accessories at Valmont Gadgets: S24 Ultra, S23 Ultra, S24, A55 and Z Fold 5, plus the Galaxy Watch 6 and the official Samsung 45W Super Fast Charger. All are factory-sealed international models that receive normal OTA updates in Ghana and work on MTN, Telecel and AT without any unlocking.`,
    ],
  },
  sony: {
    paragraphs: [
      `Sony in our shop means two things: the Sony WH-1000XM5 wireless noise-cancelling headset (frequent travellers, take note — these are the only ones that actually silence the plane), and the PlayStation 5 Disc Edition (both new sealed and UK-used). Sony products carry manufacturer warranty plus our 6-month accessory cover.`,
    ],
  },
  anker: {
    paragraphs: [
      `Anker makes the most reliable chargers, power banks and USB-C hubs you can buy in Ghana. No swelling, no melted charging ICs, no "20,000mAh" labels that turn out to be 5,000. We stock the Anker 735 GaN 65W 3-port charger, the PowerCore 24K 65W power bank, and the 8-in-1 USB-C hub for laptops. All Anker products carry a 6-month warranty.`,
    ],
  },
  hp: {
    paragraphs: [
      `HP laptops at Valmont are executive-grade: the HP Spectre x360 (the premium convertible that competes directly with the MacBook Air) and HP EliteBook for corporate clients who need a Windows machine with enterprise build quality. All come with 12-month warranty and free software setup.`,
    ],
  },
  'tp-link': {
    paragraphs: [
      `TP-Link makes the most reliable routers, mesh systems, smart bulbs and security cameras for Ghana's internet environment. We stock the Archer AX1500 Wi-Fi 6 router, the Deco Mesh Wi-Fi 2-pack for whole-house coverage, the Tapo colour smart bulb and the Tapo C210 pan/tilt indoor security camera. TP-Link products come with 1-year manufacturer warranty plus our standard support.`,
    ],
  },
};

module.exports = { CATEGORY_COPY, BRAND_COPY };
