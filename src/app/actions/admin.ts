"use server";

/* ═══════════════════════════════════════════════════════════════════
   Admin Server Actions — the write path for the custom CMS.

   Every action authorizes first (getAdminUser), writes via the
   service-role client, and revalidates the catalog cache tag so the
   storefront reflects the change immediately.

   Returns plain { ok, error?, id? } objects — never throws raw.
   ═══════════════════════════════════════════════════════════════════ */

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { CATALOG_TAG } from "@/lib/catalog";
import { deleteObject } from "@/lib/r2";
import type {
  ProductImage,
  ProductOptionGroup,
  ProductType,
  ProductStatus,
  CollectionKind,
  AssetKind,
} from "@/types/catalog";
import type { ItgProductAssetRow } from "@/types/database";

export type AdminActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

/* ── VALIDATION ──────────────────────────────────────────────────── */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Slugs that collide with existing routes / reserved namespaces. */
const RESERVED = new Set([
  "about",
  "blog",
  "cart",
  "contact",
  "privacy",
  "terms",
  "shipping",
  "admin",
  "login",
  "downloads",
  "api",
]);

const PRODUCT_TYPES: ReadonlySet<ProductType> = new Set<ProductType>([
  "physical",
  "digital",
  "service",
  "bundle",
  "other",
]);
const PRODUCT_STATUSES: ReadonlySet<ProductStatus> = new Set<ProductStatus>([
  "draft",
  "active",
  "archived",
]);
const COLLECTION_KINDS: ReadonlySet<CollectionKind> = new Set<CollectionKind>([
  "physical",
  "digital",
  "mixed",
]);
const ASSET_KINDS: ReadonlySet<AssetKind> = new Set<AssetKind>([
  "audio",
  "text",
  "pdf",
  "video",
  "archive",
  "image",
  "other",
]);

/* ── COLLECTIONS ─────────────────────────────────────────────────── */

export type SaveCollectionInput = {
  id?: string;
  slug: string;
  title: string;
  navLabel: string;
  tagline: string;
  description: string;
  kind: CollectionKind;
  badge: string;
  sortOrder: number;
  showInNav: boolean;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
};

export async function saveCollection(
  input: SaveCollectionInput
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };

  const slug = input.slug?.trim().toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "slug must be lowercase letters, numbers and dashes",
    };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, error: `"${slug}" is a reserved slug` };
  }
  if (!input.title?.trim()) {
    return { ok: false, error: "title is required" };
  }
  if (!COLLECTION_KINDS.has(input.kind)) {
    return { ok: false, error: "invalid collection kind" };
  }

  const db = createSupabaseAdminClient();
  const row = {
    slug,
    title: input.title.trim(),
    nav_label: (input.navLabel || input.title).trim(),
    tagline: input.tagline ?? "",
    description: input.description ?? "",
    kind: input.kind,
    badge: input.badge ?? "",
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    show_in_nav: Boolean(input.showInNav),
    published: Boolean(input.published),
    seo_title: input.seoTitle ?? "",
    seo_description: input.seoDescription ?? "",
  };

  try {
    if (input.id) {
      const { error } = await db
        .from("itg_collections")
        .update(row)
        .eq("id", input.id);
      if (error) return { ok: false, error: friendly(error.message) };
      revalidateTag(CATALOG_TAG, "max");
      return { ok: true, id: input.id };
    }

    const { data, error } = await db
      .from("itg_collections")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[intheGno] saveCollection failed:", e);
    return { ok: false, error: "couldn't save the collection" };
  }
}

export async function deleteCollection(
  id: string
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };
  if (!id) return { ok: false, error: "missing id" };

  try {
    const db = createSupabaseAdminClient();
    const { error } = await db.from("itg_collections").delete().eq("id", id);
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] deleteCollection failed:", e);
    return { ok: false, error: "couldn't delete the collection" };
  }
}

/* ── PRODUCTS ────────────────────────────────────────────────────── */

export type SaveProductInput = {
  id?: string;
  handle: string;
  collectionId: string | null;
  title: string;
  subtitle: string;
  descriptionHtml: string;
  productType: ProductType;
  status: ProductStatus;
  badge: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: ProductImage[];
  options: ProductOptionGroup[];
  features: string[];
  requiresShipping: boolean;
  featured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  priceNote: string;
};

