/**
 * Blog post data fetcher.
 * Reads from Supabase `itg_posts` table. Content is stored as HTML strings.
 * Only PUBLISHED rows are ever returned publicly — a successful-but-empty query
 * (nothing published yet) returns an empty list, and a DB error returns empty
 * too, so unpublished drafts NEVER leak onto the live blog or into the sitemap.
 * Draft Mode (getPost, via "Save & Preview") bypasses the published filter with
 * the service-role client so only the cookie-holder sees a draft.
 *
 * These reads are PUBLIC and use the anon key, so they must never touch the
 * cookie-bound server client — see createSupabasePublicClient below.
 */

import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export interface BlogPost {
  slug: string;
  title: string;
  seoTitle?: string;
  metaDescription?: string;
  subtitle: string;
  date: string;
  tags: string[];
  readTime: string;
  wordCount: number;
  blogcastTime: number;
  heroImage?: string;
  heroImageAlt?: string;
  /** Raw HTML body content — rendered via html-react-parser */
  content: string;
  /** Spotify/SoundCloud embed URL */
  musicEmbed?: string;
  /** Narrated blogcast audio URL */
  blogcastUrl?: string;
  /** Post author name */
  author?: string;
  /** Author title/role (e.g. "Writer", "Founder") */
  authorTitle?: string;
  /** Hero image style preferences */
  heroStyle?: { ratio?: string; shape?: string };
  /** false only for a not-yet-published draft (seen via "Save & Preview") */
  published?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════
   Supabase client
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Cookie-FREE Supabase client for the public blog.
 *
 * Published posts are public rows read with the anon key — there is no session
 * to carry, so this must NOT use createSupabaseServerClient(), which calls
 * `cookies()`. `cookies()` is a Dynamic API: during a static render it throws a
 * DynamicServerError that Next expects to propagate. Catching it here (as the
 * fetchers below do for real DB errors) silently swallowed the bailout, so every
 * lookup returned undefined and every post 404'd — and because
 * generateStaticParams() returns [] while nothing is published, Next never
 * prerendered a [slug] page at build, never observed the bailout, and shipped
 * the route as static (●) so EVERY request hit that broken path.
 */
function createSupabasePublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "[intheGno] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, key);
}

/**
 * Next signals control flow (dynamic bailout, notFound, redirect) by throwing
 * tagged errors. They must never be swallowed by a catch-all — rethrow them so
 * a future regression fails loudly instead of turning into a silent 404.
 */
function rethrowIfNextControlFlow(e: unknown): void {
  const digest = (e as { digest?: unknown } | null)?.digest;
  if (typeof digest === "string") throw e;
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Strip HTML tags to get plain text for word counting / subtitle extraction */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(html: string): { readTime: string; wordCount: number; blogcastTime: number } {
  const words = stripHtml(html).split(/\s+/).filter(w => w.length > 0).length;
  const readMinutes = Math.max(1, Math.ceil(words / 200));
  const blogcastMinutes = Math.max(1, Math.ceil(words / (9300 / 60)));
  return { readTime: `${readMinutes} min read`, wordCount: words, blogcastTime: blogcastMinutes };
}

/** Format YYYY-MM-DD → "Month Day, 'YY" */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  // If already formatted with comma, convert the year to 'YY
  if (dateString.includes(",")) {
    return dateString.replace(/,\s*(\d{4})$/, (_, y) => `, '${y.slice(2)}`);
  }
  const date = new Date(dateString + "T00:00:00Z");
  if (isNaN(date.getTime())) return dateString;
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = date.getUTCDate();
  const year = String(date.getUTCFullYear()).slice(2);
  return `${month} ${day}, '${year}`;
}

/** Extract a subtitle from the first <p> tag content */
function extractSubtitle(html: string): string {
  const match = html.match(/<p[^>]*>(.*?)<\/p>/s);
  if (!match) return "";
  const text = stripHtml(match[1]);
  if (text.length <= 80) return text;
  // Cut at first period after 40 chars or at 80 chars
  const periodIdx = text.indexOf(".", 40);
  if (periodIdx > 0 && periodIdx < 120) return text.slice(0, periodIdx + 1);
  return text.slice(0, 80) + "…";
}

