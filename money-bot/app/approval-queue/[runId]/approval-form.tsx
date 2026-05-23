"use client";

import { useState } from "react";

interface ApprovalFormProps {
  runId: string;
}

export function ApprovalForm({ runId }: ApprovalFormProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { approved: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(approved: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/approval-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, approved, decidedBy: "web-approval-ui" }),
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
        <p className="muted">workflow が再開されます。</p>
      </div>
    );
  }

  return (
    <section className="card">
      {error && <p style={{ color: "var(--bad)" }}>error: {error}</p>}
      <div className="actions">
        <button type="button" className="primary" disabled={busy} onClick={() => submit(true)}>
          {busy ? "送信中…" : "承認 (Y)"}
        </button>
        <button type="button" className="danger" disabled={busy} onClick={() => submit(false)}>
          却下 (N)
        </button>
      </div>
    </section>
  );
}
