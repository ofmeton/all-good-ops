/**
 * Editor 6+5 pipeline orchestrator
 *
 * SSoT: outputs/improvements/x-account-design-consolidated/main-design-all-versions.md §11 v10.3
 *
 * Stage 構成:
 *   Stage 0 (parallel, no LLM):
 *     - redactStrict (DLP)
 *     - containsHighRisk
 *     - classifyHook (Python subprocess)
 *     - checkBusinessLawRisk
 *   Stage 1 (parallel I/O):
 *     - embedText(body) + fetchRecentPostBodies(14d) → maxCosineSim (R5)
 *     - getMonthlyFailureStoryPostCount (X3 用)
 *     - getVerifiedMaterialIds (X3 用)
 *   Stage 2 (1 LLM call):
 *     - runLlmJudge: R1 / R3 / R6 / X2 / X4 / X5 補助
 *   Combine:
 *     - 11 ルール EditorRuleResult を組み立て
 *     - 1 つでも fail → decision='rejected'
 *     - riskLevel='high' は (business_law / paid_route / hasNumbers / isClientDerived) のいずれかで昇格
 *
 * 目標: E-46 「1 件処理 < 10 秒」(in-memory fallback だと < 1 秒)
 */
import { redactStrict, containsHighRisk } from "../dlp/redact.ts";
import { getBusinessLawRiskFlag } from "../dlp/business-law.ts";
import { classifyHook } from "../hook-classifier/classify.ts";
import {
  fetchRecentPostBodies,
  getMonthlyFailureStoryPostCount,
  getVerifiedMaterialIds,
} from "./db.ts";
import { embedText, maxCosineSim } from "./embedding.ts";
import { runLlmJudge } from "./llm-judge.ts";
import {
  ruleR1Workflow,
  ruleR2FirstHand,
  ruleR3NoEnemy,
  ruleR4ConflictPhrase,
  ruleR5NoDuplicate14d,
  ruleR6Assertive,
} from "./rules/base.ts";
import {
  ruleX1HookStrength,
  ruleX2StealthDisclosure,
  ruleX3FailureVerified,
  ruleX4AudienceLine,
  ruleX5DlpAndProperNoun,
} from "./rules/extension.ts";
import type {
  EditorInput,
  EditorOutput,
  EditorRiskLevel,
  EditorRuleResult,
  RuleId,
} from "./types.ts";

/**
 * Main entry point.
 *
 * 全 Stage を実行 → 11 ルール結果を組み立てて EditorOutput を返す。
 * 内部例外は捕捉せず caller に投げる (caller 側で trace 記録)。
 */
