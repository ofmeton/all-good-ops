import { resolveThreadRoots, isNonRootReply, pickThreadRoot } from "./collector-thread.ts";
import type { Tweet } from "./twitterapi-client.ts";
import type { Candidate } from "./collector-scoring.ts";

function tw(p: Partial<Tweet> & { id: string }): Tweet {
  return {
    id: p.id,
    text: p.text ?? `text-${p.id}`,
    author: { userName: p.author?.userName ?? "alice" },
    createdAt: p.createdAt ?? "2026-06-11T00:00:00Z",
    conversationId: p.conversationId,
    isReply: p.isReply,
    ...p,
  } as Tweet;
}

function cand(t: Tweet, via: Candidate["discovery"]["via"] = "keyword"): Candidate {
  return { tweet: t, discovery: { via, query: "AI" } };
}

describe("isNonRootReply", () => {
  test("conversationId と一致なら root（false）", () => {
    expect(isNonRootReply(tw({ id: "100", conversationId: "100" }))).toBe(false);
  });
  test("id ≠ conversationId なら非ルート（true）", () => {
    expect(isNonRootReply(tw({ id: "101", conversationId: "100" }))).toBe(true);
  });
  test("conversationId 無しは root 扱い（false）", () => {
    expect(isNonRootReply(tw({ id: "101" }))).toBe(false);
  });
});

describe("pickThreadRoot", () => {
  test("id===conversationId のツイートを優先", () => {
    const thread = [tw({ id: "101", conversationId: "100" }), tw({ id: "100", conversationId: "100" })];
    expect(pickThreadRoot(thread, "100")?.id).toBe("100");
  });
  test("exact 無しなら最古を TOP とみなす", () => {
    const thread = [
      tw({ id: "102", conversationId: "100", createdAt: "2026-06-11T02:00:00Z" }),
      tw({ id: "101", conversationId: "100", createdAt: "2026-06-11T01:00:00Z" }),
    ];
    expect(pickThreadRoot(thread, "100")?.id).toBe("101");
  });
  test("空スレッドは null", () => {
    expect(pickThreadRoot([], "100")).toBeNull();
  });
});

describe("resolveThreadRoots", () => {
  test("非ルート候補を TOP に差し替え、threadRootOf を記録", async () => {
    const reply = tw({ id: "101", conversationId: "100" });
    const root = tw({ id: "100", conversationId: "100", text: "TOP" });
    const getThread = jest.fn(async () => [reply, root]);
    const out = await resolveThreadRoots([cand(reply)], { key: "k", fetchImpl: fetch, getThread });
    expect(out).toHaveLength(1);
    expect(out[0].tweet.id).toBe("100");
    expect(out[0].tweet.text).toBe("TOP");
    expect(out[0].threadRootOf).toBe("101");
    expect(getThread).toHaveBeenCalledTimes(1);
  });

  test("ルート候補はそのまま・getThread 呼ばない", async () => {
    const root = tw({ id: "100", conversationId: "100" });
    const getThread = jest.fn(async () => []);
    const out = await resolveThreadRoots([cand(root)], { key: "k", fetchImpl: fetch, getThread });
    expect(out[0].tweet.id).toBe("100");
    expect(out[0].threadRootOf).toBeUndefined();
    expect(getThread).not.toHaveBeenCalled();
  });

  test("同一スレッドの複数 reply は 1 ルートに畳む（fetch も1回）", async () => {
    const r1 = tw({ id: "101", conversationId: "100" });
    const r2 = tw({ id: "102", conversationId: "100" });
    const root = tw({ id: "100", conversationId: "100" });
    const getThread = jest.fn(async () => [root, r1, r2]);
    const out = await resolveThreadRoots([cand(r1), cand(r2)], { key: "k", fetchImpl: fetch, getThread });
    expect(out).toHaveLength(1);
    expect(out[0].tweet.id).toBe("100");
    expect(getThread).toHaveBeenCalledTimes(1);
  });

  test("getThread 失敗は元の候補を残す（fail-open）", async () => {
    const reply = tw({ id: "101", conversationId: "100" });
    const getThread = jest.fn(async () => {
      throw new Error("boom");
    });
    const out = await resolveThreadRoots([cand(reply)], { key: "k", fetchImpl: fetch, getThread });
    expect(out).toHaveLength(1);
    expect(out[0].tweet.id).toBe("101"); // 差し替えられず元のまま
    expect(out[0].threadRootOf).toBeUndefined();
  });

  test("取得上限に達したら以降は差し替えない", async () => {
    const rA = tw({ id: "201", conversationId: "200" });
    const rB = tw({ id: "301", conversationId: "300" });
    const getThread = jest.fn(async (cid: string) => [tw({ id: cid, conversationId: cid })]);
    const out = await resolveThreadRoots([cand(rA), cand(rB)], {
      key: "k", fetchImpl: fetch, getThread, maxThreadFetches: 1,
    });
    expect(getThread).toHaveBeenCalledTimes(1);
    // 1件目は差し替え、2件目は上限で元のまま（順序は Set 挿入順）
    const ids = out.map((c) => c.tweet.id).sort();
    expect(ids).toEqual(["200", "301"]);
  });
});
