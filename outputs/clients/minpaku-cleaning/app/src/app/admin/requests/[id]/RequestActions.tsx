"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: string; name: string };

type Props = {
  requestId: string;
  status: string;
  assignedStaffId: string | null;
  staff: Staff[];
  adjacentRequests: { id: string; checkin_date: string; checkout_date: string }[];
};

export function RequestActions({
  requestId,
  status,
  assignedStaffId,
  staff,
  adjacentRequests = [],
}: Props) {
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
    <div className="space-y-2 border rounded p-3">
      {adjacentRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-2 text-xs text-yellow-900">
          ⚠ 同物件に連続予約があります（{adjacentRequests
            .map((a) => `${a.checkin_date}〜${a.checkout_date}`)
            .join(", ")}）。割り当て時はスタッフの稼働状況にご注意ください。
        </div>
      )}
      {canAssign && (
        <div className="flex items-center gap-2">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => patch({ action: "assign", staffId })}
            disabled={busy || !staffId}
            className="text-sm underline disabled:opacity-50"
          >
            スタッフを割り当て
          </button>
        </div>
      )}
      {canConfirm && (
        <button
          onClick={() => patch({ action: "confirm" })}
          disabled={busy}
          className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          内容を確認済みにする
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => patch({ action: "cancel" })}
          disabled={busy}
          className="text-sm underline text-red-600 disabled:opacity-50"
        >
          この依頼をキャンセル
        </button>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
