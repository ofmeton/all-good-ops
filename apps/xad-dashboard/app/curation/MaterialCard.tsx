"use client";
import type { CurationMaterial } from "@/lib/curation-logic";
import { MediaThumbs } from "@/components/MediaModal";

function scoreColor(v: number | null): string {
  if (v == null) return "bg-slate-100 text-slate-500";
  if (v >= 70) return "bg-emerald-100 text-emerald-800";
  if (v >= 40) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

/** overall_score に応じた左ボーダーカラー（選択状態と独立） */
function borderAccent(v: number | null): string {
  if (v == null) return "border-l-slate-200";
  if (v >= 70) return "border-l-emerald-400";
  if (v >= 40) return "border-l-amber-400";
  return "border-l-slate-300";
}

/** 収集からの経過日数（温めプールの寝かせ期間バッジ用）。 */
function ageDays(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

export function MaterialCard({
  m, checked, onToggle, showWarmAge = false,
}: { m: CurationMaterial; checked: boolean; onToggle: (id: string) => void; showWarmAge?: boolean }) {
  const e = m.engagement;
  // 温め（選抜）プールの経過日数バッジ。7日超で amber、14日超で「見直し」強調。
  const days = showWarmAge ? ageDays(m.created_at) : null;
  return (
    <div
      className={`border border-l-4 rounded-lg p-3 transition-colors ${borderAccent(m.effective_overall ?? m.overall_score)} ${
        checked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(m.id)}
          className="mt-1 accent-blue-500"
        />
        <div className="flex-1 min-w-0">
          {/* ヘッダー行: author / lane / effective(=いまの総合) badge / 採点時 raw / 3-axis / lang */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-bold">@{m.source_ref}</span>
            {m.lane === "reference" && (
              <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">
                参考(JP)
              </span>
            )}
            {days != null && days >= 7 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  days >= 14 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                }`}
                title="温めてからの経過日数"
              >
                {days >= 14 ? `見直し ${days}日` : `${days}日`}
              </span>
            )}
            {/* 主表示は time-decay 後の effective_overall（いまの価値）。 */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor(m.effective_overall ?? m.overall_score)}`}
            >
              総合 {m.effective_overall ?? m.overall_score ?? "—"}
            </span>
            {/* 採点時の生スコアと差があれば併記（スコア違和感の検知用）。 */}
            {m.effective_overall != null &&
              m.overall_score != null &&
              m.effective_overall !== m.overall_score && (
                <span className="text-xs text-slate-400 tabular-nums" title="採点時の総合スコア">
                  採点 {m.overall_score}
                </span>
              )}
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              f{m.freshness_eff ?? m.freshness ?? "—"} / v{m.velocity ?? "—"} / fit{m.target_fit ?? "—"}
            </span>
            {m.lang && (
              <span className="text-xs text-slate-400 uppercase tracking-wide">{m.lang}</span>
            )}
          </div>

          {/* 本文 */}
          <p className="whitespace-pre-wrap text-sm mt-1 leading-relaxed text-slate-800">
            {m.raw_text}
          </p>

          {/* メディアサムネイル（クリックで原寸モーダル / video 再生） */}
          <MediaThumbs media={m.media} />

          {/* メタ行: discovery / collected_at / engagement / 原ツイート */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
            <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium">
              {m.discovery_via}
              {m.discovery_query ? `: ${m.discovery_query}` : ""}
            </span>
            {m.collected_at && (
              <span>{new Date(m.collected_at).toLocaleString("ja-JP")}</span>
            )}
            {e && (
              <span className="tabular-nums">
                ♥{e.like ?? 0} ↺{e.retweet ?? 0} 👁{e.view ?? 0}
              </span>
            )}
            {m.tweet_url && (
              <a
                href={m.tweet_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                原ツイート
              </a>
            )}
          </div>

          {/* 採点理由 (collapsible) */}
          {m.score_reason && (
            <details className="text-xs text-slate-500 mt-1">
              <summary className="cursor-pointer select-none hover:text-slate-700">
                採点理由
              </summary>
              <p className="mt-1 pl-2 border-l border-slate-200 text-slate-600">
                {m.score_reason}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
