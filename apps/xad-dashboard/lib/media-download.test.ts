import { describe, it, expect } from "vitest";
import { prepareMediaDownload, mediaDownloadHref, ALLOWED_MEDIA_HOSTS } from "./media-download";

describe("prepareMediaDownload — allowlist 境界", () => {
  it("pbs.twimg.com の画像を許可し原寸 name=orig に正規化", () => {
    const r = prepareMediaDownload("https://pbs.twimg.com/media/GabcDEF123.jpg");
    expect(r).not.toBeNull();
    expect(r!.filename).toBe("GabcDEF123.jpg");
    const u = new URL(r!.fetchUrl);
    expect(u.searchParams.get("name")).toBe("orig");
    expect(u.searchParams.get("format")).toBe("jpg");
  });

  it("既に format/name 付きの url でも name=orig に上書き", () => {
    const r = prepareMediaDownload("https://pbs.twimg.com/media/Gxyz?format=png&name=small");
    expect(r).not.toBeNull();
    expect(r!.filename).toBe("Gxyz.png");
    expect(new URL(r!.fetchUrl).searchParams.get("name")).toBe("orig");
  });

  it("video.twimg.com を許可（mp4 forward-compat）", () => {
    const r = prepareMediaDownload("https://video.twimg.com/ext_tw_video/123/pu/vid/720x1280/abc.mp4?tag=12");
    expect(r).not.toBeNull();
    expect(r!.filename).toBe("abc.mp4");
    // 画像正規化は pbs のみ。video はそのまま fetch。
    expect(r!.fetchUrl).toContain("video.twimg.com");
  });

  it("非許可ホストは拒否（典型 SSRF 標的）", () => {
    expect(prepareMediaDownload("http://169.254.169.254/latest/meta-data/")).toBeNull();
    expect(prepareMediaDownload("https://example.com/x.jpg")).toBeNull();
    expect(prepareMediaDownload("http://localhost:8080/admin")).toBeNull();
  });

  it("サブドメイン詐称を弾く（完全一致のみ）", () => {
    expect(prepareMediaDownload("https://pbs.twimg.com.attacker.com/x.jpg")).toBeNull();
    expect(prepareMediaDownload("https://evil-pbs.twimg.com/x.jpg")).toBeNull();
  });

  it("http(s) 以外のスキームを拒否", () => {
    expect(prepareMediaDownload("file:///etc/passwd")).toBeNull();
    expect(prepareMediaDownload("data:text/html,xxx")).toBeNull();
    expect(prepareMediaDownload("ftp://pbs.twimg.com/x.jpg")).toBeNull();
  });

  it("空/不正入力は null", () => {
    expect(prepareMediaDownload(null)).toBeNull();
    expect(prepareMediaDownload(undefined)).toBeNull();
    expect(prepareMediaDownload("")).toBeNull();
    expect(prepareMediaDownload("not a url")).toBeNull();
  });

  it("ファイル名は危険文字を除去（path traversal/quote 混入を無効化）", () => {
    // hostname は allowlist 済みなので path 側に細工があっても sanitize される。
    const r = prepareMediaDownload('https://pbs.twimg.com/media/..%2F..%2Fetc%2Fpasswd');
    expect(r).not.toBeNull();
    expect(r!.filename).not.toContain("/");
    expect(r!.filename).not.toContain("..");
    expect(r!.filename).not.toContain('"');
  });
});

describe("mediaDownloadHref", () => {
  it("url を encode して same-origin エンドポイントに渡す", () => {
    const href = mediaDownloadHref("https://pbs.twimg.com/media/A.jpg?x=1&y=2");
    expect(href.startsWith("/api/media/download?url=")).toBe(true);
    // & が生 url のまま漏れない（encode 済み）
    expect(href).not.toContain("&y=2");
    expect(decodeURIComponent(href.split("url=")[1])).toBe("https://pbs.twimg.com/media/A.jpg?x=1&y=2");
  });
});

describe("ALLOWED_MEDIA_HOSTS", () => {
  it("twitter CDN の2ホストのみ", () => {
    expect([...ALLOWED_MEDIA_HOSTS].sort()).toEqual(["pbs.twimg.com", "video.twimg.com"]);
  });
});
