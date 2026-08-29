#!/usr/bin/env node
/**
 * Contract test for supabase/migrations/20260829_platform_security.sql.
 *
 * PGlite is a disposable Postgres here — the same role model PostgREST uses
 * (anon / authenticated / service_role) and the same `request.jwt.claim.*`
 * GUCs Supabase sets from the caller's JWT. That is what makes this test worth
 * running: it proves the DATABASE, not the page, is what refuses a browser that
 * lies about prices, approvals, identities and "paid".
 *
 * Each expectation maps to a promise one of the platform pages makes:
 *   used.html      reads the board anonymously and never sees a sold unit;
 *   swap.html      can post, close, message and request a promotion — and cannot
 *                  approve, promote, price or impersonate anything;
 *   wholesale.html only sees dealer cost after approval, and the total it is
 *                  quoted is the total that gets stored;
 *   partner.html   fingerprints the Ghana Card server-side and cannot mark
 *                  itself approved;
 *   admin-control.html works only behind public.is_valmont_admin().
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const migrationPath = '../supabase/migrations/20260829_platform_security.sql';
const migration = await readFile(
  new URL(migrationPath, import.meta.url),
  'utf8',
);

const SELLER = '00000000-0000-4000-8000-0000000000a1';
const BUYER = '00000000-0000-4000-8000-0000000000b2';
const CARD = 'GHA-123456789-0';

const bootstrapSql = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;

  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.email', true), '')
  $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
  $$;

  -- The admin predicate, driven by a GUC so the test can flip it. In the real
  -- project this function reads public.admin_allowlist
  -- (20260811_admin_email_allowlist.sql); the property under test is that no
  -- caller can pass it in as an argument.
  CREATE FUNCTION public.is_valmont_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('valmont.test_admin', true), '') = 'on'
  $$;

  -- The catalogue the storefront already owns; wholesale pricing derives from it.
  CREATE TABLE public.products (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    category_id text,
    price numeric NOT NULL DEFAULT 0,
    compare_at_price numeric DEFAULT 0,
    wholesale_price numeric DEFAULT 0,
    stock integer DEFAULT 0,
    image_url text,
    images jsonb DEFAULT '[]'::jsonb,
    colors jsonb DEFAULT '[]'::jsonb,
    storage_options jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
  );

  -- Two objects the ALREADY-APPLIED migration (20260828) touches and the admin
  -- predicate historically read; the follow-up drops its policies, so the test
  -- needs them to exist in order to model the live database.
  CREATE TABLE public.site_settings (key text PRIMARY KEY, value jsonb);
  CREATE TABLE public.admin_allowlist (email text PRIMARY KEY);
`;

const db = new PGlite({ extensions: { pgcrypto } });

/** The two human beings every page contract below talks about. */
async function seedAccounts() {
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${SELLER}', 'seller@example.com'),
      ('${BUYER}',  'buyer@example.com');
    INSERT INTO public.products (id, name, slug, category_id, price, wholesale_price, stock, is_active, storage_options) VALUES
      ('iphone15', 'iPhone 15 128GB', 'iphone-15', 'phones', 9900, 7400, 40, true, '["128GB","256GB"]'::jsonb),
      ('airpods',  'AirPods Pro 2',    'airpods-pro-2', 'audio', 2200, 1500, 60, true, '[]'::jsonb),
      ('retired',  'Retired Handset',  'retired-handset', 'phones', 500, 300, 5, false, '[]'::jsonb);
  `);
}

async function value(sql, params = []) {
  const result = await db.query(sql, params);
  return Object.values(result.rows[0])[0];
}

async function expectCode(action, code, note = '') {
  await assert.rejects(action, (error) => {
    const got = error.code || error.sqlState;
    assert.equal(got, code, `${note} expected SQLSTATE ${code}, got ${got} (${error.message})`);
    return true;
  });
}

/** A RAISE EXCEPTION with no explicit ERRCODE arrives as P0001, carrying our text. */
async function expectRefused(action, fragment, note = '') {
  await assert.rejects(action, (error) => {
    const text = String(error.message || '');
    assert.ok(text.includes(fragment), `${note} expected a refusal mentioning "${fragment}", got: ${text}`);
    return true;
  });
}

async function as(role, sub) {
  const claims = {
    role,
    sub: sub || null,
    email: sub === SELLER ? 'seller@example.com' : sub === BUYER ? 'buyer@example.com' : 'danieloansah7868@gmail.com',
    user_metadata: { email_verified: true },
  };
  await db.exec('RESET ROLE');
  await db.exec(`SELECT set_config('valmont.test_admin', '${role === 'anon' ? 'off' : 'off'}', false)`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', ${sub ? `'${sub}'` : 'NULL'}, false)`);
  await db.exec(`SELECT set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false)`);
  await db.exec(`SET ROLE ${role}`);
}
const asAnon = () => as('anon', null);
const asSeller = () => as('authenticated', SELLER);
const asBuyer = () => as('authenticated', BUYER);
/** A shopper whose JWT happens to claim the admin email: RLS must still refuse. */
const asImpostor = async () => {
  await db.exec('RESET ROLE');
  await db.exec(`SELECT set_config('valmont.test_admin', 'off', false)`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${BUYER}', false)`);
  await db.exec(`SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${BUYER}","email":"danieloansah7868@gmail.com","user_metadata":{"email_verified":true}}', false)`);
  await db.exec('SET ROLE authenticated');
};
const asAdmin = async () => {
  await db.exec('RESET ROLE');
  await db.exec(`SELECT set_config('valmont.test_admin', 'on', false)`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', 'NULL', false)`);
  await db.exec(`SELECT set_config('request.jwt.claims', '{"role":"authenticated","email":"danieloansah7868@gmail.com"}', false)`);
  await db.exec('SET ROLE authenticated');
};
/** Back to the owner role so the test can inspect raw rows past RLS. */
async function asRoot() {
  await db.exec('RESET ROLE');
  await db.exec(`SELECT set_config('valmont.test_admin', 'off', false)`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', NULL, false)`);
  await db.exec(`SELECT set_config('request.jwt.claims', '{}', false)`);
}

const steps = [];
const step = (name, fn) => steps.push({ name, fn });

// ── apply ─────────────────────────────────────────────────────────────────────
step('the migration applies cleanly and twice', async () => {
  await db.exec('CREATE EXTENSION pgcrypto');
  await db.exec(bootstrapSql);
  await db.exec(migration);
  await db.exec(migration);
  await seedAccounts();
  assert.equal(await value(`SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('sellers','swap_listings','swap_leads','used_inventory','wholesale_dealers',
                         'wholesale_orders','partner_applications','ad_payments','admin_audit_log','write_quota')`), 10);
  // The plaintext-credential columns an earlier draft had must not survive.
  assert.deepEqual(await value(`SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sellers'
      AND column_name IN ('password_hash','password','face_photo_url','ghana_card')`), 0);
});

step('no table in this migration is writable from the browser', async () => {
  const grants = await value(`
    SELECT coalesce(jsonb_agg(x), '[]'::jsonb) AS r FROM (
      SELECT table_name, privilege_type, grantee
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name IN ('sellers','swap_listings','swap_leads','used_inventory','wholesale_dealers',
                           'wholesale_orders','partner_applications','ad_payments','admin_audit_log','write_quota')
        AND grantee IN ('anon','authenticated')
        AND privilege_type <> 'SELECT'
    ) x
  `);
  assert.deepEqual(grants, [], 'anon/authenticated must hold SELECT at most');
});

// ── used board ────────────────────────────────────────────────────────────────
step('the admin lists units and shoppers read only what is on the counter', async () => {
  await asAdmin();
  await value(`SELECT public.admin_upsert_used('{
     "name":"iPhone 13 Pro 128GB","brand":"Apple","price":4200,"was_price":4800,"origin":"uk",
     "grade":"A","battery":91,"storage":"128GB","screen":"Perfect","images":
     ["uploads/clean_13_pro.png","https://evil.example/track.png"]}'::jsonb)`);
  await value(`SELECT public.admin_upsert_used('{"name":"iPhone 12 64GB","price":2100,"origin":"us","grade":"B"}'::jsonb)`);
  await expectCode(
    () => value(`SELECT public.admin_upsert_used('{"name":"No price"}'::jsonb)`),
    '22023',
    'a unit without a price is refused',
  );

  await asAnon();
  const board = await value('SELECT public.get_used_inventory(NULL)');
  assert.equal(board.length, 2);
  assert.deepEqual(await value(`SELECT public.get_used_inventory('uk')`).then((r) => r.map((x) => x.name)),
    ['iPhone 13 Pro 128GB']);
  // an attacker-controlled image host never made it into the row
  assert.equal(JSON.stringify(board).includes('evil.example'), false);
  await expectCode(
    () => db.query(`INSERT INTO public.used_inventory (origin, brand, name, price) VALUES ('uk','apple','Sneaky',1)`),
    '42501', 'a shopper cannot stock their own board',
  );
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.used_inventory')).rows[0].n, 2);

  await asAdmin();
  const list = await value(`SELECT public.admin_platform_board('used', 50)`);
  await value(`SELECT public.admin_set_used('${list.rows[0].id}', 'sold')`);
  await asAnon();
  assert.equal((await value('SELECT public.get_used_inventory(NULL)')).length, 1, 'a sold unit leaves the board');
  await asAdmin();
  await value(`SELECT public.admin_set_used('${list.rows[0].id}', 'restock')`);
  await asAnon();
  assert.equal((await value('SELECT public.get_used_inventory(NULL)')).length, 2);
});

// ── sellers ───────────────────────────────────────────────────────────────────
step('a Ghana Card is fingerprinted, never stored or echoed in the clear', async () => {
  await asSeller();
  assert.match(CARD, /^GHA-\d{9}-\d$/);
  const saved = await value(`SELECT public.save_seller_profile('Kojo Traders','0241234567','Accra',NULL)`);
  assert.equal(saved.phone, '0241234567');
  assert.equal(saved.card_verified, false, 'verification stays a human decision');
  const withCard = await value(`SELECT public.save_seller_profile('Kojo Traders','0241234567','Accra','${CARD}')`);
  assert.equal(withCard.id, saved.id, 'a repeat save updates instead of duplicating');

  await asRoot();
  const row = await value(`SELECT to_jsonb(s) AS r FROM public.sellers s WHERE s.auth_user_id = '${SELLER}'::uuid`);
  assert.equal(row.ghana_card_masked, 'GHA-•••••6789-0');
  assert.match(String(row.ghana_card_hash), /^[0-9a-f]{64}$/, 'the hash is a real SHA-256');
  assert.equal(JSON.stringify(row).includes('123456789'), false, 'the card number is nowhere in the row');
  await asSeller();
  await expectCode(
    () => value(`SELECT public.derive_card_identity('${SELLER}'::uuid, '${CARD}')`),
    '42501', 'the helper is not callable from a request',
  );
});

step('a card already on file cannot be reused by another account', async () => {
  await asBuyer();
  await expectRefused(
    () => value(`SELECT public.save_seller_profile('Buyer Shop','0201112222','Tema','${CARD}')`),
    'another account',
  );
  const own = await value(`SELECT public.save_seller_profile('Buyer Shop','0201112222','Tema',NULL)`);
  assert.equal(own.banned, false);
});

step('an unverified email cannot claim the admin allowlist in its JWT', async () => {
  await db.exec('RESET ROLE');
  await db.exec(`SELECT set_config('valmont.test_admin', 'off', false)`);
  await db.exec(`SELECT set_config('request.jwt.claim.sub', '${BUYER}', false)`);
  await db.exec(`SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"${BUYER}","email":"danieloansah7868@gmail.com"}', false)`);
  await db.exec('SET ROLE authenticated');
  await expectCode(() => value(`SELECT public.admin_platform_board('sellers', 10)`), '42501');
});

// ── listings ──────────────────────────────────────────────────────────────────
const LISTING_JSON = `{"type":"swap","brand":"Apple","model":"iPhone 13 Pro","storage":"128GB",
  "grade":"a","battery":88,"want":"Pixel 7 or a cash top-up","price":4300,
  "images":["uploads/clean_13_pro.png","javascript:alert(1)","https://evil.example/track.png","https://images.unsplash.com/photo-1"]}`;

step('a listing is stored pending, owned by the JWT, with safe image hosts only', async () => {
  await asSeller();
  const listing = await value(`SELECT public.create_swap_listing('${LISTING_JSON}'::jsonb)`);
  assert.equal(listing.status, 'pending', 'nothing goes live without review');
  await asRoot();
  const row = await value(`SELECT to_jsonb(l) AS r FROM public.swap_listings l WHERE l.id = '${listing.id}'`);
  assert.equal(row.seller_auth_id, SELLER, 'identity comes from the JWT');
  assert.equal(row.seller_name, 'Kojo Traders');
  assert.equal(row.seller_phone, '0241234567');
  assert.equal(row.grade, 'A');
  assert.deepEqual(row.images, ['uploads/clean_13_pro.png', 'https://images.unsplash.com/photo-1']);
  assert.equal(JSON.stringify(row).includes('evil.example'), false);
  assert.equal(JSON.stringify(row).includes('javascript:'), false);

  await asAnon();
  await expectCode(() => value(`SELECT public.create_swap_listing('${LISTING_JSON}'::jsonb)`), '42501',
    'anon holds no execute grant at all');
  await asBuyer();
  await expectRefused(() => value(`SELECT public.create_swap_listing('{"type":"sell","brand":"Apple","model":"x"}'::jsonb)`),
    '3-90 characters');
  await expectRefused(
    () => value(`SELECT public.create_swap_listing('{"type":"sell","brand":"Apple","model":"iPhone 11","price":99999999,"seller_auth_id":"${SELLER}"}'::jsonb)`),
    'asking price',
  );
});

step('a seller may close their own listing and nothing else', async () => {
  await asSeller();
  const mine = await value('SELECT public.get_my_swap_listings()');
  assert.equal(mine.length, 1);
  const listingId = mine[0].id;
  await expectCode(() => value(`SELECT public.update_swap_listing_status('${listingId}', 'active')`),
    '42501', 'a seller cannot publish their own pending listing');
  assert.equal((await value(`SELECT public.update_swap_listing_status('${listingId}', 'removed')`)).status, 'removed');
  await value(`SELECT public.update_swap_listing_status('${listingId}', 'sold')`);

  await asBuyer();
  await expectCode(() => value(`SELECT public.update_swap_listing_status('${listingId}', 'removed')`), '42501',
    "someone else's listing is out of reach");
  await asRoot();
  const status = await value(`SELECT status FROM public.swap_listings WHERE id = '${listingId}'`);
  assert.equal(status, 'sold');

  // RLS must not let a shopper read the pending rows of a competitor.
  await asBuyer();
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.swap_listings')).rows[0].n, 0,
    'a seller may not browse another seller’s rows');
  await asSeller();
  assert.ok((await db.query('SELECT count(*)::int AS n FROM public.swap_listings')).rows[0].n >= 1);
});

// ── promotions ──────────────────────────────────────────────────────────────
let promotionRequestId = null;

step('only an admin publishes a listing; the seller then has something to boost', async () => {
  await asSeller();
  const mine = await value('SELECT public.get_my_swap_listings()');
  const listingId = mine[0].id;
  await asAdmin();
  await value(`SELECT public.admin('approve_listing', '{"p_listing_id":"${listingId}"}'::jsonb)`);
  await asSeller();
  const after = await value('SELECT public.get_my_swap_listings()');
  assert.equal(after[0].status, 'active');

  await asAnon();
  const public_rows = await value(`SELECT public.get_used_inventory(NULL)`);
  assert.equal(public_rows.length, 2);
  // The public listing feed is RLS-filtered to approved rows.
  const live = await db.query(`SELECT count(*)::int AS n FROM public.swap_listings WHERE status = 'active'`);
  assert.equal(live.rows[0].n, 1);
});

step('the promotion price comes from Postgres and pays nothing by itself', async () => {
  await asSeller();
  const listingId = (await value('SELECT public.get_my_swap_listings()'))[0].id;
  const request = await value(`SELECT public.request_listing_promotion('${listingId}', 168)`);
  assert.equal(Number(request.amount), 60);
  assert.equal(request.status, 'pending');
  promotionRequestId = request.request_id;
  await expectRefused(() => value(`SELECT public.request_listing_promotion('${listingId}', 168)`), 'awaiting payment');
  await expectRefused(() => value(`SELECT public.request_listing_promotion('${listingId}', 1)`), 'unknown promotion period');
  // The classic forgery — "I paid GH₵1, promote me": no such parameter exists.
  await expectCode(() => value(`SELECT public.request_listing_promotion('${listingId}', 720, 1, 'completed')`), '42883');
  await expectCode(() => value(`SELECT public.admin('activate_promo', '{"p_payment_id":"${promotionRequestId}"}'::jsonb)`),
    '42501', 'a seller cannot approve their own boost');
  await asBuyer();
  await expectCode(() => value(`SELECT public.request_listing_promotion('${listingId}', 24)`), '42501');

  await asRoot();
  const flags = await value(`SELECT jsonb_build_object('promo', is_promoted, 'status', status) AS r
    FROM public.swap_listings WHERE id = '${listingId}'`);
  assert.equal(flags.promo, false, 'requesting a boost must not activate it');
});

step('activating a promotion is an admin act, logged, and reversible', async () => {
  await asImpostor();
  await expectCode(() => value(`SELECT public.admin('activate_promo', '{"p_payment_id":"${promotionRequestId}"}'::jsonb)`),
    '42501', 'the allowlist is checked in Postgres, not in the page');
  await asAdmin();
  assert.equal((await value(`SELECT public.admin('activate_promo', '{"p_payment_id":"${promotionRequestId}"}'::jsonb)`)).ok, true);
  await asRoot();
  const after = await value(`SELECT jsonb_build_object(
      'promo', l.is_promoted, 'expiry', l.promo_expires_at IS NOT NULL,
      'pay', a.status, 'amount', a.amount
    ) AS r
    FROM public.swap_listings l JOIN public.ad_payments a ON a.id = '${promotionRequestId}' AND a.listing_id = l.id`);
  assert.equal(after.promo, true);
  assert.equal(after.expiry, true);
  assert.equal(after.pay, 'completed');
  assert.equal(Number(after.amount), 60);
  assert.equal(await value(`SELECT count(*)::int AS n FROM public.admin_audit_log WHERE action = 'promo_activate'`), 1,
    'the console cannot forget to log');
  await asAdmin();
  await expectRefused(() => value(`SELECT public.admin('activate_promo', '{"p_payment_id":"${promotionRequestId}"}'::jsonb)`),
    'already active');
  await value(`SELECT public.admin('stop_promo', '{"p_payment_id":"${promotionRequestId}"}'::jsonb)`);
  await asRoot();
  assert.equal(await value(`SELECT is_promoted FROM public.swap_listings l WHERE id = (SELECT listing_id FROM public.ad_payments WHERE id = '${promotionRequestId}')`), false);
});

step('the console can only call actions on its allowlist', async () => {
  await asAdmin();
  for (const name of ['approve_listing; SELECT 1', 'set_config', 'ALTER', '']) {
    await expectCode(() => value(`SELECT public.admin('${name}', '{}'::jsonb)`), '22023', `refuses "${name}"`);
  }
  for (const name of ['upsert_products', 'drop_table', 'admin', 'read_all_customers']) {
    await expectRefused(() => value(`SELECT public.admin('${name}', '{}'::jsonb)`), 'unsupported admin action');
  }
  await asBuyer();
  await expectCode(() => value(`SELECT public.admin('approve_listing', '{"p_listing_id":"x"}'::jsonb)`), '42501');
});

// ── leads ─────────────────────────────────────────────────────────────────────
step('an interest message reaches the seller only, with a real budget', async () => {
  await asSeller();
  const listingId = (await value('SELECT public.get_my_swap_listings()'))[0].id;
  await expectRefused(() => value(`SELECT public.create_swap_lead('${listingId}', 'messaging my own listing')`),
    'your own listing', 'a seller cannot generate leads on themselves');
  await asBuyer();
  await expectCode(() => value(`SELECT public.create_swap_lead('${listingId}', 'hi')`), '22023',
    'a five character minimum is enforced in Postgres');
  const lead = await value(`SELECT public.create_swap_lead('${listingId}', 'Is this still available? I can add cash.')`);
  assert.ok(lead.id);
  await asSeller();
  const leads = await value('SELECT public.get_my_swap_leads()');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].listing_model, 'iPhone 13 Pro');
  assert.equal(leads[0].buyer_phone, '0201112222');
  assert.equal(await value(`SELECT count(*)::int AS n FROM public.swap_leads l
     WHERE l.seller_auth_id = '${SELLER}' AND l.buyer_name = 'Buyer Shop'`), 1);
});

