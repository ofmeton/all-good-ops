import { getRules, getRulesSummary } from "@/lib/rules-queries";
import { RulesManager } from "./RulesManager";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

export default function RulesPage() {
  const rules = getRules();
  const summary = getRulesSummary();

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
          分類ルール
        </h1>
        <p className="mt-1 text-xs text-muted">
          明細の説明文（description）へのマッチで未分類の取引を自動分類するルールです。
          ルールが SSOT（正）で、追加・削除すると全ルールが再適用されます。
        </p>
      </header>

      <RulesManager rules={rules} summary={summary} />
    </main>
  );
}
