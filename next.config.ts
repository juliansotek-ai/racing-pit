import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth profile pictures
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Scraped horse/race images (add specific hostnames as scrapers are built)
      {
        protocol: "https",
        hostname: "*.galopp.org",
      },
    ],
  },
};

export default nextConfig;
