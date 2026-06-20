import Link from "next/link";
import Image from "next/image";
import type { CatalogProduct } from "@/types/catalog";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./ProductCard.module.css";

/* ═══════════════════════════════════════════════════════════════════
   ProductCard — Collection-grid row. Two columns (image left,
   details right) collapsing to a single column at 640px. Mirrors the
   original static apparel card markup.
   ═══════════════════════════════════════════════════════════════════ */

/** Strip HTML tags and collapse whitespace; flag whether it was cut. */
function excerptOf(html: string, max = 200): { text: string; truncated: boolean } {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, max).trimEnd()}… `, truncated: true };
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  const href = product.collectionSlug
    ? `/${product.collectionSlug}/${product.handle}`
    : `/${product.handle}`;
  const excerpt = excerptOf(product.descriptionHtml);

  return (
    <article className={styles.product}>
      <Link href={href} className={styles.imageWrap} aria-label={product.title}>
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.title}
            width={600}
            height={600}
            className={styles.image}
            unoptimized
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>Image Coming Soon</span>
          </div>
        )}
      </Link>

      <div className={styles.details}>
        {product.badge && <span className={styles.badge}>{product.badge}</span>}

        <h2 className={styles.productTitle}>
          <Link href={href} className={styles.titleLink}>
            {product.title}
          </Link>
        </h2>

        {excerpt.text && (
          <p className={styles.productDesc}>
            {excerpt.text}
            {excerpt.truncated && (
              <Link href={href} className={styles.seeMore}>
                see more
              </Link>
            )}
          </p>
        )}

        <div className={styles.price}>
          <span className={styles.amount}>
            {formatPrice({
              amount: String(product.price),
              currencyCode: product.currency,
            })}
          </span>
          {product.compareAtPrice !== null && (
            <span className={styles.compareAt}>
              {formatPrice({
                amount: String(product.compareAtPrice),
                currencyCode: product.currency,
              })}
            </span>
          )}
        </div>

        <Link href={href} className={styles.view}>
          view →
        </Link>
      </div>
    </article>
  );
}
