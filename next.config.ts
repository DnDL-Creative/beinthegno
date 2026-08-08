import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.beinthegno.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
  // The Heal & Succeed collection was rebranded to intheGno Innerwork
  // (2026-07-12). /healing was already in the live sitemap, so preserve
  // those URLs permanently rather than 404ing them.
  async redirects() {
    return [
      { source: "/healing", destination: "/innerwork", permanent: true },
      {
        source: "/healing/:handle",
        destination: "/innerwork/:handle",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
