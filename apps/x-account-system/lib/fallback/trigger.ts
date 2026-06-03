/**
 * Fallback Trigger (v10.2 §10.3 / CR-1)
 *
 * X 障害 / shadowban / OAuth blocked 検知時に owned channel に切替える判定 + 通知 skeleton。
 *
 * CLI 実行: npm run fallback:dry-run (trigger-cli.ts 経由)
 *
 * このモジュールは node:fs / js-yaml / dotenv を一切使わず Cloudflare Worker で import 可能。
 */
import { FALLBACK_CONFIG } from "./channels-data";
import type { FallbackConfig } from "./channels-data";

export type { FallbackConfig };

export function loadFallbackConfig(): FallbackConfig {
  return FALLBACK_CONFIG;
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
