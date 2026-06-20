import type { Metadata } from "next";
import { PipeButton } from "@/components/ui/PipeButton/PipeButton";
import styles from "../coming-soon.module.css";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          inthe<span className={styles.accent}>Gno</span> offline
        </h1>
        <p className={styles.message}>
          you&apos;re off the grid. fitting, honestly. reconnect and we&apos;ll be right here.
        </p>
        <PipeButton href="/">try again</PipeButton>
      </div>
    </main>
  );
}
