import { describe, test, expect, beforeEach, vi } from "vitest";

// serverSupabase を chainable builder にモックし、rpc 呼び出しを記録する。
const h = vi.hoisted(() => {
  const rpcCalls: [string, unknown][] = [];
  let rpcResult: { data: unknown; error: { message: string } | null } = { data: 0, error: null };
  const sb = {
    rpc: (name: string, args: unknown) => {
      rpcCalls.push([name, args]);
      return Promise.resolve(rpcResult);
    },
  };
  const setRpcResult = (r: { data: unknown; error: { message: string } | null }) => {
    rpcResult = r;
  };
  return { rpcCalls, sb, setRpcResult };
});

vi.mock("./supabase", () => ({ serverSupabase: () => h.sb }));

import { setSelectionStatusItems } from "./curation-queries";

describe("setSelectionStatusItems", () => {
  beforeEach(() => {
    h.rpcCalls.length = 0;
    h.setRpcResult({ data: 0, error: null });
  });

  test("素材ごと希望を p_items に snake_case で渡し、p_status を付ける", async () => {
    h.setRpcResult({ data: 2, error: null });
    const n = await setSelectionStatusItems(
      [
        { id: "a", desiredFmat: "long", templateId: "t1" },
        { id: "b", desiredFmat: "thread", templateId: "t2" },
      ],
      "queued",
    );
    expect(n).toBe(2);
    expect(h.rpcCalls).toContainEqual([
      "set_selection_status_items",
      {
        p_items: [
          { id: "a", desired_fmat: "long", template_id: "t1" },
          { id: "b", desired_fmat: "thread", template_id: "t2" },
        ],
        p_status: "queued",
      },
    ]);
  });

  test("空文字/undefined の desiredFmat・templateId は null に正規化（既存 meta 保持）", async () => {
    await setSelectionStatusItems(
      [
        { id: "a", desiredFmat: "", templateId: undefined },
        { id: "b" },
      ],
      "queued",
    );
    expect(h.rpcCalls[0][1]).toEqual({
      p_items: [
        { id: "a", desired_fmat: null, template_id: null },
        { id: "b", desired_fmat: null, template_id: null },
      ],
      p_status: "queued",
    });
  });

  test("RPC error は throw する（fail-loud な状態遷移）", async () => {
    h.setRpcResult({ data: null, error: { message: "boom" } });
    await expect(
      setSelectionStatusItems([{ id: "a" }], "queued"),
    ).rejects.toThrow(/set_selection_status_items failed: boom/);
  });

  test("data が null なら 0 を返す", async () => {
    h.setRpcResult({ data: null, error: null });
    expect(await setSelectionStatusItems([{ id: "a" }], "queued")).toBe(0);
  });
});
