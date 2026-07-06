"use client";

import React from "react";
import styles from "../page.module.css";

// Relative luminance (WCAG) of a hex color, 0 (black) … 1 (white).
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLin(parseInt(h.slice(0, 2), 16)) +
    0.7152 * toLin(parseInt(h.slice(2, 4), 16)) +
    0.0722 * toLin(parseInt(h.slice(4, 6), 16))
  );
}

// Filled copper pill (copper→brass gradient via the .ctaButton CSS). Picks a
// SOFTENED light or dark label by the fill's luminance — auto-readable on the
// oxidized-copper fill (dark forged-iron text) — and never pitch black or pure
// white.
const COPPER = "#B87333";

export default function CtaButton({ href, label }: { href: string; label: string }) {
  const textColor = luminance(COPPER) > 0.42 ? "#1C1C1C" : "#F5EFE3";

  return (
    <a
      href={href}
      className={styles.ctaButton}
      style={{ color: textColor, WebkitTextFillColor: textColor }}
    >
      {label}
    </a>
  );
}
