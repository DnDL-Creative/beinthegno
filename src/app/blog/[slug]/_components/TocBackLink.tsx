"use client";

import React from "react";
import { ArrowUp } from "lucide-react";
import styles from "../page.module.css";

// The per-h2 "back to contents" arrow. The anchor scrolls to the TOC; on click
// we ALSO open the (collapsed) <details> and re-fire its illumination glow, so
// every click lands you on an open, lit Table of Contents — even if you were
// already parked on it (where :target alone wouldn't re-trigger).
export default function TocBackLink() {
  const onClick = () => {
    const toc = document.getElementById("table-of-contents") as HTMLDetailsElement | null;
    if (!toc) return;
    if (toc.tagName === "DETAILS") toc.open = true; // always expand it
    // Restart the glow even when the hash doesn't change.
    toc.style.animation = "none";
    void toc.offsetWidth; // force reflow
    toc.style.animation = "itg-toc-illuminate 1.3s ease-out";
  };

  return (
    <a
      href="#table-of-contents"
      className={styles.tocBack}
      title="Back to contents"
      aria-label="Back to table of contents"
      onClick={onClick}
    >
      <ArrowUp size={17} strokeWidth={2.4} aria-hidden="true" />
    </a>
  );
}
