import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getCart } from "@/lib/cart";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/constants";
import type { CartLine } from "@/types/cart";

export const runtime = "nodejs";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
}

const SHIP_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "IE", "NZ"];

/** "Size: M · Color: Black" for line display. */
function optionsLabel(options: Record<string, string>): string {
  const parts = Object.keys(options)
    .sort()
    .map((k) => `${k}: ${options[k]}`);
  return parts.join(" · ");
}

/**
 * Build a Stripe Checkout Session from the cookie cart (digital +
 * physical in one order). Creates a pending itg_orders row + line items;
 * the Stripe webhook flips it to paid, releases digital download tokens,
 * and submits physical lines to Printify.
 *
 * POST (no body) → { url }  (redirect the browser there)
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Checkout isn't wired up yet. Add STRIPE_SECRET_KEY." },
      { status: 503 }
    );
  }

  const cart = await getCart();
  if (cart.lines.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Pending order + items (authoritative prices from the catalog).
  const { data: order, error: orderErr } = await db
    .from("itg_orders")
    .insert({
      amount_total: cart.subtotal,
      currency: cart.currency,
      status: "pending",
      stripe_session_id: `pending_${crypto.randomUUID()}`,
    })
    .select("id")
    .single<{ id: string }>();

  if (orderErr || !order) {
    console.error("[intheGno] Failed to create order:", orderErr);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  await db.from("itg_order_items").insert(
    cart.lines.map((l: CartLine) => ({
      order_id: order.id,
      product_id: l.productId,
      title: Object.keys(l.options).length
        ? `${l.title} — ${optionsLabel(l.options)}`
        : l.title,
      unit_amount: l.unitPrice,
      quantity: l.quantity,
    }))
  );

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.lines.map(
    (l) => ({
      quantity: l.quantity,
      price_data: {
        currency: l.currency.toLowerCase(),
        unit_amount: Math.round(l.unitPrice * 100),
        product_data: {
          name: l.title,
          ...(Object.keys(l.options).length
            ? { description: optionsLabel(l.options) }
            : {}),
          ...(l.image ? { images: [l.image] } : {}),
        },
      },
    })
  );

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    metadata: { itg_order_id: order.id },
    success_url: `${siteUrl()}/downloads/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/cart?canceled=1`,
  };

  // Physical goods → collect a shipping address + a flat shipping rate.
  if (cart.hasPhysical) {
    params.shipping_address_collection = { allowed_countries: SHIP_COUNTRIES };
    params.shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard shipping",
          fixed_amount: { amount: 600, currency: cart.currency.toLowerCase() },
        },
      },
    ];
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(params);

  // Bind the order to the real session id.
  await db
    .from("itg_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  return NextResponse.json({ url: session.url });
}
