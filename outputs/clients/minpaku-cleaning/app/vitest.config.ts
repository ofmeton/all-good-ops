import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // DB バックのテストは共有のローカル Supabase に対して beforeEach で
    // テーブルを truncate するため、ファイル間並列実行だと相互に干渉する。
    // ファイルは逐次実行する（ファイル内のテストは順次）。
    fileParallelism: false,
    // e2e/ は Playwright で実行する。Vitest が誤って読み込まないよう除外。
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only は Next.js ランタイム専用ガードだが、
      // vitest (jsdom) では常に throw するため空モジュールで差し替える。
      "server-only": path.resolve(__dirname, "./tests/__mocks__/server-only.ts"),
    },
  },
});
