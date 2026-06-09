import Link from "next/link";
import { listRuns } from "@/lib/queries";
import { StatusBadge } from "./status";

// 都度フレッシュ（新しい run を再デプロイなしに反映）
export const dynamic = "force-dynamic";

export default async function Runs() {
  const runs = await listRuns(50).catch(() => []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6">
      {/* header */}
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Runs</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            発信パイプラインの実行履歴（新しい順・最大50件）。行をクリックで工程 trace を表示。
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
          {runs.length.toLocaleString()} 件
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center">
          <div className="mb-3 select-none text-4xl text-slate-300">○</div>
          <p className="text-sm text-slate-500">まだ実行記録がありません。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* column header（sm以上） */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:grid">
            <span>開始 / ジョブ</span>
            <span>トリガー</span>
            <span>状態</span>
            <span className="text-right">試行</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/runs/${r.id}`}
                  className="grid grid-cols-1 gap-2 px-4 py-3 no-underline transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
                >
                  {/* 開始 + ジョブ */}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{r.job}</div>
                    <div className="font-mono text-xs tabular-nums text-slate-400">
                      {new Date(r.started_at).toLocaleString("ja-JP")}
                    </div>
                  </div>
                  {/* trigger */}
                  <span className="text-xs text-slate-500">
                    <span className="text-slate-400 sm:hidden">トリガー: </span>
                    {r.trigger}
                  </span>
                  {/* status */}
                  <StatusBadge status={r.status} />
                  {/* attempt */}
                  <span className="text-xs tabular-nums text-slate-500 sm:text-right">
                    <span className="text-slate-400 sm:hidden">試行: </span>
                    {r.attempt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
