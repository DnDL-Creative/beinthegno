import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Physical goods ship from Ohio via USPS in 5-7 business days. Digital goods don't ship at all — downloads are instant.",
};

export default function ShippingPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>Shipping &amp; Returns</h1>
        <p className={styles.updated}>Last updated: June 11, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Digital products</h2>
          <p>
            Nothing ships. Digital products are delivered instantly on-screen the
            moment your payment clears, and the same download links appear on your
            download page. Links stay valid for{" "}
            <strong>30 days</strong> — grab your files within that window and
            they&apos;re yours to keep. No box, no tracking number, no waiting by
            the mailbox.
          </p>
          <p>
            Trouble downloading? Reach out through our{" "}
            <Link href="/contact">contact page</Link> and we&apos;ll sort it out.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Shipping (physical goods)</h2>
          <p>
            The policy below applies only to physical goods — apparel, copper,
            orgone, and the rest.
          </p>
          <ul>
            <li>All orders ship from Ohio.</li>
            <li>Standard shipping: 5-7 business days.</li>
            <li>We ship USPS unless otherwise noted.</li>
            <li>Tracking is provided for every order.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Returns (physical goods)</h2>
          <p>
            If something arrives damaged or wrong, we&apos;ll make it right.
            Email us within 14 days of delivery at{" "}
            <a href="mailto:dm@inthegno.com">dm@inthegno.com</a>{" "}
            with your order number and a photo.
          </p>
          <p>
            We don&apos;t do returns on apparel unless it&apos;s defective.
            We&apos;re a small operation. Every shirt is printed with intent.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>International</h2>
          <p>
            International shipping is available for physical goods. Rates and
            delivery times vary by destination. Customs fees are the buyer&apos;s
            responsibility. For international payment options including bank
            transfers, visit{" "}
            <a href="https://dndlcreative.com" target="_blank" rel="noopener noreferrer">
              dndlcreative.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
