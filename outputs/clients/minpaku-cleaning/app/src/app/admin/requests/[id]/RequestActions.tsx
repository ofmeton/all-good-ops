"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

const ACTION_LABEL: Record<string, string> = {
  assign: "スタッフを割り当てました",
  confirm: "確認済みにしました",
  cancel: "依頼をキャンセルしました",
};

export function RequestActions({ requestId, status, assignedStaffId, staff }: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(assignedStaffId ?? staff[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function patch(body: Record<string, unknown> & { action: string }) {
    setBusy(true);
    const res = await fetch(`/api/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      toast.error(typeof b?.error === "string" ? b.error : "操作に失敗しました");
      return;
    }
    toast.success(ACTION_LABEL[body.action] ?? "更新しました");
    startTransition(() => router.refresh());
  }

  const loading = busy || pending;
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
            loading={loading}
            disabled={!staffId}
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
            loading={loading}
            onClick={() => patch({ action: "confirm" })}
          >
            内容を確認済みにする
          </Button>
        )}
        {canCancel && (
          <Button
            variant="danger"
            icon="X"
            loading={loading}
            onClick={() => {
              if (!confirm("この依頼をキャンセルしますか？")) return;
              patch({ action: "cancel" });
            }}
          >
            キャンセル
          </Button>
        )}
      </div>
    </div>
  );
}
