/* ═══════════════════════════════════════════════════════════════════
   🔴 URGENT SECURITY FIX — PASTE THIS FIRST, BEFORE ANYTHING ELSE
   intheGno / shared DnDL Supabase (gpjgvdpicjqrerqqzhyx)   2026-08-02

   VERIFIED LIVE EXPLOIT (proven with the public anon key, not theory):
     • anon SELECT returns ALL 9 itg_posts rows, including unpublished
       drafts. Your unreleased blog content is publicly readable.
     • anon UPDATE on itg_posts SUCCEEDS (HTTP 204). During the audit a
       post title was actually rewritten with nothing but the anon key,
       then restored. Any visitor can deface or rewrite blog content.
     • anon DELETE on itg_posts is also permitted (HTTP 204).

   WHY IT MATTERS BEYOND DEFACEMENT: blog content is rendered with
   html-react-parser through dangerouslySetInnerHTML and there is no
   sanitizer in the dependency tree. A writable posts table is a stored
   XSS vector -> session/credential theft for every visitor.

   ROOT CAUSE: sql/2026-06-20_security_itg_posts_rls.sql was written but
   never pasted into the live database (its own TODO says "Daniel must
   verify against the LIVE DB"). The original permissive policy from
   create_itg_posts.sql is still what is running.

   This file is idempotent and safe to re-run.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 0. PRE-FLIGHT: itg_is_admin() must exist (from itg_commerce.sql) ──
   Recreated here defensively so this file can stand alone. Pins
   search_path INCLUDING pg_temp, which the Postgres docs require for
   SECURITY DEFINER functions (a definer function without pg_temp can be
   hijacked via a temp-schema object shadowing an unqualified name). */
create or replace function public.itg_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.itg_admins a
    where a.user_id = auth.uid()
  );
$$;

/* ── 1. itg_posts — THE ACTIVE BREACH ────────────────────────────────
   Enable RLS, drop EVERY known prior policy name (permissive leftovers
   are what is allowing anon writes today), then re-create exactly two:
   public reads published-only, admins do everything. */
alter table public.itg_posts enable row level security;

drop policy if exists "Authenticated users can manage itg_posts" on public.itg_posts;
drop policy if exists "Public can read published itg_posts"      on public.itg_posts;
drop policy if exists "itg_posts public read"                    on public.itg_posts;
drop policy if exists "itg_posts admin write"                    on public.itg_posts;
drop policy if exists "Enable read access for all users"         on public.itg_posts;
drop policy if exists "Enable insert for authenticated users only" on public.itg_posts;
drop policy if exists "Enable update for authenticated users only" on public.itg_posts;
drop policy if exists "Enable delete for authenticated users only" on public.itg_posts;

create policy "itg_posts public read"
  on public.itg_posts for select
  using (published = true or public.itg_is_admin());

create policy "itg_posts admin write"
  on public.itg_posts for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());

/* ── 2. Lock the commerce + subscriber tables ────────────────────────
   itg_orders / itg_order_items / itg_subscribers currently hold ZERO
   rows, so the audit's "anon read returned []" proved nothing about
   their policies - an empty table looks identical to a protected one.
   These are explicit so they are correct BEFORE the first real order
   and the first real subscriber email land. Server-side writes use the
   service-role client, which bypasses RLS - so NO anon write policy is
   needed anywhere here. */

alter table public.itg_orders      enable row level security;
alter table public.itg_order_items enable row level security;
alter table public.itg_subscribers enable row level security;
alter table public.itg_admins      enable row level security;

-- Orders: customers never query these directly (delivery goes through the
-- server-side download-token route), so admins only. No anon access at all.
drop policy if exists "itg_orders admin all" on public.itg_orders;
create policy "itg_orders admin all"
  on public.itg_orders for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

drop policy if exists "itg_order_items admin all" on public.itg_order_items;
create policy "itg_order_items admin all"
  on public.itg_order_items for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

-- Subscribers: the email list. Signup goes through /api/newsletter with the
-- service-role client, so anon needs NOTHING - not even insert. Admin-only
-- keeps the list from being harvested.
drop policy if exists "itg_subscribers admin all" on public.itg_subscribers;
create policy "itg_subscribers admin all"
  on public.itg_subscribers for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

-- Admins table: readable only by admins (prevents enumerating admin user_ids).
drop policy if exists "itg_admins admin read" on public.itg_admins;
create policy "itg_admins admin read"
  on public.itg_admins for select
  using (public.itg_is_admin());

/* ── 3. Catalog tables — public READ, admin WRITE ────────────────────
   The storefront reads these with the anon key, so public select must
   stay. Writes must not be public. */
alter table public.itg_collections    enable row level security;
alter table public.itg_products       enable row level security;
alter table public.itg_product_assets enable row level security;

drop policy if exists "itg_collections public read" on public.itg_collections;
create policy "itg_collections public read"
  on public.itg_collections for select using (true);
drop policy if exists "itg_collections admin write" on public.itg_collections;
create policy "itg_collections admin write"
  on public.itg_collections for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

drop policy if exists "itg_products public read" on public.itg_products;
create policy "itg_products public read"
  on public.itg_products for select using (true);
drop policy if exists "itg_products admin write" on public.itg_products;
create policy "itg_products admin write"
  on public.itg_products for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

-- Product assets: anon may see ONLY preview files. The r2_key of a PAID
-- deliverable must never be public - that is the file customers pay for.
drop policy if exists "itg_product_assets public read"         on public.itg_product_assets;
drop policy if exists "itg_product_assets public preview read" on public.itg_product_assets;
create policy "itg_product_assets public preview read"
  on public.itg_product_assets for select
  using (is_preview = true or public.itg_is_admin());
drop policy if exists "itg_product_assets admin write" on public.itg_product_assets;
create policy "itg_product_assets admin write"
  on public.itg_product_assets for all
  using (public.itg_is_admin()) with check (public.itg_is_admin());

/* ── 4. VERIFY (run this after, and read the output) ─────────────────
   Every itg_ table must show rowsecurity = true. Any policy whose
   qualifier mentions 'authenticated' instead of itg_is_admin() is a bug
   - the Supabase project is SHARED across all DnDL apps, so a
   self-signed-up user of ANY other app counts as "authenticated" here. */
select tablename,
       rowsecurity as rls_on,
       (select count(*) from pg_policies p where p.tablename = t.tablename) as policies
from   pg_tables t
where  schemaname = 'public' and tablename like 'itg_%'
order  by tablename;

select tablename, policyname, cmd, qual::text as using_clause
from   pg_policies
where  schemaname = 'public' and tablename like 'itg_%'
order  by tablename, policyname;
