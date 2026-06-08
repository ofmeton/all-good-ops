"use client";
import type { CurationMaterial } from "@/lib/curation-logic";
import { MediaThumbs } from "@/components/MediaModal";

function scoreColor(v: number | null): string {
  if (v == null) return "bg-gray-100 text-gray-500";
  if (v >= 70) return "bg-green-100 text-green-800";
  if (v >= 40) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-600";
}

/** overall_score に応じた左ボーダーカラー（選択状態と独立） */
function borderAccent(v: number | null): string {
  if (v == null) return "border-l-gray-200";
  if (v >= 70) return "border-l-green-400";
  if (v >= 40) return "border-l-amber-400";
  return "border-l-gray-300";
}

export function MaterialCard({
  m, checked, onToggle,
}: { m: CurationMaterial; checked: boolean; onToggle: (id: string) => void }) {
  const e = m.engagement;
  return (
    <div
      className={`border border-l-4 rounded p-3 transition-colors ${borderAccent(m.overall_score)} ${
        checked ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
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
          {/* ヘッダー行: author / overall badge / 3-axis / lang */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-bold">@{m.source_ref}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${scoreColor(m.overall_score)}`}
            >
              overall {m.overall_score ?? "—"}
            </span>
            <span className="text-xs text-gray-500 font-mono tabular-nums">
              f{m.freshness ?? "—"} / v{m.velocity ?? "—"} / fit{m.target_fit ?? "—"}
            </span>
            {m.lang && (
              <span className="text-xs text-gray-400 uppercase tracking-wide">{m.lang}</span>
            )}
          </div>

          {/* 本文 */}
          <p className="whitespace-pre-wrap text-sm mt-1 leading-relaxed text-gray-800">
            {m.raw_text}
          </p>

          {/* メディアサムネイル（クリックで原寸モーダル / video 再生） */}
          <MediaThumbs media={m.media} />

          {/* メタ行: discovery / collected_at / engagement / 原ツイート */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
            <span className="px-1.5 py-0.5 bg-gray-100 rounded font-medium">
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
            <details className="text-xs text-gray-500 mt-1">
              <summary className="cursor-pointer select-none hover:text-gray-700">
                採点理由
              </summary>
              <p className="mt-1 pl-2 border-l border-gray-200 text-gray-600">
                {m.score_reason}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
