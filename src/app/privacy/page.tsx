import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How we handle your data. No tracking pixels, no retargeting ads, no selling your information.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: June 11, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who we are</h2>
          <p>
            intheGno is a brand operated by DnDL Creative LLC. For all legal,
            payment, and company matters, visit{" "}
            <a href="https://dndlcreative.com" target="_blank" rel="noopener noreferrer">
              dndlcreative.com
            </a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we collect</h2>
          <p>
            We try to collect as little as possible. Specifically:
          </p>
          <ul>
            <li>
              <strong>Order email.</strong> When you buy something, we keep the
              email tied to your order so we can send you receipts, download
              links, and fulfillment updates.
            </li>
            <li>
              <strong>Newsletter email.</strong> If you sign up for the
              newsletter, we store that email so we can send you the occasional
              observation. Nothing more.
            </li>
            <li>
              <strong>A cart cookie.</strong> A single functional cookie,{" "}
              <code>itg_cart_id</code>, remembers your cart between page loads.
              That is its entire purpose.
            </li>
            <li>
              <strong>Your cookie choice.</strong> When you accept or decline our
              cookie banner, that preference is stored in your own browser so we
              stop asking. We do not collect it on a server.
            </li>
          </ul>
          <p>
            Payment card details are handled directly by our payment processors.
            We never see or store your full card number.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who processes your data</h2>
          <p>
            We rely on a short list of trusted service providers to run the
            shop. Each sees only what it needs to do its job:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — our database, where orders and
              newsletter signups live.
            </li>
            <li>
              <strong>Stripe</strong> — checkout and payments for everything we
              sell, digital and physical.
            </li>
            <li>
              <strong>Printify</strong> — printing and fulfillment of apparel,
              once that line is live.
            </li>
            <li>
              <strong>Cloudflare R2</strong> — storage and delivery of digital
              files.
            </li>
            <li>
              <strong>Vercel</strong> — hosting for this website.
            </li>
            <li>
              <strong>Resend</strong> — sending the newsletter.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we don&apos;t do</h2>
          <ul>
            <li>We don&apos;t sell your personal data. Not to anyone. Ever.</li>
            <li>We don&apos;t run invasive tracking or retargeting ads.</li>
            <li>
              We don&apos;t send marketing emails unless you opt in, and you can
              opt out anytime.
            </li>
            <li>No Facebook pixel. No Google Analytics. No third-party
            analytics cookies. We genuinely do not care about your browsing
            habits.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Retention</h2>
          <p>
            We keep digital purchase records — the order, the email, and what was
            bought — for as long as needed to support your downloads, honor
            refunds, and meet our tax and accounting obligations. Newsletter
            emails are kept until you unsubscribe.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your choices</h2>
          <p>
            You can unsubscribe from the newsletter at any time using the link in
            any newsletter email. Want a copy of what we hold, or want it
            deleted? Reach out through our{" "}
            <Link href="/contact">contact page</Link> and we&apos;ll take care of
            it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p>
            Questions about your data? Get in touch via our{" "}
            <Link href="/contact">contact page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
