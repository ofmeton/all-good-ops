"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

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
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>氏名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: 山田 花子"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>メールアドレス</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            placeholder="admin@example.com"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>初期パスワード（8文字以上）</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            placeholder="••••••••"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>権限レベル</span>
          <input
            type="number"
            min={1}
            value={roleLevel}
            onChange={(e) => setRoleLevel(Number(e.target.value))}
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
          {busy ? "追加中..." : "管理者を追加"}
        </Button>
      </div>
    </form>
  );
}
