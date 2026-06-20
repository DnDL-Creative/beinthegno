"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CatalogProduct, Purchasability } from "@/types/catalog";
import { addToCartAction } from "@/app/actions/cart";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import styles from "./ProductPurchase.module.css";

/* ═══════════════════════════════════════════════════════════════════
   ProductPurchase — add-to-cart controls for a single product.

   All-Stripe model: every product (physical or digital) adds to the
   cookie cart and checks out via Stripe. Physical goods are fulfilled
   through Printify after payment. Option pills (size / color) are passed
   to the cart as selected options.

   getPurchasability() is server-only; the resolved value is passed in.
   ═══════════════════════════════════════════════════════════════════ */

const DISABLED_LABEL: Record<
  Extract<Purchasability, { canBuy: false }>["reason"],
  string
> = {
  "coming-soon": "coming soon",
  "no-files": "coming soon",
  "not-wired": "checkout coming soon",
  archived: "unavailable",
};

export function ProductPurchase({
  product,
  purchasability,
}: {
  product: CatalogProduct;
  purchasability: Purchasability;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasOptions = product.options.length > 0;

  function selectOption(group: string, value: string) {
    setError(null);
    setAdded(false);
    setSelected((prev) => ({ ...prev, [group]: value }));
  }

  function renderOptions() {
    if (!hasOptions) return null;
    return product.options.map((group) => (
      <div key={group.name} className={styles.optionGroup}>
        <label className={styles.optionLabel}>{group.name}</label>
        <div className={styles.options}>
          {group.values.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.optionBtn}
              aria-pressed={selected[group.name] === value}
              onClick={() => selectOption(group.name, value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    ));
  }

  function handleAdd() {
    setError(null);
    setAdded(false);

    const missing = product.options.find((g) => !selected[g.name]);
    if (missing) {
      setError(`Choose a ${missing.name.toLowerCase()} first.`);
      return;
    }

    startTransition(async () => {
      const res = await addToCartAction(product.handle, selected, 1);
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("itg:cart"));
      } else {
        setError(res.error ?? "Couldn't add to cart. Try again.");
      }
    });
  }

  /* ── NOT PURCHASABLE ─────────────────────────────────────────── */
  if (!purchasability.canBuy) {
    return (
      <div className={styles.purchase}>
        {renderOptions()}
        <PipeFrame className={styles.comingSoonFrame}>
          <span className={styles.comingSoonLabel}>
            {DISABLED_LABEL[purchasability.reason]}
          </span>
        </PipeFrame>
      </div>
    );
  }

  /* ── ADD TO CART (Stripe rail) ───────────────────────────────── */
  return (
    <div className={styles.purchase}>
      {renderOptions()}
      <button
        type="button"
        className={styles.addToCart}
        onClick={handleAdd}
        disabled={pending}
      >
        {pending ? "adding…" : "add to cart"}
      </button>
      {added && (
        <p className={styles.added}>
          added —{" "}
          <Link href="/cart" className={styles.cartLink}>
            view cart →
          </Link>
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
