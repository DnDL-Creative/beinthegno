import type { Metadata } from "next";
import { PipeButton } from "@/components/ui/PipeButton/PipeButton";
import styles from "./not-found.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Not Found — branded 404.
   ═══════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "404 — Lost the Thread",
  description: "This pipe leads nowhere. Happens to the best of us.",
};

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          inthe<span className={styles.accent}>Gno</span> 404
        </h1>
        <p className={styles.message}>
          this pipe leads nowhere. happens to the best of us.
        </p>
        <PipeButton href="/">back to ground</PipeButton>
      </div>
    </main>
  );
}