// ── wholesale ─────────────────────────────────────────────────────────────────
step('dealer cost stays invisible until an admin approves the account', async () => {
  await asBuyer();
  await expectCode(() => value('SELECT public.get_wholesale_catalog()'), '42501', 'no approval, no cost sheet');
  await expectCode(() => value(`SELECT public.price_wholesale_order('[{"product_id":"iphone15","qty":10}]'::jsonb)`),
    '42501');
  const applied = await value(`SELECT public.apply_wholesale_account('{
     "business_name":"Kejetia Mobile Hub","contact_name":"Ama Mensah","city":"Kumasi","phone":"0201112222"}'::jsonb)`);
  assert.equal(applied.status, 'pending');
  await expectCode(() => value('SELECT public.get_wholesale_catalog()'), '42501');
  await expectCode(() => value(`SELECT public.admin('approve_dealer', '{"p_dealer_id":"${applied.id}"}'::jsonb)`),
    '42501', 'a dealer cannot approve themselves');

  await asAdmin();
  assert.equal((await value(`SELECT public.admin('approve_dealer', '{"p_dealer_id":"${applied.id}"}'::jsonb)`)).ok, true);
  await asBuyer();
  const catalog = await value('SELECT public.get_wholesale_catalog()');
  assert.equal(catalog.length, 2, 'inactive products stay out of the cost sheet');
  const phone = catalog.find((p) => p.id === 'iphone15');
  assert.equal(Number(phone.wholesale_price), 7400);
  assert.equal(phone.tiers.length, 4);
  assert.equal(Number(phone.tiers[3].unit_price), 6438);
  const profile = await value('SELECT public.get_my_wholesale_account()');
  assert.equal(profile.status, 'approved');
  await asRoot();
  assert.equal(await value(`SELECT reviewed_by FROM public.wholesale_dealers WHERE id = '${applied.id}'`),
    'danieloansah7868@gmail.com', 'the reviewer is the JWT email, not a typed field');
});

