"use client";

import { useState } from "react";
import type { AccountRollingCashflow, RollingEvent, RollingLocation } from "@/lib/cashflow-queries";
import { KIND_LABEL } from "@/lib/cashflow/kinds";
import { yen, shortDate } from "@/lib/format";
import { OccurrenceActions } from "@/app/cashflow/OccurrenceActions";

function money(value: number): string {
  return `${value < 0 ? "−¥" : "¥"}${yen(Math.abs(value))}`;
}

function locationKey(location: RollingLocation): string {
  return location.key == null ? "__unassigned__" : String(location.key);
}

function SummaryCards({ rolling }: { rolling: AccountRollingCashflow }) {
  const total = rolling.total;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">資金繰りタイムライン</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            今日から{total.days}日後まで{rolling.baseDate ? `（残高基準 ${shortDate(rolling.baseDate)}）` : ""}
          </p>
        </div>
        <span className="text-[11px] text-muted">合計</span>
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
          {shortDate(total.firstNegativeDate)}に合計残高がマイナスになる見込みです
        </p>
      )}
    </div>
  );
}

function DeltaCell({ event }: { event: RollingEvent }) {
  const income = event.kind === "income";
  return (
    <td
      className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-medium ${
        income ? "text-positive" : "text-foreground"
      }`}
    >
      <span aria-hidden className="mr-0.5">
        {income ? "+" : "▲"}
      </span>
      <span className="sr-only">{income ? "入金 " : "引落 "}</span>
      {event.status === "pending" ? "未定" : `¥${yen(event.amount)}`}
    </td>
  );
}

function BalanceCell({ value }: { value: number }) {
  return (
    <td
      className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-semibold ${
        value < 0 ? "text-negative" : "text-foreground"
      }`}
    >
      {money(value)}
    </td>
  );
}

export function CashflowTimeline({ rolling }: { rolling: AccountRollingCashflow }) {
  const [showAccounts, setShowAccounts] = useState(false);
  const locations = rolling.locations;
  const noBalance = rolling.total.start === 0 && rolling.total.baseDate == null;

  return (
    <section className="mt-4 space-y-3" aria-label="資金繰りタイムライン">
      <SummaryCards rolling={rolling} />

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">日付別の増減と残高</h3>
            <p className="mt-0.5 text-[11px] text-muted">口座別残高列は必要な時だけ横に展開できます</p>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 self-start rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={showAccounts}
              onChange={(e) => setShowAccounts(e.target.checked)}
              className="size-4 accent-primary"
            />
            口座別を表示
          </label>
        </div>

        {noBalance && (
          <p role="status" className="mb-3 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs text-muted">
            残高未取得です。下の「口座残高の手入力」で残高を登録すると、見込み残高が計算されます。
          </p>
        )}

        {rolling.total.events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-3 py-6 text-center text-xs text-muted">
            この期間の入金・引落予定はありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <caption className="sr-only">
                {`入金・引落予定と適用後の見込み残高（起点 ${money(rolling.total.start)}）`}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted">
                  <th scope="col" className="whitespace-nowrap py-1.5 pr-3 font-medium">日付</th>
                  <th scope="col" className="min-w-44 py-1.5 pr-3 font-medium">名称</th>
                  <th scope="col" className="whitespace-nowrap py-1.5 pl-3 text-right font-medium">増減</th>
                  <th scope="col" className="whitespace-nowrap py-1.5 pl-3 text-right font-medium">残高（合計）</th>
                  {showAccounts &&
                    locations.map((location) => (
                      <th key={locationKey(location)} scope="col" className="min-w-36 py-1.5 pl-3 text-right font-medium">
                        <span className="block truncate" title={location.account ?? "未指定"}>
                          {location.account ?? "未指定"}
                        </span>
                        <span className="mt-0.5 inline-flex rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-medium text-muted">
                          {location.kind ? KIND_LABEL[location.kind] : "未指定"}
                        </span>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rolling.matrix.rows.map((row, i) => {
                  const event = row.event;
                  const isRecurring =
                    event.kind === "income" &&
                    event.source === "recurring" &&
                    event.recurringId != null &&
                    event.occurrenceDate != null;
                  return (
                    <tr key={`${event.date}-${event.source}-${i}`} className="border-b border-border/60 align-top last:border-b-0">
                      <th scope="row" className="whitespace-nowrap py-2 pr-3 text-left text-xs font-normal text-muted">
                        {shortDate(event.date)}
                      </th>
                      <td className="min-w-44 py-2 pr-3 text-xs text-foreground">
                        <span>{event.name}</span>
                        {isRecurring && (
                          <OccurrenceActions
                            recurringId={event.recurringId!}
                            occurrenceDate={event.occurrenceDate!}
                            status={event.status}
                          />
                        )}
                      </td>
                      <DeltaCell event={event} />
                      <BalanceCell value={event.balanceAfter} />
                      {showAccounts &&
                        locations.map((location) => (
                          <BalanceCell key={locationKey(location)} value={row.balances[locationKey(location)] ?? location.start} />
                        ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="py-2 pr-3 text-xs text-muted">期間末の見込み残高</td>
                  <td className={`tabular whitespace-nowrap py-2 pl-3 text-right text-sm font-bold ${rolling.total.end < 0 ? "text-negative" : "text-foreground"}`}>
                    {money(rolling.total.end)}
                  </td>
                  {showAccounts &&
                    locations.map((location) => {
                      const key = locationKey(location);
                      const value = rolling.matrix.endBalances[key] ?? location.end;
                      return (
                        <td key={key} className={`tabular whitespace-nowrap py-2 pl-3 text-right text-xs font-bold ${value < 0 ? "text-negative" : "text-foreground"}`}>
                          {money(value)}
                        </td>
                      );
                    })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {rolling.total.cardChargeEstimate > 0 && (
          <p className="mt-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-[11px] text-warning">
            ※ カード引落見込み ¥{yen(rolling.total.cardChargeEstimate)} は引落日が未登録のため上記残高に未算入です。下の「単発予定の登録」で引落予定として登録すると反映されます。
          </p>
        )}
      </div>
    </section>
  );
}
