import { runApplyEngine } from "./apply-engine.ts";
import type { ApplyDeps, ProposalRow } from "./types.ts";

function row(over: Partial<ProposalRow>): ProposalRow {
  return {
    id: "p", proposal_type: "config_change", scope: "lever_bandit", hypothesis: "h",
    evidence: {}, rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

function makeDeps(proposals: ProposalRow[]) {
  const implemented: Record<string, Record<string, unknown>> = {};
  const skipped: { id: string; status: string; note: string }[] = [];
  const notify: string[] = [];
  // tier-P 用 in-memory runtime_params（実 DB 不使用）。before は upsert 前の値。
  const runtimeParams: Record<string, number> = {};
  const tierPRollbacks: Array<{ paramId: string; before: number | null }> = [];
  const deps: ApplyDeps = {
    loadAcceptedProposals: async () => proposals,
    markImplemented: async (id, patch) => { implemented[id] = patch; },
    markSkipped: async (id, status, note) => { skipped.push({ id, status, note }); },
    loadOptimizerState: async () => ({} as never),
    saveOptimizerState: async () => {},
    snapshotState: async () => ({ snapshotId: "snap_eng" }),
    rollbackToSnapshot: async () => {},
    applyTierP: async (paramId, value) => {
      const before = paramId in runtimeParams ? runtimeParams[paramId] : null;
      runtimeParams[paramId] = value;
      return { paramId, before, after: value };
    },
    rollbackTierP: async (paramId, before) => {
      tierPRollbacks.push({ paramId, before });
      if (before == null) delete runtimeParams[paramId];
      else runtimeParams[paramId] = before;
    },
    notify: async (s) => { notify.push(s); },
  };
  return { deps, implemented, skipped, notify, runtimeParams, tierPRollbacks };
}

describe("runApplyEngine", () => {
  it("tier-T(構造あり) を適用し implemented+rollback_handle 記録", async () => {
    const state: any = {
      postingTime: { evening: { paramId: "posting_time_evening", distType: "beta", params: { alpha: 2, beta: 8 } } },
      hookDistribution: {}, xFormatRatio: {},
    };
    const { deps, implemented, notify } = makeDeps([
      row({ id: "t1", meta: { apply: { paramId: "posting_time_evening", value: 0.3 } } }),
    ]);
    deps.loadOptimizerState = async () => state;
    const r = await runApplyEngine(deps);
    expect(r.applied).toBe(1);
    expect(implemented.t1.apply_status).toBe("applied");
    expect((implemented.t1.rollback_handle as any).snapshot_id).toBe("snap_eng");
    expect(notify[0]).toMatch(/applied=1/);
  });

  it("🔒 は blocked で skip（implemented にしない）", async () => {
    const { deps, implemented, skipped } = makeDeps([row({ id: "b1", hypothesis: "first_hand を下げる" })]);
    const r = await runApplyEngine(deps);
    expect(r.blocked).toBe(1);
    expect(implemented.b1).toBeUndefined();
    expect(skipped[0]).toMatchObject({ id: "b1", status: "blocked" });
  });

  it("config/prompt は skipped_manual", async () => {
    const { deps, skipped } = makeDeps([
      row({ id: "c1", scope: "collector_query", hypothesis: "watchlist 追加" }),
      row({ id: "pr1", scope: "writer_prompt", hypothesis: "プロンプト改善" }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.skipped).toBe(2);
    expect(skipped.map((s) => s.status)).toEqual(["skipped_manual", "skipped_manual"]);
  });

  it("構造なし measurement は noop で implemented 化", async () => {
    const { deps, implemented } = makeDeps([
      row({ id: "n1", proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測" }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.noop).toBe(1);
    expect(implemented.n1.apply_status).toBe("noop");
  });

  it("tier-T apply 後 markImplemented 失敗時は自動 rollback して error 計上", async () => {
    const state: any = {
      postingTime: { evening: { paramId: "posting_time_evening", distType: "beta", params: { alpha: 2, beta: 8 } } },
      hookDistribution: {}, xFormatRatio: {},
    };
    const rolledBack: string[] = [];
    const { deps } = makeDeps([
      row({ id: "t1", meta: { apply: { paramId: "posting_time_evening", value: 0.3 } } }),
    ]);
    deps.loadOptimizerState = async () => state;
    deps.markImplemented = async () => { throw new Error("mark down"); };
    deps.rollbackToSnapshot = async (id: string) => { rolledBack.push(id); };
    const r = await runApplyEngine(deps);
    expect(r.errors).toBe(1);
    expect(r.applied).toBe(0);
    expect(rolledBack).toEqual(["snap_eng"]);
  });

  it("tier-P(collector_lever + apply) を runtime_params に適用し implemented+rollback_handle 記録", async () => {
    const { deps, implemented, runtimeParams } = makeDeps([
      row({ id: "p1", scope: "collector_lever", hypothesis: "shortlist を広げる", meta: { apply: { paramId: "collector_shortlist_top_k", value: 90 } } }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.applied).toBe(1);
    expect(runtimeParams.collector_shortlist_top_k).toBe(90);
    expect(implemented.p1.apply_status).toBe("applied");
    expect(implemented.p1.apply_param).toBe("collector_shortlist_top_k");
    expect((implemented.p1.rollback_handle as { tier: string; param_id: string }).tier).toBe("P");
    expect((implemented.p1.rollback_handle as { param_id: string }).param_id).toBe("collector_shortlist_top_k");
  });

  it("tier-P で apply 記述が無い collector_lever は skipped_manual（誤適用しない）", async () => {
    const { deps, skipped, runtimeParams } = makeDeps([
      row({ id: "p2", scope: "collector_lever", hypothesis: "なにか良くしたい", meta: {} }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.skipped).toBe(1);
    expect(skipped[0]).toMatchObject({ id: "p2", status: "skipped_manual" });
    expect(Object.keys(runtimeParams)).toHaveLength(0);
  });

  it("tier-P enforce レバーも apply（collector_prerank_enforce）", async () => {
    const { deps, runtimeParams } = makeDeps([
      row({ id: "p3", scope: "collector_lever", hypothesis: "enforce 化", meta: { apply: { paramId: "collector_prerank_enforce", value: 1 } } }),
    ]);
    const r = await runApplyEngine(deps);
    expect(r.applied).toBe(1);
    expect(runtimeParams.collector_prerank_enforce).toBe(1);
  });

  it("tier-P apply 後 markImplemented 失敗時は runtime_params を before へ rollback して error 計上", async () => {
    const { deps, tierPRollbacks, runtimeParams } = makeDeps([
      row({ id: "p4", scope: "collector_lever", hypothesis: "quota 上げ", meta: { apply: { paramId: "collector_exploration_quota", value: 20 } } }),
    ]);
    deps.markImplemented = async () => { throw new Error("mark down"); };
    const r = await runApplyEngine(deps);
    expect(r.errors).toBe(1);
    expect(r.applied).toBe(0);
    // before=null（元々行なし）へ rollback＝削除で復帰。
    expect(tierPRollbacks).toEqual([{ paramId: "collector_exploration_quota", before: null }]);
    expect(runtimeParams.collector_exploration_quota).toBeUndefined();
  });

  it("apply 失敗は errors++ で他は継続（fail-open）", async () => {
    const { deps, skipped } = makeDeps([
      row({ id: "e1", meta: { apply: { paramId: "posting_time_evening", value: 0.3 } } }),
      row({ id: "n2", proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測" }),
    ]);
    deps.loadOptimizerState = async () => { throw new Error("state down"); };
    const r = await runApplyEngine(deps);
    expect(r.errors).toBe(1);
    expect(r.noop).toBe(1); // n2 は継続
    expect(skipped.find((s) => s.id === "e1")?.status).toBe("error");
  });
});
