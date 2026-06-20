/* ═══════════════════════════════════════════════════════════════════
   Cart — all-Stripe cookie cart. Server-side.

   The `itg_cart` cookie stores a minimal list of line refs
   ({ handle, options, quantity }); full product data (price, title,
   image, type) is hydrated from the catalog at read time so prices can
   never be tampered with client-side. Checkout builds a Stripe Checkout
   Session from the hydrated cart.
   ═══════════════════════════════════════════════════════════════════ */

import { cookies } from "next/headers";
import { getProductByHandle } from "./catalog";
import type { CartLineInput, CartLine, Cart } from "@/types/cart";

const CART_COOKIE = "itg_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_QTY = 20;

/** Stable id for a line: handle + its selected options. */
export function lineKey(handle: string, options: Record<string, string>): string {
  const opt = Object.keys(options)
    .sort()
    .map((k) => `${k}:${options[k]}`)
    .join("|");
  return opt ? `${handle}::${opt}` : handle;
}

async function readCookie(): Promise<CartLineInput[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l): l is CartLineInput =>
          l && typeof l.handle === "string" && typeof l.quantity === "number"
      )
      .map((l) => ({
        handle: l.handle,
        options: l.options && typeof l.options === "object" ? l.options : {},
        quantity: Math.max(1, Math.min(MAX_QTY, Math.floor(l.quantity))),
      }));
  } catch {
    return [];
  }
}

async function writeCookie(lines: CartLineInput[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}

/** Raw cookie lines — no hydration. Used by mutations. */
export async function getCartLines(): Promise<CartLineInput[]> {
  return readCookie();
}

/** Hydrated cart for display + checkout. Drops lines whose product is
 *  missing or no longer active. */
export async function getCart(): Promise<Cart> {
  const stored = await readCookie();
  const lines: CartLine[] = [];
  let subtotal = 0;
  let currency = "USD";
  let hasPhysical = false;

  for (const input of stored) {
    const product = await getProductByHandle(input.handle);
    if (!product) continue;

    const unitPrice = product.price;
    const lineTotal = unitPrice * input.quantity;
    subtotal += lineTotal;
    currency = product.currency || currency;
    const requiresShipping =
      product.productType === "physical" || product.requiresShipping;
    if (requiresShipping) hasPhysical = true;

    lines.push({
      lineId: lineKey(input.handle, input.options),
      productId: product.id,
      handle: input.handle,
      title: product.title,
      subtitle: product.subtitle,
      options: input.options,
      image: product.images[0]?.url ?? null,
      unitPrice,
      currency: product.currency,
      quantity: input.quantity,
      lineTotal,
      productType: product.productType,
      requiresShipping,
    });
  }

  return {
    lines,
    subtotal,
    currency,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    hasPhysical,
  };
}

/** Add (or increment) a line. */
export async function addItem(
  handle: string,
  options: Record<string, string>,
  quantity = 1
): Promise<void> {
  const lines = await readCookie();
  const key = lineKey(handle, options);
  const existing = lines.find((l) => lineKey(l.handle, l.options) === key);
  if (existing) {
    existing.quantity = Math.min(MAX_QTY, existing.quantity + quantity);
  } else {
    lines.push({ handle, options, quantity: Math.min(MAX_QTY, quantity) });
  }
  await writeCookie(lines);
}

/** Set a line's quantity (<=0 removes it). */
export async function setQty(lineId: string, quantity: number): Promise<void> {
  let lines = await readCookie();
  if (quantity <= 0) {
    lines = lines.filter((l) => lineKey(l.handle, l.options) !== lineId);
  } else {
    const line = lines.find((l) => lineKey(l.handle, l.options) === lineId);
    if (line) line.quantity = Math.min(MAX_QTY, quantity);
  }
  await writeCookie(lines);
}

/** Remove a line. */
export async function removeItem(lineId: string): Promise<void> {
  const lines = (await readCookie()).filter(
    (l) => lineKey(l.handle, l.options) !== lineId
  );
  await writeCookie(lines);
}

/** Empty the cart (after successful checkout). */
export async function clearCart(): Promise<void> {
  await writeCookie([]);
}
