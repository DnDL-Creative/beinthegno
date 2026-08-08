import Link from "next/link";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { formatPrice } from "@/utils/formatPrice";
import type { CatalogProduct } from "@/types/catalog";
import styles from "./TrilogyGrid.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Innerwork layout — the Sovereign Trilogy.

   The bundle leads as a wide hero card (struck-through compare-at),
   then the three books in sort order. Used ONLY by the innerwork
   collection; every other collection keeps the generic ProductCard
   grid.
   ═══════════════════════════════════════════════════════════════════ */

/** "ebook + audiobook · includes 3 guided sessions: 15 / 30 / 45 min" */
function formatLine(product: CatalogProduct): string | null {
  const meta = product.metadata as Record<string, unknown>;
  const format = typeof meta.format === "string" ? meta.format : null;
  const sessions = typeof meta.sessions === "string" ? meta.sessions : null;
  if (!format && !sessions) return null;
  if (format && sessions) {
    return product.productType === "bundle"
      ? `${format} · all ${sessions}`
      : `${format} · includes 3 guided sessions: ${sessions}`;
  }
  return format || sessions;
}

function price(product: CatalogProduct) {
  return formatPrice({
    amount: String(product.price),
    currencyCode: product.currency,
  });
}

function compareAt(product: CatalogProduct) {
  return product.compareAtPrice !== null
    ? formatPrice({
        amount: String(product.compareAtPrice),
        currencyCode: product.currency,
      })
    : null;
}

export function TrilogyGrid({ products }: { products: CatalogProduct[] }) {
  const bundle = products.find((p) => p.productType === "bundle") ?? null;
  const books = products
    .filter((p) => p.productType !== "bundle")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.wrap}>
      {/* ── BUNDLE HERO ──────────────────────────────────────────── */}
      {bundle && (
        <Link
          href={`/${bundle.collectionSlug}/${bundle.handle}`}
          className={styles.heroLink}
        >
          <PipeFrame bg="hsl(38, 28%, 88%)">
            <article className={styles.hero}>
              {bundle.badge && (
                <span className={styles.heroBadge}>{bundle.badge}</span>
              )}
              <h2 className={styles.heroTitle}>{bundle.title}</h2>
              {bundle.subtitle && (
                <p className={styles.heroSubtitle}>{bundle.subtitle}</p>
              )}
              <div className={styles.heroPrice}>
                <span className={styles.amount}>{price(bundle)}</span>
                {compareAt(bundle) && (
                  <span className={styles.compareAt}>{compareAt(bundle)}</span>
                )}
              </div>
              {formatLine(bundle) && (
                <p className={styles.format}>{formatLine(bundle)}</p>
              )}
              <span className={styles.view}>view &rarr;</span>
            </article>
          </PipeFrame>
        </Link>
      )}

      {/* ── THE THREE BOOKS ──────────────────────────────────────── */}
      <div className={styles.books}>
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/${book.collectionSlug}/${book.handle}`}
            className={styles.cardLink}
          >
            <PipeFrame bg="hsl(38, 28%, 88%)">
              <article className={styles.card}>
                {book.badge && <span className={styles.badge}>{book.badge}</span>}
                <h3 className={styles.title}>{book.title}</h3>
                {book.subtitle && (
                  <p className={styles.subtitle}>{book.subtitle}</p>
                )}
                <div className={styles.cardFooter}>
                  <div className={styles.priceRow}>
                    <span className={styles.amount}>{price(book)}</span>
                    {compareAt(book) && (
                      <span className={styles.compareAt}>{compareAt(book)}</span>
                    )}
                  </div>
                  {formatLine(book) && (
                    <p className={styles.format}>{formatLine(book)}</p>
                  )}
                  <span className={styles.view}>view &rarr;</span>
                </div>
              </article>
            </PipeFrame>
          </Link>
        ))}
      </div>
    </div>
  );
}
