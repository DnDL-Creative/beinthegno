create table if not exists public.itg_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.itg_admins enable row level security;

-- Admin check helper. SECURITY DEFINER so RLS policies can call it
-- without recursing into itg_admins' own policies.
create or replace function public.itg_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.itg_admins where user_id = auth.uid()
  );
$$;

drop policy if exists "itg_admins admin read" on public.itg_admins;
create policy "itg_admins admin read"
  on public.itg_admins for select
  using (public.itg_is_admin());

-- Seed: make the owner an admin (must already exist in auth.users -
-- sign up / log in once first if this inserts 0 rows).
insert into public.itg_admins (user_id, email)
select id, email from auth.users where email = 'admin@dndlcreative.com'
on conflict (user_id) do nothing;

--  UPDATED_AT TRIGGER 

create or replace function public.itg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--  COLLECTIONS (product lines / nav menus) 

create table if not exists public.itg_collections (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  nav_label       text not null,
  tagline         text not null default '',
  description     text not null default '',
  kind            text not null default 'physical'
                  check (kind in ('physical','digital','mixed')),
  badge           text not null default '',
  sort_order      integer not null default 0,
  show_in_nav     boolean not null default true,
  published       boolean not null default false,
  seo_title       text not null default '',
  seo_description text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists itg_collections_touch on public.itg_collections;
create trigger itg_collections_touch
  before update on public.itg_collections
  for each row execute function public.itg_touch_updated_at();

alter table public.itg_collections enable row level security;

drop policy if exists "itg_collections public read" on public.itg_collections;
create policy "itg_collections public read"
  on public.itg_collections for select
  using (published = true or public.itg_is_admin());

drop policy if exists "itg_collections admin write" on public.itg_collections;
create policy "itg_collections admin write"
  on public.itg_collections for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());

--  PRODUCTS (any type: physical, digital, service, bundle) 

create table if not exists public.itg_products (
  id                     uuid primary key default gen_random_uuid(),
  handle                 text not null unique,
  collection_id          uuid references public.itg_collections (id) on delete set null,
  title                  text not null,
  subtitle               text not null default '',
  description_html       text not null default '',
  product_type           text not null default 'physical'
                         check (product_type in ('physical','digital','service','bundle','other')),
  status                 text not null default 'draft'
                         check (status in ('draft','active','archived')),
  badge                  text not null default '',
  price                  numeric(10,2) not null default 0,
  compare_at_price       numeric(10,2),
  currency               text not null default 'USD',
  -- [{ "url": "...", "alt": "..." }]
  images                 jsonb not null default '[]'::jsonb,
  -- [{ "name": "Size", "values": ["S","M","L"] }]
  options                jsonb not null default '[]'::jsonb,
  -- ["bullet one", "bullet two"] - shown as "what's inside"
  features               jsonb not null default '[]'::jsonb,
  -- Shopify mapping (physical checkout). Fill these once the Shopify
  -- store exists; until then physical products show "coming soon".
  shopify_product_handle text not null default '',
  shopify_variant_gid    text not null default '',
  -- { "Size:M|Color:Black": "gid://shopify/ProductVariant/123" }
  shopify_variant_map    jsonb not null default '{}'::jsonb,
  requires_shipping      boolean not null default true,
  featured               boolean not null default false,
  sort_order             integer not null default 0,
  seo_title              text not null default '',
  seo_description        text not null default '',
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists itg_products_collection_idx
  on public.itg_products (collection_id, status, sort_order);

drop trigger if exists itg_products_touch on public.itg_products;
create trigger itg_products_touch
  before update on public.itg_products
  for each row execute function public.itg_touch_updated_at();

alter table public.itg_products enable row level security;

drop policy if exists "itg_products public read" on public.itg_products;
create policy "itg_products public read"
  on public.itg_products for select
  using (status = 'active' or public.itg_is_admin());

drop policy if exists "itg_products admin write" on public.itg_products;
create policy "itg_products admin write"
  on public.itg_products for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());

