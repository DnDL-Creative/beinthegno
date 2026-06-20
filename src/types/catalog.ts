/* ═══════════════════════════════════════════════════════════════════
   Catalog Types — Custom CMS (Supabase itg_ tables)
   These are the app-facing shapes. Raw DB rows are mapped into these
   in lib/catalog.ts; deliverable R2 keys are never exposed here.
   ═══════════════════════════════════════════════════════════════════ */

export type ProductType = "physical" | "digital" | "service" | "bundle" | "other";
export type ProductStatus = "draft" | "active" | "archived";
export type CollectionKind = "physical" | "digital" | "mixed";
export type AssetKind = "audio" | "text" | "pdf" | "video" | "archive" | "image" | "other";

export type ProductImage = {
  url: string;
  alt?: string;
};

export type ProductOptionGroup = {
  name: string;
  values: string[];
};

export type CatalogCollection = {
  id: string;
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

export type CatalogAsset = {
  id: string;
  kind: AssetKind;
  label: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  isPreview: boolean;
  sortOrder: number;
  /** Public URL — only present for preview assets. */
  url?: string;
};

export type CatalogProduct = {
  id: string;
  handle: string;
  collectionId: string | null;
  collectionSlug?: string;
  collectionNavLabel?: string;
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
  metadata: Record<string, unknown>;
  /** Preview assets (public samples). Deliverables are counted, not listed. */
  previewAssets: CatalogAsset[];
  /** Number of paid deliverable files attached (R2 keys stay server-side). */
  deliverableCount: number;
};

/** Whether a product can currently be purchased. Everything checks out
 *  through Stripe; physical goods are fulfilled via Printify after payment. */
export type Purchasability =
  | { canBuy: true; via: "stripe" }
  | { canBuy: false; reason: "coming-soon" | "no-files" | "not-wired" | "archived" };
