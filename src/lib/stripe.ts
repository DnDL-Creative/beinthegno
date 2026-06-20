/* ═══════════════════════════════════════════════════════════════════
   Stripe — digital download checkout. Server-side only.
   Physical goods check out through Shopify; digital meditations and
   other downloadables check out here (no Shopify fees, no app spend).
   ═══════════════════════════════════════════════════════════════════ */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("[intheGno] Missing STRIPE_SECRET_KEY environment variable.");
  }
  if (!_stripe) {
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}
