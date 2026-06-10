import { createClient } from "@supabase/supabase-js";
import { classifyTier, getApplyDescriptor, validateProposalSafe } from "./validation.ts";
import { applyTierT } from "./tier-t.ts";
import { loadOptimizerState, saveOptimizerState, snapshotState, rollbackToSnapshot } from "../optimizer/state-store.ts";
import { pushLine } from "../line/line-client.ts";
import type { ApplyDeps, ApplyEngineResult } from "./types.ts";

/** accepted 提案を tier 別に処理。fail-open（全体は throw しない）。 */
export async function runApplyEngine(deps: ApplyDeps): Promise<ApplyEngineResult> {
  const res: ApplyEngineResult = { applied: 0, noop: 0, skipped: 0, blocked: 0, errors: 0 };
  const proposals = await deps.loadAcceptedProposals();

  for (const p of proposals) {
    try {
      const tier = classifyTier(p);
      if (tier === "blocked") {
        await deps.markSkipped(p.id, "blocked", validateProposalSafe(p).reason);
        res.blocked++;
        continue;
      }
      if (tier === "config" || tier === "prompt") {
        await deps.markSkipped(p.id, "skipped_manual", `tier-${tier}: 自動適用は 4B-2。手動 apply 推奨`);
        res.skipped++;
        continue;
      }
      if (tier === "T") {
        const d = getApplyDescriptor(p)!;
        const r = await applyTierT(d, deps);
        try {
          await deps.markImplemented(p.id, {
            apply_status: "applied",
            apply_param: r.paramId,
            apply_before: r.before,
            apply_after: r.after,
            rollback_handle: { snapshot_id: r.snapshotId },
          });
        } catch (markErr) {
          // state は既に変更・保存済みだが記録に失敗 → 可逆性を守るため自動 rollback して error 扱いへ
          await deps.rollbackToSnapshot(r.snapshotId).catch(() => {});
          throw markErr;
        }
        res.applied++;
        continue;
      }
      // noop（measurement/anomaly/operational・構造なし）= 記録のみ
      await deps.markImplemented(p.id, { apply_status: "noop" });
      res.noop++;
    } catch (e) {
      res.errors++;
      try {
        await deps.markSkipped(p.id, "error", `apply error: ${String(e)}`);
      } catch {
        /* fail-open */
      }
    }
  }

  await deps.notify(
    `🛠 optimizer-apply: applied=${res.applied} noop=${res.noop} skipped=${res.skipped} blocked=${res.blocked} errors=${res.errors}`,
  );
  return res;
}

function applySb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "xad" },
    auth: { persistSession: false },
  });
}

const COLS =
  "id, proposal_type, scope, hypothesis, evidence, rank, accepted, implemented, reviewer_reason, meta";

export function defaultApplyDeps(): ApplyDeps {
  const sb = applySb();
  return {
    async loadAcceptedProposals() {
      const { data, error } = await sb
        .from("optimizer_proposal")
        .select(COLS)
        .eq("accepted", true)
        .or("implemented.is.null,implemented.eq.false");
      if (error) throw new Error(`loadAcceptedProposals failed: ${error.message}`);
      // 既に apply_status が付いた（処理済み）ものは JS 側で除外
      return ((data ?? []) as never[]).filter(
        (r) => (r as { meta?: { apply_status?: unknown } } | null)?.meta?.apply_status == null,
      ) as never;
    },
    async markImplemented(id, metaPatch) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), ...metaPatch };
      const { error } = await sb
        .from("optimizer_proposal")
        .update({ implemented: true, implemented_at: new Date().toISOString(), meta })
        .eq("id", id);
      if (error) throw new Error(`markImplemented failed: ${error.message}`);
    },
    async markSkipped(id, applyStatus, note) {
      const { data: cur } = await sb.from("optimizer_proposal").select("meta, reviewer_reason").eq("id", id).single();
      const meta = { ...((cur?.meta as Record<string, unknown>) ?? {}), apply_status: applyStatus, apply_note: note };
      const reviewer_reason = [cur?.reviewer_reason, note].filter(Boolean).join(" / ");
      const { error } = await sb.from("optimizer_proposal").update({ meta, reviewer_reason }).eq("id", id);
      if (error) throw new Error(`markSkipped failed: ${error.message}`);
    },
    loadOptimizerState,
    saveOptimizerState,
    snapshotState,
    rollbackToSnapshot,
    async notify(summary) {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const userId = process.env.LINE_USER_ID_OFMETON;
      if (!token || !userId) {
        console.warn("[optimizer-apply] notify skipped: LINE env vars missing");
        return;
      }
      try {
        await pushLine(userId, summary, token);
      } catch (e) {
        console.warn("[optimizer-apply] notify failed (fail-open):", String(e));
      }
    },
  };
}
