import type { DisposableResult, LargeIncome } from "@/lib/types";
import { yen } from "@/lib/format";
import { shortDate } from "@/lib/format";

type Alert = {
  key: string;
  tone: "negative" | "warning" | "positive";
  title: string;
  detail?: string;
};

// 可処分の残量・大口着金から当月のアラートを導出。
function buildAlerts(
  disposable: DisposableResult,
  largeIncomes: LargeIncome[],
): Alert[] {
  const alerts: Alert[] = [];
  const { remaining, disposableBudget } = disposable;

  if (remaining < 0) {
    alerts.push({
      key: "over",
      tone: "negative",
      title: "予算を超過しています",
      detail: `あと使える額が ¥${yen(Math.abs(remaining))} のマイナスです`,
    });
  } else if (disposableBudget > 0 && remaining / disposableBudget < 0.1) {
    // 可処分予算の残り10%未満。
    alerts.push({
      key: "low",
      tone: "warning",
      title: "今月の残りがわずかです",
      detail: `あと使える額は ¥${yen(remaining)}（予算の${Math.round((remaining / disposableBudget) * 100)}%）`,
    });
  }

  for (const inc of largeIncomes) {
    alerts.push({
      key: `income-${inc.date}-${inc.amount}`,
      tone: "positive",
      title: `大口の着金 +¥${yen(inc.amount)}`,
      detail: `${shortDate(inc.date)} ${inc.description}`,
    });
  }

  return alerts;
}

const toneClass: Record<Alert["tone"], string> = {
  negative: "border-negative/30 bg-negative/5 text-negative",
  warning: "border-warning/30 bg-warning/5 text-warning",
  positive: "border-positive/30 bg-positive/5 text-positive",
};

export function Alerts({
  disposable,
  largeIncomes,
}: {
  disposable: DisposableResult;
  largeIncomes: LargeIncome[];
}) {
  const alerts = buildAlerts(disposable, largeIncomes);
  if (alerts.length === 0) return null;

  return (
    <section className="mt-4 space-y-2" aria-label="今月のアラート">
      {alerts.map((a) => (
        <div
          key={a.key}
          className={`rounded-xl border px-4 py-3 ${toneClass[a.tone]}`}
          role={a.tone === "negative" ? "alert" : "status"}
        >
          <p className="text-sm font-semibold">{a.title}</p>
          {a.detail && <p className="mt-0.5 text-xs opacity-90">{a.detail}</p>}
        </div>
      ))}
    </section>
  );
}
