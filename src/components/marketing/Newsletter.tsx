"use client";

import { useId, useState, type FormEvent } from "react";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { cn } from "@/utils/cn";
import styles from "./Newsletter.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Newsletter — compact footer signup.

   Posts to /api/newsletter { email, source: "footer" }. Shows the
   server's message on success, an inline error otherwise. Disables
   while pending and clears the input once you're in.
   ═══════════════════════════════════════════════════════════════════ */

type Status = "idle" | "pending" | "success" | "error";

type NewsletterResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export function Newsletter() {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  const pending = status === "pending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setStatus("pending");
    setFeedback("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });

      const data = (await res.json()) as NewsletterResponse;

      if (res.ok && data.ok) {
        setStatus("success");
        setFeedback(data.message ?? "you're in. stay grounded.");
        setEmail("");
      } else {
        setStatus("error");
        setFeedback(data.error ?? "something went sideways. try again.");
      }
    } catch {
      setStatus("error");
      setFeedback("something went sideways. try again.");
    }
  }

  return (
    <PipeFrame className={styles.frame} bg="var(--pipe-color-bg)">
      <div className={styles.inner}>
        <p className={styles.headline}>stay in the gno</p>
        <p className={styles.subhead}>
          a newsletter that sees you as a human, not a commodity
        </p>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.srOnly} htmlFor={inputId}>
            email address
          </label>
          <input
            id={inputId}
            className={styles.input}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            placeholder="your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={pending}
          />
          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "…" : "subscribe"}
          </button>
        </form>
        {feedback && (
          <p
            className={cn(
              styles.feedback,
              status === "success" && styles.success,
              status === "error" && styles.error
            )}
            role="status"
            aria-live="polite"
          >
            {feedback}
          </p>
        )}
        <p className={styles.assurance}>we&apos;ll never share your data</p>
        <p className={styles.creed}>
          your soul isn&apos;t for sale <span className={styles.creedDot}>•</span> you are
          sovereign
        </p>
      </div>
    </PipeFrame>
  );
}
