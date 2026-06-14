import type { AccountUsage } from "@/lib/types";
import { yen } from "@/lib/format";

// 当月の口座/カード別利用。支出額の大きい順に、支出を主・入金を従で。
export function AccountBreakdown({ data }: { data: AccountUsage[] }) {
  if (data.length === 0) return null;

  // 支出バーの相対長さ用。
  const maxSpent = Math.max(1, ...data.map((a) => a.spent));

  return (
    <section className="mt-4" aria-label="口座・カード別の当月利用">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        口座・カード別（当月）
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface shadow-sm">
        {data.map((a) => (
          <li key={a.account} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-foreground">
                {a.account}
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                −¥{yen(a.spent)}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border"
              role="img"
              aria-label={`支出 ${yen(a.spent)}円`}
            >
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(a.spent / maxSpent) * 100}%` }}
              />
            </div>
            {a.received > 0 && (
              <p className="mt-1 text-[11px] text-positive">
                入金 +¥<span className="tabular">{yen(a.received)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
