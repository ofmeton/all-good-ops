import {
  getAccountOptions,
  getAccountRollingCashflow,
  getDueTransfers,
  getScheduledList,
  getAllAccountBalances,
  getTransferList,
  getUpcomingOccurrences,
} from "@/lib/cashflow-queries";
import { parsePeriod } from "@/lib/cashflow/kinds";
import { getRecurringItems } from "@/lib/write-queries";
import { RecurringEditor } from "@/app/components/RecurringEditor";
import { CashflowTimeline } from "@/app/cashflow/CashflowTimeline";
import { ScheduledEditor } from "@/app/cashflow/ScheduledEditor";
import { AccountBalanceEditor } from "@/app/cashflow/AccountBalanceEditor";
import { PeriodToggle } from "@/app/cashflow/PeriodToggle";
import { TransferEditor, TransferDoneButton } from "@/app/cashflow/TransferEditor";
import { yen, shortDate } from "@/lib/format";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const accountRolling = getAccountRollingCashflow(period);
  const scheduled = getScheduledList();
  const transfers = getTransferList();
  const dueTransfers = getDueTransfers(3);
  const recurring = getRecurringItems();
  const occurrences = getUpcomingOccurrences(60);
  const balances = getAllAccountBalances();
  const accountOptions = getAccountOptions();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <a
        href="/"
        className="inline-flex h-9 items-center text-sm font-medium text-primary transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← ダッシュボードへ戻る
      </a>

      <header className="mb-2 mt-3">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          資金繰り管理
        </h1>
        <p className="mt-1 text-xs text-muted">
          いつ・いくら入る／引き落とされるかを一元管理します。選択月末までの見込み残高、単発予定、毎月の定期、口座残高をここで扱います。
        </p>
      </header>

      <PeriodToggle current={period} />

      {dueTransfers.length > 0 && (
        <section className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4" aria-label="送金予定">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-warning">
              送金予定 <span className="tabular">{dueTransfers.length}件</span>
            </h2>
            <span className="text-[11px] text-warning">3日以内・期日超過含む</span>
          </div>
          <ul className="divide-y divide-warning/20">
            {dueTransfers.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-sm text-foreground">
                  <span className="tabular mr-2 text-[11px] text-muted">{shortDate(item.scheduled_date)}</span>
                  {item.from_account} → {item.to_account}
                  <span className="tabular ml-2 font-semibold">¥{yen(item.amount)}</span>
                  {item.fee > 0 && <span className="ml-2 text-[11px] text-muted">手数料 ¥{yen(item.fee)}</span>}
                </span>
                <TransferDoneButton id={item.id} label="完了にする" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CashflowTimeline rolling={accountRolling} />

      <ScheduledEditor items={scheduled} accountOptions={accountOptions} />
      <TransferEditor items={transfers} accountOptions={accountOptions} />

      <section className="mt-6" aria-label="毎月の定期">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          毎月の定期（家賃・サブスク・定期収入）
        </h2>
        <p className="mb-1 text-[11px] text-muted">
          毎月くり返す収入・固定費はここで管理します（単発予定と二重に登録しないでください）。
        </p>
        <RecurringEditor items={recurring} occurrences={occurrences} accountOptions={accountOptions} />
      </section>

      <AccountBalanceEditor items={balances} />
    </main>
  );
}
