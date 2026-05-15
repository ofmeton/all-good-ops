"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Request = {
  id: string;
  property_name: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
  assigned_staff_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  in_progress: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
};

export function RequestList({
  token,
  requests,
}: {
  token: string;
  requests: Request[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/staff/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "claim" }),
    });
    setBusyId(null);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(typeof b?.error === "string" ? b.error : "承認に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ul className="divide-y border rounded">
        {requests.map((r) => (
          <li key={r.id} className="px-3 py-2 text-sm space-y-1">
            <div className="flex justify-between">
              <Link
                href={`/staff/${token}/requests/${r.id}`}
                className="underline"
              >
                {r.property_name} / {r.checkin_date}〜{r.checkout_date}
              </Link>
              <span className="text-gray-500">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
            {r.status === "unassigned" && (
              <button
                onClick={() => claim(r.id)}
                disabled={busyId === r.id}
                className="bg-black text-white rounded px-3 py-1 text-xs disabled:opacity-50"
              >
                この依頼を承認する
              </button>
            )}
          </li>
        ))}
        {requests.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500">
            担当の依頼はありません。
          </li>
        )}
      </ul>
    </div>
  );
}
