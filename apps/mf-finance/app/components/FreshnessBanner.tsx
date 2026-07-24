"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { Freshness } from "@/lib/types";
import { shortDate } from "@/lib/format";

// 連携鮮度バナー + 手動 refresh。
// daysSince で色分け（〜3日=緑 / 〜7日=既定 / 8日〜=警告）。
export function FreshnessBanner({ data }: { data: Freshness }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [operation, setOperation] = useState<"refresh" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    setOperation("refresh");
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "refresh失敗");
      setNotice("保存済みデータから再取り込みました");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOperation(null);
    }
  }

  async function onCsvSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setOperation("import");
    try {
      const form = new FormData();
      form.set("csv", file);
      const res = await fetch("/api/import/csv", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "CSV取込失敗");
      setNotice(
        `${json.imported}件を取り込みました（${json.from}〜${json.to}）${json.duplicate ? "・同一CSVを再処理" : ""}`,
      );
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOperation(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const working = operation !== null || pending;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Money ForwardのCSVを選択"
          disabled={working}
          onChange={(event) => void onCsvSelected(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className="flex h-9 cursor-pointer items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {operation === "import" ? "取込中…" : "CSVを取り込む"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={working}
          className="flex h-9 cursor-pointer items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="データを再取り込み"
        >
          {operation === "refresh" ? "更新中…" : "再取り込み"}
        </button>
      </div>
      {(error || notice) && (
        <p
          className={`w-full text-xs ${error ? "text-negative" : "text-positive"}`}
          role={error ? "alert" : "status"}
        >
          {error ?? notice}
        </p>
      )}
      <p className="w-full text-[11px] leading-relaxed text-muted">
        CSV取込は実績収支・可処分額・予測を更新します。総残高はCSVに残高情報がないため、設定中の口座残高を使用します。
      </p>
    </div>
  );
}
