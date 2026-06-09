import { describe, test, expect, beforeEach, vi } from "vitest";

// serverSupabase を chainable な builder にモックし、適用された .eq フィルタを記録する。
const h = vi.hoisted(() => {
  const eqCalls: [string, unknown][] = [];
  const isCalls: [string, unknown][] = [];
  const rpcCalls: [string, unknown][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  builder.select = () => builder;
  builder.eq = (c: string, v: unknown) => {
    eqCalls.push([c, v]);
    return builder;
  };
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
      return Promise.resolve({ data: 1, error: null });
    },
  };
  return { eqCalls, isCalls, rpcCalls, sb };
});

vi.mock("./supabase", () => ({ serverSupabase: () => h.sb }));

import { listPendingDrafts, setApprovalStatus } from "./drafts-queries";

describe("drafts-queries", () => {
  beforeEach(() => {
    h.eqCalls.length = 0;
    h.isCalls.length = 0;
    h.rpcCalls.length = 0;
  });

  test("listPendingDrafts は点検済(editor_status='approved') かつ pending/未公開/未予約のみ取得", async () => {
    await listPendingDrafts(50);
    // 退行防止の本丸: MA 点検を通った draft だけを人間ゲートに載せる。
    expect(h.eqCalls).toContainEqual(["editor_status", "approved"]);
    expect(h.eqCalls).toContainEqual(["human_approval_status", "pending"]);
    expect(h.isCalls).toContainEqual(["published_at", null]);
    expect(h.isCalls).toContainEqual(["scheduled_for", null]);
  });

  test("setApprovalStatus は RPC に ids/status を渡す（添付なし・理由なしは null）", async () => {
    await setApprovalStatus(["a", "b"], "approved");
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a", "b"], p_status: "approved", p_attachments: null, p_reason: null },
    ]);
  });

  test("承認時に写真 attachments を渡すと p_attachments に載る", async () => {
    const att = [
      { kind: "upload" as const, mediaType: "photo" as const, sourceUrl: "u", sourceMaterialId: "m" },
    ];
    await setApprovalStatus(["a"], "approved", att);
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a"], p_status: "approved", p_attachments: att, p_reason: null },
    ]);
  });

  test("却下時は attachments を渡しても p_attachments=null（写真 intent は承認時のみ）", async () => {
    const att = [
      { kind: "upload" as const, mediaType: "photo" as const, sourceUrl: "u", sourceMaterialId: "m" },
    ];
    await setApprovalStatus(["a"], "rejected", att);
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a"], p_status: "rejected", p_attachments: null, p_reason: null },
    ]);
  });

  test("reason を渡すと p_reason に載る（承認）", async () => {
    await setApprovalStatus(["a"], "approved", null, "文章が自然でよい");
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a"], p_status: "approved", p_attachments: null, p_reason: "文章が自然でよい" },
    ]);
  });

  test("reason を渡すと p_reason に載る（却下）", async () => {
    await setApprovalStatus(["a"], "rejected", null, "リスクが高い");
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a"], p_status: "rejected", p_attachments: null, p_reason: "リスクが高い" },
    ]);
  });

  test("reason=null は p_reason=null", async () => {
    await setApprovalStatus(["a"], "rejected", null, null);
    expect(h.rpcCalls).toContainEqual([
      "set_approval_status",
      { p_ids: ["a"], p_status: "rejected", p_attachments: null, p_reason: null },
    ]);
  });
});
