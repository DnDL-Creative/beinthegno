import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import parse from "html-react-parser";
import { getProductByHandle, getPurchasability } from "@/lib/catalog";
import { ProductPurchase, MadeToOrder } from "@/components/shop";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Product detail — gallery left, details/buy right. CMS-driven.
   ═══════════════════════════════════════════════════════════════════ */

export const revalidate = 300;

type Params = Promise<{ collection: string; handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product) return { title: "Not Found" };

  return {
    title: product.seoTitle || product.title,
    description: product.seoDescription || product.subtitle || undefined,
  };
}

function priceNote(metadata: Record<string, unknown>): string | null {
  const note = metadata["price_note"];
  return typeof note === "string" && note.trim() ? note : null;
}

export default async function ProductPage({ params }: { params: Params }) {
  const { collection, handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product || product.collectionSlug !== collection) notFound();

  const purchasability = getPurchasability(product);
  const images = product.images;
  const main = images[0];
  const note = priceNote(product.metadata);
  const isPhysical = product.productType === "physical" || product.requiresShipping;

  return (
    <main className={styles.main}>
      <Link href={`/${collection}`} className={styles.backLink}>
        <ArrowLeft size={15} aria-hidden="true" />
        {product.collectionNavLabel || "back"}
      </Link>

      <article className={styles.product}>
        {/* ── GALLERY ──────────────────────────────────────────── */}
        <div className={styles.gallery}>
          <div className={styles.mainImageWrap}>
            {main ? (
              <Image
                src={main.url}
                alt={main.alt || product.title}
                width={800}
                height={800}
                className={styles.mainImage}
                unoptimized
                priority
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <span>Image Coming Soon</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((img, i) => (
                <div key={`${img.url}-${i}`} className={styles.thumb}>
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.title} view ${i + 1}`}
                    width={120}
                    height={120}
                    className={styles.thumbImage}
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DETAILS ──────────────────────────────────────────── */}
        <div className={styles.details}>
          {product.badge && <span className={styles.badge}>{product.badge}</span>}

          <h1 className={styles.title}>{product.title}</h1>
          {product.subtitle && (
            <p className={styles.subtitle}>{product.subtitle}</p>
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
          {note && <p className={styles.priceNote}>{note}</p>}

          {product.descriptionHtml && (
            <div className={styles.description}>
              {parse(product.descriptionHtml)}
            </div>
          )}

          {product.features.length > 0 && (
            <div className={styles.features}>
              <h2 className={styles.featuresHeading}>what&apos;s inside</h2>
              <ul className={styles.featureList}>
                {product.features.map((feature, i) => (
                  <li key={i} className={styles.featureItem}>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.previewAssets.length > 0 && (
            <div className={styles.previews}>
              {product.previewAssets.map((asset) =>
                asset.kind === "audio" && asset.url ? (
                  <PipeFrame key={asset.id} className={styles.previewFrame}>
                    <div className={styles.previewInner}>
                      <span className={styles.previewLabel}>{asset.label}</span>
                      <audio
                        controls
                        preload="none"
                        src={asset.url}
                        className={styles.audio}
                      />
                    </div>
                  </PipeFrame>
                ) : asset.url ? (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sampleLink}
                  >
                    sample: {asset.label}
                  </a>
                ) : null
              )}
            </div>
          )}

          <ProductPurchase product={product} purchasability={purchasability} />

          <MadeToOrder collectionSlug={product.collectionSlug} className={styles.madeToOrder} />

          {isPhysical && (
            <p className={styles.shipping}>Free shipping on orders over $75</p>
          )}
        </div>
      </article>
    </main>
  );
}