--  PRODUCT ASSETS (digital files: audio, text, pdf ...) 
-- Files live in R2 under unguessable keys. Only rows flagged
-- is_preview are publicly readable (free samples); the rest are
-- delivered through tokenized download links after purchase.

create table if not exists public.itg_product_assets (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.itg_products (id) on delete cascade,
  kind             text not null default 'audio'
                   check (kind in ('audio','text','pdf','video','archive','image','other')),
  label            text not null default '',
  r2_key           text not null,
  file_name        text not null default '',
  content_type     text not null default '',
  size_bytes       bigint not null default 0,
  duration_seconds integer,
  is_preview       boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists itg_product_assets_product_idx
  on public.itg_product_assets (product_id, sort_order);

alter table public.itg_product_assets enable row level security;

drop policy if exists "itg_product_assets preview read" on public.itg_product_assets;
create policy "itg_product_assets preview read"
  on public.itg_product_assets for select
  using (is_preview = true or public.itg_is_admin());

drop policy if exists "itg_product_assets admin write" on public.itg_product_assets;
create policy "itg_product_assets admin write"
  on public.itg_product_assets for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());

--  ORDERS (Stripe digital checkout) 
-- Written only by the server (service role). No public policies.

create table if not exists public.itg_orders (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null default '',
  stripe_session_id     text not null unique,
  stripe_payment_intent text not null default '',
  amount_total          numeric(10,2) not null default 0,
  currency              text not null default 'USD',
  status                text not null default 'pending'
                        check (status in ('pending','paid','refunded','failed')),
  download_token        uuid not null unique default gen_random_uuid(),
  download_count        integer not null default 0,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists itg_orders_token_idx on public.itg_orders (download_token);

drop trigger if exists itg_orders_touch on public.itg_orders;
create trigger itg_orders_touch
  before update on public.itg_orders
  for each row execute function public.itg_touch_updated_at();

alter table public.itg_orders enable row level security;

drop policy if exists "itg_orders admin read" on public.itg_orders;
create policy "itg_orders admin read"
  on public.itg_orders for select
  using (public.itg_is_admin());

create table if not exists public.itg_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.itg_orders (id) on delete cascade,
  product_id  uuid references public.itg_products (id) on delete set null,
  title       text not null default '',
  unit_amount numeric(10,2) not null default 0,
  quantity    integer not null default 1
);

create index if not exists itg_order_items_order_idx on public.itg_order_items (order_id);

alter table public.itg_order_items enable row level security;

drop policy if exists "itg_order_items admin read" on public.itg_order_items;
create policy "itg_order_items admin read"
  on public.itg_order_items for select
  using (public.itg_is_admin());

--  NEWSLETTER SUBSCRIBERS (Resend) 
-- Written only by the server (the /api/newsletter route uses the
-- service role). No public read; admins can read the list.

create table if not exists public.itg_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  status          text not null default 'subscribed'
                  check (status in ('subscribed','unsubscribed')),
  source          text not null default 'site',
  resend_contact_id text not null default '',
  confirmed       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists itg_subscribers_touch on public.itg_subscribers;
create trigger itg_subscribers_touch
  before update on public.itg_subscribers
  for each row execute function public.itg_touch_updated_at();

alter table public.itg_subscribers enable row level security;

drop policy if exists "itg_subscribers admin read" on public.itg_subscribers;
create policy "itg_subscribers admin read"
  on public.itg_subscribers for select
  using (public.itg_is_admin());

--  TIGHTEN itg_posts (was: any authenticated user can write) 
-- The Supabase project is shared across DnDL apps, so "authenticated"
-- includes users from other apps. Restrict writes to intheGno admins.

drop policy if exists "Authenticated users can manage itg_posts" on public.itg_posts;
drop policy if exists "itg_posts admin write" on public.itg_posts;
create policy "itg_posts admin write"
  on public.itg_posts for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());

