"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Property = { id: string; name: string };
type Staff = {
  id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  property_ids: string[];
};

const inputCls =
  "w-full h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2";
const labelCls = "block text-[11.5px] text-ink-600 font-medium mb-1.5";

export function EditStaffForm({ staff, properties }: { staff: Staff; properties: Property[] }) {
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
    const res = await fetch(`/api/admin/staff?id=${staff.id}`, { method: "DELETE" });
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
    <form onSubmit={submit} className="space-y-3">
      <div
        className="grid gap-x-6 gap-y-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        <label className="block">
          <span className={labelCls}>スタッフ名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>メールアドレス</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="任意"
            className={inputCls}
          />
        </label>
        <label className="block" style={{ gridColumn: "1 / -1" }}>
          <span className={labelCls}>LINE ユーザーID</span>
          <input
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="任意（U で始まる文字列）"
            className={inputCls}
          />
        </label>
      </div>
      <fieldset className="rounded-lg ring-1 ring-ink-200 bg-white p-3">
        <legend className="px-1.5 text-[11.5px] text-ink-600 font-medium">担当物件</legend>
        {properties.length === 0 ? (
          <p className="text-[12px] text-ink-500">物件がまだ登録されていません</p>
        ) : (
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
        )}
      </fieldset>
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
          {deleting ? "削除中..." : "このスタッフを削除"}
        </Button>
      </div>
    </form>
  );
}
