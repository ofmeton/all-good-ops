"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NodePanel } from "./components/NodePanel";
import { CountUp } from "./components/motion/CountUp";
import { StatusBadge } from "./runs/status";
import type { Trace } from "@/lib/colors";
import type { DashboardKpis } from "@/lib/kpi-queries";

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

/** ノード色の凡例（lib/colors.ts / globals.css の --st-* ダーク値と一致） */
const LEGEND: { color: string; label: string }[] = [
  { color: "#34d399", label: "正常" },
  { color: "#fbbf24", label: "注意" },
  { color: "#fb7185", label: "エラー/却下" },
  { color: "#64748b", label: "スキップ" },
  { color: "#475569", label: "未実行" },
];

function Legend() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 glass px-3 py-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        ノードの状態
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ background: l.color }}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** KPI ストリップ（F10）。パイプラインの「いま」を 1 行で掴み、各ページへ飛べる。 */
function KpiStrip({ kpis }: { kpis: DashboardKpis }) {
  const cards: { href: string; label: string; value: number; accent: string }[] = [
    { href: "/curation", label: "収集ストック", value: kpis.collectedMaterials, accent: "#60a5fa" },
    { href: "/approval", label: "承認待ち", value: kpis.pendingApprovals, accent: "#fbbf24" },
    { href: "/publish", label: "承認済みストック", value: kpis.approvedStock, accent: "#34d399" },
    { href: "/proposals", label: "未レビュー提案", value: kpis.pendingProposals, accent: "#a78bfa" },
  ];
  return (
    <div className="shrink-0 overflow-x-auto px-4 pt-3 sm:px-6">
      <div className="flex min-w-max gap-3">
        {cards.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            className="stagger-in glass group flex min-w-[150px] flex-col gap-1 px-4 py-3 no-underline transition-colors hover:border-white/20"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: c.accent }}
              />
              {c.label}
            </span>
            <CountUp value={c.value} className="kpi-number text-2xl font-semibold leading-none" />
          </Link>
        ))}
        {kpis.lastRun && (
          <Link
            href="/runs"
            className="stagger-in glass group flex min-w-[170px] flex-col gap-1.5 px-4 py-3 no-underline transition-colors hover:border-white/20"
            style={{ "--i": cards.length } as React.CSSProperties}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
              直近 Run
            </span>
            <span className="flex items-center gap-2">
              <StatusBadge status={kpis.lastRun.status} />
              {kpis.lastRun.startedAt && (
                <span className="text-[11px] text-slate-400">
                  {new Date(kpis.lastRun.startedAt).toLocaleString("ja-JP", {
                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function HomeClient({ latest, kpis }: { latest: Record<string, Trace>; kpis: DashboardKpis | null }) {
  const [sel, setSel] = useState<string | null>(null);
  const empty = Object.keys(latest).length === 0;

  return (
    <main className="flex min-h-0 flex-1 flex-col h-[calc(100vh-3.5rem)]">
      {kpis && <KpiStrip kpis={kpis} />}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* 工程図キャンバス */}
        <div className="relative min-w-0 flex-1">
          <Legend />
          {empty && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 shadow-sm">
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
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <aside
              className="glass-elevated fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-auto !rounded-none border-l border-white/10 p-4 md:static md:z-auto md:w-[440px]"
              aria-label="工程の詳細"
            >
              <NodePanel stageId={sel} onClose={() => setSel(null)} />
            </aside>
          </>
        )}
      </div>
    </main>
  );
}
