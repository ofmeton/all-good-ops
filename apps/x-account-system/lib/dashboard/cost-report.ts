/**
 * Cost Report (実数コスト集計)
 *
 * Daily Digest に「コスト実数 (今月)」セクションを供給する。
 * 全フィールドは独立して fail-safe (取得失敗→null/undefined、throw しない)。
 *
 * REAL numbers のみ。残高/残クレジットは各社 API 非提供 → ダッシュボード確認の注記のみ。
 *
 * データソース:
 *   - LINE 送信枠 : GET /v2/bot/message/quota (+ /consumption)
 *   - Claude 実コスト : Anthropic Admin API GET /v1/organizations/cost_report
 *       amount は「最小通貨単位 (cents) の decimal string」→ USD = sum(amount)/100
 *   - X 投稿数 : posted_records 今月件数 (platform='x')
 *   - cost_ledger : 今月の category 別 cost_jpy / cost_usd
 *
 * env (process.env or worker Env からの subset):
 *   LINE_CHANNEL_ACCESS_TOKEN   LINE quota 取得
 *   ANTHROPIC_ADMIN_KEY         Anthropic cost_report (未設定 → claudeCostUsd=null)
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SCHEMA
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Workers-native fetch を inject 可能にする型. */
export type FetchImpl = typeof fetch;

/** buildCostReport が参照する env subset. */
export interface CostReportEnv {
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  ANTHROPIC_ADMIN_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SCHEMA?: string;
}

export interface LedgerCategoryCost {
  category: string;
  cost_jpy: number;
  cost_usd?: number;
}

export interface CostReport {
  /** 今月 LINE 送信数 (consumption.totalUsage). 取得失敗→null. */
  lineSent: number | null;
  /** 月間無料/上限枠 (quota.value). type==="none"(無制限) or 失敗→null. */
  lineLimit: number | null;
  /** Claude 当月実コスト (USD). admin key 無し / 失敗→null. */
  claudeCostUsd: number | null;
  /** 今月 X 投稿数 (posted_records platform='x'). 失敗→null. */
  xPostCount: number | null;
  /** X 無料枠 月間投稿キャップ (固定 500). */
  xPostCap: number;
  /** cost_ledger 今月の category 別内訳. 失敗→null. */
  ledgerByCategory: LedgerCategoryCost[] | null;
  /** cost_ledger 今月の cost_jpy 合計. 失敗→null. */
  ledgerTotalJpy: number | null;
}

const X_FREE_TIER_POST_CAP = 500;
const BUDGET_MONTHLY_LIMIT_JPY = 10000;

/**
 * 各社 API から REAL number を集計する。各フィールドは独立 fail-safe。
 * fetchImpl はテスト差し替え用 (default は Workers-native global fetch)。
 */
export async function buildCostReport(
  env: CostReportEnv,
  now: Date = new Date(),
  fetchImpl: FetchImpl = fetch,
): Promise<CostReport> {
  const [line, claudeCostUsd, xPostCount, ledger] = await Promise.all([
    fetchLineQuota(env, fetchImpl),
    fetchClaudeCostUsd(env, now, fetchImpl),
    fetchXPostCount(env, now),
    fetchLedgerByCategory(env, now),
  ]);

  return {
    lineSent: line.sent,
    lineLimit: line.limit,
    claudeCostUsd,
    xPostCount,
    xPostCap: X_FREE_TIER_POST_CAP,
    ledgerByCategory: ledger?.byCategory ?? null,
    ledgerTotalJpy: ledger?.totalJpy ?? null,
  };
}

