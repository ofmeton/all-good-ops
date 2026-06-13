// Optimizer UI 共通の表示ラベル・整形（client/server 両用、純関数のみ）。
import type {
  Confidence,
  ProposalKind,
  ProposalStatus,
  ProposedAction,
} from "@/lib/optimizer/types";

export const KIND_LABEL: Record<ProposalKind, string> = {
  classify_unknown: "未分類の分類",
  fixed_vs_variable: "固定費 / 変動費",
  relabel: "ラベル統一",
  transfer_pair: "振替ペア",
  rule_suggest: "ルール候補",
  rule_conflict: "ルール矛盾",
  label_add: "ラベル追加",
  category_regroup: "カテゴリ再編",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind as ProposalKind] ?? kind;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "確度高",
  med: "確度中",
  low: "確度低",
};

// confidence ごとの配色（色のみで意味付けせずラベルも併記する前提のトークン）。
export const CONFIDENCE_TONE: Record<Confidence, string> = {
  high: "border-positive/30 bg-positive/5 text-positive",
  med: "border-primary/30 bg-primary/5 text-primary",
  low: "border-border bg-background text-muted",
};

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: "未処理",
  accepted: "承認",
  rejected: "却下",
  dismissed: "スキップ",
  superseded: "差替",
};

export const STATUS_TONE: Record<ProposalStatus, string> = {
  pending: "border-border bg-background text-muted",
  accepted: "border-positive/30 bg-positive/5 text-positive",
  rejected: "border-negative/30 bg-negative/5 text-negative",
  dismissed: "border-border bg-background text-muted",
  superseded: "border-border bg-background text-muted",
};

// ISO8601(UTC) → 'M/D HH:MM'（ローカル表示）。不正値はそのまま返す。
export function dateTimeLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

// proposed_action を1行サマリ化（カードの「何をするか」表示）。
export function actionSummary(action: ProposedAction | null): string {
  if (!action) return "アクション未設定";
  switch (action.type) {
    case "add_rule":
      return `ルール追加: 「${action.pattern}」(${action.match_type}) → ${action.classification}${
        action.category_major ? ` / ${action.category_major}` : ""
      }`;
    case "edit_rule":
      return `ルール#${action.rule_id} を更新 (${Object.keys(action.patch).join(", ")})`;
    case "delete_rule":
      return `ルール#${action.rule_id} を削除`;
    case "set_override":
      return `取引 ${action.txn_ids.length}件を上書き (${Object.keys(action.fields).join(", ") || "—"})`;
    case "mark_transfer":
      return `取引 ${action.txn_ids.length}件を振替としてマーク`;
    case "regroup":
      return `カテゴリ再編: ${action.mappings
        .map((m) => `${m.category_major}→${m.group_name}`)
        .join(", ")}`;
    case "add_recurring":
      return `定期項目を追加: ${action.name}（${action.kind === "income" ? "収入" : "支出"} ¥${action.amount}）`;
    default:
      return "アクション";
  }
}

// target_ref を読みやすい1行要約に（kind に応じて緩く整形）。
export function targetSummary(kind: string, target: unknown): string | null {
  if (target == null || typeof target !== "object") return null;
  const t = target as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof t.description === "string") parts.push(`摘要: ${t.description}`);
  if (typeof t.rule_id === "number") parts.push(`ルール#${t.rule_id}`);
  if (Array.isArray(t.txn_ids)) parts.push(`取引 ${t.txn_ids.length}件`);
  if (typeof t.category_major === "string") parts.push(`大項目: ${t.category_major}`);
  if (typeof t.count === "number") parts.push(`${t.count}件`);
  if (typeof t.amount_min === "number" && typeof t.amount_max === "number") {
    parts.push(`¥${t.amount_min}〜¥${t.amount_max}`);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}
