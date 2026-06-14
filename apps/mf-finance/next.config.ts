import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 はネイティブモジュール。サーバーバンドルへ取り込まず外部 require にする
  // （Turbopack/webpack の .node 取込破綻を回避）。
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
