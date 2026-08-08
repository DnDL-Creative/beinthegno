import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules. Digital downloads, physical goods, a personal-use license, and one very straight-faced wellness disclaimer.",
};

export default function TermsPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: June 11, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The basics</h2>
          <p>
            By using this site or purchasing from intheGno, you agree to these
            terms. intheGno is operated by DnDL Creative LLC. For full legal and
            company information, visit{" "}
            <a href="https://dndlcreative.com" target="_blank" rel="noopener noreferrer">
              dndlcreative.com
            </a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Digital products</h2>
          <p>
            Buy a digital product and your download links appear instantly,
            on-screen, the moment payment clears. The same links also land on
            your download page. Those links stay valid for{" "}
            <strong>30 days</strong> — download your files within that window and
            they&apos;re yours to keep, forever, on your own devices.
          </p>
          <p>
            Because digital goods are delivered immediately and can&apos;t be
            un-downloaded, <strong>all digital sales are final</strong>, except
            where a refund is required by law. If a file won&apos;t download or
            arrives broken, that&apos;s on us — reach out through our{" "}
            <Link href="/contact">contact page</Link> and we&apos;ll fix it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Physical goods</h2>
          <p>
            Our physical products — apparel, copper goods, orgone, EMF protection
            — are sold as-is. We make no medical claims; these are physical
            objects rooted in historical and esoteric use, and we&apos;re
            transparent about that. Do your own research.
          </p>
          <p>
            Checkout runs through Stripe for everything we sell. When the
            physical line is live, apparel is printed and fulfilled by
            Printify. Shipping, returns, and delivery times are covered on our{" "}
            <Link href="/shipping">shipping &amp; returns</Link> page.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pricing &amp; availability</h2>
          <p>
            Prices, products, and availability are subject to change without
            notice. We do our best to keep everything accurate, but if a price or
            listing is obviously wrong, we reserve the right to correct it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Intellectual property</h2>
          <p>
            All content, designs, branding, copy, audio, and downloadable files
            on this site are owned by DnDL Creative LLC. When you buy a digital
            product, you get a <strong>personal-use license</strong>: enjoy it
            yourself, on your own devices, as much as you like. You may not
            redistribute, resell, share, sublicense, or otherwise hand the files
            to anyone else. If you want to collaborate or license something
            properly, reach out.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Wellness disclaimer</h2>
          <p>
            Our meditation and audio sessions are offered for educational and
            self-development purposes only. They are <strong>not medical or
            psychological advice</strong>, and they are not a diagnosis,
            treatment, or cure for any condition. They are not a substitute for
            professional therapy, counseling, or medical care.
          </p>
          <p>
            <strong>
              Never use our audio sessions while driving, operating machinery, or
              doing anything else that requires your full attention.
            </strong>{" "}
            They are intended for use in a safe, settled environment where it is
            fine to close your eyes and let go.
          </p>
          <p>
            If you are experiencing a mental-health crisis, or you&apos;re in any
            danger, please stop and seek help from a qualified professional or
            emergency services. We are makers of contemplative media, not your
            care team.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Payments</h2>
          <p>
            All purchases, digital and physical, are processed securely through
            Stripe. We never store your full card details.
            For billing inquiries and broader financial terms, refer to{" "}
            <a href="https://dndlcreative.com" target="_blank" rel="noopener noreferrer">
              dndlcreative.com
            </a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitation of liability</h2>
          <p>
            We are not responsible for how you use our products. We sell physical
            goods and digital media. What you do with them is your business —
            within the bounds of the license and the disclaimer above.
          </p>
        </section>
      </div>
    </main>
  );
}