step('the quoted total is the stored total — the cart cannot lie', async () => {
  await asBuyer();
  const items = [{ product_id: 'iphone15', qty: 10 }, { product_id: 'airpods', qty: 2 }];
  const quote = await value(`SELECT public.price_wholesale_order('${JSON.stringify(items)}'::jsonb)`);
  const expected = 6808 * 10 + 1500 * 2;
  assert.equal(Number(quote.total), expected, '10-unit tier applied by the database');
  const order = await value(`SELECT public.place_wholesale_order('${JSON.stringify(items)}'::jsonb, '2nd Link, Asantesia Road, Kumasi')`);
  assert.equal(Number(order.total), expected, 'ordering must not re-price differently');
  assert.match(order.order_number, /^VW-\d{8}-[0-9A-F]{5}$/);
  await asRoot();
  const stored = await value(`SELECT jsonb_build_object('total', o.total, 'lines', jsonb_array_length(o.items),
      'address', o.delivery_address, 'status', o.status) AS r
    FROM public.wholesale_orders o WHERE o.order_number = '${order.order_number}'`);
  assert.equal(Number(stored.total), expected);
  assert.equal(stored.lines, 2);
  assert.equal(stored.status, 'pending');

  await asBuyer();
  const cheated = await value(`SELECT public.place_wholesale_order('[{"product_id":"iphone15","qty":10,"unit_price":1,"total":1}]'::jsonb,'2nd Link, Asantesia Road, Kumasi')`);
  assert.equal(Number(cheated.total), 6808 * 10, 'a client-supplied unit price is ignored, not obeyed');
  await expectRefused(() => value(`SELECT public.place_wholesale_order('[{"product_id":"retired","qty":1}]'::jsonb,'2nd Link, Asantesia Road, Kumasi')`),
    'not available for wholesale');
  await expectCode(() => value(`SELECT public.place_wholesale_order('[]'::jsonb,'2nd Link, Asantesia Road, Kumasi')`), '22023');
  await expectRefused(() => value(`SELECT public.place_wholesale_order('[{"product_id":"airpods","qty":0}]'::jsonb,'2nd Link, Asantesia Road, Kumasi')`),
    'between 1 and 500');
  await expectRefused(() => value(`SELECT public.place_wholesale_order('[{"product_id":"airpods","qty":1}]'::jsonb,'flat')`),
    'delivery address');
  const mine = await value('SELECT public.get_my_wholesale_orders()');
  assert.equal(mine.length, 2);
  // A dealer may not read another dealer's orders.
  await asSeller();
  assert.equal((await value('SELECT public.get_my_wholesale_orders()')).length, 0);
  await expectCode(() => value('SELECT public.get_wholesale_catalog()'), '42501');
});

