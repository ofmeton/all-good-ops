import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "@line/bot-sdk",
    "@supabase/supabase-js",
    "workflow",
    "@workflow/ai",
  ],
};

export default withWorkflow(config);
