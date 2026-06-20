import type { MetadataRoute } from "next";
import { getCollections, getCollectionWithProducts } from "@/lib/catalog";
import { getAllSlugs } from "@/app/blog/posts";

/* ═══════════════════════════════════════════════════════════════════
   sitemap.xml — generated index of public URLs.

   Static pages + every published collection, every active product,
   and every published blog post. All data fetching is wrapped so a
   transient backend failure degrades to the static map instead of a 500.
   ═══════════════════════════════════════════════════════════════════ */

const BASE_URL = "https://beinthegno.com";

const STATIC_PATHS = [
  "/",
  "/about",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
  "/shipping",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));

  // ── Collections + their products ──────────────────────────────────
  try {
    const collections = await getCollections();
    for (const collection of collections) {
      entries.push({
        url: `${BASE_URL}/${collection.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });

      try {
        const result = await getCollectionWithProducts(collection.slug);
        for (const product of result?.products ?? []) {
          entries.push({
            url: `${BASE_URL}/${collection.slug}/${product.handle}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      } catch {
        // Skip this collection's products; keep the rest of the map.
      }
    }
  } catch {
    // No collections available; fall through to whatever we have.
  }

  // ── Blog posts ────────────────────────────────────────────────────
  try {
    const slugs = await getAllSlugs();
    for (const slug of slugs) {
      entries.push({
        url: `${BASE_URL}/blog/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // No blog posts available; the static /blog entry still stands.
  }

  return entries;
}
