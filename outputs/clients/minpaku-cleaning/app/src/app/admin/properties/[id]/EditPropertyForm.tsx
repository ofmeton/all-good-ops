"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Owner = { id: string; name: string };
type Property = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  access_info_note: string | null;
};

export function EditPropertyForm({
  property,
  owners,
}: {
  property: Property;
  owners: Owner[];
}) {
  const router = useRouter();
  const [name, setName] = useState(property.name);
  const [ownerId, setOwnerId] = useState(property.owner_id);
  const [address, setAddress] = useState(property.address ?? "");
  const [accessInfoNote, setAccessInfoNote] = useState(property.access_info_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: property.id,
        owner_id: ownerId,
        name,
        address: address || undefined,
        access_info_note: accessInfoNote || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("保存に失敗しました");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm(`物件「${property.name}」を削除します。よろしいですか？`)) return;
    setError(null);
    setDeleting(true);
    const res = await fetch(`/api/admin/properties?id=${property.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      setError("削除に失敗しました");
      return;
    }
    router.push("/admin/properties");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <label className="block text-sm text-gray-600">オーナー</label>
      <select
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        className="w-full border rounded px-2 py-1"
      >
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <label className="block text-sm text-gray-600">物件名</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border rounded px-2 py-1"
      />
      <label className="block text-sm text-gray-600">住所</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="任意"
        className="w-full border rounded px-2 py-1"
      />
      <label className="block text-sm text-gray-600">アクセス情報・備考</label>
      <textarea
        value={accessInfoNote}
        onChange={(e) => setAccessInfoNote(e.target.value)}
        placeholder="任意（鍵の場所、ゴミ捨て曜日など）"
        rows={3}
        className="w-full border rounded px-2 py-1"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="border border-red-600 text-red-600 rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          {deleting ? "削除中..." : "この物件を削除"}
        </button>
      </div>
    </form>
  );
}
