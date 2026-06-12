"use client";
import { useEffect, useState } from "react";
import { stageById } from "@/lib/registry";
const GH = "https://github.com/ofmeton/all-good-ops/blob/main/";
type TraceRow = {
  id: number; started_at: string; status: string; outcome?: string | null;
  duration_ms?: number | null; prompt_text?: string | null;
  input_json?: Record<string, unknown> | null; output_json?: unknown;
  model?: string | null; tokens_in?: number | null; tokens_out?: number | null;
  cost_jpy?: number | null; error?: string | null;
};
export function NodePanel({ stageId, onClose }: { stageId: string; onClose: () => void }) {
  const s = stageById(stageId);
  const [tab, setTab] = useState<"def" | "run">("def");
  const [traces, setTraces] = useState<TraceRow[]>([]);
  useEffect(() => {
    if (tab === "run") fetch(`/api/stage/${stageId}`).then((r) => r.json()).then(setTraces).catch(() => setTraces([]));
  }, [tab, stageId]);
  if (!s) return null;
  const tabBtn = (active: boolean) =>
    [
      "px-3 py-1.5 text-sm font-medium -mb-px border-b-2 transition-colors",
      active
        ? "border-blue-400 text-white"
        : "border-transparent text-slate-400 hover:text-slate-200",
    ].join(" ");
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {s.group}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-white">{s.label}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="パネルを閉じる"
          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
      <div className="my-3 flex gap-1 border-b border-white/10" role="tablist">
        <button role="tab" aria-selected={tab === "def"} className={tabBtn(tab === "def")} onClick={() => setTab("def")}>定義</button>
        <button role="tab" aria-selected={tab === "run"} className={tabBtn(tab === "run")} onClick={() => setTab("run")}>実行</button>
      </div>
      {tab === "def" ? (
        <div className="space-y-2 text-sm text-slate-300">
          <p className="leading-relaxed">{s.purpose}</p>
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-amber-300">
            <b className="text-amber-200">🎯 目的関数:</b> {s.objectiveFunction}
          </p>
          <p><b className="text-slate-100">logic:</b> {s.logicKind}</p>
          <p><b className="text-slate-100">入力:</b> {s.inputs.join(", ")}</p>
          <p><b className="text-slate-100">出力:</b> {s.outputs.join(", ")}</p>
          <div><b className="text-slate-100">主要変数:</b><ul className="list-disc space-y-0.5 pl-5">{s.keyVariables.map((v) => <li key={v.name}><span className="font-mono text-xs text-slate-400">{v.name}</span>: {v.desc}</li>)}</ul></div>
          {s.promptRef && <p><b className="text-slate-100">prompt:</b> <a className="text-blue-300 underline hover:text-blue-200" href={GH + s.promptRef}>{s.promptRef}</a></p>}
          <div><b className="text-slate-100">source:</b><ul className="list-disc space-y-0.5 pl-5">{s.sourcePaths.map((p) => <li key={p}><a className="break-all font-mono text-xs text-blue-300 underline hover:text-blue-200" href={GH + p}>{p}</a></li>)}</ul></div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          {traces.map((t) => (
            <details key={t.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
              <summary className="cursor-pointer select-none text-slate-300">{new Date(t.started_at).toLocaleString("ja-JP")} — <span className="font-medium">{t.status}{t.outcome ? `/${t.outcome}` : ""}</span> {t.input_json?.revision ? "🔁修正" : ""} <span className="text-slate-400">({t.duration_ms ?? "-"}ms)</span></summary>
              {t.prompt_text && <pre className="mt-1 whitespace-pre-wrap rounded bg-white/[0.03] p-2 text-slate-300">prompt: {t.prompt_text}</pre>}
              {t.input_json && <pre className="mt-1 whitespace-pre-wrap rounded bg-white/[0.03] p-2 text-slate-300">in: {JSON.stringify(t.input_json, null, 2)}</pre>}
              {t.output_json != null && <pre className="mt-1 whitespace-pre-wrap rounded bg-white/[0.03] p-2 text-slate-300">out: {JSON.stringify(t.output_json, null, 2)}</pre>}
              <p className="mt-1 text-slate-400">{t.model ?? ""} / in {t.tokens_in ?? "-"} / out {t.tokens_out ?? "-"} / ¥{t.cost_jpy ?? "-"}</p>
              {t.error && <pre className="mt-1 whitespace-pre-wrap rounded bg-rose-400/10 p-2 text-rose-300">{t.error}</pre>}
            </details>
          ))}
          {traces.length === 0 && <p className="py-6 text-center text-slate-400">まだ実行記録がありません</p>}
        </div>
      )}
    </div>
  );
}
