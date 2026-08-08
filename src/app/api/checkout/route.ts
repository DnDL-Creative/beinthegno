import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getCart } from "@/lib/cart";
import { getProductByHandle, getPurchasability } from "@/lib/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { SITE_URL, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import type { CartLine } from "@/types/cart";

export const runtime = "nodejs";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
}

const SHIP_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "IE", "NZ"];

// Shipping. The product page advertises "Free shipping on orders over $75",
// but checkout previously charged the flat rate on EVERY physical order —
// a published promise the customer was never given. These two constants are
// now the single source of truth for both the charge and the on-site copy
// (see FREE_SHIPPING_THRESHOLD in src/lib/constants.ts).
const FLAT_SHIPPING_CENTS = 600;

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

  // ── SERVER-SIDE PURCHASABILITY GATE ────────────────────────────────
  // The product page disables the buy button for unpurchasable items, but
  // that is UI only: the cart cookie is client-controlled and add-to-cart
  // accepts any active handle. Without this check a digital/bundle product
  // with ZERO deliverable files could be paid for and deliver nothing.
  // Re-run the SAME getPurchasability the UI uses, against fresh catalog
  // data, so an asset deleted after add-to-cart is caught too.
  const blocked: string[] = [];
  for (const line of cart.lines) {
    const fresh = await getProductByHandle(line.handle);
    if (!fresh || !getPurchasability(fresh).canBuy) {
      blocked.push(line.title);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      blocked.push(line.title);
    }
  }
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: `Not available right now: ${[...new Set(blocked)].join(
          ", "
        )}. Please remove ${blocked.length > 1 ? "them" : "it"} from your cart.`,
      },
      { status: 400 }
    );
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

  const { error: itemsErr } = await db.from("itg_order_items").insert(
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

  // Without line items the order can never be fulfilled (fulfillPaidOrder
  // reads them to find physical goods), so bail BEFORE taking money.
  if (itemsErr) {
    console.error("[intheGno] Failed to create order items:", itemsErr);
    await db.from("itg_orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

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

  // Physical goods → collect a shipping address + a shipping rate.
  // Honors the advertised free-shipping threshold instead of charging the
  // flat rate on every order.
  if (cart.hasPhysical) {
    const freeShipping =
      FREE_SHIPPING_THRESHOLD !== null && cart.subtotal >= FREE_SHIPPING_THRESHOLD;

    params.shipping_address_collection = { allowed_countries: SHIP_COUNTRIES };
    params.shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: freeShipping ? "Free shipping" : "Standard shipping",
          fixed_amount: {
            amount: freeShipping ? 0 : FLAT_SHIPPING_CENTS,
            currency: cart.currency.toLowerCase(),
          },
        },
      },
    ];
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(params);
  } catch (e) {
    // Don't leave an orphan pending order behind a failed session.
    console.error("[intheGno] Stripe session create failed:", e);
    await db.from("itg_order_items").delete().eq("order_id", order.id);
    await db.from("itg_orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "Could not reach checkout. Please try again." },
      { status: 502 }
    );
  }

  // Bind the order to the real session id. The webhook looks orders up by
  // this id, so a silent failure here would strand a paid order — log it.
  // (markOrderPaidFromSession also falls back to metadata.itg_order_id.)
  const { error: bindErr } = await db
    .from("itg_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);
  if (bindErr) {
    console.error(
      `[intheGno] Failed to bind session ${session.id} to order ${order.id}:`,
      bindErr
    );
  }

  return NextResponse.json({ url: session.url });
}
