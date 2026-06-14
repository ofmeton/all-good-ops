"use client";

import { useState, useTransition } from "react";
import { clearOccurrenceOverride, setOccurrenceOverride } from "@/lib/actions";

export function OccurrenceActions({
  recurringId,
  occurrenceDate,
  status,
}: {
  recurringId: number;
  occurrenceDate: string;
  status: "normal" | "pending" | "skipped";
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        await setOccurrenceOverride(recurringId, occurrenceDate, { amount: next });
        setAmount("");
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const skip = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setOccurrenceOverride(recurringId, occurrenceDate, { skip: true });
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const clear = () => {
    setError(null);
    startTransition(async () => {
      try {
        await clearOccurrenceOverride(recurringId, occurrenceDate);
        setAmount("");
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  return (
    <div className={`mt-1 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {status === "pending" && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
            金額未定
          </span>
        )}
        {status === "normal" && (
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-border/40 disabled:opacity-40"
          >
            スキップ
          </button>
        )}
        <label className="sr-only" htmlFor={`timeline-occ-${recurringId}-${occurrenceDate}`}>
          実額に変更
        </label>
        <input
          id={`timeline-occ-${recurringId}-${occurrenceDate}`}
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
          {status === "pending" ? "入力" : "変更"}
        </button>
        {status === "normal" && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-muted hover:bg-border/40 disabled:opacity-40"
          >
            戻す
          </button>
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
