import type {
  LatestAsset,
  ProjectedBalance,
} from "@/lib/calendar-queries";
import { yen, shortDate } from "@/lib/format";

// Plan 2 Phase 4: 引落予定 vs 残高。
// 親（page.tsx）が getProjectedBalance(...) と getLatestAsset() を呼んで props で渡す。
// 本コンポーネントは props 受けのみ（DB アクセスもページ遷移も持たない）。
export function PayoutCalendar({
  projected,
  latestAsset,
}: {
  projected: ProjectedBalance;
  latestAsset: LatestAsset | null;
}) {
  const { startBalance, items, endBalance, goesNegative } = projected;
  const baseDate = projected.baseDate ?? latestAsset?.date ?? null;

  const hasAsset = latestAsset != null || startBalance !== 0;
  const isEmpty = items.length === 0;

  return (
    <section className="mt-4" aria-label="引落予定と残高の見通し">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            引落予定 vs 残高
          </h2>
          <p className="text-[11px] text-muted">
            最新資産を起点にした見込みの残高推移
          </p>
        </div>

        {/* 起点（最新資産） */}
        <div className="mb-3 flex items-baseline justify-between rounded-lg border border-border bg-background px-3 py-2">
          <span className="text-xs text-muted">
            起点残高
            {baseDate && (
              <span className="ml-1">（{shortDate(baseDate)}時点）</span>
            )}
          </span>
          <span className="tabular text-sm font-semibold text-foreground">
            {hasAsset ? (
              <>
                <span className="text-xs" aria-hidden>
                  ¥
                </span>
                {yen(startBalance)}
              </>
            ) : (
              <span className="text-muted">資産データなし</span>
            )}
          </span>
        </div>

        {isEmpty ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-3 py-6 text-center text-xs text-muted">
            この月の引落・入金予定はありません
          </p>
        ) : (
          <>
            {/* 残高不足の警告（色だけに頼らずテキストで明示） */}
            {goesNegative && (
              <p
                role="status"
                className="mb-3 rounded-lg border border-negative px-3 py-2 text-xs font-medium text-negative"
              >
                ⚠ 残高不足の見込み：予定どおり引き落とされると残高がマイナスに転じます
              </p>
            )}

            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                {`引落・入金予定と適用後の見込み残高（起点 ¥${yen(startBalance)}）`}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted">
                  <th scope="col" className="py-1.5 pr-2 font-medium">
                    日付
                  </th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">
                    項目
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 pl-2 text-right font-medium"
                  >
                    増減
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 pl-2 text-right font-medium"
                  >
                    残高
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const negative = it.balanceAfter < 0;
                  const isIncome = it.kind === "income";
                  return (
                    <tr
                      key={it.id}
                      className="border-b border-border/60 align-top last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap py-2 pr-2 text-left text-xs font-normal text-muted"
                      >
                        {shortDate(it.date)}
                      </th>
                      <td className="py-2 pr-2 text-xs text-foreground">
                        {it.name}
                        {negative && (
                          <span className="ml-1 text-[10px] font-medium text-negative">
                            残高不足
                          </span>
                        )}
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
                        ¥{yen(it.amount)}
                      </td>
                      <td
                        className={`tabular whitespace-nowrap py-2 pl-2 text-right text-xs font-semibold ${
                          negative ? "text-negative" : "text-foreground"
                        }`}
                      >
                        <span className="text-[10px]" aria-hidden>
                          {it.balanceAfter < 0 ? "−¥" : "¥"}
                        </span>
                        {yen(Math.abs(it.balanceAfter))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="py-2 pr-2 text-xs text-muted">
                    予定適用後の見込み残高
                  </td>
                  <td
                    className={`tabular whitespace-nowrap py-2 pl-2 text-right text-sm font-bold ${
                      endBalance < 0 ? "text-negative" : "text-foreground"
                    }`}
                  >
                    <span className="text-[10px]" aria-hidden>
                      {endBalance < 0 ? "−¥" : "¥"}
                    </span>
                    {yen(Math.abs(endBalance))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
