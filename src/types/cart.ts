/* ═══════════════════════════════════════════════════════════════════
   Cart Types — all-Stripe cookie cart.
   The cart cookie holds only minimal line refs; full product data is
   hydrated server-side from the catalog at read time.
   ═══════════════════════════════════════════════════════════════════ */

import type { ProductType } from "./catalog";

/** Stored in the `itg_cart` cookie. */
export type CartLineInput = {
  handle: string;
  options: Record<string, string>;
  quantity: number;
};

/** Hydrated line for display + checkout. */
export type CartLine = {
  lineId: string;
  productId: string;
  handle: string;
  title: string;
  subtitle: string;
  options: Record<string, string>;
  image: string | null;
  unitPrice: number;
  currency: string;
  quantity: number;
  lineTotal: number;
  productType: ProductType;
  requiresShipping: boolean;
};

export type Cart = {
  lines: CartLine[];
  subtotal: number;
  currency: string;
  count: number;
  /** True if any line ships a physical good (drives address collection). */
  hasPhysical: boolean;
};
