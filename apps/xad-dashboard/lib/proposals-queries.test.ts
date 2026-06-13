import { describe, test, expect, beforeEach, vi } from "vitest";

// serverSupabase を chainable な builder にモックし、適用されたフィルタ・RPC 呼び出しを記録する。
const h = vi.hoisted(() => {
  const isCalls: [string, unknown][] = [];
  const rpcCalls: [string, unknown][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  builder.select = () => builder;
  builder.is = (c: string, v: unknown) => {
    isCalls.push([c, v]);
    return builder;
  };
  builder.order = () => builder;
  builder.limit = () => Promise.resolve({ data: [], error: null });
  const sb = {
    from: () => builder,
    rpc: (name: string, args: unknown) => {
      rpcCalls.push([name, args]);
      return Promise.resolve({ data: 2, error: null });
    },
  };
  return { isCalls, rpcCalls, sb };
});

vi.mock("./supabase", () => ({ serverSupabase: () => h.sb }));

import { listPendingProposals, setProposalDecision } from "./proposals-queries";

describe("proposals-queries", () => {
  beforeEach(() => {
    h.isCalls.length = 0;
    h.rpcCalls.length = 0;
  });

  test("listPendingProposals は accepted が null の行のみ取得", async () => {
    await listPendingProposals(50);
    expect(h.isCalls).toContainEqual(["accepted", null]);
  });

  test("setProposalDecision が RPC を 4 引数で呼ぶ", async () => {
    const n = await setProposalDecision(
      ["p1"],
      true,
      "良い",
      { paramId: "posting_time_evening", value: 0.28 },
    );
    expect(n).toBe(2);
    expect(h.rpcCalls).toContainEqual([
      "set_proposal_decision",
      {
        p_ids: ["p1"],
        p_accepted: true,
        p_reason: "良い",
        p_apply: { paramId: "posting_time_evening", value: 0.28 },
      },
    ]);
  });

  test("setProposalDecision: reason/apply 省略時は null", async () => {
    await setProposalDecision(["p2"], false);
    expect(h.rpcCalls).toContainEqual([
      "set_proposal_decision",
      {
        p_ids: ["p2"],
        p_accepted: false,
        p_reason: null,
        p_apply: null,
      },
    ]);
  });

  test("setProposalDecision: reason=null/apply=null を明示しても null になる", async () => {
    await setProposalDecision(["p3"], true, null, null);
    expect(h.rpcCalls).toContainEqual([
      "set_proposal_decision",
      {
        p_ids: ["p3"],
        p_accepted: true,
        p_reason: null,
        p_apply: null,
      },
    ]);
  });
});
