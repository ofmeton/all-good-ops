import type { Forecast } from "@/lib/forecast-queries";
import { yen, yenSigned, ymLabel, ymShort, shortDate } from "@/lib/format";

// ⑤ キャッシュフロー予測チャート: 今後 6 ヶ月の予測残高（projectedBalance）を棒グラフで表示。
// ゼロ割れ月は赤 + 警告文（色のみに頼らずテキストでも明示）。前提式を下部に小さく表示。
export function ForecastChart({ data }: { data: Forecast }) {
  const { baseDate, startBalance, points, firstNegativeYm, assumptions } = data;
  const n = points.length;
  if (n === 0) return null;

  // --- レイアウト定数（TrendChart.tsx と同じ viewBox 方式） ---
  const W = 360;
  const padX = 6;
  const padTop = 8;
  const barsH = 100;
  const labelH = 18;
  const H = padTop + barsH + labelH;

  const slot = (W - padX * 2) / n;
  const barW = slot * 0.55;

  const balances = points.map((p) => p.projectedBalance);
  const posMax = Math.max(0, startBalance, ...balances);
  const negMax = Math.max(0, ...balances.map((v) => -v));
  const total = posMax + negMax || 1; // 全 0 のときの 0 除算回避
  const zeroY = padTop + barsH * (posMax / total);

  return (
    <section className="mt-4" aria-label="キャッシュフロー予測">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            キャッシュフロー予測（今後{n}ヶ月）
          </h2>
          <span className="tabular text-[11px] text-muted">
            起点 ¥{yen(startBalance)}
            {baseDate ? `（${shortDate(baseDate)}時点）` : ""}
          </span>
        </div>

        {firstNegativeYm !== null && (
          <p
            role="alert"
            className="mb-2 rounded-lg border border-negative/30 bg-negative/5 px-3 py-2 text-xs font-medium text-negative"
          >
            注意: このペースだと {ymLabel(firstNegativeYm)}
            に残高がマイナスへ転じる見込みです。
          </p>
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`今後${n}ヶ月の月末予測残高の棒グラフ。詳細は下の表を参照。`}
          className="h-auto w-full"
        >
          {/* ゼロ基準線 */}
          <line
            x1={padX}
            x2={W - padX}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--border)"
            strokeWidth={1}
          />
          {points.map((p, i) => {
            const cx = padX + slot * i + slot / 2;
            const x = cx - barW / 2;
            const positive = p.projectedBalance >= 0;
            const h = (Math.abs(p.projectedBalance) / total) * barsH;
            const y = positive ? zeroY - h : zeroY;
            const fill = positive ? "var(--primary)" : "var(--negative)";
            const tip = `${ymLabel(p.ym)}: 月末予測残高 ¥${yen(p.projectedBalance)}（月次予測収支 ¥${yenSigned(p.projectedNet)}）`;
            return (
              <g key={p.ym}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 1)}
                  rx={2}
                  fill={fill}
                  opacity={0.85}
                >
                  <title>{tip}</title>
                </rect>
                <text
                  x={cx}
                  y={H - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fill={positive ? "var(--muted)" : "var(--negative)"}
                  fontWeight={positive ? 400 : 600}
                >
                  {ymShort(p.ym)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* スクリーンリーダー / 視覚の代替: 簡易テーブル */}
        <table className="sr-only">
          <caption>今後{n}ヶ月の月末予測残高</caption>
          <thead>
            <tr>
              <th>月</th>
              <th>月次予測収支</th>
              <th>月末予測残高</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.ym}>
                <th scope="row">{ymLabel(p.ym)}</th>
                <td>¥{yenSigned(p.projectedNet)}</td>
                <td>¥{yen(p.projectedBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 前提式（小さく表示） */}
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          前提: 月次予測収支 = 定期収入 ¥{yen(assumptions.recurringIncome)} −
          定期支出 ¥{yen(assumptions.recurringExpense)} − 変動費見込み ¥
          {yen(assumptions.variableAvg)}
          {assumptions.variableBasisYms.length > 0 &&
            `（${assumptions.variableBasisYms
              .slice()
              .reverse()
              .map(ymLabel)
              .join("・")}の実績平均）`}{" "}
          − 借入返済 ¥{yen(assumptions.liabilityPayment)} = ¥
          {yenSigned(
            assumptions.recurringIncome -
              assumptions.recurringExpense -
              assumptions.variableAvg -
              assumptions.liabilityPayment,
          )}
          /月。進行中の当月も按分せず 1 ヶ月分を適用しています。
        </p>
      </div>
    </section>
  );
}
