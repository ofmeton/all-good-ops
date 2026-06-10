import type { ProposalRow, ApplyDescriptor, Tier } from "./types.ts";

/** Thompson 閉ループの live 3 レバーのみが tier-T 数値適用対象（content_axis 等の凍結レバー・failure_story は除外）。 */
export const TIER_T_PARAM_IDS = [
  "posting_time_morning", "posting_time_noon", "posting_time_afternoon", "posting_time_evening", "posting_time_midnight",
  "hook_number_lead", "hook_negation_lead", "hook_question_lead", "hook_emotion_lead", "hook_authority_lead", "hook_promise_lead", "hook_other",
  "xfmt_short", "xfmt_medium", "xfmt_long", "xfmt_thread",
] as const;

/** 🔒 死守領域。scope/hypothesis にこれらが現れたら apply 不可（保守的・疑わしきはブロック）。 */
const DEATH_GUARD_KEYWORDS = [
  "forbidden", "禁止フレーズ", "safety_guardrail", "safety guardrail", "guardrail",
  "first_hand", "primary_info", "一次情報", "industry_sop", "hashtag", "ハッシュタグ",
  "ai_generated", "ai生成", "ai 画像", "ai画像", "failure_story", "failure cap", "failure_cap",
];

/** 🔒 死守 paramId（apply に来たら拒否）。 */
const DEATH_GUARD_PARAM_IDS = [
  "hook_failure_story_verified_cap_per_month", "content_axis.first_hand",
  "industry_sop_rate", "hashtag_count", "visualizer_image_ai_generated",
];

export function getApplyDescriptor(p: ProposalRow): ApplyDescriptor | null {
  const apply = (p.meta as { apply?: unknown } | null)?.apply as { paramId?: unknown; value?: unknown } | undefined;
  if (apply && typeof apply.paramId === "string" && typeof apply.value === "number") {
    return { paramId: apply.paramId, value: apply.value };
  }
  return null;
}

export function validateProposalSafe(p: ProposalRow): { ok: boolean; reason: string } {
  const hay = `${p.scope} ${p.hypothesis}`.toLowerCase();
  for (const kw of DEATH_GUARD_KEYWORDS) {
    if (hay.includes(kw.toLowerCase())) {
      return { ok: false, reason: `🔒 死守領域キーワード "${kw}" を検出（手動対応）` };
    }
  }
  const d = getApplyDescriptor(p);
  if (d && DEATH_GUARD_PARAM_IDS.includes(d.paramId)) {
    return { ok: false, reason: `🔒 死守 paramId "${d.paramId}" は apply 不可` };
  }
  return { ok: true, reason: "" };
}

export function classifyTier(p: ProposalRow): Tier {
  if (!validateProposalSafe(p).ok) return "blocked";
  const d = getApplyDescriptor(p);
  if (d && (TIER_T_PARAM_IDS as readonly string[]).includes(d.paramId)) return "T";
  const scope = p.scope.toLowerCase();
  if (/prompt|template|テンプレ|プロンプト/.test(scope)) return "prompt";
  if (/config|threshold|閾値|query|watchlist|keyword|weight/.test(scope)) return "config";
  return "noop";
}