step('order status is the admin’s, and the dealer cannot set it', async () => {
  await asBuyer();
  const [order] = await value('SELECT public.get_my_wholesale_orders()');
  await expectCode(() => value(`SELECT public.admin('set_order_status', '{"p_order_id":"${order.id}","p_status":"delivered"}'::jsonb)`),
    '42501');
  await asAdmin();
  await value(`SELECT public.admin('set_order_status', '{"p_order_id":"${order.id}","p_status":"shipped"}'::jsonb)`);
  await asBuyer();
  const rows = await value('SELECT public.get_my_wholesale_orders()');
  assert.equal(rows.find((r) => r.id === order.id).status, 'shipped');
});

// ── partners ──────────────────────────────────────────────────────────────────
const PARTNER_JSON = `{"shop_name":"Adum Phone Plaza","contact_name":"Kwabena Osei","phone":"0241234567",
  "city":"Kumasi","ghana_card":"GHA-555444333-2","plan":"pro","volume":"50-100",
  "about":"We repair and resell on the front street."}`;

step('a partner application is hashed, kept pending, and cannot approve itself', async () => {
  await asBuyer();
  const applied = await value(`SELECT public.apply_store_partner('${PARTNER_JSON}'::jsonb)`);
  assert.equal(applied.status, 'pending');
  await expectRefused(() => value(`SELECT public.apply_store_partner('{"shop_name":"Corner Shop","contact_name":"Kwame Boateng","phone":"12345"}'::jsonb)`),
    'Ghana phone number');
  await asRoot();
  const row = await value(`SELECT to_jsonb(a) AS r FROM public.partner_applications a WHERE a.id = '${applied.id}'`);
  assert.equal(row.ghana_card_masked, 'GHA-•••••4333-2');
  assert.match(String(row.ghana_card_hash), /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(row).includes('555444333'), false);
  assert.equal(row.plan, 'pro');
  assert.equal(row.email, 'buyer@example.com', 'the email comes from the auth user, not the form');
  await asBuyer();
  const again = await value(`SELECT public.apply_store_partner('{"shop_name":"Adum Phone Plaza","contact_name":"Kwabena Osei","phone":"0241234567","city":"Kumasi","plan":"enterprise"}'::jsonb)`);
  assert.equal(again.id, applied.id, 'a re-submit updates the same application');
  assert.equal((await value('SELECT public.get_my_partner_application()')).plan, 'enterprise');
  await expectCode(() => value(`SELECT public.admin('approve_partner', '{"p_partner_id":"${applied.id}"}'::jsonb)`), '42501');
  await asAdmin();
  await value(`SELECT public.admin('approve_partner', '{"p_partner_id":"${applied.id}"}'::jsonb)`);
  await asBuyer();
  assert.equal((await value('SELECT public.get_my_partner_application()')).status, 'approved');
  // An approved application is not silently reopened by a later submit.
  const resubmit = await value(`SELECT public.apply_store_partner('{"shop_name":"Adum Phone Plaza","contact_name":"Kwabena Osei","phone":"0241234567","city":"Kumasi","plan":"starter"}'::jsonb)`);
  assert.equal(resubmit.status, 'approved');

  // And the daily budget does eventually bite, so the form cannot be scripted.
  let refused = false;
  for (let i = 0; i < 8 && !refused; i++) {
    try {
      await value(`SELECT public.apply_store_partner('{"shop_name":"Adum Phone Plaza","contact_name":"Kwabena Osei","phone":"0241234567","city":"Kumasi","plan":"starter"}'::jsonb)`);
    } catch (error) {
      refused = String(error.message).includes('Limit reached');
    }
  }
  assert.equal(refused, true, 'the per-account budget applies to partner applications too');
  await asRoot();
  assert.equal(await value(`SELECT count(*)::int AS n FROM public.partner_applications
    WHERE auth_user_id = '${BUYER}'::uuid`), 1, 'however many submits arrived, one row exists');
  await db.exec(`UPDATE public.write_quota SET used_count = 0`);
});

