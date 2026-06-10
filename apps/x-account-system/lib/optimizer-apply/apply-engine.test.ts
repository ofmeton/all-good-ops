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
  const deps: ApplyDeps = {
    loadAcceptedProposals: async () => proposals,
    markImplemented: async (id, patch) => { implemented[id] = patch; },
    markSkipped: async (id, status, note) => { skipped.push({ id, status, note }); },
    loadOptimizerState: async () => ({} as never),
    saveOptimizerState: async () => {},
    snapshotState: async () => ({ snapshotId: "snap_eng" }),
    notify: async (s) => { notify.push(s); },
  };
  return { deps, implemented, skipped, notify };
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
