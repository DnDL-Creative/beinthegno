/* ═══════════════════════════════════════════════════════════════════
   Printify — print-on-demand fulfillment for physical goods.
   Server-side only. All-Stripe model: Stripe takes the payment, then
   this submits the print order to Printify.

   Until PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID are set, fulfillment is a
   logged no-op (so you can run physical orders manually from the
   Printify dashboard). Wire the key and orders auto-submit.

   Printify variant ids live in itg_products.metadata.printify, e.g.
     { "printify": { "blueprint_id": 5, "print_provider_id": 1,
                     "variants": { "Size:M|Color:Black": 17887 } } }
   ═══════════════════════════════════════════════════════════════════ */

const PRINTIFY_API = "https://api.printify.com/v1";

export function isPrintifyConfigured(): boolean {
  return Boolean(process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID);
}

export type PrintifyLineItem = {
  variantId: number;
  quantity: number;
};

export type PrintifyAddress = {
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

/**
 * Submit a print order. Returns the Printify order id, or null when the
 * integration isn't configured yet (caller should fall back to manual
 * fulfillment). Throws only on a real API error.
 */
export async function createPrintifyOrder(input: {
  externalId: string;
  lineItems: PrintifyLineItem[];
  address: PrintifyAddress;
}): Promise<string | null> {
  if (!isPrintifyConfigured()) {
    console.log(
      `[intheGno] Printify not configured — fulfill order ${input.externalId} manually:`,
      JSON.stringify(input.lineItems)
    );
    return null;
  }
  if (input.lineItems.length === 0) return null;

  const res = await fetch(
    `${PRINTIFY_API}/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        external_id: input.externalId,
        line_items: input.lineItems.map((l) => ({
          variant_id: l.variantId,
          quantity: l.quantity,
          // print_areas/blueprint are resolved by Printify from a synced
          // product; for fully custom orders extend this payload.
        })),
        shipping_method: 1,
        send_shipping_notification: true,
        address_to: input.address,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`[intheGno] Printify ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}
