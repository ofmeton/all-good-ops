"use client";

import { useState } from "react";

interface ApprovalFormProps {
  runId: string;
}

interface Feedback {
  visual?: string;
  reviewer?: string;
  sns?: string;
  general?: string;
}

export function ApprovalForm({ runId }: ApprovalFormProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { approved: boolean }>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({});

  function setField(k: keyof Feedback, v: string) {
    setFeedback((p) => ({ ...p, [k]: v }));
  }

  async function submit(approved: boolean) {
    setBusy(true);
    setError(null);
    try {
      const clean: Feedback = {};
      for (const k of ["visual", "reviewer", "sns", "general"] as const) {
        const v = feedback[k]?.trim();
        if (v) clean[k] = v;
      }
      const res = await fetch("/api/approval-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          approved,
          decidedBy: "web-approval-ui",
          ...(Object.keys(clean).length > 0 ? { feedback: clean } : {}),
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
        <p className="muted">フィードバックは次サイクル以降の prompt に反映されます。</p>
      </div>
    );
  }

  return (
    <section className="card">
      <h2>💬 フィードバック (任意)</h2>
      <p className="muted">承認/却下に関わらず、各生成物への指摘を蓄積して次回以降の生成を改善します。</p>

      <label htmlFor="fb-visual">visual (画像プラン) への FB</label>
      <textarea
        id="fb-visual"
        rows={2}
        value={feedback.visual ?? ""}
        onChange={(e) => setField("visual", e.target.value)}
        placeholder="例: ヘッダーが冗長、図解がない"
      />

      <label htmlFor="fb-sns">SNS (X / Instagram) への FB</label>
      <textarea
        id="fb-sns"
        rows={3}
        value={feedback.sns ?? ""}
        onChange={(e) => setField("sns", e.target.value)}
        placeholder="例: tweet が翻訳調、CTA が弱い、9 枚目のスライドのコピーが微妙"
      />

      <label htmlFor="fb-reviewer">reviewer (rubric 評価) への FB</label>
      <textarea
        id="fb-reviewer"
        rows={2}
        value={feedback.reviewer ?? ""}
        onChange={(e) => setField("reviewer", e.target.value)}
        placeholder="例: rubric が緩すぎる、専門用語密度の判定がおかしい"
      />

      <label htmlFor="fb-general">全般 FB</label>
      <textarea
        id="fb-general"
        rows={2}
        value={feedback.general ?? ""}
        onChange={(e) => setField("general", e.target.value)}
        placeholder="例: 全体的にエンジニア寄りで非エンジニアに刺さらない"
      />

      {error && <p style={{ color: "var(--bad)", marginTop: 12 }}>error: {error}</p>}

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => submit(true)}
        >
          {busy ? "送信中…" : "承認 (Y)"}
        </button>
        <button
          type="button"
          className="danger"
          disabled={busy}
          onClick={() => submit(false)}
        >
          却下 (N)
        </button>
      </div>
    </section>
  );
}
