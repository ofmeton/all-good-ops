import {
  getPendingProposals,
  getProposalCounts,
  getDecisionLog,
  getRuns,
  getCategoryOptions,
  getProposalSamples,
} from "@/lib/optimizer/proposals-queries";
import type { OptimizerProposal } from "@/lib/optimizer/types";
import { ProposalCard } from "@/app/optimizer/ProposalCard";
import { DecisionLog } from "@/app/optimizer/DecisionLog";
import { RefreshButton } from "@/app/optimizer/RefreshButton";
import { kindLabel, dateTimeLabel } from "@/app/optimizer/labels";

// SQLite ファイル更新を再ビルドなしで反映（承認後の revalidate と整合）。
export const dynamic = "force-dynamic";

// pending 提案を kind 別にグルーピング（getPendingProposals の confidence/created 順を保持）。
function groupByKind(items: OptimizerProposal[]): [string, OptimizerProposal[]][] {
  const map = new Map<string, OptimizerProposal[]>();
  for (const p of items) {
    const arr = map.get(p.kind) ?? [];
    arr.push(p);
    map.set(p.kind, arr);
  }
  return Array.from(map.entries());
}

export default function OptimizerPage() {
  const pending = getPendingProposals();
  const counts = getProposalCounts();
  const decisions = getDecisionLog(50);
  const runs = getRuns(1);
  const lastRun = runs[0] ?? null;
  const categoryOptions = getCategoryOptions();

  const grouped = groupByKind(pending);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <a
        href="/"
        className="inline-flex h-9 items-center text-sm font-medium text-primary transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← ダッシュボードへ戻る
      </a>

      <header className="mb-4 mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            オプティマイザー — 提案キュー
          </h1>
          <p className="mt-1 text-xs text-muted">
            未処理{" "}
            <span className="tabular font-semibold text-foreground">
              {counts.total}件
            </span>
            {lastRun && (
              <>
                {" "}
                ・最終更新{" "}
                <time className="tabular" dateTime={lastRun.ran_at}>
                  {dateTimeLabel(lastRun.ran_at)}
                </time>{" "}
                ({lastRun.ran_by === "signal" ? "シグナル" : "LLM"})
              </>
            )}
          </p>
          {counts.total > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(counts.byKind).map(([kind, c]) => (
                <span
                  key={kind}
                  className="tabular inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted"
                >
                  {kindLabel(kind)} {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <RefreshButton />
      </header>

      {pending.length === 0 ? (
        <p
          className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted"
          role="status"
        >
          未処理の提案はありません。「シグナル更新」で最新のシグナルを取り込めます。
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([kind, items]) => (
            <section key={kind} aria-label={kindLabel(kind)}>
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                {kindLabel(kind)}
                <span className="ml-2 tabular text-xs font-normal text-muted">
                  {items.length}件
                </span>
              </h2>
              <ul className="space-y-2">
                {items.map((p) => {
                  const { samples, total } = getProposalSamples(p);
                  return (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      samples={samples}
                      sampleTotal={total}
                      categoryOptions={categoryOptions}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-10" aria-label="決定ログ">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          決定ログ
          <span className="ml-2 tabular text-xs font-normal text-muted">
            直近{decisions.length}件
          </span>
        </h2>
        <DecisionLog items={decisions} />
      </section>
    </main>
  );
}