export async function saveProduct(
  input: SaveProductInput
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };

  const handle = input.handle?.trim().toLowerCase() ?? "";
  if (!SLUG_RE.test(handle)) {
    return {
      ok: false,
      error: "handle must be lowercase letters, numbers and dashes",
    };
  }
  if (!input.title?.trim()) {
    return { ok: false, error: "title is required" };
  }
  if (!PRODUCT_TYPES.has(input.productType)) {
    return { ok: false, error: "invalid product type" };
  }
  if (!PRODUCT_STATUSES.has(input.status)) {
    return { ok: false, error: "invalid product status" };
  }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "price must be zero or more" };
  }

  let compareAt: number | null = null;
  if (input.compareAtPrice !== null && input.compareAtPrice !== undefined) {
    const cmp = Number(input.compareAtPrice);
    if (!Number.isFinite(cmp) || cmp < 0) {
      return { ok: false, error: "compare-at price must be zero or more" };
    }
    compareAt = cmp;
  }

  const db = createSupabaseAdminClient();

  const row = {
    handle,
    collection_id: input.collectionId || null,
    title: input.title.trim(),
    subtitle: input.subtitle ?? "",
    description_html: input.descriptionHtml ?? "",
    product_type: input.productType,
    status: input.status,
    badge: input.badge ?? "",
    price,
    compare_at_price: compareAt,
    currency: (input.currency || "USD").trim().toUpperCase(),
    images: Array.isArray(input.images) ? input.images : [],
    options: Array.isArray(input.options) ? input.options : [],
    features: Array.isArray(input.features) ? input.features : [],
    requires_shipping: Boolean(input.requiresShipping),
    featured: Boolean(input.featured),
    sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    seo_title: input.seoTitle ?? "",
    seo_description: input.seoDescription ?? "",
    metadata: { price_note: input.priceNote ?? "" },
  };

  try {
    if (input.id) {
      const { error } = await db
        .from("itg_products")
        .update(row)
        .eq("id", input.id);
      if (error) return { ok: false, error: friendly(error.message) };
      revalidateTag(CATALOG_TAG, "max");
      return { ok: true, id: input.id };
    }

    const { data, error } = await db
      .from("itg_products")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[intheGno] saveProduct failed:", e);
    return { ok: false, error: "couldn't save the product" };
  }
}

export async function deleteProduct(id: string): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };
  if (!id) return { ok: false, error: "missing id" };

  try {
    const db = createSupabaseAdminClient();

    // Purge R2 objects before deleting rows (assets cascade on delete).
    const { data: assets } = await db
      .from("itg_product_assets")
      .select("r2_key")
      .eq("product_id", id);

    for (const asset of (assets ?? []) as Pick<ItgProductAssetRow, "r2_key">[]) {
      try {
        await deleteObject(
          asset.r2_key,
          asset.r2_key.startsWith("digital/") ? "digital" : "public"
        );
      } catch (e) {
        // Don't block product deletion on a stray object.
        console.warn("[intheGno] deleteProduct: R2 delete failed:", e);
      }
    }

    const { error } = await db.from("itg_products").delete().eq("id", id);
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] deleteProduct failed:", e);
    return { ok: false, error: "couldn't delete the product" };
  }
}

/* ── PRODUCT ASSETS (digital files / previews) ───────────────────── */

export type CreateAssetInput = {
  productId: string;
  kind: AssetKind;
  label: string;
  r2Key: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  isPreview: boolean;
  sortOrder: number;
};

export async function createAsset(
  input: CreateAssetInput
): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };

  if (!input.productId) return { ok: false, error: "missing product id" };
  if (!input.r2Key) return { ok: false, error: "missing file key" };
  if (!ASSET_KINDS.has(input.kind)) {
    return { ok: false, error: "invalid asset kind" };
  }

  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from("itg_product_assets")
      .insert({
        product_id: input.productId,
        kind: input.kind,
        label: input.label ?? "",
        r2_key: input.r2Key,
        file_name: input.fileName ?? "",
        content_type: input.contentType ?? "",
        size_bytes: Number.isFinite(input.sizeBytes) ? input.sizeBytes : 0,
        duration_seconds:
          input.durationSeconds === undefined ? null : input.durationSeconds,
        is_preview: Boolean(input.isPreview),
        sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[intheGno] createAsset failed:", e);
    return { ok: false, error: "couldn't save the file" };
  }
}

export async function deleteAsset(id: string): Promise<AdminActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "unauthorized" };
  if (!id) return { ok: false, error: "missing id" };

  try {
    const db = createSupabaseAdminClient();
    const { data: row } = await db
      .from("itg_product_assets")
      .select("r2_key")
      .eq("id", id)
      .maybeSingle<Pick<ItgProductAssetRow, "r2_key">>();

    if (row?.r2_key) {
      try {
        await deleteObject(
          row.r2_key,
          row.r2_key.startsWith("digital/") ? "digital" : "public"
        );
      } catch (e) {
        console.warn("[intheGno] deleteAsset: R2 delete failed:", e);
      }
    }

    const { error } = await db
      .from("itg_product_assets")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, error: friendly(error.message) };
    revalidateTag(CATALOG_TAG, "max");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] deleteAsset failed:", e);
    return { ok: false, error: "couldn't delete the file" };
  }
}

/* ── HELPERS ─────────────────────────────────────────────────────── */

/** Turn the most common Postgres errors into a human message. */
function friendly(message: string): string {
  if (/duplicate key|unique/i.test(message)) {
    return "that slug/handle is already in use";
  }
  return message;
}