// ---------------------------------------------------------------------------
// LINE 送信枠 (REAL)
//   GET /v2/bot/message/quota             → { type, value }  (type "none" = 無制限)
//   GET /v2/bot/message/quota/consumption → { totalUsage }
// ---------------------------------------------------------------------------
async function fetchLineQuota(
  env: CostReportEnv,
  fetchImpl: FetchImpl,
): Promise<{ sent: number | null; limit: number | null }> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { sent: null, limit: null };
  const headers = { Authorization: `Bearer ${token}` };

  const [limit, sent] = await Promise.all([
    (async (): Promise<number | null> => {
      try {
        const res = await fetchImpl("https://api.line.me/v2/bot/message/quota", {
          headers,
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { type?: string; value?: number };
        // type "none" = 無制限 → limit は概念的に存在しない
        if (body.type === "none") return null;
        return typeof body.value === "number" ? body.value : null;
      } catch {
        return null;
      }
    })(),
    (async (): Promise<number | null> => {
      try {
        const res = await fetchImpl(
          "https://api.line.me/v2/bot/message/quota/consumption",
          { headers },
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { totalUsage?: number };
        return typeof body.totalUsage === "number" ? body.totalUsage : null;
      } catch {
        return null;
      }
    })(),
  ]);

  return { sent, limit };
}

// ---------------------------------------------------------------------------
// Claude 実コスト (REAL, USD)
//   GET /v1/organizations/cost_report?starting_at=<month-start UTC>&ending_at=<now>&bucket_width=1d
//   headers: x-api-key, anthropic-version: 2023-06-01
//   response: { data: [{ results: [{ amount, currency }] }], has_more, next_page }
//   amount は「最小通貨単位 (cents) の decimal string」→ USD = sum(amount)/100
// ---------------------------------------------------------------------------
async function fetchClaudeCostUsd(
  env: CostReportEnv,
  now: Date,
  fetchImpl: FetchImpl,
): Promise<number | null> {
  const key = env.ANTHROPIC_ADMIN_KEY;
  if (!key) return null;

  const startingAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const endingAt = now.toISOString();

  try {
    let totalCents = 0;
    let page: string | undefined;
    // 当月は最大 31 バケットなので default limit で 1 ページで収まる想定だが、
    // has_more / next_page に従って defensively pagination。
    for (let i = 0; i < 12; i++) {
      const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
      url.searchParams.set("starting_at", startingAt);
      url.searchParams.set("ending_at", endingAt);
      url.searchParams.set("bucket_width", "1d");
      if (page) url.searchParams.set("page", page);

      const res = await fetchImpl(url.toString(), {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: Array<{ results?: Array<{ amount?: string; currency?: string }> }>;
        has_more?: boolean;
        next_page?: string;
      };
      const buckets = Array.isArray(body.data) ? body.data : [];
      for (const bucket of buckets) {
        const results = Array.isArray(bucket.results) ? bucket.results : [];
        for (const r of results) {
          const amt = typeof r.amount === "string" ? Number(r.amount) : NaN;
          if (Number.isFinite(amt)) totalCents += amt;
        }
      }
      if (body.has_more && body.next_page) {
        page = body.next_page;
      } else {
        break;
      }
    }
    // amount は cents → USD
    return totalCents / 100;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// X 投稿数 (REAL): posted_records 今月件数 (platform='x')
// ---------------------------------------------------------------------------
async function fetchXPostCount(
  env: CostReportEnv,
  now: Date,
): Promise<number | null> {
  const sb = makeSupabase(env);
  if (!sb) return null;
  const { monthStart, monthEnd } = utcMonthRange(now);
  try {
    const { count, error } = await sb
      .from("posted_records")
      .select("id", { count: "exact", head: true })
      .eq("platform", "x")
      .gte("posted_at", monthStart.toISOString())
      .lt("posted_at", monthEnd.toISOString());
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// cost_ledger 今月 category 別 (REAL): month='YYYY-MM' 一致行を集計
// ---------------------------------------------------------------------------
async function fetchLedgerByCategory(
  env: CostReportEnv,
  now: Date,
): Promise<{ byCategory: LedgerCategoryCost[]; totalJpy: number } | null> {
  const sb = makeSupabase(env);
  if (!sb) return null;
  const month = utcMonthString(now);
  try {
    const { data, error } = await sb
      .from("cost_ledger")
      .select("category, cost_jpy, cost_usd")
      .eq("month", month);
    if (error || !data) return null;
    const byCatMap = new Map<string, LedgerCategoryCost>();
    let totalJpy = 0;
    for (const row of data as Array<{
      category?: string;
      cost_jpy?: number | string;
      cost_usd?: number | string | null;
    }>) {
      const category = row.category ?? "unknown";
      const jpy = toNumber(row.cost_jpy);
      const usd = row.cost_usd == null ? undefined : toNumber(row.cost_usd);
      totalJpy += jpy;
      const existing = byCatMap.get(category);
      if (existing) {
        existing.cost_jpy += jpy;
        if (usd !== undefined) {
          existing.cost_usd = (existing.cost_usd ?? 0) + usd;
        }
      } else {
        byCatMap.set(category, {
          category,
          cost_jpy: jpy,
          ...(usd !== undefined ? { cost_usd: usd } : {}),
        });
      }
    }
    const byCategory = [...byCatMap.values()].sort(
      (a, b) => b.cost_jpy - a.cost_jpy,
    );
    return { byCategory, totalJpy };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 日本語セクション整形
// ---------------------------------------------------------------------------
/**
 * CostReport を Daily Digest 用の日本語セクションに整形。
 * null フィールドは "取得不可" 表記。残高は API 非提供の注記を必ず含む。
 */
export function formatCostReportJa(report: CostReport): string {
  const lines: string[] = [];
  lines.push("◆ コスト実数 (今月)");

  // Claude 実コスト ($)
  lines.push(
    `  Claude 実コスト: ${
      report.claudeCostUsd === null
        ? "取得不可"
        : `$${report.claudeCostUsd.toFixed(2)}`
    }`,
  );

  // LINE 送信枠
  if (report.lineSent === null) {
    lines.push("  LINE 送信: 取得不可");
  } else {
    const limitPart =
      report.lineLimit === null ? "無料枠 無制限" : `無料枠 ${report.lineLimit.toLocaleString()} 通`;
    lines.push(`  LINE 送信: ${report.lineSent.toLocaleString()} 通 / ${limitPart}`);
  }

  // X 投稿数
  if (report.xPostCount === null) {
    lines.push(`  X 投稿: 取得不可 / 月キャップ ${report.xPostCap}`);
  } else {
    lines.push(`  X 投稿: ${report.xPostCount} 件 / 月キャップ ${report.xPostCap} (自主上限 ~90/月)`);
  }

  // twitterapi.io (cost_ledger の twitterapi カテゴリ)
  if (report.ledgerByCategory === null) {
    lines.push("  twitterapi.io: 取得不可");
  } else {
    const twa = report.ledgerByCategory.find((c) => c.category === "twitterapi");
    lines.push(
      `  twitterapi.io: ¥${(twa?.cost_jpy ?? 0).toLocaleString()} (cost_ledger)`,
    );
  }

  // 自社集計合計 (cost_ledger total)
  if (report.ledgerTotalJpy === null) {
    lines.push("  自社集計合計: 取得不可");
  } else {
    lines.push(
      `  自社集計合計: ¥${report.ledgerTotalJpy.toLocaleString()} / 予算 ¥${BUDGET_MONTHLY_LIMIT_JPY.toLocaleString()}`,
    );
  }

  lines.push("  ※残クレジット/残高は各社 API 非提供 → ダッシュボード確認");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function makeSupabase(env: CostReportEnv): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: (env.SUPABASE_SCHEMA || "public") as "public" },
    });
  } catch {
    return null;
  }
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** UTC 基準の今月 [monthStart, monthEnd). */
function utcMonthRange(now: Date): { monthStart: Date; monthEnd: Date } {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { monthStart, monthEnd };
}

/** cost_ledger.month と一致する 'YYYY-MM' (UTC 基準). */
function utcMonthString(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
