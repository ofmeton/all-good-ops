"use client";

import { useState } from "react";

interface Material {
  id: string;
  sourceRef: string | null;
  collectorSessionId: string | null;
}
interface SessionEventRow {
  id: number;
  seq: number;
  type: string;
  payload: Record<string, unknown> | null;
}

export function MaterialProvenance({
  materials,
  loadEvents,
}: {
  materials: Material[];
  loadEvents: (sessionId: string) => Promise<SessionEventRow[]>;
}) {
  if (materials.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs font-semibold text-slate-400">渡された素材（出所）</p>
      <ul className="space-y-1">
        {materials.map((m) => (
          <MaterialRow key={m.id} material={m} loadEvents={loadEvents} />
        ))}
      </ul>
    </div>
  );
}

function MaterialRow({
  material,
  loadEvents,
}: {
  material: Material;
  loadEvents: (sessionId: string) => Promise<SessionEventRow[]>;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<SessionEventRow[] | null>(null);
  const cs = material.collectorSessionId;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && cs && events === null) setEvents(await loadEvents(cs));
  }

  return (
    <li className="rounded border border-white/10 bg-white/[0.04] p-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="truncate text-slate-300">{material.sourceRef ?? material.id}</span>
        {cs ? (
          <button onClick={toggle} className="ml-auto shrink-0 text-indigo-300 hover:underline">
            {open ? "閉じる" : "どう集めたか ↓"}
          </button>
        ) : (
          <span className="ml-auto shrink-0 text-slate-400">出所不明</span>
        )}
      </div>
      {open && cs && (
        <div className="mt-1">
          {events === null ? (
            <p className="text-slate-400">読み込み中…</p>
          ) : events.length === 0 ? (
            <p className="text-slate-400">collector イベントなし。</p>
          ) : (
            <ol className="space-y-0.5">
              {events
                .filter((e) => e.type === "thinking" || e.type === "custom_tool_use")
                .map((e) => (
                  <li key={e.id} className="font-mono text-[11px] text-slate-400">
                    {e.type === "thinking"
                      ? `🧠 ${String(e.payload?.text ?? "")}`
                      : `🔍 ${String(e.payload?.name ?? "")}(${JSON.stringify(e.payload?.input ?? {})})`}
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
