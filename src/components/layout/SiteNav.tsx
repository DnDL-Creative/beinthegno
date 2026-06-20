import Link from "next/link";
import Image from "next/image";
import { Fragment } from "react";
import { getCollections } from "@/lib/catalog";
import { CartLink } from "./CartLink";
import { MobileNav } from "./MobileNav";
import styles from "./SiteNav.module.css";

const LOGO_URL = "https://media.beinthegno.com/branding/main-logo.png";

/* Fallback when the catalog is empty / unreachable — the original
   hard-coded four so the nav is never blank. */
const FALLBACK_LINKS: Array<{ slug: string; navLabel: string }> = [
  { slug: "copper", navLabel: "copper" },
  { slug: "apparel", navLabel: "apparel" },
  { slug: "orgone", navLabel: "orgone" },
  { slug: "anti-emf", navLabel: "anti-emf" },
  { slug: "healing", navLabel: "Heal & Succeed" },
];

export async function SiteNav() {
  const collections = await getCollections();
  const navItems =
    collections.length > 0
      ? collections
          .filter((c) => c.showInNav)
          .map((c) => ({ slug: c.slug, navLabel: c.navLabel }))
      : FALLBACK_LINKS;

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.brand}>
        <Image
          src={LOGO_URL}
          alt="intheGno"
          width={120}
          height={40}
          className={styles.logo}
          priority
        />
      </Link>
      <div className={styles.links}>
        {navItems.map((item) => (
          <Fragment key={item.slug}>
            <Link href={`/${item.slug}`}>{item.navLabel}</Link>
            <span className={styles.pipeSep} />
          </Fragment>
        ))}
        <CartLink className={styles.cartLink} />
      </div>

      <MobileNav items={navItems} />
    </nav>
  );
}
