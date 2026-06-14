"use client";

import { useState, useTransition } from "react";
import { deleteBudget, upsertBudget } from "@/lib/budget-actions";
import type { BudgetVsActualRow } from "@/lib/budget-queries"; // type-only（実体は server-only）
import { yen } from "@/lib/format";

// 1カテゴリ分の行（カード）。予算 input + 保存/クリア（server action）と
// 実績バー（消化率）・残り額を表示する。送信中は useTransition でフィードバック。
// 状態は色だけに頼らずテキストでも明示（超過 / 残りわずか）。

const WARN_RATIO = 0.8; // 消化率 80% 以上で warning

type Tone = "positive" | "warning" | "negative";

const barClass: Record<Tone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
};

const remainClass: Record<Tone, string> = {
  positive: "text-foreground",
  warning: "text-warning",
  negative: "text-negative",
};

export function BudgetRow({ row }: { row: BudgetVsActualRow }) {
  const { category_major: category, budget, actual, avg3, over } = row;
  const [value, setValue] = useState(budget != null ? String(budget) : "");
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const ratio = budget != null && budget > 0 ? actual / budget : null;
  const tone: Tone =
    over || (ratio !== null && ratio > 1)
      ? "negative"
      : ratio !== null && ratio >= WARN_RATIO
        ? "warning"
        : "positive";
  const pct = ratio !== null ? Math.round(ratio * 100) : null;
  const remaining = budget != null ? budget - actual : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Math.round(Number(value));
    if (value.trim() === "" || !Number.isFinite(n) || n <= 0) {
      setMsg({ text: "1円以上の整数を入力してください", error: true });
      return;
    }
    startTransition(async () => {
      const res = await upsertBudget(category, n);
      setMsg(
        res.ok
          ? { text: "保存しました", error: false }
          : { text: res.error, error: true },
      );
    });
  }

  function onClear() {
    startTransition(async () => {
      const res = await deleteBudget(category);
      if (res.ok) {
        setValue("");
        setMsg({ text: "予算を削除しました", error: false });
      } else {
        setMsg({ text: res.error, error: true });
      }
    });
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      {/* カテゴリ名 + 残り額 */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {category}
        </p>
        {remaining !== null ? (
          <p
            className={`tabular shrink-0 text-sm font-semibold ${remainClass[tone]}`}
          >
            {remaining < 0 ? `超過 ¥${yen(-remaining)}` : `残り ¥${yen(remaining)}`}
          </p>
        ) : (
          <p className="shrink-0 text-xs text-muted">予算未設定</p>
        )}
      </div>

      {/* 実績（バーは予算設定済みのみ。未設定は実績額のみ） */}
      {budget != null ? (
        <div className="mt-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-background"
            role="img"
            aria-label={`消化率 ${pct}%`}
          >
            <div
              className={`h-full rounded-full ${barClass[tone]}`}
              style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
            />
          </div>
          <p className="tabular mt-1 text-xs text-muted">
            ¥{yen(actual)} / ¥{yen(budget)}（消化率 {pct}%）
            {tone === "negative" && (
              <span className="ml-1 font-semibold text-negative">超過</span>
            )}
            {tone === "warning" && (
              <span className="ml-1 font-semibold text-warning">
                残りわずか
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="tabular mt-2 text-xs text-muted">
          今月の支出 ¥{yen(actual)}
        </p>
      )}

      {/* 予算入力 + 保存/クリア */}
      <form onSubmit={onSubmit} className="mt-2 flex items-center gap-2">
        <label className="sr-only" htmlFor={`budget-${category}`}>
          {category}の予算（円）
        </label>
        <input
          id={`budget-${category}`}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            avg3 !== null ? `3ヶ月平均 ${yen(avg3)}円` : "予算額（円）"
          }
          className="tabular h-11 w-full min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm font-medium text-primary shadow-sm transition-colors duration-150 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存"}
        </button>
        {budget != null && (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="h-11 shrink-0 cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm font-medium text-muted shadow-sm transition-colors duration-150 hover:border-negative hover:text-negative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${category}の予算を削除`}
          >
            クリア
          </button>
        )}
      </form>
      {msg && (
        <p
          role="status"
          className={`mt-1 text-xs ${msg.error ? "text-negative" : "text-positive"}`}
        >
          {msg.text}
        </p>
      )}
    </li>
  );
}
