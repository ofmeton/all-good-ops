/**
 * trigger-cli.ts — CLI エントリポイント (Node.js 専用)
 *
 * 使い方:
 *   npm run fallback:dry-run                              # 通知 payload を stdout
 *   tsx lib/fallback/trigger-cli.ts --check=x_rate_limit # 特定の trigger を評価
 */
import "dotenv/config";
import { loadFallbackConfig, evaluateTrigger } from "./trigger";
import type { TriggerEvent } from "./trigger";
import type { FallbackConfig } from "./channels-data";

function arg(name: string): string | null {
  const f = process.argv.find((a) => a.startsWith(`--${name}`));
  if (!f) return null;
  return f.includes("=") ? f.split("=").slice(1).join("=") : "";
}

function dryRun(cfg: FallbackConfig) {
  const samples: TriggerEvent[] = [
    {
      type: "x_suspended",
      detected_at: new Date().toISOString(),
      signal: { api_response: "403 suspended" },
    },
    {
      type: "x_rate_limit_429",
      detected_at: new Date().toISOString(),
      signal: { consecutive_429: 5, window_min: 60 },
    },
    {
      type: "x_shadowban",
      detected_at: new Date().toISOString(),
      signal: { impressions_drop_pct: -72, days: 3 },
    },
    {
      type: "oauth_blocked",
      detected_at: new Date().toISOString(),
      signal: { refresh_status: "invalid_grant" },
    },
  ];
  const reports = samples.map((ev) => evaluateTrigger(cfg, ev));
  console.log(JSON.stringify({ dry_run: true, reports }, null, 2));
}

function main() {
  const cfg = loadFallbackConfig();
  const isDry = arg("dry-run") !== null;
  const checkType = arg("check");

  if (isDry) {
    dryRun(cfg);
    return;
  }
  if (checkType) {
    const ev: TriggerEvent = {
      type: checkType as keyof FallbackConfig["triggers"],
      detected_at: new Date().toISOString(),
      signal: {},
    };
    console.log(JSON.stringify(evaluateTrigger(cfg, ev), null, 2));
    return;
  }
  console.log(JSON.stringify({
    fallbacks: cfg.fallbacks.map((f) => ({ name: f.name, type: f.type })),
    triggers: Object.keys(cfg.triggers),
    note: "use --dry-run to see sample payloads, --check=<trigger_type> to evaluate one",
  }, null, 2));
}

main();
