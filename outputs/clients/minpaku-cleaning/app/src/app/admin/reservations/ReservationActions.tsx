"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

const inputCls =
  "w-20 h-8 px-2 rounded-lg ring-1 ring-ink-200 bg-white text-[12px] text-ink-800 outline-none focus:ring-brand-500 focus:ring-2";

export function ReservationActions({
  reservationId,
  initialGuestCount,
  disabled,
}: {
  reservationId: string;
  initialGuestCount: number | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [guestCount, setGuestCount] = useState(initialGuestCount ?? 1);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const loading = busy || pending;

  async function saveGuestCount() {
    setBusy(true);
    const res = await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reservationId, guest_count: guestCount }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(typeof body?.error === "string" ? body.error : "人数の保存に失敗しました");
      return;
    }
    toast.success("人数を保存しました");
    startTransition(() => router.refresh());
  }

  async function cancel() {
    if (!confirm("この予約をキャンセル扱いにします。よろしいですか？")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/reservations?id=${reservationId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("予約キャンセルに失敗しました");
      return;
    }
    toast.success("予約をキャンセルしました");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        type="number"
        min={1}
        value={guestCount}
        onChange={(e) => setGuestCount(Number(e.target.value))}
        className={inputCls}
        disabled={disabled || loading}
        aria-label="宿泊人数"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon="Save"
        loading={loading}
        onClick={saveGuestCount}
        disabled={disabled}
      >
        保存
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        icon="Ban"
        loading={loading}
        onClick={cancel}
        disabled={disabled}
      >
        取消
      </Button>
    </div>
  );
}
