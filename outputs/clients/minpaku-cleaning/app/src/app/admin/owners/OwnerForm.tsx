"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
      }),
    });
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setEmail(""); setLineId("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="オーナー名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
        placeholder="メールアドレス（任意）" className="w-full border rounded px-2 py-1" />
      <input value={lineId} onChange={(e) => setLineId(e.target.value)}
        placeholder="LINEユーザーID（任意）" className="w-full border rounded px-2 py-1" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        オーナーを追加
      </button>
    </form>
  );
}
