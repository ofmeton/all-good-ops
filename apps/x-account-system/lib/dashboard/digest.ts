/**
 * Daily Digest (PR-D)
 *
 * 21:00 JST に当日 KPI を集計し、LINE で送信する。
 * Phase 0.5 では LINE_DRY_RUN=true で stdout 代替、cron は手動 `npm run digest:cli`。
 *
 * SSoT: main-design-all-versions.md §A-4 Daily Digest 因果連鎖
 *
 * env:
 *   LINE_CHANNEL_ACCESS_TOKEN   送信用 token
 *   LINE_USER_ID_OFMETON        宛先 (ofmeton 単独)
 *   LINE_DRY_RUN=true           stdout 代替
 *   IN_MEMORY_FALLBACK=true     Supabase 呼ばず in-memory
 *
 * CLI 使用:
 *   npm run digest:cli                  当日 KPI を集計し送信
 *   npm run digest:cli -- --dry-run     強制 stdout 代替
 */
import "dotenv/config";
import { collectKpis, makeProductionDeps, toJstDateString } from "./kpi-collector.ts";
import type { DigestPayload, KpiSnapshot } from "./types.ts";

const DEFAULT_TO = process.env.LINE_USER_ID_OFMETON ?? "<LINE_USER_ID_OFMETON unset>";

/**
 * KpiSnapshot を LINE 送信用 markdown 風 text にフォーマット。
 * SSoT §A-4 「PCR / impressions / 当日 / 7日 / alert / next-action」レイアウト
 */
export function formatDigest(kpi: KpiSnapshot, to: string = DEFAULT_TO): DigestPayload {
  const lines: string[] = [];
  lines.push(`📊 ofmeton Daily Digest ${kpi.date}`);
  lines.push("");
  lines.push("◆ 当日");
  lines.push(`  投稿数: ${kpi.posts_today}`);
  lines.push(`  インプ: ${kpi.impressions_today.toLocaleString()}`);
  lines.push(`  URLクリック: ${kpi.url_link_clicks_today.toLocaleString()}`);
  lines.push(`  PCR: ${formatPcr(kpi.pcr_today)}`);
  lines.push("");
  lines.push("◆ 7 日累計");
  lines.push(`  PCR平均: ${formatPcr(kpi.pcr_7d_avg)}`);
  lines.push(`  インプ合計: ${kpi.impressions_7d_sum.toLocaleString()}`);
  lines.push("");
  lines.push("◆ コスト");
  lines.push(`  当月累計: ¥${kpi.cost_jpy_mtd.toLocaleString()}`);
  lines.push(`  brownout: ${kpi.brownout ? "🔴 ON (投稿停止 / 計測継続)" : "✅ OFF"}`);
  lines.push(`  kill-switch: ${kpi.kill_switch_on ? "🔴 ON (48h 全停止)" : "✅ OFF"}`);

  if (kpi.alerts.length > 0) {
    lines.push("");
    lines.push("⚠️ Alerts");
    for (const a of kpi.alerts) {
      const icon = a.severity === "critical" ? "🔴" : a.severity === "warn" ? "🟡" : "ℹ️";
      lines.push(`  ${icon} [${a.rule_id}] ${a.message}`);
    }
  }

  lines.push("");
  lines.push("◆ next-action");
  lines.push(nextActionLine(kpi));

  return {
    date: kpi.date,
    text: lines.join("\n"),
    to,
    meta: {
      brownout: kpi.brownout,
      kill_switch_on: kpi.kill_switch_on,
      alert_count: kpi.alerts.length,
    },
  };
}

function formatPcr(p: number | null): string {
  if (p === null) return "—";
  return `${(p * 100).toFixed(3)}%`;
}

function nextActionLine(kpi: KpiSnapshot): string {
  if (kpi.kill_switch_on) return "  kill-switch 復帰 (48h 経過 or !resume)";
  if (kpi.brownout) return "  月初リセット or 手動復帰の判断";
  if (kpi.posts_today === 0) return "  当日投稿 0 件 — Writer / Editor 実行を確認";
  if (kpi.pcr_today !== null && kpi.pcr_today < 0.005) {
    return "  PCR 低調 (< 0.5%) — Hook 戦略の review 検討";
  }
  return "  通常運用継続";
}

/**
 * LINE Messaging API で digest を送信。
 * LINE_DRY_RUN=true (or IN_MEMORY_FALLBACK=true) では stdout 出力のみ。
 */
export async function sendToLine(payload: DigestPayload): Promise<{ status: "sent" | "dry_run" }> {
  const isDry = process.env.LINE_DRY_RUN === "true" || process.env.IN_MEMORY_FALLBACK === "true";
  if (isDry) {
    console.log(`[LINE DRY-RUN] to=${payload.to} message:\n${payload.text}\n`);
    return { status: "dry_run" };
  }
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("[digest] LINE_CHANNEL_ACCESS_TOKEN unset, falling back to dry-run");
    console.log(`[LINE DRY-RUN] to=${payload.to} message:\n${payload.text}\n`);
    return { status: "dry_run" };
  }
  const axiosMod = await import("axios");
  const axios = axiosMod.default ?? axiosMod;
  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    { to: payload.to, messages: [{ type: "text", text: payload.text }] },
    {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 5000,
    },
  );
  return { status: "sent" };
}

/**
 * 統合エントリ。cron / CLI から呼ぶ。
 */
export async function runDailyDigest(args: {
  now?: Date;
  deps?: Parameters<typeof collectKpis>[0]["deps"];
  to?: string;
}): Promise<{ payload: DigestPayload; sendResult: Awaited<ReturnType<typeof sendToLine>> }> {
  const now = args.now ?? new Date();
  const deps = args.deps ?? makeProductionDeps();
  const kpi = await collectKpis({ now, deps });
  const payload = formatDigest(kpi, args.to ?? DEFAULT_TO);
  const sendResult = await sendToLine(payload);
  return { payload, sendResult };
}

// ---------------------------------------------------------------------------
// CLI (npm run digest:cli)
// ---------------------------------------------------------------------------
async function cli() {
  const argv = process.argv.slice(2);
  if (argv.includes("--dry-run")) {
    process.env.LINE_DRY_RUN = "true";
  }
  const now = new Date();
  const { payload, sendResult } = await runDailyDigest({ now });
  console.log(
    JSON.stringify(
      {
        date: toJstDateString(now),
        send_status: sendResult.status,
        meta: payload.meta,
      },
      null,
      2,
    ),
  );
}

// CLI 実行判定 (ts-jest CommonJS 互換: require.main、tsx ESM: 別 entry を推奨)
const isDirectRun =
  typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;

if (isDirectRun) {
  cli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