// ── budgets, boards, view counters ───────────────────────────────────────────
step('daily write budgets are enforced in the database', async () => {
  await asBuyer();
  // The buyer has no seller profile beyond the one created earlier, so listings
  // are allowed; the budget is what must stop them.
  const body = JSON.stringify({ type: 'swap', brand: 'Apple', model: 'Spam Test Phone', want: 'anything at all' });
  let posted = 0;
  for (let i = 0; i < 12; i++) {
    try {
      await value(`SELECT public.create_swap_listing('${body.replace(/'/g, "''")}'::jsonb)`);
      posted += 1;
    } catch (error) {
      assert.ok(String(error.message).includes('Limit reached'), `unexpected failure at ${i + 1}: ${error.message}`);
      break;
    }
  }
  assert.equal(posted, 10, 'the eleventh post in a day is refused before it is inserted');
  assert.equal(await value(`SELECT count(*)::int AS n FROM public.swap_listings WHERE model = 'Spam Test Phone'`), 10);
  await asRoot();
  await db.exec(`DELETE FROM public.swap_listings WHERE model = 'Spam Test Phone'`);
  await db.exec(`UPDATE public.write_quota SET used_count = 0`);
});

step('the admin board reports live numbers and never a raw card', async () => {
  await asAdmin();
  const board = await value(`SELECT public.admin_platform_board('dashboard', 50)`);
  assert.ok(Number(board.summary.used_available) >= 2);
  assert.equal(typeof Number(board.summary.ad_revenue), 'number');
  assert.equal(board.rows.length >= 1, true, 'the dashboard is the audit trail');
  const sellers = await value(`SELECT public.admin_platform_board('sellers', 50)`);
  assert.equal(sellers.rows.length, 2);
  const serialised = JSON.stringify(sellers.rows);
  assert.equal(serialised.includes('123456789'), false);
  assert.equal(serialised.includes('ghana_card_hash'), false);
  const orders = await value(`SELECT public.admin_platform_board('orders', 50)`);
  assert.ok(orders.rows.length >= 2);
  const unknown = await value(`SELECT public.admin_platform_board('secrets', 50)`);
  assert.deepEqual(unknown.rows, [], 'an unknown section yields nothing');
  await asBuyer();
  await expectCode(() => value(`SELECT public.admin_platform_board('sellers', 10)`), '42501');
});

