/**
 * src/data/business.js
 *
 * Single source of truth for Valmont Gadgets' Name / Address / Phone (NAP),
 * hours, social links, and Google Business Profile info. Every place that
 * renders NAP (homepage schema, landing-page schema, footer, review page)
 * imports from here so Google never sees conflicting addresses/phone numbers.
 *
 * To update when you move shop or change hours: edit this file, rebuild.
 */
module.exports = {
  name: 'Valmont Gadgets',
  legalName: 'Valmont Gadgets',
  telephone: '+233542451578',
  whatsapp: 'https://wa.me/233542451578',
  email: 'support@valmontdata.com',
  url: 'https://valmontgadgets.com/',
  logo: 'https://valmontgadgets.com/logo.png',
  image: 'https://valmontgadgets.com/uploads/clean_15_pro.png',
  // TODO: replace streetAddress with the exact shop/landmark address before
  // submitting the Google Business Profile for verification. Google mails a
  // postcard to this address and the pin is placed on Maps at this location.
  address: {
    streetAddress: 'Circle, Accra', // TODO: replace with exact shop no + landmark, e.g. "Opposite Vodafone Office, Kwame Nkrumah Ave, Circle"
    addressLocality: 'Accra',
    addressRegion: 'Greater Accra',
    addressCountry: 'GH',
    postalCode: '',
  },
  geo: {
    // TODO: once verified in GBP, copy lat/lng from the Google Maps URL of your
    // pin (right-click the pin on maps.google.com → "What's here?" shows the
    // coordinates). These are central Accra placeholders.
    latitude: 5.5555,
    longitude: -0.2020,
  },
  // Opening hours in schema.org OpeningHoursSpecification format.
  // Mo-Su 8am-9pm matches existing site copy.
  openingHours: [
    { dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '08:00', closes: '21:00' }
  ],
  openingHoursText: 'Mon – Sun: 8AM – 9PM',
  priceRange: 'GH₵',
  paymentAccepted: ['Cash','Mobile Money','MTN MoMo','Telecel Cash','AT Money','Bank Card','Bank Transfer'],
  currenciesAccepted: 'GHS',
  areaServed: ['Accra','Kumasi','Takoradi','Tamale','Cape Coast','Ghana'],
  sameAs: [
    'https://whatsapp.com/channel/0029Vb9DIKG8V0terg2V4K2Y',
    'https://www.tiktok.com/@valmont.group',
    'https://www.facebook.com/share/1TA1PNVaCP/',
    // After your Google Business Profile is verified, add its URL here
    // (format: https://business.google.com/n/XXXXXXXXXXXXXXX). Adding it to
    // sameAs is the strongest signal you can send Google that the website
    // and the Business Profile are the same business.
  ],
  hasMap: 'https://g.co/kgs/valmont-gadgets', // TODO: replace with real Google Maps short URL after verification
  // Place ID gets assigned the moment you create the GBP (before postcard
  // verification). Paste it here and rebuild to include it in schema.
  googlePlaceId: '',
  // Service options — booleans drive GBP attributes and <meta> tags.
  serviceOptions: {
    inStoreShopping: true,
    sameDayDelivery: true,
    deliveryNationwide: true,
    curbsidePickup: false,
    wheelchairAccessible: false, // set true if accurate
    cashOnDelivery: true,
    mobilePayments: true,
    warranty: true,
    tradeIn: true,
    installments: true,
  },
  departments: [
    { name: 'Retail Sales', telephone: '+233542451578' },
    { name: 'Wholesale / Dealer Desk', telephone: '+233542451578' },
    { name: 'Phone Swap & Trade-in', telephone: '+233542451578' },
  ],
};
