import { cn } from "@/utils/cn";
import styles from "./MadeToOrder.module.css";

/* ═══════════════════════════════════════════════════════════════════
   MadeToOrder — provenance line for the hand-made lines.
   Self-gating: renders only for the collections made to order in the
   US & Italy. SVG flags (no emoji). Drop anywhere a slug is known.
   ═══════════════════════════════════════════════════════════════════ */

const MADE_TO_ORDER = new Set(["copper", "orgone", "healing"]);

/** Simplified Stars & Stripes — 13 stripes, canton, star field. */
function UsFlag() {
  const h = 16 / 13;
  return (
    <svg
      className={styles.flag}
      viewBox="0 0 24 16"
      role="img"
      aria-label="United States"
    >
      <rect width="24" height="16" fill="#fff" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect
          key={i}
          y={h * i}
          width="24"
          height={h}
          fill={i % 2 === 0 ? "#B22234" : "#fff"}
        />
      ))}
      <rect width="9.8" height={h * 7} fill="#3C3B6E" />
      <g fill="#fff">
        {Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <circle
              key={`${r}-${c}`}
              cx={1.6 + c * 2.4}
              cy={1.7 + r * 2.55}
              r="0.5"
            />
          )),
        )}
      </g>
    </svg>
  );
}

/** Il Tricolore — green / white / red. */
function ItFlag() {
  return (
    <svg
      className={styles.flag}
      viewBox="0 0 24 16"
      role="img"
      aria-label="Italy"
    >
      <rect width="8" height="16" fill="#009246" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE2B37" />
    </svg>
  );
}

export function MadeToOrder({
  collectionSlug,
  className,
  align = "center",
}: {
  collectionSlug?: string;
  className?: string;
  /** "inherit" follows the parent's text-align (used in the responsive header). */
  align?: "left" | "center" | "inherit";
}) {
  if (!collectionSlug || !MADE_TO_ORDER.has(collectionSlug)) return null;

  const alignClass =
    align === "left"
      ? styles.alignLeft
      : align === "center"
        ? styles.alignCenter
        : undefined;

  // Digital (healing) — written by a human, recorded in pro studios.
  if (collectionSlug === "healing") {
    return (
      <p className={cn(styles.madeToOrder, alignClass, className)}>
        written &amp; recorded by humans in{" "}
        <span className={styles.flags}>
          professional <UsFlag /> &amp; <ItFlag /> studios
        </span>
      </p>
    );
  }

  // Physical (copper, orgone) — made to order.
  return (
    <p className={cn(styles.madeToOrder, alignClass, className)}>
      made to order in the{" "}
      <span className={styles.flags}>
        <UsFlag /> &amp; <ItFlag />
      </span>
    </p>
  );
}
