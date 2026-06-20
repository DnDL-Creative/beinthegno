import Link from "next/link";
import { Newsletter } from "@/components/marketing";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.newsletter}>
        <Newsletter />
      </div>
      <div className={styles.footerLinks}>
        <Link href="/privacy">Privacy Policy</Link>
        <span className={styles.pipeSep} />
        <Link href="/terms">Terms of Service</Link>
        <span className={styles.pipeSep} />
        <Link href="/shipping">Shipping &amp; Returns</Link>
        <span className={styles.pipeSep} />
        <Link href="/contact">Contact</Link>
      </div>
      <p className={styles.footerCopy}>
        © 2026 intheGno — A DnDL Creative LLC Brand. All Rights Reserved.
      </p>
    </footer>
  );
}
