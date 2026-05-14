"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Owner = { id: string; name: string };

export function PropertyForm({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: ownerId, name, address: address || undefined }),
    });
    if (!res.ok) { setError("登録に失敗しました"); return; }
    setName(""); setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
        className="w-full border rounded px-2 py-1">
        {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} required
        placeholder="物件名" className="w-full border rounded px-2 py-1" />
      <input value={address} onChange={(e) => setAddress(e.target.value)}
        placeholder="住所（任意）" className="w-full border rounded px-2 py-1" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">
        物件を追加
      </button>
    </form>
  );
}
