/* ═══════════════════════════════════════════════════════════════════
   Shared / Global Types
   Re-exports and cross-cutting type definitions.
   ═══════════════════════════════════════════════════════════════════ */

export type { Product, ProductVariant, Cart, CartLine, Collection } from "./shopify";
export type { CodexPost, CodexPostPreview, CodexCategory } from "./codex";
export type {
  CatalogCollection,
  CatalogProduct,
  CatalogAsset,
  ProductImage,
  ProductOptionGroup,
  Purchasability,
} from "./catalog";

/** Generic paginated response shape */
export type PaginatedResponse<T> = {
  data: T[];
  hasMore: boolean;
  cursor: string | null;
};

/** Navigation link used across header/footer */
export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
};
