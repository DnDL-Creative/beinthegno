"use client";

import { useEffect, useRef } from "react";

// Reading-progress bar — a thin themed line pinned to the top of the viewport
// that fills as the reader scrolls the article (Yoast-style). Each brand blog
// passes its own accent color; the bar tracks document scroll.
//
// Smoothness: we write `transform: scaleX()` straight to the DOM via a ref
// inside a requestAnimationFrame tick — no React re-render per scroll frame,
// no `width` layout thrash, and NO CSS transition (the scroll IS the
// animation, so easing would just lag behind the finger). Tracks 1:1, on GPU.
export default function ReadingProgress({
  color = "currentColor",
  height = 5,
  zIndex = 10050,
}: {
  color?: string;
  height?: number;
  zIndex?: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      const bar = barRef.current;
      if (bar) bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex,
        pointerEvents: "none",
      }}
    >
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "100%",
          transformOrigin: "0 50%",
          transform: "scaleX(0)",
          background: color,
          boxShadow: `0 0 10px ${color}`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
