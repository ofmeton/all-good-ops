/**
 * Writer note tests (4 fixtures, stub mode).
 *
 * 検証:
 *   - templateId / priceTier の往復
 *   - generator='stub'
 *   - 無料の場合 paidBody は undefined、有料は両方存在
 *   - freeBody に audience / 期待値が含まれる
 *   - paidBody に結論 / 再現手順 / ハマりどころ / CTA のいずれか
 *   - llmCostUsd === 0
 */

import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";
delete process.env.ANTHROPIC_API_KEY;

import { draftForNote } from "./writer-note.ts";
import type { NoteDraftRequest } from "./writer-note.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__", "note");

type Fixture = {
  name: string;
  description?: string;
  request: NoteDraftRequest;
  expected: {
    templateId: string;
    priceTier: number;
    generator: string;
    hasPaidBody: boolean;
    freeBodyMustContain?: string[];
    paidBodyMustContain?: string[];
    freeBodyMaxChars?: number;
  };
};

function loadFixtures(): Fixture[] {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) =>
      JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, f), "utf-8"),
      ) as Fixture,
    );
}

describe("Writer note (4 fixtures, stub mode)", () => {
  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      const out = await draftForNote(fx.request);

      expect(out.templateId).toBe(fx.expected.templateId);
      expect(out.priceTier).toBe(fx.expected.priceTier);
      expect(out.generator).toBe(fx.expected.generator);
      expect(out.llmCostUsd).toBe(0);

      if (fx.expected.hasPaidBody) {
        expect(out.paidBody).toBeDefined();
        expect(out.paidBody?.length ?? 0).toBeGreaterThan(0);
        if (fx.expected.paidBodyMustContain) {
          for (const must of fx.expected.paidBodyMustContain) {
            expect(out.paidBody).toContain(must);
          }
        }
      } else {
        expect(out.paidBody).toBeUndefined();
      }

      if (fx.expected.freeBodyMustContain) {
        for (const must of fx.expected.freeBodyMustContain) {
          expect(out.freeBody).toContain(must);
        }
      }

      if (fx.expected.freeBodyMaxChars) {
        expect(out.freeBody.length).toBeLessThanOrEqual(
          fx.expected.freeBodyMaxChars,
        );
      }
    },
  );

  test("stub returns deterministic body for same idea + templateId + priceTier", async () => {
    const req: NoteDraftRequest = {
      idea: {
        id: "det-note-01",
        topic: "テスト",
        primaryHook: "tips_enum",
        fmat: "article",
        contentType: "industry_sop",
        audience: "テスト読者",
        sourceMaterialIds: [],
      },
      templateId: "how_to_summary",
      priceTier: 980,
      teaserBoundary: 1000,
    };
    const out1 = await draftForNote(req);
    const out2 = await draftForNote(req);
    expect(out1.freeBody).toBe(out2.freeBody);
    expect(out1.paidBody).toBe(out2.paidBody);
  });
});
