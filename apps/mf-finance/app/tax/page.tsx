import Link from "next/link";
import {
  getAvailableYears,
  getYearlyExpenseByCategory,
  getTaxSummary,
  getBusinessPl,
  type BusinessPlRow,
} from "@/lib/tax-queries";
import { yen, yenSigned } from "@/lib/format";
import { TaxMappingTable } from "./TaxMappingTable";

// SQLite ファイル更新を再ビルドなしで反映（書込後の revalidate と整合）。
export const dynamic = "force-dynamic";

// 年セレクタ（リンク式。transactions に実績がある年のみ）。
function YearSelector({ years, current }: { years: number[]; current: number }) {
  if (years.length === 0) return null;
  return (
    <nav aria-label="対象年の選択" className="flex flex-wrap gap-2">
      {years.map((y) => {
        const active = y === current;
        return (
          <Link
            key={y}
            href={`/tax?year=${y}`}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-xl border px-4 text-sm font-medium shadow-sm transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-foreground hover:border-primary"
            }`}
          >
            <span className="tabular">{y}年</span>
          </Link>
        );
      })}
    </nav>
  );
}

// freee 由来の月次事業 PL。0 行（未取込）が現状の正常系。
function BusinessPlSection({ rows }: { rows: BusinessPlRow[] }) {
  return (
    <section className="mt-8" aria-label="事業PL（freee）">
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        事業PL（freee）
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            freee 未取込（freee側の記帳開始後に取込可能）
          </p>
          <p className="mt-1 text-xs text-muted">
            取込手順: data/freee-pl.json を配置 → <code>node scripts/load-freee.mjs</code>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40 text-left text-[11px] text-muted">
                <th scope="col" className="px-3 py-2 font-medium sm:px-4">
                  月
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium sm:px-4">
                  収入
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium sm:px-4">
                  支出
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium sm:px-4">
                  利益
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-t border-border first:border-t-0">
                  <td className="tabular px-3 py-2 text-foreground sm:px-4">
                    {r.month}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-foreground sm:px-4">
                    {r.revenue != null ? `¥${yen(r.revenue)}` : "—"}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-foreground sm:px-4">
                    {r.expense != null ? `¥${yen(r.expense)}` : "—"}
                  </td>
                  <td
                    className={`tabular px-3 py-2 text-right font-medium sm:px-4 ${
                      r.profit != null && r.profit < 0
                        ? "text-negative"
                        : "text-positive"
                    }`}
                  >
                    {r.profit != null ? `¥${yenSigned(r.profit)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function TaxPage({
  searchParams,
}: {
  // Next 16: searchParams は Promise。
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const years = getAvailableYears();
  const defaultYear = years[0] ?? new Date().getFullYear();
  const requested = Number(sp.year);
  const year =
    /^\d{4}$/.test(sp.year ?? "") && years.includes(requested)
      ? requested
      : defaultYear;

  const rows = getYearlyExpenseByCategory(year);
  const summary = getTaxSummary(year);
  const businessPl = getBusinessPl();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <a
        href="/"
        className="inline-flex h-9 items-center text-sm font-medium text-primary transition-colors duration-150 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← ダッシュボードへ戻る
      </a>

      <header className="mb-4 mt-3">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          確定申告用 経費集計
        </h1>
        <p
          className="mt-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
          role="note"
        >
          本集計は参考値です。確定申告の最終判断は freee
          上の帳簿と税理士確認を優先してください。
        </p>
        <p className="mt-2 text-xs text-muted">
          カテゴリごとに事業按分（%）と青色申告の科目を設定すると、年間支出 ×
          按分率で経費の見込み額を試算します（試算であり確定値ではありません）。
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <YearSelector years={years} current={year} />
        <a
          href={`/api/tax-export?year=${year}`}
          className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary shadow-sm transition-colors duration-150 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          CSV ダウンロード（{year}年）
        </a>
      </div>

      <TaxMappingTable rows={rows} />

      {/* フッタ: 経費見込み合計（参考値） */}
      <div className="mt-4 flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-foreground">
          {year}年 経費見込み合計（参考値）
        </span>
        <span className="tabular text-lg font-semibold text-positive">
          ¥{yen(summary.totalEstimate)}
        </span>
      </div>
      <p className="mt-1 text-right text-[11px] text-muted">
        年間支出合計 ¥{yen(summary.totalSpend)} ・ 按分設定済み{" "}
        {summary.mappedMiddleCount}/{summary.totalMiddleCount} 中項目
      </p>

      <BusinessPlSection rows={businessPl} />
    </main>
  );
}
