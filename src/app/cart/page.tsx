import type { Metadata } from "next";
import { getCart } from "@/lib/cart";
import { PipeButton } from "@/components/ui/PipeButton/PipeButton";
import { CartLines } from "./CartLines";
import comingSoon from "../coming-soon.module.css";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Cart — cookie cart line items → Stripe Checkout.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your intheGno cart.",
};

export default async function CartPage() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <main className={comingSoon.main}>
        <div className={comingSoon.content}>
          <h1 className={comingSoon.title}>
            inthe<span className={comingSoon.accent}>Gno</span> Cart
          </h1>
          <p className={comingSoon.message}>nothing in the vessel yet.</p>
          <PipeButton href="/healing">browse heal &amp; succeed</PipeButton>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>
          inthe<span className={styles.accent}>Gno</span> Cart
        </h1>
      </header>
      <CartLines cart={cart} />
    </main>
  );
}
