"use client";
import { useState } from "react";
import { fmtJst, preview, attachmentSummary, type ScheduleStock } from "@/lib/schedule-logic";
import { SlotPicker } from "./SlotPicker";

const FMAT_JP: Record<string, string> = {
  short: "短文",
  medium: "中尺",
  long: "長文",
  thread: "スレッド",
  article: "記事",
  carousel: "カルーセル",
};

/**
 * 承認済み 1 件 + そのスロット割当の行。DraftCard のトークン(slate基調/risk色/角丸)を踏襲。
 * 本文プレビュー（展開可）・risk バッジ・添付サマリ・割当時刻・SlotPicker を持つ。
 */
export function ScheduleDraftRow({
  stock,
  value,
  includeToday,
  nowMs,
  usedISO,
  disabled,
  onChange,
}: {
  stock: ScheduleStock;
  value: string | undefined;
  includeToday: boolean;
  nowMs: number;
  usedISO: string[];
  disabled: boolean;
  onChange: (iso: string | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const high = stock.risk_level === "high";
  const att = attachmentSummary(stock);
  const assigned = !!value;

  return (
    <div
      className={`rounded-xl border bg-surface shadow-sm overflow-hidden ${
        high ? "border-l-4 border-l-rose-400 border-white/10" : "border-white/10"
      }`}
    >
      {/* header: risk / fmat / 文字数 / 添付 */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            high ? "bg-rose-400/15 text-rose-300" : "bg-emerald-400/15 text-emerald-300"
          }`}
        >
          {high ? "⚠ HIGH RISK" : "✓ low risk"}
        </span>
        {stock.fmat && (
          <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
            {FMAT_JP[stock.fmat] ?? stock.fmat}
          </span>
        )}
        <span className="text-xs text-slate-400 tabular-nums">{(stock.body ?? "").length}字</span>
        {att && <span className="text-xs text-slate-400">{att}</span>}
        {stock.risk_reasons && stock.risk_reasons.length > 0 && (
          <span className="text-xs text-rose-300">{stock.risk_reasons.join(" / ")}</span>
        )}
      </div>

      {/* 本文プレビュー（クリックで全文展開） */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="block w-full text-left px-4 sm:px-5 pt-2 pb-3"
      >
        {expanded ? (
          <p className="whitespace-pre-wrap leading-relaxed text-sm text-slate-300">{stock.body}</p>
        ) : (
          <p className="text-sm text-slate-300">{preview(stock.body)}</p>
        )}
        <span className="mt-1 inline-block text-[11px] text-blue-300">
          {expanded ? "閉じる" : "全文を表示"}
        </span>
      </button>

      {/* slot 割当 */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 bg-white/[0.03] border-t border-white/5">
        <span className="text-xs font-medium text-slate-400">予約スロット</span>
        <SlotPicker
          value={value}
          includeToday={includeToday}
          nowMs={nowMs}
          usedISO={usedISO}
          disabled={disabled}
          onChange={onChange}
        />
        {assigned ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 font-medium tabular-nums">
            {fmtJst(value!)} に予約
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
            未割当
          </span>
        )}
      </div>
    </div>
  );
}
