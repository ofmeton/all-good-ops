/**
 * E2E dry-run pipeline test
 *
 * CoreIdea → Writer → Editor → Publisher が dry-run で連動するか確認。
 * Editor 内部で db / embedding / classify を mock 化する必要があるため
 * pipeline.test.ts と同じ mock パターンを採用。
 */
jest.mock("../editor/db.ts");
jest.mock("../editor/embedding.ts");
jest.mock("../hook-classifier/classify.ts");

process.env.IN_MEMORY_FALLBACK = "true";

import { runE2eDryRun } from "./e2e-dryrun.ts";
import type { CoreIdea } from "../writer/types.ts";

const dbMock = jest.requireMock("../editor/db.ts") as typeof import(
  "../editor/__mocks__/db.ts"
);
const embeddingMock = jest.requireMock("../editor/embedding.ts") as typeof import(
  "../editor/__mocks__/embedding.ts"
);
const hookMock = jest.requireMock("../hook-classifier/classify.ts") as typeof import(
  "../hook-classifier/__mocks__/classify.ts"
);

describe("E2E dry-run pipeline (writer → editor → publisher)", () => {
  beforeEach(() => {
    dbMock.__resetMockState();
    embeddingMock.__resetMockEmbedding();
    hookMock.__resetMockHook();
    // stub body は "tips_enum" 系の語彙を含むため hook を tips_enum に固定
    hookMock.__setMockHook({
      primary_hook: "tips_enum",
      devices: ["enum"],
      confidence: 0.7,
    });
  });

  test("baseline idea passes all 3 stages within 1 second", async () => {
    const idea: CoreIdea = {
      id: "smoke-01",
      topic: "請求書発行ワークフローの仕組み化",
      primaryHook: "first_hand",
      fmat: "short",
      contentType: "first_hand",
      audience: "経理担当者の方",
      sourceMaterialIds: ["mat-fh-001"],
    };

    const result = await runE2eDryRun(idea);

    expect(result.ideaId).toBe("smoke-01");
    expect(result.writer.draftId).toMatch(/^draft-smoke-01-\d+$/);
    expect(result.writer.body).toContain("経理担当者の方");
    expect(result.editor.decision).toBe("approved");
    expect(result.publisher.status).toBe("dry_run");
    expect(result.ok).toBe(true);
    expect(result.totalDurationMs).toBeLessThan(1000);
  });
});
