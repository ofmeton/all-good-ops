import { getDisposable, getLatestTxDate } from "@/lib/queries";
import { monthLabel, shortDate } from "@/lib/format";
import { DisposableHero } from "@/app/components/DisposableHero";
import { DisposableBreakdown } from "@/app/components/DisposableBreakdown";

// SQLite ファイル更新を再ビルドなしで反映（毎リクエスト最新化）。
export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { disposable } = getDisposable(year, month);
  const latest = getLatestTxDate();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            家計ダッシュボード
          </h1>
          <p className="text-sm text-muted">{monthLabel(year, month)}</p>
        </div>
        {latest && (
          <p className="text-xs text-muted">
            データ最新: {shortDate(latest)}
          </p>
        )}
      </header>

      <DisposableHero data={disposable} />
      <DisposableBreakdown data={disposable} />
    </main>
  );
}
