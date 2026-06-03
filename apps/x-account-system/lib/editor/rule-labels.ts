/**
 * rule-labels.ts
 *
 * Editor の RuleId を LINE 承認カードに出す日本語ラベルへ変換する。
 * 品質警告 (warnings) を人間が読める短い日本語にして提示するための補助。
 * 未マッピングの id はそのまま (raw id) を返す。
 */
import type { RuleId } from "./types.ts";

const RULE_LABEL_JA: Record<RuleId, string> = {
  R1_workflow_theme: "仕組み化テーマが弱い",
  R2_first_hand_line: "実体験の一行がない",
  R3_no_enemy: "敵を作る表現がある",
  R4_no_conflict_phrase: "対立を煽る表現がある",
  R5_no_duplicate_14d: "過去14日と内容が類似",
  R6_assertive_conclusion: "結論の断定が弱い",
  X1_hook_strength: "フック(書き出し)が弱い",
  X2_stealth_disclosure: "PR/広告の表記がない",
  X3_failure_story_verified: "失敗談の検証が未済",
  X4_audience_line: "読者の明示がない",
  X5_dlp_and_proper_noun: "固有名詞/金額の注意",
};

/**
 * RuleId → 日本語ラベル。未知の id はそのまま返す。
 */
export function ruleLabelJa(id: RuleId): string {
  return RULE_LABEL_JA[id] ?? id;
}
