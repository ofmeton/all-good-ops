import { getAnomalies, type Anomaly } from "@/lib/anomaly-queries";
import { isValidYm, parseYm } from "@/lib/format";

// 自己完結の async server component。親は ym（'YYYY-MM'）を渡すだけでよい
// （データ取得は内部で完結。props 契約: { ym: string } のみ・変更しない）。
// 異常 0 件なら何も描画しない（null）。tone 配色・role の作法は Alerts.tsx に揃える。

const toneClass: Record<Anomaly["tone"], string> = {
  negative: "border-negative/30 bg-negative/5 text-negative",
  warning: "border-warning/30 bg-warning/5 text-warning",
};

export async function AnomalyAlerts({ ym }: { ym: string }) {
  // 親からの入力も境界で検証（不正な月キーは静かに非表示）。
  if (!isValidYm(ym)) return null;
  const { year, month } = parseYm(ym);
  const anomalies = getAnomalies(year, month);
  if (anomalies.length === 0) return null;

  return (
    <section className="space-y-2" aria-labelledby="anomaly-heading">
      <h2
        id="anomaly-heading"
        className="text-sm font-semibold text-foreground"
      >
        異常検知
      </h2>
      {anomalies.map((a) => (
        <div
          key={a.key}
          className={`rounded-xl border px-4 py-3 ${toneClass[a.tone]}`}
          role={a.tone === "negative" ? "alert" : "status"}
        >
          <p className="text-sm font-semibold">{a.title}</p>
          <p className="mt-0.5 text-xs opacity-90">{a.detail}</p>
        </div>
      ))}
    </section>
  );
}
