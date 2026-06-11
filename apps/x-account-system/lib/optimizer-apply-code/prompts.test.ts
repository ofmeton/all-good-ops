import { buildImplementerPrompt, buildFixerPrompt, buildReviewerPrompt } from "./prompts.ts";
import type { ProposalRow } from "./types.ts";

const p: ProposalRow = {
  id: "abcd1234-0000-0000-0000-000000000000",
  proposal_type: "config_change", scope: "collector_query",
  hypothesis: "watchlist に foo を追加する", evidence: { funnel: 0.1 },
  rank: "A", accepted: true, implemented: false, reviewer_reason: null, meta: {},
};

describe("buildImplementerPrompt", () => {
  const s = buildImplementerPrompt(p);
  it("提案内容と allowlist と禁止事項を含む", () => {
    expect(s).toContain("watchlist に foo を追加する");
    expect(s).toContain("collector_query");
    expect(s).toContain("lib/ingest/collector-config.ts");
    expect(s).toContain("guards.ts");
    expect(s).toContain("git commit");
    expect(s).toContain("push");
  });
});

describe("buildFixerPrompt", () => {
  it("却下理由を含む", () => {
    const s = buildFixerPrompt(p, ["テストが落ちている", "余計な変更がある"]);
    expect(s).toContain("テストが落ちている");
    expect(s).toContain("余計な変更がある");
  });
});

describe("buildReviewerPrompt", () => {
  it("diff と提案と JSON 出力指示を含む", () => {
    const s = buildReviewerPrompt(p, "+ added line");
    expect(s).toContain("+ added line");
    expect(s).toContain("watchlist に foo を追加する");
    expect(s).toContain('"verdict"');
    expect(s).toContain("REJECT");
    expect(s).toContain("TARGET_DEFINITION");
  });
});
