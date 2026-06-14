import type { SeriesPoint } from "@/lib/types";
import { yen, yenSigned, ymLabel, ymShort } from "@/lib/format";

// 直近 N ヶ月の月次 net をインライン SVG 棒グラフで表示（chart ライブラリ非依存）。
// 正/負で色分け、選択月を強調。hover で title ツールチップ、aria-label + 代替テーブルでアクセシブル。
export function TrendChart({
  series,
  selectedYm,
}: {
  series: SeriesPoint[];
  selectedYm: string;
}) {
  // --- レイアウト定数（viewBox 座標。実寸は CSS で 100% 幅にスケール） ---
  const W = 360;
  const padX = 6;
  const padTop = 8;
  const barsH = 92; // 棒の描画高さ
  const labelH = 18; // 軸ラベル行
  const H = padTop + barsH + labelH;

  const n = series.length;
  const slot = (W - padX * 2) / Math.max(1, n);
  const barW = slot * 0.6;

  const nets = series.map((p) => p.net);
  const posMax = Math.max(0, ...nets);
  const negMax = Math.max(0, ...nets.map((v) => -v));
  const total = posMax + negMax || 1; // 全 0 のときの 0 除算回避
  const zeroY = padTop + barsH * (posMax / total);

  // ラベル間引き: 3 ヶ月おき + 末尾 + 選択月は必ず表示（モバイルで詰まらないよう）。
  const showLabel = (i: number, ym: string) =>
    i % 3 === 0 || i === n - 1 || ym === selectedYm;

  return (
    <section className="mt-4" aria-label="直近12ヶ月の収支トレンド">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            収支トレンド（直近{n}ヶ月）
          </h2>
          <span className="flex items-center gap-2 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: "var(--positive)" }}
              />
              黒字
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: "var(--negative)" }}
              />
              赤字
            </span>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`直近${n}ヶ月の月次収支の棒グラフ。詳細は下の表を参照。`}
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
          {series.map((p, i) => {
            const cx = padX + slot * i + slot / 2;
            const x = cx - barW / 2;
            const positive = p.net >= 0;
            const h = (Math.abs(p.net) / total) * barsH;
            const y = positive ? zeroY - h : zeroY;
            const selected = p.ym === selectedYm;
            const fill = positive ? "var(--positive)" : "var(--negative)";
            const tip = `${ymLabel(p.ym)}: 収支 ¥${yenSigned(p.net)}（収入 +¥${yen(p.income)} / 支出 −¥${yen(p.expense)}）`;
            return (
              <g key={p.ym}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 1)}
                  rx={2}
                  fill={fill}
                  opacity={selected ? 1 : 0.62}
                  stroke={selected ? "var(--primary)" : "none"}
                  strokeWidth={selected ? 1.5 : 0}
                >
                  <title>{tip}</title>
                </rect>
                {showLabel(i, p.ym) && (
                  <text
                    x={cx}
                    y={H - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fill={selected ? "var(--primary)" : "var(--muted)"}
                    fontWeight={selected ? 600 : 400}
                  >
                    {ymShort(p.ym)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* スクリーンリーダー / 視覚の代替: 簡易テーブル */}
        <table className="sr-only">
          <caption>直近{n}ヶ月の月次収支</caption>
          <thead>
            <tr>
              <th>月</th>
              <th>収入</th>
              <th>支出</th>
              <th>収支</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.ym}>
                <th scope="row">{ymLabel(p.ym)}</th>
                <td>¥{yen(p.income)}</td>
                <td>¥{yen(p.expense)}</td>
                <td>¥{yenSigned(p.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
