import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// デモ録画専用。ローカル Supabase を指す .env.demo を読み込む（本番 .env.local は使わない）。
const parsed = loadEnv({ path: ".env.demo" }).parsed ?? {};

export default defineConfig({
  testDir: "./e2e",
  testMatch: /demo-record\.spec\.ts/,
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  outputDir: "./demo-output",
  use: {
    baseURL: "http://localhost:3200",
    viewport: { width: 1280, height: 800 },
    video: { mode: "on", size: { width: 1280, height: 800 } },
    launchOptions: { slowMo: 350 },
  },
  webServer: {
    command: "npm run dev -- --port 3200",
    url: "http://localhost:3200",
    timeout: 180_000,
    reuseExistingServer: false,
    // dev サーバにローカル Supabase の env を注入（Next.js は既存 process.env を上書きしない）
    env: parsed as Record<string, string>,
  },
});
