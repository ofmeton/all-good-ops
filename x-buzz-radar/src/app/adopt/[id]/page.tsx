"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface GeneratedItem {
  platform: string;
  draft_id: string;
  variant_id: string;
}

export default function AdoptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const buzzId = params.id;
  const [platforms, setPlatforms] = useState<string[]>([
    "x",
    "instagram",
    "note",
  ]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<GeneratedItem[] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function adopt() {
    if (platforms.length === 0) {
      setErr("最低 1 媒体を選んでください");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      await fetch("/api/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buzz_id: buzzId, action: "adopt" }),
      });
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buzz_id: buzzId, platforms }),
      });
      const json = (await res.json()) as { generated: GeneratedItem[] };
      setDrafts(json.generated);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!rejectReason) {
      setErr("理由を入力してください");
      return;
    }
    setErr(null);
    await fetch("/api/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buzz_id: buzzId,
        action: "reject",
        rejection_reason: rejectReason,
      }),
    });
    router.push("/");
  }

  async function saveForLater() {
    await fetch("/api/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buzz_id: buzzId, action: "save_for_later" }),
    });
    router.push("/");
  }

  return (
    <main>
      <h1>Adopt / Reject</h1>
      <p>
        <a href="/">← 一覧に戻る</a>
      </p>
      {err && <div className="card" style={{ background: "#fee2e2", color: "#b91c1c" }}>{err}</div>}

      <div className="card">
        <h2>採用 + 媒体別ドラフト生成</h2>
        <p>媒体を選択（複数可）:</p>
        {["x", "instagram", "note"].map((p) => (
          <label key={p} style={{ marginRight: "1rem" }}>
            <input
              type="checkbox"
              checked={platforms.includes(p)}
              onChange={() => togglePlatform(p)}
            />{" "}
            {p}
          </label>
        ))}
        <div style={{ marginTop: "0.5rem" }}>
          <button onClick={adopt} disabled={loading}>
            {loading ? "生成中..." : "Adopt + Generate"}
          </button>
          <button className="secondary" onClick={saveForLater} disabled={loading}>
            Save for later
          </button>
        </div>
      </div>

      {drafts && (
        <div className="card">
          <h2>生成完了 ({drafts.length} 媒体)</h2>
          <ul style={{ paddingLeft: "1.5rem" }}>
            {drafts.map((d) => (
              <li key={d.draft_id}>
                <strong>{d.platform}</strong>: draft_id={d.draft_id.slice(0, 8)}…
                variant={d.variant_id.slice(0, 8)}…
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "0.5rem" }}>
            <a href="/posts">投稿管理画面でドラフト確認 →</a>
          </p>
        </div>
      )}

      <div className="card">
        <h2>Reject</h2>
        <input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="rejection reason (例: 日本市場合わず / 使い古された)"
          style={{ width: "60%" }}
        />
        <button className="danger" onClick={reject}>
          Reject
        </button>
      </div>
    </main>
  );
}