step('views are counted by the database and capped per session', async () => {
  await asSeller();
  const listingId = (await value('SELECT public.get_my_swap_listings()'))[0].id;
  await asAnon();
  await value(`SELECT public.record_listing_view('${listingId}')`);
  await value(`SELECT public.record_listing_view('${listingId}')`);
  await value(`SELECT public.record_listing_view('00000000-0000-0000-0000-000000000000')`);
  await asRoot();
  const views = await value(`SELECT views FROM public.swap_listings WHERE id = '${listingId}'`);
  assert.equal(views, 2, 'anonymous browsing still counts, but only against an active listing');
});

step('a banned seller loses the board and the boost', async () => {
  await asAdmin();
  const sellers = await value(`SELECT public.admin_platform_board('sellers', 50)`);
  const target = sellers.rows.find((r) => r.name === 'Kojo Traders');
  await value(`SELECT public.admin('ban_seller', '{"p_seller_id":"${target.id}","p_reason":"serial non-delivery"}'::jsonb)`);
  await asSeller();
  await expectRefused(() => value(`SELECT public.create_swap_listing('${LISTING_JSON}'::jsonb)`), 'cannot post listings');
  const bannedListingId = (await value('SELECT public.get_my_swap_listings()'))[0].id;
  await expectRefused(() => value(`SELECT public.request_listing_promotion('${bannedListingId}', 24)`),
    'only approved listings');
  await asRoot();
  assert.equal(await value(`SELECT count(*)::int AS n FROM public.swap_listings
    WHERE seller_auth_id = '${SELLER}' AND status IN ('pending','active')`), 0,
    'a ban pulls every live listing down in the same transaction');
  await asAdmin();
  await value(`SELECT public.admin('unban_seller', '{"p_seller_id":"${target.id}"}'::jsonb)`);
  await asRoot();
  assert.equal(await value(`SELECT is_banned FROM public.sellers WHERE id = '${target.id}'`), false);
});

