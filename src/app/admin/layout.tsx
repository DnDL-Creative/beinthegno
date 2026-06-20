import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import styles from "./admin-layout.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Admin Layout — gates the whole /admin tree and renders the admin bar.
   The public SiteNav + SiteFooter still wrap this (from the root
   layout); the obsidian bar makes the CMS context unmistakable.
   ═══════════════════════════════════════════════════════════════════ */

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Redirects logged-out users to /login and non-admins home.
  await requireAdminPage();

  return (
    <>
      <header className={styles.bar}>
        <Link href="/admin" className={styles.brand}>
          inthe<span className={styles.accent}>Gno</span> cms
        </Link>
        <nav className={styles.links}>
          <Link href="/admin" className={styles.link}>
            dashboard
          </Link>
          <span className={styles.pipeSep} aria-hidden="true" />
          <Link href="/admin/products" className={styles.link}>
            products
          </Link>
          <span className={styles.pipeSep} aria-hidden="true" />
          <Link href="/admin/collections" className={styles.link}>
            collections
          </Link>
          <span className={styles.pipeSep} aria-hidden="true" />
          <Link href="/" className={styles.link}>
            view site
          </Link>
          <span className={styles.pipeSep} aria-hidden="true" />
          <SignOutButton />
        </nav>
      </header>
      <div className={styles.content}>{children}</div>
    </>
  );
}
