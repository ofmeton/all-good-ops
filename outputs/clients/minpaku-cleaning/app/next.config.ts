import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical は Node 専用ライブラリで、バンドルすると BigInt 等が壊れる
  // （Turbopack で `s.BigInt is not a function`）。外部化してランタイム require させる。
  serverExternalPackages: ["node-ical"],
  // lucide-react は ~1700 アイコンを含むため tree-shaking 必須。
  // Next.js が自動で per-icon import に書き換えてくれる。
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
