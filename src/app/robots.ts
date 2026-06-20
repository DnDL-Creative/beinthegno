import type { MetadataRoute } from "next";

/* ═══════════════════════════════════════════════════════════════════
   robots.txt — crawl directives.

   Open the public site to all crawlers; keep admin, API, raw
   downloads, cart, and login out of the index.
   ═══════════════════════════════════════════════════════════════════ */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/downloads/", "/cart", "/login"],
    },
    sitemap: "https://beinthegno.com/sitemap.xml",
  };
}
