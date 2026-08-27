import { Container } from "@/app/components/Container";
import { PageHeader } from "@/app/components/PageHeader";
import { SectionTabs } from "@/app/components/SectionTabs";
import {
  getCategoryOptions,
  getTriageGroups,
  getTriageSummary,
} from "@/lib/triage-queries";
import { TriageWorkbench } from "./TriageWorkbench";

export const dynamic = "force-dynamic";

export default function TriagePage() {
  const groups = getTriageGroups();
  const categoryOptions = getCategoryOptions();
  const summary = getTriageSummary();

  return (
    <Container variant="readable">
      <PageHeader
        title="未分類の仕分け"
        description="反復する明細はルールに、一度だけの明細は取引ごとの上書きに保存できます。"
        subnav={<SectionTabs group="expense" />}
      />
      {summary.unknownCount === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted shadow-sm">
          未分類はありません。
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted shadow-sm">
          説明のない未分類が {summary.unknownCount} 件あります。仕分け対象にできないため、データ更新で説明を確認してください。
        </p>
      ) : (
        <TriageWorkbench
          groups={groups}
          categoryOptions={categoryOptions}
          summary={summary}
        />
      )}
    </Container>
  );
}
