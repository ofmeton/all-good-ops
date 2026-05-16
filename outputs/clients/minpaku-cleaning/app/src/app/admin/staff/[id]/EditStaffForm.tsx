"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string };
type Staff = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  property_ids: string[];
};

export function EditStaffForm({
  staff,
  properties,
}: {
  staff: Staff;
  properties: Property[];
}) {
  const router = useRouter();
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email ?? "");
  const [lineId, setLineId] = useState(staff.line_user_id ?? "");
  const [propertyIds, setPropertyIds] = useState<string[]>(staff.property_ids);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggle(id: string) {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: staff.id,
        name,
        email: email || undefined,
        line_user_id: lineId || undefined,
        property_ids: propertyIds,
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
    if (!confirm(`スタッフ「${staff.name}」を削除します。よろしいですか？`)) return;
    setError(null);
    setDeleting(true);
    const res = await fetch(`/api/admin/staff?id=${staff.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      if (res.status === 409) {
        setError("稼働中の清掃依頼があるため削除できません（依頼完了後に再度お試しください）");
      } else {
        setError("削除に失敗しました");
      }
      return;
    }
    router.push("/admin/staff");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 border rounded p-3">
      <label className="block text-sm text-gray-600">スタッフ名</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border rounded px-2 py-1"
      />
      <label className="block text-sm text-gray-600">メールアドレス</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="任意"
        className="w-full border rounded px-2 py-1"
      />
      <label className="block text-sm text-gray-600">LINEユーザーID</label>
      <input
        value={lineId}
        onChange={(e) => setLineId(e.target.value)}
        placeholder="任意（U で始まる文字列）"
        className="w-full border rounded px-2 py-1"
      />
      <fieldset className="border rounded p-2">
        <legend className="text-sm text-gray-600">担当物件</legend>
        {properties.length === 0 ? (
          <p className="text-sm text-gray-500">物件がまだ登録されていません</p>
        ) : (
          properties.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={propertyIds.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              {p.name}
            </label>
          ))
        )}
      </fieldset>
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
          {deleting ? "削除中..." : "このスタッフを削除"}
        </button>
      </div>
    </form>
  );
}
