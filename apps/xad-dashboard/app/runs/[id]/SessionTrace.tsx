"use client";

interface SessionEventRow {
  id: number;
  seq: number;
  type: string;
  payload: Record<string, unknown> | null;
}

const TYPE_LABEL: Record<string, string> = {
  thinking: "🧠 思考",
  text: "💬 出力",
  custom_tool_use: "🔧 ツール呼び出し",
  custom_tool_result: "📥 取得結果（出所）",
  model_request_end: "📊 モデル",
};

function payloadText(type: string, p: Record<string, unknown> | null): string {
  if (!p) return "";
  if (type === "thinking" || type === "text") return String(p.text ?? "");
  if (type === "custom_tool_use") return `${String(p.name ?? "")}(${JSON.stringify(p.input ?? {})})`;
  if (type === "custom_tool_result") return String(p.result ?? "");
  if (type === "model_request_end") return JSON.stringify(p.model_usage ?? {});
  return JSON.stringify(p);
}

export function SessionTrace({
  events,
  sessionId,
  consoleUrl,
}: {
  events: SessionEventRow[];
  sessionId: string;
  consoleUrl: string | null;
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        <span className="font-mono">session {sessionId.slice(0, 12)}…</span>
        {consoleUrl && (
          <a href={consoleUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            Console ↗
          </a>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-slate-400">このセッションのイベントは記録されていません。</p>
      ) : (
        <ol className="space-y-1">
          {events.map((e) => (
            <li key={e.id} className="rounded bg-white p-1.5 text-xs">
              <span className="mr-2 font-medium text-slate-600">{TYPE_LABEL[e.type] ?? e.type}</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700">
                {payloadText(e.type, e.payload)}
              </pre>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
