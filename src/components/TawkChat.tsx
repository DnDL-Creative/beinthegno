"use client";

import { useEffect, useState } from "react";

// Tawk.to live-chat embed, GATED behind cookie consent. The script only loads
// once the visitor has accepted cookies (localStorage "cookie_consent" ==
// "accepted"), and it reacts live to the "cookie-consent-changed" event so the
// widget appears the moment they accept — no reload. Pass propertyId/widgetId
// (public — they ship in the embed script) or set NEXT_PUBLIC_TAWK_PROPERTY_ID /
// NEXT_PUBLIC_TAWK_WIDGET_ID. No-ops without a property id OR without consent.
const CONSENT_KEY = "cookie_consent";

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export default function TawkChat({
  propertyId,
  widgetId,
}: {
  propertyId?: string;
  widgetId?: string;
}) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (hasConsent()) { setConsented(true); return; }
    const onChange = () => { if (hasConsent()) setConsented(true); };
    window.addEventListener("cookie-consent-changed", onChange);
    return () => window.removeEventListener("cookie-consent-changed", onChange);
  }, []);

  useEffect(() => {
    if (!consented) return;
    const pid = propertyId || process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const wid = widgetId || process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "default";
    if (!pid) return;
    if (document.getElementById("tawk-to-embed")) return;
    const s = document.createElement("script");
    s.id = "tawk-to-embed";
    s.async = true;
    s.src = `https://embed.tawk.to/${pid}/${wid}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.head.appendChild(s);
  }, [consented, propertyId, widgetId]);

  return null;
}
