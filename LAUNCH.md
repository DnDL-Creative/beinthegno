# intheGno — Launch Checklist

Everything you need to do to take beinthegno.com live. The code is done and
wired; these are the external accounts/keys and the one-time SQL paste.

> ⚠️ **START HERE:** The whole shop is database-driven. **Until you run the SQL
> in step 1, every collection and product page will 404** (apparel, copper,
> anti-emf, orgone, meditations) and the meditations menu won't appear — because
> the tables don't exist yet and there's no data to render. This is the #1 thing
> to do. The home, blog, and legal pages work without it; the shop does not.

---

## 1. Paste this SQL (one time, ~30 seconds)

Supabase dashboard → SQL Editor → New query → paste the **entire** contents of
[`sql/itg_commerce.sql`](sql/itg_commerce.sql) → Run.

It creates every commerce table (collections, products, product files,
orders, order items, admins, newsletter subscribers), all RLS security
policies, and seeds the five product lines (apparel, copper, anti-emf,
orgone, **meditations**) plus the starter products — using your existing
page copy, so the site looks the same, just database-driven.

**Verify it worked** — run these in the SQL Editor afterward:
```sql
select slug, published from itg_collections order by sort_order;   -- 5 rows
select handle, product_type, status from itg_products;             -- 5 rows
select email from itg_admins;                                      -- your email
```

If `itg_admins` is **empty**: it means your auth user didn't exist yet.
Go to `/login`, sign in once with **admin@dndlcreative.com** (set a password
in Supabase → Authentication → Users first if you haven't), then re-run just
this block from the bottom of the SQL file:
```sql
insert into public.itg_admins (user_id, email)
select id, email from auth.users where email = 'admin@dndlcreative.com'
on conflict (user_id) do nothing;
```

> The blog table (`itg_posts`) already exists from before — the migration
> only tightens its write policy, it won't touch your posts.

---

## 2. Keys to get — paste into `.env.local` AND Vercel

Already filled in for you (don't touch): Supabase, Cloudflare R2, site URL.

Copy this block; fill the right side as you get each one. Anything left
blank simply stays dormant — the site runs fine, those features just show
"coming soon" until the key exists.

```env
# ── STRIPE (ALL checkout — digital + physical; free account, no monthly) ──
# dashboard.stripe.com → Developers → API keys (use the secret key)
STRIPE_SECRET_KEY=
# Developers → Webhooks → add endpoint
#   https://beinthegno.com/api/webhooks/stripe  (event: checkout.session.completed)
STRIPE_WEBHOOK_SECRET=

# ── RESEND (newsletter — free tier 3k emails/mo) ──
# resend.com → API Keys
RESEND_API_KEY=
# resend.com → Audiences → create one → copy its ID (optional but recommended)
RESEND_AUDIENCE_ID=

# ── PRINTIFY (apparel print-on-demand — OPTIONAL) ──
# Physical orders work without this: Stripe collects payment + shipping
# address, and paid orders are logged for manual fulfillment from the
# Printify dashboard. Set these to auto-submit print orders later.
# printify.com → Settings → Connections → API → generate token + shop id.
PRINTIFY_API_TOKEN=
PRINTIFY_SHOP_ID=
```

No Shopify anywhere — Stripe is the only checkout, for both digital
downloads and physical goods.

After editing `.env.local`, restart `npm run dev`. For production, add the
same vars in **Vercel → project `gnothyself` → Settings → Environment
Variables**, then redeploy.

---

## 3. Per-service setup (the non-key parts)

### Stripe (EVERYTHING — digital + physical)
1. Create a free Stripe account, grab the secret key (§2). No monthly fee.
2. Add the webhook endpoint (§2). (Dev works without it — the success page
   self-confirms the payment — but production should have the webhook.)
3. Once `STRIPE_SECRET_KEY` is set, every active product becomes buyable:
   - **Digital** (courses/scripts): in `/admin/products` → **Files** →
     upload the audio (mp3/m4a) as a "paid deliverable" + the companion text;
     optionally a 30-sec "free preview". A digital product needs ≥1 file to
     be buyable. Delivery is automatic via the tokenized download page.
   - **Physical** (apparel, copper, orgone): they check out through the same
     Stripe cart; shipping address is collected at checkout.

### Printify (apparel fulfillment — optional)
1. **Manual to start (no key):** when a physical order is paid, it's logged
   and you create the print order in the Printify dashboard yourself
   (Stripe holds the buyer's shipping address). Fine at low volume.
2. **Automate later:** set `PRINTIFY_API_TOKEN` + `PRINTIFY_SHOP_ID`
   (printify.com → Settings → Connections → API) and paid orders auto-submit
   to Printify via the Stripe webhook. No lock-in — swap providers by editing
   one fulfillment call (`src/lib/printify.ts`).

### Cloudflare R2 (already done — nothing to get)
The omni R2 key shared across your DnDL repos is already in `.env.local`,
public bucket `inthegno` exists, and files serve from `media.beinthegno.com`
(house convention: `R2_PUBLIC_BUCKET` + `R2_PUBLIC_DOMAIN`, matching
cinesonic/danielnotdaylewis). Image and file uploads work the moment you log
into `/admin`.

**Optional hardening for paid downloads:** today, paid meditation files live
in the public `inthegno` bucket under an unguessable `digital/<uuid>/` path
and are only ever handed out via 1-hour presigned links. If you want them in
a *truly* private bucket (like `cinesonic-private`), create an
`inthegno-private` bucket in the Cloudflare dashboard (R2 → Create bucket —
the API key can't create buckets, only you can), then uncomment
`R2_PRIVATE_BUCKET=inthegno-private` in `.env.local`. Zero code change; new
uploads route there automatically.

### Resend (newsletter)
1. Add your sending domain in Resend and verify DNS, or use their test domain
   to start. Grab the API key + (optionally) create an Audience for the ID.
2. Signups already save to Supabase (`itg_subscribers`) even before this key
   exists — the key just enables Resend audience sync + sending.

---

## 4. Daily use — adding any product (the whole point)

1. `/admin/products` → **new product**.
2. Pick a **product type** (physical / digital / …) and a **collection**
   (= which nav menu it lives under). Upload an **image**. Save.
3. It instantly routes to `beinthegno.com/{collection}/{handle}` and appears
   in that collection's page + nav. Once `STRIPE_SECRET_KEY` is set it's
   buyable — physical ships via Stripe checkout + Printify; digital needs its
   files uploaded first.

Need a brand-new product line / nav menu? `/admin/collections` → **new
collection**. Publishing it adds the nav link and its landing page — zero code.

---

## 5. What's already done (no action needed)

- Custom headless CMS at `/admin` (login-gated to intheGno admins).
- Dynamic storefront: collection pages + product pages, fully DB-driven.
- One Stripe cart + checkout for everything — digital + physical (dormant until keys).
- Digital delivery → tokenized 30-day download links; physical → Printify (manual until its key).
- R2 file storage/delivery (live now — uploads work the moment you log in).
- Newsletter signup (saves to DB now; sends once Resend key added).
- Cookie consent, privacy/terms/shipping (incl. wellness disclaimer for
  meditations), robots.txt, sitemap.xml, branded 404.
