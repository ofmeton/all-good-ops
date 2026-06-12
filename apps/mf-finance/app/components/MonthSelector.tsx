"use client";

import Link from "next/link";
import { addMonths, ymLabel } from "@/lib/format";

// URL 駆動の月セレクタ。?ym=YYYY-MM を前後に動かす。
// 翌月はデータ最大月（maxYm）を上限に無効化（未来月へは進めない）。
export function MonthSelector({
  ym,
  maxYm,
}: {
  ym: string;
  maxYm: string | null;
}) {
  const prevYm = addMonths(ym, -1);
  const nextYm = addMonths(ym, 1);
  const nextDisabled = maxYm ? nextYm > maxYm : false;

  const btnBase =
    "flex h-11 min-w-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <nav
      className="flex items-center justify-between gap-2"
      aria-label="表示する月の切り替え"
    >
      <Link
        href={`/?ym=${prevYm}`}
        className={`${btnBase} cursor-pointer bg-surface text-foreground shadow-sm hover:border-primary hover:text-primary`}
        aria-label={`前月（${ymLabel(prevYm)}）へ`}
        rel="prev"
      >
        <span aria-hidden>‹</span>
        <span className="ml-1 hidden sm:inline">前月</span>
      </Link>

      <p
        className="tabular text-base font-semibold text-foreground"
        aria-live="polite"
      >
        {ymLabel(ym)}
      </p>

      {nextDisabled ? (
        <span
          className={`${btnBase} cursor-not-allowed bg-background text-muted opacity-50`}
          aria-disabled="true"
          aria-label="翌月（データなし）"
          title="これより新しい月のデータはありません"
        >
          <span className="mr-1 hidden sm:inline">翌月</span>
          <span aria-hidden>›</span>
        </span>
      ) : (
        <Link
          href={`/?ym=${nextYm}`}
          className={`${btnBase} cursor-pointer bg-surface text-foreground shadow-sm hover:border-primary hover:text-primary`}
          aria-label={`翌月（${ymLabel(nextYm)}）へ`}
          rel="next"
        >
          <span className="mr-1 hidden sm:inline">翌月</span>
          <span aria-hidden>›</span>
        </Link>
      )}
    </nav>
  );
}
