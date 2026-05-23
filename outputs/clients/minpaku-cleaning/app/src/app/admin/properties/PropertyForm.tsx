"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Owner = { id: string; name: string };

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function PropertyForm({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: ownerId,
        name,
        address: address || undefined,
        access_info_note: accessInfo || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("登録に失敗しました");
      return;
    }
    setName("");
    setAddress("");
    setAccessInfo("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>オーナー</span>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>物件名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: ステイ青山"
            className={inputCls}
          />
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>住所（任意）</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="東京都〜"
            className={inputCls}
          />
        </label>
        <label className="block md:col-span-2">
          <span className={labelCls}>アクセス情報・備考（任意）</span>
          <textarea
            value={accessInfo}
            onChange={(e) => setAccessInfo(e.target.value)}
            placeholder="鍵の場所、最寄り駅、注意事項など"
            rows={3}
            className={`${inputCls} h-auto py-2 resize-none`}
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
          {busy ? "登録中..." : "物件を追加"}
        </Button>
      </div>
    </form>
  );
}
