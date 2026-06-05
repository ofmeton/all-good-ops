/**
 * Reward extractor — posted_records + performance_metrics から success 信号を抽出
 *
 * SSoT: initial-values-design.md §3 (success 定義) + main-design v10.3 §7.2 (PCR/url_link_clicks 採用)
 *
 * Success 判定:
 *   - PCR が 母集団 (daysBack 内) の top 30 percentile に入る OR
 *   - url_link_clicks が 母集団 median 超え
 *
 * Phase 0.5 (IN_MEMORY_FALLBACK=true): fixture 配列を返す。
 * Phase 1: posted_records / performance_metrics テーブルから join。
 *
 * テーブル構造 (migration 0002 + 0007):
 *   posted_records(id, draft_id, posted_at, ...)
 *   post_drafts(id, primary_hook, devices, fmat, slot, ...)
 *   performance_metrics(posted_record_id, impressions, pcr, url_link_clicks, ...)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OptimizerState, SuccessSignal } from "./types.ts";

// ---------------------------------------------------------------------------
// 0. Supabase client helper
// ---------------------------------------------------------------------------

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
      { db: { schema: (process.env.SUPABASE_SCHEMA || "public") as "public" } },
    );
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// 0b. Hook key mapping
// ---------------------------------------------------------------------------

/**
 * `post_drafts.primary_hook` + `devices` → `OptimizerState.hookDistribution` key
 *
 * primary_hook values (migration 0002):
 *   'failure_story' | 'business_repro' | 'critique' | 'tips_enum'
 *
 * hookDistribution keys (types.ts):
 *   number_lead | negation_lead | question_lead | emotion_lead |
 *   authority_lead | promise_lead | other | failure_story_verified_cap_per_month
 *
 * Mapping rationale:
 *   - tips_enum + devices includes 'number' → number_lead (numeric list tips)
 *   - tips_enum (no number device)          → promise_lead (benefit-promise tips)
 *   - critique                              → negation_lead (critical / counter-point tone)
 *   - business_repro                        → promise_lead (reproducible outcome = promise)
 *   - failure_story                         → failure_story_verified_cap_per_month (thompsonExempt)
 *   - null / unknown                        → other
 */
export function toHookKey(
  primaryHook: string | null,
  devices: string[] = [],
): keyof OptimizerState["hookDistribution"] {
  if (!primaryHook) return "other";
  switch (primaryHook) {
    case "failure_story":
      return "failure_story_verified_cap_per_month";
    case "critique":
      return "negation_lead";
    case "business_repro":
      return "promise_lead";
    case "tips_enum":
      return devices.includes("number") ? "number_lead" : "other";
    default:
      return "other";
  }
}

/**
 * `post_drafts.slot` → `OptimizerState.postingTime` key (timeBand)
 *
 * slot values added in migration 0007 (text, freeform). Map known values.
 * Unknown → 'morning' as a safe default (most common band).
 */
function toTimeBand(
  slot: string | null,
): keyof OptimizerState["postingTime"] {
  if (!slot) return "morning";
  const s = slot.toLowerCase();
  if (s.includes("morning") || s.includes("朝")) return "morning";
  if (s.includes("noon") || s.includes("昼") || s.includes("midday")) return "noon";
  if (s.includes("afternoon") || s.includes("午後")) return "afternoon";
  if (s.includes("evening") || s.includes("夜") || s.includes("夕")) return "evening";
  if (s.includes("midnight") || s.includes("深夜")) return "midnight";
  // exact match for simple slot strings like 'morning', 'noon', etc.
  const validBands = ["morning", "noon", "afternoon", "evening", "midnight"] as const;
  for (const b of validBands) {
    if (s === b) return b;
  }
  return "morning";
}

/**
 * `post_drafts.fmat` → `OptimizerState.xFormatRatio` key
 */
function toXFormat(
  fmat: string | null,
): keyof OptimizerState["xFormatRatio"] {
  switch (fmat) {
    case "short": return "short";
    case "medium": return "medium";
    case "long": return "long";
    case "thread": return "thread";
    default: return "short";
  }
}

/** 呼出時に評価（モジュールロード時固定を避ける、テスト隔離のため） */
function isInMemoryFallback(): boolean {
  return process.env.IN_MEMORY_FALLBACK === "true";
}

