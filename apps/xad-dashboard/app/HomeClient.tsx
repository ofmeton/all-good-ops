"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { NodePanel } from "./components/NodePanel";
import type { Trace } from "@/lib/colors";

const Flowchart = dynamic(
  () => import("./components/Flowchart").then((m) => m.Flowchart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        工程図を読み込み中…
      </div>
    ),
  },
);

/** ノード色の凡例（lib/colors.ts / globals.css の --st-* と一致） */
const LEGEND: { color: string; label: string }[] = [
  { color: "#16a34a", label: "正常" },
  { color: "#ca8a04", label: "注意" },
  { color: "#dc2626", label: "エラー/却下" },
  { color: "#475569", label: "スキップ" },
  { color: "#9ca3af", label: "未実行" },
];

function Legend() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        ノードの状態
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/5"
              style={{ background: l.color }}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeClient({ latest }: { latest: Record<string, Trace> }) {
  const [sel, setSel] = useState<string | null>(null);
  const empty = Object.keys(latest).length === 0;

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden h-[calc(100vh-3.5rem)]">
      {/* 工程図キャンバス */}
      <div className="relative min-w-0 flex-1">
        <Legend />
        {empty && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-sm">
            まだ実行記録がありません（全ノード=未実行）
          </div>
        )}
        <Flowchart latest={latest} onSelect={setSel} />
      </div>

      {/* 詳細パネル: デスクトップ=右サイド常設 / モバイル=全幅ドロワー */}
      {sel && (
        <>
          {/* mobile backdrop */}
          <button
            type="button"
            aria-label="パネルを閉じる"
            onClick={() => setSel(null)}
            className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
          />
          <aside
            className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-auto border-l border-slate-200 bg-white p-4 shadow-xl md:static md:z-auto md:w-[440px] md:shadow-none"
            aria-label="工程の詳細"
          >
            <NodePanel stageId={sel} onClose={() => setSel(null)} />
          </aside>
        </>
      )}
    </main>
  );
}
