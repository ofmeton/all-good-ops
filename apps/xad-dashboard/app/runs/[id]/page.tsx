import Link from "next/link";
import { runTimeline } from "@/lib/queries";
import { StatusBadge, statusTone } from "../status";

export const dynamic = "force-dynamic";

const TONE_BORDER: Record<string, string> = {
  ok: "#16a34a",
  error: "#dc2626",
  running: "#2563eb",
  skipped: "#475569",
  warn: "#ca8a04",
  idle: "#9ca3af",
};

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, traces } = await runTimeline(id).catch(() => ({
    run: null,
    traces: [] as any[],
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6">
      <Link
        href="/runs"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 no-underline hover:text-slate-800"
      >
        <span aria-hidden>←</span> Runs 一覧へ戻る
      </Link>

      {/* header */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {run?.job ?? "（不明な run）"}
        </h1>
        {run && <StatusBadge status={run.status} />}
        {run?.started_at && (
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {new Date(run.started_at).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      {/* timeline */}
      {traces.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 select-none text-4xl text-slate-300">○</div>
          <p className="text-sm text-slate-500">
            {run ? "この run には工程 trace がありません。" : "指定された run が見つかりません。"}
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {traces.map((t: any) => {
            const tone = statusTone(t.status, t.outcome);
            return (
              <li
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: TONE_BORDER[tone] }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{t.stage_id}</span>
                  <StatusBadge status={t.status} outcome={t.outcome} />
                  {t.input_json?.revision ? (
                    <span className="text-xs text-slate-500">🔁修正</span>
                  ) : null}
                  <span className="ml-auto font-mono text-xs tabular-nums text-slate-400">
                    {new Date(t.started_at).toLocaleTimeString("ja-JP")} · {t.duration_ms ?? "-"}ms
                  </span>
                </div>
                {t.prompt_text && (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                    prompt: {t.prompt_text}
                  </pre>
                )}
                {t.output_json != null && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
                    out: {JSON.stringify(t.output_json, null, 2)}
                  </pre>
                )}
                {t.error && (
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-rose-50 p-2 text-xs text-rose-700">
                    {t.error}
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
