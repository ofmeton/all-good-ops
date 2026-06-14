"use client";

import type { RollingEvent, RollingLocation } from "@/lib/cashflow-queries";
import { KIND_LABEL } from "@/lib/cashflow/kinds";
import { shortDate, yen } from "@/lib/format";

function money(value: number): string {
  return `${value < 0 ? "−¥" : "¥"}${yen(Math.abs(value))}`;
}

function EventTable({ events }: { events: RollingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted">
        この資金場所の期間内予定はありません
      </p>
    );
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] text-muted">
          <th scope="col" className="py-1.5 pr-2 font-medium">日付</th>
          <th scope="col" className="py-1.5 pr-2 font-medium">名称</th>
          <th scope="col" className="py-1.5 pl-2 text-right font-medium">増減</th>
          <th scope="col" className="py-1.5 pl-2 text-right font-medium">残高</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, index) => {
          const income = event.kind === "income";
          const negative = event.balanceAfter < 0;
          return (
            <tr key={`${event.date}-${event.source}-${index}`} className="border-b border-border/60 align-top last:border-b-0">
              <th scope="row" className="whitespace-nowrap py-2 pr-2 text-left text-xs font-normal text-muted">
                {shortDate(event.date)}
              </th>
              <td className="py-2 pr-2 text-xs text-foreground">
                {event.name}
                {event.status === "pending" && (
                  <span className="ml-1 text-[11px] text-warning">金額未定</span>
                )}
              </td>
              <td className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-medium ${income ? "text-positive" : "text-foreground"}`}>
                <span aria-hidden className="mr-0.5">{income ? "+" : "▲"}</span>
                <span className="sr-only">{income ? "入金 " : "引落 "}</span>
                {event.status === "pending" ? "未定" : `¥${yen(event.amount)}`}
              </td>
              <td className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-semibold ${negative ? "text-negative" : "text-foreground"}`}>
                {money(event.balanceAfter)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TotalCard({
  total,
  baseDate,
}: {
  total: { start: number; end: number; minBalance: number; firstNegativeDate: string | null; days: number };
  baseDate: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">資金場所別ローリング</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            今日から{total.days}日後まで{baseDate ? `（残高基準 ${shortDate(baseDate)}）` : ""}
          </p>
        </div>
        <span className="text-[11px] text-muted">トータル</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <dt className="text-[11px] text-muted">現在残高</dt>
          <dd className="tabular mt-1 text-sm font-semibold text-foreground">{money(total.start)}</dd>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <dt className="text-[11px] text-muted">期間末見込み</dt>
          <dd className={`tabular mt-1 text-sm font-semibold ${total.end < 0 ? "text-negative" : "text-foreground"}`}>
            {money(total.end)}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <dt className="text-[11px] text-muted">最小残高</dt>
          <dd className={`tabular mt-1 text-sm font-semibold ${total.minBalance < 0 ? "text-negative" : "text-foreground"}`}>
            {money(total.minBalance)}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <dt className="text-[11px] text-muted">マイナス予測</dt>
          <dd className={`tabular mt-1 text-sm font-semibold ${total.firstNegativeDate ? "text-negative" : "text-foreground"}`}>
            {total.firstNegativeDate ? shortDate(total.firstNegativeDate) : "なし"}
          </dd>
        </div>
      </dl>
      {total.firstNegativeDate && (
        <p role="alert" className="mt-3 rounded-lg border border-negative bg-negative/5 px-3 py-2 text-xs font-medium text-negative">
          {shortDate(total.firstNegativeDate)}にトータル残高がマイナスになる見込みです
        </p>
      )}
    </div>
  );
}

export function AccountRollingView({
  locations,
  total,
  baseDate,
}: {
  locations: RollingLocation[];
  total: { start: number; end: number; minBalance: number; firstNegativeDate: string | null; days: number };
  baseDate: string | null;
}) {
  return (
    <section className="mt-4 space-y-3" aria-label="資金場所別の見込み残高">
      <TotalCard total={total} baseDate={baseDate} />
      {locations.map((location) => {
        const title = location.account ?? "未指定";
        return (
          <details key={location.key ?? "__unspecified__"} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground" title={title}>
                    {title}
                  </span>
                  {location.kind && (
                    <span className="shrink-0 rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {KIND_LABEL[location.kind]}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted">
                    現在 <span className="tabular font-semibold text-foreground">{money(location.start)}</span>
                  </span>
                  <span className="text-muted">
                    期間末 <span className={`tabular font-semibold ${location.end < 0 ? "text-negative" : "text-foreground"}`}>{money(location.end)}</span>
                  </span>
                </div>
              </div>
              {location.firstNegativeDate && (
                <p className="mt-2 text-xs font-medium text-negative">
                  {shortDate(location.firstNegativeDate)}にこの資金場所の残高がマイナスになる見込みです
                </p>
              )}
            </summary>
            <div className="mt-3 border-t border-border/60 pt-3">
              <EventTable events={location.events} />
            </div>
          </details>
        );
      })}
    </section>
  );
}
