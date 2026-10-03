import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The homepage reads the hero manifest at request time (lib/home/hero-manifest.server.ts).
  outputFileTracingIncludes: {
    "/": ["./public/media/hero/manifest.json"],
    "/admin/pocetna": ["./public/media/hero/manifest.json"],
  },
  async redirects() {
    return [
      {
        source: "/ponuda",
        destination: "/aranzmani",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
