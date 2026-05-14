import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
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
