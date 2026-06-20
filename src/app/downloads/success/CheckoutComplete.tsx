"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCartAction } from "@/app/actions/cart";
import comingSoon from "../../coming-soon.module.css";

/* Clears the cart, pings the nav badge, then forwards to the order page. */
export function CheckoutComplete({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      await clearCartAction();
      window.dispatchEvent(new Event("itg:cart"));
      if (active) router.replace(href);
    })();
    return () => {
      active = false;
    };
  }, [href, router]);

  return (
    <main className={comingSoon.main}>
      <div className={comingSoon.content}>
        <h1 className={comingSoon.title}>
          inthe<span className={comingSoon.accent}>Gno</span>
        </h1>
        <p className={comingSoon.message}>
          payment received — taking you to your order…
        </p>
      </div>
    </main>
  );
}
