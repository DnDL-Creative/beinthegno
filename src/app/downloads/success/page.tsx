import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markOrderPaidFromSession } from "@/lib/orders";
import { CheckoutComplete } from "./CheckoutComplete";
import comingSoon from "../../coming-soon.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Checkout success — verifies the Stripe session server-side, marks
   the order paid (idempotent with the webhook), then forwards to the
   tokenized download page. Never indexed.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ session_id?: string }>;

export default async function DownloadSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/");

  if (!isStripeConfigured()) {
    return (
      <main className={comingSoon.main}>
        <div className={comingSoon.content}>
          <h1 className={comingSoon.title}>
            inthe<span className={comingSoon.accent}>Gno</span>
          </h1>
          <p className={comingSoon.message}>
            checkout isn&apos;t live yet — nothing was charged.
          </p>
          <span className={comingSoon.badge}>coming soon</span>
        </div>
      </main>
    );
  }

  let downloadToken: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    const order = await markOrderPaidFromSession(session);
    downloadToken = order?.download_token ?? null;
  } catch (e) {
    console.error("[intheGno] download success verification failed:", e);
  }

  // Clears the cart client-side, then forwards to the order/downloads page.
  if (downloadToken) {
    return <CheckoutComplete href={`/downloads/${downloadToken}`} />;
  }

  return (
    <main className={comingSoon.main}>
      <div className={comingSoon.content}>
        <h1 className={comingSoon.title}>
          inthe<span className={comingSoon.accent}>Gno</span>
        </h1>
        <p className={comingSoon.message}>
          payment still processing — refresh in a moment.
        </p>
        <a
          href={`/downloads/success?session_id=${encodeURIComponent(session_id)}`}
          className={comingSoon.backLink}
        >
          refresh
        </a>
      </div>
    </main>
  );
}
