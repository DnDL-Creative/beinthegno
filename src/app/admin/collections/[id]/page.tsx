import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ItgCollectionRow } from "@/types/database";
import { CollectionForm } from "../CollectionForm";

/* ═══════════════════════════════════════════════════════════════════
   Edit Collection — fetches the row (incl. unpublished) via the admin
   client and hands it to the shared CollectionForm.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Collection",
  robots: { index: false, follow: false },
};

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("itg_collections")
    .select("*")
    .eq("id", id)
    .maybeSingle<ItgCollectionRow>();

  if (!data) notFound();

  return <CollectionForm collection={data} />;
}
