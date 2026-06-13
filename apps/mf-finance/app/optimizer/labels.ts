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

// 分類（classification）の日本語ラベル。UI は全てこちらで表示する。
export const CLASSIFICATION_LABEL: Record<string, string> = {
  variable: "変動費",
  fixed: "固定費",
  income: "収入",
  transfer: "振替",
  internal: "内部移動",
  unknown: "未分類",
};
export function clsLabel(v: string): string {
  return CLASSIFICATION_LABEL[v] ?? v;
}

// 分類プルダウンの選択肢（よく使う順）。value=内部値 / label=日本語。
export const CLASSIFICATION_OPTIONS: { value: string; label: string }[] = [
  { value: "variable", label: "変動費（食費・娯楽など月で変わる支出）" },
  { value: "fixed", label: "固定費（家賃・保険・サブスクなど定額）" },
  { value: "income", label: "収入" },
  { value: "transfer", label: "振替（口座間の移動）" },
  { value: "internal", label: "内部移動（現金引き出し・チャージ）" },
  { value: "unknown", label: "未分類" },
];

// 編集フィールド名（key）の日本語ラベル。
export const FIELD_LABEL: Record<string, string> = {
  classification: "分類",
  category_major: "大項目",
  category_middle: "中項目",
  pattern: "パターン",
  match_type: "一致方法",
  group_name: "グループ名",
  is_transfer: "振替",
  is_internal_move: "内部移動",
  name: "名称",
  amount: "金額",
  day: "日",
};

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

// フィールド値を日本語化（分類は clsLabel、それ以外はそのまま）。
function fieldValueLabel(key: string, value: unknown): string {
  if (value == null || value === "") return "（指定なし）";
  if (key === "classification") return clsLabel(String(value));
  return String(value);
}

// 編集対象フィールド（key→value）を「分類→変動費、大項目→食費」の日本語1行に。
function fieldsToJa(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${FIELD_LABEL[k] ?? k}→${fieldValueLabel(k, v)}`);
  return parts.length > 0 ? parts.join("、") : "—";
}

// proposed_action を1行サマリ化（カードの「何をするか」表示・全て日本語）。
export function actionSummary(action: ProposedAction | null): string {
  if (!action) return "アクション未設定（却下またはスキップで処理できます）";
  switch (action.type) {
    case "add_rule":
      return `ルール追加: 「${action.pattern}」を ${clsLabel(action.classification)}${
        action.category_major ? `・${action.category_major}` : ""
      } に分類`;
    case "edit_rule":
      return `ルール#${action.rule_id} を変更: ${fieldsToJa(action.patch)}`;
    case "delete_rule":
      return `ルール#${action.rule_id} を削除`;
    case "set_override":
      return `取引 ${action.txn_ids.length}件を変更: ${fieldsToJa(action.fields)}`;
    case "mark_transfer":
      return `取引 ${action.txn_ids.length}件を「振替」にする`;
    case "regroup":
      return `カテゴリをまとめる: ${action.mappings
        .map((m) => `${m.category_major}→${m.group_name}`)
        .join("、")}`;
    case "add_recurring":
      return `定期項目を追加: ${action.name}（${action.kind === "income" ? "収入" : "支出"} ¥${action.amount.toLocaleString()}）`;
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
