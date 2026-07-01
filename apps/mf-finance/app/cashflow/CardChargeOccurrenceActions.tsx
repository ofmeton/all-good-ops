"use client";

import { useState, useTransition } from "react";
import { clearCardChargeOverride, setCardChargeOverride } from "@/lib/actions";

export function CardChargeOccurrenceActions({
  scheduleId,
  occurrenceDate,
  estimated,
}: {
  scheduleId: number;
  occurrenceDate: string;
  estimated: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "保存に失敗しました");

  const saveAmount = () => {
    setError(null);
    const next = Number(amount);
    if (!Number.isFinite(next) || next <= 0) {
      setError("金額は正の数で入力してください");
      return;
    }
    startTransition(async () => {
      try {
        await setCardChargeOverride(scheduleId, occurrenceDate, next);
        setAmount("");
        setOpen(false);
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const clear = () => {
    setError(null);
    startTransition(async () => {
      try {
        await clearCardChargeOverride(scheduleId, occurrenceDate);
        setAmount("");
        setOpen(false);
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  return (
    <div className={pending ? "opacity-60" : ""}>
      <div className="flex flex-wrap items-center gap-1.5">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="操作（実額入力）を開く"
            title="操作"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-base leading-none text-muted hover:bg-border/40"
          >
            ⋯
          </button>
        ) : (
          <>
            <label className="sr-only" htmlFor={`card-charge-occ-${scheduleId}-${occurrenceDate}`}>
              実額に変更
            </label>
            <input
              id={`card-charge-occ-${scheduleId}-${occurrenceDate}`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              placeholder="実額"
              className="tabular h-8 w-24 rounded-lg border border-border bg-background px-2 text-right text-[11px] text-foreground disabled:opacity-40"
            />
            <button
              type="button"
              onClick={saveAmount}
              disabled={pending || amount.trim() === ""}
              className="h-8 rounded-lg border border-primary bg-primary px-2 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {estimated ? "確定額を入力" : "変更"}
            </button>
            {!estimated && (
              <button
                type="button"
                onClick={clear}
                disabled={pending}
                className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-muted hover:bg-border/40 disabled:opacity-40"
              >
                見込みに戻す
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="操作を閉じる"
              className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-muted hover:bg-border/40"
            >
              閉じる
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[11px] font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
