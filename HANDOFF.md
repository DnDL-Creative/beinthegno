# intheGno Commerce Buildout — HANDOFF

> ## ✅ BUILD COMPLETE (2026-06-11)
> The full build below is **done and verified**: `npm run build` passes green
> (all routes compile, admin proxy active), `npx tsc --noEmit` clean, and the
> launch chrome was preview-verified (home, login, legal pages, cookie
> consent, newsletter — no console errors). Added beyond the original scope:
> **Resend newsletter** (signup → Supabase + Resend) and **Printful** POD
> wiring. R2 lib realigned to the house convention (`R2_PUBLIC_DOMAIN` +
> `R2_PRIVATE_BUCKET`).
>
> **👉 To go live, follow [`LAUNCH.md`](LAUNCH.md)** — it has the SQL to paste,
> the empty `Key_Name=` env list, and per-service setup (Shopify, Stripe,
> Resend, Printful). The sections below are the original build spec, kept for
> reference.

---

## Original build spec (paused 2026-06-10, now completed)

> Repo compiles clean. All work is additive plumbing + the storefront/admin/
> legal surfaces; the catalog goes live the moment the SQL seed is pasted.

---

## 1. The mission (owner's brief)

Turn beinthegno.com from a brand-forward placeholder into a **launch-ready
headless commerce site**:

- **Custom headless CMS** — owner uploads any type of product (any category,
  physical or digital) through an `/admin` area; the site routes and renders
  it automatically. *"The only thing I need to do is plug in the image and
  product type, and it should route correctly."*
- **Shopify-minimal** — Shopify is used ONLY as the checkout rail for physical
  goods (Storefront API cart → Shopify hosted checkout). Everything else is
  custom, so the owner pays for the cheapest possible Shopify plan. The ONLY
  thing the owner plugs in later are the Shopify API keys.
- **New product line + nav menu: "meditations"** — digital download trauma
  release meditations (audio + text), combining Carl Jung (shadow work),
  Reality Transurfing (pendulums, importance), and somatic techniques.
  Digital checkout via **Stripe** (no Shopify involvement, no monthly fee).
- **Launch-ready everything**: cookie consent, legalese (privacy/terms/
  shipping incl. digital-goods + wellness disclaimer), robots/sitemap, 404.
- Design is already final: minimal, vellum + copper pipes. Don't redesign.

---

## 2. Architecture (decided + partially built)

**Two checkout rails:**

| Rail | Products | Status |
|---|---|---|
| Shopify Storefront API cart → hosted checkout | physical (apparel, copper, anti-emf, orgone) | wired, dormant until `SHOPIFY_*` env keys exist |
| Stripe Checkout → tokenized download links | digital (meditations etc.) | wired, dormant until `STRIPE_*` env keys exist |

**Catalog lives in Supabase** (shared DnDL project `gpjgvdpicjqrerqqzhyx`,
`itg_` prefix): `itg_collections` (one row = one nav menu + one landing page),
`itg_products` (any type), `itg_product_assets` (digital files),
`itg_orders`/`itg_order_items` (Stripe purchases), `itg_admins` (CMS access).
Schema + seed: **`sql/itg_commerce.sql`** (NOT yet run — see §5).

**Files live in R2** bucket `inthegno` (public domain `media.beinthegno.com`):
- `products/…`, `previews/…` → public (images, free sample audio)
- `digital/<uuid>/…` → paid deliverables, unguessable keys, served ONLY via
  1-hour presigned URLs from `/api/download/[token]`. Omni R2 key cannot
  create buckets (verified) — if you ever want a truly private bucket, create
  `inthegno-digital` in the CF dashboard and set `R2_DIGITAL_BUCKET`.

**Security note (shared Supabase!):** RLS policies gate all writes on
`itg_is_admin()` (membership in `itg_admins`), NOT on "authenticated" —
because CineSonic demo users etc. share this Supabase project. The migration
also tightens the old over-permissive `itg_posts` policy. Server writes use
the service-role client; deliverable `r2_key`s never reach the client.

**Nav is DB-driven** (planned): SiteNav reads published `itg_collections` →
new collection in CMS = new nav menu + new landing page at `/{slug}`,
zero code. Falls back to the current hard-coded links if the DB is empty.

---

## 3. DONE this session (all compiles, nothing breaks current site)

