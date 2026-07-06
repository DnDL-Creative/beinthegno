-- ═══════════════════════════════════════════════════════════════════
-- intheGno Blog Posts Table
-- Run this in Supabase SQL Editor FIRST, then run the seed script.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.itg_posts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  slug        TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL DEFAULT '',
  author      TEXT DEFAULT '',
  tag         TEXT DEFAULT '',
  content     JSONB,
  image       TEXT DEFAULT '',
  image_2     TEXT DEFAULT '',
  image_3     TEXT DEFAULT '',
  image_4     TEXT DEFAULT '',
  image_5     TEXT DEFAULT '',
  image_6     TEXT DEFAULT '',
  image_caption TEXT DEFAULT '',
  music_embed TEXT DEFAULT '',
  blogcast_url TEXT DEFAULT '',
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT itg_posts_slug_unique UNIQUE (slug)
);

-- RLS: allow public read for published posts
ALTER TABLE public.itg_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published itg_posts" ON public.itg_posts;
CREATE POLICY "Public can read published itg_posts"
  ON public.itg_posts FOR SELECT
  USING (published = true OR public.itg_is_admin());

-- Writes are admin-only. The Supabase project is SHARED across DnDL apps,
-- so auth.role() = 'authenticated' would let any self-signed-up user from
-- another app deface posts / inject stored XSS via music_embed. Gate on
-- public.itg_is_admin() (defined in sql/itg_commerce.sql) WITH CHECK.
-- See sql/2026-06-20_security_itg_posts_rls.sql (H6).
DROP POLICY IF EXISTS "Authenticated users can manage itg_posts" ON public.itg_posts;
DROP POLICY IF EXISTS "itg_posts admin write" ON public.itg_posts;
CREATE POLICY "itg_posts admin write"
  ON public.itg_posts FOR ALL
  USING (public.itg_is_admin())
  WITH CHECK (public.itg_is_admin());
