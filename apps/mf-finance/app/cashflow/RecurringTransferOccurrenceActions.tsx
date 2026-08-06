"use client";

import { useState, useTransition } from "react";
import {
  markRecurringTransferDone,
  skipRecurringTransferOccurrence,
} from "@/lib/cashflow-actions";

// 定期振替の発生回は、実行すると manual_transfers に実績を残す。
export function RecurringTransferOccurrenceActions({
  recurringTransferId,
  occurrenceDate,
}: {
  recurringTransferId: number;
  occurrenceDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const markDone = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await markRecurringTransferDone({ recurringTransferId, occurrenceDate });
        if (!res.ok) setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "実行済みへの更新に失敗しました");
      }
    });
  };

  const skip = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await skipRecurringTransferOccurrence({ recurringTransferId, occurrenceDate });
        if (!res.ok) setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "スキップに失敗しました");
      }
    });
  };

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${pending ? "opacity-60" : ""}`}>
      <span className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={markDone}
          disabled={pending}
          className="h-8 rounded-lg border border-primary bg-primary px-2 text-[11px] font-medium text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
        >
          実行済みにする
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("この月の定期振替をスキップします。よろしいですか？")) skip();
          }}
          disabled={pending}
          className="h-8 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-border/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
        >
          今月はスキップ
        </button>
      </span>
      {error && <span className="text-[11px] font-medium text-negative" role="alert">{error}</span>}
    </span>
  );
}
