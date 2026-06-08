import {
  fetchDraftMedia,
  toOrigUrl,
  inferExt,
  type PhotoAttachment,
  type MediaFetchDeps,
} from "./media-fetch.ts";

const photo = (url: string, id = "m1"): PhotoAttachment => ({
  kind: "upload",
  mediaType: "photo",
  sourceUrl: url,
  sourceMaterialId: id,
});

function makeDeps(
  responder: (url: string) => { ok: boolean; status?: number; body?: Uint8Array },
): { deps: Partial<MediaFetchDeps>; writes: Record<string, Uint8Array>; logs: string[] } {
  const writes: Record<string, Uint8Array> = {};
  const logs: string[] = [];
  const deps: Partial<MediaFetchDeps> = {
    tmpDir: () => "/tmp",
    mkdir: async () => undefined,
    writeFile: async (path, data) => {
      writes[path] = data;
    },
    log: (line) => logs.push(line),
    fetch: (async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const r = responder(url);
      return {
        ok: r.ok,
        status: r.status ?? (r.ok ? 200 : 500),
        arrayBuffer: async () => (r.body ?? new Uint8Array([1, 2, 3])).buffer,
      } as Response;
    }) as unknown as MediaFetchDeps["fetch"],
  };
  return { deps, writes, logs };
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
});
