"use client";

import { useRouter } from "next/navigation";
import type { ProductStatus, ProductType } from "@/types/catalog";
import styles from "../admin-table.module.css";

/* ═══════════════════════════════════════════════════════════════════
   ProductFilters — collection / status / type selects that push the
   selection into the URL query (server re-fetches with the filters).
   ═══════════════════════════════════════════════════════════════════ */

const STATUSES: ProductStatus[] = ["draft", "active", "archived"];
const TYPES: ProductType[] = [
  "physical",
  "digital",
  "service",
  "bundle",
  "other",
];

export function ProductFilters({
  collections,
  selected,
}: {
  collections: { id: string; title: string }[];
  selected: { collection: string; status: string; type: string };
}) {
  const router = useRouter();

  function update(key: "collection" | "status" | "type", value: string) {
    const next = { ...selected, [key]: value };
    const params = new URLSearchParams();
    if (next.collection) params.set("collection", next.collection);
    if (next.status) params.set("status", next.status);
    if (next.type) params.set("type", next.type);
    const qs = params.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  return (
    <div className={styles.filters}>
      <div className={styles.filterField}>
        <span className={styles.filterLabel}>collection</span>
        <select
          className={styles.select}
          value={selected.collection}
          onChange={(e) => update("collection", e.target.value)}
        >
          <option value="">all</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <span className={styles.filterLabel}>status</span>
        <select
          className={styles.select}
          value={selected.status}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">all</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <span className={styles.filterLabel}>type</span>
        <select
          className={styles.select}
          value={selected.type}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">all</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
