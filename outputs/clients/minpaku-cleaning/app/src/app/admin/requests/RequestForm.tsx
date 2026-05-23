"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type Property = { id: string; name: string };

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function RequestForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        checkin_date: checkin,
        checkout_date: checkout,
        guest_count: guestCount,
        option_memo: memo || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(typeof body?.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    toast.success("依頼を作成しました");
    setCheckin("");
    setCheckout("");
    setGuestCount(1);
    setMemo("");
    startTransition(() => router.refresh());
  }

  const loading = busy || pending;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="block">
          <span className={labelCls}>物件</span>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className={inputCls}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>チェックイン</span>
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>チェックアウト</span>
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>人数</span>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            required
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>オプションメモ（任意）</span>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="特記事項があれば入力"
          className={inputCls}
        />
      </label>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" icon="Check" loading={loading}>
          {loading ? "作成中..." : "依頼を作成"}
        </Button>
      </div>
    </form>
  );
}
