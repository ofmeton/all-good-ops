import { describe, test, expect, beforeEach, vi } from "vitest";

// serverSupabase を chainable な builder にモックし、適用された .eq フィルタを記録する。
const h = vi.hoisted(() => {
  const eqCalls: [string, unknown][] = [];
  const isCalls: [string, unknown][] = [];
  const rpcCalls: [string, unknown][] = [];
  const updateCalls: unknown[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  // .select() は update チェーン末尾（returns data）でも listPending（returns builder）でも
  // 呼ばれる。update 経路を判別するため updatePending フラグを立て、select で resolve する。
  builder._updatePending = false;
  builder.select = () => {
    if (builder._updatePending) {
      builder._updatePending = false;
      return Promise.resolve({ data: [{ id: "x" }], error: null });
    }
    return builder;
  };
  builder.update = (patch: unknown) => {
    updateCalls.push(patch);
    builder._updatePending = true;
    return builder;
  };
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
  return { eqCalls, isCalls, rpcCalls, updateCalls, sb };
});

vi.mock("./supabase", () => ({ serverSupabase: () => h.sb }));

import {
  listPendingDrafts,
  setApprovalStatus,
  updateDraftBody,
  requestRevision,
} from "./drafts-queries";

describe("drafts-queries", () => {
  beforeEach(() => {
    h.eqCalls.length = 0;
    h.isCalls.length = 0;
    h.rpcCalls.length = 0;
    h.updateCalls.length = 0;
    h.sb.from()._updatePending = false;
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

  // ── updateDraftBody: thread_bodies 連動（要件7 UI 連動） ──
  test("updateDraftBody は threadBodies 未指定なら body のみ更新（後方互換・thread_bodies は触らない）", async () => {
    await updateDraftBody("a", "本文だけ");
    expect(h.updateCalls).toEqual([{ body: "本文だけ" }]);
    // pending かつ未公開のみ更新する CAS 条件を維持。
    expect(h.eqCalls).toContainEqual(["human_approval_status", "pending"]);
    expect(h.isCalls).toContainEqual(["published_at", null]);
  });

  test("updateDraftBody は threadBodies 配列を渡すと body と thread_bodies を両更新", async () => {
    await updateDraftBody("a", "1本目\n\n---\n\n2本目", ["1本目", "2本目"]);
    expect(h.updateCalls).toEqual([
      { body: "1本目\n\n---\n\n2本目", thread_bodies: ["1本目", "2本目"] },
    ]);
  });

  test("updateDraftBody は threadBodies=null で thread_bodies を NULL 化（単一へ戻す）", async () => {
    await updateDraftBody("a", "単一に戻す", null);
    expect(h.updateCalls).toEqual([{ body: "単一に戻す", thread_bodies: null }]);
  });

  // ── requestRevision: RPC request_draft_revision（要件4+5） ──
  test("requestRevision は RPC に draft_id/instruction を渡す（fmat/template 未指定は null）", async () => {
    await requestRevision("d1", "もっと具体例を");
    expect(h.rpcCalls).toContainEqual([
      "request_draft_revision",
      {
        p_draft_id: "d1",
        p_instruction: "もっと具体例を",
        p_desired_fmat: null,
        p_template_id: null,
      },
    ]);
  });

  test("requestRevision は desiredFmat/templateId を指定すると RPC に載る", async () => {
    await requestRevision("d1", "短く", "short", "template_x");
    expect(h.rpcCalls).toContainEqual([
      "request_draft_revision",
      {
        p_draft_id: "d1",
        p_instruction: "短く",
        p_desired_fmat: "short",
        p_template_id: "template_x",
      },
    ]);
  });

  test("requestRevision は claim 件数を返す", async () => {
    const n = await requestRevision("d1", "依頼");
    expect(n).toBe(1);
  });
});
