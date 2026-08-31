# Valmont Gadgets

Production storefront and server-authoritative checkout for Valmont Gadgets.

## Quality gate

The release artifact is generated into `public/` from an explicit allowlist. Source files are never deployed directly.

```bash
npm ci
npm run ci
```

`npm run ci` performs JavaScript/type checks, API and payment security tests, two-history PostgreSQL migration tests, JSDOM browser identity/storage tests, production generation, hydration and content audits, strict CSP/cache/deployment verification, and a deterministic rebuild comparison. CI also runs `npm audit --audit-level=high`.

Useful individual commands:

| Command | Purpose |
|---|---|
| `npm test` | Valmont-Pay, webhook, API, and admin authorization tests |
| `npm run test:migration` | Apply the canonical migration to both supported PGlite histories and assert SQL/RLS/grant contracts |
| `npm run test:browser` | Verify Auth restoration, pending/suspended/approved dealer authorization, UUID-scoped storage, logout isolation, and page script safety |
| `npm run build` | Generate CSS, JavaScript, product markup, sitemap, and the allowlisted `public/` artifact |
| `npm run verify` | Verify source hydration/content and the deployable artifact, including deterministic output |
| `npm run ci` | Complete required release gate |

GitHub Actions runs the same gate for pull requests and protected branches and retains the verified artifact for seven days.

## Production architecture

- **Storefront:** static HTML/CSS/JavaScript; Supabase Auth is verified with `getUser()`, not trusted from local cached claims.
- **Account data:** private cart, wishlist, history, addresses, and preferences are namespaced by the verified Auth UUID. Guest shopping intent is transferred once after authentication and removed on logout.
- **Catalog and dealer access:** anonymous catalog data comes from a reviewed projection RPC; direct product-table reads are admin-only. Dealer status and prices come from authenticated PostgreSQL RPCs only after approval. Browser metadata/local storage cannot grant dealer privileges, dealer costs are absent from public bundles, and dealers cannot self-approve.
- **Checkout:** `POST /api/valmontpay/initialize` verifies optional bearer identity, reprices active products in Supabase (including approved dealer pricing), computes delivery server-side, atomically reserves inventory, creates an idempotent Pending order, and opens the hosted Valmont-Pay URL.
- **Payment:** only a correctly signed, tenant-bound webhook can call the service-role payment RPC. Amount, reference, state, and stock transitions are checked atomically and idempotently.
- **Database:** `supabase/migrations/20260814000100_production_hardening.sql` is the canonical production-hardening migration. Mutation RPCs are service-role-only; shopper RPCs derive identity from `auth.uid()`.
- **Browser policy:** executable inline scripts and event attributes are prohibited. The production CSP permits only the local pinned Supabase bundle plus narrowly scoped Supabase and analytics origins.
- **Deployment:** Vercel publishes only `public/`. Fingerprinted assets are immutable; pages, manifests, service workers, and API responses are not. The generated service worker does not cache API, cross-origin, account, or admin responses.

## Required production configuration

Set secrets in the hosting platform, never in source control:

| Variable | Requirement |
|---|---|
| `VALMONTPAY_SECRET_KEY` | Required server-only tenant key |
| `VALMONTPAY_WEBHOOK_SECRET` | Required server-only HMAC signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Required server-only key for narrow checkout/payment operations |
| `SUPABASE_URL` | Recommended explicit project URL (a project default currently exists) |
| `SUPABASE_ANON_KEY` | Recommended explicit public Auth key (a public project default currently exists) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended pair for distributed production rate limits; a bounded per-isolate fallback is used without them |
| `SITEMAP_LASTMOD` | Optional deterministic `YYYY-MM-DD` build override |

Do not configure `VALMONTPAY_GATEWAY_URL` in production; it exists for isolated tests only. Rotate a secret immediately if it appears in logs, chat, an artifact, or Git history.

## Future upgrades

These concepts are documented for later and are **not promises of currently available services**:

- [ValmontAI authenticated action assistant](docs/FUTURE_VALMONTAI_ACTION_ASSISTANT.md)
- [Supplier and managed-orders network](docs/FUTURE_SUPPLIER_NETWORK.md)

## Release and operations

- [Production migration, release, verification, incident response, and rollback runbook](docs/PRODUCTION_RUNBOOK.md)
- [Required Supabase authentication recovery redirects](docs/AUTH_REDIRECTS.md)
- [Valmont-Pay endpoint and trust-boundary reference](docs/VALMONTPAY.md)
- [Controlled GH₵1 live-payment test](docs/VALMONTPAY_LIVE_TEST.md)

A green local/CI migration harness proves the migration contract against representative schema histories; it does **not** prove that a remote database has been migrated. Every environment must be migrated and verified using the runbook before traffic is promoted.
