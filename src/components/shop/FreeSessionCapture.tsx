"use client";

import { useState } from "react";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import styles from "./FreeSessionCapture.module.css";

/* ═══════════════════════════════════════════════════════════════════
   "Get a free session" capture.

   Posts to the EXISTING newsletter endpoint (/api/newsletter →
   itg_subscribers) with a per-product source so the free-session
   subscribers are distinguishable from footer signups.

   TODO (owner): attach the actual free-session audio file and send it
   on subscribe. The capture is live now; delivery is not wired yet.
   ═══════════════════════════════════════════════════════════════════ */

export function FreeSessionCapture({ handle }: { handle: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `free-session:${handle}` }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error || "Something went wrong. Try again.");
        return;
      }
      setState("done");
      setMessage(data.message || "Check your inbox.");
    } catch {
      setState("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  return (
    <PipeFrame className={styles.frame}>
      <div className={styles.inner}>
        <p className={styles.heading}>get a free session</p>
        <p className={styles.blurb}>
          One guided session, free. No charge, no pitch.
        </p>

        {state === "done" ? (
          <p className={styles.success}>{message}</p>
        ) : (
          <form onSubmit={onSubmit} className={styles.form}>
            <label htmlFor={`free-session-${handle}`} className={styles.srOnly}>
              Email address
            </label>
            <input
              id={`free-session-${handle}`}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              className={styles.input}
              disabled={state === "loading"}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={state === "loading"}
            >
              {state === "loading" ? "sending..." : "send it"}
            </button>
          </form>
        )}

        {state === "error" && <p className={styles.error}>{message}</p>}
      </div>
    </PipeFrame>
  );
}
