/**
 * KPI collector (PR-D Daily Digest)
 *
 * 当日 + 7 日 + 月初 累計の KPI を Supabase から集計し、KpiSnapshot に詰める。
 *
 * Phase 0.5 fallback (IN_MEMORY_FALLBACK=true) では in-memory の dummy 値を返す。
 * テストでは collectKpis({ now, deps }) の deps を差し替えて検証する。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Alert, KpiSnapshot } from "./types.ts";

const BROWNOUT_THRESHOLD_JPY = Number(
  process.env.BUDGET_BROWNOUT_THRESHOLD_JPY ?? 11500,
);
const MONTHLY_LIMIT_JPY = Number(process.env.BUDGET_MONTHLY_LIMIT_JPY ?? 10000);

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (process.env.IN_MEMORY_FALLBACK === "true") return null;
  if (
    !_supabase &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || "public" } },
    );
  }
  return _supabase;
}

export interface KpiCollectorDeps {
  /** 当月コスト累計 (JPY) を返す。Phase 0.5 では 0. */
  getMonthlyCostJpy?: () => Promise<number>;
  /** kill-switch 状態を返す (publishing_enabled=false なら true). */
  getKillSwitchState?: () => Promise<boolean>;
  /** posted_records から指定期間の {posts, impressions, url_clicks, profile_clicks} を集計. */
  getPostStats?: (since: Date, until: Date) => Promise<PostStats>;
}

export interface PostStats {
  posts: number;
  impressions: number;
  url_link_clicks: number;
  profile_clicks: number;
}

const ZERO_STATS: PostStats = {
  posts: 0,
  impressions: 0,
  url_link_clicks: 0,
  profile_clicks: 0,
};

/**
 * 当日 + 7 日窓を集計して KpiSnapshot を組み立てる。
 * 異常検知 (PCR -30% / impressions -50% / 7 日窓) は rollback-monitor.ts 経由で alert に挿入する想定。
 */
export async function collectKpis(args: {
  now: Date;
  deps?: KpiCollectorDeps;
}): Promise<KpiSnapshot> {
  const { now, deps = {} } = args;
  const date = toJstDateString(now);

  // 当日 0:00 - 24:00 (JST)
  const dayStart = jstStartOfDay(now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // 7 日窓 (now-7d, now)
  const window7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const today = (await deps.getPostStats?.(dayStart, dayEnd)) ?? ZERO_STATS;
  const week = (await deps.getPostStats?.(window7Start, now)) ?? ZERO_STATS;

  const pcr_today = today.impressions > 0 ? round5(today.profile_clicks / today.impressions) : null;
  const pcr_7d_avg = week.impressions > 0 ? round5(week.profile_clicks / week.impressions) : null;

  const cost_jpy_mtd = (await deps.getMonthlyCostJpy?.()) ?? 0;
  const brownout = cost_jpy_mtd >= BROWNOUT_THRESHOLD_JPY;
  const kill_switch_on = (await deps.getKillSwitchState?.()) ?? false;

  const alerts: Alert[] = [];
  if (brownout) {
    alerts.push({
      severity: "critical",
      rule_id: "brownout",
      message: `当月コスト ¥${cost_jpy_mtd.toLocaleString()} が brownout 閾値 ¥${BROWNOUT_THRESHOLD_JPY.toLocaleString()} を超過。投稿停止中 (計測継続)。`,
      value: cost_jpy_mtd,
      threshold: BROWNOUT_THRESHOLD_JPY,
    });
  } else if (cost_jpy_mtd > MONTHLY_LIMIT_JPY) {
    alerts.push({
      severity: "warn",
      rule_id: "monthly_limit",
      message: `当月コスト ¥${cost_jpy_mtd.toLocaleString()} が月予算 ¥${MONTHLY_LIMIT_JPY.toLocaleString()} を超過 (まだ brownout 前)。`,
      value: cost_jpy_mtd,
      threshold: MONTHLY_LIMIT_JPY,
    });
  }
  if (kill_switch_on) {
    alerts.push({
      severity: "critical",
      rule_id: "kill_switch",
      message: `kill-switch 発動中 (LINE !stop による 48h 全停止)。`,
    });
  }

  return {
    date,
    posts_today: today.posts,
    impressions_today: today.impressions,
    url_link_clicks_today: today.url_link_clicks,
    pcr_today,
    pcr_7d_avg,
    impressions_7d_sum: week.impressions,
    brownout,
    kill_switch_on,
    cost_jpy_mtd,
    alerts,
  };
}

/**
 * Supabase 実 query を deps として提供する factory。
 * Phase 0.5 fallback では null client なので 0 を返す。
 */
export function makeProductionDeps(): KpiCollectorDeps {
  return {
    getMonthlyCostJpy: async () => {
      // TODO Phase 1: budget-calculator.ts 経由で月初〜現在の cost を Supabase から集計
      return 0;
    },
    getKillSwitchState: async () => {
      const sb = getSupabase();
      if (!sb) return false;
      const { data, error } = await sb
        .from("safety_state")
        .select("publishing_enabled")
        .eq("scope", "global")
        .maybeSingle();
      if (error || !data) return false;
      return data.publishing_enabled === false;
    },
    getPostStats: async (since: Date, until: Date) => {
      const sb = getSupabase();
      if (!sb) return ZERO_STATS;
      const { data, error } = await sb
        .from("performance_metrics")
        .select("impressions, url_link_clicks, user_profile_clicks, posted_record_id")
        .gte("measured_at", since.toISOString())
        .lt("measured_at", until.toISOString());
      if (error || !data) return ZERO_STATS;
      const posts = new Set(data.map((r: { posted_record_id: string }) => r.posted_record_id)).size;
      return {
        posts,
        impressions: sum(data, "impressions"),
        url_link_clicks: sum(data, "url_link_clicks"),
        profile_clicks: sum(data, "user_profile_clicks"),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sum(rows: Array<Record<string, unknown>>, key: string): number {
  let s = 0;
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "number") s += v;
  }
  return s;
}

function round5(x: number): number {
  return Math.round(x * 100000) / 100000;
}

/** JST date 'YYYY-MM-DD' を返す. */
export function toJstDateString(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** JST 00:00 を Date (UTC 基準) で返す. */
function jstStartOfDay(now: Date): Date {
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  jstDate.setUTCHours(0, 0, 0, 0);
  // UTC に戻す: JST 00:00 = UTC 15:00 前日
  return new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
}
