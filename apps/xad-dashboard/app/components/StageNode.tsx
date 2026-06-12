"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export interface StageNodeData {
  label: string;
  group: string;
  /** lib/colors.ts nodeColor() の戻り値 */
  color: "green" | "yellow" | "red" | "slate" | "gray";
  /** 直近実行ノード（最後に trace が書かれた工程）はパルスさせる */
  isLatest: boolean;
}

const ACCENT: Record<StageNodeData["color"], string> = {
  green: "var(--st-ok)",
  yellow: "var(--st-warn)",
  red: "var(--st-danger)",
  slate: "var(--st-skipped)",
  gray: "var(--st-idle)",
};

/** 状態グロー。shadow は固定し opacity だけ動かす（globals.css の方針と同じ）。 */
const GLOW: Partial<Record<StageNodeData["color"], { shadow: string; pulse: boolean }>> = {
  green: { shadow: "0 0 16px 0 rgb(52 211 153 / 0.35)", pulse: false },
  yellow: { shadow: "0 0 20px 2px rgb(251 191 36 / 0.45)", pulse: true },
  red: { shadow: "0 0 20px 2px rgb(251 113 133 / 0.5)", pulse: true },
};

export const StageNode = memo(function StageNode({ data }: NodeProps<StageNodeData>) {
  const accent = ACCENT[data.color];
  const glow = GLOW[data.color];
  const dimmed = data.color === "gray" || data.color === "slate";
  return (
    <div
      className="relative w-[180px] rounded-xl border border-white/10 px-3 py-2.5 backdrop-blur-md"
      style={{
        background: "rgb(15 22 41 / 0.88)",
        borderLeft: `3px solid ${accent}`,
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.06)",
      }}
    >
      {/* 状態グロー（疑似要素相当の span。pulse 対象だけ点滅） */}
      {glow && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-xl ${glow.pulse ? "animate-pulse-glow" : ""}`}
          style={{ boxShadow: glow.shadow, opacity: glow.pulse ? undefined : 0.6 }}
        />
      )}
      {/* 直近実行ノードは primary リング点滅を重ねる */}
      {data.isLatest && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl animate-pulse-glow"
          style={{ boxShadow: "0 0 20px 0 rgb(96 165 250 / 0.4), inset 0 0 0 1px rgb(96 165 250 / 0.5)" }}
        />
      )}
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
        {data.group}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: accent }}
        />
        <p className={`truncate text-xs font-medium ${dimmed ? "text-slate-400" : "text-slate-100"}`}>
          {data.label}
        </p>
      </div>
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
});
