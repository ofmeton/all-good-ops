import { describe, it, expect, vi, beforeEach } from "vitest";

// supabase fluent chain をモックし、適用されたフィルタ（eq/is）を捕捉する。
const h = vi.hoisted(() => ({
  state: { eq: [] as [string, unknown][], is: [] as [string, unknown][] },
}));

vi.mock("./supabase", () => {
  const makeChain = () => {
    const chain: Record<string, (...a: unknown[]) => unknown> = {};
    chain.from = () => chain;
    chain.select = () => chain;
    chain.eq = (c, v) => {
      h.state.eq.push([c as string, v]);
      return chain;
    };
    chain.is = (c, v) => {
      h.state.is.push([c as string, v]);
      return chain;
    };
    chain.order = () => chain;
    chain.limit = () => Promise.resolve({ data: [], error: null });
    return chain;
  };
  return { serverSupabase: () => makeChain() };
});

import { listApprovedStock as publishStock } from "./publish-queries";
import { listApprovedStock as scheduleStock } from "./schedule-queries";

describe("listApprovedStock パリティ（今すぐ投稿 / スケジュールは同じストックを出す）", () => {
  beforeEach(() => {
    h.state.eq = [];
    h.state.is = [];
  });

  it.each([
    ["publish（今すぐ投稿）", publishStock],
    ["schedule（スケジュール）", scheduleStock],
  ])("%s は approved AND scheduled_for IS NULL AND published_at IS NULL で絞る", async (_label, fn) => {
    await fn(100);
    expect(h.state.eq).toContainEqual(["human_approval_status", "approved"]);
    expect(h.state.is).toContainEqual(["scheduled_for", null]);
    // ← 回帰防止: published_at IS NULL を欠くと公開済みがスケジュールに残り二重投稿の温床になる
    expect(h.state.is).toContainEqual(["published_at", null]);
  });
});
