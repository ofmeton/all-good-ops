import type { RollingCashflow } from "@/lib/cashflow-queries";
import { yen, yenSigned, shortDate } from "@/lib/format";

// 起点残高 → 各イベント後の見込み残高をインライン SVG の折れ線/エリアで表示。
// TrendChart 作法準拠（viewBox スケール / var(--*) 配色 / role=img + sr-only 代替表）。
// 点が 0〜1 個でも壊れないよう全経路をガード。x 軸は today を起点にした日数オフセット。

// 'YYYY-MM-DD' → today からの経過日数（UTC 基準・負やオーバーはクランプ）。
function dayOffset(today: string, iso: string): number {
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = iso.split("-").map(Number);
  const a = Date.UTC(ty, tm - 1, td);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CashflowMiniChart({ data }: { data: RollingCashflow }) {
  const today = todayIso();
  const span = Math.max(1, data.days);

  // 系列点: 起点（today, start）→ 各イベント後残高（その日付）。
  type Pt = { off: number; v: number };
  const pts: Pt[] = [{ off: 0, v: data.start }];
  for (const e of data.events) {
    const off = Math.min(span, Math.max(0, dayOffset(today, e.date)));
    pts.push({ off, v: e.balanceAfter });
  }
  // 1 点しか無い（予定なし）場合は終端まで水平線にする。
  if (pts.length === 1) pts.push({ off: span, v: data.start });

  // --- レイアウト（viewBox 座標） ---
  const W = 360;
  const padX = 6;
  const padTop = 8;
  const plotH = 64;
  const H = padTop + plotH;
  const plotW = W - padX * 2;

  const values = pts.map((p) => p.v);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    // 全点同値 → 中央に水平線（0 除算回避）。
    lo -= 1;
    hi += 1;
  }
  const range = hi - lo;

  const px = (off: number) => padX + (off / span) * plotW;
  const py = (v: number) => padTop + (1 - (v - lo) / range) * plotH;

  const line = pts.map((p) => `${px(p.off)},${py(p.v)}`).join(" ");
  // エリア: 折れ線の下端を chart 底辺まで塗る。
  const area = `${padX},${H} ${line} ${px(pts[pts.length - 1].off)},${H}`;

  // ゼロ基準線（残高 0）が描画域内にある時だけ表示。
  const showZero = lo < 0 && hi > 0;
  const zeroY = showZero ? py(0) : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`向こう${data.days}日の見込み残高推移。起点 ¥${yen(data.start)}、最終 ¥${yen(data.end)}。詳細は下の表を参照。`}
        className="h-auto w-full"
      >
        <polygon points={area} fill="var(--primary)" opacity={0.08} />
        {showZero && (
          <line
            x1={padX}
            x2={W - padX}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--negative)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}
        <polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 終点マーカー */}
        <circle
          cx={px(pts[pts.length - 1].off)}
          cy={py(pts[pts.length - 1].v)}
          r={2.5}
          fill={data.end < 0 ? "var(--negative)" : "var(--primary)"}
        />
      </svg>

      {/* スクリーンリーダー / 視覚の代替表 */}
      <table className="sr-only">
        <caption>向こう{data.days}日の見込み残高推移</caption>
        <thead>
          <tr>
            <th>日付</th>
            <th>項目</th>
            <th>増減</th>
            <th>見込み残高</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">起点</th>
            <td>現在残高</td>
            <td>—</td>
            <td>¥{yen(data.start)}</td>
          </tr>
          {data.events.map((e, i) => (
            <tr key={`${e.date}-${i}`}>
              <th scope="row">{shortDate(e.date)}</th>
              <td>{e.name}</td>
              <td>
                {e.kind === "income" ? "+" : "−"}¥{yen(e.amount)}
              </td>
              <td>¥{yenSigned(e.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
