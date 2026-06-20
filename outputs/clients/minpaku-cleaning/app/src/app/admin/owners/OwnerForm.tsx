"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type OwnerValues = {
  id: string;
  name: string;
  email: string | null;
  line_user_id: string | null;
};

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function OwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      toast.error("登録に失敗しました");
      return;
    }
    toast.success(`オーナー「${name}」を追加しました`);
    setName("");
    setEmail("");
    setLineId("");
    startTransition(() => router.refresh());
  }

  const loading = busy || pending;

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
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon="Check" loading={loading}>
          {loading ? "登録中..." : "オーナーを追加"}
        </Button>
      </div>
    </form>
  );
}

export function OwnerActions({ owner }: { owner: OwnerValues }) {
  const router = useRouter();
  const [name, setName] = useState(owner.name);
  const [email, setEmail] = useState(owner.email ?? "");
  const [lineId, setLineId] = useState(owner.line_user_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("save");
    const res = await fetch("/api/admin/owners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: owner.id,
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      const message = typeof b?.error === "string" ? b.error : "更新に失敗しました";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success(`オーナー「${name}」を更新しました`);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!window.confirm(`オーナー「${owner.name}」を削除しますか？`)) return;
    setError(null);
    setBusy("delete");
    const res = await fetch(`/api/admin/owners?id=${owner.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      const message = typeof b?.error === "string" ? b.error : "削除に失敗しました";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success(`オーナー「${owner.name}」を削除しました`);
    startTransition(() => router.refresh());
  }

  const loading = Boolean(busy) || pending;

  return (
    <form onSubmit={save} className="mt-4 space-y-3 border-t border-ink-100 pt-4">
      {error && (
        <p className="text-[12px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className={labelCls}>オーナー名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="danger"
          icon="Trash2"
          loading={busy === "delete"}
          disabled={loading}
          onClick={remove}
        >
          削除
        </Button>
        <Button
          type="submit"
          variant="secondary"
          icon="Save"
          loading={busy === "save" || pending}
          disabled={loading}
        >
          保存
        </Button>
      </div>
    </form>
  );
}
