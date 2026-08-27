import { getRules, getRulesSummary } from "@/lib/rules-queries";
import { Container } from "@/app/components/Container";
import { PageHeader } from "@/app/components/PageHeader";
import { SectionTabs } from "@/app/components/SectionTabs";
import { RulesManager } from "./RulesManager";
import Link from "next/link";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default function RulesPage() {
  const rules = getRules();
  const summary = getRulesSummary();

  return (
    <Container variant="readable">
      <PageHeader
        title="分類ルール"
        description="明細の説明文（description）へのマッチで未分類の取引を自動分類するルールです。ルールが SSOT（正）で、追加・削除すると全ルールが再適用されます。"
        subnav={<SectionTabs group="expense" />}
      />

      {summary.unknownCount > 0 ? (
        <Link
          href="/rules/triage"
          className="mb-4 flex min-h-11 items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-4 text-sm font-medium text-warning transition-colors duration-150 hover:bg-warning/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
        >
          未分類 {summary.unknownCount} 件を仕分ける
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      <RulesManager rules={rules} summary={summary} />
    </Container>
  );
}
