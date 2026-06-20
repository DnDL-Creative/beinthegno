import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ItgCollectionRow } from "@/types/database";
import { cn } from "@/utils/cn";
import styles from "../admin-table.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Collections — list view (all collections, incl. unpublished).
   Service-role read so drafts show up; product counts joined per row.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  robots: { index: false, follow: false },
};

type Row = ItgCollectionRow & { productCount: number };

async function loadCollections(): Promise<Row[]> {
  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("itg_collections")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as ItgCollectionRow[];

    // Per-collection product counts.
    const counts = await Promise.all(
      rows.map(async (c) => {
        const { count } = await db
          .from("itg_products")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", c.id);
        return count ?? 0;
      })
    );

    return rows.map((c, i) => ({ ...c, productCount: counts[i] }));
  } catch (e) {
    console.warn("[intheGno] loadCollections failed:", e);
    return [];
  }
}

export default async function AdminCollectionsPage() {
  const collections = await loadCollections();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>
            inthe<span className={styles.accent}>Gno</span> collections
          </h1>
          <p className={styles.subtitle}>product lines &amp; nav menus</p>
        </div>
        <Link href="/admin/collections/new" className={styles.newButton}>
          + new collection
        </Link>
      </header>

      {collections.length === 0 ? (
        <div className={styles.tableWrap}>
          <p className={styles.empty}>no collections yet — create your first one</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>title</th>
                <th>slug</th>
                <th>nav label</th>
                <th>kind</th>
                <th>sort</th>
                <th>in nav</th>
                <th>published</th>
                <th>products</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/admin/collections/${c.id}`}
                      className={styles.rowTitle}
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.mono}>/{c.slug}</span>
                  </td>
                  <td className={styles.muted}>{c.nav_label}</td>
                  <td>
                    <span className={styles.pill}>{c.kind}</span>
                  </td>
                  <td className={styles.mono}>{c.sort_order}</td>
                  <td>
                    <span className={c.show_in_nav ? styles.flagYes : styles.flagNo}>
                      {c.show_in_nav ? "yes" : "no"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        styles.pill,
                        c.published ? styles.pillActive : styles.pillDraft
                      )}
                    >
                      {c.published ? "live" : "draft"}
                    </span>
                  </td>
                  <td className={styles.mono}>{c.productCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
