/* ═══════════════════════════════════════════════════════════════════
   HEAL & SUCCEED → THE SOVEREIGN TRILOGY (2026-07-12)

   Retires the 8 fragmented healing products (audio scripts + courses)
   and replaces them with THREE BOOKS + ONE BUNDLE.

   ADAPTED TO THE REAL SCHEMA. The brief assumed a `products` table with
   slug/name/tagline/description/price_cents/is_active. This repo uses
   `itg_products` with handle/title/subtitle/description_html/price
   (NUMERIC DOLLARS, not cents) and status ('draft'|'active'|'archived').

   NOTHING IS DELETED. Old rows are set to status='archived', which the
   catalog filters out (.eq("status","active")), so their pages 404 while
   every itg_orders / itg_order_items row and download link stays intact.

   NOTE ON COPY: em dashes were converted to " - " (house rule) and the
   phrase "built into the back" became "built in at the back" because a
   bare "into <word>" makes the Supabase SQL editor's linter throw a
   phantom `relation "..." does not exist` error.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 0. REBRAND THE COLLECTION → intheGno Innerwork ──────────────────
   The collection page header renders "intheGno {title}", so title
   'Innerwork' produces the series name "intheGno Innerwork". The slug
   moves healing → innerwork; next.config.ts permanently redirects the
   old /healing URLs (they were already in the live sitemap).
   Tagline/description are left alone - your live copy stays. */
update public.itg_collections
set    slug       = 'innerwork',
       title      = 'Innerwork',
       nav_label  = 'Innerwork',
       seo_title  = 'intheGno Innerwork',
       updated_at = now()
where  slug = 'healing';

/* ── 1. RETIRE THE OLD LINE (hide, never delete) ─────────────────── */
update public.itg_products
set    status = 'archived',
       updated_at = now()
where  handle in (
  'the-fathers-voice',
  'the-hungry-ghost',
  'the-frozen-engine',
  'the-hollow-mirror',
  'the-abundance-signal',
  'sovereign-mirror-collection',
  'the-living-instrument',
  'the-sovereign-architect',
  -- Superseded by 'controlled-chaos' (same thesis, now a book). Delete
  -- this line if you want the course to stay live alongside the books.
  'spontaneity-within-chaos'
);

/* ── 2. THE THREE BOOKS ──────────────────────────────────────────── */
insert into public.itg_products
  (handle, collection_id, title, subtitle, description_html, product_type, status, badge,
   price, compare_at_price, images, features, requires_shipping, sort_order, metadata)
values
  ('glp-run',
   (select id from public.itg_collections where slug = 'innerwork'),
   'GLP-Run',
   'a fast-track, repeatable regimen and audio meditation to get the life you''ve always dreamed about',
   '<p>The inner-work book. The five blocks (the Grip, the Ache, the Mask, the Brace, the Wall), the four-step Clearing method, and three guided audio sessions - 15, 30, and 45 minutes - built in at the back of the book.</p><p>Ebook + audiobook. Written by a human; produced by CineSonic Productions.</p>',
   'digital', 'active', 'start here',
   27.00, 97.00,
   '[]',
   '["the ebook (EPUB + PDF)", "the full audiobook", "guided session I - 15 minutes", "guided session II - 30 minutes", "guided session III - 45 minutes", "yours to keep, forever"]',
   false, 1,
   '{"format": "ebook + audiobook", "sessions": "15 / 30 / 45 min"}'),

  ('controlled-chaos',
   (select id from public.itg_collections where slug = 'innerwork'),
   'Controlled Chaos; or, Spontaneous Structure',
   'how to be everything at once responsibly (hint: it takes insanely detailed methods and planning)',
   '<p>The outer-game book for the multi-passionate, ADHD, can''t-pick-a-lane human. One interconnected empire instead of five separate burdens, the Feed-vs-Prize content engine, AI as your ops department (and the hard line that keeps it from becoming slop).</p><p>Plus three guided sessions (15/30/45 min) at the back. Ebook + audiobook.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["the ebook (EPUB + PDF)", "the full audiobook", "guided session I - 15 minutes", "guided session II - 30 minutes", "guided session III - 45 minutes", "yours to keep, forever"]',
   false, 2,
   '{"format": "ebook + audiobook", "sessions": "15 / 30 / 45 min"}'),

  ('sovereign-architect',
   (select id from public.itg_collections where slug = 'innerwork'),
   'The Sovereign Architect',
   'the complete operating system - from shadow to slide, and the voice that carries it',
   '<p>The master book. Presence, pendulums, the braid, God Mode, Hill''s thirteen principles reforged, the Living Instrument voice work - and the Sung Declaration: sing your aim, hold the receiving note, let the line that catches repeat.</p><p>Three guided sessions (15/30/45 min) at the back. Ebook + audiobook.</p>',
   'digital', 'active', 'the capstone',
   47.00, 197.00,
   '[]',
   '["the ebook (EPUB + PDF)", "the full audiobook", "guided session I - 15 minutes", "guided session II - 30 minutes", "guided session III - 45 minutes", "yours to keep, forever"]',
   false, 3,
   '{"format": "ebook + audiobook", "sessions": "15 / 30 / 45 min"}')
