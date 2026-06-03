/**
 * Base 6 rules (R1〜R6)
 *
 * 各ルールは EditorRuleResult を返す。
 * regex / cosine sim 等のローカル判定で完結するものは同期/速い処理として
 * Stage 0-1 で計算、LLM judge 補助が必要なもの (R1/R3/R6) は Stage 2 の
 * llmJudge 結果を合成する。
 */
import type {
  EditorRuleResult,
  LlmJudgeResult,
  RuleStatus,
} from "../types.ts";
import { DUPLICATE_COSINE_THRESHOLD } from "../hook-quotas.ts";

const FORBIDDEN_PHRASES = /(時代遅れ|無能|情弱|養分|搾取|奴隷)/;
// 「私は/僕は/自分は + 過去形 (◯◯た / ◯◯った)」を緩めに検出。
// 30 文字以内にひらがな/カタカナ/漢字 + "た" 終わりの動詞があれば pass。
const FIRST_HAND_REGEX = /(私は|僕は|自分は|私が|僕が|オレは|俺は).{0,40}?[ぁ-んァ-ヶ一-龯]た[。、 \n]?/;

function timed<T>(fn: () => T): { result: T; durationMs: number } {
  const start = Date.now();
  const result = fn();
  return { result, durationMs: Date.now() - start };
}

/**
 * R1: 業務仕組み化テーマに繋がるか (LLM judge 結果を載せ替え)
 */
export function ruleR1Workflow(judge: LlmJudgeResult): EditorRuleResult {
  return {
    rule: "R1_workflow_theme",
    status: judge.r1_workflow_theme.status,
    reason: judge.r1_workflow_theme.reason,
    durationMs: 0,
  };
}

/**
 * R2: 実体験要素 1 行 (regex を主判定)。
 * contentType='first_hand' のときのみ必須。paraphrase/industry_sop は skip(=非却下)。
 * （ニュース紹介や業界SOPは構造的に一次体験を持たないため、種別で適用を分ける）
 */
export function ruleR2FirstHand(
  body: string,
  contentType?: "paraphrase" | "first_hand" | "industry_sop",
): EditorRuleResult {
  // first_hand 以外 (未指定は後方互換で first_hand 扱い) は実体験を求めない
  if (contentType && contentType !== "first_hand") {
    return {
      rule: "R2_first_hand_line",
      status: "skip",
      reason: `contentType=${contentType} は実体験行 不要 (skip)`,
      evidence: { hit: false, skipped: true },
      durationMs: 0,
    };
  }
  const { result, durationMs } = timed(() => {
    return FIRST_HAND_REGEX.test(body);
  });
  const status: RuleStatus = result ? "pass" : "fail";
  return {
    rule: "R2_first_hand_line",
    status,
    reason: status === "pass"
      ? "私は/僕は + 過去形 1 行検出"
      : "実体験を示す 1 行が見つからない (私は ... した 等)",
    evidence: { hit: result },
    durationMs,
  };
}

/**
 * R3: 対象は意見、敵は作らない (LLM judge 結果を載せ替え)
 */
export function ruleR3NoEnemy(judge: LlmJudgeResult): EditorRuleResult {
  return {
    rule: "R3_no_enemy",
    status: judge.r3_no_enemy.status,
    reason: judge.r3_no_enemy.reason,
    durationMs: 0,
  };
}

/**
 * R4: 対立構図フィルタ (hardcoded 禁止語 regex)
 */
export function ruleR4ConflictPhrase(body: string): EditorRuleResult {
  const { result, durationMs } = timed(() => {
    return FORBIDDEN_PHRASES.test(body);
  });
  const status: RuleStatus = result ? "fail" : "pass";
  return {
    rule: "R4_no_conflict_phrase",
    status,
    reason: result
      ? "禁止語 (時代遅れ/無能/情弱/養分/搾取/奴隷) が検出"
      : "禁止語なし",
    evidence: { hit: result },
    durationMs,
  };
}

/**
 * R5: 直近 2 週で類似投稿なし (cos sim ≥ 0.85 → fail)
 *
 * Phase 0.5 stub では embedText が zero vector を返すので、maxSim は常に 0 となり pass。
 */
export function ruleR5NoDuplicate14d(
  maxSim: number,
  matchedId: string | null,
): EditorRuleResult {
  const status: RuleStatus = maxSim >= DUPLICATE_COSINE_THRESHOLD ? "fail" : "pass";
  return {
    rule: "R5_no_duplicate_14d",
    status,
    reason:
      status === "fail"
        ? `cos sim=${maxSim.toFixed(3)} が閾値 ${DUPLICATE_COSINE_THRESHOLD} 以上 (matched draft=${matchedId})`
        : `直近 14 日で類似投稿なし (maxSim=${maxSim.toFixed(3)})`,
    evidence: { maxSim, matchedId },
    durationMs: 0,
  };
}

/**
 * R6: 結論の断定性 (LLM judge 結果を載せ替え)
 */
export function ruleR6Assertive(judge: LlmJudgeResult): EditorRuleResult {
  return {
    rule: "R6_assertive_conclusion",
    status: judge.r6_assertive_conclusion.status,
    reason: judge.r6_assertive_conclusion.reason,
    durationMs: 0,
  };
}
