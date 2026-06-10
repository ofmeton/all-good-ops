import { runOptimizerAnalyst, type AnalystDeps } from "./run-analyst.ts";

test("builds snapshot, runs session with tool handler, returns proposal count", async () => {
  let userMessage = "";
  let handlerName = "";
  const deps: AnalystDeps = {
    buildSnapshotText: async () => "SNAPSHOT_TEXT",
    getAgentRef: async () => ({ id: "agent_x", version: "1", environmentId: "env_x" }),
    runSession: async (args) => {
      userMessage = args.userMessage;
      await args.customToolHandler("submit_proposal", { proposal_type: "structural_change", scope: "writer_prompt", hypothesis: "h", evidence: {}, rank: "A" });
      handlerName = "called";
      return { ok: true } as any;
    },
    countProposalsSince: async () => 1,
    notify: async () => {},
    recordCost: async () => {},
  };
  const r = await runOptimizerAnalyst(deps);
  expect(userMessage).toContain("SNAPSHOT_TEXT");
  expect(handlerName).toBe("called");
  expect(r.proposals).toBe(1);
});

test("no agent ref → returns ok:false, fail-open", async () => {
  const deps = {
    buildSnapshotText: async () => "S",
    getAgentRef: async () => null,
    runSession: async () => ({ ok: false } as any),
    countProposalsSince: async () => 0,
    notify: async () => {},
    recordCost: async () => {},
  } as any;
  const r = await runOptimizerAnalyst(deps);
  expect(r.ok).toBe(false);
});
