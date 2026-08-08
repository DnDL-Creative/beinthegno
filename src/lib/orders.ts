/* ═══════════════════════════════════════════════════════════════════
   Orders — digital purchase fulfillment. Server-side only.
   Shared by the Stripe webhook, the checkout success page, and the
   tokenized download endpoints.
   ═══════════════════════════════════════════════════════════════════ */

import type Stripe from "stripe";
import { createSupabaseAdminClient } from "./supabase-admin";
import {
  isPrintifyConfigured,
  createPrintifyOrder,
  type PrintifyAddress,
} from "./printify";
import type {
  ItgOrderRow,
  ItgOrderItemRow,
  ItgProductAssetRow,
} from "@/types/database";

/** How long download links stay live after purchase. */
const DOWNLOAD_WINDOW_DAYS = 30;

export type OrderFile = {
  assetId: string;
  productTitle: string;
  kind: ItgProductAssetRow["kind"];
  label: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number | null;
};

export type FulfilledOrder = {
  order: ItgOrderRow;
  items: ItgOrderItemRow[];
  files: OrderFile[];
};

/**
 * Mark the order behind a Stripe Checkout Session as paid.
 * Idempotent — safe to call from both the webhook and the success
 * page (whichever runs first wins, the other is a no-op).
 *
 * Returns the order plus `alreadyPaid`, so callers can tell a FIRST
 * transition to paid from a repeat call. Stripe retries/redelivers
 * webhooks, and side effects that cost money (Printify submission) must
 * only run on the first transition.
 *
 * Throws on a DB failure so the webhook can return a non-2xx and let
 * Stripe retry. A missing order row returns null (retrying won't help).
 */
