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
  noteUrl: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
}

async function loadQueueRow(runId: string): Promise<QueueSnapshot | null> {
  if (!hasSupabase()) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("publish_queue")
    .select(
      "draft, visuals, sns_content, status, note_url, x_url, instagram_url",
    )
    .eq("workflow_run_id", runId)
    .maybeSingle();
  if (error) {
    console.error("[approval-queue] load failed", error.message);
    return null;
  }
  if (!data) return null;
  return {
    draft: data.draft as Draft,
    visuals: data.visuals as Visuals,
    sns: data.sns_content as SnsContent,
    status: data.status as PublishQueueRow["status"],
    noteUrl: (data.note_url as string | null) ?? null,
    xUrl: (data.x_url as string | null) ?? null,
    instagramUrl: (data.instagram_url as string | null) ?? null,
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
            <p>
              SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定のため queue を取得できません。
              <br />
              .env.local を更新し dev server を再起動してください。
            </p>
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

      <section className="card" id="note">
        <h2>📝 note draft</h2>
        <p>
          <strong>{row.draft.title}</strong>
        </p>
        <pre>{row.draft.body}</pre>
        {row.draft.references.length > 0 && (
          <p className="muted">refs: {row.draft.references.join(" / ")}</p>
        )}
      </section>

      <section className="card" id="visuals">
        <h2>🖼️ visuals</h2>
        {row.visuals.headerImageUrl ? (
          <p>
            header:{" "}
            <a href={row.visuals.headerImageUrl} target="_blank" rel="noreferrer">
              {row.visuals.headerImageUrl}
            </a>
          </p>
        ) : (
          <p className="muted">header image: none</p>
        )}
        {row.visuals.figures.length > 0 && (
          <div className="image-grid">
            {row.visuals.figures.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer">
                <img src={f.url} alt={f.caption} />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="card" id="x">
        <h2>🐦 X tweet</h2>
        <pre>{row.sns.tweet}</pre>
        {row.sns.tweetImageUrl && (
          <p>
            image:{" "}
            <a href={row.sns.tweetImageUrl} target="_blank" rel="noreferrer">
              {row.sns.tweetImageUrl}
            </a>
          </p>
        )}
      </section>

      <section className="card" id="instagram">
        <h2>📸 Instagram carousel ({row.sns.carousel.length} slides)</h2>
        {row.sns.carousel.length > 0 && (
          <div className="image-grid">
            {row.sns.carousel.map((slide) => (
              <a
                key={slide.slideIndex}
                href={slide.imageUrl}
                target="_blank"
                rel="noreferrer"
                title={slide.caption}
              >
                <img src={slide.imageUrl} alt={slide.caption} />
              </a>
            ))}
          </div>
        )}
      </section>

      {alreadyDecided ? (
        <div className="card">
          <strong>このランは既に {row.status} で確定済みです。</strong>
          {row.noteUrl && (
            <p>
              note: <a href={row.noteUrl}>{row.noteUrl}</a>
            </p>
          )}
          {row.xUrl && (
            <p>
              X: <a href={row.xUrl}>{row.xUrl}</a>
            </p>
          )}
          {row.instagramUrl && (
            <p>
              Instagram: <a href={row.instagramUrl}>{row.instagramUrl}</a>
            </p>
          )}
        </div>
      ) : (
        <ApprovalForm runId={runId} />
      )}
    </main>
  );
}
