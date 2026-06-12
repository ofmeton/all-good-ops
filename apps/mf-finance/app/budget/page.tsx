import type { Metadata } from "next";
import { getBudgetMaxYm, getBudgetVsActual } from "@/lib/budget-queries";
import { formatYm, isValidYm, parseYm, yen } from "@/lib/format";
import { AnomalyAlerts } from "@/app/components/AnomalyAlerts";
import { MonthSelector } from "@/app/components/MonthSelector";
import { BudgetRow } from "./BudgetRow";

// SQLite ファイル更新を再ビルドなしで反映（毎リクエスト最新化）。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "予算と実績 — mf-finance",
  description: "カテゴリ別の予算設定と当月実績の消化率・異常検知",
};

export default async function BudgetPage({
  searchParams,
}: {
  // Next 16: searchParams は Promise。
  searchParams: Promise<{ ym?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultYm = formatYm(now.getFullYear(), now.getMonth() + 1);
  const ym = isValidYm(sp.ym) ? sp.ym : defaultYm;
  const { year, month } = parseYm(ym);

  const maxYm = getBudgetMaxYm();
  const rows = getBudgetVsActual(year, month);

  // 予算設定済みカテゴリのみの合計（未設定カテゴリは予算合計に混ぜない）。
  const budgeted = rows.filter((r) => r.budget != null);
  const totalBudget = budgeted.reduce((s, r) => s + (r.budget ?? 0), 0);
  const totalActual = budgeted.reduce((s, r) => s + r.actual, 0);
  const totalRemaining = totalBudget - totalActual;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          予算と実績
        </h1>
        <p className="mt-1 text-[11px] text-muted">
          カテゴリごとに月予算を設定し、当月の消化率を確認します。
        </p>
      </header>

      <div className="mb-4">
        <MonthSelector ym={ym} maxYm={maxYm} />
      </div>

      <div className="mb-4">
        <AnomalyAlerts ym={ym} />
      </div>

      {budgeted.length > 0 && (
        <section
          className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
          aria-label="予算設定済みカテゴリの合計"
        >
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs font-medium text-muted">予算合計</dt>
              <dd className="tabular mt-1 text-base font-semibold text-foreground sm:text-xl">
                <span className="text-xs" aria-hidden>
                  ¥
                </span>
                {yen(totalBudget)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">実績合計</dt>
              <dd className="tabular mt-1 text-base font-semibold text-foreground sm:text-xl">
                <span className="text-xs" aria-hidden>
                  ¥
                </span>
                {yen(totalActual)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">
                {totalRemaining < 0 ? "超過" : "残り"}
              </dt>
              <dd
                className={`tabular mt-1 text-base font-semibold sm:text-xl ${totalRemaining < 0 ? "text-negative" : "text-foreground"}`}
              >
                <span className="text-xs" aria-hidden>
                  ¥
                </span>
                {yen(Math.abs(totalRemaining))}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted">
            予算を設定したカテゴリのみの合計です。
          </p>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            支出カテゴリがまだありません（データの蓄積をお待ちください）。
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="カテゴリ別の予算と実績（支出の大きい順）">
          {rows.map((r) => (
            <BudgetRow key={r.category_major} row={r} />
          ))}
        </ul>
      )}
    </main>
  );
}
