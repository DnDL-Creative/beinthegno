import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ItgProductRow, ItgCollectionRow } from "@/types/database";
import { formatPrice } from "@/utils/formatPrice";
import { cn } from "@/utils/cn";
import { ProductFilters } from "./ProductFilters";
import styles from "../admin-table.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Products — list view (all products, every status).
   Joins collection slug + asset counts; filterable by collection /
   status / type through awaited searchParams.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

type ProductRow = ItgProductRow & {
  itg_collections: { slug: string; title: string } | null;
};

type Counted = ProductRow & { deliverables: number; previews: number };

const STATUS_CLASS: Record<string, string> = {
  active: "pillActive",
  draft: "pillDraft",
  archived: "pillArchived",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    collection?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const sp = await searchParams;

  const db = createSupabaseAdminClient();

  // Collections for the filter dropdown + slug display.
  const { data: colData } = await db
    .from("itg_collections")
    .select("id, slug, title, sort_order")
    .order("sort_order", { ascending: true });
  const collections = (colData ?? []) as Pick<
    ItgCollectionRow,
    "id" | "slug" | "title" | "sort_order"
  >[];

  // Products with joined collection.
  let query = db
    .from("itg_products")
    .select("*, itg_collections(slug, title)")
    .order("sort_order", { ascending: true });

  if (sp.collection) query = query.eq("collection_id", sp.collection);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.type) query = query.eq("product_type", sp.type);

  const { data: prodData } = await query;
  const products = (prodData ?? []) as ProductRow[];

  // Asset counts per product.
  const counted: Counted[] = await Promise.all(
    products.map(async (p) => {
      const { count: deliverables } = await db
        .from("itg_product_assets")
        .select("*", { count: "exact", head: true })
        .eq("product_id", p.id)
        .eq("is_preview", false);
      const { count: previews } = await db
        .from("itg_product_assets")
        .select("*", { count: "exact", head: true })
        .eq("product_id", p.id)
        .eq("is_preview", true);
      return {
        ...p,
        deliverables: deliverables ?? 0,
        previews: previews ?? 0,
      };
    })
  );

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>
            inthe<span className={styles.accent}>Gno</span> products
          </h1>
          <p className={styles.subtitle}>everything you sell, anywhere</p>
        </div>
        <Link href="/admin/products/new" className={styles.newButton}>
          + new product
        </Link>
      </header>

      <ProductFilters
        collections={collections.map((c) => ({ id: c.id, title: c.title }))}
        selected={{
          collection: sp.collection ?? "",
          status: sp.status ?? "",
          type: sp.type ?? "",
        }}
      />

      {counted.length === 0 ? (
        <div className={styles.tableWrap}>
          <p className={styles.empty}>no products match — adjust filters or add one</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>title</th>
                <th>collection</th>
                <th>type</th>
                <th>status</th>
                <th>price</th>
                <th>files</th>
                <th>updated</th>
              </tr>
            </thead>
            <tbody>
              {counted.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className={styles.rowTitle}
                    >
                      {p.title}
                    </Link>
                    <div className={styles.mono}>/{p.handle}</div>
                  </td>
                  <td className={styles.muted}>
                    {p.itg_collections?.title ?? "—"}
                  </td>
                  <td>
                    <span className={styles.pill}>{p.product_type}</span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        styles.pill,
                        styles[STATUS_CLASS[p.status] ?? "pill"]
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className={styles.mono}>
                    {formatPrice({
                      amount: String(p.price),
                      currencyCode: p.currency || "USD",
                    })}
                  </td>
                  <td className={styles.mono}>
                    {p.deliverables} deliv · {p.previews} prev
                  </td>
                  <td className={styles.mono}>
                    {new Date(p.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
