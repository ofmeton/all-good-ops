import type { AssetPoint } from "@/lib/asset-queries";
import { yen, shortDate } from "@/lib/format";

// ② 資産推移チャート: asset_history 全期間の total をインライン SVG ライン+エリアで表示。
// TrendChart.tsx の作法に従う（viewBox / CSS トークン / aria-label + sr-only 代替テーブル）。

// 'YYYY-MM-DD' → UTC ms（x 軸は経過時間ベース。スナップショット間隔の不均一を歪めない）。
function dateMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// 'YYYY-MM-DD' → '25年3月' 形式の短縮軸ラベル。
function axisLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${String(y).slice(2)}年${m}月`;
}

// 点数が多いときの間引き: 約 maxPoints 件に等間隔サンプリング（先頭・末尾は必ず残す）。
function thin(series: AssetPoint[], maxPoints: number): AssetPoint[] {
  const n = series.length;
  if (n <= maxPoints) return series;
  const step = Math.ceil(n / maxPoints);
  const out = series.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== series[n - 1]) out.push(series[n - 1]);
  return out;
}

export function AssetTrendChart({ series }: { series: AssetPoint[] }) {
  if (series.length === 0) return null;

  const pts = thin(series, 120);
  const n = pts.length;

  // --- レイアウト定数（viewBox 座標。実寸は CSS で 100% 幅にスケール） ---
  const W = 360;
  const padX = 6;
  const padTop = 10;
  const plotH = 110;
  const labelH = 18;
  const H = padTop + plotH + labelH;

  const t0 = dateMs(pts[0].date);
  const t1 = dateMs(pts[n - 1].date);
  const tSpan = t1 - t0 || 1; // 1 点のみの 0 除算回避

  const totals = pts.map((p) => p.total);
  const max = Math.max(...totals);
  const min = Math.min(0, ...totals); // 0 基準を含めて規模感を保つ
  const span = max - min || 1;

  const x = (p: AssetPoint) =>
    padX + ((dateMs(p.date) - t0) / tSpan) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * plotH;

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p).toFixed(1)},${y(p.total).toFixed(1)}`)
    .join(" ");
  const baseY = y(Math.max(min, 0)); // エリアの底（0 円ライン）
  const areaPath = `${linePath} L${x(pts[n - 1]).toFixed(1)},${baseY.toFixed(1)} L${x(pts[0]).toFixed(1)},${baseY.toFixed(1)} Z`;

  const latest = pts[n - 1];
  const first = pts[0];
  const mid = pts[Math.floor(n / 2)];

  return (
    <section className="mt-4" aria-label="資産推移">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            資産推移（全期間）
          </h2>
          <span className="tabular text-xs font-medium text-foreground">
            最新 ¥{yen(latest.total)}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`${first.date}から${latest.date}までの資産総額の推移。最新は${yen(latest.total)}円。詳細は下の表を参照。`}
          className="h-auto w-full"
        >
          {/* 0 円基準線 */}
          <line
            x1={padX}
            x2={W - padX}
            y1={baseY}
            y2={baseY}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <path d={areaPath} fill="var(--primary)" opacity={0.08} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* 最新点のマーカー */}
          <circle
            cx={x(latest)}
            cy={y(latest.total)}
            r={3}
            fill="var(--primary)"
          >
            <title>{`${shortDate(latest.date)}: ¥${yen(latest.total)}`}</title>
          </circle>
          {/* x 軸ラベル: 先頭 / 中間 / 末尾の 3 点のみ（モバイルで詰まらないよう） */}
          <text x={x(first)} y={H - 5} textAnchor="start" fontSize={9} fill="var(--muted)">
            {axisLabel(first.date)}
          </text>
          {/* mid はインデックス中央だが x は時間スケール → 端ラベルと重なる位置なら出さない */}
          {n > 2 && x(mid) - x(first) > 70 && x(latest) - x(mid) > 70 && (
            <text x={x(mid)} y={H - 5} textAnchor="middle" fontSize={9} fill="var(--muted)">
              {axisLabel(mid.date)}
            </text>
          )}
          <text x={x(latest)} y={H - 5} textAnchor="end" fontSize={9} fill="var(--muted)">
            {axisLabel(latest.date)}
          </text>
        </svg>

        {/* スクリーンリーダー / 視覚の代替: 簡易テーブル */}
        <table className="sr-only">
          <caption>資産総額の推移（スナップショット）</caption>
          <thead>
            <tr>
              <th>日付</th>
              <th>資産総額</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p) => (
              <tr key={p.date}>
                <th scope="row">{p.date}</th>
                <td>¥{yen(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
