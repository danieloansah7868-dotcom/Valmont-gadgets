# Google Business Profile Setup — Valmont Gadgets
**Time needed:** 15 minutes (plus 5–14 days waiting for the postcard).
**Before you start:** have your phone on +233 54 245 1578 nearby (Google calls/SMSes it).

## What's already done on the website
- Full **ElectronicsStore / LocalBusiness** JSON-LD schema with NAP, opening hours, geo, price range, payment methods, area served. Source of truth: `src/data/business.js`.
- `/review-google.html` page with a deep "Write a review" button (flips live once I add the Place ID after verification).
- Footer already shows WhatsApp, phone, "Accra, Ghana".
- All 22 category/brand pages share the same NAP signal (name is exactly "Valmont Gadgets" everywhere).
- Sitemap, robots.txt, canonical tags all set.

## Step-by-step (on your phone or laptop)

### 1. Open Google Business Profile
Go to **https://business.google.com/create** and sign in with whatever Gmail you want to own the listing (ideally one you use daily — don't lose access to it).

### 2. Type the business name EXACTLY
Type **`Valmont Gadgets`** (capital V, capital G, space between). If Google suggests an existing listing that is NOT yours, click **"This doesn't match"** or **"Create a new business"**. If it's already yours (unlikely), claim it.

### 3. Choose business type
Select **Local store** (not online-only, not service area — you have a physical showroom customers come to).

### 4. Pick the category
**Primary category:** `Electronics store`
**Additional categories** (add all of these):
- `Mobile phone repair shop`
- `Phone repair service`
- `Cell phone store`
- `Computer store`
- `Wholesaler`

### 5. Enter address (this is what the postcard comes to)
- **Country/Region:** Ghana
- **Street address:** your exact shop (e.g. *"Opposite Vodafone Office, Kwame Nkrumah Avenue, Circle"* — the more specific, the better Google pins it on Maps)
- **City:** Accra
- **Region:** Greater Accra
- **Postal code:** leave blank

After you submit the address, Google may ask "Do you also serve customers outside this location?" → **Yes** (you deliver nationwide). Add Ghana as service area.

### 6. Contact info
- **Phone:** `+233 54 245 1578` (must match what's on the website)
- **Website:** `https://valmontgadgets.com`

### 7. Verification
Google will offer:
- **Phone / SMS verification** (sometimes available — pick it, you get the code instantly)
- **Postcard by mail** (most common in Ghana) — arrives 5–14 days. Contains a 5-digit code you enter at business.google.com when it lands.
Do NOT click "verify later" or edit the address after requesting the postcard or you have to start over.

### 8. Once verified — fill out the profile fully (these move the needle in local pack)
**Info tab:**
- **Hours:** Mon–Sun 8:00 AM – 9:00 PM
- **Services:** add each of these one by one with a 1-line description:
  - Same-day Accra delivery
  - Nationwide delivery (Kumasi, Takoradi, Tamale, Cape Coast)
  - Mobile Money payment (MTN MoMo, Telecel Cash, AT Money)
  - Cash on delivery in Accra
  - Phone swap / trade-in
  - UK-used phone sales with warranty
  - Laptop sales (Apple, HP)
  - 12-month warranty on all electronics
  - Accessories (chargers, cases, AirPods, power banks)
- **Products:** add at least 6 top sellers by photo (use the existing uploads/*.png photos) — iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, MacBook Air M2, AirPods Pro 2, Anker 65W Power Bank, PS5. Google pulls products into the local panel.
- **Highlights / attributes:** tick "Delivery", "In-store shopping", "Same-day delivery", "Cash on delivery", "Wheelchair-accessible" only if it's true. Do NOT lie about wheelchair access.
- **From the business / Description:** paste this exactly:
  > Valmont Gadgets is Accra's trusted shop for genuine smartphones, executive laptops and electronics. We sell both factory-sealed and carefully graded UK-used iPhones, Samsung Galaxies, MacBooks and accessories. 12-month warranty on sealed devices, 6-month warranty on UK-used, same-day Accra delivery, Mobile Money accepted. No clones, no blacklisted devices. We also supply in bulk to resellers across Ghana.
- **Opening date:** the month/year you actually started Valmont (approximate is fine).

**Photos (upload in this order):**
1. **Logo** (use `logo.png` from the site)
2. **Shop front / exterior** — take ONE photo from the street showing the signboard if you have one (most important photo for trust)
3. **Interior of the shop** — counter, phones on display
4. **3–5 product photos** — re-use `uploads/clean_15_pro.png` etc.
5. **You/Daniel at the counter** (real people photos crush local SEO in Ghana)

**Reviews:**
1. The moment verification is live, send the `/review-google.html` link to your last 20–30 happy customers via WhatsApp broadcast. Ask them while they're still happy with the purchase — not a week later.
2. Paste your Google Place ID (from the GBP dashboard URL or from the Maps link) into `src/data/business.js` under `googlePlaceId` and into `review-google.html` replacing `TODO_REPLACE_WITH_GOOGLE_PLACE_ID`, then rebuild and deploy. This turns the "Write a Google review" button on the review page into a deep link straight into the review form.

## What to do if the postcard never arrives
Wait 14 days, then log into business.google.com and click **"Request another code"**. Google usually offers a phone verification option on the second try.

## Things NOT to do (these get profiles suspended)
- Don't list a PO box or virtual office as your address
- Don't stuff keywords into the business name (must be "Valmont Gadgets", not "Valmont Gadgets - iPhone Shop Accra")
- Don't create a second listing if one already exists (claim the existing one)
- Don't offer customers money/free stuff in exchange for 5-star reviews (against Google policy)
- Don't post fake reviews yourself from your own phone or your staff's phones

## 30-day cadence after going live
- Post 1 photo/week on the GBP profile (new stock arriving, a customer picking up a phone, a charger display)
- Respond to EVERY review (positive and negative) within 24 hours — Google ranks responsive businesses higher
- Answer questions customers post in the "Questions & answers" section within hours
- Check the "Performance" tab weekly — you should start seeing "Direct" vs "Discovery" search traffic after 2–3 weeks
