import type { OptimizerState, ParameterPosterior } from "../optimizer/types.ts";
import { GUARD_RULES } from "../optimizer/guards.ts";
import type { ApplyDescriptor, ApplyDeps } from "./types.ts";

const POSTING_BANDS = ["morning", "noon", "afternoon", "evening", "midnight"] as const;
const HOOKS = ["number_lead", "negation_lead", "question_lead", "emotion_lead", "authority_lead", "promise_lead", "other"] as const;
const XFMTS = ["short", "medium", "long", "thread"] as const;

export function resolvePosterior(state: OptimizerState, paramId: string): ParameterPosterior | null {
  for (const b of POSTING_BANDS) if (paramId === `posting_time_${b}`) return state.postingTime[b];
  for (const h of HOOKS) {
    const expected = h === "other" ? "hook_other" : `hook_${h}`;
    if (paramId === expected) return state.hookDistribution[h];
  }
  for (const f of XFMTS) if (paramId === `xfmt_${f}`) return state.xFormatRatio[f];
  return null;
}

export function clipToGuard(paramId: string, value: number): number {
  const rule = GUARD_RULES.find((r) => r.paramId === paramId);
  let v = value;
  if (rule?.lowerBound != null) v = Math.max(v, rule.lowerBound);
  if (rule?.upperBound != null) v = Math.min(v, rule.upperBound);
  return v;
}

/** Beta posterior を strength(alpha+beta) 一定のまま target mean に再パラメータ化。 */
export function setBetaMean(
  post: ParameterPosterior,
  targetMean: number,
): { before: Record<string, number | number[]>; after: Record<string, number | number[]> } {
  const before = { ...post.params };
  const alpha = Number(post.params.alpha ?? 1);
  const beta = Number(post.params.beta ?? 1);
  const strength = alpha + beta > 0 ? alpha + beta : 2;
  post.params.alpha = Number((targetMean * strength).toFixed(6));
  post.params.beta = Number(((1 - targetMean) * strength).toFixed(6));
  return { before, after: { ...post.params } };
}

/** tier-T 適用: 現状を snapshot→guard 内 clip→Beta mean 更新→save。rollback handle = snapshotId。 */
export async function applyTierT(
  descriptor: ApplyDescriptor,
  deps: Pick<ApplyDeps, "loadOptimizerState" | "saveOptimizerState" | "snapshotState">,
): Promise<{ snapshotId: string; paramId: string; before: Record<string, number | number[]>; after: Record<string, number | number[]> }> {
  const state = await deps.loadOptimizerState();
  const post = resolvePosterior(state, descriptor.paramId);
  if (!post) throw new Error(`unknown tier-T paramId: ${descriptor.paramId}`);
  if (post.distType !== "beta") throw new Error(`tier-T applies only to beta posteriors: ${descriptor.paramId}`);

  const rule = GUARD_RULES.find((r) => r.paramId === descriptor.paramId);
  if (!rule || rule.lowerBound == null || rule.upperBound == null) {
    throw new Error(`no bounded guard rule for tier-T paramId: ${descriptor.paramId}`);
  }

  const { snapshotId } = await deps.snapshotState(); // 変更前の状態を退避
  const clipped = clipToGuard(descriptor.paramId, descriptor.value);
  const { before, after } = setBetaMean(post, clipped);
  state.updatedAt = new Date().toISOString();
  await deps.saveOptimizerState(state);
  return { snapshotId, paramId: descriptor.paramId, before, after };
}
