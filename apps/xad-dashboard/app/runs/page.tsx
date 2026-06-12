import Link from "next/link";
import { listRuns } from "@/lib/queries";
import { StatusBadge, statusTone } from "./status";

// 都度フレッシュ（新しい run を再デプロイなしに反映）
export const dynamic = "force-dynamic";

export default async function Runs() {
  const runs = await listRuns(50).catch(() => []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6">
      {/* header */}
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">Runs</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            発信パイプラインの実行履歴（新しい順・最大50件）。行をクリックで工程 trace を表示。
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
          {runs.length.toLocaleString()} 件
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="glass py-20 text-center">
          <div className="mb-3 select-none text-4xl text-slate-600">○</div>
          <p className="text-sm text-slate-400">まだ実行記録がありません。</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          {/* column header（sm以上） */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:grid">
            <span>開始 / ジョブ</span>
            <span>トリガー</span>
            <span>状態</span>
            <span className="text-right">試行</span>
          </div>
          <ul className="divide-y divide-white/5">
            {runs.map((r, i) => {
              const running = statusTone(r.status) === "running";
              return (
                <li
                  key={r.id}
                  className="stagger-in"
                  style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
                >
                  <Link
                    href={`/runs/${r.id}`}
                    className="relative grid grid-cols-1 gap-2 px-4 py-3 no-underline transition-colors hover:bg-white/[0.04] sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
                  >
                    {/* running 行は左端にパルスバー */}
                    {running && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-blue-400 shadow-glow-primary animate-pulse-glow"
                      />
                    )}
                    {/* 開始 + ジョブ */}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">{r.job}</div>
                      <div className="font-mono text-xs tabular-nums text-slate-400">
                        {new Date(r.started_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                    {/* trigger */}
                    <span className="text-xs text-slate-400">
                      <span className="text-slate-500 sm:hidden">トリガー: </span>
                      {r.trigger}
                    </span>
                    {/* status */}
                    <StatusBadge status={r.status} />
                    {/* attempt */}
                    <span className="text-xs tabular-nums text-slate-400 sm:text-right">
                      <span className="text-slate-500 sm:hidden">試行: </span>
                      {r.attempt}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
