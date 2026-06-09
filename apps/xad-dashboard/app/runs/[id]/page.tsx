import Link from "next/link";
import { runTimeline, sessionEvents, composeProvenance } from "@/lib/queries";
import { consoleSessionUrl } from "@/lib/console-link";
import { StatusBadge, statusTone } from "../status";
import { SessionTrace } from "./SessionTrace";
import { MaterialProvenance } from "./MaterialProvenance";

export const dynamic = "force-dynamic";

const TONE_BORDER: Record<string, string> = {
  ok: "#16a34a",
  error: "#dc2626",
  running: "#2563eb",
  skipped: "#475569",
  warn: "#ca8a04",
  idle: "#9ca3af",
};

// client から呼ぶ素材→collector イベントの遅延ロード（server action）。
async function loadCollectorEvents(sessionId: string) {
  "use server";
  const rows = await sessionEvents(sessionId);
  return rows as { id: number; seq: number; type: string; payload: Record<string, unknown> | null }[];
}

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, traces, sessions } = await runTimeline(id).catch(() => ({
    run: null,
    traces: [] as any[],
    sessions: [] as any[],
  }));

  // 各 stage の session ごとに events と（compose は）provenance を事前取得。
  const sessionBlocks = await Promise.all(
    (sessions as any[]).map(async (s) => {
      const events = await sessionEvents(s.session_id);
      const provenance =
        s.stage_id === "compose"
          ? await (async () => {
              const { serverSupabase } = await import("@/lib/supabase");
              const sb = serverSupabase();
              const { data: d } = await sb
                .from("post_drafts")
                .select("id")
                .eq("writer_session_id", s.session_id)
                .single();
              return d ? await composeProvenance((d as { id: string }).id) : null;
            })()
          : null;
      return { session: s, events, provenance };
    }),
  );
  const blocksByStage = sessionBlocks.reduce<Record<string, typeof sessionBlocks>>((acc, b) => {
    (acc[b.session.stage_id] ??= []).push(b);
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6">
      <Link
        href="/runs"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 no-underline hover:text-slate-800"
      >
        <span aria-hidden>←</span> Runs 一覧へ戻る
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{run?.job ?? "（不明な run）"}</h1>
        {run && <StatusBadge status={run.status} />}
        {run?.started_at && (
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {new Date(run.started_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 select-none text-4xl text-slate-300">○</div>
          <p className="text-sm text-slate-500">
            {run ? "この run には工程 trace がありません。" : "指定された run が見つかりません。"}
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {(traces as any[]).map((t) => {
            const tone = statusTone(t.status, t.outcome);
            const blocks = blocksByStage[t.stage_id] ?? [];
            return (
              <li
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: TONE_BORDER[tone] }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{t.stage_id}</span>
                  <StatusBadge status={t.status} outcome={t.outcome} />
                  {t.input_json?.revision ? <span className="text-xs text-slate-500">🔁修正</span> : null}
                  <span className="ml-auto font-mono text-xs tabular-nums text-slate-400">
                    {new Date(t.started_at).toLocaleTimeString("ja-JP")} · {t.duration_ms ?? "-"}ms
                  </span>
                </div>

                {t.error && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-rose-50 p-2 text-xs text-rose-700">{t.error}</pre>
                )}

                {blocks.map((b) => (
                  <div key={b.session.id}>
                    <SessionTrace
                      events={b.events as any}
                      sessionId={b.session.session_id}
                      consoleUrl={consoleSessionUrl(b.session.session_id)}
                    />
                    {b.provenance && (
                      <MaterialProvenance materials={b.provenance.materials} loadEvents={loadCollectorEvents} />
                    )}
                  </div>
                ))}

                {blocks.length === 0 && t.output_json != null && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                    out: {JSON.stringify(t.output_json, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
