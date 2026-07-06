// @ts-nocheck
"use client";

import { Disc, Mic2 } from "lucide-react";
import MusicEqualizer from "./MusicEqualizer";
import TechnicolorPlayer from "./TechnicolorPlayer";

/* ── intheGno Audio Section — Living UI Powered ───────────────────── */
/* Uses --accent, --accent-hover, --accent-active from globals.css     */

const getBlogcastEmbed = (url) => {
  if (!url) return null;
  if (url.includes("soundcloud.com") && !url.includes("w.soundcloud.com")) {
    const encodedUrl = encodeURIComponent(url);
    return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  }
  if (url.includes("spotify.com") && !url.includes("/embed")) {
    return url
      .replace("/track/", "/embed/track/")
      .replace("/episode/", "/embed/episode/");
  }
  return url;
};

/* ── music_embed XSS guard (H7) ───────────────────────────────────────
 * music_embed is admin-entered free-form HTML (typically a pasted
 * <iframe>). Rendering it via dangerouslySetInnerHTML was a stored-XSS
 * sink. Instead we extract a single embed URL — either a bare URL or the
 * src of a pasted <iframe> — and only accept it if its host is an
 * allowlisted embed provider. The validated URL is then rendered into a
 * fixed sandboxed <iframe>; anything that doesn't match renders nothing.
 */
const EMBED_HOST_ALLOWLIST = [
  "open.spotify.com",
  "w.soundcloud.com",
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "youtube-nocookie.com",
  "bandcamp.com",
];

const isAllowedEmbedHost = (host) => {
  const h = host.toLowerCase();
  return EMBED_HOST_ALLOWLIST.some(
    (allowed) => h === allowed || h.endsWith(`.${allowed}`)
  );
};

const getMusicEmbedUrl = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();

  // Pull a candidate URL: either the whole value (bare URL) or the src of
  // a pasted <iframe>.
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    const srcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) return null;
    candidate = srcMatch[1];
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    if (!isAllowedEmbedHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export default function AudioSection({ musicEmbed, blogcastUrl }) {
  const safeMusicEmbedUrl = getMusicEmbedUrl(musicEmbed);
  const hasMusic = !!safeMusicEmbedUrl;
  const hasBlogcast = !!blogcastUrl;
  const hasBoth = hasMusic && hasBlogcast;

  if (!hasMusic && !hasBlogcast) return null;

  const safeBlogcastUrl = getBlogcastEmbed(blogcastUrl);
  const isDirectFile =
    safeBlogcastUrl &&
    (safeBlogcastUrl.includes(".mp3") ||
      safeBlogcastUrl.includes(".wav") ||
      safeBlogcastUrl.includes(".m4a") ||
      safeBlogcastUrl.includes("supabase.co"));
  const isIframeBlogcast = safeBlogcastUrl && !isDirectFile;

  return (
    <div className={`mx-auto px-4 md:px-6 mb-6 md:mb-10 relative z-10 ${hasBoth ? "max-w-7xl" : "max-w-3xl"}`}>
      <div className={`grid gap-5 ${hasBoth ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        {/* MUSIC CARD */}
        {hasMusic && (
          <div
            className="relative group rounded-[2rem] p-[2px] shadow-xl"
            style={{ background: `linear-gradient(90deg, var(--accent, #B87333), var(--accent-hover, #c48a44), var(--accent, #B87333))` }}
          >
            <div className="absolute inset-0 bg-white/95 rounded-[calc(2rem-2px)]" />
            <div className="relative h-full bg-white/50 backdrop-blur-xl rounded-[calc(2rem-2px)] overflow-hidden p-4 md:p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, var(--accent, #B87333), var(--accent-hover, #c48a44))`, boxShadow: `0 4px 12px color-mix(in srgb, var(--accent, #B87333) 30%, transparent)` }}
                  >
                    <Disc size={22} className="animate-spin-slow" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base md:text-lg font-bold text-slate-900 leading-none tracking-tight">
                        Background Music
                      </h3>
                    </div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] pl-4" style={{ color: "var(--accent, #B87333)" }}>
                      Inspiration
                    </h4>
                  </div>
                </div>
                <div className="hidden sm:block scale-75 origin-right">
                  <MusicEqualizer variant="primary" />
                </div>
              </div>

              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3">
                Music fuels my writing. Here's the track that fueled this one. Hit play (login to Spotify) and listen-read along.
              </p>

              <div className="mt-auto w-full">
                <div className="w-full rounded-xl overflow-hidden shadow-sm min-h-[152px] bg-slate-50" style={{ border: "1px solid color-mix(in srgb, var(--accent, #B87333) 15%, transparent)" }}>
                  <iframe
                    src={safeMusicEmbedUrl}
                    title="Background music"
                    className="w-full block min-h-[152px]"
                    width="100%"
                    height="152"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    allow="encrypted-media; fullscreen; picture-in-picture"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOGCAST CARD */}
        {hasBlogcast && (
          <div
            className="relative group rounded-[2rem] p-[2px] shadow-xl"
            style={{ background: `linear-gradient(90deg, var(--accent-active, #8B4513), var(--accent, #B87333), var(--accent-active, #8B4513))` }}
          >
            <div className="absolute inset-0 bg-white/95 rounded-[calc(2rem-2px)]" />
            <div className="relative h-full bg-white/50 backdrop-blur-xl rounded-[calc(2rem-2px)] overflow-hidden p-4 md:p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, var(--accent-active, #8B4513), var(--accent, #B87333))`, boxShadow: `0 4px 12px color-mix(in srgb, var(--accent-active, #8B4513) 30%, transparent)` }}
                  >
                    <Mic2 size={22} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base md:text-lg font-bold text-slate-900 leading-none tracking-tight">
                        Blogcast Enabled
                      </h3>
                    </div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] pl-4" style={{ color: "var(--accent-active, #8B4513)" }}>
                      Audio Version
                    </h4>
                  </div>
                </div>
                <div className="hidden sm:block scale-75 origin-right">
                  <MusicEqualizer variant="secondary" />
                </div>
              </div>

              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3">
                Prefer listening? I've recorded a narration of this post. Think of it as a solo, personal podcast.
              </p>

              <div className="mt-auto w-full">
                {isIframeBlogcast ? (
                  <div className="w-full rounded-xl overflow-hidden shadow-sm min-h-[152px] bg-black">
                    <iframe
                      src={safeBlogcastUrl}
                      width="100%"
                      height="100%"
                      className="min-h-[152px] w-full block"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    ></iframe>
                  </div>
                ) : (
                  <TechnicolorPlayer url={safeBlogcastUrl} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
