"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   LoginForm — email + password against Supabase auth.
   On success: push to ?next (or /admin) and refresh so the proxy and
   server components see the new session cookie.
   ═══════════════════════════════════════════════════════════════════ */

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/admin";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(safeNext(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <PipeFrame className={styles.card} bg="var(--surface-elevated)">
      <div className={styles.cardInner}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            inthe<span className={styles.accent}>Gno</span> cms
          </h1>
          <p className={styles.tagline}>authorized personnel only</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              email
            </label>
            <input
              id="login-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              password
            </label>
            <input
              id="login-password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "authenticating…" : "enter"}
          </button>
        </form>
      </div>
    </PipeFrame>
  );
}
