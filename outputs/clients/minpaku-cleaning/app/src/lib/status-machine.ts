// 清掃依頼のステータスと、許可される遷移を定義する純粋ロジック。
// DBアクセスなし。全てのステータス変更はこの状態機械で検証する。

export type CleaningStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "reported"
  | "confirmed"
  | "cancelled";

// from → 許可される to の一覧。confirmed / cancelled は終端。
const ALLOWED: Record<CleaningStatus, CleaningStatus[]> = {
  unassigned: ["assigned", "cancelled"],
  assigned: ["in_progress", "unassigned", "cancelled"],
  in_progress: ["reported", "cancelled"],
  reported: ["confirmed"],
  confirmed: [],
  cancelled: [],
};

export class InvalidTransitionError extends Error {}

export function canTransition(
  from: CleaningStatus,
  to: CleaningStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: CleaningStatus,
  to: CleaningStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(
      `${from} から ${to} へは遷移できません`,
    );
  }
}
