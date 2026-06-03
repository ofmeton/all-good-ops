/**
 * rule-labels.test.ts
 *
 * Tests: ruleLabelJa — RuleId → 日本語ラベル
 *   - すべての RuleId が日本語 (raw id でない) ラベルを返す
 *   - 代表例の文言を固定
 *   - 未知 id は raw id をそのまま返す
 */

import { ruleLabelJa } from "./rule-labels.ts";
import type { RuleId } from "./types.ts";

const ALL_RULE_IDS: RuleId[] = [
  "R1_workflow_theme",
  "R2_first_hand_line",
  "R3_no_enemy",
  "R4_no_conflict_phrase",
  "R5_no_duplicate_14d",
  "R6_assertive_conclusion",
  "X1_hook_strength",
  "X2_stealth_disclosure",
  "X3_failure_story_verified",
  "X4_audience_line",
  "X5_dlp_and_proper_noun",
];

describe("ruleLabelJa", () => {
  test("covers all RuleId values with a non-raw Japanese label", () => {
    for (const id of ALL_RULE_IDS) {
      const label = ruleLabelJa(id);
      expect(label).not.toBe(id); // not raw id
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test("representative labels", () => {
    expect(ruleLabelJa("R1_workflow_theme")).toBe("仕組み化テーマが弱い");
    expect(ruleLabelJa("R2_first_hand_line")).toBe("実体験の一行がない");
    expect(ruleLabelJa("R5_no_duplicate_14d")).toBe("過去14日と内容が類似");
    expect(ruleLabelJa("R6_assertive_conclusion")).toBe("結論の断定が弱い");
    expect(ruleLabelJa("X1_hook_strength")).toBe("フック(書き出し)が弱い");
    expect(ruleLabelJa("X4_audience_line")).toBe("読者の明示がない");
    expect(ruleLabelJa("X5_dlp_and_proper_noun")).toBe("固有名詞/金額の注意");
  });

  test("unknown id falls back to raw id", () => {
    expect(ruleLabelJa("ZZ_unknown" as RuleId)).toBe("ZZ_unknown");
  });
});
