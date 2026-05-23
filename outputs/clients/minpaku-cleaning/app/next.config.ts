import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lucide-react は ~1700 アイコンを含むため tree-shaking 必須。
  // Next.js が自動で per-icon import に書き換えてくれる。
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
