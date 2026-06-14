import {
  getAccountBalances,
  getUpcomingWithdrawals,
  getNextMonthCardCharge,
  getRollingCashflow,
} from "@/lib/cashflow-queries";
import { yen, yenSigned, shortDate } from "@/lib/format";
import { CashflowMiniChart } from "@/app/components/CashflowMiniChart";

// お金レーダー（TOP First View）。home を開いた瞬間の「今のお金の状況」を 4 ブロックで一望する。
// server component: 内部で cashflow-queries を直接呼ぶ（props 無し）。
// ① 総残高＋口座別 ② 今月の引落予定 ③ 来月のカード引落見込み ④ 向こう1ヶ月キャッシュフロー。
// 配色は globally トークンのみ・金額は .tabular・色のみに意味を載せない（テキスト併記）。

// 共通カード枠。
function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {note && <p className="text-[11px] text-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

// '/cashflow' への誘導リンク（空状態用）。
function CashflowLink({ label }: { label: string }) {
  return (
    <a
      href="/cashflow"
      className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {label}
    </a>
  );
}

export function MoneyRadar() {
  const balances = getAccountBalances();
  const upcoming = getUpcomingWithdrawals();
  const nextCard = getNextMonthCardCharge();
  const rolling = getRollingCashflow(30);

  const balancesEmpty = balances.total === 0 && balances.groups.length === 0;
  const upcomingTop = upcoming.items.slice(0, 5);
  const rollingTop = rolling.events.slice(0, 5);

  // 来月見込みの「◯月」ラベル（month は 'YYYY-MM'）。
  const nextMonthLabel = (() => {
    const [y, m] = nextCard.month.split("-").map(Number);
    return `${m === 12 ? y + 1 : y}年${m === 12 ? 1 : m + 1}月`;
  })();

  return (
    <section className="mb-4 space-y-3" aria-label="お金レーダー">
      <h2 className="text-sm font-semibold text-foreground">お金レーダー</h2>

      {/* ① 総残高＋口座別 */}
      <Card title="総残高">
        {balancesEmpty ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted">
            残高未取得 —{" "}
            <CashflowLink label="「資金繰り」ページ" />
            で取得/手入力できます
          </p>
        ) : (
          <>
            <p className="tabular text-3xl font-semibold leading-tight text-foreground">
              <span className="text-base" aria-hidden>
                ¥
              </span>
              {yen(balances.total)}
            </p>
            {balances.asOf && (
              <p className="mt-0.5 text-[11px] text-muted">
                （{shortDate(balances.asOf)}時点）
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {balances.groups.map((g) => (
                <li key={g.kind}>
                  <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1">
                    <span className="text-xs font-medium text-muted">
                      {g.label}
                    </span>
                    <span className="tabular text-xs font-semibold text-foreground">
                      ¥{yen(g.total)}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {g.accounts.map((a) => (
                      <li
                        key={a.account}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <span className="truncate text-sm text-foreground">
                          {a.account}
                        </span>
                        <span className="tabular shrink-0 text-sm text-foreground">
                          ¥{yen(a.balance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* ② 今月の引落予定 */}
      <Card title="今月の引落予定" note="今日〜月末">
        {upcoming.items.length === 0 ? (
          <p className="text-xs text-muted">今月の引落予定はありません。</p>
        ) : (
          <>
            <p className="tabular text-2xl font-semibold leading-tight text-foreground">
              <span className="text-sm" aria-hidden>
                −¥
              </span>
              {yen(upcoming.total)}
            </p>
            <ul className="mt-2 divide-y divide-border/60">
              {upcomingTop.map((it, i) => (
                <li
                  key={`${it.date}-${i}`}
                  className="flex items-baseline justify-between gap-2 py-1.5"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="tabular shrink-0 text-[11px] text-muted">
                      {shortDate(it.date)}
                    </span>
                    <span className="truncate text-sm text-foreground">
                      {it.name}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-medium text-foreground">
                    −¥{yen(it.amount)}
                  </span>
                </li>
              ))}
            </ul>
            {upcoming.items.length > upcomingTop.length && (
              <p className="mt-1.5 text-[11px] text-muted">
                ほか{upcoming.items.length - upcomingTop.length}件
              </p>
            )}
          </>
        )}
      </Card>

      {/* ③ 来月のカード引落見込み（byCard 空なら非表示） */}
      {nextCard.byCard.length > 0 && (
        <Card
          title={`${nextMonthLabel}のカード引落見込み`}
          note="引落日未確定"
        >
          <p className="tabular text-2xl font-semibold leading-tight text-foreground">
            <span className="text-sm" aria-hidden>
              −¥
            </span>
            {yen(nextCard.total)}
          </p>
          <ul className="mt-2 divide-y divide-border/60">
            {nextCard.byCard.map((c) => (
              <li
                key={c.account}
                className="flex items-baseline justify-between gap-2 py-1.5"
              >
                <span className="truncate text-sm text-foreground">
                  {c.account}
                </span>
                <span className="tabular shrink-0 text-sm font-medium text-foreground">
                  −¥{yen(c.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            ※当月利用額からの見込み（引落日未確定）
          </p>
        </Card>
      )}

      {/* ④ 向こう1ヶ月キャッシュフロー */}
      <Card title="向こう1ヶ月の資金繰り" note="見込み残高推移">
        {rolling.events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted">
            登録された予定はありません —{" "}
            <CashflowLink label="「資金繰り」ページ" />
            で登録できます
          </p>
        ) : (
          <>
            {rolling.firstNegativeDate && (
              <p
                role="status"
                className="mb-3 rounded-lg border border-negative px-3 py-2 text-xs font-medium text-negative"
              >
                ⚠ {shortDate(rolling.firstNegativeDate)}
                に残高がマイナスの見込みです
              </p>
            )}

            <CashflowMiniChart data={rolling} />

            <ul className="mt-2 divide-y divide-border/60">
              {rollingTop.map((e, i) => {
                const income = e.kind === "income";
                return (
                  <li
                    key={`${e.date}-${i}`}
                    className="flex items-baseline justify-between gap-2 py-1.5"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="tabular shrink-0 text-[11px] text-muted">
                        {shortDate(e.date)}
                      </span>
                      <span className="truncate text-sm text-foreground">
                        {e.name}
                      </span>
                    </span>
                    <span
                      className={`tabular shrink-0 text-sm font-medium ${
                        income ? "text-positive" : "text-foreground"
                      }`}
                    >
                      {e.status === "pending" ? "未定" : `${income ? "+" : "−"}¥${yen(e.amount)}`}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">期間内の最低残高</dt>
                <dd
                  className={`tabular font-semibold ${
                    rolling.minBalance < 0 ? "text-negative" : "text-foreground"
                  }`}
                >
                  ¥{yenSigned(rolling.minBalance)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">1ヶ月後の見込み</dt>
                <dd
                  className={`tabular font-semibold ${
                    rolling.end < 0 ? "text-negative" : "text-foreground"
                  }`}
                >
                  ¥{yenSigned(rolling.end)}
                </dd>
              </div>
            </dl>

            {rolling.cardChargeEstimate > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                ※カード引落見込み ¥{yen(rolling.cardChargeEstimate)}{" "}
                は未算入（引落日未確定のため）
              </p>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
