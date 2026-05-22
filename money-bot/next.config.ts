import { join } from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = join(process.cwd(), "..");

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: [
    "@anthropic-ai/claude-agent-sdk",
    "@anthropic-ai/sdk",
    "@line/bot-sdk",
    "@supabase/supabase-js",
    "workflow",
    "@workflow/ai",
  ],
  outputFileTracingIncludes: {
    "/api/cron/daily-publish": [".claude/**"],
  },
};

export default config;
