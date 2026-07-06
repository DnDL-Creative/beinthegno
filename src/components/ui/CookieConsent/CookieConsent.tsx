"use client";

import { useState, useEffect } from "react";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import styles from "./CookieConsent.module.css";

/* ═══════════════════════════════════════════════════════════════════
   CookieConsent — GDPR/CCPA compliant cookie banner.

   Stores consent as a cookie for 180 days (GDPR legal max ~6 months).
   Wrapped in PipeFrame for the copper pipe aesthetic.
   ═══════════════════════════════════════════════════════════════════ */

const COOKIE_NAME = "gnothyself_consent";
const MAX_AGE_DAYS = 180;

function getConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setConsent(value: "accepted" | "declined") {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const c = getConsent();
    if (c === "accepted" || c === "declined") {
      // returning visitor — mirror their choice into the gate the chat widget reads
      try { localStorage.setItem("cookie_consent", c); } catch { /* storage blocked */ }
      if (c === "accepted") window.dispatchEvent(new Event("cookie-consent-changed"));
      return;
    }
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  // Mirror the consent into localStorage "cookie_consent" (+ fire an event) so
  // the gated chat widget (TawkChat) reacts immediately, no reload.
  const record = (value: "accepted" | "declined") => {
    setConsent(value);
    try { localStorage.setItem("cookie_consent", value); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event("cookie-consent-changed"));
    setVisible(false);
  };

  const handleAccept = () => record("accepted");
  const handleDecline = () => record("declined");

  return (
    <div className={styles.wrapper} role="dialog" aria-label="Cookie consent">
      <PipeFrame className={styles.banner} bg="hsl(38, 28%, 88%)">
        <div className={styles.inner}>
          <p className={styles.text}>
            We use cookies to enhance your experience. By continuing to visit
            this site you agree to our use of cookies.{" "}
            <a href="/privacy" className={styles.link}>
              Privacy Policy
            </a>
          </p>
          <div className={styles.actions}>
            <button onClick={handleAccept} className={styles.accept}>
              Accept
            </button>
            <button onClick={handleDecline} className={styles.decline}>
              Decline
            </button>
          </div>
        </div>
      </PipeFrame>
    </div>
  );
}
