"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Staff = { id: string; name: string };

type Props = {
  requestId: string;
  status: string;
  assignedStaffId: string | null;
  staff: Staff[];
  adjacentRequests: { id: string; checkin_date: string; checkout_date: string }[];
};

const inputCls =
  "h-10 px-3 rounded-lg ring-1 ring-ink-200 bg-white text-[13px] text-ink-800 outline-none focus:ring-brand-500 focus:ring-2";

export function RequestActions({ requestId, status, assignedStaffId, staff }: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(assignedStaffId ?? staff[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "操作に失敗しました");
      return;
    }
    router.refresh();
  }

  const canAssign = status === "unassigned" || status === "assigned";
  const canConfirm = status === "reported";
  const canCancel = status !== "confirmed" && status !== "cancelled";

  return (
    <div className="space-y-3">
      {canAssign && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className={inputCls}
          >
            {staff.length === 0 && <option value="">（スタッフ未登録）</option>}
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            icon="UserPlus"
            disabled={busy || !staffId}
            onClick={() => patch({ action: "assign", staffId })}
          >
            スタッフを割り当て
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {canConfirm && (
          <Button
            variant="primary"
            icon="CircleCheckBig"
            disabled={busy}
            onClick={() => patch({ action: "confirm" })}
          >
            内容を確認済みにする
          </Button>
        )}
        {canCancel && (
          <Button
            variant="danger"
            icon="X"
            disabled={busy}
            onClick={() => {
              if (!confirm("この依頼をキャンセルしますか？")) return;
              patch({ action: "cancel" });
            }}
          >
            キャンセル
          </Button>
        )}
      </div>
      {error && (
        <p className="text-[12.5px] text-st-cancelled-text bg-st-cancelled-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
