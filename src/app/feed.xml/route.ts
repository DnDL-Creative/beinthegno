import { createClient } from "@supabase/supabase-js";

// Rebuild the feed hourly (ISR) so new posts appear without a redeploy.
export const revalidate = 3600;

const SITE = "https://beinthegno.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Row = {
  slug: string;
  title: string | null;
  content: unknown;
  date: string | null;
  tag: string | null;
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let posts: Row[] = [];
  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("itg_posts")
        .select("slug, title, content, date, tag")
        .eq("published", true)
        .order("date", { ascending: false })
        .limit(50);
      if (data) posts = data as Row[];
    } catch (e) {
      console.warn("[intheGno] RSS feed DB fetch failed:", e);
    }
  }

  const lastBuild = new Date().toUTCString();

  const items = posts
    .map((p) => {
      const link = `${SITE}/blog/${p.slug}`;
      const pubDate = p.date
        ? new Date(`${p.date}T00:00:00Z`).toUTCString()
        : lastBuild;
      const html = typeof p.content === "string" ? p.content : "";
      const description = stripHtml(html).slice(0, 300);
      return `    <item>
      <title>${escapeXml((p.title || "").replace(/\s+/g, " ").trim())}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>${
        p.tag ? `\n      <category>${escapeXml(p.tag)}</category>` : ""
      }
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>intheGno — Observations</title>
    <link>${SITE}/blog</link>
    <description>Tools for the trapped spark. Shadow work, sovereignty, and the grid, from intheGno.</description>
    <language>en-us</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      // text/xml (not application/rss+xml) so browsers apply the XSL stylesheet
      // for human visitors. Feed readers accept text/xml without issue.
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
