import type { ReactNode } from "react";

export type Status =
  | "unassigned"
  | "assigned"
  | "cleaning"
  | "reported"
  | "confirmed"
  | "cancelled"
  | "warn";

type Size = "sm" | "md" | "lg";

type StatusBadgeProps = {
  status?: Status;
  size?: Size;
  dot?: boolean;
  children?: ReactNode;
};

export const STATUS_LABEL: Record<Status, string> = {
  unassigned: "未割当",
  assigned: "割当済み",
  cleaning: "清掃中",
  reported: "報告済み",
  confirmed: "確認済み",
  cancelled: "キャンセル",
  warn: "連続予約警告",
};

const STATUS_BG: Record<Status, string> = {
  unassigned: "bg-st-unassigned-bg text-st-unassigned-text",
  assigned: "bg-st-assigned-bg text-st-assigned-text",
  cleaning: "bg-st-cleaning-bg text-st-cleaning-text",
  reported: "bg-st-reported-bg text-st-reported-text",
  confirmed: "bg-st-confirmed-bg text-st-confirmed-text",
  cancelled: "bg-st-cancelled-bg text-st-cancelled-text",
  warn: "bg-st-warn-bg text-st-warn-text",
};

const STATUS_DOT: Record<Status, string> = {
  unassigned: "bg-st-unassigned-dot",
  assigned: "bg-st-assigned-dot",
  cleaning: "bg-st-cleaning-dot",
  reported: "bg-st-reported-dot",
  confirmed: "bg-st-confirmed-dot",
  cancelled: "bg-st-cancelled-dot",
  warn: "bg-st-warn-dot",
};

const SIZES: Record<Size, string> = {
  sm: "h-5 px-2 text-[10.5px]",
  md: "h-6 px-2.5 text-[11.5px]",
  lg: "h-7 px-3 text-[12.5px]",
};

export function StatusBadge({
  status = "unassigned",
  size = "md",
  dot = true,
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${STATUS_BG[status]} ${SIZES[size]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />}
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