-- ===================================================================
-- SEED DATA
-- ===================================================================

--  Collections (one per nav menu) 

insert into public.itg_collections
  (slug, title, nav_label, tagline, description, kind, badge, sort_order, show_in_nav, published, seo_title, seo_description)
values
  ('apparel', 'Apparel', 'apparel',
   'wear what you mean',
   'Minimalist statement apparel for the spiritually sovereign. 100% ring-spun cotton. Free shipping over $75.',
   'physical', '', 20, true, true,
   'Apparel',
   'Minimalist statement apparel for the spiritually sovereign. 100% ring-spun cotton. Free shipping over $75.'),

  ('copper', 'Copper', 'copper',
   'ancient tech, modern application',
   'Turns out copper is more than just pipes.',
   'physical', 'coming soon', 10, true, true,
   'Copper',
   'Copper goods for the grounded. Ancient tech, modern application. Coming soon.'),

  ('anti-emf', 'Anti-EMF', 'anti-emf',
   'shield the vessel',
   '5G is fucking us. So we''re gonna fight back.',
   'physical', 'coming soon', 40, true, true,
   'Anti-EMF',
   'EMF protection for the aware. Shield your vessel from frequencies that weren''t designed to help you. Coming soon.'),

  ('orgone', 'Orgone', 'orgone',
   'try something ancient',
   'Well... turns out everything else is a lie, so there''s no reason not to try.',
   'physical', 'coming soon', 30, true, true,
   'Orgone',
   'Orgone energy tools for the curious. Everything else is a lie - might as well try something ancient. Coming soon.'),

  ('healing', 'Heal & Succeed', 'Heal & Succeed',
   'the sovereign mirror - shadow work, not bypassing',
   'Audio + text sessions for releasing trauma and doing the real inner work. Each session blends Carl Jung''s shadow work, Reality Transurfing, and Gnostic practice - Spirit observer, the saboteur''s voice, the wounded child, forgiveness, reparenting, and the slide. Narrated by a fellow traveler, not a guru. Download once, keep forever.',
   'digital', 'new', 50, true, true,
   'Meditations - The Sovereign Mirror Collection',
   'Digital download shadow-work meditations for trauma release and inner work. Guided audio + companion text combining Carl Jung, Reality Transurfing, and Gnostic practice.')
on conflict (slug) do nothing;

--  Apparel products (mirrors the current static page) 

insert into public.itg_products
  (handle, collection_id, title, subtitle, description_html, product_type, status, badge,
   price, compare_at_price, images, options, requires_shipping, sort_order, metadata)
values
  ('proud-unregistered-voter',
   (select id from public.itg_collections where slug = 'apparel'),
   'Proud Unregistered Voter', '',
   '<p>P. Diddy used to tell us to "Vote or Die!" Then it was finally revealed he was a huge pedo, so... yea we''re good. This one is bound to catch some fluoride stares at the grocery store. 100% ring-spun cotton. Pre-shrunk.</p>',
   'physical', 'active', 'coming soon',
   29.00, 38.00,
   '[{"url": "https://media.beinthegno.com/apparel/shirt-proud.png", "alt": "Proud Unregistered Voter tee"}]',
   '[{"name": "Size", "values": ["S","M","L","XL","2XL"]}, {"name": "Color", "values": ["White","Black","Heather Grey"]}]',
   true, 10,
   '{"price_note": "debut drop... so we dropped the price"}'),

  ('literal-tinfoil-hat',
   (select id from public.itg_collections where slug = 'apparel'),
   '(Almost) Literal Tinfoil Hat', '',
   '<p>They called us crazy. We made the hat. Lined with a Faraday mesh - the same shielding principle used in military-grade EMF enclosures - except this one goes on your head. - Blocks RF &amp; microwave frequencies - Stylish enough for the farmers market - Scientifically grounded, socially questionable - One size fits most awakened heads</p>',
   'physical', 'active', 'coming soon',
   24.00, null,
   '[]',
   '[{"name": "Size", "values": ["One Size"]}, {"name": "Color", "values": ["Silver"]}]',
   true, 20,
   '{}')
