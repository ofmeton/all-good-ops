"use client";

import Link from "next/link";
import { PERIOD_OPTIONS, type CashflowPeriod } from "@/lib/cashflow/kinds";

export function PeriodToggle({ current }: { current: CashflowPeriod }) {
  return (
    <nav className="mt-4 flex rounded-lg border border-border bg-surface p-1" aria-label="資金繰り期間">
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === current;
        return (
          <Link
            key={option.value}
            href={`/cashflow?period=${option.value}`}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 flex-1 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "bg-primary text-white"
                : "text-muted hover:bg-border/50 hover:text-foreground"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
