"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProposalRow, ApplyDescriptor } from "@/lib/proposals-queries";
import { ProposalCard } from "./ProposalCard";

type Msg = { text: string; type: "info" | "error" | "success" } | null;

export function ProposalsClient({ initial }: { initial: ProposalRow[] }) {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalRow[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  async function decide(
    id: string,
    decision: "accept" | "reject",
    reason: string,
    apply: ApplyDescriptor | null,
  ) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch("/api/proposals/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: [id],
          decision,
          ...(reason ? { reason } : {}),
          ...(apply ? { apply } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setMsg({ text: `失敗: ${body.error ?? res.status}`, type: "error" });
        return;
      }
      if (body.updated === 0) {
        setMsg({ text: "対象は既に処理済みでした", type: "info" });
        setProposals((prev) => prev.filter((p) => p.id !== id));
        return;
      }
      setMsg({
        text: decision === "accept" ? "採用しました" : "却下しました",
        type: "success",
      });
      setProposals((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch (e) {
      setMsg({ text: `通信エラー: ${(e as Error).message}`, type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-14 z-20">
        <div className="max-w-3xl mx-auto flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">optimizer 提案レビュー</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              未レビューの提案。accept すると apply-engine が処理（tier-T は構造を付与すると数値適用、それ以外は記録のみ）。
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            未レビュー {proposals.length.toLocaleString()} 件
          </span>
        </div>
        {msg && (
          <div className="max-w-3xl mx-auto mt-2">
            <span
              className={[
                "inline-block text-xs px-2.5 py-1 rounded-full font-medium",
                msg.type === "error"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : msg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {msg.text}
            </span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {proposals.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-slate-300 text-4xl mb-3 select-none">○</div>
            <p className="text-slate-500 text-sm">未レビューの提案はありません。</p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              再読み込み
            </button>
          </div>
        ) : (
          proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              busy={busyId === p.id}
              onDecide={decide}
            />
          ))
        )}
      </div>
    </div>
  );
}
