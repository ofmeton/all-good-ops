/**
 * Pipeline X6 (source grounding) SOFT-warning integration test.
 *
 * factuality-judge を mock して fail を返させ、X6 が:
 *   - rejectReasons に入らない (hard でない)
 *   - warnings に X6_source_grounding として現れる (SOFT)
 * ことを検証する。
 */
jest.mock("./db.ts");
jest.mock("./embedding.ts");
jest.mock("../hook-classifier/classify.ts");

// factuality judge を fail に固定 (LLM を呼ばずに fail を注入)
jest.mock("./factuality-judge.ts", () => ({
  runFactualityJudge: jest.fn().mockResolvedValue({
    status: "fail",
    reason: "出典に見当たらない主張: 72時間で承認 / 月2万円→0円",
    unsupportedClaims: ["72時間で承認", "月2万円→0円"],
    costUsd: 0.0001,
  }),
}));

process.env.IN_MEMORY_FALLBACK = "true";

import { runEditor } from "./pipeline.ts";
import type { EditorInput } from "./types.ts";

const dbMock = jest.requireMock("./db.ts") as typeof import("./__mocks__/db.ts");
const embeddingMock = jest.requireMock("./embedding.ts") as typeof import(
  "./__mocks__/embedding.ts"
);
const hookMock = jest.requireMock("../hook-classifier/classify.ts") as typeof import(
  "../hook-classifier/__mocks__/classify.ts"
);

const baseInput: EditorInput = {
  traceId: "t-x6",
  draftId: "d-x6",
  coreIdeaId: "ci-x6",
  platform: "x",
  body: "中小企業の経営者向け。私は業務自動化を試した。仕組み化のコツはSOP化。72時間で承認、月2万円→0円に。",
  fmat: "short",
  sourceMaterialIds: ["mat-1"],
  sourceMaterialTexts: ["AIで申請を補助した事例（数値の記載なし）"],
  hasAffiliateLink: false,
  contentType: "first_hand",
};

describe("pipeline X6 source grounding (SOFT warning)", () => {
  beforeEach(() => {
    dbMock.__resetMockState();
    embeddingMock.__resetMockEmbedding();
    hookMock.__resetMockHook();
  });

  test("X6 fail surfaces as WARNING, not rejectReason; decision stays approved", async () => {
    const out = await runEditor(baseInput);

    // X6 must be present and fail
    const x6 = out.rules.find((r) => r.rule === "X6_source_grounding");
    expect(x6).toBeDefined();
    expect(x6!.status).toBe("fail");

    // SOFT: NOT a reject reason
    expect(out.rejectReasons).not.toContain("X6_source_grounding");

    // SOFT: appears in warnings
    expect(out.warnings.map((w) => w.rule)).toContain("X6_source_grounding");
    const w = out.warnings.find((x) => x.rule === "X6_source_grounding");
    expect(w!.reason).toContain("出典に見当たらない主張");

    // No hard fail from X6 → decision approved (assuming other rules pass)
    expect(out.decision).toBe("approved");

    // cost includes factuality cost
    expect(out.llmCostUsd).toBeGreaterThanOrEqual(0.0001);
  });
});
