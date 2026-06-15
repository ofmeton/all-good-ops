import { getRecurringItems, getManualLiabilities, getTransferFees } from "@/lib/write-queries";
import { getAccountOptions } from "@/lib/cashflow-queries";
import { RecurringEditor } from "@/app/components/RecurringEditor";
import { ManualLiabilityForm } from "@/app/components/ManualLiabilityForm";
import { Container } from "@/app/components/Container";
import { PageHeader } from "@/app/components/PageHeader";
import { SectionTabs } from "@/app/components/SectionTabs";
import { TransferFeeEditor } from "@/app/settings/TransferFeeEditor";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const recurring = getRecurringItems();
  const liabilities = getManualLiabilities();
  const transferFees = getTransferFees();
  const accountOptions = getAccountOptions();

  return (
    <Container variant="readable">
      <PageHeader
        title="設定 — 定期項目・負債"
        description="定期収入・固定費の有効/無効・金額、手動で管理する負債を編集できます。編集すると「確認済」になり、ダッシュボードの見込みに反映されます。"
        subnav={<SectionTabs group="settings" />}
      />

      <RecurringEditor items={recurring} occurrences={[]} accountOptions={accountOptions} />
      <TransferFeeEditor accounts={accountOptions} fees={transferFees} />
      <ManualLiabilityForm items={liabilities} />
    </Container>
  );
}