export async function markOrderPaidFromSession(
  session: Stripe.Checkout.Session
): Promise<(ItgOrderRow & { alreadyPaid: boolean }) | null> {
  if (session.payment_status !== "paid") return null;

  const db = createSupabaseAdminClient();
  // Look up by session id, falling back to the order id we stamped into
  // metadata at checkout — covers the case where binding the real session
  // id to the row failed and it is still `pending_<uuid>`.
  const metadataOrderId =
    typeof session.metadata?.itg_order_id === "string"
      ? session.metadata.itg_order_id
      : null;

  let { data: existing } = await db
    .from("itg_orders")
    .select("*")
    .eq("stripe_session_id", session.id)
    .maybeSingle<ItgOrderRow>();

  if (!existing && metadataOrderId) {
    const { data: byId } = await db
      .from("itg_orders")
      .select("*")
      .eq("id", metadataOrderId)
      .maybeSingle<ItgOrderRow>();
    existing = byId ?? null;
  }

  if (!existing) {
    console.warn(`[intheGno] No order row for Stripe session ${session.id}`);
    return null;
  }
  if (existing.status === "paid") return { ...existing, alreadyPaid: true };

  const expires = new Date();
  expires.setDate(expires.getDate() + DOWNLOAD_WINDOW_DAYS);

  const { data: updated, error } = await db
    .from("itg_orders")
    .update({
      status: "paid",
      email: session.customer_details?.email ?? existing.email,
      stripe_payment_intent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? "",
      amount_total: (session.amount_total ?? 0) / 100,
      // Keep the row bound to the real session id even if the checkout-side
      // binding update failed (row would otherwise stay `pending_<uuid>`).
      stripe_session_id: session.id,
      expires_at: expires.toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single<ItgOrderRow>();

  // THROW, don't swallow: the caller (webhook) must fail loudly so Stripe
  // retries. Returning null here silently stranded paid orders as pending.
  if (error || !updated) {
    console.error("[intheGno] Failed to mark order paid:", error);
    throw new Error(
      `Failed to mark order ${existing.id} paid: ${error?.message ?? "no row returned"}`
    );
  }
  return { ...updated, alreadyPaid: false };
}

/**
 * Fulfill the physical items on a paid order via Printify. Until the
 * Printify integration is configured this just logs the items so they
 * can be fulfilled manually from the Printify dashboard. Digital items
 * are delivered separately through the download token.
 */
export async function fulfillPaidOrder(
  orderId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data: items } = await db
    .from("itg_order_items")
    .select("title, quantity, itg_products(product_type)")
    .eq("order_id", orderId);

  // The embedded to-one relation is typed as an array by the client but
  // resolves to a single object at runtime; normalize defensively.
  type ItemRow = {
    title: string;
    quantity: number;
    itg_products: { product_type: string } | { product_type: string }[] | null;
  };
  const rows = (items ?? []) as unknown as ItemRow[];
  const physical = rows.filter((i) => {
    const rel = Array.isArray(i.itg_products) ? i.itg_products[0] : i.itg_products;
    return rel?.product_type === "physical";
  });

  if (physical.length === 0) return;

  if (!isPrintifyConfigured()) {
    console.log(
      `[intheGno] Order ${orderId}: ${physical.length} physical item(s) to fulfill manually —`,
      physical.map((p) => `${p.quantity}x ${p.title}`).join(", ")
    );
    return;
  }

  // Shipping address: newer Stripe API nests it under collected_information.
  const collected = (
    session as unknown as {
      collected_information?: {
        shipping_details?: { name?: string | null; address?: Stripe.Address | null };
      };
    }
  ).collected_information;
  const ship = collected?.shipping_details ?? session.customer_details ?? null;
  const addr = ship?.address;
  if (!addr) {
    console.warn(`[intheGno] Order ${orderId}: paid but no shipping address.`);
    return;
  }

  const [first, ...rest] = (ship?.name ?? "").split(" ");
  const address: PrintifyAddress = {
    first_name: first || "Customer",
    last_name: rest.join(" ") || "-",
    email: session.customer_details?.email ?? "",
    country: addr.country ?? "US",
    region: addr.state ?? "",
    address1: addr.line1 ?? "",
    address2: addr.line2 ?? undefined,
    city: addr.city ?? "",
    zip: addr.postal_code ?? "",
  };

  try {
    // Variant ids come from each product's synced Printify catalog; wire
    // them in itg_products.metadata.printify once products are connected.
    await createPrintifyOrder({
      externalId: orderId,
      lineItems: physical.map((p) => ({ variantId: 0, quantity: p.quantity })),
      address,
    });
  } catch (e) {
    console.error(`[intheGno] Printify fulfillment failed for ${orderId}:`, e);
  }
}

/**
 * Load a paid, unexpired order with its deliverable files.
 * Returns null for unknown tokens, unpaid orders, or expired windows.
 */
export async function getFulfilledOrder(token: string): Promise<FulfilledOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from("itg_orders")
    .select("*")
    .eq("download_token", token)
    .eq("status", "paid")
    .maybeSingle<ItgOrderRow>();

  if (!order) return null;
  if (order.expires_at && new Date(order.expires_at) < new Date()) return null;

  const { data: items } = await db
    .from("itg_order_items")
    .select("*")
    .eq("order_id", order.id);

  const orderItems = (items ?? []) as ItgOrderItemRow[];
  const productIds = orderItems
    .map((i) => i.product_id)
    .filter((id): id is string => Boolean(id));

  let files: OrderFile[] = [];
  if (productIds.length > 0) {
    const { data: assets } = await db
      .from("itg_product_assets")
      .select("*")
      .in("product_id", productIds)
      .eq("is_preview", false)
      .order("sort_order", { ascending: true });

    const titleById = new Map(orderItems.map((i) => [i.product_id, i.title]));
    files = ((assets ?? []) as ItgProductAssetRow[]).map((a) => ({
      assetId: a.id,
      productTitle: titleById.get(a.product_id) ?? "",
      kind: a.kind,
      label: a.label || a.file_name,
      fileName: a.file_name,
      sizeBytes: a.size_bytes,
      durationSeconds: a.duration_seconds,
    }));
  }

  return { order, items: orderItems, files };
}

/**
 * Resolve the R2 key for one asset within a paid order, bumping the
 * download counter. Returns null if the asset isn't part of the order.
 */
export async function resolveOrderAsset(
  token: string,
  assetId: string
): Promise<{ r2Key: string; fileName: string } | null> {
  const fulfilled = await getFulfilledOrder(token);
  if (!fulfilled) return null;
  if (!fulfilled.files.some((f) => f.assetId === assetId)) return null;

  const db = createSupabaseAdminClient();
  const { data: asset } = await db
    .from("itg_product_assets")
    .select("r2_key, file_name")
    .eq("id", assetId)
    .eq("is_preview", false)
    .maybeSingle<{ r2_key: string; file_name: string }>();

  if (!asset) return null;

  await db
    .from("itg_orders")
    .update({ download_count: fulfilled.order.download_count + 1 })
    .eq("id", fulfilled.order.id);

  return { r2Key: asset.r2_key, fileName: asset.file_name };
}
