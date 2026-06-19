"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";

export function ProfilePanel({
  token,
  email: initialEmail,
}: {
  token: string;
  email: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/staff/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email: email || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "プロフィールの保存に失敗しました");
      return;
    }
    setSaved(true);
    startTransition(() => router.refresh());
  }

  const loading = busy || pending;

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="UserCog" size={16} />
          </div>
          <h2 className="text-[14px] font-bold text-ink-900">プロフィール</h2>
        </div>
        {error && (
          <p className="text-[12px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-[12px] text-brand-700 bg-brand-50 px-3 py-2 rounded-lg">
            メールアドレスを保存しました。
          </p>
        )}
        <label className="block">
          <span className="block text-[11.5px] text-ink-600 font-medium mb-1.5">
            メールアドレス
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="staff@example.com"
            className={inputCls}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="secondary" icon="MessageCircle" disabled>
            LINE連携 近日対応
          </Button>
          <Button type="submit" variant="primary" icon="Save" loading={loading}>
            保存
          </Button>
        </div>
      </form>
    </Card>
  );
}
