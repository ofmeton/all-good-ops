/**
 * Writer X tests (5 fixtures)
 *
 * stub body の deterministic 性を確認:
 *   - audience を含む
 *   - 仕組み化結論を含む
 *   - 私は (first_hand 1 行) を含む
 *   - format ごとの max chars 内
 *   - generator='stub'
 */
import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";
delete process.env.ANTHROPIC_API_KEY;

import { draftForX } from "./writer-x.ts";
import type { CoreIdea } from "./types.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

type Fixture = {
  name: string;
  description?: string;
  idea: CoreIdea;
  expected: {
    primaryHook: string;
    generator: string;
    bodyMustContain: string[];
    bodyMaxChars: number;
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

describe("Writer X (5 fixtures, stub mode)", () => {
  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      const out = await draftForX(fx.idea);

      expect(out.draftId).toMatch(new RegExp(`^draft-${fx.idea.id}-\\d+$`));
      expect(out.primaryHook).toBe(fx.expected.primaryHook);
      expect(out.generator).toBe(fx.expected.generator);
      expect(out.llmCostUsd).toBe(0);
      expect(out.body.length).toBeLessThanOrEqual(fx.expected.bodyMaxChars);

      for (const must of fx.expected.bodyMustContain) {
        expect(out.body).toContain(must);
      }
    },
  );

  test("stub returns deterministic body for same idea", async () => {
    const idea: CoreIdea = {
      id: "det-01",
      topic: "テスト",
      primaryHook: "tips_enum",
      fmat: "short",
      contentType: "industry_sop",
      audience: "テスト読者",
      sourceMaterialIds: [],
    };
    const out1 = await draftForX(idea);
    const out2 = await draftForX(idea);
    expect(out1.body).toBe(out2.body);
  });
});
