import type { Metadata } from "next";
import Link from "next/link";
import {
  getBudgetMaxYm,
  getBudgetVsActual,
  type BudgetVsActualRow,
} from "@/lib/budget-queries";
import { formatYm, isValidYm, parseYm, yen } from "@/lib/format";
import { AnomalyAlerts } from "@/app/components/AnomalyAlerts";
import { MonthSelector } from "@/app/components/MonthSelector";
import { getCategoryGroups, rollupByGroup } from "@/lib/optimizer/grouping";
import { BudgetRow } from "./BudgetRow";

// 集計の括り方トグル（大項目 ⇄ グループ）。現在の ym を保持して by を差し替える。
function GroupToggle({ ym, by }: { ym: string; by: "major" | "group" }) {
  const base =
    "flex h-11 flex-1 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const active = "border-primary bg-surface text-primary shadow-sm";
  const idle =
    "border-border bg-background text-muted hover:border-primary hover:text-primary";
  return (
    <nav className="flex items-center gap-2" aria-label="集計の括り方">
      <Link
        href={`?ym=${ym}`}
        className={`${base} ${by === "major" ? active : idle}`}
        aria-current={by === "major" ? "page" : undefined}
      >
        大項目
      </Link>
      <Link
        href={`?ym=${ym}&by=group`}
        className={`${base} ${by === "group" ? active : idle}`}
        aria-current={by === "group" ? "page" : undefined}
      >
        グループ
      </Link>
    </nav>
  );
}

// グループ集計の読取専用カード。予算編集はグループ単位では行わない（budgets は大項目キーのため）
// ＝group 表示では消化率の俯瞰のみ。編集は大項目表示で。
function GroupBudgetRow({ row }: { row: BudgetVsActualRow }) {
  const { category_major: name, budget, actual } = row;
  const ratio = budget != null && budget > 0 ? actual / budget : null;
  const pct = ratio !== null ? Math.round(ratio * 100) : null;
  const remaining = budget != null ? budget - actual : null;
  const tone =
    ratio !== null && ratio > 1
      ? "negative"
      : ratio !== null && ratio >= 0.8
        ? "warning"
        : "positive";
  const barClass =
    tone === "negative" ? "bg-negative" : tone === "warning" ? "bg-warning" : "bg-positive";
  const remainClass =
    tone === "negative" ? "text-negative" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <li className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {name}
        </p>
        {remaining !== null ? (
          <p className={`tabular shrink-0 text-sm font-semibold ${remainClass}`}>
            {remaining < 0 ? `超過 ¥${yen(-remaining)}` : `残り ¥${yen(remaining)}`}
          </p>
        ) : (
          <p className="shrink-0 text-xs text-muted">予算未設定</p>
        )}
      </div>
      {budget != null ? (
        <div className="mt-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-background"
            role="img"
            aria-label={`消化率 ${pct}%`}
          >
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
            />
          </div>
          <p className="tabular mt-1 text-xs text-muted">
            ¥{yen(actual)} / ¥{yen(budget)}（消化率 {pct}%）
          </p>
        </div>
      ) : (
        <p className="tabular mt-2 text-xs text-muted">今月の支出 ¥{yen(actual)}</p>
      )}
    </li>
  );
}

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
  searchParams: Promise<{ ym?: string; by?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultYm = formatYm(now.getFullYear(), now.getMonth() + 1);
  const ym = isValidYm(sp.ym) ? sp.ym : defaultYm;
  const { year, month } = parseYm(ym);
  // 集計の括り方。'major'（既定）は従来挙動と完全同一・非破壊。
  const by: "major" | "group" = sp.by === "group" ? "group" : "major";

  const maxYm = getBudgetMaxYm();
  const rows = getBudgetVsActual(year, month);

  // group 表示時のみ大項目をグループへロールアップ。
  // budget/avg3 は null→0 で合算後、合算0なら null へ戻し over を再計算。actual 降順で再整列。
  const displayRows: BudgetVsActualRow[] =
    by === "group"
      ? rollupByGroup(
          rows,
          getCategoryGroups(),
          "category_major",
          ["actual", "budget", "avg3"],
        )
          .map((r) => {
            const budget = (r.budget ?? 0) > 0 ? r.budget : null;
            const avg3 = (r.avg3 ?? 0) > 0 ? r.avg3 : null;
            return {
              ...r,
              budget,
              avg3,
              over: budget != null && r.actual > budget,
            };
          })
          .sort(
            (a, b) =>
              b.actual - a.actual ||
              a.category_major.localeCompare(b.category_major, "ja"),
          )
      : rows;

  // 予算設定済みカテゴリのみの合計（未設定カテゴリは予算合計に混ぜない）。
  const budgeted = displayRows.filter((r) => r.budget != null);
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
        <GroupToggle ym={ym} by={by} />
      </div>

      {by === "group" && (
        <p className="mb-3 text-[11px] text-muted">
          グループ表示は消化率の俯瞰のみです。予算の編集は「大項目」表示で行えます。
        </p>
      )}

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

      {displayRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            支出カテゴリがまだありません（データの蓄積をお待ちください）。
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="カテゴリ別の予算と実績（支出の大きい順）">
          {displayRows.map((r) =>
            by === "group" ? (
              <GroupBudgetRow key={r.category_major} row={r} />
            ) : (
              <BudgetRow key={r.category_major} row={r} />
            ),
          )}
        </ul>
      )}
    </main>
  );
}
