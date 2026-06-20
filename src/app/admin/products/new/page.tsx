import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ItgCollectionRow } from "@/types/database";
import { ProductForm } from "../ProductForm";

/* ═══════════════════════════════════════════════════════════════════
   New Product — thin shell. Loads all collections for the picker and
   hands a null product to the shared ProductForm.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("itg_collections")
    .select("id, slug, title, sort_order")
    .order("sort_order", { ascending: true });

  const collections = (data ?? []) as Pick<
    ItgCollectionRow,
    "id" | "slug" | "title" | "sort_order"
  >[];

  return (
    <ProductForm
      product={null}
      assets={[]}
      collections={collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
      }))}
    />
  );
}