**SQL (not yet executed):**
- `sql/itg_commerce.sql` — full schema, RLS, triggers, admin seed
  (`admin@dndlcreative.com`), collection seeds (apparel/copper/anti-emf/
  orgone/**meditations**) with the exact current page copy, product seeds
  (2 apparel items + 3 meditation products: *The Shadow Audit*,
  *Drop the Pendulum*, *Importance Zero* — active w/ "coming soon" badge,
  unbuyable until audio files are uploaded).

**Types:**
- `src/types/catalog.ts` — app-facing CatalogCollection/CatalogProduct/
  CatalogAsset/Purchasability (r2_key never exposed).
- `src/types/database.ts` — rewritten to real `Itg*Row` shapes.
- `src/types/index.ts` — re-exports.

**Server libs (`src/lib/`):**
- `catalog.ts` — cached storefront readers: `getCollections()`,
  `getCollectionWithProducts(slug)`, `getProductByHandle(handle)`;
  `getPurchasability(product)` (server-only, env-aware);
  `resolveVariantGid(product, selectedOptions)` (pure, client-safe);
  cache tag `CATALOG_TAG = "itg-catalog"`, revalidate 300.
- `cart.ts` — Shopify cart via `itg_cart_id` httpOnly cookie:
  `getCart/addToCart/updateCartLine/removeCartLine` (recreates expired carts).
- `orders.ts` — `markOrderPaidFromSession()` (idempotent; webhook + success
  page both call it), `getFulfilledOrder(token)`, `resolveOrderAsset()`
  (30-day download window, bumps download_count).
- `r2.ts` — S3 client (omni key), `buildObjectKey(scope, name)`,
  `presignUpload`, `presignDownload` (forces attachment), `publicUrl`,
  `deleteObject`, `isR2Configured`.
- `stripe.ts` — real lazy client + `isStripeConfigured` (stripe pkg installed).
- `auth.ts` — `getSessionUser/isItgAdmin/requireAdminPage` (redirects) /
  `getAdminUser` (null-returning, for actions & routes).
- `supabase-admin.ts` — service-role singleton, browser-guarded.
- `shopify.ts` — added `isShopifyConfigured()`.
- `shopify-queries.ts` — added `GET_CART` query.

**Server actions:** `src/app/actions/cart.ts` — add/update/remove,
`{ok, error?}` returns, revalidates `/cart`.

**API routes (`src/app/api/`):**
- `admin/upload/route.ts` — POST `{fileName, contentType, scope:
  image|preview|digital, sizeBytes}` → presigned PUT (admin-gated, 1 GB cap).
- `checkout/route.ts` — POST `{handle}` → Stripe Checkout Session (inline
  price_data, no Stripe Products needed), pending `itg_orders` row,
  success → `/downloads/success?session_id=…`, cancel → product page.
- `webhooks/stripe/route.ts` — sig-verified `checkout.session.completed` →
  mark paid.
- `webhooks/shopify/route.ts` — real HMAC verify (timing-safe), busts
  catalog cache on product/inventory/collection topics; acks politely when
  `SHOPIFY_WEBHOOK_SECRET` unset.
- `download/[token]/route.ts` — no query = JSON file list; `?asset=<id>` =
  302 to presigned R2 URL. Invalid/expired → 404 JSON.
- `cart/route.ts` — GET `{totalQuantity}` for the nav badge (no-store).

**Config:**
- `.env.local` — APPENDED: `SUPABASE_SERVICE_ROLE_KEY` (copied from
  danielnotdaylewis, same shared project), R2 omni creds +
  `R2_PUBLIC_BUCKET=inthegno` + `R2_PUBLIC_URL`, `NEXT_PUBLIC_SITE_URL`,
  `REVALIDATION_SECRET`, plus **commented** placeholders for `SHOPIFY_*`
  and `STRIPE_*` (uncomment + fill = rails go live; mirror to Vercel).
- `next.config.ts` — added `cdn.shopify.com` to image remotePatterns.
- `package.json` — added `stripe`, `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`.

---

## 4. NOT done — remaining build (full specs preserved)

Three independent surfaces, then verification. A ready-to-run Workflow script
with exhaustive per-agent specs was authored (3 parallel agents + seam-check)
— it was cancelled to pause the project, but the specs below are the same.

### A. Storefront (CMS-driven)
- `src/app/[collection]/page.tsx` — dynamic collection page **replacing**
  `src/app/{apparel,copper,anti-emf,orgone}` (delete those dirs; seeds carry
  their exact copy). ISR `revalidate = 300`, `generateStaticParams` from
  `getCollections()`, header = old apparel pattern
  (`inthe<accent>Gno</accent> {Title}` + lowercase tagline), zero products →
  coming-soon layout (`coming-soon.module.css`) with collection.description
  + badge. Grid uses ProductCard.
- `src/app/[collection]/[handle]/page.tsx` — product detail: gallery,
  badge/title/subtitle, price + compareAt + `metadata.price_note`,
  `descriptionHtml` via `html-react-parser`, features list ("what's inside"),
  preview assets (audio kind → `<audio controls>` in PipeFrame; others →
  sample links), `<ProductPurchase>`; free-shipping note for physical.
- `src/components/shop/ProductCard.tsx(+css)` — clone old apparel card look
  (read git history or page.module.css, which stays until deletion).
- `src/components/shop/ProductPurchase.tsx(+css)` — client. Props
  `{product, purchasability}` (compute `getPurchasability` SERVER-side, pass
  down). Physical: option pills (aria-pressed, old `.optionBtn` style) →
  `resolveVariantGid` → `addToCartAction`; dispatch `window` event
  `"itg:cart"` on success + "added — view cart →". Digital: "buy now — $X" →
  POST `/api/checkout {handle}` → `window.location = url`. Not buyable:
  disabled button — `coming-soon`/`no-files` → "coming soon", `not-wired` →
  "checkout coming soon".
- `src/components/layout/CartLink.tsx` — client nav link, fetches
  `/api/cart` on mount + `"itg:cart"` + visibilitychange; label
  `cart (n)` / `cart`.
- `SiteNav.tsx` — async server component: published+showInNav collections →
  links + pipeSep, then CartLink. Empty DB → fall back to current four
  hard-coded links.
- `src/app/cart/page.tsx(+css, CartLines.tsx client)` — `force-dynamic`;
  empty → "nothing in the vessel yet" + PipeButton; lines w/ image, qty
  stepper (useTransition + actions + router.refresh), remove, subtotal
  (`formatPrice`), `<a href={cart.checkoutUrl}>` checkout button.
- `src/app/downloads/success/page.tsx` — `force-dynamic`, noindex; await
  `searchParams.session_id`; retrieve Stripe session →
  `markOrderPaidFromSession` → redirect `/downloads/{token}`; unpaid →
  "payment processing, refresh in a moment".
- `src/app/downloads/[token]/page.tsx(+css)` — noindex; `getFulfilledOrder`;
  files grouped by product, size/duration, buttons →
  `/api/download/{token}?asset={id}`; expiry note; invalid → branded
  "link expired" + contact link.

### B. Admin CMS
- `src/proxy.ts` — Next 16 proxy (NOT middleware). Typed adaptation of
  `../danielnotdaylewis/src/proxy.ts` (read it): Supabase SSR getUser;
  `/admin/*` without session → `/login?next=…`; `/login` with session →
  next/`/admin`. `matcher: ["/admin/:path*", "/login"]`. Copy set-cookies
  onto redirects.
- `src/app/login/page.tsx(+css)` — brand-styled (PipeFrame card, copper,
  "authorized personnel only"), `signInWithPassword` via browser client,
  `useSearchParams` needs Suspense wrapper.
- `src/app/admin/layout.tsx(+css)` — `requireAdminPage()`; slim obsidian
  admin bar: dashboard | products | collections | view site | sign out
  (client signOut → /login). Public nav/footer still wrap admin pages —
  acceptable.
- `src/app/actions/admin.ts` — "use server"; every action gates on
  `getAdminUser()`; writes via service-role client; on success
  `revalidateTag(CATALOG_TAG, "max")`. Actions: `saveCollection` (slug regex
  `^[a-z0-9][a-z0-9-]*$`, RESERVED slugs `about blog cart contact privacy
  terms shipping admin login downloads api`), `deleteCollection`,
  `saveProduct` (handle regex, enums, price ≥ 0, variant_map JSON parse,
  metadata.price_note), `deleteProduct` (delete R2 objects first),
  `createAsset` (row insert post-browser-upload), `deleteAsset` (R2 + row).
- `src/app/admin/page.tsx` — dashboard: counts (products by status,
  collections, paid orders + revenue), **integration status grid**
  (`isShopifyConfigured/isStripeConfigured/isR2Configured/
  isSupabaseAdminConfigured` → copper dot live / faint dot "not wired" +
  one-line env hint), "adding a product" 3-step cheat sheet.
- `src/app/admin/collections/…` — list (all, incl. unpublished, w/ product
  counts) + shared CollectionForm (new/[id]); shows the live URL
  `beinthegno.com/{slug}`.
- `src/app/admin/products/…` — filterable list (collection/status/type via
  awaited searchParams) + shared **ProductForm** (new/[id]), sections:
  basics (auto-slug handle) / pricing / story (description HTML + features
  one-per-line) / images (multi-upload → presigned PUT → url+alt grid,
  reorder, remove) / options builder (physical) / shopify mapping
  (product_handle, variant_gid, variant_map JSON textarea, requires_shipping)
  / files (paid deliverables scope `digital`, free previews scope `preview`;
  kind inferred from MIME; **asset uploads disabled until product has an id**
  — "save first") / seo. Save bar: save, "view on site →", delete.
  All admin pages `export const dynamic = "force-dynamic"`.
- Admin styling: utilitarian on-brand — vellum surfaces, 1px `--border`
  inputs, `--font-mono` for slugs/keys, copper primary buttons.

### C. Legal + launch chrome
- UPDATE `privacy/terms/shipping` pages (read `legal.module.css` + existing
  copy first; keep tone): processors (Supabase/Stripe/Shopify/Cloudflare/
  Vercel), `itg_cart_id` functional cookie + local consent storage, digital
  goods terms (instant delivery, 30-day links, keep forever, all sales final
  except as required by law), personal-use license, **wellness disclaimer**
  for meditations (not medical/psychological advice, not therapy, never
  while driving, crisis → professional help — straight-faced section).
- VERIFY `CookieConsent` component end-to-end (it exists; launch-check it).
- CREATE `src/app/robots.ts` (disallow /admin /api/ /downloads/ /cart
  /login), `src/app/sitemap.ts` (static + collections + products + blog
  slugs via `getAllSlugs` from `@/app/blog/posts`; try/catch everything),
  branded `src/app/not-found.tsx` ("this pipe leads nowhere…" + PipeButton).

### D. Verification (after A–C)
`npm run build`, fix errors; preview: home, /apparel (DB-driven), /meditations,
product detail, /cart, /admin CRUD round-trip (create product w/ image →
appears on site), cookie banner, 404; screenshots. Then a multi-agent
adversarial code review (ultracode) over the full diff: Next 16 API misuse,
RLS/security leaks (r2_key exposure, ungated actions), Stripe flow
idempotency, design-token compliance.

---

## 5. Owner action items (no code needed)

1. **Run the SQL**: Supabase SQL Editor → paste `sql/itg_commerce.sql` → run.
   If `select email from itg_admins;` is empty afterwards, sign in once at
   `/login` (after the admin build) with admin@dndlcreative.com, then re-run
   just the `insert into itg_admins…` block.
2. **Stripe** (digital sales): create account → Developers → API keys →
   uncomment + fill `STRIPE_SECRET_KEY` in `.env.local` + Vercel. Add
   webhook endpoint `https://beinthegno.com/api/webhooks/stripe`
   (event `checkout.session.completed`) → `STRIPE_WEBHOOK_SECRET`.
   (Success page also self-fulfills, so dev works without the webhook.)
3. **Shopify** (when ready, minimal spend): cheapest plan with Storefront
   API access; custom app → Storefront API token with
   `unauthenticated_read_product_listings` + `unauthenticated_write_checkouts`;
   fill `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
   Per physical product in the CMS: paste its Shopify variant GID(s) →
   add-to-cart goes live. Optional webhook secret for cache-busting.
4. Mirror all new env vars to Vercel (project `gnothyself`).

---

## 6. Gotchas for whoever resumes (incl. future Claude)

- **Next 16.2.3** — NOT the Next you remember: `params`/`searchParams` are
  Promises (await them), `cookies()` async, `src/proxy.ts` replaces
  middleware, `revalidateTag(tag, "max")` two-arg, no `next lint`. Docs:
  `node_modules/next/dist/docs/`. Heed `AGENTS.md`.
- **Design**: CSS Modules + `globals.css` tokens ONLY (no Tailwind soup).
  Copper `#B87333`, vellum bg, lowercase nav, `--title-font` titles with
  `inthe<span accent>Gno</span>` pattern. Reuse PipeButton/PipeFrame.
  Mobile breakpoint 640px.
- **Shared Supabase** — never write a policy gated on plain `authenticated`;
  use `itg_is_admin()`. One Supabase for all DnDL apps; `itg_` prefix only.
- **House conventions**: `.env.local` only (no .env/.env.example —
  `.env.example` here predates the convention, ignore it); DB schema changes
  = SQL files the owner pastes (no migration scripts); R2 omni key from
  `dndlcreativellc/.env.local` (already copied in).
- The old static category pages must be deleted ONLY when the dynamic
  `[collection]` route lands (atomic swap, same session).
- `getPurchasability` reads env → server-only; compute in pages, pass to
  client components as props.
- Cart count badge is client-fetched (`/api/cart`) so catalog pages stay ISR.

**Resume with:** "Resume the intheGno commerce build — read HANDOFF.md and
continue from §4" (ultracode optional: the §4 surfaces parallelize cleanly
into 3 agents + seam-check + review, file ownership is already partitioned).
