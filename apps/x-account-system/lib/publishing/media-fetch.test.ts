import {
  fetchDraftMedia,
  sweepStaleMedia,
  cleanupDraftMedia,
  toOrigUrl,
  inferExt,
  MAX_DOWNLOAD_BYTES,
  STALE_MEDIA_MS,
  type PhotoAttachment,
  type MediaFetchDeps,
} from "./media-fetch.ts";

const photo = (url: string, id = "m1"): PhotoAttachment => ({
  kind: "upload",
  mediaType: "photo",
  sourceUrl: url,
  sourceMaterialId: id,
});

type Resp = { ok: boolean; status?: number; body?: Uint8Array; contentLength?: number };

function makeDeps(responder: (url: string) => Resp): {
  deps: Partial<MediaFetchDeps>;
  writes: Record<string, Uint8Array>;
  logs: string[];
  unlinked: string[];
} {
  const writes: Record<string, Uint8Array> = {};
  const logs: string[] = [];
  const unlinked: string[] = [];
  const deps: Partial<MediaFetchDeps> = {
    tmpDir: () => "/tmp",
    mkdir: async () => undefined,
    writeFile: async (path, data) => {
      writes[path] = data;
    },
    // sweep を hermetic に（実 /tmp を触らない）
    readdir: async () => [],
    statMtimeMs: async () => 0,
    unlink: async (p) => {
      unlinked.push(p);
    },
    now: () => 0,
    log: (line) => logs.push(line),
    fetch: (async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const r = responder(url);
      const headers = {
        get: (k: string) =>
          k.toLowerCase() === "content-length" && r.contentLength != null
            ? String(r.contentLength)
            : null,
      };
      return {
        ok: r.ok,
        status: r.status ?? (r.ok ? 200 : 500),
        headers,
        arrayBuffer: async () => (r.body ?? new Uint8Array([1, 2, 3])).buffer,
      } as unknown as Response;
    }) as unknown as MediaFetchDeps["fetch"],
  };
  return { deps, writes, logs, unlinked };
}

describe("toOrigUrl", () => {
  test("appends name=orig to bare media url", () => {
    expect(toOrigUrl("https://pbs.twimg.com/media/ABC.jpg")).toBe(
      "https://pbs.twimg.com/media/ABC.jpg?name=orig",
    );
  });
  test("overwrites existing name param, keeps format", () => {
    expect(toOrigUrl("https://pbs.twimg.com/media/ABC?format=jpg&name=small")).toBe(
      "https://pbs.twimg.com/media/ABC?format=jpg&name=orig",
    );
  });
  test("unparseable returns input", () => {
    expect(toOrigUrl("not a url")).toBe("not a url");
  });
});

describe("inferExt", () => {
  test("from format param", () => {
    expect(inferExt("https://pbs.twimg.com/media/ABC?format=png&name=orig")).toBe("png");
  });
  test("from path extension", () => {
    expect(inferExt("https://pbs.twimg.com/media/ABC.jpg")).toBe("jpg");
  });
  test("default jpg", () => {
    expect(inferExt("https://pbs.twimg.com/media/ABC")).toBe("jpg");
  });
});

