import type { OptimizerProposal } from "@/lib/optimizer/types";
import {
  kindLabel,
  STATUS_LABEL,
  STATUS_TONE,
  dateTimeLabel,
} from "@/app/optimizer/labels";

// 決定履歴のコンパクトな一覧（server component）。kind / title / status / decided_at / note。
export function DecisionLog({ items }: { items: OptimizerProposal[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        まだ決定された提案はありません。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li
          key={p.id}
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:gap-3"
        >
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[p.status]}`}
          >
            {STATUS_LABEL[p.status]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground" title={p.title}>
              {p.title}
            </p>
            {p.decided_note && (
              <p className="mt-0.5 truncate text-xs text-muted" title={p.decided_note}>
                理由: {p.decided_note}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted">
            <span className="rounded-full bg-background px-2 py-0.5">
              {kindLabel(p.kind)}
            </span>
            <time className="tabular" dateTime={p.decided_at ?? undefined}>
              {dateTimeLabel(p.decided_at)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