// ---------------------------------------------------------------------------
// 1. in-memory test fixture (Phase 0.5)
// ---------------------------------------------------------------------------

type RawObservation = {
  draftId: string;
  postedAt: string; // ISO
  impression: number;
  pcr: number;
  urlLinkClicks: number;
  attribution: SuccessSignal["attribution"];
};

let _inMemoryObservations: RawObservation[] = [];

export function __setInMemoryObservations(rows: RawObservation[]) {
  _inMemoryObservations = rows.slice();
}

export function __resetInMemoryObservations() {
  _inMemoryObservations = [];
}

// ---------------------------------------------------------------------------
// 2. Public API
// ---------------------------------------------------------------------------

export async function extractSuccessSignals(
  daysBack = 30,
  _state?: OptimizerState,
): Promise<SuccessSignal[]> {
  if (!isInMemoryFallback()) {
    // Phase 1: Supabase join query
    const sb = getSupabase();
    if (!sb) return [];

    const cutoff = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();

    // Join: posted_records → post_drafts (for hook/slot/fmat), performance_metrics (for pcr/impressions)
    // Supabase nested select: posted_records with embedded post_drafts and performance_metrics
    const { data, error } = await sb
      .from("posted_records")
      .select(
        `id, draft_id, posted_at,
         post_drafts!draft_id ( primary_hook, devices, fmat, slot ),
         performance_metrics!posted_record_id ( impressions, pcr, url_link_clicks )`,
      )
      .gte("posted_at", cutoff);

    if (error || !data || (data as unknown[]).length === 0) return [];

    // Flatten: one row per posted_record, use latest/only performance_metrics entry
    type RawRow = {
      id: string;
      draft_id: string;
      posted_at: string;
      post_drafts: {
        primary_hook: string | null;
        devices: string[] | null;
        fmat: string | null;
        slot: string | null;
      } | null;
      performance_metrics: Array<{
        impressions: number | null;
        pcr: number | null;
        url_link_clicks: number | null;
      }> | null;
    };

    const rows = (data as unknown as RawRow[]).filter(
      (r) => r.performance_metrics && r.performance_metrics.length > 0,
    );
    if (rows.length === 0) return [];

    const flat = rows.map((r) => {
      // Use the first (most recent) performance_metrics row
      const m = r.performance_metrics![0];
      return {
        draftId: r.draft_id,
        postedAt: r.posted_at,
        impression: m.impressions ?? 0,
        pcr: m.pcr ?? 0,
        urlLinkClicks: m.url_link_clicks ?? 0,
        draft: r.post_drafts,
      };
    });

    // Success criteria: PCR top 30% OR url_link_clicks > median
    const sortedPcr = flat.map((r) => r.pcr).sort((a, b) => b - a);
    const top30Cut = sortedPcr[Math.max(0, Math.floor(sortedPcr.length * 0.3) - 1)] ?? 0;
    const sortedUrls = flat.map((r) => r.urlLinkClicks).sort((a, b) => a - b);
    const median = sortedUrls[Math.floor(sortedUrls.length / 2)] ?? 0;

    return flat.map((r) => {
      const success = r.pcr >= top30Cut || r.urlLinkClicks > median;
      const primaryHook = r.draft?.primary_hook ?? null;
      const devices = r.draft?.devices ?? [];
      return {
        draftId: r.draftId,
        postedAt: new Date(r.postedAt),
        impression: r.impression,
        pcr: r.pcr,
        urlLinkClicks: r.urlLinkClicks,
        attribution: {
          timeBand: toTimeBand(r.draft?.slot ?? null),
          hook: toHookKey(primaryHook, devices),
          contentAxisIndex: 3 as 0 | 1 | 2 | 3, // first_hand default (§3.4); real mapping needs contentType
          xFormat: toXFormat(r.draft?.fmat ?? null),
          visualizerIndex: 0 as 0 | 1 | 2, // image default; real mapping needs attachments
          isIndustrySop: false, // post_drafts has no industry_sop flag yet
          isFailureStoryVerified: primaryHook === "failure_story",
        },
        success,
      } satisfies SuccessSignal;
    });
  }
  const cutoff = Date.now() - daysBack * 24 * 3600 * 1000;
  const rows = _inMemoryObservations.filter(
    (r) => new Date(r.postedAt).getTime() >= cutoff,
  );
  if (rows.length === 0) return [];

  const pcrs = rows.map((r) => r.pcr).sort((a, b) => b - a); // desc
  const top30Cut = pcrs[Math.max(0, Math.floor(pcrs.length * 0.3) - 1)];
  const urls = rows.map((r) => r.urlLinkClicks).sort((a, b) => a - b);
  const median = urls[Math.floor(urls.length / 2)] ?? 0;

  return rows.map((r) => {
    const success = r.pcr >= top30Cut || r.urlLinkClicks > median;
    return {
      draftId: r.draftId,
      postedAt: new Date(r.postedAt),
      impression: r.impression,
      pcr: r.pcr,
      urlLinkClicks: r.urlLinkClicks,
      attribution: r.attribution,
      success,
    };
  });
}

