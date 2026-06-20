import type { Metadata } from "next";
import { CollectionForm } from "../CollectionForm";

/* ═══════════════════════════════════════════════════════════════════
   New Collection — thin shell around the shared CollectionForm.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Collection",
  robots: { index: false, follow: false },
};

export default function NewCollectionPage() {
  return <CollectionForm collection={null} />;
}
