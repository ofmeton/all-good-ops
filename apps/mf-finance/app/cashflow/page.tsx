import {
  getRollingCashflow,
  getScheduledList,
  getAllAccountBalances,
} from "@/lib/cashflow-queries";
import { getRecurringItems } from "@/lib/write-queries";
import { RecurringEditor } from "@/app/components/RecurringEditor";
import { CashflowTimeline } from "@/app/cashflow/CashflowTimeline";
import { ScheduledEditor } from "@/app/cashflow/ScheduledEditor";
import { AccountBalanceEditor } from "@/app/cashflow/AccountBalanceEditor";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default function CashflowPage() {
  const rolling = getRollingCashflow(30);
  const scheduled = getScheduledList();
  const recurring = getRecurringItems();
  const balances = getAllAccountBalances();

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
          いつ・いくら入る／引き落とされるかを一元管理します。向こう1ヶ月の見込み残高、単発予定、毎月の定期、口座残高をここで扱います。
        </p>
      </header>

      <CashflowTimeline rolling={rolling} />

      <ScheduledEditor items={scheduled} />

      <section className="mt-6" aria-label="毎月の定期">
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          毎月の定期（家賃・サブスク・定期収入）
        </h2>
        <p className="mb-1 text-[11px] text-muted">
          毎月くり返す収入・固定費はここで管理します（単発予定と二重に登録しないでください）。
        </p>
        <RecurringEditor items={recurring} />
      </section>

      <AccountBalanceEditor items={balances} />
    </main>
  );
}
