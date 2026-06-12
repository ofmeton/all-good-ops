import Link from "next/link";
import { runTimeline, sessionEvents, composeProvenanceByWriterSession } from "@/lib/queries";
import { consoleSessionUrl } from "@/lib/console-link";
import { StatusBadge, statusTone } from "../status";
import { SessionTrace } from "./SessionTrace";
import { MaterialProvenance } from "./MaterialProvenance";

export const dynamic = "force-dynamic";

/** ダーク輝度版（globals.css の --st-* と一致） */
const TONE_BORDER: Record<string, string> = {
  ok: "#34d399",
  error: "#fb7185",
  running: "#60a5fa",
  skipped: "#64748b",
  warn: "#fbbf24",
  idle: "#475569",
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
        s.stage_id === "compose" ? await composeProvenanceByWriterSession(s.session_id) : null;
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
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 no-underline hover:text-white"
      >
        <span aria-hidden>←</span> Runs 一覧へ戻る
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-white">{run?.job ?? "（不明な run）"}</h1>
        {run && <StatusBadge status={run.status} />}
        {run?.started_at && (
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {new Date(run.started_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="glass mt-6 py-16 text-center">
          <div className="mb-3 select-none text-4xl text-slate-600">○</div>
          <p className="text-sm text-slate-400">
            {run ? "この run には工程 trace がありません。" : "指定された run が見つかりません。"}
          </p>
        </div>
      ) : (
        <ol className="relative mt-5 space-y-3 pl-5">
          {/* タイムライン縦ライン（上から描画される） */}
          <span
            aria-hidden
            className="absolute bottom-2 left-1 top-2 w-px origin-top animate-draw-line bg-gradient-to-b from-blue-400/50 via-white/15 to-transparent"
          />
          {(traces as any[]).map((t, i) => {
            const tone = statusTone(t.status, t.outcome);
            const blocks = blocksByStage[t.stage_id] ?? [];
            return (
              <li
                key={t.id}
                className="stagger-in glass relative p-3"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: TONE_BORDER[tone],
                  "--i": Math.min(i, 12),
                } as React.CSSProperties}
              >
                {/* タイムライン上の状態ドット（グロー付き） */}
                <span
                  aria-hidden
                  className="absolute -left-[1.22rem] top-4 h-2 w-2 rounded-full"
                  style={{
                    background: TONE_BORDER[tone],
                    boxShadow: `0 0 8px 1px ${TONE_BORDER[tone]}66`,
                  }}
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-100">{t.stage_id}</span>
                  <StatusBadge status={t.status} outcome={t.outcome} />
                  {t.input_json?.revision ? <span className="text-xs text-slate-400">🔁修正</span> : null}
                  <span className="ml-auto font-mono text-xs tabular-nums text-slate-400">
                    {new Date(t.started_at).toLocaleTimeString("ja-JP")} · {t.duration_ms ?? "-"}ms
                  </span>
                </div>

                {t.error && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-rose-400/10 p-2 text-xs text-rose-300">{t.error}</pre>
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
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-white/[0.03] p-2 text-xs text-slate-300">
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
