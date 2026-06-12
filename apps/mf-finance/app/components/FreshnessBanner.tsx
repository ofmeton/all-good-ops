"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Freshness } from "@/lib/types";
import { shortDate } from "@/lib/format";

// 連携鮮度バナー + 手動 refresh。
// daysSince で色分け（〜3日=緑 / 〜7日=既定 / 8日〜=警告）。
export function FreshnessBanner({ data }: { data: Freshness }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { latest, daysSince } = data;

  const tone =
    daysSince === null
      ? "muted"
      : daysSince <= 3
        ? "positive"
        : daysSince <= 7
          ? "muted"
          : "warning";
  const dot =
    tone === "positive"
      ? "bg-positive"
      : tone === "warning"
        ? "bg-warning"
        : "bg-muted";
  const text =
    tone === "warning" ? "text-warning" : "text-muted";

  async function onRefresh() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "refresh失敗");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        <span className={text}>
          {latest ? (
            <>
              データ最新: {shortDate(latest)}
              {daysSince !== null && (
                <>
                  {" "}
                  <span className="tabular">（{daysSince}日前）</span>
                </>
              )}
            </>
          ) : (
            "データ未取得"
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-negative" role="alert">
            更新失敗
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={working}
          className="flex h-9 cursor-pointer items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="データを再取り込み"
        >
          {working ? "更新中…" : "再取り込み"}
        </button>
      </div>
    </div>
  );
}
