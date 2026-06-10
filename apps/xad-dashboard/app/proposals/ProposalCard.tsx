"use client";

import { useState } from "react";
import type { ProposalRow, ApplyDescriptor } from "@/lib/proposals-queries";
import { TIER_T_PARAM_IDS } from "@/lib/proposal-tier-t-params";

const RANK_STYLE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-slate-100 text-slate-600",
};

export function ProposalCard({
  proposal,
  busy,
  onDecide,
}: {
  proposal: ProposalRow;
  busy: boolean;
  onDecide: (
    id: string,
    decision: "accept" | "reject",
    reason: string,
    apply: ApplyDescriptor | null,
  ) => void;
}) {
  const [reason, setReason] = useState("");
  const [paramId, setParamId] = useState("");
  const [value, setValue] = useState("");

  const apply: ApplyDescriptor | null =
    paramId && value !== "" && !Number.isNaN(Number(value))
      ? { paramId, value: Number(value) }
      : null;

  const rankStyle = proposal.rank ? (RANK_STYLE[proposal.rank] ?? "bg-slate-100 text-slate-600") : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4 pb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rankStyle}`}>
          rank {proposal.rank ?? "-"}
        </span>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {proposal.proposal_type}
        </span>
        <span className="text-xs text-slate-400">scope: {proposal.scope}</span>
      </div>

      {/* hypothesis */}
      <p className="px-4 sm:px-5 pb-3 text-sm text-slate-800 leading-relaxed">
        {proposal.hypothesis}
      </p>

      {/* evidence */}
      <details className="px-4 sm:px-5 pb-3 group">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
          evidence
        </summary>
        <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-700 leading-relaxed">
          {JSON.stringify(proposal.evidence, null, 2)}
        </pre>
      </details>

      {/* tier-T apply */}
      <details className="px-4 sm:px-5 pb-3 group">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
          tier-T 数値適用（任意・accept 時のみ）
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={paramId}
            onChange={(e) => setParamId(e.target.value)}
            className="text-xs rounded border border-slate-200 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
          >
            <option value="">（適用しない）</option>
            {TIER_T_PARAM_IDS.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="比率 0〜1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-xs rounded border border-slate-200 px-2 py-1.5 w-28 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
          />
        </div>
        {apply && (
          <p className="mt-1.5 text-[11px] text-emerald-700">
            適用予定: {apply.paramId} = {apply.value}（guard 範囲外は自動 clip）
          </p>
        )}
      </details>

      {/* actions */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 space-y-2">
        <div>
          <label htmlFor={`reason-${proposal.id}`} className="block text-xs text-slate-400 mb-0.5">
            理由・メモ（任意）
          </label>
          <textarea
            id={`reason-${proposal.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={busy}
            placeholder="採用・却下の理由（LLM 品質改善用）"
            className="w-full resize-y rounded border border-slate-200 p-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400/30 focus:border-blue-300 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={busy}
            onClick={() => onDecide(proposal.id, "accept", reason.trim(), apply)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            accept
          </button>
          <button
            disabled={busy}
            onClick={() => onDecide(proposal.id, "reject", reason.trim(), null)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            reject
          </button>
          {busy && (
            <span className="text-xs text-slate-400 self-center">処理中…</span>
          )}
        </div>
      </div>
    </div>
  );
}
