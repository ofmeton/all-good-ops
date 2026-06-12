import { classifyTier, getApplyDescriptor, validateProposalSafe, TIER_T_PARAM_IDS } from "./validation.ts";
import type { ProposalRow } from "./types.ts";

function row(over: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "p", proposal_type: "config_change", scope: "lever_bandit", hypothesis: "evening を増やす",
    evidence: {}, rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {}, ...over,
  };
}

describe("validateProposalSafe — 🔒 ブロック", () => {
  it.each([
    ["first_hand を下げる", "content_axis を調整"],
    ["industry_sop を減らす", "scope x"],
    ["hashtag を1つ付ける", "scope x"],
    ["AI生成画像を増やす", "visualizer"],
    ["failure_story cap を緩める", "hook"],
    ["FORBIDDEN_PHRASES を編集", "safety"],
    ["SAFETY_GUARDRAILS を変更", "guardrail"],
  ])("'%s' は blocked", (hypothesis, scope) => {
    expect(validateProposalSafe(row({ hypothesis, scope })).ok).toBe(false);
  });

  it("死守 paramId を apply に持つ提案は blocked", () => {
    const p = row({ hypothesis: "比率調整", scope: "lever", meta: { apply: { paramId: "industry_sop_rate", value: 0.1 } } });
    expect(validateProposalSafe(p).ok).toBe(false);
  });

  it("安全な提案は通す", () => {
    expect(validateProposalSafe(row({ hypothesis: "夜帯の投稿比率を上げる", scope: "lever_bandit" })).ok).toBe(true);
  });
});

describe("getApplyDescriptor", () => {
  it("meta.apply が正しい形なら返す", () => {
    expect(getApplyDescriptor(row({ meta: { apply: { paramId: "posting_time_evening", value: 0.28 } } })))
      .toEqual({ paramId: "posting_time_evening", value: 0.28 });
  });
  it("meta.apply が無ければ null", () => {
    expect(getApplyDescriptor(row({ meta: {} }))).toBeNull();
  });
  it("meta が null でも null（throw しない）", () => {
    expect(getApplyDescriptor(row({ meta: null }))).toBeNull();
  });
});

describe("classifyTier", () => {
  it("tier-T allowlist の apply を持てば T", () => {
    expect(classifyTier(row({ meta: { apply: { paramId: "xfmt_thread", value: 0.15 } } }))).toBe("T");
  });
  it("runtime param の apply を持てば P（tier-P）", () => {
    expect(classifyTier(row({ scope: "collector_lever", meta: { apply: { paramId: "collector_shortlist_top_k", value: 90 } } }))).toBe("P");
    expect(classifyTier(row({ scope: "collector_lever", meta: { apply: { paramId: "collector_prerank_enforce", value: 1 } } }))).toBe("P");
  });
  it("scope=collector_lever は apply 不在でも P（engine 側で手動 skip）", () => {
    expect(classifyTier(row({ scope: "collector_lever", hypothesis: "改善したい", meta: {} }))).toBe("P");
  });
  it("prompt/template scope は prompt", () => {
    expect(classifyTier(row({ scope: "writer_prompt", hypothesis: "プロンプト改善" }))).toBe("prompt");
  });
  it("config/threshold/query scope は config", () => {
    expect(classifyTier(row({ scope: "collector_query", hypothesis: "watchlist 追加" }))).toBe("config");
  });
  it("構造なし measurement_request は noop", () => {
    expect(classifyTier(row({ proposal_type: "measurement_request", scope: "metrics", hypothesis: "観測したい" }))).toBe("noop");
  });
  it("🔒 は何より優先で blocked", () => {
    expect(classifyTier(row({ scope: "writer_prompt", hypothesis: "first_hand を下げるプロンプト" }))).toBe("blocked");
  });
  it("TIER_T_PARAM_IDS は failure_story を含まない", () => {
    expect((TIER_T_PARAM_IDS as readonly string[]).some((x) => x.includes("failure"))).toBe(false);
    expect(TIER_T_PARAM_IDS).toContain("posting_time_evening");
  });
});
