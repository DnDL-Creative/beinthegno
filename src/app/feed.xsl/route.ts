// Branded XSL stylesheet for /feed.xml — renders a human-readable page in the
// browser while feed readers still consume the raw RSS XML.

export const dynamic = "force-static";

const XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/>, RSS Feed</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&amp;family=Outfit:wght@200;300;400;500&amp;family=Inter:wght@300;400&amp;display=swap');
          :root { --copper:#B87333; --vellum:hsl(40,30%,94%); --surface:hsl(40,35%,97%); --earth:hsl(20,25%,30%); --tarnish:#8A7D6B; }
          * { box-sizing:border-box; }
          body {
            margin:0; background:var(--vellum); color:var(--earth);
            font-family:'Inter', system-ui, sans-serif; line-height:1.7;
            -webkit-font-smoothing:antialiased;
          }
          .wrap { max-width:720px; margin:0 auto; padding:64px 24px 96px; }
          .kicker {
            font-size:11px; letter-spacing:0.2em; text-transform:lowercase;
            color:var(--copper); margin:0 0 14px; font-family:'Inter', sans-serif; font-weight:400;
          }
          h1 {
            font-family:'Outfit', sans-serif; font-weight:200; letter-spacing:0.02em;
            font-size:clamp(2rem,1.4rem+3vw,2.75rem); line-height:1.1; margin:0 0 12px;
            color:#1C1C1C; text-transform:lowercase;
          }
          .desc { color:var(--tarnish); max-width:540px; margin:0 0 36px; }
          .subscribe {
            border:1px solid rgba(184,115,51,0.3); background:var(--surface);
            border-radius:12px; padding:18px 22px; margin:0 0 48px; font-size:14px;
          }
          .subscribe strong { color:#1C1C1C; }
          .subscribe code {
            display:block; margin-top:10px; padding:10px 14px; border-radius:8px;
            background:var(--vellum); border:1px solid rgba(20,20,20,0.08);
            color:var(--copper); font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;
            font-size:13px; word-break:break-all;
          }
          .divider { height:1px; margin:0 0 40px; background:linear-gradient(90deg,transparent,rgba(184,115,51,0.35),transparent); }
          article { padding:0 0 32px; margin:0 0 32px; border-bottom:1px solid rgba(20,20,20,0.08); }
          article:last-of-type { border-bottom:none; }
          h2 { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; font-size:1.6rem; margin:0 0 8px; line-height:1.2; }
          h2 a { color:#1C1C1C; text-decoration:none; transition:color .2s; }
          h2 a:hover { color:var(--copper); }
          .meta { font-size:11px; letter-spacing:0.1em; text-transform:lowercase; color:var(--tarnish); margin:0 0 12px; }
          .cat { color:var(--copper); }
          .excerpt { color:var(--earth); margin:0 0 14px; }
          .read { font-size:12px; letter-spacing:0.12em; text-transform:lowercase; color:var(--copper); text-decoration:none; }
          .read:hover { text-decoration:underline; }
          .foot { margin-top:48px; padding-top:24px; border-top:1px solid rgba(20,20,20,0.08); font-size:13px; }
          .foot a { color:var(--copper); text-decoration:none; }
          .foot a:hover { text-decoration:underline; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="kicker">rss feed · intheGno</p>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="desc"><xsl:value-of select="/rss/channel/description"/></p>

          <div class="subscribe">
            <strong>This is an RSS feed.</strong> Paste this address into your feed
            reader (Feedly, Reeder, etc.) to get every new observation automatically:
            <code><xsl:value-of select="/rss/channel/atom:link/@href"/></code>
          </div>

          <div class="divider"></div>

          <xsl:for-each select="/rss/channel/item">
            <article>
              <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
              <p class="meta">
                <xsl:value-of select="substring(pubDate, 1, 16)"/>
                <xsl:if test="category">
                  <xsl:text> · </xsl:text>
                  <span class="cat"><xsl:value-of select="category"/></span>
                </xsl:if>
              </p>
              <p class="excerpt"><xsl:value-of select="description"/></p>
              <a class="read" href="{link}">read the observation &#8594;</a>
            </article>
          </xsl:for-each>

          <div class="foot">
            <a href="/blog">&#8592; back to intheGno observations</a>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

export async function GET() {
  return new Response(XSL, {
    headers: {
      "Content-Type": "text/xsl; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
