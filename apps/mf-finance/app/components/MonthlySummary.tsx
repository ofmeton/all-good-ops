import type { MonthlySummary } from "@/lib/types";
import { yen, yenSigned } from "@/lib/format";

// 1 行の比較表示（ラベル + 矢印 + 差分）。base が空月なら「比較対象なし」。
// 意味（goodWhenUp）に応じて配色: 増が良い指標は増=緑、支出のように増が悪い指標は増=赤。
// 色だけに頼らず矢印+符号テキストも併記。
function DeltaLine({
  label,
  current,
  baseValue,
  baseEmpty,
  goodWhenUp,
}: {
  label: string;
  current: number;
  baseValue: number;
  baseEmpty: boolean;
  goodWhenUp: boolean;
}) {
  const diff = current - baseValue;
  const up = diff > 0;
  const flat = diff === 0;
  // 増が良い指標: 増→緑/減→赤。増が悪い指標(支出): 増→赤/減→緑。
  const good = flat ? null : goodWhenUp ? up : !up;
  const color =
    good === null
      ? "text-muted"
      : good
        ? "text-positive"
        : "text-negative";
  const arrow = flat ? "→" : up ? "↑" : "↓";

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted">{label}</span>
      {baseEmpty ? (
        <span className="text-xs text-muted">比較対象なし</span>
      ) : (
        <span className={`tabular text-xs font-medium ${color}`}>
          <span aria-hidden className="mr-0.5">
            {arrow}
          </span>
          ¥{yenSigned(diff)}
        </span>
      )}
    </div>
  );
}

// 選択月の実績収支サマリ。hero（見込み込みの「あと使える」）とは別物。
export function MonthlySummary({ data }: { data: MonthlySummary }) {
  const { income, expense, net, prev, yoy } = data;
  // 「空月（データ無し）」判定: 比較対象の取引が全く無いと income/expense が共に 0。
  const prevEmpty = prev.income === 0 && prev.expense === 0;
  const yoyEmpty = yoy.income === 0 && yoy.expense === 0;

  const netPositive = net >= 0;

  const cards: {
    label: string;
    value: number;
    accent: string;
    sign: string;
  }[] = [
    { label: "収入", value: income, accent: "text-positive", sign: "+" },
    { label: "支出", value: expense, accent: "text-foreground", sign: "−" },
    {
      label: "収支（net）",
      value: net,
      accent: netPositive ? "text-positive" : "text-negative",
      sign: net > 0 ? "+" : net < 0 ? "−" : "",
    },
  ];

  return (
    <section className="mt-4" aria-label="今月の実績収支">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">実績収支</h2>
        <p className="text-[11px] text-muted">
          この月に実際に動いたお金（見込みは含めません）
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4"
          >
            <dt className="text-xs font-medium text-muted">{c.label}</dt>
            <dd
              className={`tabular mt-1 text-lg font-semibold leading-tight sm:text-2xl ${c.accent}`}
            >
              <span className="text-xs" aria-hidden>
                {c.sign}¥
              </span>
              {yen(Math.abs(c.value))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-xs font-medium text-foreground">
          収支（net）の推移
        </p>
        <DeltaLine
          label="前月比"
          current={net}
          baseValue={prev.net}
          baseEmpty={prevEmpty}
          goodWhenUp
        />
        <DeltaLine
          label="前年同月比"
          current={net}
          baseValue={yoy.net}
          baseEmpty={yoyEmpty}
          goodWhenUp
        />
      </div>
    </section>
  );
}
