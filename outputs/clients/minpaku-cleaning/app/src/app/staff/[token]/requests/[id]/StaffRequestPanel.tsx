"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type ChecklistTemplateItem = { label: string; type?: string };

type Props = {
  token: string;
  requestId: string;
  propertyId: string;
  status: string;
  checklistTemplate: ChecklistTemplateItem[];
};

const inputCls =
  "w-full px-3 py-2 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none placeholder:text-ink-400 focus:ring-brand-500 focus:ring-2 resize-none";

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
  const [checks, setChecks] = useState<boolean[]>(checklistTemplate.map(() => false));
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
      setError(typeof b?.error === "string" ? b.error : "写真アップロードに失敗しました");
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

  const doneCount = checks.filter(Boolean).length;
  const allDone = checklistTemplate.length > 0 && doneCount === checklistTemplate.length;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {status === "assigned" && (
        <Card className="p-5">
          <h3 className="text-[14px] font-bold text-ink-900 mb-1">清掃を開始する</h3>
          <p className="text-[12px] text-ink-500 mb-4">
            開始ボタンを押すとステータスが「清掃中」になり、チェックリストが表示されます。
          </p>
          <Button
            variant="primary"
            size="xl"
            icon="Play"
            disabled={busy}
            onClick={start}
            className="w-full"
          >
            {busy ? "開始中..." : "清掃を開始する"}
          </Button>
        </Card>
      )}

      {status === "in_progress" && (
        <>
          {checklistTemplate.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-bold text-ink-900">作業チェックリスト</h3>
                <span className="num text-[11.5px] text-ink-500">
                  {doneCount} / {checklistTemplate.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-3">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{
                    width: `${(doneCount / Math.max(checklistTemplate.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <ul className="space-y-2.5">
                {checklistTemplate.map((item, i) => {
                  const on = checks[i];
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() =>
                          setChecks((prev) => prev.map((c, j) => (j === i ? !c : c)))
                        }
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <span
                          className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                            on ? "bg-brand-600 text-white" : "border-2 border-ink-300"
                          }`}
                        >
                          {on && <Icon name="Check" size={14} strokeWidth={3} />}
                        </span>
                        <span
                          className={`text-[13px] ${
                            on ? "text-ink-500 line-through" : "text-ink-800 font-medium"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-ink-900">清掃後の写真</h3>
              <span className="text-[11.5px] text-ink-500">
                <span className="num font-bold text-ink-800">{photoPaths.length}</span> 枚
              </span>
            </div>
            <label className="block">
              <span className="sr-only">写真を追加</span>
              <input
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                disabled={busy}
                className="block w-full text-[12px] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white file:text-[12px] file:font-medium hover:file:bg-brand-700"
              />
            </label>
            <p className="text-[10.5px] text-ink-500 mt-2">
              撮影した写真はサーバーで自動的に圧縮されます。
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-bold text-ink-900 mb-3">完了報告</h3>
            <Button
              variant="primary"
              size="xl"
              icon="Send"
              disabled={busy || (checklistTemplate.length > 0 && !allDone)}
              onClick={submitReport}
              className="w-full"
            >
              {busy
                ? "送信中..."
                : checklistTemplate.length > 0
                  ? `報告を送信する（${doneCount}/${checklistTemplate.length} 完了）`
                  : "報告を送信する"}
            </Button>
            {checklistTemplate.length > 0 && !allDone && (
              <p className="text-[11px] text-ink-500 mt-2 text-center">
                すべての項目にチェックを入れると送信できます。
              </p>
            )}
          </Card>
        </>
      )}

      {(status === "reported" || status === "confirmed") && (
        <Card className="p-5 bg-st-reported-bg/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-st-reported-dot/20 text-st-reported-text flex items-center justify-center">
              <Icon name="CircleCheckBig" size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-st-reported-text">
                {status === "confirmed" ? "確認済み" : "完了報告を送信しました"}
              </div>
              <div className="text-[11px] text-ink-600">
                {status === "confirmed"
                  ? "管理者が内容を確認しました。"
                  : "管理者の確認待ちです。"}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-[14px] font-bold text-ink-900 mb-1">備品補充の依頼</h3>
        <p className="text-[11.5px] text-ink-500 mb-3">
          不足している備品があれば送信してください。管理者・オーナーへ通知されます。
        </p>
        {supplyDone && (
          <p className="text-[12.5px] text-st-confirmed-text bg-st-confirmed-bg px-3 py-2 rounded-lg mb-3">
            送信しました。
          </p>
        )}
        <textarea
          value={supplyItems}
          onChange={(e) => setSupplyItems(e.target.value)}
          placeholder="例: トイレットペーパー 6ロール、ハンドソープ 2本"
          rows={3}
          className={inputCls}
        />
        <div className="flex justify-end mt-3">
          <Button
            type="button"
            variant="secondary"
            icon="Package"
            disabled={busy || !supplyItems.trim()}
            onClick={submitSupply}
          >
            備品補充を依頼する
          </Button>
        </div>
      </Card>
    </div>
  );
}