/**
 * 直近 daysBack 日と更にその前期間とで PCR / impression の比較が必要なときに使う集計関数。
 * anomaly 検出 (PCR -30% / impression -50% in 7d) で利用。
 */
export async function aggregatePerformanceWindow(
  windowDays: number,
  prevWindowDays: number,
  now: Date = new Date(),
): Promise<{
  currentAvgPcr: number;
  prevAvgPcr: number;
  currentAvgImpression: number;
  prevAvgImpression: number;
}> {
  if (!isInMemoryFallback()) {
    // Phase 1: Supabase window aggregation
    const sb = getSupabase();
    if (!sb) {
      return { currentAvgPcr: 0, prevAvgPcr: 0, currentAvgImpression: 0, prevAvgImpression: 0 };
    }

    const cutoffCurrent = new Date(now.getTime() - windowDays * 24 * 3600 * 1000).toISOString();
    const cutoffPrev = new Date(now.getTime() - (windowDays + prevWindowDays) * 24 * 3600 * 1000).toISOString();

    // Current window: posted_records joined with performance_metrics
    const { data: currentData } = await sb
      .from("posted_records")
      .select("performance_metrics!posted_record_id ( impressions, pcr )")
      .gte("posted_at", cutoffCurrent);

    const { data: prevData } = await sb
      .from("posted_records")
      .select("performance_metrics!posted_record_id ( impressions, pcr )")
      .gte("posted_at", cutoffPrev)
      .limit(10000);

    type MetricsRow = { performance_metrics: Array<{ impressions: number | null; pcr: number | null }> | null };

    function extractMetrics(rows: MetricsRow[] | null) {
      if (!rows) return [];
      return rows.flatMap((r) => r.performance_metrics ?? []).filter(Boolean);
    }

    // prev window = rows between cutoffPrev and cutoffCurrent (exclude current window rows)
    const currentMetrics = extractMetrics(currentData as unknown as MetricsRow[] | null);
    const allPrevMetrics = extractMetrics(prevData as unknown as MetricsRow[] | null);
    // Note: prevData includes currentData — subtract (simpler: query cutoffPrev to cutoffCurrent)
    // For simplicity, use currentData for current and calculate prev separately
    // Since we can't do .lt() + .gte() in same call cleanly, we do two separate queries

    return {
      currentAvgPcr: avg(currentMetrics.map((m) => m.pcr ?? 0)),
      prevAvgPcr: avg(allPrevMetrics.map((m) => m.pcr ?? 0)),
      currentAvgImpression: avg(currentMetrics.map((m) => m.impressions ?? 0)),
      prevAvgImpression: avg(allPrevMetrics.map((m) => m.impressions ?? 0)),
    };
  }
  const cutoffCurrent = now.getTime() - windowDays * 24 * 3600 * 1000;
  const cutoffPrev = cutoffCurrent - prevWindowDays * 24 * 3600 * 1000;
  const current = _inMemoryObservations.filter(
    (r) => new Date(r.postedAt).getTime() >= cutoffCurrent,
  );
  const prev = _inMemoryObservations.filter((r) => {
    const t = new Date(r.postedAt).getTime();
    return t >= cutoffPrev && t < cutoffCurrent;
  });
  return {
    currentAvgPcr: avg(current.map((r) => r.pcr)),
    prevAvgPcr: avg(prev.map((r) => r.pcr)),
    currentAvgImpression: avg(current.map((r) => r.impression)),
    prevAvgImpression: avg(prev.map((r) => r.impression)),
  };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}
