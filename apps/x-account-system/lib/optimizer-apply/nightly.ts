/**
 * optimizer-apply nightly runner
 *
 * data-tier(T/P) の accepted 提案を夜間自動適用する。
 * code-tier(config/prompt) は自動適用せず通知のみ。
 *
 * ゲート:
 *   1. brownout gate — optimizer-apply が allowedJobs になければ延期通知で終了（force でバイパス）
 *   2. dry-run — proposals を分類して plan JSON を返すのみ（一切書込しない）
 *   3. 実行 — runApplyEngine をデコレータ deps で呼び per-proposal 結果を収集、LINE 1通に合成
 *
 * 注意: apply-engine.ts / validation.ts は変更せず import のみ。
 */

import { evaluateBrownout } from "../safety/brownout-handler.ts";
import { runApplyEngine } from "./apply-engine.ts";
import { classifyTier, getApplyDescriptor } from "./validation.ts";
import type { ApplyDeps, ProposalRow, Tier } from "./types.ts";

export interface ProposalPlan {
  id: string;
  tier: Tier;
  /** apply=data-tier適用予定 / skip_manual=code-tier手動待ち / noop=noop / blocked=死守 */
  action: "apply" | "skip_manual" | "noop" | "blocked";
  paramId?: string;
  value?: number;
}

export interface NightlyApplyResult {
  dryRun: boolean;
  /** brownout により延期（force 実行時は force=true でも deferred=true を記録） */
  deferred: boolean;
  brownoutStatus?: string;
  /** dry-run のみ: 適用/skip 予定の分類プラン（実行時は undefined） */
  plan?: ProposalPlan[];
  applied: number;
  noop: number;
  skipped: number;
  blocked: number;
  errors: number;
  /** apply-code runner が次に処理できる config/prompt tier 提案数 */
  codeRemaining: number;
  notified: boolean;
}

export interface NightlyApplyDeps extends ApplyDeps {
  /** 当月累計コスト (円)。失敗時は caller が fail-open として扱う */
  getMonthlyCostJpy: () => Promise<number>;
  /** apply-code runner の loadTargets と同条件の config/prompt tier 提案数 */
  countCodeTierRemaining: () => Promise<number>;
}

export async function runNightlyApply(
  deps: NightlyApplyDeps,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<NightlyApplyResult> {
  const { dryRun = false, force = false } = opts;

  // ---- 1. Brownout gate ----
  let deferred = false;
  let brownoutStatus: string | undefined;

  try {
    const costJpy = await deps.getMonthlyCostJpy();
    const decision = await evaluateBrownout(costJpy);
    if (!decision.allowedJobs.includes("optimizer-apply")) {
      deferred = true;
      brownoutStatus = decision.status;
      if (!force) {
        const codeRemaining = await deps.countCodeTierRemaining().catch(() => 0);
        await deps.notify(
          `⏸ optimizer-nightly 延期: brownout stage=${decision.status}\n🧰 code-tier残=${codeRemaining}件`,
        );
        return {
          dryRun,
          deferred: true,
          brownoutStatus,
          applied: 0,
          noop: 0,
          skipped: 0,
          blocked: 0,
          errors: 0,
          codeRemaining,
          notified: true,
        };
      }
      // force=true: brownout をバイパスして続行
    }
  } catch (e) {
    // コスト取得またはbrownout評価の失敗 → fail-open（適用を許可）
    console.warn("[nightly] brownout gate failed (fail-open):", String(e));
  }

  // ---- 2. Dry-run: 書込 deps を一切呼ばず分類プランを返す ----
  if (dryRun) {
    const proposals = await deps.loadAcceptedProposals();
    const plan: ProposalPlan[] = proposals.map((p: ProposalRow) => {
      const tier = classifyTier(p);
      const d = getApplyDescriptor(p);
      const action: ProposalPlan["action"] =
        tier === "blocked" ? "blocked"
        : tier === "config" || tier === "prompt" ? "skip_manual"
        : tier === "noop" ? "noop"
        : "apply";
      return {
        id: p.id,
        tier,
        action,
        ...(d ? { paramId: d.paramId, value: d.value } : {}),
      };
    });
    const codeRemaining = await deps.countCodeTierRemaining().catch(() => 0);
    return {
      dryRun: true,
      deferred,
      brownoutStatus,
      plan,
      applied: 0,
      noop: 0,
      skipped: 0,
      blocked: 0,
      errors: 0,
      codeRemaining,
      notified: false,
    };
  }

  // ---- 3. 実行: apply-engine をデコレータ deps で呼ぶ ----
  type AppliedDetail = { id: string; paramId?: string; before?: unknown; after?: unknown };
  const appliedDetails: AppliedDetail[] = [];
  const errorList: string[] = [];

  const decoratedDeps: ApplyDeps = {
    ...deps,
    markImplemented: async (id, metaPatch) => {
      await deps.markImplemented(id, metaPatch);
      // apply_status="applied" のみ詳細を収集（noop は除く）
      if (metaPatch.apply_status === "applied") {
        appliedDetails.push({
          id,
          paramId: metaPatch.apply_param as string | undefined,
          before: metaPatch.apply_before,
          after: metaPatch.apply_after,
        });
      }
    },
    markSkipped: async (id, applyStatus, note) => {
      await deps.markSkipped(id, applyStatus, note);
      if (applyStatus === "error") {
        errorList.push(`${id}: ${note}`);
      }
    },
    // engine の notify を抑制（後で LINE 1通に合成）
    notify: async () => {},
  };

  const engineResult = await runApplyEngine(decoratedDeps);

  // ---- 4. code-tier 残カウント（失敗は fail-open で 0）----
  const codeRemaining = await deps.countCodeTierRemaining().catch(() => 0);

  // ---- 5. LINE 1 通合成（0 件かつ code-tier 残ゼロなら送信しない）----
  const totalActivity =
    engineResult.applied + engineResult.noop + engineResult.skipped +
    engineResult.blocked + engineResult.errors;

  let notified = false;
  if (totalActivity > 0 || codeRemaining > 0) {
    const parts: string[] = [];

    if (engineResult.applied > 0 || engineResult.noop > 0) {
      const detail = appliedDetails
        .map((d) => `  • ${d.paramId ?? d.id}: ${String(d.before)} → ${String(d.after)}`)
        .join("\n");
      parts.push(
        `✅ 適用=${engineResult.applied} noop=${engineResult.noop}` +
        (detail ? "\n" + detail : ""),
      );
    }
    if (codeRemaining > 0) {
      parts.push(`🧰 code-tier残=${codeRemaining}件（apply-code で適用待ち）`);
    }
    if (engineResult.skipped > 0) {
      parts.push(`⏸ skip=${engineResult.skipped}（手動/code-tier）`);
    }
    if (engineResult.errors > 0) {
      const errSample = errorList.slice(0, 3).join("\n  ");
      parts.push(
        `❌ errors=${engineResult.errors}` + (errSample ? "\n  " + errSample : ""),
      );
    }
    if (engineResult.blocked > 0) {
      parts.push(`🔒 blocked=${engineResult.blocked}`);
    }
    if (deferred && brownoutStatus) {
      parts.push(`⚠️ force実行中（brownout=${brownoutStatus}）`);
    }

    await deps.notify(parts.join("\n"));
    notified = true;
  }

  return {
    dryRun: false,
    deferred,
    brownoutStatus,
    applied: engineResult.applied,
    noop: engineResult.noop,
    skipped: engineResult.skipped,
    blocked: engineResult.blocked,
    errors: engineResult.errors,
    codeRemaining,
    notified,
  };
}
