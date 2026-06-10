import { OPTIMIZER_ANALYST_TOOL_REGISTRY, makeToolHandler, type ToolDeps } from "./tools.ts";
import type { ProposalInput } from "./types.ts";

test("registry exposes submit_proposal + read tools as custom schemas", () => {
  const reg = OPTIMIZER_ANALYST_TOOL_REGISTRY as Record<string, any>;
  expect(reg.submit_proposal.name).toBe("submit_proposal");
  expect(Array.isArray(reg.optimizer_analyst_tools)).toBe(true);
  const names = (reg.optimizer_analyst_tools as any[]).map((t) => t.name);
  expect(names).toEqual(expect.arrayContaining([
    "get_lever_performance", "get_approval_reasons", "get_post_detail",
    "get_funnel_stats", "get_optimizer_state", "get_recent_proposals",
  ]));
});

describe("makeToolHandler", () => {
  function deps(over: Partial<ToolDeps> = {}): { d: ToolDeps; saved: ProposalInput[] } {
    const saved: ProposalInput[] = [];
    const d: ToolDeps = {
      getLeverPerformance: async () => ({ ok: true }),
      getApprovalReasons: async () => [],
      getPostDetail: async () => ({ id: "d1" }),
      getFunnelStats: async () => ({}),
      getOptimizerState: async () => ({}),
      getRecentProposals: async () => [],
      saveProposal: async (p) => { saved.push(p); },
      ...over,
    };
    return { d, saved };
  }

  test("submit_proposal saves and returns ok", async () => {
    const { d, saved } = deps();
    const h = makeToolHandler(d);
    const input: ProposalInput = { proposal_type: "structural_change", scope: "writer_prompt", hypothesis: "X", evidence: { a: 1 }, rank: "A" };
    const out = await h("submit_proposal", input);
    expect(saved).toHaveLength(1);
    expect(saved[0].scope).toBe("writer_prompt");
    expect(out).toContain("ok");
  });

  test("unknown tool → error string (not throw)", async () => {
    const { d } = deps();
    const out = await makeToolHandler(d)("nope", {});
    expect(out).toContain("unknown tool");
  });

  test("read tool returns JSON string of query result", async () => {
    const { d } = deps({ getFunnelStats: async () => ({ published: 12 }) });
    const out = await makeToolHandler(d)("get_funnel_stats", {});
    expect(JSON.parse(out)).toEqual({ published: 12 });
  });

  test("invalid submit_proposal payload → error string", async () => {
    const { d, saved } = deps();
    const out = await makeToolHandler(d)("submit_proposal", { scope: "x" });
    expect(saved).toHaveLength(0);
    expect(out).toContain("invalid");
  });
});
