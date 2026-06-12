import Link from "next/link";
import {
  getCategoryDetail,
  getCategoryMaxYm,
  getCategorySpend,
  type CategorySpend,
} from "@/lib/category-queries";
import { formatYm, isValidYm, parseYm, shortDate, yen, yenSigned } from "@/lib/format";
import { MonthSelector } from "@/app/components/MonthSelector";

// SQLite ファイル更新を再ビルドなしで反映（毎リクエスト最新化）。
export const dynamic = "force-dynamic";

// 前月比（支出は増=悪）。色だけに頼らず矢印+符号テキストを併記。
function SpendDelta({ spend, prevSpend }: { spend: number; prevSpend: number }) {
  if (prevSpend === 0) {
    return <span className="text-xs text-muted">前月比 —</span>;
  }
  const diff = spend - prevSpend;
  const flat = diff === 0;
  const up = diff > 0;
  const color = flat ? "text-muted" : up ? "text-negative" : "text-positive";
  const arrow = flat ? "→" : up ? "↑" : "↓";
  return (
    <span className={`tabular text-xs font-medium ${color}`}>
      <span aria-hidden className="mr-0.5">
        {arrow}
      </span>
      ¥{yenSigned(diff)}
      <span className="sr-only">（前月比）</span>
    </span>
  );
}

// 支出額バー（最大カテゴリ比の割合）。数値併記が本体、バーは補助。
function SpendBar({ ratio }: { ratio: number }) {
  return (
    <div
      aria-hidden
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: "var(--border)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.round(ratio * 100))}%`,
          background: "var(--primary)",
        }}
      />
    </div>
  );
}

// 大項目リスト（支出降順・クリックでドリルダウン）。
function MajorList({ rows, ym }: { rows: CategorySpend[]; ym: string }) {
  const max = Math.max(...rows.map((r) => r.spend), 1);
  return (
    <ul className="space-y-2" aria-label="大項目別の支出一覧">
      {rows.map((r) => (
        <li key={r.major}>
          <Link
            href={`/categories?ym=${ym}&major=${encodeURIComponent(r.major)}`}
            className="block rounded-xl border border-border bg-surface p-3 shadow-sm transition-colors duration-150 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`${r.major} の内訳を見る（支出 ${yen(r.spend)}円・${r.count}件）`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {r.major}
                <span className="ml-1.5 text-[11px] font-normal text-muted">
                  {r.count}件
                </span>
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                ¥{yen(r.spend)}
              </span>
            </div>
            <div className="mt-2">
              <SpendBar ratio={r.spend / max} />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <SpendDelta spend={r.spend} prevSpend={r.prevSpend} />
              <span aria-hidden className="text-xs text-muted">
                ›
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 大項目ドリルダウン（中項目別合計 + 明細トップ20）。
function MajorDetail({
  ym,
  year,
  month,
  major,
}: {
  ym: string;
  year: number;
  month: number;
  major: string;
}) {
  const detail = getCategoryDetail(year, month, major);
  const total = detail.middles.reduce((s, m) => s + m.spend, 0);
  const max = Math.max(...detail.middles.map((m) => m.spend), 1);

  if (detail.middles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <p className="text-sm text-muted">
          この月の「{major}」の支出はありません。
        </p>
        <Link
          href={`/categories?ym=${ym}`}
          className="mt-3 inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:border-primary"
        >
          ‹ カテゴリ一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        className="rounded-xl border border-border bg-surface p-4 shadow-sm"
        aria-label={`${major} の中項目別支出`}
      >
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">中項目別</h2>
          <p className="tabular text-sm font-semibold text-foreground">
            合計 ¥{yen(total)}
          </p>
        </div>
        <ul className="space-y-3">
          {detail.middles.map((m) => (
            <li key={m.middle}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-foreground">
                  {m.middle}
                  <span className="ml-1.5 text-[11px] text-muted">
                    {m.count}件
                  </span>
                </span>
                <span className="tabular shrink-0 text-sm font-medium text-foreground">
                  ¥{yen(m.spend)}
                </span>
              </div>
              <div className="mt-1.5">
                <SpendBar ratio={m.spend / max} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-xl border border-border bg-surface p-4 shadow-sm"
        aria-label={`${major} の明細（金額の大きい順・最大20件）`}
      >
        <h2 className="mb-1 text-sm font-semibold text-foreground">
          明細トップ{detail.transactions.length}
        </h2>
        <p className="mb-2 text-[11px] text-muted">金額の大きい順</p>
        <ul className="divide-y divide-border">
          {detail.transactions.map((t, i) => (
            <li
              key={`${t.date}-${i}`}
              className="flex min-h-11 items-center justify-between gap-3 py-2"
            >
              <span className="tabular w-16 shrink-0 text-xs text-muted">
                {shortDate(t.date)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {t.description}
              </span>
              <span className="tabular shrink-0 text-sm font-medium text-foreground">
                −¥{yen(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default async function CategoriesPage({
  searchParams,
}: {
  // Next 16: searchParams は Promise。
  searchParams: Promise<{ ym?: string; major?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const defaultYm = formatYm(now.getFullYear(), now.getMonth() + 1);
  const ym = isValidYm(sp.ym) ? sp.ym : defaultYm;
  const { year, month } = parseYm(ym);
  const major =
    typeof sp.major === "string" && sp.major.trim() !== ""
      ? sp.major.trim()
      : null;

  const maxYm = getCategoryMaxYm();
  // 詳細表示（major あり）では一覧集計（当月+前月）が未使用のためスキップ。
  const rows = major ? [] : getCategorySpend(year, month);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-4">
        {major ? (
          <nav aria-label="パンくず" className="text-sm">
            <Link
              href={`/categories?ym=${ym}`}
              className="font-medium text-primary hover:underline"
            >
              カテゴリ
            </Link>
            <span aria-hidden className="mx-1.5 text-muted">
              ›
            </span>
            <span className="font-semibold text-foreground">{major}</span>
          </nav>
        ) : (
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            カテゴリ別支出
          </h1>
        )}
      </header>

      <div className="mb-4">
        <MonthSelector ym={ym} maxYm={maxYm} />
      </div>

      {major ? (
        <>
          <h1 className="sr-only">{major} の支出内訳</h1>
          <MajorDetail ym={ym} year={year} month={month} major={major} />
          <div className="mt-4">
            <Link
              href={`/categories?ym=${ym}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary shadow-sm hover:border-primary"
            >
              ‹ カテゴリ一覧へ戻る
            </Link>
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            この月の支出データはありません（連携待ちの可能性があります）。
          </p>
        </div>
      ) : (
        <MajorList rows={rows} ym={ym} />
      )}
    </main>
  );
}
