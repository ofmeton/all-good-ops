import { describe, test, expect, beforeEach, vi } from "vitest";

// serverSupabase を chainable builder にモックし、update/eq/is/in/rpc を記録する。
// markPublished（2段 UPDATE）・discardApprovedDrafts（RPC）の配管検証に使う。
const h = vi.hoisted(() => {
  type Call = [string, unknown];
  const eqCalls: Call[] = [];
  const isCalls: Call[] = [];
  const inCalls: Call[] = [];
  const updateCalls: unknown[] = [];
  const rpcCalls: Call[] = [];
  const fromTables: string[] = [];
  // post_drafts update().select() が返す行（テストごとに差し替え可）。
  let draftSelectResult: { data: unknown; error: unknown } = { data: [], error: null };
  let rpcResult: { data: unknown; error: unknown } = { data: 0, error: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  builder.update = (patch: unknown) => {
    updateCalls.push(patch);
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
  builder.in = (c: string, v: unknown) => {
    inCalls.push([c, v]);
    // core_ideas 側 update().in() は thenable で終端する。
    return Promise.resolve({ data: null, error: null });
  };
  builder.select = () => Promise.resolve(draftSelectResult);
  const sb = {
    from: (t: string) => {
      fromTables.push(t);
      return builder;
    },
    rpc: (name: string, args: unknown) => {
      rpcCalls.push([name, args]);
      return Promise.resolve(rpcResult);
    },
  };
  return {
    eqCalls, isCalls, inCalls, updateCalls, rpcCalls, fromTables, sb,
    setDraftSelectResult: (r: typeof draftSelectResult) => { draftSelectResult = r; },
    setRpcResult: (r: typeof rpcResult) => { rpcResult = r; },
  };
});

vi.mock("./supabase", () => ({ serverSupabase: () => h.sb }));

import {
  buildHandoffPayload,
  markPublished,
  discardApprovedDrafts,
  type PublishStock,
} from "./publish-queries";

const base: PublishStock = {
  id: "d1",
  core_idea_id: "ci1",
  body: "本文テキスト",
  fmat: "single",
  human_approved_at: "2026-06-09T00:00:00Z",
  risk_level: "low",
  risk_reasons: null,
  attachments: null,
  thread_bodies: null,
};

describe("buildHandoffPayload", () => {
  test("プレーン本文: 写真0・動画なし・字数カウント", () => {
    const p = buildHandoffPayload(base);
    expect(p.draftId).toBe("d1");
    expect(p.body).toBe("本文テキスト");
    expect(p.charCount).toBe(6);
    expect(p.photos).toEqual([]);
    expect(p.hasVideoDeepLink).toBe(false);
    expect(p.videoDeepLinkHint).toBeNull();
    expect(p.fmat).toBe("single");
    expect(p.riskLevel).toBe("low");
    expect(p.riskReasons).toEqual([]);
  });

  test("写真 upload intent のみ抽出（非 photo / 欠落 url は除外）", () => {
    const p = buildHandoffPayload({
      ...base,
      attachments: [
        { kind: "upload", mediaType: "photo", sourceUrl: "https://pbs.twimg.com/a.jpg", sourceMaterialId: "m1" },
        // 欠落 url は除外
        { kind: "upload", mediaType: "photo", sourceUrl: "", sourceMaterialId: "m2" },
      ],
    });
    expect(p.photos).toEqual([{ sourceUrl: "https://pbs.twimg.com/a.jpg", sourceMaterialId: "m1" }]);
  });

  test("本文の動画 deep-link を検知し video hint を構築", () => {
    const body = "見て→ https://x.com/foo/status/123/video/1 すごい";
    const p = buildHandoffPayload({ ...base, body });
    expect(p.hasVideoDeepLink).toBe(true);
    expect(p.videoDeepLinkHint).toBe("https://x.com/foo/status/123/video/1");
  });

  test("body 非文字列は空文字に正規化（境界の安全側デフォルト）", () => {
    const p = buildHandoffPayload({ ...base, body: undefined as unknown as string });
    expect(p.body).toBe("");
    expect(p.charCount).toBe(0);
    expect(p.hasVideoDeepLink).toBe(false);
  });

  test("絵文字を含む字数は code point で数える", () => {
    const p = buildHandoffPayload({ ...base, body: "🎉あ" });
    expect(p.charCount).toBe(2);
  });

  // 要件7: thread_bodies → tweets。投稿時の正を載せる。
  test("thread_bodies が無い（null）と tweets=null（単一ツイート・後方互換）", () => {
    const p = buildHandoffPayload(base);
    expect(p.tweets).toBeNull();
  });

  test("thread_bodies 配列を trim・空除去して tweets に載せる", () => {
    const p = buildHandoffPayload({
      ...base,
      thread_bodies: ["  1本目  ", "2本目", "", "   "],
    });
    expect(p.tweets).toEqual(["1本目", "2本目"]);
  });

  test("thread_bodies が空配列/全要素空 は tweets=null（単一扱い）", () => {
    expect(buildHandoffPayload({ ...base, thread_bodies: [] }).tweets).toBeNull();
    expect(buildHandoffPayload({ ...base, thread_bodies: ["", "  "] }).tweets).toBeNull();
  });

  test("thread_bodies の非文字列要素は除外（境界の安全側）", () => {
    const p = buildHandoffPayload({
      ...base,
      thread_bodies: ["ok", 123 as unknown as string, null as unknown as string, "ok2"],
    });
    expect(p.tweets).toEqual(["ok", "ok2"]);
  });
});

describe("markPublished（決定4: core_ideas.status='published' 連動）", () => {
  beforeEach(() => {
    h.eqCalls.length = 0;
    h.isCalls.length = 0;
    h.inCalls.length = 0;
    h.updateCalls.length = 0;
    h.rpcCalls.length = 0;
    h.fromTables.length = 0;
    h.setDraftSelectResult({ data: [], error: null });
  });

  test("claim 成功時: published_at 確定 + core_ideas を published に連動", async () => {
    h.setDraftSelectResult({ data: [{ id: "d1", core_idea_id: "ci1" }], error: null });
    const n = await markPublished("d1");
    expect(n).toBe(1);
    // ① post_drafts を CAS（approved & published_at IS NULL）で更新
    expect(h.fromTables).toContain("post_drafts");
    expect(h.eqCalls).toContainEqual(["human_approval_status", "approved"]);
    expect(h.isCalls).toContainEqual(["published_at", null]);
    expect(h.updateCalls.some((u) => (u as { published_at?: unknown }).published_at != null)).toBe(true);
    // ② core_ideas.status='published' を claim した core_idea_id にだけ連動
    expect(h.fromTables).toContain("core_ideas");
    expect(h.updateCalls).toContainEqual({ status: "published" });
    expect(h.inCalls).toContainEqual(["id", ["ci1"]]);
  });

  test("claim 0 件（二重押下/既公開）: core_ideas 連動は走らない・0 を返す", async () => {
    h.setDraftSelectResult({ data: [], error: null });
    const n = await markPublished("d1");
    expect(n).toBe(0);
    expect(h.fromTables).not.toContain("core_ideas");
    expect(h.inCalls).toHaveLength(0);
  });

  test("core_idea_id が null の draft は連動 update を呼ばない（published_at は確定済）", async () => {
    h.setDraftSelectResult({ data: [{ id: "d1", core_idea_id: null }], error: null });
    const n = await markPublished("d1");
    expect(n).toBe(1);
    expect(h.fromTables).not.toContain("core_ideas");
  });
});

describe("discardApprovedDrafts（要件3: RPC discard_approved_drafts）", () => {
  beforeEach(() => {
    h.rpcCalls.length = 0;
    h.setRpcResult({ data: 0, error: null });
  });

  test("ids と reason を RPC に渡す", async () => {
    h.setRpcResult({ data: 2, error: null });
    const n = await discardApprovedDrafts(["a", "b"], "もう不要");
    expect(n).toBe(2);
    expect(h.rpcCalls).toContainEqual([
      "discard_approved_drafts",
      { p_ids: ["a", "b"], p_reason: "もう不要" },
    ]);
  });

  test("reason 未指定/空白は p_reason=null", async () => {
    await discardApprovedDrafts(["a"]);
    expect(h.rpcCalls).toContainEqual(["discard_approved_drafts", { p_ids: ["a"], p_reason: null }]);
    h.rpcCalls.length = 0;
    await discardApprovedDrafts(["a"], "   ");
    expect(h.rpcCalls).toContainEqual(["discard_approved_drafts", { p_ids: ["a"], p_reason: null }]);
  });
});
