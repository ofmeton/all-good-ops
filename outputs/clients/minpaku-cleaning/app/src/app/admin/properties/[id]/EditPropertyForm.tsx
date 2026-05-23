"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Owner = { id: string; name: string };
type Property = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  access_info_note: string | null;
};

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

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
    const res = await fetch(`/api/admin/properties?id=${property.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setError("削除に失敗しました");
      return;
    }
    router.push("/admin/properties");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div
        className="grid gap-x-6 gap-y-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
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
            className={inputCls}
          />
        </label>
        <label className="block md:col-span-2" style={{ gridColumn: "1 / -1" }}>
          <span className={labelCls}>住所</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="任意"
            className={inputCls}
          />
        </label>
        <label className="block md:col-span-2" style={{ gridColumn: "1 / -1" }}>
          <span className={labelCls}>アクセス情報・備考</span>
          <textarea
            value={accessInfoNote}
            onChange={(e) => setAccessInfoNote(e.target.value)}
            placeholder="鍵の場所、ゴミ捨て曜日など"
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
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="primary" icon="Check" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="danger" icon="Trash2" disabled={deleting} onClick={remove}>
          {deleting ? "削除中..." : "この物件を削除"}
        </Button>
      </div>
    </form>
  );
}
