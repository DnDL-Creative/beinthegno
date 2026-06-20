import { useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════
   Single, ref-counted body scroll lock. iOS-safe (position:fixed under
   the hood — overflow:hidden alone does NOT stop iOS Safari scrolling
   behind an overlay). Ported from the CineSonic implementation.

   This module is the ONLY writer of document.body.style for locking;
   a module-level counter captures scrollY exactly once (0→1) and
   restores exactly once (last release), so concurrent overlays can't
   corrupt each other.
   ═══════════════════════════════════════════════════════════════════ */

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
} | null = null;

function acquire() {
  if (lockCount === 0 && typeof document !== "undefined") {
    savedScrollY = window.scrollY;
    const b = document.body.style;
    savedStyles = {
      position: b.position,
      top: b.top,
      left: b.left,
      right: b.right,
      width: b.width,
      overflow: b.overflow,
    };
    b.position = "fixed";
    b.top = `-${savedScrollY}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    b.overflow = "hidden";
  }
  lockCount++;
}

function release() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && typeof document !== "undefined" && savedStyles) {
    const b = document.body.style;
    b.position = savedStyles.position;
    b.top = savedStyles.top;
    b.left = savedStyles.left;
    b.right = savedStyles.right;
    b.width = savedStyles.width;
    b.overflow = savedStyles.overflow;
    savedStyles = null;
    window.scrollTo(0, savedScrollY);
  }
}

/** Lock body scroll while `active` is true. Safe across multiple overlays. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquire();
    return release;
  }, [active]);
}
