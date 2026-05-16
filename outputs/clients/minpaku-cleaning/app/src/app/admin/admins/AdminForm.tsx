"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roleLevel, setRoleLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role_level: roleLevel }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "追加に失敗しました");
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setRoleLevel(1);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="氏名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} required
        type="email" placeholder="メールアドレス"
        className="w-full border rounded px-2 py-1" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} required
        type="password" placeholder="初期パスワード（8文字以上）"
        className="w-full border rounded px-2 py-1" />
      <label className="block text-sm">
        権限レベル
        <input type="number" min={1} value={roleLevel}
          onChange={(e) => setRoleLevel(Number(e.target.value))}
          className="w-full border rounded px-2 py-1" />
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={busy}
        className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50">
        管理者を追加
      </button>
    </form>
  );
}