export async function runEditor(input: EditorInput): Promise<EditorOutput> {
  const totalStart = Date.now();
  const now = input.now ?? new Date();
  const body = input.body ?? "";

  // ============================================================
  // Stage 0: 並列・LLM なし
  // ============================================================
  const [redactResult, hookResult, businessLawResult] = await Promise.all([
    Promise.resolve(redactStrict(body)),
    classifyHook(body),
    Promise.resolve(getBusinessLawRiskFlag(body)),
  ]);
  const highRiskRemaining = containsHighRisk(redactResult.redactedText);

  // hard 却下するのは「確実な PII」のみ。公開投稿は人間が最終承認するため、誤検出しやすい
  // ヒューリスティック (money=マーケ数値 / client_name_signal=「…を社」等を誤マッチ /
  // long_alphanum_id=tech文字列) は soft 警告に留め、人間判断に委ねる。
  // 確実な PII (email/phone/カード/住所/APIキー) のみ hard 維持。
  const HARD_PII_CATEGORIES = new Set([
    "email", "phone", "credit_card", "japanese_address", "api_key_like",
  ]);
  const realPiiHighRisk =
    highRiskRemaining ||
    redactResult.findings.some((f) => HARD_PII_CATEGORIES.has(f.category));

  // ============================================================
  // Stage 1: 並列 I/O
  // ============================================================
  const needX3Query = hookResult.primary_hook === "failure_story";
  const [
    targetEmbedding,
    recentPosts,
    monthlyCount,
    verifiedIds,
  ] = await Promise.all([
    embedText(body),
    fetchRecentPostBodies(14),
    needX3Query
      ? getMonthlyFailureStoryPostCount(now)
      : Promise.resolve(0),
    needX3Query
      ? getVerifiedMaterialIds(input.sourceMaterialIds)
      : Promise.resolve(new Set<string>()),
  ]);
  const { maxSim, matchedId } = maxCosineSim(
    targetEmbedding,
    recentPosts.map((p) => ({ id: p.id, embedding: p.embedding })),
  );

  // ============================================================
  // Stage 2: 1 LLM call (Sonnet 4.6 tool_use bundled)
  // ============================================================
  const judge = await runLlmJudge({
    body,
    hasAffiliateLink: input.hasAffiliateLink,
    format: input.fmat,
    platform: input.platform,
  });

  // ============================================================
  // Rule assembly
  // ============================================================
  const ruleResults: EditorRuleResult[] = [
    ruleR1Workflow(judge),
    ruleR2FirstHand(body, input.contentType),
    ruleR3NoEnemy(judge),
    ruleR4ConflictPhrase(body),
    ruleR5NoDuplicate14d(maxSim, matchedId),
    ruleR6Assertive(judge),
    ruleX1HookStrength(hookResult.confidence),
    ruleX2StealthDisclosure(judge),
    ruleX3FailureVerified({
      primaryHook: hookResult.primary_hook,
      sourceMaterialIds: input.sourceMaterialIds,
      verifiedIds,
      monthlyCount,
    }),
    ruleX4AudienceLine(judge),
    ruleX5DlpAndProperNoun({
      redactNeedsConsent: redactResult.needsConsent,
      containsHighRisk: highRiskRemaining,
      realPiiHighRisk,
      judge,
    }),
  ];

  // ============================================================
  // Decision + risk
  // ============================================================
  // hard/soft 分離 (Phase 1: 人間が LINE で最終承認するため、品質粗は警告に留める)。
  // HARD = 安全・法令・brand-safety → fail なら却下 (人間に出さない)。
  // SOFT = 品質・スタイル → fail でも draft は出し、警告として承認文に付記。
  const HARD_RULES = new Set<RuleId>([
    "R3_no_enemy",
    "R4_no_conflict_phrase",
    "X2_stealth_disclosure",
    "X3_failure_story_verified",
  ]);
  // X5 は複合ルール: 本物の PII(email/phone/カード/住所/顧客名/APIキー/長ID)=hard、
  // money_jpy/money_usd(マーケ数値) と 固有名詞 LLM=soft。realPiiHighRisk のみ hard 扱い。
  const isHardFail = (r: EditorRuleResult): boolean => {
    if (r.status !== "fail") return false;
    if (r.rule === "X5_dlp_and_proper_noun") {
      const ev = r.evidence as { realPiiHighRisk?: boolean } | undefined;
      return ev?.realPiiHighRisk === true;
    }
    return HARD_RULES.has(r.rule);
  };
  const rejectReasons: RuleId[] = ruleResults.filter(isHardFail).map((r) => r.rule);
  const warnings: EditorOutput["warnings"] = ruleResults
    .filter((r) => r.status === "fail" && !isHardFail(r))
    .map((r) => ({ rule: r.rule, reason: r.reason ?? "" }));
  const decision: EditorOutput["decision"] =
    rejectReasons.length > 0 ? "rejected" : "approved";

  const riskReasons: string[] = [];
  if (businessLawResult.flag) {
    riskReasons.push(
      `業法独占キーワード: ${businessLawResult.keywords.slice(0, 3).join(", ")}`,
    );
  }
  if (input.acquisitionRoute === "C") {
    riskReasons.push("acquisition_route=C (paid route)");
  }
  if (input.hasNumbers) {
    riskReasons.push("hasNumbers=true (数字主張のため事後検証必要)");
  }
  if (input.isClientDerived) {
    riskReasons.push("isClientDerived=true (顧客由来情報)");
  }
  const riskLevel: EditorRiskLevel = riskReasons.length > 0 ? "high" : "low";

  return {
    draftId: input.draftId,
    decision,
    rejectReasons,
    warnings,
    rules: ruleResults,
    riskLevel,
    riskReasons,
    businessLawRiskFlag: businessLawResult.flag,
    businessLawKeywords: businessLawResult.keywords,
    totalDurationMs: Date.now() - totalStart,
    llmCostUsd: judge.costUsd,
  };
}
