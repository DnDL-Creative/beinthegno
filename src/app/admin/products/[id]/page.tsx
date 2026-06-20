import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ItgProductRow, ItgProductAssetRow, ItgCollectionRow } from "@/types/database";
import { ProductForm } from "../ProductForm";

/* ═══════════════════════════════════════════════════════════════════
   Edit Product — fetches the product row, its assets, and all
   collections via the admin client, then renders the shared ProductForm.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Product",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();

  const { data: product } = await db
    .from("itg_products")
    .select("*")
    .eq("id", id)
    .maybeSingle<ItgProductRow>();

  if (!product) notFound();

  const { data: assetData } = await db
    .from("itg_product_assets")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });
  const assets = (assetData ?? []) as ItgProductAssetRow[];

  const { data: colData } = await db
    .from("itg_collections")
    .select("id, slug, title, sort_order")
    .order("sort_order", { ascending: true });
  const collections = (colData ?? []) as Pick<
    ItgCollectionRow,
    "id" | "slug" | "title" | "sort_order"
  >[];

  return (
    <ProductForm
      product={product}
      assets={assets}
      collections={collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
      }))}
    />
  );
}
