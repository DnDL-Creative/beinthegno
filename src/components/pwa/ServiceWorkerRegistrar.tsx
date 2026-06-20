"use client";

import { useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Registers the service worker — PRODUCTION ONLY.
   Kept out of dev so local cache behaviour stays predictable.
   ═══════════════════════════════════════════════════════════════════ */

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration failure is non-fatal */
    });
  }, []);

  return null;
}
