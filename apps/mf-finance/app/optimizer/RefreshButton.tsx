"use client";

import { useState, useTransition } from "react";
import { refreshSignalsAction } from "@/lib/optimizer/actions";

// 下層シグナル検出を再実行する小ボタン（page は server なので client に切出し）。
export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const res = await refreshSignalsAction();
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="h-11 shrink-0 cursor-pointer rounded-lg border border-primary px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "更新中…" : "シグナル更新"}
      </button>
      {error && (
        <p className="text-[11px] font-medium text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
