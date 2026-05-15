"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };

export function RequestForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "登録に失敗しました",
      );
      return;
    }
    setCheckin("");
    setCheckout("");
    setGuestCount(1);
    setMemo("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <select
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        className="w-full border rounded px-2 py-1"
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <label className="flex-1 text-sm">
          チェックイン
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          />
        </label>
        <label className="flex-1 text-sm">
          チェックアウト
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          />
        </label>
      </div>
      <label className="block text-sm">
        人数
        <input
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          required
          className="w-full border rounded px-2 py-1"
        />
      </label>
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="オプションメモ（任意）"
        className="w-full border rounded px-2 py-1"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-black text-white rounded px-3 py-1 text-sm"
      >
        依頼を作成
      </button>
    </form>
  );
}