step('the privilege sweep leaves nothing anonymous that should not be', async () => {
  await asRoot();
  const posture = await value(`
    SELECT coalesce(jsonb_object_agg(proname, allowed), '{}'::jsonb) AS r
    FROM (
      SELECT p.proname,
             has_function_privilege('anon', p.oid, 'EXECUTE') AS allowed
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('get_used_inventory','record_listing_view','admin','admin_platform_board',
                          'get_wholesale_catalog','get_my_seller_profile','get_my_wholesale_account',
                          'get_my_partner_application','get_my_swap_listings','create_swap_lead',
                          'save_seller_profile','apply_store_partner','place_wholesale_order',
                          'admin_note','admin_set_promotion','admin_set_seller','identity_pepper',
                          'derive_card_identity','consume_write_quota','price_wholesale_items',
                          'admin_private_execute')
    ) x
  `);
  // Only the two anonymous shopper reads survive; everything else is 42501 for
  // anon at the GRANT level, before any of our own checks run.
  assert.deepEqual(
    Object.entries(posture).filter(([, allowed]) => allowed).map(([name]) => name).sort(),
    ['get_used_inventory', 'record_listing_view'],
  );
  const authHolds = await value(`
    SELECT coalesce(jsonb_agg(proname ORDER BY proname), '[]'::jsonb) AS r FROM (
      SELECT p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND p.proname IN ('get_used_inventory','record_listing_view','create_swap_listing','save_seller_profile',
                          'get_my_seller_profile','get_wholesale_catalog','apply_store_partner','place_wholesale_order',
                          'admin_platform_board','admin')
    ) y
  `);
  assert.deepEqual(authHolds, [
    'admin', 'admin_platform_board', 'apply_store_partner', 'create_swap_listing', 'get_my_seller_profile',
    'get_used_inventory', 'get_wholesale_catalog', 'place_wholesale_order', 'record_listing_view',
    'save_seller_profile',
  ], 'a signed-in shopper holds exactly the reviewed surface');
  // Supabase grants EXECUTE to PUBLIC by default: prove nothing slipped through.
  const leaked = await value(`
    SELECT coalesce(jsonb_agg(proname ORDER BY proname), '[]'::jsonb) AS r FROM (
      SELECT p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND has_function_privilege('public', p.oid, 'EXECUTE')
        AND p.prosrc ~ 'public\\.(sellers|swap_listings|swap_leads|used_inventory|wholesale_dealers|wholesale_orders|partner_applications|ad_payments|admin_audit_log|write_quota)'
    ) z
  `);
  assert.deepEqual(leaked, [], 'no platform function is executable by PUBLIC');
});

