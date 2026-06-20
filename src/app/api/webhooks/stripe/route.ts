import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markOrderPaidFromSession, fulfillPaidOrder } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Stripe Webhook — authoritative fulfillment for digital orders.
 * Configure in Stripe Dashboard → Developers → Webhooks:
 *   endpoint  https://beinthegno.com/api/webhooks/stripe
 *   events    checkout.session.completed
 * and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[intheGno] Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const order = await markOrderPaidFromSession(session);
    if (order) await fulfillPaidOrder(order.id, session);
  }

  return NextResponse.json({ received: true });
}
