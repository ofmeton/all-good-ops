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
  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">{s.label}</h2>
        <button onClick={onClose} aria-label="close">×</button>
      </div>
      <div className="flex gap-3 my-3 border-b">
        <button className={tab === "def" ? "font-bold border-b-2 border-black" : "text-gray-500"} onClick={() => setTab("def")}>定義</button>
        <button className={tab === "run" ? "font-bold border-b-2 border-black" : "text-gray-500"} onClick={() => setTab("run")}>実行</button>
      </div>
      {tab === "def" ? (
        <div className="text-sm space-y-2">
          <p>{s.purpose}</p>
          <p><b>logic:</b> {s.logicKind}</p>
          <p><b>入力:</b> {s.inputs.join(", ")}</p>
          <p><b>出力:</b> {s.outputs.join(", ")}</p>
          <div><b>主要変数:</b><ul className="list-disc pl-5">{s.keyVariables.map((v) => <li key={v.name}>{v.name}: {v.desc}</li>)}</ul></div>
          {s.promptRef && <p><b>prompt:</b> <a className="text-blue-600 underline" href={GH + s.promptRef}>{s.promptRef}</a></p>}
          <div><b>source:</b><ul className="list-disc pl-5">{s.sourcePaths.map((p) => <li key={p}><a className="text-blue-600 underline" href={GH + p}>{p}</a></li>)}</ul></div>
        </div>
      ) : (
        <div className="text-xs space-y-3">
          {traces.map((t) => (
            <details key={t.id} className="border rounded p-2">
              <summary className="cursor-pointer">{new Date(t.started_at).toLocaleString("ja-JP")} — {t.status}{t.outcome ? `/${t.outcome}` : ""} {t.input_json?.revision ? "🔁修正" : ""} ({t.duration_ms ?? "-"}ms)</summary>
              {t.prompt_text && <pre className="whitespace-pre-wrap bg-gray-50 p-2 mt-1">prompt: {t.prompt_text}</pre>}
              {t.input_json && <pre className="whitespace-pre-wrap bg-gray-50 p-2 mt-1">in: {JSON.stringify(t.input_json, null, 2)}</pre>}
              {t.output_json != null && <pre className="whitespace-pre-wrap bg-gray-50 p-2 mt-1">out: {JSON.stringify(t.output_json, null, 2)}</pre>}
              <p className="mt-1">{t.model ?? ""} / in {t.tokens_in ?? "-"} / out {t.tokens_out ?? "-"} / ¥{t.cost_jpy ?? "-"}</p>
              {t.error && <pre className="text-red-600">{t.error}</pre>}
            </details>
          ))}
          {traces.length === 0 && <p className="text-gray-500">まだ実行記録がありません</p>}
        </div>
      )}
    </div>
  );
}
