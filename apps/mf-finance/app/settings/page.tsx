import { getRecurringItems, getManualLiabilities, getTransferFees } from "@/lib/write-queries";
import { getAccountOptions } from "@/lib/cashflow-queries";
import { RecurringEditor } from "@/app/components/RecurringEditor";
import { ManualLiabilityForm } from "@/app/components/ManualLiabilityForm";
import { TransferFeeEditor } from "@/app/settings/TransferFeeEditor";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const recurring = getRecurringItems();
  const liabilities = getManualLiabilities();
  const transferFees = getTransferFees();
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
          設定 — 定期項目・負債
        </h1>
        <p className="mt-1 text-xs text-muted">
          定期収入・固定費の有効/無効・金額、手動で管理する負債を編集できます。
          編集すると「確認済」になり、ダッシュボードの見込みに反映されます。
        </p>
      </header>

      <RecurringEditor items={recurring} occurrences={[]} accountOptions={accountOptions} />
      <TransferFeeEditor accounts={accountOptions} fees={transferFees} />
      <ManualLiabilityForm items={liabilities} />
    </main>
  );
}
