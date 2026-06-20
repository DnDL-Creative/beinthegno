"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./admin-layout.module.css";

/* ═══════════════════════════════════════════════════════════════════
   SignOutButton — clears the Supabase session, then bounces to /login.
   Styled to read as a plain admin-bar link.
   ═══════════════════════════════════════════════════════════════════ */

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // Even on failure, send them to the gate.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={styles.signOut}
      onClick={handleSignOut}
      disabled={busy}
    >
      {busy ? "signing out…" : "sign out"}
    </button>
  );
}
