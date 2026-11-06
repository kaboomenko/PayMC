import type { NextConfig } from "next";

/**
 * PayMC web — concept frontend (landing + owner dashboard).
 * Cache Components are intentionally OFF for now: the concept runs on
 * deterministic mock data and has no backend yet. Re-enable together with
 * the real data layer.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
