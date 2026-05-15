import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

// E2E もローカル Supabase / dev サーバの環境変数を読む
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
