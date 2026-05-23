import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@anthropic-ai/claude-agent-sdk",
    "@anthropic-ai/sdk",
    "@line/bot-sdk",
    "@supabase/supabase-js",
    "workflow",
    "@workflow/ai",
  ],
};

export default config;