step('re-running the migration is safe after data exists', async () => {
  await asRoot();
  await db.exec(migration);
  await asBuyer();
  assert.equal((await value('SELECT public.get_my_wholesale_account()')).status, 'approved',
    'existing approvals survive a re-apply');
});

// ── the live project ran 20260828 first ──────────────────────────────────────
// A fresh checkout only ever runs the follow-up, which is what every step above
// tests. These two steps model the project that already applied
// 20260828_platform_tables.sql — the shape that is actually deployed.
const legacyMigration = await readFile(
  new URL('../supabase/migrations/20260828_platform_tables.sql', import.meta.url),
  'utf8',
);

async function liveShapedDb() {
  const local = new PGlite({ extensions: { pgcrypto } });
  await local.exec('CREATE EXTENSION pgcrypto');
  await local.exec(bootstrapSql);
  await local.exec(legacyMigration);
  return local;
}

step('converging the deployed shape keeps the board an operator typed', async () => {
  const local = await liveShapedDb();
  // The legacy demo signup wrote a password and a card number; the used board was
  // typed in by hand; a legacy policy referenced admin_allowlist directly.
  await local.exec(`INSERT INTO public.used_inventory (id, origin, brand, name, price, is_sold)
                     VALUES ('unit-1', 'uk', 'Apple', 'iPhone 13 (typed by the team)', 5200, false),
                            ('unit-2', 'uk', 'Apple', 'iPhone 12 (already sold)', 4200, true);
                    INSERT INTO public.sellers (id, name, phone, password_hash, ghana_card, role)
                     VALUES ('seller-1', 'Kwame', '+233201112222', '5f4dcc3b5aa7', 'GHA-1002003004-0', 'seller');
                    INSERT INTO public.swap_listings (id, seller_id, seller_name, seller_phone, brand, model, price, status)
                     VALUES ('listing-1', 'seller-1', 'Kwame', '+233201112222', 'Apple', 'iPhone 13', 5000, 'active');`);
  // Marketplace rows whose shape is security-relevant are emptied (the operator
  // exports them first, which is what the runbook tells them to do).
  await local.exec('DELETE FROM public.swap_listings; DELETE FROM public.sellers;');
  await local.exec(migration);

  const cols = await local.query(`SELECT coalesce(jsonb_agg(column_name ORDER BY column_name), '[]'::jsonb) ->> 0 AS probe,
    count(*) FILTER (WHERE column_name = 'password_hash') AS legacy_credentials,
    count(*) FILTER (WHERE column_name = 'auth_user_id') AS keyed_to_auth
    FROM information_schema.columns WHERE table_schema='public' AND table_name='sellers'`);
  assert.equal(cols.rows[0].legacy_credentials, 0, 'the credential column does not survive convergence');
  assert.equal(cols.rows[0].keyed_to_auth, 1, 'the seller table is keyed to Supabase Auth');
  const kept = await local.query(`SELECT count(*)::int AS n FROM public.used_inventory WHERE is_sold = false`);
  assert.equal(kept.rows[0].n, 1, 'stock already typed up is preserved, not rebuilt');
  const sold = await local.query(`SELECT sold_at FROM public.used_inventory WHERE id = 'unit-2'`);
  assert.equal(sold.rows[0].sold_at, null, 'the new sold_at column is not back-filled with an invented date');
  const policyRows = await local.query(`SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'used_inventory' ORDER BY policyname`);
  assert.deepEqual(policyRows.rows.map((row) => row.policyname),
    ['Admin full access used inventory', 'Public reads available used stock'],
    'the TO-less legacy policies were replaced, not stacked on top of the new ones');
  const board = await local.query(`SELECT jsonb_array_length(public.get_used_inventory('uk')) AS n`);
  assert.equal(board.rows[0].n, 1, 'the migrated board reads through the new RPC');
  const paidDefault = await local.query(`SELECT column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_payments' AND column_name='status'`);
  assert.match(String(paidDefault.rows[0].column_default), /pending/,
    'a payment row can no longer be completed-by-default');
  await local.close();
});

step('convergence refuses to rebuild a table that still holds rows', async () => {
  const local = await liveShapedDb();
  await local.exec(`INSERT INTO public.sellers (id, name, phone, password_hash, ghana_card, role)
                    VALUES ('seller-1', 'Kwame', '+233201112222', '5f4dcc3b5aa7', 'GHA-1002003004-0', 'seller');`);
  await assert.rejects(() => local.exec(migration),
    /has 1 row\(s\) and does not match the reviewed shape/,
    'it must stop and explain instead of dropping data');
  const still = await local.query(`SELECT count(*)::int AS n FROM public.sellers`);
  assert.equal(still.rows[0].n, 1, 'the aborted migration left the rows alone');
  await local.close();
});


let failures = 0;
for (const { name, fn } of steps) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}\n     ${error.message.split('\n').join('\n     ')}`);
  }
}
await db.close();

if (failures) {
  console.error(`\n${failures}/${steps.length} platform migration contract checks failed`);
  process.exitCode = 1;
} else {
  console.log(`\nall ${steps.length} platform migration contract checks passed`);
}
