import Link from "next/link";
import type { ManualLiability } from "@/lib/asset-queries";
import { yen, shortDate } from "@/lib/format";

// ④ 手入力負債の一覧。0 件なら /settings への導線を出す。
export function LiabilityList({ items }: { items: ManualLiability[] }) {
  return (
    <section className="mt-4" aria-label="負債一覧">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          負債（手入力）
        </h2>

        {items.length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">負債の登録はありません。</p>
            <Link
              href="/settings"
              className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-2"
            >
              設定ページから登録できます
            </Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {items.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {l.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[
                      l.lender,
                      l.rate !== null ? `年利${l.rate}%` : null,
                      l.monthly_payment !== null
                        ? `月々¥${yen(l.monthly_payment)}`
                        : null,
                      l.as_of_date !== null
                        ? `${shortDate(l.as_of_date)}時点`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "詳細未登録"}
                  </p>
                </div>
                <p className="tabular shrink-0 text-sm font-semibold text-negative">
                  −¥{yen(l.balance ?? 0)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
