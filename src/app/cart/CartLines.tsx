"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Cart, CartLine } from "@/types/cart";
import {
  updateCartLineAction,
  removeCartLineAction,
} from "@/app/actions/cart";
import { formatPrice } from "@/utils/formatPrice";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   CartLines — interactive cookie cart. Quantity steppers and removal
   run as server actions; checkout creates a Stripe Checkout Session and
   redirects there.
   ═══════════════════════════════════════════════════════════════════ */

function money(amount: number, currency: string) {
  return formatPrice({ amount: String(amount), currencyCode: currency });
}

function optionsText(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}: ${options[k]}`)
    .join(" · ");
}

export function CartLines({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingLine, setPendingLine] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [, startTransition] = useTransition();

  function afterAction(ok: boolean, message?: string) {
    if (ok) {
      router.refresh();
      window.dispatchEvent(new Event("itg:cart"));
    } else {
      setError(message ?? "Something went wrong. Try again.");
    }
  }

  function changeQty(line: CartLine, nextQty: number) {
    setError(null);
    setPendingLine(line.lineId);
    startTransition(async () => {
      const res =
        nextQty <= 0
          ? await removeCartLineAction(line.lineId)
          : await updateCartLineAction(line.lineId, nextQty);
      setPendingLine(null);
      afterAction(res.ok, res.error);
    });
  }

  function remove(line: CartLine) {
    setError(null);
    setPendingLine(line.lineId);
    startTransition(async () => {
      const res = await removeCartLineAction(line.lineId);
      setPendingLine(null);
      afterAction(res.ok, res.error);
    });
  }

  async function checkout() {
    setError(null);
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Couldn't start checkout. Try again.");
    } catch {
      setError("Couldn't start checkout. Try again.");
    }
    setCheckingOut(false);
  }

  return (
    <div className={styles.cart}>
      <ul className={styles.lines}>
        {cart.lines.map((line) => {
          const opts = optionsText(line.options);
          const busy = pendingLine === line.lineId;

          return (
            <li key={line.lineId} className={styles.line}>
              <div className={styles.lineImageWrap}>
                {line.image ? (
                  <Image
                    src={line.image}
                    alt={line.title}
                    width={96}
                    height={96}
                    className={styles.lineImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.lineImagePlaceholder} aria-hidden />
                )}
              </div>

              <div className={styles.lineInfo}>
                <span className={styles.lineTitle}>{line.title}</span>
                {opts && <span className={styles.lineVariant}>{opts}</span>}
                <span className={styles.linePrice}>
                  {money(line.unitPrice, line.currency)}
                </span>
              </div>

              <div className={styles.lineControls}>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => changeQty(line, line.quantity - 1)}
                    disabled={busy}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className={styles.qty}>{line.quantity}</span>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => changeQty(line, line.quantity + 1)}
                    disabled={busy}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(line)}
                  disabled={busy}
                >
                  remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <div className={styles.subtotal}>
          <span className={styles.subtotalLabel}>subtotal</span>
          <span className={styles.subtotalAmount}>
            {money(cart.subtotal, cart.currency)}
          </span>
        </div>
        <p className={styles.taxNote}>
          {cart.hasPhysical
            ? "shipping + taxes calculated at checkout"
            : "instant delivery — taxes calculated at checkout"}
        </p>
        <button
          type="button"
          className={styles.checkout}
          onClick={checkout}
          disabled={checkingOut}
        >
          {checkingOut ? "starting checkout…" : "checkout"}
        </button>
      </div>
    </div>
  );
}
