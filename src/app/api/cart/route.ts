import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";

export const runtime = "nodejs";

/**
 * Lightweight cart summary for the nav badge.
 * Client-side fetch keeps catalog pages fully static/ISR.
 */
export async function GET() {
  const cart = await getCart();
  return NextResponse.json(
    { totalQuantity: cart.count },
    { headers: { "Cache-Control": "no-store" } }
  );
}
