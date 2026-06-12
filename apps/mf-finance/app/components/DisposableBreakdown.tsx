import type { DisposableResult } from "@/lib/types";
import { yen } from "@/lib/format";

type Row = {
  label: string;
  value: number;
  sign: "plus" | "minus";
  hint?: string;
};

// 可処分額の内訳。式: (定期収入見込み + スポット着金) − 固定費 − 変動費実績 = あと使える
export function DisposableBreakdown({ data }: { data: DisposableResult }) {
  const rows: Row[] = [
    {
      label: "定期収入見込み",
      value: data.incomeRecurring,
      sign: "plus",
      hint: "確定済みの定期収入",
    },
    {
      label: "スポット着金",
      value: data.incomeSpot,
      sign: "plus",
      hint: "定期外の入金実績",
    },
    {
      label: "固定費",
      value: data.fixed,
      sign: "minus",
      hint: "確定済みの定期支出",
    },
    {
      label: "変動費実績",
      value: data.variableActual,
      sign: "minus",
      hint: "今月の変動費の実支出",
    },
  ];

  return (
    <section className="mt-4" aria-label="可処分額の内訳">
      <dl className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <dt className="text-xs font-medium text-muted">{r.label}</dt>
            <dd
              className={`tabular mt-1 text-xl font-semibold sm:text-2xl ${
                r.sign === "plus" ? "text-positive" : "text-foreground"
              }`}
            >
              <span className="text-sm" aria-hidden>
                {r.sign === "plus" ? "+" : "−"}¥
              </span>
              {yen(r.value)}
            </dd>
            {r.hint && <p className="mt-0.5 text-[11px] text-muted">{r.hint}</p>}
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">収入合計（見込み + 着金）</span>
          <span className="tabular font-semibold text-positive">
            +¥{yen(data.incomeTotal)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted">固定費を引いた可処分予算</span>
          <span className="tabular font-semibold text-foreground">
            ¥{yen(data.disposableBudget)}
          </span>
        </div>
      </div>
    </section>
  );
}
