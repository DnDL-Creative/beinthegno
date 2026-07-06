"use client";

import React, { useState } from "react";
import { List, ChevronDown } from "lucide-react";

type TocLink = { href: string; label: string; level?: number };

const COPPER = "#B87333";

// Hex (#rgb / #rrggbb) → rgba string with alpha. Falls back to the raw color if
// it isn't a parseable hex, so a non-hex value still renders.
function rgba(color: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Collapsible "Table of Contents" for blog posts (native <details> — zero-JS,
// crawlable even when closed, starts collapsed). Themed to intheGno's copper /
// vellum palette. H2-ONLY — a blog TOC, not a book outline. Laid out as a
// horizontal numbered GRID where each card carries a big faded "01 / 02 …"
// watermark behind its label. Inline colors so the prose body CSS can't
// override the labels.
export default function JumpToBox({ links }: { links: TocLink[] }) {
  const accent = COPPER;
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // H2-only: drop any deeper levels baked into already-published posts, then
  // number the survivors 01, 02, 03 …
  const items = links
    .filter((l) => (l.level ?? 2) === 2)
    .map((l, i) => ({ ...l, num: String(i + 1).padStart(2, "0") }));
  if (!items.length) return null;

  return (
    <details
      id="table-of-contents"
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{
        // Full content width so the numbered grid gets 2–3 columns.
        width: "100%",
        scrollMarginTop: "6rem", // clear the fixed navbar when an h2 jumps back
        maxWidth: "100%",
        borderRadius: "1rem",
        border: `1px solid ${rgba(accent, 0.35)}`,
        background:
          "color-mix(in srgb, var(--surface-elevated, #fafaf7) 90%, var(--color-copper, #B87333))",
      }}
    >
      {/* Hide the native disclosure triangle + the back-link illumination glow. */}
      <style>{".itg-toc-summary{list-style:none}.itg-toc-summary::-webkit-details-marker{display:none}@keyframes itg-toc-illuminate{0%,100%{box-shadow:0 0 0 0 rgba(184,115,51,0)}25%{box-shadow:0 0 32px 7px rgba(184,115,51,0.45)}}#table-of-contents:target{animation:itg-toc-illuminate 1.3s ease-out}"}</style>

      <summary
        className="itg-toc-summary"
        style={{
          display: "flex",
          cursor: "pointer",
          userSelect: "none",
          alignItems: "center",
          gap: "0.625rem",
          padding: "1rem 1.5rem",
        }}
      >
        <List size={15} strokeWidth={2} aria-hidden="true" style={{ color: accent, flexShrink: 0 }} />
        {/* Real <h3> for SEO; inline styles override the .body h3 accent bar. */}
        <h3
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            fontFamily: "var(--title-font, 'Outfit', sans-serif)",
            fontWeight: 300,
            fontSize: "1.15rem",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
            color: accent,
            WebkitTextFillColor: accent,
          }}
        >
          Table of Contents
        </h3>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
          style={{
            color: accent,
            marginLeft: "auto",
            flexShrink: 0,
            opacity: 0.85,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        />
      </summary>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(max(50% - 0.3rem, 240px), 1fr))",
          gap: "0.6rem",
          padding: "0.25rem 1.5rem 1.25rem",
        }}
      >
        {items.map((l, i) => {
          const on = hover === i;
          const labelColor = on ? accent : "var(--title-color, #1C1C1C)";
          return (
            <a
              key={i}
              href={l.href}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                minHeight: "58px",
                padding: "0.65rem 0.9rem",
                borderRadius: "0.85rem",
                border: `1px solid ${rgba(accent, on ? 0.5 : 0.32)}`,
                background: rgba(accent, on ? 0.18 : 0.09),
                color: labelColor,
                // Opt out of any inherited link styling. Inline wins.
                textDecoration: "none",
                WebkitTextFillColor: labelColor,
                animation: "none",
                transition: "all 0.3s ease",
                transform: on ? "translateY(-2px)" : "none",
              }}
            >
              {/* Big faded watermark number behind the label. */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: "-0.06em",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "var(--title-font, 'Outfit', sans-serif)",
                  fontWeight: 800,
                  fontSize: "3.55rem",
                  lineHeight: 1,
                  color: accent,
                  opacity: on ? 0.24 : 0.13,
                  pointerEvents: "none",
                  userSelect: "none",
                  fontVariantNumeric: "tabular-nums",
                  zIndex: 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                {l.num}
              </span>
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  paddingRight: "1.1rem",
                  fontFamily: "var(--font-body, 'Inter', sans-serif)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  lineHeight: 1.22,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: labelColor,
                  WebkitTextFillColor: labelColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {l.label}
              </span>
            </a>
          );
        })}
      </div>
    </details>
  );
}
