#!/usr/bin/env node
/**
 * PostgreSQL-compatible contract test for the production-hardening migration.
 *
 * PGlite is intentionally used only as a disposable test database. The two
 * schema cases exercise the repository's real deployment history: reviews.id
 * can be either TEXT (init.sql first) or BIGINT IDENTITY (reviews migration
 * first). Supabase remains the deployment target and should also run this
 * migration in a staging project before production.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const migration = await readFile(
  new URL('../supabase/migrations/20260814000100_production_hardening.sql', import.meta.url),
  'utf8',
);

function bootstrapSql(reviewIdDefinition) {
  return `
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;

    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
    $$;

    CREATE FUNCTION public.is_valmont_admin() RETURNS boolean
    LANGUAGE sql STABLE AS $$ SELECT false $$;

    CREATE TABLE public.products (
      id text PRIMARY KEY,
      name text NOT NULL,
      slug text UNIQUE NOT NULL,
      category_id text,
      price numeric NOT NULL DEFAULT 0,
      compare_at_price numeric DEFAULT 0,
      wholesale_price numeric DEFAULT 0,
      specs text,
      description text,
      badge text,
      stock integer DEFAULT 0,
      image_url text,
      images jsonb DEFAULT '[]'::jsonb,
      colors jsonb DEFAULT '[]'::jsonb,
      storage_options jsonb DEFAULT '[]'::jsonb,
      is_active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
    CREATE TABLE public.customers (
      id text PRIMARY KEY,
      name text NOT NULL,
      phone text,
      email text,
      addresses jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
    CREATE TABLE public.orders (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      order_number text UNIQUE NOT NULL,
      customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
      items jsonb DEFAULT '[]'::jsonb,
      subtotal numeric DEFAULT 0,
      delivery_fee numeric DEFAULT 0,
      total numeric NOT NULL DEFAULT 0,
      status text DEFAULT 'Pending',
      payment_method text,
      admin_notes text,
      payment_reference text,
      idempotency_key text,
      customer_name text,
      customer_phone text,
      customer_email text,
      customer_area text,
      customer_street text,
      delivery_address text,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
      updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
    CREATE UNIQUE INDEX idx_orders_idempotency_pending
      ON public.orders (customer_id, idempotency_key)
      WHERE status = 'Pending' AND idempotency_key IS NOT NULL;

    CREATE TABLE public.reviews (
      id ${reviewIdDefinition} PRIMARY KEY,
      product_id text REFERENCES public.products(id) ON DELETE CASCADE,
      customer_name text NOT NULL,
      customer_email text,
      rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment text,
      photo_url text,
      is_verified_buyer boolean DEFAULT true,
      is_approved boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.drop_flips (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      drop_date date NOT NULL DEFAULT timezone('utc', now())::date,
      device_id text NOT NULL,
      whatsapp text NOT NULL,
      prize_tier text NOT NULL,
      prize_label text NOT NULL,
      prize_code text NOT NULL,
      product_id text REFERENCES public.products(id) ON DELETE SET NULL,
      product_name text,
      claimed boolean DEFAULT false,
      account_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      account_email text,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );
    CREATE UNIQUE INDEX drop_flips_device_day ON public.drop_flips (device_id, drop_date);
    CREATE UNIQUE INDEX drop_flips_account_day ON public.drop_flips (account_id, drop_date);
    CREATE UNIQUE INDEX drop_flips_phone_day ON public.drop_flips (whatsapp, drop_date);

    CREATE TABLE public.sms_leads (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      phone text NOT NULL UNIQUE,
      network text,
      source text,
      created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
    );

    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.drop_flips ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sms_leads ENABLE ROW LEVEL SECURITY;

    CREATE FUNCTION public.ensure_customer_for_checkout(text,text,text,text,text,text,text)
      RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
    CREATE FUNCTION public.set_order_customer_snapshot(text,text,text,text,text,text,text)
      RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
        UPDATE public.orders
        SET customer_name = $2, customer_phone = $3, customer_email = lower($4),
            customer_area = $5, customer_street = $6, delivery_address = $7
        WHERE order_number = $1
      $$;

    GRANT EXECUTE ON FUNCTION public.ensure_customer_for_checkout(text,text,text,text,text,text,text)
      TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.set_order_customer_snapshot(text,text,text,text,text,text,text)
      TO anon, authenticated, service_role;
  `;
}

async function scalar(db, sql, params = []) {
  const result = await db.query(sql, params);
  return Object.values(result.rows[0])[0];
}

async function expectSqlState(action, sqlState) {
  await assert.rejects(action, (error) => {
    assert.equal(error.code, sqlState);
    return true;
  });
}

async function runCase(label, reviewIdDefinition) {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec('CREATE EXTENSION pgcrypto');
    await db.exec(bootstrapSql(reviewIdDefinition));
    await db.exec(migration);

    const stockColumns = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products'
        AND column_name IN ('stock', 'stock_quantity')
      ORDER BY column_name
    `);
    assert.deepEqual(stockColumns.rows, [{ column_name: 'stock' }]);

    const reviewType = await scalar(db, `
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'id'
    `);
    assert.equal(reviewType, reviewIdDefinition.startsWith('text') ? 'text' : 'bigint');

    await db.exec(`
      INSERT INTO auth.users (id, email)
      VALUES ('00000000-0000-4000-8000-000000000001', 'buyer@example.com');
      INSERT INTO public.customers (id, name, email)
      VALUES ('cust-1', 'Buyer', 'buyer@example.com');
      INSERT INTO public.products (id, name, slug, price, wholesale_price, stock, is_active) VALUES
        ('phone', 'Contract Phone', 'contract-phone', 10, 8, 100, true),
        ('cable', 'Contract Cable', 'contract-cable', 5, 4, 20, true);
    `);

    await db.exec('SET ROLE anon');
    const publicCatalog = await scalar(db, 'SELECT public.get_storefront_catalog()');
    assert.equal(publicCatalog.length, 2);
    assert.equal(Object.hasOwn(publicCatalog[0], 'wholesale_price'), false);
    await expectSqlState(() => db.query('SELECT * FROM public.products'), '42501');
    await db.exec('RESET ROLE');
    await db.exec('SET ROLE authenticated');
    assert.equal(await scalar(db, 'SELECT count(*)::integer FROM public.products'), 0);
    await db.exec('RESET ROLE');

    const duplicateCart = JSON.stringify([
      { product_id: 'phone', quantity: 2, selected_color: 'Black' },
      { product_id: 'phone', quantity: 3, selected_color: 'Blue' },
      { product_id: 'cable', quantity: 1 },
    ]);
    const createArgs = [
      'VG-CONTRACT-ABCDEFGHI', 'cust-1', duplicateCart,
      0, 0, 0, 'valmontpay', 'idem:aggregate', 'Accra Central',
    ];
    const created = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)',
      createArgs,
    );
    assert.equal(created.idempotent, false);
    assert.equal(Number(created.subtotal), 55);
    assert.equal(Number(created.delivery_fee), 35);
    assert.equal(Number(created.total), 90);
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 95);
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'cable'`), 19);

    const retried = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)',
      createArgs,
    );
    assert.equal(retried.idempotent, true);
    assert.equal(retried.order_number, created.order_number);
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 95);

    await db.query(
      `SELECT public.set_order_customer_snapshot($1,$2,$3,$4,$5,$6,$7)`,
      [created.order_number, 'Buyer', '0240000000', 'buyer@example.com', 'Accra Central', '1 Test Street', '1 Test Street'],
    );
    await db.query(
      `SELECT public.set_order_payment_reference($1, $2, $3)`,
      [created.order_number, 'VP-CONTRACT-1', 'contract test'],
    );
    const paid = await scalar(
      db,
      `SELECT public.confirm_order_paid($1, $2, $3, $4)`,
      [created.order_number, 90, 'VP-CONTRACT-1', '2026-08-14T12:00:00Z'],
    );
    assert.equal(paid.result, 'paid');
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 95);
    const repeatedPayment = await scalar(
      db,
      `SELECT public.confirm_order_paid($1, $2, $3, $4)`,
      [created.order_number, 90, 'VP-CONTRACT-1', '2026-08-14T12:00:00Z'],
    );
    assert.equal(repeatedPayment.result, 'already_paid');

    // Fifty cart lines catch accidental line truncation while aggregate demand
    // verifies that duplicate product rows reserve and release exact quantities.
    const longCart = JSON.stringify(Array.from({ length: 50 }, () => ({
      product_id: 'phone', quantity: 1, selected_storage: '256 GB',
    })));
    const longOrder = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)',
      ['VG-LONG-ABCDEFGHI', 'cust-1', longCart, 0, 0, 0, 'valmontpay', 'idem:long', 'Tema'],
    );
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 45);
    const released = await scalar(
      db,
      'SELECT public.release_order_reservation($1, $2)',
      [longOrder.order_number, 'contract test cleanup'],
    );
    assert.equal(released.result, 'released');
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 95);

    // Reservation failure must roll back all stock changes in the statement.
    await expectSqlState(
      () => db.query(
        'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9)',
        [
          'VG-NOSTOCK-ABCDEFGHI', 'cust-1',
          JSON.stringify([{ product_id: 'phone', quantity: 50 }, { product_id: 'cable', quantity: 50 }]),
          0, 0, 0, 'valmontpay', 'idem:no-stock', 'Tema',
        ],
      ),
      'P0001',
    );
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'phone'`), 95);
    assert.equal(await scalar(db, `SELECT stock FROM products WHERE id = 'cable'`), 19);

    await db.exec(`
      SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
      SELECT set_config(
        'request.jwt.claims',
        '{"email":"buyer@example.com","user_metadata":{"full_name":"Contract Buyer"}}',
        false
      );
    `);
    const review = await scalar(
      db,
      `SELECT public.submit_product_review('phone', 5, 'A valid contract test review.', 'https://images.unsplash.com/review.jpg')`,
    );
    assert.equal(review.result, 'pending_moderation');
    assert.equal(review.is_approved, false);
    assert.equal(review.is_verified_buyer, true);
    assert.ok(review.id !== null);
    for (const unsafePhoto of [
      'http://images.unsplash.com/no.jpg',
      'https://images.unsplash.com.evil.test/no.jpg',
      'https://eydsoqnpetqczaeqrscc.supabase.co/auth/v1/no.jpg',
    ]) {
      await expectSqlState(
        () => db.query(
          `SELECT public.submit_product_review('phone', 5, 'A valid contract test review.', $1)`,
          [unsafePhoto],
        ),
        '22023',
      );
    }

    // Dealer state is account-bound and starts pending. A shopper can submit or
    // refresh contact details through the narrow RPC, but cannot approve the
    // account through table grants, JWT metadata, or a reapplication.
    await db.exec('SET ROLE authenticated');
    const application = await scalar(
      db,
      `SELECT public.apply_for_dealer('Contract Gadgets', '0240000000')`,
    );
    assert.equal(application.status, 'pending');
    const dealerProfile = await scalar(db, 'SELECT public.get_my_dealer_profile()');
    assert.equal(dealerProfile.status, 'pending');
    assert.equal(dealerProfile.email, 'buyer@example.com');
    await expectSqlState(
      () => db.query('SELECT public.get_my_dealer_prices()'),
      '42501',
    );
    await expectSqlState(
      () => db.query(`
        INSERT INTO public.dealer_accounts
          (account_id, business_name, phone, email, status)
        VALUES
          ('00000000-0000-4000-8000-000000000001', 'Forged', '0240000000', 'buyer@example.com', 'approved')
      `),
      '42501',
    );
    await db.exec(`
      UPDATE public.dealer_accounts
      SET status = 'approved'
      WHERE account_id = '00000000-0000-4000-8000-000000000001'
    `);
    await db.exec('RESET ROLE');
    assert.equal(
      await scalar(db, `SELECT status FROM public.dealer_accounts WHERE account_id = '00000000-0000-4000-8000-000000000001'`),
      'pending',
    );

    // Simulate the trusted admin/service boundary, then prove another shopper
    // RPC call cannot modify or downgrade that decision.
    await db.exec(`
      UPDATE public.dealer_accounts
      SET status = 'approved', reviewed_at = timezone('utc', now())
      WHERE account_id = '00000000-0000-4000-8000-000000000001'
    `);
    await db.exec('SET ROLE authenticated');
    const approvedReapplication = await scalar(
      db,
      `SELECT public.apply_for_dealer('Forged Rename', '0550000000')`,
    );
    assert.equal(approvedReapplication.status, 'approved');
    const approvedPrices = await scalar(db, 'SELECT public.get_my_dealer_prices()');
    assert.deepEqual(approvedPrices, [
      { product_id: 'cable', wholesale_price: 4 },
      { product_id: 'phone', wholesale_price: 8 },
    ]);
    await db.exec('RESET ROLE');
    const protectedDecision = await db.query(`
      SELECT status, business_name, phone
      FROM public.dealer_accounts
      WHERE account_id = '00000000-0000-4000-8000-000000000001'
    `);
    assert.deepEqual(protectedDecision.rows, [{
      status: 'approved', business_name: 'Contract Gadgets', phone: '0240000000',
    }]);

    // The service-only checkout contract applies the same approved dealer
    // status and never trusts a browser-supplied unit price.
    const dealerOrder = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)',
      [
        'VG-DEALER-ABCDEFGHI', 'cust-1',
        JSON.stringify([{ product_id: 'phone', quantity: 1, unit_price: 0.01 }]),
        0, 0, 0, 'valmontpay', 'idem:dealer', 'Accra Central',
        '00000000-0000-4000-8000-000000000001',
      ],
    );
    assert.equal(dealerOrder.pricing_tier, 'dealer');
    assert.equal(Number(dealerOrder.subtotal), 8);
    assert.equal(Number(dealerOrder.total), 43);
    const dealerItems = await scalar(db, `
      SELECT items FROM public.orders WHERE order_number = 'VG-DEALER-ABCDEFGHI'
    `);
    assert.equal(Number(dealerItems[0].unit_price), 8);
    // Suspension immediately removes both protected price access and the
    // checkout tier. Reapplying cannot overwrite that trusted admin decision.
    await db.exec(`
      UPDATE public.dealer_accounts
      SET status = 'suspended', reviewed_at = timezone('utc', now())
      WHERE account_id = '00000000-0000-4000-8000-000000000001'
    `);
    await db.exec('SET ROLE authenticated');
    const suspendedProfile = await scalar(db, 'SELECT public.get_my_dealer_profile()');
    assert.equal(suspendedProfile.status, 'suspended');
    await expectSqlState(
      () => db.query('SELECT public.get_my_dealer_prices()'),
      '42501',
    );
    const suspendedReapplication = await scalar(
      db,
      `SELECT public.apply_for_dealer('Suspension Bypass', '0550000000')`,
    );
    assert.equal(suspendedReapplication.status, 'suspended');
    await db.exec('RESET ROLE');

    // An in-flight retry keeps the price tier actually stored with the order,
    // even if authorization changed after the original reservation.
    const dealerRetryAfterSuspension = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)',
      [
        'VG-DEALER-RETRYABCD', 'cust-1',
        JSON.stringify([{ product_id: 'phone', quantity: 1, unit_price: 99999 }]),
        99999, 0, 99999, 'valmontpay', 'idem:dealer', 'Accra Central',
        '00000000-0000-4000-8000-000000000001',
      ],
    );
    assert.equal(dealerRetryAfterSuspension.idempotent, true);
    assert.equal(dealerRetryAfterSuspension.order_number, dealerOrder.order_number);
    assert.equal(dealerRetryAfterSuspension.pricing_tier, 'dealer');
    assert.equal(Number(dealerRetryAfterSuspension.total), 43);
    assert.equal(
      await scalar(db, `SELECT pricing_tier FROM public.orders WHERE order_number = 'VG-DEALER-ABCDEFGHI'`),
      'dealer',
    );
    await db.query(
      'SELECT public.release_order_reservation($1, $2)',
      [dealerOrder.order_number, 'dealer contract cleanup'],
    );

    const suspendedOrder = await scalar(
      db,
      'SELECT public.create_pending_order($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)',
      [
        'VG-SUSPENDED-ABCDEFGHI', 'cust-1',
        JSON.stringify([{ product_id: 'phone', quantity: 1, unit_price: 0.01 }]),
        0, 0, 0, 'valmontpay', 'idem:suspended', 'Accra Central',
        '00000000-0000-4000-8000-000000000001',
      ],
    );
    assert.equal(suspendedOrder.pricing_tier, 'retail');
    assert.equal(Number(suspendedOrder.subtotal), 10);
    assert.equal(Number(suspendedOrder.total), 45);
    await db.query(
      'SELECT public.release_order_reservation($1, $2)',
      [suspendedOrder.order_number, 'suspended contract cleanup'],
    );

    const anonDealerExec = await scalar(db, `
      SELECT count(*)::integer
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public'
        AND routine_name IN ('apply_for_dealer', 'get_my_dealer_profile', 'get_my_dealer_prices')
        AND grantee IN ('anon', 'PUBLIC')
        AND privilege_type = 'EXECUTE'
    `);
    assert.equal(anonDealerExec, 0);

    const anonMutations = await scalar(db, `
      SELECT count(*)::integer
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public'
        AND routine_name IN (
          'create_pending_order', 'confirm_order_paid', 'set_order_payment_reference',
          'set_order_customer_snapshot', 'ensure_customer_for_checkout'
        )
        AND grantee IN ('anon', 'authenticated', 'PUBLIC')
        AND privilege_type = 'EXECUTE'
    `);
    assert.equal(anonMutations, 0);

    console.log(`✓ production migration: ${label} reviews.id`);
  } finally {
    await db.close();
  }
}

await runCase('TEXT', 'text DEFAULT gen_random_uuid()::text');
await runCase('BIGINT IDENTITY', 'bigint GENERATED BY DEFAULT AS IDENTITY');
console.log('✓ inventory, idempotency, review, and privilege contracts');
