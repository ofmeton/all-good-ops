"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ChecklistTemplateItem = { label: string; type?: string };

type Props = {
  token: string;
  requestId: string;
  propertyId: string;
  status: string;
  checklistTemplate: ChecklistTemplateItem[];
};

export function StaffRequestPanel({
  token,
  requestId,
  propertyId,
  status,
  checklistTemplate,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // チェックリスト記入状態
  const [checks, setChecks] = useState<boolean[]>(
    checklistTemplate.map(() => false),
  );
  // アップロード済み写真の保存パス
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [supplyItems, setSupplyItems] = useState("");
  const [supplyDone, setSupplyDone] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/staff/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "start" }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "開始に失敗しました");
      return;
    }
    router.refresh();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("token", token);
    form.set("requestId", requestId);
    form.set("file", file);
    const res = await fetch("/api/staff/photos", { method: "POST", body: form });
    setBusy(false);
    e.target.value = "";
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(
        typeof b?.error === "string" ? b.error : "写真アップロードに失敗しました",
      );
      return;
    }
    const { storagePath } = await res.json();
    setPhotoPaths((prev) => [...prev, storagePath]);
  }

  async function submitReport() {
    setBusy(true);
    setError(null);
    const checklistResult = checklistTemplate.map((item, i) => ({
      label: item.label,
      checked: checks[i],
    }));
    const res = await fetch(`/api/staff/requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, checklistResult, photoPaths }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "提出に失敗しました");
      return;
    }
    router.refresh();
  }

  async function submitSupply() {
    if (!supplyItems.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/staff/supplies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        property_id: propertyId,
        request_id: requestId,
        items: supplyItems,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "送信に失敗しました");
      return;
    }
    setSupplyItems("");
    setSupplyDone(true);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {status === "assigned" && (
        <button
          onClick={start}
          disabled={busy}
          className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          清掃を開始する
        </button>
      )}

      {status === "in_progress" && (
        <section className="space-y-3 border rounded p-3">
          <h2 className="font-bold text-sm">チェックリスト</h2>
          <ul className="space-y-1">
            {checklistTemplate.map((item, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() =>
                      setChecks((prev) =>
                        prev.map((c, j) => (j === i ? !c : c)),
                      )
                    }
                  />
                  {item.label}
                </label>
              </li>
            ))}
            {checklistTemplate.length === 0 && (
              <li className="text-sm text-gray-500">
                チェックリストは設定されていません。
              </li>
            )}
          </ul>
          <div className="space-y-1">
            <label className="block text-sm">
              完了写真を追加
              <input
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                disabled={busy}
                className="block text-sm"
              />
            </label>
            <p className="text-xs text-gray-500">
              アップロード済み: {photoPaths.length}枚
            </p>
          </div>
          <button
            onClick={submitReport}
            disabled={busy}
            className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            完了報告を提出する
          </button>
        </section>
      )}

      <section className="space-y-2 border rounded p-3">
        <h2 className="font-bold text-sm">備品補充依頼</h2>
        {supplyDone && (
          <p className="text-sm text-green-700">送信しました。</p>
        )}
        <textarea
          value={supplyItems}
          onChange={(e) => setSupplyItems(e.target.value)}
          placeholder="不足している備品（例: トイレットペーパー 6ロール）"
          className="w-full border rounded px-2 py-1 text-sm"
          rows={2}
        />
        <button
          onClick={submitSupply}
          disabled={busy || !supplyItems.trim()}
          className="text-sm underline disabled:opacity-50"
        >
          備品補充を依頼する
        </button>
      </section>
    </div>
  );
}
