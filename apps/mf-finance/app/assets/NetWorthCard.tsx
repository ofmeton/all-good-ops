import type { NetWorth } from "@/lib/asset-queries";
import { yen, shortDate } from "@/lib/format";

// ① 純資産カード: 資産 − 手入力負債 = 純資産。負債 0 件なら資産のみを主表示。
export function NetWorthCard({ data }: { data: NetWorth }) {
  const { latestAssetDate, assetTotal, liabilityTotal, netWorth } = data;
  const hasLiability = liabilityTotal > 0;

  if (latestAssetDate === null) {
    return (
      <section aria-label="純資産">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm text-muted">
            資産データがまだありません（asset_history が空です）。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="純資産">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {hasLiability ? "純資産" : "総資産"}
          </h2>
          <p className="text-[11px] text-muted">
            {shortDate(latestAssetDate)}時点
          </p>
        </div>
        <p
          className={`tabular mt-1 text-3xl font-semibold leading-tight ${
            netWorth >= 0 ? "text-foreground" : "text-negative"
          }`}
        >
          <span className="text-base" aria-hidden>
            ¥
          </span>
          {yen(netWorth)}
        </p>

        {hasLiability ? (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <dt className="text-xs text-muted">資産</dt>
              <dd className="tabular mt-0.5 text-sm font-medium text-foreground">
                ¥{yen(assetTotal)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <dt className="text-xs text-muted">負債（手入力）</dt>
              <dd className="tabular mt-0.5 text-sm font-medium text-negative">
                −¥{yen(liabilityTotal)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-muted">
            負債の登録はありません（純資産 = 資産合計）。
          </p>
        )}
      </div>
    </section>
  );
}
