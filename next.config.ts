import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Photos are uploaded straight to Supabase Storage from the browser, so
      // actions only carry form fields.
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
