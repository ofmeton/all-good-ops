import { normalizeForMatch, matchTweetToDraft, type DraftRow } from "./match.ts";

describe("normalizeForMatch", () => {
  test("trims, collapses whitespace, strips trailing t.co URL", () => {
    expect(normalizeForMatch("  AI で  経理を自動化\n\n詳細→ https://t.co/abc123 ")).toBe(
      "ai で 経理を自動化 詳細→",
    );
  });
  test("returns empty for null-ish", () => {
    expect(normalizeForMatch("")).toBe("");
  });
});

describe("matchTweetToDraft", () => {
  const drafts: DraftRow[] = [
    { id: "d1", body: "AIで経理を自動化する話", publishedAt: "2026-06-05T11:00:00Z" },
    { id: "d2", body: "全く別の投稿", publishedAt: "2026-06-01T00:00:00Z" },
  ];
  test("normalized equality within time window → match", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)?.id).toBe("d1");
  });
  test("tweet text is prefix of draft body (URL appended) → match", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話 https://t.co/x", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)?.id).toBe("d1");
  });
  test("outside time window → null", () => {
    const t = { id: "t1", text: "AIで経理を自動化する話", createdAt: "2026-06-08T11:00:00Z" };
    expect(matchTweetToDraft(t, drafts)).toBeNull();
  });
  test("ambiguous (2 drafts same normalized body) → null", () => {
    const dup: DraftRow[] = [
      { id: "a", body: "同じ本文", publishedAt: "2026-06-05T11:00:00Z" },
      { id: "b", body: "同じ本文", publishedAt: "2026-06-05T11:30:00Z" },
    ];
    const t = { id: "t1", text: "同じ本文", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, dup)).toBeNull();
  });
  test("no match → null", () => {
    const t = { id: "t1", text: "存在しない本文", createdAt: "2026-06-05T11:02:00Z" };
    expect(matchTweetToDraft(t, drafts)).toBeNull();
  });
});
