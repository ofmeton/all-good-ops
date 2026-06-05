/**
 * carousel-composer tests.
 *
 * 検証:
 *   - 5 テンプレすべて 9 slide 構成
 *   - 各 slide に title / body / image_prompt
 *   - body / image_prompt に topic と audience が含まれる
 *   - unknown templateId は throw
 */

import {
  CAROUSEL_TEMPLATE_IDS,
  composeCarousel,
} from "./carousel-composer.ts";
import type { CarouselTemplateId } from "./types.ts";
import type { CoreIdea } from "../writer/types.ts";

const SAMPLE_IDEA: CoreIdea = {
  id: "idea-ig-sample",
  topic: "Claude Code 自動化の入門",
  primaryHook: "tips_enum",
  fmat: "long",
  contentType: "industry_sop",
  audience: "中小事業者の方",
  sourceMaterialIds: ["mat-tip-001"],
};

describe("composeCarousel (5 templates × 9 slides)", () => {
  test.each(CAROUSEL_TEMPLATE_IDS.map((t) => [t] as const))(
    "%s produces 9 slides with full body/prompt",
    (templateId) => {
      const comp = composeCarousel(SAMPLE_IDEA, templateId);
      expect(comp.templateId).toBe(templateId);
      expect(comp.slides).toHaveLength(9);
      for (const [i, s] of comp.slides.entries()) {
        expect(s.index).toBe(i + 1);
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.body).toContain(SAMPLE_IDEA.topic);
        expect(s.image_prompt).toContain(SAMPLE_IDEA.topic);
        expect(s.image_prompt).toContain(SAMPLE_IDEA.audience);
        // visual-design-system.md SSOT 必須要素
        expect(s.image_prompt).toContain("Noto Sans Heavy");
      }
    },
  );

  test("unknown templateId throws", () => {
    expect(() =>
      composeCarousel(SAMPLE_IDEA, "T999_unknown" as CarouselTemplateId),
    ).toThrow();
  });

  test("CAROUSEL_TEMPLATE_IDS contains 5 entries", () => {
    expect(CAROUSEL_TEMPLATE_IDS).toHaveLength(5);
    expect(CAROUSEL_TEMPLATE_IDS).toContain("T1_hook_evidence");
    expect(CAROUSEL_TEMPLATE_IDS).toContain("T5_hot_take_data");
  });
});
