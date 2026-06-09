import { describe, test, expect } from "vitest";
import { buildHandoffPayload, type PublishStock } from "./publish-queries";

const base: PublishStock = {
  id: "d1",
  body: "本文テキスト",
  fmat: "single",
  human_approved_at: "2026-06-09T00:00:00Z",
  risk_level: "low",
  risk_reasons: null,
  attachments: null,
};

describe("buildHandoffPayload", () => {
  test("プレーン本文: 写真0・動画なし・字数カウント", () => {
    const p = buildHandoffPayload(base);
    expect(p.draftId).toBe("d1");
    expect(p.body).toBe("本文テキスト");
    expect(p.charCount).toBe(6);
    expect(p.photos).toEqual([]);
    expect(p.hasVideoDeepLink).toBe(false);
    expect(p.videoDeepLinkHint).toBeNull();
    expect(p.fmat).toBe("single");
    expect(p.riskLevel).toBe("low");
    expect(p.riskReasons).toEqual([]);
  });

  test("写真 upload intent のみ抽出（非 photo / 欠落 url は除外）", () => {
    const p = buildHandoffPayload({
      ...base,
      attachments: [
        { kind: "upload", mediaType: "photo", sourceUrl: "https://pbs.twimg.com/a.jpg", sourceMaterialId: "m1" },
        // 欠落 url は除外
        { kind: "upload", mediaType: "photo", sourceUrl: "", sourceMaterialId: "m2" },
      ],
    });
    expect(p.photos).toEqual([{ sourceUrl: "https://pbs.twimg.com/a.jpg", sourceMaterialId: "m1" }]);
  });

  test("本文の動画 deep-link を検知し video hint を構築", () => {
    const body = "見て→ https://x.com/foo/status/123/video/1 すごい";
    const p = buildHandoffPayload({ ...base, body });
    expect(p.hasVideoDeepLink).toBe(true);
    expect(p.videoDeepLinkHint).toBe("https://x.com/foo/status/123/video/1");
  });

  test("body 非文字列は空文字に正規化（境界の安全側デフォルト）", () => {
    const p = buildHandoffPayload({ ...base, body: undefined as unknown as string });
    expect(p.body).toBe("");
    expect(p.charCount).toBe(0);
    expect(p.hasVideoDeepLink).toBe(false);
  });

  test("絵文字を含む字数は code point で数える", () => {
    const p = buildHandoffPayload({ ...base, body: "🎉あ" });
    expect(p.charCount).toBe(2);
  });
});
