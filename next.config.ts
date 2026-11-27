import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ["192.168.56.1", "localhost:3000"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
