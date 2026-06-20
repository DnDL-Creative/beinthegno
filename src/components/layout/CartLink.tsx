"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/utils/cn";
import styles from "./CartLink.module.css";

/* ═══════════════════════════════════════════════════════════════════
   CartLink — classic cart icon with a live quantity bubble.

   Polls /api/cart on mount, on the custom "itg:cart" event (dispatched
   after any cart mutation), and whenever the tab regains visibility.
   Errors are swallowed so the nav never breaks.

   showLabel — icon + "cart" text (drawer); default icon-only (top nav).
   ═══════════════════════════════════════════════════════════════════ */

export function CartLink({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const data: { totalQuantity?: number } = await res.json();
      setCount(data.totalQuantity ?? 0);
    } catch {
      /* swallow — keep last known count */
    }
  }, []);

  useEffect(() => {
    refresh();

    const onCart = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("itg:cart", onCart);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("itg:cart", onCart);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const ariaLabel =
    count > 0 ? `cart, ${count} item${count === 1 ? "" : "s"}` : "cart";

  return (
    <Link href="/cart" className={cn(styles.cart, className)} aria-label={ariaLabel}>
      <span className={styles.iconWrap}>
        <ShoppingCart size={showLabel ? 20 : 19} strokeWidth={1.75} aria-hidden="true" />
        {count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
      </span>
      {showLabel && <span>cart</span>}
    </Link>
  );
}