on conflict (handle) do update set
  collection_id    = excluded.collection_id,
  title            = excluded.title,
  subtitle         = excluded.subtitle,
  description_html = excluded.description_html,
  product_type     = excluded.product_type,
  status           = excluded.status,
  badge            = excluded.badge,
  price            = excluded.price,
  compare_at_price = excluded.compare_at_price,
  features         = excluded.features,
  sort_order       = excluded.sort_order,
  metadata         = excluded.metadata,
  updated_at       = now();

/* ── 3. THE BUNDLE ───────────────────────────────────────────────────
   compare_at_price is COMPUTED from the live sum of the three books, so
   it stays correct if you change any book's price (re-run this block). */
insert into public.itg_products
  (handle, collection_id, title, subtitle, description_html, product_type, status, badge,
   price, compare_at_price, images, features, requires_shipping, sort_order, metadata)
values
  ('sovereign-trilogy',
   (select id from public.itg_collections where slug = 'innerwork'),
   'The Sovereign Trilogy',
   'all three books. heal, build, master - the complete intheGno library',
   '<p>GLP-Run, Controlled Chaos, and The Sovereign Architect together - ebook + audiobook for all three, including all nine guided sessions.</p><p>Heal what''s inside. Build what''s outside. Master the system that runs both.</p>',
   'bundle', 'active', 'best value',
   87.00,
   (select sum(price) from public.itg_products
     where handle in ('glp-run', 'controlled-chaos', 'sovereign-architect')),
   '[]',
   '["all three ebooks (EPUB + PDF)", "all three audiobooks", "all nine guided sessions (15 / 30 / 45 min each)", "yours to keep, forever"]',
   false, 0,
   '{"format": "ebook + audiobook", "sessions": "9 sessions", "price_note": "all three books - the price of two"}')
on conflict (handle) do update set
  collection_id    = excluded.collection_id,
  title            = excluded.title,
  subtitle         = excluded.subtitle,
  description_html = excluded.description_html,
  product_type     = excluded.product_type,
  status           = excluded.status,
  badge            = excluded.badge,
  price            = excluded.price,
  compare_at_price = excluded.compare_at_price,
  features         = excluded.features,
  sort_order       = excluded.sort_order,
  metadata         = excluded.metadata,
  updated_at       = now();

/* ── 4. DELIVERY MANIFEST (TODO: owner attaches real files) ──────────
   Each book delivers 5 files (ebook EPUB + PDF, audiobook, 3 sessions);
   the bundle delivers all of them. itg_product_assets already supports
   multi-file delivery - fulfillPaidOrder() maps EVERY non-preview asset
   row for the purchased product into the buyer's download list, so no
   code change is needed. Insert one row per file once the R2 keys exist:

   insert into public.itg_product_assets
     (product_id, kind, label, r2_key, file_name, content_type, sort_order)
   values
     ((select id from public.itg_products where handle = 'glp-run'),
      'text', 'GLP-Run (EPUB)', 'innerwork/glp-run/glp-run.epub',
      'glp-run.epub', 'application/epub+zip', 1);

   For the bundle, insert the SAME r2_keys again against the
   'sovereign-trilogy' product id (assets are per-product rows).

   Until at least one deliverable exists, getPurchasability() reports
   "coming soon" for these digital products - that is expected. */
