import { runCodeApply, runCodeRollback } from "./run-code-apply.ts";
import type { CodeApplyDeps, CodeRollbackDeps, ProposalRow, Workspace } from "./types.ts";

const CFG = "apps/x-account-system/lib/ingest/collector-config.ts";
const PRM = "apps/x-account-system/lib/check/check-prompts.ts";
const GUARDS = "apps/x-account-system/lib/optimizer/guards.ts";

function row(over: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "p1", proposal_type: "config_change", scope: "collector_query",
    hypothesis: "watchlist に foo を追加", evidence: {}, rank: "A",
    accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

type Calls = Record<string, unknown[][]>;
function makeDeps(targets: ProposalRow[], diffFiles: string[] = [CFG]) {
  const calls: Calls = {};
  const rec = (k: string, ...a: unknown[]) => { (calls[k] ??= []).push(a); };
  const ws: Workspace = { dir: "/tmp/x", branch: "task/auto-apply-p1" };
  const deps: CodeApplyDeps = {
    enqueueWorkerApply: async () => rec("enqueue"),
    loadTargets: async () => targets,
    createWorkspace: async (id) => { rec("createWs", id); return ws; },
    runImplementer: async () => { rec("impl"); return { ok: true, log: "done" }; },
    runFixer: async (_w, _p, reasons) => { rec("fix", reasons); return { ok: true, log: "fixed" }; },
    renderArtifacts: async () => rec("render"),
    collectDiff: async () => ({ files: diffFiles, diffText: "+ watchlist: ['foo']" }),
    runChecks: async () => { rec("checks"); return { ok: true, output: "green" }; },
    runReviewer: async () => { rec("review"); return { verdict: "APPROVE", reasons: [] }; },
    pushAndCreatePr: async (_w, pr, draft) => { rec("pr", pr.title, draft); return { prUrl: "https://pr/1" }; },
    mergePr: async () => { rec("merge"); return { sha: "deadbeef" }; },
    deploy: async (files) => { rec("deploy", files); return { deployed: ["wrangler"] }; },
    cleanupWorkspace: async (_w, keep) => rec("cleanup", keep),
    markApplied: async (id, meta) => rec("markApplied", id, meta),
    markStatus: async (id, st, note) => rec("markStatus", id, st, note),
    notify: async (m) => rec("notify", m),
  };
  return { deps, calls };
}

describe("runCodeApply", () => {
  it("正常系: gate+review 緑 → merge → deploy → markApplied(rollback_handle 付き)", async () => {
    const { deps, calls } = makeDeps([row()]);
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.merge).toHaveLength(1);
    expect(calls.deploy[0][0]).toEqual([CFG]);
    const meta = calls.markApplied[0][1] as Record<string, never>;
    expect(meta.apply_status).toBe("applied_code");
    expect((meta.rollback_handle as { git_sha: string }).git_sha).toBe("deadbeef");
    expect(calls.cleanup[0][0]).toBe(false);
  });

  it("🔒 提案は blocked（workspace を作らない）", async () => {
    const { deps, calls } = makeDeps([row({ hypothesis: "first_hand を下げる" })]);
    const r = await runCodeApply(deps);
    expect(r.blocked).toBe(1);
    expect(calls.createWs).toBeUndefined();
    expect(calls.markStatus[0][1]).toBe("blocked");
  });

  it("allowlist 逸脱 → fixer 1回 → なお逸脱 → draft PR + pr_pending + branch 残す", async () => {
    const { deps, calls } = makeDeps([row()], [GUARDS]);
    const r = await runCodeApply(deps);
    expect(r.prPending).toBe(1);
    expect(calls.fix).toHaveLength(1);
    expect(calls.pr[0][1]).toBe(true);
    expect(calls.merge).toBeUndefined();
    expect(calls.markStatus[0][1]).toBe("pr_pending");
    expect(calls.cleanup[0][0]).toBe(true);
  });

  it("review REJECT → fixer → APPROVE → applied", async () => {
    const { deps, calls } = makeDeps([row()]);
    let first = true;
    deps.runReviewer = async () => {
      if (first) { first = false; return { verdict: "REJECT", reasons: ["余計な変更"] }; }
      return { verdict: "APPROVE", reasons: [] };
    };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.fix[0][0]).toEqual(["余計な変更"]);
  });

  it("prompt ファイルの diff があれば renderArtifacts を呼ぶ", async () => {
    const { deps, calls } = makeDeps([row({ scope: "checker_prompt" })], [PRM]);
    await runCodeApply(deps);
    expect(calls.render).toHaveLength(1);
  });

  it("config のみなら renderArtifacts を呼ばない", async () => {
    const { deps, calls } = makeDeps([row()], [CFG]);
    await runCodeApply(deps);
    expect(calls.render).toBeUndefined();
  });

  it("deploy 失敗でも markApplied は行い 🚨 通知（merge 済みのため）", async () => {
    const { deps, calls } = makeDeps([row()]);
    deps.deploy = async () => { throw new Error("wrangler down"); };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
    expect(calls.markApplied).toHaveLength(1);
    expect((calls.notify as unknown[][]).some((a) => String(a[0]).includes("🚨"))).toBe(true);
  });

  it("dryRun は push/merge/deploy/markApplied をしない", async () => {
    const { deps, calls } = makeDeps([row()]);
    const r = await runCodeApply(deps, { dryRun: true });
    expect(r.applied).toBe(1);
    expect(calls.pr).toBeUndefined();
    expect(calls.merge).toBeUndefined();
    expect(calls.markApplied).toBeUndefined();
  });

  it("enqueue 失敗は fail-open（処理続行）", async () => {
    const { deps } = makeDeps([row()]);
    deps.enqueueWorkerApply = async () => { throw new Error("worker down"); };
    const r = await runCodeApply(deps);
    expect(r.applied).toBe(1);
  });

  it("implementer 失敗は error 計上で次へ", async () => {
    const { deps, calls } = makeDeps([row(), row({ id: "p2" })]);
    let n = 0;
    deps.runImplementer = async () => (++n === 1 ? { ok: false, log: "crash" } : { ok: true, log: "done" });
    const r = await runCodeApply(deps);
    expect(r.errors).toBe(1);
    expect(r.applied).toBe(1);
    expect((calls.markStatus as unknown[][]).some((a) => a[1] === "error")).toBe(true);
  });

  it("onlyId 指定時は他をスキップ", async () => {
    const { deps, calls } = makeDeps([row(), row({ id: "p2" })]);
    const r = await runCodeApply(deps, { onlyId: "p2" });
    expect(r.processed).toBe(1);
    expect((calls.createWs as unknown[][])[0][0]).toBe("p2");
  });
});