on conflict (handle) do nothing;

--  Meditations: THE SOVEREIGN MIRROR COLLECTION (digital downloads) 
-- Five ~15-min shadow-work sessions (audio + companion text) blending
-- Jung, Reality Transurfing, and Gnostic practice, plus a 5-in-1 bundle.
-- Seeded active; each shows "coming soon" on the storefront until you
-- upload its audio/text files in the CMS (a digital product with no
-- deliverable files is not buyable - that's by design).

insert into public.itg_products
  (handle, collection_id, title, subtitle, description_html, product_type, status, badge,
   price, compare_at_price, images, features, requires_shipping, sort_order, metadata)
values
  -- The 5-in-1 bundle, listed first as the best value.
  ('the-living-instrument',
   (select id from public.itg_collections where slug = 'healing'),
   'The Living Instrument',
   'vocal & body emotional release',
   '<p>Before you can speak from the Spirit, you have to free the voice and body from the tension of old programs. This course synthesizes Kristin Linklater''s natural voice work, Arthur Lessac''s body-based vocal energetics, and Jacques Lecoq''s 20 fundamental movements into one practice for emotional release and neutrality.</p><p>The result: a voice and body fully available - able to move from the wounded child to the sovereign self without residual constriction. The somatic complement to the inner work, so your voice becomes a clean signal, no longer distorted by the saboteur''s grip.</p>',
   'digital', 'active', 'bonus course',
   97.00, null,
   '[]',
   '["6 modules: neutral body, freeing the voice, the 20 movements, consonant energetics, the observers voice, integration", "6 guided practice sessions (20-30 min) + 6 PDF field manuals", "Linklater natural voice x Lessac energetics x Lecoqs 20 movements", "optional video demonstrations of the movements & warm-ups", "the emotional reset quick-reference card", "yours to keep, forever"]',
   false, 2,
   '{"price_note": "standalone - or +$47 with The Sovereign Architect"}'),

  ('the-sovereign-architect',
   (select id from public.itg_collections where slug = 'healing'),
   'The Sovereign Architect',
   'from shadow to slide - the complete synthesis',
   '<p>The master operating system. Everything - Jung''s shadow work, Vadim Zeland''s Transurfing (classic and the new <em>Transurfing Yourself</em> material), and Napoleon Hill''s success architecture - fused into one path, with the contradictions finally resolved.</p><p>Most success teaching is a pendulum: Hill makes you grasp, Zeland warns that grasping pushes the lifeline away. This doesn''t pick a side. You clear the inner saboteur with Jung, tune your state with Zeland''s newest techniques, then use Hill''s architecture for action - without attachment. The fire of Hill, the lightness of Zeland, none of the grasping.</p><p>Eight core modules from shadow to slide, plus an optional Monroe gateway module for reaching the Spirit through brainwave work.</p>',
   'digital', 'active', 'premium course',
   197.00, null,
   '[]',
   '["8 core modules: shadow, state, blueprint, notebooks, body, god mode, business, integration", "8 guided audio sessions (20-30 min each)", "8 PDF workbooks + field guides", "the 13 reforged principles (Hill x Transurfing) cheat sheet", "morning & evening practice card + braid log", "90-day spirit-led business plan template", "optional Monroe gateway module (hemi-sync)", "yours to keep, forever"]',
   false, 1,
   '{"price_note": "8 modules + optional monroe gateway"}'),

  ('sovereign-mirror-collection',
   (select id from public.itg_collections where slug = 'healing'),
   'The Sovereign Mirror: Complete Collection',
   'all five sessions - shadow work, not bypassing',
   '<p>The full descent. Five guided audio sessions plus their companion texts: the father wound, the war with food, the frozen will, the hollow gaze, and the money fear. Each one follows the same arc - Spirit observer, the saboteur''s voice, the wounded child, forgiveness, reparenting, the slide.</p><p>You''ve woken up. This is how you walk out. Narrated by a fellow traveler, not a guru.</p>',
   'bundle', 'active', 'best value',
   97.00, 135.00,
   '[]',
   '["all five guided audio sessions (~15 min each)", "all five companion texts", "blends Jung, Transurfing & Gnostic practice", "download once, keep forever"]',
   false, 5,
   '{"price_note": "five sessions - the price of three and a half"}'),

  ('the-fathers-voice',
   (select id from public.itg_collections where slug = 'healing'),
   'The Father''s Voice, the Wounded Child, and the Sovereign Self',
   'heal the inner critic. reclaim the right to risk.',
   '<p>The loudest critical voice in your head was never yours - it''s an old echo. This shadow work walks you in to meet it, heal the child who still flinches when it speaks, and reclaim the part of you that was never wounded: the observer, the Spirit.</p><p>Inner critic, the father/mother wound, forgiveness, and reclaiming the right to build. No dogma - just a practice that works.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["guided audio session (~15 min)", "companion text / transcript", "works the father/mother wound + inner critic", "download once, keep forever"]',
   false, 10, '{}'),

  ('the-hungry-ghost',
   (select id from public.itg_collections where slug = 'healing'),
   'The Hungry Ghost',
   'end the war with food and body.',
   '<p>If you''ve struggled with food, with bingeing, with flinching at the mirror - you are not broken. You built a coping mechanism for pain that was never meant to be yours. This shadow work meets the part that eats in secret and the part that hates what it sees, and makes them allies instead of enemies.</p><p>Binge eating, body shame, self-sabotage, reparenting the body. No toxic positivity.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["guided audio session (~15 min)", "companion text / transcript", "works binge eating + body shame", "download once, keep forever"]',
   false, 20, '{}'),

  ('the-frozen-engine',
   (select id from public.itg_collections where slug = 'healing'),
   'The Frozen Engine',
   'end procrastination. reclaim forward motion.',
   '<p>You''re not lazy. You built a freezing mechanism for a reason. This shadow work finds the reason and thaws it - healing the child who learned that invisibility was safer than being seen trying, and reclaiming action as sovereignty.</p><p>Perfectionism, creative and business paralysis, fear of starting. No hustle culture, no shame.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["guided audio session (~15 min)", "companion text / transcript", "works perfectionism + the freeze", "download once, keep forever"]',
   false, 30, '{}'),

  ('the-hollow-mirror',
   (select id from public.itg_collections where slug = 'healing'),
   'The Hollow Mirror',
   'reclaim the gaze. end the porn trap.',
   '<p>If you''ve tried to stop and found yourself back in the same trance, feeling the same emptiness after - you are not a degenerate. You learned to manage unbearable feelings with the most powerful drug in the brain. This shadow work finds the wound beneath the urge and heals it.</p><p>Compulsive consumption, shame, objectification of self and others. Zero judgment - a way out.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["guided audio session (~15 min)", "companion text / transcript", "works compulsion + shame, no judgment", "download once, keep forever"]',
   false, 40, '{}'),

  ('the-abundance-signal',
   (select id from public.itg_collections where slug = 'healing'),
   'The Abundance Signal',
   'dissolve the fear of never making money.',
   '<p>The 3 a.m. ceiling stare. The certainty that AI will take everything and your skills are worthless. This shadow work meets the terrified part of you that believes you''ll always struggle and tunes it back toward provision - so you build from sovereignty, not panic.</p><p>Financial dread, AI-saturation anxiety, scarcity wounds. Not a get-rich scheme - a way to stop being paralyzed.</p>',
   'digital', 'active', '',
   27.00, null,
   '[]',
   '["guided audio session (~15 min)", "companion text / transcript", "works scarcity + money fear", "download once, keep forever"]',
   false, 50, '{}')
on conflict (handle) do nothing;