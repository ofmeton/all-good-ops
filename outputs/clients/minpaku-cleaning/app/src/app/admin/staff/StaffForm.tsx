"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Property = { id: string; name: string };

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function StaffForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
        property_ids: propertyIds,
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
    setPropertyIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className={labelCls}>氏名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: 田中 太郎"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>メールアドレス（任意）</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="staff@example.com"
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
      {properties.length > 0 && (
        <fieldset className="rounded-lg ring-1 ring-ink-200 bg-white p-3">
          <legend className="px-1.5 text-[11.5px] text-ink-600 font-medium">担当物件</legend>
          <div className="flex flex-wrap gap-2">
            {properties.map((p) => {
              const on = propertyIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] cursor-pointer ${
                    on
                      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                      : "ring-1 ring-ink-200 text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(p.id)}
                    className="sr-only"
                  />
                  {p.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon="Check" disabled={busy}>
          {busy ? "登録中..." : "スタッフを追加"}
        </Button>
      </div>
    </form>
  );
}
