"use server";

/* ═══════════════════════════════════════════════════════════════════
   Cart Server Actions — cookie cart (all-Stripe). Thin wrappers over
   lib/cart with revalidation; never throw raw.
   ═══════════════════════════════════════════════════════════════════ */

import { revalidatePath } from "next/cache";
import { addItem, setQty, removeItem, clearCart } from "@/lib/cart";

export type CartActionResult = { ok: boolean; error?: string };

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    await clearCart();
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] clearCartAction failed:", e);
    return { ok: false };
  }
}

export async function addToCartAction(
  handle: string,
  options: Record<string, string> = {},
  quantity = 1
): Promise<CartActionResult> {
  if (!handle) {
    return { ok: false, error: "Something went wrong. Try again." };
  }
  try {
    await addItem(handle, options, quantity);
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] addToCartAction failed:", e);
    return { ok: false, error: "Couldn't add to cart. Try again." };
  }
}

export async function updateCartLineAction(
  lineId: string,
  quantity: number
): Promise<CartActionResult> {
  try {
    await setQty(lineId, quantity);
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] updateCartLineAction failed:", e);
    return { ok: false, error: "Couldn't update the cart." };
  }
}

export async function removeCartLineAction(
  lineId: string
): Promise<CartActionResult> {
  try {
    await removeItem(lineId);
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    console.error("[intheGno] removeCartLineAction failed:", e);
    return { ok: false, error: "Couldn't remove the item." };
  }
}
