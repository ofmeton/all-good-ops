import { describe, test, expect } from "vitest";
import {
  ACTION_TO_STATUS,
  validateBody,
  canApprove,
  BODY_MAX_LEN,
  buildMediaDeepLink,
  defaultPhotoAttachments,
  validateAttachments,
  ATTACHMENTS_MAX,
  type ApprovalSource,
} from "./drafts-logic";

describe("drafts-logic", () => {
  test("ACTION_TO_STATUS map", () => {
    expect(ACTION_TO_STATUS.approve).toBe("approved");
    expect(ACTION_TO_STATUS.reject).toBe("rejected");
  });

  describe("validateBody", () => {
    test("trims and accepts normal body", () => {
      const r = validateBody("  こんにちは  ");
      expect(r).toEqual({ ok: true, value: "こんにちは" });
    });

    test("rejects empty / whitespace-only", () => {
      expect(validateBody("").ok).toBe(false);
      expect(validateBody("   \n  ").ok).toBe(false);
    });

    test("rejects non-string", () => {
      expect(validateBody(undefined).ok).toBe(false);
      expect(validateBody(123).ok).toBe(false);
    });

    test("accepts exactly BODY_MAX_LEN, rejects over", () => {
      expect(validateBody("a".repeat(BODY_MAX_LEN)).ok).toBe(true);
      expect(validateBody("a".repeat(BODY_MAX_LEN + 1)).ok).toBe(false);
    });
  });

  describe("canApprove", () => {
    test("pending + unpublished + unscheduled → true", () => {
      expect(
        canApprove({ human_approval_status: "pending", published_at: null, scheduled_for: null }),
      ).toBe(true);
    });

    test("already approved → false", () => {
      expect(
        canApprove({ human_approval_status: "approved", published_at: null, scheduled_for: null }),
      ).toBe(false);
    });

    test("published → false", () => {
      expect(
        canApprove({
          human_approval_status: "pending",
          published_at: "2026-06-08T00:00:00Z",
          scheduled_for: null,
        }),
      ).toBe(false);
    });

    test("scheduled → false", () => {
      expect(
        canApprove({
          human_approval_status: "pending",
          published_at: null,
          scheduled_for: "2026-06-09T00:00:00Z",
        }),
      ).toBe(false);
    });
  });

  describe("buildMediaDeepLink", () => {
    const url = "https://x.com/foo/status/123";

    test("video → /video/1", () => {
      expect(buildMediaDeepLink(url, "video")).toBe(`${url}/video/1`);
    });

    test("animated_gif → /video/1", () => {
      expect(buildMediaDeepLink(url, "animated_gif", 3)).toBe(`${url}/video/1`);
    });

    test("photo → /photo/{index} (1-based)", () => {
      expect(buildMediaDeepLink(url, "photo", 1)).toBe(`${url}/photo/1`);
      expect(buildMediaDeepLink(url, "photo", 2)).toBe(`${url}/photo/2`);
    });

    test("photo default index = 1", () => {
      expect(buildMediaDeepLink(url, "photo")).toBe(`${url}/photo/1`);
    });

    test("photo invalid index falls back to 1", () => {
      expect(buildMediaDeepLink(url, "photo", 0)).toBe(`${url}/photo/1`);
      expect(buildMediaDeepLink(url, "photo", NaN)).toBe(`${url}/photo/1`);
    });

    test("trailing slash is normalized", () => {
      expect(buildMediaDeepLink(`${url}/`, "video")).toBe(`${url}/video/1`);
      expect(buildMediaDeepLink(`${url}///`, "photo", 2)).toBe(`${url}/photo/2`);
    });
  });

  describe("defaultPhotoAttachments", () => {
    const src = (id: string, media: ApprovalSource["media"]): ApprovalSource => ({
      id,
      raw_text: null,
      translation: null,
      tweet_url: null,
      lang: null,
      source_ref: null,
      media,
      engagement: null,
    });

    test("photos become upload intents, videos/gifs ignored", () => {
      const out = defaultPhotoAttachments([
        src("m1", [
          { type: "photo", url: "https://pbs.twimg.com/a.jpg" },
          { type: "video", url: "https://pbs.twimg.com/poster.jpg" },
          { type: "animated_gif", url: "https://pbs.twimg.com/g.jpg" },
        ]),
        src("m2", [{ type: "photo", url: "https://pbs.twimg.com/b.jpg" }]),
      ]);
      expect(out).toEqual([
        {
          kind: "upload",
          mediaType: "photo",
          sourceUrl: "https://pbs.twimg.com/a.jpg",
          sourceMaterialId: "m1",
        },
        {
          kind: "upload",
          mediaType: "photo",
          sourceUrl: "https://pbs.twimg.com/b.jpg",
          sourceMaterialId: "m2",
        },
      ]);
    });

    test("missing url / null media are skipped", () => {
      expect(defaultPhotoAttachments([src("m1", null)])).toEqual([]);
      expect(
        defaultPhotoAttachments([src("m1", [{ type: "photo", url: "" }])]),
      ).toEqual([]);
    });

    test("empty / nullish input → []", () => {
      expect(defaultPhotoAttachments([])).toEqual([]);
      expect(defaultPhotoAttachments(undefined as unknown as ApprovalSource[])).toEqual([]);
    });
  });

  describe("validateAttachments", () => {
    const good = {
      kind: "upload",
      mediaType: "photo",
      sourceUrl: "https://pbs.twimg.com/a.jpg",
      sourceMaterialId: "m1",
    };

    test("null/undefined → ok with []", () => {
      expect(validateAttachments(null)).toEqual({ ok: true, value: [] });
      expect(validateAttachments(undefined)).toEqual({ ok: true, value: [] });
    });

    test("valid array passes and strips runtime-result fields", () => {
      const r = validateAttachments([
        { ...good, localPath: "/tmp/x.jpg", resolvedKind: "upload", extra: 1 },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value).toEqual([good]); // intent のみ、localPath/extra は除去
      }
    });

    test("non-array → error", () => {
      expect(validateAttachments({}).ok).toBe(false);
      expect(validateAttachments("x").ok).toBe(false);
    });

    test("rejects wrong kind / mediaType", () => {
      expect(validateAttachments([{ ...good, kind: "deeplink" }]).ok).toBe(false);
      expect(validateAttachments([{ ...good, mediaType: "video" }]).ok).toBe(false);
    });

    test("rejects empty sourceUrl / sourceMaterialId", () => {
      expect(validateAttachments([{ ...good, sourceUrl: "" }]).ok).toBe(false);
      expect(validateAttachments([{ ...good, sourceMaterialId: "" }]).ok).toBe(false);
    });

    test("rejects over ATTACHMENTS_MAX", () => {
      const many = Array.from({ length: ATTACHMENTS_MAX + 1 }, () => ({ ...good }));
      expect(validateAttachments(many).ok).toBe(false);
    });
  });
});
