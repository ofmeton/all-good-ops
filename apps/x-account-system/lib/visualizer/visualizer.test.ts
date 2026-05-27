/**
 * Visualizer integration tests (5 fixtures, stub mode).
 *
 * 検証項目:
 *   - mode 別の出力 kind 一致 (image / video / text_only)
 *   - generator stub
 *   - cost 0
 *   - carousel の場合は slide 9 枚
 *   - 画像 URL に platform size が含まれる
 */

import fs from "node:fs";
import path from "node:path";

process.env.IN_MEMORY_FALLBACK = "true";
delete process.env.OPENAI_API_KEY;

import { visualize } from "./index.ts";
import type { VisualizerRequest } from "./types.ts";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

type Fixture = {
  name: string;
  description?: string;
  request: VisualizerRequest;
  expected: {
    kind: "image" | "video" | "text_only";
    imagesCount?: number;
    generator?: string;
    costUsd?: number;
    urlIncludes?: string;
    promptIncludes?: string;
    carouselTemplateId?: string;
    slideCount?: number;
    storyboardIncludes?: string[];
    rationaleIncludes?: string;
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

describe("Visualizer (5 fixtures, stub mode)", () => {
  const fixtures = loadFixtures();

  test.each(fixtures.map((fx) => [fx.name, fx] as const))(
    "%s",
    async (_name, fx) => {
      const out = await visualize(fx.request);

      expect(out.kind).toBe(fx.expected.kind);
      expect(out.costUsd).toBe(fx.expected.costUsd ?? 0);
      expect(out.draftId).toBe(fx.request.draftId);

      if (out.kind === "image") {
        expect(out.images.length).toBe(fx.expected.imagesCount);
        if (fx.expected.generator) {
          expect(out.generator).toBe(fx.expected.generator);
        }
        if (fx.expected.urlIncludes) {
          for (const img of out.images) {
            expect(img.url).toContain(fx.expected.urlIncludes);
          }
        }
        if (fx.expected.promptIncludes) {
          for (const img of out.images) {
            expect(img.promptUsed).toContain(fx.expected.promptIncludes);
          }
        }
        if (fx.expected.carouselTemplateId) {
          expect(out.carousel?.templateId).toBe(
            fx.expected.carouselTemplateId,
          );
          expect(out.carousel?.slides.length).toBe(
            fx.expected.slideCount ?? 9,
          );
        }
      } else if (out.kind === "video") {
        expect(out.generator).toBe(fx.expected.generator);
        if (fx.expected.storyboardIncludes) {
          for (const s of fx.expected.storyboardIncludes) {
            expect(out.storyboard).toContain(s);
          }
        }
      } else if (out.kind === "text_only") {
        if (fx.expected.rationaleIncludes) {
          expect(out.rationale).toContain(fx.expected.rationaleIncludes);
        }
      }
    },
  );
});
