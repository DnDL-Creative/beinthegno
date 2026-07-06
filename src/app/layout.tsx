import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono, Outfit } from "next/font/google";
import { CookieConsent } from "@/components/ui/CookieConsent/CookieConsent";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import TawkChat from "@/components/TawkChat";
import "./globals.css";

/* ── FONT LOADING ────────────────────────────────────────────────── */

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  display: "swap",
});

/* ── METADATA ────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: "intheGno — Stay Grounded",
    template: "%s | intheGno",
  },
  description:
    "Tools for the spiritually autonomous. Copper, orgone, EMF protection, and apparel for those who question everything.",
  metadataBase: new URL("https://beinthegno.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://beinthegno.com",
    siteName: "intheGno",
    title: "intheGno — Stay Grounded",
    description:
      "Tools for the spiritually autonomous. Copper, orgone, EMF protection, and apparel for those who question everything.",
    images: [
      {
        url: "https://media.beinthegno.com/branding/og-default.png",
        width: 1200,
        height: 630,
        alt: "intheGno — Stay Grounded",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "intheGno — Stay Grounded",
    description:
      "Tools for the spiritually autonomous. Copper, orgone, EMF protection, and apparel.",
    images: [
      "https://media.beinthegno.com/branding/og-default.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "intheGno",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(25, 75%, 47%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(220, 15%, 12%)" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/* ── ROOT LAYOUT ─────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable} ${outfit.variable}`}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <SiteNav />
        {children}
        <SiteFooter />
        <CookieConsent />
        <ServiceWorkerRegistrar />
        {/* Site-wide live chat (intheGno tawk.to property). IDs are public — they
            ship in the embed script — so hardcoded like CineSonic / Blue Flag. */}
        <TawkChat propertyId="6a4aff094b956a1d4cbbd766" widgetId="1jsqf8ev6" />
      </body>
    </html>
  );
}
