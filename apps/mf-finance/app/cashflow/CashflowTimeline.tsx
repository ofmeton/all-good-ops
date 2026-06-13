import type { RollingCashflow } from "@/lib/cashflow-queries";
import { yen, shortDate } from "@/lib/format";

// 向こう1ヶ月の資金繰りタイムライン（server）。
// getRollingCashflow(30) の起点残高 → events を日付順に残高推移で表示。
// ゼロ割れ警告・最小残高・着地残高・カード見込み注記を含む。
export function CashflowTimeline({ rolling }: { rolling: RollingCashflow }) {
  const {
    start,
    baseDate,
    days,
    events,
    end,
    minBalance,
    firstNegativeDate,
    cardChargeEstimate,
  } = rolling;

  const noBalance = start === 0 && baseDate == null;

  return (
    <section className="mt-4" aria-label="向こう1ヶ月の資金繰り">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            向こう{days}日の資金繰り
          </h2>
          <p className="text-[11px] text-muted">残高を起点にした見込み推移</p>
        </div>

        {noBalance && (
          <p
            role="status"
            className="mb-3 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs text-muted"
          >
            残高未取得です。下の「口座残高の手入力」で残高を登録すると、見込み残高が計算されます。
          </p>
        )}

        {/* 起点残高 */}
        <div className="mb-3 flex items-baseline justify-between rounded-lg border border-border bg-background px-3 py-2">
          <span className="text-xs text-muted">
            起点残高
            {baseDate && (
              <span className="ml-1">（{shortDate(baseDate)}時点）</span>
            )}
          </span>
          <span className="tabular text-sm font-semibold text-foreground">
            <span className="text-xs" aria-hidden>
              ¥
            </span>
            {yen(start)}
          </span>
        </div>

        {/* ゼロ割れ警告（色だけに頼らずテキストで明示） */}
        {firstNegativeDate && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-negative bg-negative/5 px-3 py-2 text-xs font-medium text-negative"
          >
            ⚠ {shortDate(firstNegativeDate)}に残高がマイナスになる見込みです
          </p>
        )}

        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-3 py-6 text-center text-xs text-muted">
            この期間の入金・引落予定はありません
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {`入金・引落予定と適用後の見込み残高（起点 ¥${yen(start)}）`}
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted">
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  日付
                </th>
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  名称
                </th>
                <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                  増減
                </th>
                <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                  残高
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const negative = ev.balanceAfter < 0;
                const isIncome = ev.kind === "income";
                return (
                  <tr
                    key={`${ev.date}-${ev.source}-${i}`}
                    className="border-b border-border/60 align-top last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap py-2 pr-2 text-left text-xs font-normal text-muted"
                    >
                      {shortDate(ev.date)}
                    </th>
                    <td className="py-2 pr-2 text-xs text-foreground">
                      {ev.name}
                    </td>
                    <td
                      className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-medium ${
                        isIncome ? "text-positive" : "text-foreground"
                      }`}
                    >
                      <span aria-hidden className="mr-0.5">
                        {isIncome ? "+" : "▲"}
                      </span>
                      <span className="sr-only">
                        {isIncome ? "入金 " : "引落 "}
                      </span>
                      ¥{yen(ev.amount)}
                    </td>
                    <td
                      className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-semibold ${
                        negative ? "text-negative" : "text-foreground"
                      }`}
                    >
                      <span className="text-[10px]" aria-hidden>
                        {negative ? "−¥" : "¥"}
                      </span>
                      {yen(Math.abs(ev.balanceAfter))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={3} className="py-2 pr-2 text-xs text-muted">
                  期間末の見込み残高
                </td>
                <td
                  className={`tabular whitespace-nowrap py-2 pl-2 text-right text-sm font-bold ${
                    end < 0 ? "text-negative" : "text-foreground"
                  }`}
                >
                  <span className="text-[10px]" aria-hidden>
                    {end < 0 ? "−¥" : "¥"}
                  </span>
                  {yen(Math.abs(end))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* 最小残高 */}
        {events.length > 0 && (
          <p className="mt-2 text-[11px] text-muted">
            期間中の最小残高:{" "}
            <span
              className={`tabular font-medium ${
                minBalance < 0 ? "text-negative" : "text-foreground"
              }`}
            >
              {minBalance < 0 ? "−¥" : "¥"}
              {yen(Math.abs(minBalance))}
            </span>
          </p>
        )}

        {/* カード引落見込みの注記（残高未算入） */}
        {cardChargeEstimate > 0 && (
          <p className="mt-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-[11px] text-warning">
            ※ カード引落見込み ¥{yen(cardChargeEstimate)}{" "}
            は引落日が未登録のため上記残高に未算入です。下の「単発予定の登録」で引落予定として登録すると反映されます。
          </p>
        )}
      </div>
    </section>
  );
}
