import type { DisposableResult } from "@/lib/types";
import { yen } from "@/lib/format";

// 「今月あといくら使える」主役カード。remaining を最大表示し符号で色分け。
export function DisposableHero({ data }: { data: DisposableResult }) {
  const { remaining, disposableBudget, variableActual } = data;
  const positive = remaining >= 0;

  // 変動費が可処分予算に占める割合（予算ゲージ）。
  const usedRatio =
    disposableBudget > 0
      ? Math.min(100, Math.max(0, (variableActual / disposableBudget) * 100))
      : variableActual > 0
        ? 100
        : 0;

  const accent = positive ? "text-positive" : "text-negative";
  const gauge = positive ? "bg-positive" : "bg-negative";

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      aria-label="今月の可処分額"
    >
      <p className="text-sm font-medium text-muted">今月あと使える</p>
      <p className={`mt-1 flex items-baseline gap-1 ${accent}`}>
        <span className="text-2xl font-semibold sm:text-3xl" aria-hidden>
          ¥
        </span>
        <span className="tabular text-5xl font-bold leading-none sm:text-6xl">
          {yen(remaining)}
        </span>
      </p>

      <div className="mt-5">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-border"
          role="img"
          aria-label={`可処分予算 ${yen(disposableBudget)}円 のうち 変動費 ${yen(variableActual)}円 を使用`}
        >
          <div
            className={`h-full rounded-full ${gauge} transition-[width] duration-300`}
            style={{ width: `${usedRatio}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          可処分予算{" "}
          <span className="tabular font-medium text-foreground">
            ¥{yen(disposableBudget)}
          </span>{" "}
          のうち、変動費{" "}
          <span className="tabular font-medium text-foreground">
            ¥{yen(variableActual)}
          </span>{" "}
          を使用
        </p>
        {!positive && (
          <p className="mt-2 text-sm font-medium text-negative">
            予算を ¥{yen(Math.abs(remaining))} 超過しています
          </p>
        )}
      </div>
    </section>
  );
}
