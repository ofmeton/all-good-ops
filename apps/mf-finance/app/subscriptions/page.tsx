import Link from "next/link";
import {
  getSubscriptions,
  type SubscriptionRow,
} from "@/lib/subscription-queries";
import { yen } from "@/lib/format";

// SQLite ファイル更新を再ビルドなしで反映（毎リクエスト最新化）。
export const dynamic = "force-dynamic";

// 'YYYY-MM-DD' → '2026年3月4日'（年跨ぎの最終課金日があるため年も表示）。
function fullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

// 今日から 3 ヶ月（暦月）遡った日付 'YYYY-MM-DD'。これより古い最終課金は「休眠？」。
// Date#setMonth は月末日に繰り上がりがある（5/31 の 3 ヶ月前 → 3/3）ため、
// 年月を整数計算し、日は対象月の末日でクランプする。
function dormantThreshold(): string {
  const now = new Date();
  const total = now.getFullYear() * 12 + now.getMonth() - 3; // month は 0 始まり
  const y = Math.floor(total / 12);
  const m0 = total % 12;
  const day = Math.min(now.getDate(), new Date(y, m0 + 1, 0).getDate());
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning" | "muted" | "primary";
}) {
  const cls =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning"
      : tone === "primary"
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border bg-background text-muted";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function SubscriptionItem({
  sub,
  threshold,
}: {
  sub: SubscriptionRow;
  threshold: string;
}) {
  const dormant = sub.lastChargedAt !== null && sub.lastChargedAt < threshold;
  return (
    <li
      className={`rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4 ${sub.active ? "" : "opacity-60"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {sub.name}
        </p>
        <p className="tabular shrink-0 text-sm font-semibold text-foreground">
          年 ¥{yen(sub.yearly)}
        </p>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="tabular text-xs text-muted">
          月 ¥{yen(sub.monthly)} ・ 最終課金{" "}
          {sub.lastChargedAt ? fullDate(sub.lastChargedAt) : "—"}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {sub.confirmed ? (
          <Badge tone="primary">確定済み</Badge>
        ) : (
          <Badge tone="muted">候補（未確定）</Badge>
        )}
        {!sub.active && <Badge tone="muted">停止中</Badge>}
        {dormant && <Badge tone="warning">休眠？</Badge>}
      </div>
    </li>
  );
}

export default async function SubscriptionsPage() {
  const { items, totalMonthly, totalYearly } = getSubscriptions();
  const threshold = dormantThreshold();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-foreground sm:text-xl">
          サブスク・定期支出
        </h1>
        <p className="mt-1 text-[11px] text-muted">
          解約検討の参考用。確定・解除（ON/OFF）は設定ページで行います。
        </p>
      </header>

      <section
        className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
        aria-label="サブスク合計（稼働中のみ）"
      >
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium text-muted">月額合計</dt>
            <dd className="tabular mt-1 text-lg font-semibold text-foreground sm:text-2xl">
              <span className="text-xs" aria-hidden>
                ¥
              </span>
              {yen(totalMonthly)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">年額換算</dt>
            <dd className="tabular mt-1 text-lg font-semibold text-foreground sm:text-2xl">
              <span className="text-xs" aria-hidden>
                ¥
              </span>
              {yen(totalYearly)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-muted">
          停止中の項目は合計に含めていません。
        </p>
      </section>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-sm text-muted">
            定期支出はまだ見つかっていません（データの蓄積をお待ちください）。
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="サブスク一覧（年額換算の大きい順）">
          {items.map((s, i) => (
            // 静的リストのため index 連結で OK（recurring_items は同名重複を許す）。
            <SubscriptionItem
              key={`${s.confirmed ? "c" : "d"}-${s.name}-${i}`}
              sub={s}
              threshold={threshold}
            />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Link
          href="/settings"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary shadow-sm transition-colors duration-150 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          設定で確定・解除する ›
        </Link>
      </div>
    </main>
  );
}