/* ═══════════════════════════════════════════════════════════════════
   DB row → BlogPost mapper
   ═══════════════════════════════════════════════════════════════════ */

function rowToPost(row: any): BlogPost {
  const html = typeof row.content === "string" ? row.content : "";
  const stats = estimateReadTime(html);
  return {
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description || undefined,
    subtitle: row.subtitle || "",
    date: formatDate(row.date),
    tags: row.tag ? [row.tag] : [],
    readTime: stats.readTime,
    wordCount: stats.wordCount,
    blogcastTime: stats.blogcastTime,
    heroImage: row.image || undefined,
    heroImageAlt: row.image_caption || row.title,
    content: html,
    musicEmbed: row.music_embed || undefined,
    blogcastUrl: row.blogcast_url || undefined,
    author: row.author || undefined,
    authorTitle: row.author_title || undefined,
    heroStyle: row.hero_style || undefined,
    published: row.published === true,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Public API — used by blog pages
   ═══════════════════════════════════════════════════════════════════ */

/** Cache tag for the published-post list. Revalidate this after publishing. */
export const POSTS_TAG = "itg-posts";

/**
 * EGRESS: this read pulls every published row INCLUDING the full `content` body,
 * and it runs on the blog index AND on every [slug] page (RelatedPosts). Uncached,
 * that is one whole-blog download per page render, and per prerendered page at
 * build time, which put the shared Supabase project 34% over its egress quota on
 * 2026-08-08. Cached, it is one download per revalidate window shared by every
 * caller.
 *
 * `content` cannot be dropped from the select: readTime and wordCount are derived
 * from it in rowToPost, and both render on the cards.
 *
 * unstable_cache (not `use cache`): Next 16 prefers the directive, but that needs
 * Cache Components enabled in next.config, which this app has not opted into.
 * Safe here only because createSupabasePublicClient is cookie-free; a cookie-bound
 * client inside a cache scope is unsupported and would throw.
 */
const fetchAllPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("itg_posts")
      .select("*")
      .eq("published", true)
      .order("date", { ascending: false });

    if (error) throw error;
    // Only PUBLISHED posts are ever public. A successful-but-empty result means
    // nothing is published yet → show an empty blog, never placeholder drafts.
    return (data ?? []).map(rowToPost);
  },
  ["itg-all-posts"],
  { tags: [POSTS_TAG], revalidate: 300 }
);

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    return await fetchAllPosts();
  } catch (e) {
    rethrowIfNextControlFlow(e);
    console.warn("[intheGno] Failed to fetch posts from DB:", e);
    return [];
  }
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  // Draft Mode (VibeWriter "Save & Preview"): when the draft cookie is present,
  // read the row with the service-role client and DROP the published filter, so
  // an UNPUBLISHED draft renders through this exact page. Public visitors never
  // have the cookie, so they only ever see published posts.
  //
  // draftMode() is safe to call unconditionally: during a static render Next
  // returns an empty draft mode (isEnabled === false) rather than throwing, and
  // a request carrying the __prerender_bypass cookie bypasses the static cache
  // and renders dynamically. That is what keeps Save & Preview working on an
  // ISR route.
  const preview = (await draftMode()).isEnabled;

  try {
    const supabase = preview
      ? createSupabaseAdminClient()
      : createSupabasePublicClient();
    let query = supabase.from("itg_posts").select("*").eq("slug", slug);
    if (!preview) query = query.eq("published", true);
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data ? rowToPost(data) : undefined;
  } catch (e) {
    rethrowIfNextControlFlow(e);
    console.warn("[intheGno] Failed to fetch post from DB:", e);
    return undefined;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("itg_posts")
      .select("slug")
      .eq("published", true);

    if (error) throw error;
    return (data ?? []).map((r) => r.slug);
  } catch (e) {
    rethrowIfNextControlFlow(e);
    console.warn("[intheGno] Failed to fetch slugs from DB:", e);
    return [];
  }
}
