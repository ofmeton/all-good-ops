import { runTimeline } from "@/lib/queries";
export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run, traces } = await runTimeline(id).catch(() => ({ run: null, traces: [] as any[] }));
  return (
    <main className="p-4">
      <h1 className="font-bold text-xl">{run?.job} <span className="text-sm">({run?.status})</span></h1>
      <ol className="mt-4 space-y-3">
        {traces.map((t: any) => (
          <li key={t.id} className="border-l-4 pl-3" style={{ borderColor: t.status === "error" ? "#dc2626" : t.status === "skipped" ? "#475569" : "#16a34a" }}>
            <div className="text-sm font-semibold">
              {t.stage_id}{t.outcome ? ` — ${t.outcome}` : ""} {t.input_json?.revision ? "🔁修正" : ""}
              <span className="font-normal text-gray-500"> {new Date(t.started_at).toLocaleTimeString("ja-JP")} ({t.duration_ms ?? "-"}ms)</span>
            </div>
            {t.prompt_text && <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2">prompt: {t.prompt_text}</pre>}
            {t.output_json != null && <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2">out: {JSON.stringify(t.output_json, null, 2)}</pre>}
          </li>
        ))}
      </ol>
    </main>
  );
}
