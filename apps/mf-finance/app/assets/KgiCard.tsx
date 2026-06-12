import type { KgiProgress } from "@/lib/asset-queries";
import { yen, ymLabel } from "@/lib/format";

// 1 本のプログレスバー行。達成率はテキストでも併記（色のみの意味付け禁止）。
function ProgressRow({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const rate = target > 0 ? (value / target) * 100 : 0;
  const width = Math.max(0, Math.min(100, rate));
  const achieved = rate >= 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        <span className="tabular text-xs font-medium text-foreground">
          ¥{yen(value)}
          <span className="ml-1 text-muted">
            （達成率 {Math.round(rate)}%{achieved ? "・達成" : ""}）
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(rate, 100))}
        aria-label={`${label}の目標達成率 ${Math.round(rate)}%`}
        className="mt-1 h-2.5 w-full overflow-hidden rounded-full border border-border bg-background"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: achieved ? "var(--positive)" : "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}

// ③ KGI カード: 直近確定月の収入と 3 ヶ月平均を月収目標 ¥260,000 と比較。
export function KgiCard({ data }: { data: KgiProgress }) {
  const { target, latestMonth, avg3m } = data;

  return (
    <section className="mt-4" aria-label="月収目標の進捗">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            月収目標との比較
          </h2>
          <span className="tabular text-xs text-muted">
            目標 ¥{yen(target)}/月
          </span>
        </div>

        {latestMonth === null ? (
          <p className="text-sm text-muted">
            比較できる確定月のデータがまだありません。
          </p>
        ) : (
          <div className="space-y-3">
            <ProgressRow
              label={`直近確定月（${ymLabel(latestMonth.ym)}）の収入`}
              value={latestMonth.income}
              target={target}
            />
            <ProgressRow
              label="直近3ヶ月平均の収入"
              value={avg3m}
              target={target}
            />
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted">
          ※ 目標（月収26万円）は現在凍結中のため参考表示です。進行中の当月は含めず、確定した月のみで集計しています。
        </p>
      </div>
    </section>
  );
}
