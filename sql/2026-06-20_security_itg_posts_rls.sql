-- ═══════════════════════════════════════════════════════════════════
-- Security hardening: lock down itg_posts RLS (H6)
-- Paste into the Supabase SQL Editor. Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════
--
-- WHY: sql/create_itg_posts.sql originally shipped
--   CREATE POLICY "Authenticated users can manage itg_posts"
--     ON public.itg_posts FOR ALL USING (auth.role() = 'authenticated');
-- The Supabase project is SHARED across all DnDL apps, so "authenticated"
-- includes self-signed-up users from every other app. That policy let any
-- such user insert/update/delete blog posts (defacement + stored XSS via
-- music_embed). It also had no WITH CHECK, so writes were unconstrained.
--
-- This migration restricts ALL writes to intheGno admins via
-- public.itg_is_admin() (defined in sql/itg_commerce.sql) and keeps public
-- SELECT limited to published posts.
--
-- TODO(security): Daniel must verify against the LIVE DB that
--   (1) the itg_is_admin() function exists — i.e. sql/itg_commerce.sql has
--       been applied — and (2) `select * from pg_policies where tablename
--       = 'itg_posts';` shows ONLY the two policies below (no leftover
--       "Authenticated users can manage itg_posts").

alter table public.itg_posts enable row level security;

-- Public read: published posts only.
drop policy if exists "Public can read published itg_posts" on public.itg_posts;
drop policy if exists "itg_posts public read" on public.itg_posts;
create policy "itg_posts public read"
  on public.itg_posts for select
  using (published = true or public.itg_is_admin());

-- Drop the permissive any-authenticated-user policy and any prior name.
drop policy if exists "Authenticated users can manage itg_posts" on public.itg_posts;
drop policy if exists "itg_posts admin write" on public.itg_posts;

-- Admin-only writes (insert/update/delete), with WITH CHECK on writes.
create policy "itg_posts admin write"
  on public.itg_posts for all
  using (public.itg_is_admin())
  with check (public.itg_is_admin());
