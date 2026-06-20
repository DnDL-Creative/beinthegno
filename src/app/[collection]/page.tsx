import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollections, getCollectionWithProducts } from "@/lib/catalog";
import { ProductCard, MadeToOrder } from "@/components/shop";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import comingSoon from "../coming-soon.module.css";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Collection — dynamic, CMS-driven catalog page.
   Replaces the static /apparel /copper /anti-emf /orgone routes.
   ═══════════════════════════════════════════════════════════════════ */

export const revalidate = 300;

type Params = Promise<{ collection: string }>;

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { collection: slug } = await params;
  const result = await getCollectionWithProducts(slug);
  if (!result) return { title: "Not Found" };

  const { collection } = result;
  return {
    title: collection.seoTitle || collection.title,
    description: collection.seoDescription || collection.description,
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { collection: slug } = await params;
  const result = await getCollectionWithProducts(slug);
  if (!result) notFound();

  const { collection, products } = result;

  /* ── EMPTY → coming-soon layout ─────────────────────────────── */
  if (products.length === 0) {
    return (
      <main className={comingSoon.main}>
        <div className={comingSoon.content}>
          <h1 className={comingSoon.title}>
            inthe<span className={comingSoon.accent}>Gno</span> {collection.title}
          </h1>
          {collection.description && (
            <p className={comingSoon.message}>{collection.description}</p>
          )}
          {collection.badge && (
            <PipeFrame className={styles.comingSoonFrame}>
              <span className={styles.comingSoonBadge}>{collection.badge}</span>
            </PipeFrame>
          )}
          <MadeToOrder collectionSlug={collection.slug} className={styles.madeToOrder} />
        </div>
      </main>
    );
  }

  /* ── HAS PRODUCTS → grid ────────────────────────────────────── */
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>
          inthe<span className={styles.accent}>Gno</span> {collection.title}
        </h1>
        {collection.tagline && (
          <p className={styles.subtitle}>{collection.tagline}</p>
        )}
        <MadeToOrder collectionSlug={collection.slug} align="inherit" className={styles.madeToOrderHeader} />
      </header>

      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