describe("fetchDraftMedia", () => {
  test("downloads photos → upload, localPath set, file written", async () => {
    const { deps, writes } = makeDeps(() => ({ ok: true, body: new Uint8Array([9, 9]) }));
    const r = await fetchDraftMedia(
      "draft1",
      [photo("https://pbs.twimg.com/media/A.jpg"), photo("https://pbs.twimg.com/media/B?format=png&name=small")],
      deps,
    );
    expect(r.uploaded).toBe(2);
    expect(r.skipped).toBe(0);
    expect(r.localPaths).toEqual([
      "/tmp/xad-media/draft1-0.jpg",
      "/tmp/xad-media/draft1-1.png",
    ]);
    expect(r.resolved.every((a) => a.resolvedKind === "upload")).toBe(true);
    expect(Object.keys(writes)).toHaveLength(2);
    expect(writes["/tmp/xad-media/draft1-0.jpg"]).toEqual(new Uint8Array([9, 9]));
  });

  test("source generated の写真も sourceUrl から通常 DL する", async () => {
    const { deps } = makeDeps(() => ({ ok: true, body: new Uint8Array([7]) }));
    const r = await fetchDraftMedia(
      "draft-generated",
      [{
        kind: "upload",
        mediaType: "photo",
        source: "generated",
        blockIndex: 0,
        role: "導入",
        sourceUrl: "https://storage.example/xad-generated/draft/0.png",
        promptUsed: "prompt",
      }],
      deps,
    );
    expect(r.uploaded).toBe(1);
    expect(r.resolved[0]).toMatchObject({
      source: "generated",
      blockIndex: 0,
      resolvedKind: "upload",
      localPath: "/tmp/xad-media/draft-generated-0.png",
    });
  });

  test("fetches the orig variant url", async () => {
    const seen: string[] = [];
    const { deps } = makeDeps((url) => {
      seen.push(url);
      return { ok: true };
    });
    await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(seen).toEqual(["https://pbs.twimg.com/media/A.jpg?name=orig"]);
  });

  test("HTTP error → skipped with reason + log (no throw)", async () => {
    const { deps, writes, logs } = makeDeps(() => ({ ok: false, status: 404 }));
    const r = await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(r.uploaded).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.localPaths).toEqual([]);
    expect(r.resolved[0].resolvedKind).toBe("skipped");
    expect(r.resolved[0].fallbackReason).toBe("HTTP 404");
    expect(Object.keys(writes)).toHaveLength(0);
    // サイレント失敗禁止: ログが残る
    expect(logs.some((l) => l.includes("download failed"))).toBe(true);
  });

  test("partial failure: one ok, one fails → mixed result", async () => {
    const { deps } = makeDeps((url) =>
      url.includes("/A") ? { ok: true } : { ok: false, status: 500 },
    );
    const r = await fetchDraftMedia(
      "d",
      [photo("https://pbs.twimg.com/media/A.jpg"), photo("https://pbs.twimg.com/media/B.jpg")],
      deps,
    );
    expect(r.uploaded).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.localPaths).toEqual(["/tmp/xad-media/d-0.jpg"]);
  });

  test("empty body → skipped", async () => {
    const { deps } = makeDeps(() => ({ ok: true, body: new Uint8Array([]) }));
    const r = await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(r.skipped).toBe(1);
    expect(r.resolved[0].fallbackReason).toBe("empty body");
  });

  test("non-photo / non-upload attachment → skipped (not DL'd)", async () => {
    const { deps, logs } = makeDeps(() => ({ ok: true }));
    const r = await fetchDraftMedia(
      "d",
      [{ kind: "deeplink", mediaType: "video", sourceUrl: "x" } as PhotoAttachment],
      deps,
    );
    expect(r.uploaded).toBe(0);
    expect(r.skipped).toBe(1);
    expect(logs.some((l) => l.includes("skipped"))).toBe(true);
  });

  test("empty attachments → empty result", async () => {
    const { deps } = makeDeps(() => ({ ok: true }));
    const r = await fetchDraftMedia("d", [], deps);
    expect(r).toEqual({ localPaths: [], resolved: [], uploaded: 0, skipped: 0 });
  });

  test("content-length が上限超 → skipped（読み込まず降格）", async () => {
    const { deps, writes, logs } = makeDeps(() => ({
      ok: true,
      contentLength: MAX_DOWNLOAD_BYTES + 1,
    }));
    const r = await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(r.uploaded).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.resolved[0].fallbackReason).toMatch(/too large/);
    expect(Object.keys(writes)).toHaveLength(0);
    expect(logs.some((l) => l.includes("download failed"))).toBe(true);
  });

  test("実体サイズが上限超（ヘッダ詐称） → skipped", async () => {
    const big = new Uint8Array(MAX_DOWNLOAD_BYTES + 1);
    const { deps } = makeDeps(() => ({ ok: true, body: big, contentLength: 10 }));
    const r = await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(r.skipped).toBe(1);
    expect(r.resolved[0].fallbackReason).toMatch(/too large/);
  });

  test("fetch 開始時に古い一時ファイルを sweep する", async () => {
    const { deps, unlinked } = makeDeps(() => ({ ok: true }));
    // 1つは古い(削除)・1つは新しい(残す)
    deps.readdir = async () => ["old-0.jpg", "fresh-0.jpg"];
    deps.now = () => STALE_MEDIA_MS + 1000;
    deps.statMtimeMs = async (p) => (p.includes("old") ? 0 : STALE_MEDIA_MS + 999);
    await fetchDraftMedia("d", [photo("https://pbs.twimg.com/media/A.jpg")], deps);
    expect(unlinked).toContain("/tmp/xad-media/old-0.jpg");
    expect(unlinked).not.toContain("/tmp/xad-media/fresh-0.jpg");
  });
});

describe("sweepStaleMedia", () => {
  test("mtime が cutoff より古いものだけ削除し件数を返す", async () => {
    const { deps, unlinked } = makeDeps(() => ({ ok: true }));
    deps.readdir = async () => ["a", "b", "c"];
    deps.now = () => 100_000;
    deps.statMtimeMs = async (p) => (p.endsWith("b") ? 99_999 : 0); // b だけ新しい
    const removed = await sweepStaleMedia(deps, 1000);
    expect(removed).toBe(2);
    expect(unlinked.sort()).toEqual(["/tmp/xad-media/a", "/tmp/xad-media/c"]);
  });

  test("ディレクトリ不在(readdir []) → 0 件・例外なし", async () => {
    const { deps } = makeDeps(() => ({ ok: true }));
    deps.readdir = async () => [];
    expect(await sweepStaleMedia(deps)).toBe(0);
  });

  test("個別 stat/unlink 失敗はログのみで継続（best-effort）", async () => {
    const { deps, logs, unlinked } = makeDeps(() => ({ ok: true }));
    deps.readdir = async () => ["a", "b"];
    deps.now = () => 100_000;
    deps.statMtimeMs = async (p) => {
      if (p.endsWith("a")) throw new Error("stat fail");
      return 0;
    };
    const removed = await sweepStaleMedia(deps, 1000);
    expect(removed).toBe(1);
    expect(unlinked).toEqual(["/tmp/xad-media/b"]);
    expect(logs.some((l) => l.includes("sweep 失敗"))).toBe(true);
  });
});

describe("cleanupDraftMedia", () => {
  test("渡した localPaths を unlink する", async () => {
    const { deps, unlinked } = makeDeps(() => ({ ok: true }));
    await cleanupDraftMedia(["/tmp/xad-media/d-0.jpg", "/tmp/xad-media/d-1.png"], deps);
    expect(unlinked).toEqual(["/tmp/xad-media/d-0.jpg", "/tmp/xad-media/d-1.png"]);
  });

  test("unlink 失敗はログのみで throw しない（次回 sweep が拾う）", async () => {
    const { deps, logs } = makeDeps(() => ({ ok: true }));
    deps.unlink = async () => {
      throw new Error("ENOENT");
    };
    await expect(cleanupDraftMedia(["/tmp/x.jpg"], deps)).resolves.toBeUndefined();
    expect(logs.some((l) => l.includes("cleanup 失敗"))).toBe(true);
  });
});
