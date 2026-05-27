/**
 * Extension 5 rules (X1〜X5)
 *
 * X3 は最も複雑な複合 gate:
 *   primary_hook='failure_story' の場合のみ以下全てを満たすこと:
 *     - source_material_ids 非空
 *     - 全 material_id が materials_store.verified_failure_story=true
 *       AND publication_consent='granted' AND redaction_reviewed=true
 *     - 当月 posted < VERIFIED_FAILURE_STORY_MONTHLY_CAP (4)
 *   primary_hook が failure_story 以外なら skip (pass 扱い)。
 */
import type {
  EditorRuleResult,
  LlmJudgeResult,
  RuleStatus,
} from "../types.ts";
import {
  HOOK_STRENGTH_THRESHOLD,
  VERIFIED_FAILURE_STORY_MONTHLY_CAP,
} from "../hook-quotas.ts";

/**
 * X1: Hook 強度 ≥ 0.4
 */
export function ruleX1HookStrength(confidence: number): EditorRuleResult {
  const status: RuleStatus =
    confidence >= HOOK_STRENGTH_THRESHOLD ? "pass" : "fail";
  return {
    rule: "X1_hook_strength",
    status,
    reason:
      status === "pass"
        ? `confidence=${confidence.toFixed(3)} >= ${HOOK_STRENGTH_THRESHOLD}`
        : `confidence=${confidence.toFixed(3)} が閾値 ${HOOK_STRENGTH_THRESHOLD} 未満`,
    evidence: { confidence },
    durationMs: 0,
  };
}

/**
 * X2: ステマ表記 (LLM judge stub での disclosure 存在検査結果を載せ替え)
 *
 * 本文中の disclosure 存在は stubJudge / 実 API で判定済み。
 * hasAffiliateLink=false の draft は always pass (LLM が skip-pass 扱い)。
 */
export function ruleX2StealthDisclosure(
  judge: LlmJudgeResult,
): EditorRuleResult {
  return {
    rule: "X2_stealth_disclosure",
    status: judge.x2_stealth_disclosure_text.status,
    reason: judge.x2_stealth_disclosure_text.reason,
    durationMs: 0,
  };
}

/**
 * X3: verified failure_story 月 ≤ 4 (複合 gate)
 *
 * @param primaryHook   classify.py の primary_hook
 * @param sourceMaterialIds  draft に紐づく material IDs
 * @param verifiedIds   全 verified を満たした material IDs の Set
 * @param monthlyCount  当月の failure_story 投稿数 (posted_records)
 */
export function ruleX3FailureVerified(input: {
  primaryHook: string;
  sourceMaterialIds: string[];
  verifiedIds: Set<string>;
  monthlyCount: number;
}): EditorRuleResult {
  const { primaryHook, sourceMaterialIds, verifiedIds, monthlyCount } = input;

  if (primaryHook !== "failure_story") {
    return {
      rule: "X3_failure_story_verified",
      status: "skip",
      reason: `primary_hook=${primaryHook} (failure_story 以外は skip)`,
      durationMs: 0,
    };
  }

  // material IDs が空 → fail
  if (sourceMaterialIds.length === 0) {
    return {
      rule: "X3_failure_story_verified",
      status: "fail",
      reason:
        "failure_story なのに source_material_ids が空 (公開許諾 + verified material が必須)",
      evidence: { primaryHook, sourceMaterialIds, monthlyCount },
      durationMs: 0,
    };
  }

  // 1 つでも未 verified ならゲートを通さない
  const unverified = sourceMaterialIds.filter((id) => !verifiedIds.has(id));
  if (unverified.length > 0) {
    return {
      rule: "X3_failure_story_verified",
      status: "fail",
      reason: `failure_story material のうち ${unverified.length} 件が未 verified (verified_failure_story / publication_consent / redaction_reviewed のいずれかが未充足)`,
      evidence: { unverifiedIds: unverified, primaryHook },
      durationMs: 0,
    };
  }

  // 月次上限を超過したら fail
  if (monthlyCount >= VERIFIED_FAILURE_STORY_MONTHLY_CAP) {
    return {
      rule: "X3_failure_story_verified",
      status: "fail",
      reason: `verified failure_story 月次上限 ${VERIFIED_FAILURE_STORY_MONTHLY_CAP} 件を超過 (当月投稿 ${monthlyCount} 件)`,
      evidence: { monthlyCount, cap: VERIFIED_FAILURE_STORY_MONTHLY_CAP },
      durationMs: 0,
    };
  }

  return {
    rule: "X3_failure_story_verified",
    status: "pass",
    reason: `全 ${sourceMaterialIds.length} material verified、当月投稿 ${monthlyCount}/${VERIFIED_FAILURE_STORY_MONTHLY_CAP}`,
    evidence: { monthlyCount, cap: VERIFIED_FAILURE_STORY_MONTHLY_CAP },
    durationMs: 0,
  };
}

/**
 * X4: 読者像 1 行明示 (LLM judge stub 結果を載せ替え)
 */
export function ruleX4AudienceLine(judge: LlmJudgeResult): EditorRuleResult {
  return {
    rule: "X4_audience_line",
    status: judge.x4_audience_line.status,
    reason: judge.x4_audience_line.reason,
    durationMs: 0,
  };
}

/**
 * X5: DLP redaction + 固有名詞 mask
 *
 * redactStrict().needsConsent === false (= highRiskHits === 0)
 * AND containsHighRisk(redactedText) === false
 * AND LLM 補助で proper noun が pass
 */
export function ruleX5DlpAndProperNoun(input: {
  redactNeedsConsent: boolean;
  containsHighRisk: boolean;
  judge: LlmJudgeResult;
}): EditorRuleResult {
  const { redactNeedsConsent, containsHighRisk, judge } = input;

  const dlpFail = redactNeedsConsent || containsHighRisk;
  const properFail = judge.x5_proper_noun_assist.status === "fail";

  if (dlpFail || properFail) {
    const reasons: string[] = [];
    if (redactNeedsConsent) reasons.push("DLP highRiskHits > 0");
    if (containsHighRisk) reasons.push("containsHighRisk(redacted) === true");
    if (properFail) reasons.push(`LLM proper noun: ${judge.x5_proper_noun_assist.reason}`);
    return {
      rule: "X5_dlp_and_proper_noun",
      status: "fail",
      reason: reasons.join(" / "),
      evidence: { redactNeedsConsent, containsHighRisk, llmStatus: judge.x5_proper_noun_assist.status },
      durationMs: 0,
    };
  }

  return {
    rule: "X5_dlp_and_proper_noun",
    status: "pass",
    reason: "DLP highRiskHits=0 / proper noun pass",
    durationMs: 0,
  };
}
