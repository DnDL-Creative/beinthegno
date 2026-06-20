"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { CartLink } from "./CartLink";
import styles from "./MobileNav.module.css";

/* ═══════════════════════════════════════════════════════════════════
   MobileNav — side drawer, ported from CineSonic's bulletproof design.

   The bug that drove that rebuild: a close-X stacked over the hamburger
   in the same corner, so closing re-hit-tested onto the hamburger and
   reopened. This design makes that IMPOSSIBLE:
     • The hamburger only ever OPENS (top-right).
     • Closing happens via the dark backdrop on the LEFT and a close
       button on the DRAWER's left edge — both far from the hamburger.
     • Plain onClick everywhere. No pointer-event machinery, no fast-tap
       hook, no scroll-lock race.
   ═══════════════════════════════════════════════════════════════════ */

type NavItem = { slug: string; navLabel: string };

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock the page behind the drawer (iOS-safe). Drawer scrolls internally.
  useScrollLock(open);

  return (
    <div className={styles.root}>
      {/* Hamburger — OPENS ONLY. Top-right, its own button, never a toggle. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={styles.hamburger}
      >
        <Menu size={26} />
      </button>

      {/* Overlay layer — inert (pointer-events:none) when closed. */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
        inert={!open}
      >
        {/* Backdrop — tap the dimmed area (mostly the LEFT) to close. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          className={styles.backdrop}
        />

        {/* Drawer — slides in from the right. A copper pipe frame (ends
            and all) traces its full edge. */}
        <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
          <PipeFrame className={styles.drawerFrame} bg="var(--surface-elevated)">
            <div className={styles.drawerInner}>
              {/* Header: close (LEFT edge — far from the hamburger) + wordmark */}
              <div className={styles.drawerHeader}>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className={styles.closeBtn}
                >
                  <X size={20} />
                </button>
                <span className={styles.wordmark}>
                  inthe<span className={styles.accent}>Gno</span>
                </span>
              </div>

              {/* Scrollable links */}
              <nav className={styles.drawerNav}>
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/${item.slug}`}
                    onClick={close}
                    className={styles.drawerLink}
                  >
                    {item.navLabel}
                  </Link>
                ))}
                <CartLink className={styles.drawerLink} showLabel />
              </nav>
            </div>
          </PipeFrame>
        </div>
      </div>
    </div>
  );
}
