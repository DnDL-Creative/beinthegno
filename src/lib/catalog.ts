/* ═══════════════════════════════════════════════════════════════════
   Catalog — storefront read path for the custom CMS.

   Reads itg_collections / itg_products / itg_product_assets and maps
   rows into clean app types. Uses the service-role client when
   available (needed to count paid deliverables, whose rows are hidden
   from anon by RLS) and never exposes deliverable R2 keys.

   Cached with unstable_cache under the "itg-catalog" tag; admin
   server actions call revalidateTag("itg-catalog") on every write.
   ═══════════════════════════════════════════════════════════════════ */

import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ItgCollectionRow,
  ItgProductRow,
  ItgProductAssetRow,
} from "@/types/database";
import type {
  CatalogCollection,
  CatalogProduct,
  CatalogAsset,
  ProductImage,
  ProductOptionGroup,
  Purchasability,
} from "@/types/catalog";
import { publicUrl } from "./r2";
import { isStripeConfigured } from "./stripe";

export const CATALOG_TAG = "itg-catalog";
const CATALOG_REVALIDATE = 300;

/** Server-side read client: service role if present, anon otherwise. */
function getReadClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("[intheGno] Missing Supabase environment variables.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ── ROW MAPPERS ─────────────────────────────────────────────────── */

function mapCollection(row: ItgCollectionRow): CatalogCollection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    navLabel: row.nav_label,
    tagline: row.tagline,
    description: row.description,
    kind: row.kind,
    badge: row.badge,
    sortOrder: row.sort_order,
    showInNav: row.show_in_nav,
    published: row.published,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function mapAsset(row: ItgProductAssetRow): CatalogAsset {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    isPreview: row.is_preview,
    sortOrder: row.sort_order,
    // Previews live under the public previews/ prefix; deliverable
    // keys must never leave the server.
    ...(row.is_preview ? { url: publicUrl(row.r2_key) } : {}),
  };
}

function mapProduct(
  row: ItgProductRow,
  assets: ItgProductAssetRow[],
  collectionSlug?: string,
  collectionNavLabel?: string
): CatalogProduct {
  const previews = assets.filter((a) => a.is_preview);
  const deliverables = assets.filter((a) => !a.is_preview);
  return {
    id: row.id,
    handle: row.handle,
    collectionId: row.collection_id,
    collectionSlug,
    collectionNavLabel,
    title: row.title,
    subtitle: row.subtitle,
    descriptionHtml: row.description_html,
    productType: row.product_type,
    status: row.status,
    badge: row.badge,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    currency: row.currency,
    images: asArray<ProductImage>(row.images),
    options: asArray<ProductOptionGroup>(row.options),
    features: asArray<string>(row.features),
    requiresShipping: row.requires_shipping,
    featured: row.featured,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    previewAssets: previews
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapAsset),
    deliverableCount: deliverables.length,
  };
}

async function fetchAssetsFor(
  db: SupabaseClient,
  productIds: string[]
): Promise<Map<string, ItgProductAssetRow[]>> {
  const byProduct = new Map<string, ItgProductAssetRow[]>();
  if (productIds.length === 0) return byProduct;
  const { data } = await db
    .from("itg_product_assets")
    .select("*")
    .in("product_id", productIds);
  for (const row of (data ?? []) as ItgProductAssetRow[]) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }
  return byProduct;
}

/* ── PUBLIC API (cached) ─────────────────────────────────────────── */

/** All published collections, ordered. Nav filters on showInNav. */
export const getCollections = unstable_cache(
  async (): Promise<CatalogCollection[]> => {
    try {
      const db = getReadClient();
      const { data, error } = await db
        .from("itg_collections")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as ItgCollectionRow[]).map(mapCollection);
    } catch (e) {
      console.warn("[intheGno] getCollections failed:", e);
      return [];
    }
  },
  ["itg-collections"],
  { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE }
);

/** One published collection with its active products (assets included). */
export const getCollectionWithProducts = unstable_cache(
  async (
    slug: string
  ): Promise<{ collection: CatalogCollection; products: CatalogProduct[] } | null> => {
    try {
      const db = getReadClient();
      const { data: col, error: colErr } = await db
        .from("itg_collections")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (colErr) throw colErr;
      if (!col) return null;

      const { data: prods, error: prodErr } = await db
        .from("itg_products")
        .select("*")
        .eq("collection_id", col.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (prodErr) throw prodErr;

      const rows = (prods ?? []) as ItgProductRow[];
      const assets = await fetchAssetsFor(db, rows.map((r) => r.id));
      const collection = mapCollection(col as ItgCollectionRow);
      return {
        collection,
        products: rows.map((r) =>
          mapProduct(r, assets.get(r.id) ?? [], collection.slug, collection.navLabel)
        ),
      };
    } catch (e) {
      console.warn(`[intheGno] getCollectionWithProducts(${slug}) failed:`, e);
      return null;
    }
  },
  ["itg-collection-products"],
  { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE }
);

/** One active product by handle, with its collection slug. */
export const getProductByHandle = unstable_cache(
  async (handle: string): Promise<CatalogProduct | null> => {
    try {
      const db = getReadClient();
      const { data: row, error } = await db
        .from("itg_products")
        .select("*, itg_collections(slug, nav_label)")
        .eq("handle", handle)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;

      const { itg_collections: rel, ...product } = row as ItgProductRow & {
        itg_collections: { slug: string; nav_label: string } | null;
      };
      const assets = await fetchAssetsFor(db, [product.id]);
      return mapProduct(product, assets.get(product.id) ?? [], rel?.slug, rel?.nav_label);
    } catch (e) {
      console.warn(`[intheGno] getProductByHandle(${handle}) failed:`, e);
      return null;
    }
  },
  ["itg-product-by-handle"],
  { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE }
);

/* ── PURCHASABILITY ──────────────────────────────────────────────── */

/**
 * Can this product be bought right now? Everything checks out through
 * Stripe; physical goods fulfill via Printify after payment.
 * - digital → needs at least one deliverable file
 * - any     → needs Stripe env keys
 */
export function getPurchasability(product: CatalogProduct): Purchasability {
  if (product.status !== "active") {
    return { canBuy: false, reason: "archived" };
  }

  if (product.productType === "digital" && product.deliverableCount === 0) {
    return { canBuy: false, reason: "no-files" };
  }

  if (!isStripeConfigured()) {
    return { canBuy: false, reason: "not-wired" };
  }

  return { canBuy: true, via: "stripe" };
}
