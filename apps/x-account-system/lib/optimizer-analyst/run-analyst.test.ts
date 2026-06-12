import { runOptimizerAnalyst, defaultAnalystDeps, type AnalystDeps } from "./run-analyst.ts";

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
  // 週次化: 重複抑制・空提案許容のプロンプトが userMessage に含まれること
  expect(userMessage).toContain("重複・実質同一の提案はしないでください");
  expect(userMessage).toContain("0件でも可");
  expect(handlerName).toBe("called");
  expect(r.proposals).toBe(1);
});

test("週次化: buildSnapshotText が 14 日窓のスナップショットを生成する", async () => {
  // Supabase env 無しでも defaultSnapshotDeps(14) の windowDays が renderSnapshotText に反映される
  const prev = process.env.IN_MEMORY_FALLBACK;
  process.env.IN_MEMORY_FALLBACK = "true";
  try {
    const text = await defaultAnalystDeps().buildSnapshotText();
    expect(text).toContain("直近 14 日");
    expect(text).not.toContain("直近 30 日");
  } finally {
    if (prev === undefined) delete process.env.IN_MEMORY_FALLBACK;
    else process.env.IN_MEMORY_FALLBACK = prev;
  }
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
