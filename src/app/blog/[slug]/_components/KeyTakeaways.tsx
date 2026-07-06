"use client";

import React from "react";

// Full-width "Key Takeaways" card richReplace builds from
// <section data-vibe-takeaways><ul><li>…</li></ul></section> (VibeWriter export).
// Themed to intheGno's vellum palette with oxidized-copper accents — the accent
// rides the --color-copper CSS var (no ThemeContext on this site), the heading
// uses the Outfit title font, and lines use the Inter body font.
//
// Built from div/span ONLY — the blog body's prose CSS (.body p/ul/li/strong …)
// targets those tags with higher specificity than any utility, so avoiding them
// (no p/ul/li) keeps the card intact. Accent "+" markers replace bullets.

const COPPER = "var(--color-copper, #B87333)";

export default function KeyTakeaways({ items }: { items: string[] }) {
  const lines = (items || []).map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div
      className="my-8 w-full rounded-2xl border px-6 py-6 sm:px-8 sm:py-7"
      style={{
        borderColor: `color-mix(in srgb, ${COPPER} 24%, transparent)`,
        background: `color-mix(in srgb, ${COPPER} 5%, transparent)`,
      }}
    >
      <div
        className="mb-5 flex items-center gap-2"
        style={{
          fontFamily: "var(--title-font, 'Outfit', sans-serif)",
          fontSize: "0.9rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: COPPER,
        }}
      >
        <span aria-hidden="true" style={{ fontWeight: 700 }}>
          +
        </span>{" "}
        Key Takeaways
      </div>
      <div className="flex flex-col gap-3.5">
        {lines.map((t, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              style={{
                color: COPPER,
                fontWeight: 800,
                flexShrink: 0,
                fontSize: "1.2rem",
                lineHeight: 1.4,
              }}
            >
              +
            </span>
            <span
              style={{
                fontFamily: "var(--font-body, 'Inter', sans-serif)",
                fontWeight: 600,
                fontSize: "clamp(1.0625rem, 0.99rem + 0.31vw, 1.1875rem)",
                lineHeight: 1.6,
                letterSpacing: "0.01em",
                color: "var(--foreground, hsl(20,25%,30%))",
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
