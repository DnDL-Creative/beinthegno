import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { isStripeConfigured } from "@/lib/stripe";
import { isR2Configured } from "@/lib/r2";
import { isPrintifyConfigured } from "@/lib/printify";
import { isResendConfigured } from "@/lib/newsletter";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { formatPrice } from "@/utils/formatPrice";
import { cn } from "@/utils/cn";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Admin Dashboard — at-a-glance counts, integration wiring status,
   and a three-step "add a product" cheat-sheet.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

type Counts = {
  productsActive: number;
  productsDraft: number;
  productsArchived: number;
  collections: number;
  subscribers: number;
  paidOrders: number;
  revenue: number;
};

async function loadCounts(): Promise<Counts> {
  const empty: Counts = {
    productsActive: 0,
    productsDraft: 0,
    productsArchived: 0,
    collections: 0,
    subscribers: 0,
    paidOrders: 0,
    revenue: 0,
  };

  if (!isSupabaseAdminConfigured()) return empty;

  try {
    const db = createSupabaseAdminClient();

    const countOf = async (
      table: string,
      filter?: { col: string; val: string }
    ): Promise<number> => {
      let q = db.from(table).select("*", { count: "exact", head: true });
      if (filter) q = q.eq(filter.col, filter.val);
      const { count } = await q;
      return count ?? 0;
    };

    const [
      productsActive,
      productsDraft,
      productsArchived,
      collections,
      subscribers,
      paidOrders,
    ] = await Promise.all([
      countOf("itg_products", { col: "status", val: "active" }),
      countOf("itg_products", { col: "status", val: "draft" }),
      countOf("itg_products", { col: "status", val: "archived" }),
      countOf("itg_collections"),
      countOf("itg_subscribers"),
      countOf("itg_orders", { col: "status", val: "paid" }),
    ]);

    const { data: paid } = await db
      .from("itg_orders")
      .select("amount_total")
      .eq("status", "paid");
    const revenue = (paid ?? []).reduce(
      (sum, o: { amount_total: number }) => sum + Number(o.amount_total ?? 0),
      0
    );

    return {
      productsActive,
      productsDraft,
      productsArchived,
      collections,
      subscribers,
      paidOrders,
      revenue,
    };
  } catch (e) {
    console.warn("[intheGno] dashboard counts failed:", e);
    return empty;
  }
}

type Integration = {
  name: string;
  live: boolean;
  hint: string;
};

export default async function AdminDashboardPage() {
  const counts = await loadCounts();

  const integrations: Integration[] = [
    {
      name: "supabase (cms db)",
      live: isSupabaseAdminConfigured(),
      hint: "add SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      name: "cloudflare r2 (files)",
      live: isR2Configured(),
      hint: "add R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY",
    },
    {
      name: "stripe (all checkout)",
      live: isStripeConfigured(),
      hint: "add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET",
    },
    {
      name: "resend (newsletter)",
      live: isResendConfigured(),
      hint: "add RESEND_API_KEY",
    },
    {
      name: "printify (apparel fulfillment)",
      live: isPrintifyConfigured(),
      hint: "add PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID (optional — manual until then)",
    },
  ];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          inthe<span className={styles.accent}>Gno</span> dashboard
        </h1>
        <p className={styles.subtitle}>the whole operation, one screen</p>
      </header>

      {/* ── COUNTS ─────────────────────────────────────────────── */}
      <section>
        <p className={styles.sectionLabel}>at a glance</p>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{counts.productsActive}</span>
            <span className={styles.statLabel}>active products</span>
            <span className={styles.statSub}>
              {counts.productsDraft} draft · {counts.productsArchived} archived
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{counts.collections}</span>
            <span className={styles.statLabel}>collections</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{counts.subscribers}</span>
            <span className={styles.statLabel}>subscribers</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{counts.paidOrders}</span>
            <span className={styles.statLabel}>paid orders</span>
            <span className={styles.statSub}>
              {formatPrice({
                amount: String(counts.revenue),
                currencyCode: "USD",
              })}{" "}
              gross
            </span>
          </div>
        </div>
      </section>

      {/* ── INTEGRATION STATUS ─────────────────────────────────── */}
      <section>
        <p className={styles.sectionLabel}>integration status</p>
        <div className={styles.integrations}>
          {integrations.map((it) => (
            <div key={it.name} className={styles.integration}>
              <span
                className={cn(styles.dot, it.live ? styles.dotLive : styles.dotOff)}
                aria-hidden="true"
              />
              <span className={styles.integrationName}>{it.name}</span>
              {it.live ? (
                <span className={styles.integrationStatus}>live</span>
              ) : (
                <span className={styles.integrationHint}>{it.hint}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CHEAT SHEET ────────────────────────────────────────── */}
      <section>
        <p className={styles.sectionLabel}>quick start</p>
        <PipeFrame bg="var(--surface-elevated)">
          <div className={styles.cheatInner}>
            <span className={styles.cheatTitle}>adding a product</span>
            <ol className={styles.steps}>
              <li className={styles.step}>
                make sure a collection exists (or create one), then hit “new
                product”
              </li>
              <li className={styles.step}>
                fill basics + pricing + story, save it once to mint an id
              </li>
              <li className={styles.step}>
                upload images and (for digital) deliverable files, then set
                status to active
              </li>
            </ol>
            <div className={styles.cheatActions}>
              <Link href="/admin/products/new" className={styles.cheatLink}>
                new product →
              </Link>
              <Link href="/admin/collections/new" className={styles.cheatLink}>
                new collection →
              </Link>
            </div>
          </div>
        </PipeFrame>
      </section>
    </main>
  );
}
