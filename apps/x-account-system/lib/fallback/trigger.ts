/**
 * Fallback Trigger (v10.2 §10.3 / CR-1)
 *
 * X 障害 / shadowban / OAuth blocked 検知時に owned channel に切替える判定 + 通知 skeleton。
 *
 * 使い方:
 *   tsx lib/fallback/trigger.ts --dry-run            # 通知 payload を stdout
 *   tsx lib/fallback/trigger.ts --check=x_rate_limit # 特定の trigger を評価
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { load } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type FallbackConfig = {
  primary: { platform: string; account: string };
  fallbacks: Array<{
    name: string;
    type: string;
    description: string;
    target_subscribers?: number;
    domain?: string;
    cost_jpy_per_month: number;
    setup_steps: string[];
  }>;
  triggers: Record<
    string,
    {
      description: string;
      detection: string;
      action: string;
      human_notification: boolean;
      cooldown_min?: number;
    }
  >;
  recovery: { resume_x_after_minutes: number; manual_resume_only: string[] };
};

export function loadFallbackConfig(): FallbackConfig {
  const path = join(__dirname, "..", "..", "config", "fallback_channels.yaml");
  const raw = readFileSync(path, "utf-8");
  return load(raw) as FallbackConfig;
}

export type TriggerEvent = {
  type: keyof FallbackConfig["triggers"];
  detected_at: string;
  signal: Record<string, unknown>;
};

/**
 * 切替判定: trigger を評価 → fallback 先のリストと action / 通知 payload を返す。
 */
export function evaluateTrigger(cfg: FallbackConfig, ev: TriggerEvent) {
  const trig = cfg.triggers[ev.type as string];
  if (!trig) {
    return { triggered: false, reason: `unknown trigger type: ${ev.type}` };
  }
  const fallbackTargets =
    trig.action.startsWith("switch_to_") || trig.action === "switch_to_all_owned_channels"
      ? cfg.fallbacks.map((f) => f.name)
      : [];

  return {
    triggered: true,
    trigger_type: ev.type,
    description: trig.description,
    action: trig.action,
    fallbackTargets,
    human_notification: trig.human_notification,
    detected_at: ev.detected_at,
    signal: ev.signal,
    manual_resume_only: cfg.recovery.manual_resume_only.includes(String(ev.type)),
    line_payload: trig.human_notification
      ? {
          channel: "line",
          to: process.env.LINE_USER_ID_OFMETON ?? "<unset>",
          message:
            `⚠️ Fallback triggered: ${String(ev.type)}\n` +
            `${trig.description}\n` +
            `action: ${trig.action}\n` +
            `fallbacks: ${fallbackTargets.join(", ") || "none"}\n` +
            `manual_resume_required: ${cfg.recovery.manual_resume_only.includes(String(ev.type))}`,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
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
