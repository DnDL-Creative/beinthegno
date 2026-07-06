// -----------------------------------------------------------------------------
// HERO INLINE MARKUP — bold / italic / underline / strikethrough for the post
// TITLE and SUBTITLE, authored in VibeWriter with these tokens:
//     **bold**   *italic*   ++underline++   ~~strike~~
//
// renderInlineMarkup() returns SAFE html (HTML-escape the whole string FIRST so
// anything authored is inert, THEN introduce only the four whitelisted inline
// tags) and also resets emoji color — the title paints with a gold
// background-clip gradient that would otherwise flatten emoji to a gold
// silhouette (the job emojiSafe() does for plain strings).
//
// stripInlineMarkup() removes the tokens for the SEO surface (<title>, meta
// description, JSON-LD, image alt, share) so those stay clean plain text.
// -----------------------------------------------------------------------------

const EMOJI_SPLIT =
  /(\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*)/gu;
const EMOJI_TEST = /\p{Extended_Pictographic}/u;
const EMOJI_RESET =
  "-webkit-text-fill-color:initial;-webkit-background-clip:initial;background-clip:initial;background:none;color:initial;animation:none;font-family:'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji',sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderInlineMarkup(input: string | null | undefined): string {
  if (!input) return "";
  let s = esc(input);
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
  s = s.replace(/\+\+([^+\n]+?)\+\+/g, "<u>$1</u>");
  s = s.replace(/~~([^~\n]+?)~~/g, "<s>$1</s>");
  if (EMOJI_TEST.test(s)) {
    s = s
      .split(EMOJI_SPLIT)
      .map((part) =>
        part && EMOJI_TEST.test(part) ? `<span style="${EMOJI_RESET}">${part}</span>` : part
      )
      .join("");
  }
  return s;
}

export function stripInlineMarkup(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/\+\+([^+\n]+?)\+\+/g, "$1")
    .replace(/~~([^~\n]+?)~~/g, "$1");
}