describe("runCodeRollback", () => {
  function makeRbDeps(handle: { git_sha?: string } | null) {
    const calls: Calls = {};
    const rec = (k: string, ...a: unknown[]) => { (calls[k] ??= []).push(a); };
    const deps: CodeRollbackDeps = {
      createWorkspace: async () => ({ dir: "/tmp/rb", branch: "task/auto-apply-rb" }),
      collectDiff: async () => ({ files: [CFG], diffText: "- foo" }),
      runChecks: async () => ({ ok: true, output: "green" }),
      pushAndCreatePr: async (_w, _pr, draft) => { rec("pr", draft); return { prUrl: "https://pr/2" }; },
      mergePr: async () => { rec("merge"); return { sha: "cafebabe" }; },
      deploy: async (f) => { rec("deploy", f); return { deployed: ["wrangler"] }; },
      cleanupWorkspace: async (_w, keep) => rec("cleanup", keep),
      renderArtifacts: async () => rec("render"),
      notify: async (m) => rec("notify", m),
      getRollbackHandle: async () => handle,
      revertCommit: async (_w, sha) => rec("revert", sha),
      markRolledBack: async (id) => rec("rolledBack", id),
    };
    return { deps, calls };
  }

  it("handle の git_sha を revert → merge → deploy → markRolledBack", async () => {
    const { deps, calls } = makeRbDeps({ git_sha: "deadbeef" });
    const r = await runCodeRollback("p1", deps);
    expect(r.ok).toBe(true);
    expect(calls.revert[0][0]).toBe("deadbeef");
    expect(calls.merge).toHaveLength(1);
    expect(calls.rolledBack[0][0]).toBe("p1");
  });

  it("handle 無しは ok:false（何もしない）", async () => {
    const { deps, calls } = makeRbDeps(null);
    const r = await runCodeRollback("p1", deps);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/git_sha/);
    expect(calls.revert).toBeUndefined();
  });
});
