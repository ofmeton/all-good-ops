import { notFound } from "next/navigation";

import { getSupabase, hasSupabase, type PublishQueueRow } from "../../../lib/supabase";
import type { Draft, SnsContent, Visuals } from "../../../lib/agents";
import { ApprovalForm } from "./approval-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ runId: string }>;
}

interface QueueSnapshot {
  draft: Draft;
  visuals: Visuals;
  sns: SnsContent;
  status: PublishQueueRow["status"];
}

async function loadQueueRow(runId: string): Promise<QueueSnapshot | null> {
  if (!hasSupabase()) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("publish_queue")
    .select("draft, visuals, sns_content, status")
    .eq("workflow_run_id", runId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    draft: data["draft"] as Draft,
    visuals: data["visuals"] as Visuals,
    sns: data["sns_content"] as SnsContent,
    status: data["status"] as PublishQueueRow["status"],
  };
}

export default async function ApprovalQueuePage({ params }: PageProps) {
  const { runId } = await params;
  const row = await loadQueueRow(runId);

  if (!row) {
    if (!hasSupabase()) {
      return (
        <main>
          <h1>approval queue</h1>
          <p className="muted">run: {runId}</p>
          <div className="card">
            <strong>Supabase 未設定</strong>
          </div>
        </main>
      );
    }
    notFound();
  }

  const alreadyDecided = row.status !== "pending";

  return (
    <main>
      <h1>approval queue</h1>
      <p className="muted">
        run: <code>{runId}</code> / status: <strong>{row.status}</strong>
      </p>

      <section className="card">
        <h2>📝 note draft</h2>
        <p><strong>{row.draft.title}</strong></p>
        <pre>{row.draft.body}</pre>
      </section>

      <section className="card">
        <h2>🐦 X tweet</h2>
        <pre>{row.sns.tweet}</pre>
      </section>

      <section className="card">
        <h2>📸 Instagram carousel ({row.sns.carousel.length} slides)</h2>
        <ul>
          {row.sns.carousel.map((slide) => (
            <li key={slide.slideIndex}>#{slide.slideIndex}: {slide.caption}</li>
          ))}
        </ul>
      </section>

      {alreadyDecided ? (
        <div className="card">
          <strong>このランは既に {row.status} で確定済みです。</strong>
        </div>
      ) : (
        <ApprovalForm runId={runId} />
      )}
    </main>
  );
}
