"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";

// The FAQ atom richReplace builds from <section data-vibe-faq>. Defined here so
// the blog has no dependency on a site-wide FAQ data module (intheGno has none).
export type FAQItem = {
  q: string;
  a: string;
};

// Inline FAQ accordion for blog posts, themed to intheGno's digital-parchment
// (vellum) palette with oxidized-copper accents. Question turns copper when
// open, +/− toggle, smooth grid-rows expand, **bold** + blank-line paragraphs
// in the answer.
//
// Layout is built from div/span/button only — the blog body's prose CSS
// (.body p/h3/strong …) targets those tags with higher specificity than any
// utility, so avoiding them keeps the accordion intact. Re-emits the FAQPage
// JSON-LD the original <section data-vibe-faq> carried.

const COPPER = "#B87333";

// Render inline markdown tokens: **bold**, *italic*, [text](url).
function renderInline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)
    .map((seg, i) => {
      if (/^\*\*[^*]+\*\*$/.test(seg))
        return <strong key={i}>{seg.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(seg))
        return <em key={i}>{seg.slice(1, -1)}</em>;
      const link = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const ext =
          /^https?:\/\//i.test(link[2]) && !link[2].includes("beinthegno.com");
        return (
          <a
            key={i}
            href={link[2]}
            {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            style={{
              color: COPPER,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            {link[1]}
          </a>
        );
      }
      return <React.Fragment key={i}>{seg}</React.Fragment>;
    });
}

function answerNodes(a: string): React.ReactNode {
  return a.split("\n\n").map((para, pi) => (
    <div
      key={pi}
      style={pi > 0 ? { marginTop: "1rem" } : undefined}
    >
      {renderInline(para)}
    </div>
  ));
}

export default function BlogFaq({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null); // all collapsed by default

  if (!items.length) return null;

  // Strip markdown tokens for the JSON-LD plain-text fields.
  const plain = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n\n/g, " ")
      .trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: plain(it.q),
      acceptedAnswer: {
        "@type": "Answer",
        text: plain(it.a),
      },
    })),
  };

  return (
    <div
      style={{
        margin: "2rem 0",
        borderRadius: "1rem",
        border: `1px solid ${COPPER}40`,
        background:
          "color-mix(in srgb, var(--surface-elevated, #fafaf7) 92%, var(--color-copper, #B87333))",
        padding: "0 1.5rem",
      }}
    >
      {/* Escape `<` as < so FAQ text containing "</script>" cannot
          break out of this block and inject markup. JSON treats < as
          an ordinary "<", so consumers parse it identically. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            style={{
              borderBottom:
                index < items.length - 1 ? `1px solid ${COPPER}22` : "none",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1.5rem",
                padding: "1.25rem 0",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--title-font, 'Outfit', sans-serif)",
                  fontWeight: 300,
                  fontSize: "1.18rem",
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                  color: isOpen ? COPPER : "var(--title-color, #1C1C1C)",
                  transition: "color 0.4s ease",
                }}
              >
                {renderInline(item.q)}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  color: isOpen ? COPPER : "var(--nav-color, #8A7D6B)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.4s ease, color 0.4s ease",
                  display: "inline-flex",
                }}
              >
                {isOpen ? (
                  <Minus size={15} strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transition: "grid-template-rows 0.4s ease-out",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                {/* Mirror the regular blog body type (.body p): Inter body font,
                    same fluid size, weight, color, line-height. */}
                <div
                  style={{
                    paddingBottom: "1.5rem",
                    fontFamily: "var(--font-body, 'Inter', sans-serif)",
                    fontSize: "var(--text-blog-body, 1.0625rem)",
                    fontWeight: 400,
                    color: "var(--foreground, hsl(20,25%,30%))",
                    lineHeight: 1.6,
                  }}
                >
                  {answerNodes(item.a)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
