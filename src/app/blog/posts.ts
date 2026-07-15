/**
 * Blog post data fetcher.
 * Reads from Supabase `itg_posts` table. Content is stored as HTML strings.
 * Only PUBLISHED rows are ever returned publicly — a successful-but-empty query
 * (nothing published yet) returns an empty list, and a DB error returns empty
 * too, so unpublished drafts NEVER leak onto the live blog or into the sitemap.
 * Draft Mode (getPost, via "Save & Preview") bypasses the published filter with
 * the service-role client so only the cookie-holder sees a draft.
 */

import { draftMode } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

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

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("itg_posts")
      .select("*")
      .eq("published", true)
      .order("date", { ascending: false });

    if (error) throw error;
    // Only PUBLISHED posts are ever public. A successful-but-empty result means
    // nothing is published yet → show an empty blog, never placeholder drafts.
    return (data ?? []).map(rowToPost);
  } catch (e) {
    console.warn("[intheGno] Failed to fetch posts from DB:", e);
    return [];
  }
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  // Draft Mode (VibeWriter "Save & Preview"): when the draft cookie is present,
  // read the row with the service-role client and DROP the published filter, so
  // an UNPUBLISHED draft renders through this exact page. Public visitors never
  // have the cookie, so they only ever see published posts. The try/catch guards
  // build-time static generation, where draftMode() has no request scope.
  let preview = false;
  try {
    preview = (await draftMode()).isEnabled;
  } catch {
    preview = false;
  }

  try {
    const supabase = preview
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();
    let query = supabase.from("itg_posts").select("*").eq("slug", slug);
    if (!preview) query = query.eq("published", true);
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data ? rowToPost(data) : undefined;
  } catch (e) {
    console.warn("[intheGno] Failed to fetch post from DB:", e);
    return undefined;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("itg_posts")
      .select("slug")
      .eq("published", true);

    if (error) throw error;
    return (data ?? []).map((r) => r.slug);
  } catch (e) {
    console.warn("[intheGno] Failed to fetch slugs from DB:", e);
    return [];
  }
}
