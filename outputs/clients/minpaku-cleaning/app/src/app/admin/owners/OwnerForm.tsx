"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function OwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("登録に失敗しました");
      return;
    }
    setName("");
    setEmail("");
    setLineId("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className={labelCls}>オーナー名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: 田中 一郎"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>メールアドレス（任意）</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="owner@example.com"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>LINE ユーザーID（任意）</span>
          <input
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="U で始まる文字列"
            className={inputCls}
          />
        </label>
      </div>
      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon="Check" disabled={busy}>
          {busy ? "登録中..." : "オーナーを追加"}
        </Button>
      </div>
    </form>
  );
}
