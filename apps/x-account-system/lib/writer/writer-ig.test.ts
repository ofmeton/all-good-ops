/**
 * Writer IG tests (4 fixtures, stub mode).
 *
 * 検証:
 *   - kind (carousel/reel) の出力一致
 *   - carousel: 9 slide + templateId
 *   - reel: reelScript 文字列に Hook / CTA を含む
 *   - caption が CAPTION_RANGE.max (200) 以下
 *   - llmCostUsd === 0
 */

import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";
delete process.env.ANTHROPIC_API_KEY;

import { draftForIg } from "./writer-ig.ts";
import type { IgDraftRequest } from "./writer-ig.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__", "ig");

type Fixture = {
  name: string;
  description?: string;
  request: IgDraftRequest;
  expected: {
    kind: "carousel" | "reel";
    generator: string;
    slideCount?: number;
    carouselTemplateId?: string;
    reelScriptIncludes?: string[];
    captionMustContain?: string[];
    captionMaxChars?: number;
    hashtagsLength?: number;
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

describe("Writer IG (4 fixtures, stub mode)", () => {
  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      const out = await draftForIg(fx.request);

      expect(out.kind).toBe(fx.expected.kind);
      expect(out.generator).toBe(fx.expected.generator);
      expect(out.llmCostUsd).toBe(0);

      if (fx.expected.kind === "carousel") {
        expect(out.carousel).toBeDefined();
        expect(out.carousel?.slides.length).toBe(
          fx.expected.slideCount ?? 9,
        );
        if (fx.expected.carouselTemplateId) {
          expect(out.carousel?.templateId).toBe(
            fx.expected.carouselTemplateId,
          );
        }
        expect(out.reelScript).toBeUndefined();
      } else {
        expect(out.reelScript).toBeDefined();
        expect(out.carousel).toBeUndefined();
        if (fx.expected.reelScriptIncludes) {
          for (const s of fx.expected.reelScriptIncludes) {
            expect(out.reelScript).toContain(s);
          }
        }
      }

      if (fx.expected.captionMustContain) {
        for (const must of fx.expected.captionMustContain) {
          expect(out.caption).toContain(must);
        }
      }
      if (fx.expected.captionMaxChars !== undefined) {
        expect(out.caption.length).toBeLessThanOrEqual(
          fx.expected.captionMaxChars,
        );
      }
      if (fx.expected.hashtagsLength !== undefined) {
        expect(out.hashtags.length).toBe(fx.expected.hashtagsLength);
      }
    },
  );
});
