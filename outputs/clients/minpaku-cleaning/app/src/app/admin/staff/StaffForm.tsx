"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };

export function StaffForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setEmail(""); setLineId(""); setPropertyIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="スタッフ名" className="w-full border rounded px-2 py-1" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
        placeholder="メールアドレス（任意）" className="w-full border rounded px-2 py-1" />
      <input value={lineId} onChange={(e) => setLineId(e.target.value)}
        placeholder="LINEユーザーID（任意）" className="w-full border rounded px-2 py-1" />
      <fieldset className="border rounded p-2">
        <legend className="text-sm text-gray-500">担当物件</legend>
        {properties.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={propertyIds.includes(p.id)}
              onChange={() => toggle(p.id)} />
            {p.name}
          </label>
        ))}
      </fieldset>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        スタッフを追加
      </button>
    </form>
  );
}
