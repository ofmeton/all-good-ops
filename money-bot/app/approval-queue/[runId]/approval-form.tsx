"use client";

import { useState } from "react";

interface ApprovalFormProps {
  runId: string;
}

interface Edits {
  title?: string;
  body?: string;
  snsTweet?: string;
}

export function ApprovalForm({ runId }: ApprovalFormProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { approved: boolean }>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Edits>({});

  async function submit(approved: boolean) {
    setBusy(true);
    setError(null);
    try {
      const cleanEdits: Edits = {};
      if (edits.title?.trim()) cleanEdits.title = edits.title.trim();
      if (edits.body?.trim()) cleanEdits.body = edits.body.trim();
      if (edits.snsTweet?.trim()) cleanEdits.snsTweet = edits.snsTweet.trim();

      const res = await fetch("/api/approval-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          approved,
          ...(Object.keys(cleanEdits).length > 0 ? { edits: cleanEdits } : {}),
          decidedBy: "web-approval-ui",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(`status ${res.status}: ${JSON.stringify(json.error)}`);
      }
      setDone({ approved });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card">
        <strong>{done.approved ? "承認しました ✅" : "却下しました ❌"}</strong>
        <p className="muted">ワークフローが再開されます。数十秒後にこのページを再読込してください。</p>
      </div>
    );
  }

  return (
    <section className="card">
      <h2>編集 (任意)</h2>
      <label htmlFor="title">title</label>
      <input
        id="title"
        type="text"
        value={edits.title ?? ""}
        onChange={(e) => setEdits((p) => ({ ...p, title: e.target.value }))}
        placeholder="差し替える title (空なら元のまま)"
      />
      <label htmlFor="body">body</label>
      <textarea
        id="body"
        rows={6}
        value={edits.body ?? ""}
        onChange={(e) => setEdits((p) => ({ ...p, body: e.target.value }))}
        placeholder="差し替える body (空なら元のまま)"
      />
      <label htmlFor="snsTweet">X tweet</label>
      <textarea
        id="snsTweet"
        rows={3}
        value={edits.snsTweet ?? ""}
        onChange={(e) => setEdits((p) => ({ ...p, snsTweet: e.target.value }))}
        placeholder="差し替える tweet 本文 (空なら元のまま)"
      />

      {error && (
        <p style={{ color: "var(--bad)", marginTop: 12 }}>error: {error}</p>
      )}

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => submit(true)}
        >
          {busy ? "送信中…" : "承認する (Y)"}
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => submit(false)}
        >
          却下する (N)
        </button>
      </div>
    </section>
  );
}
