import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every portal page is per-user and rendered at request time, so we use the
  // classic dynamic rendering model rather than Cache Components.
  cacheComponents: false,
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
