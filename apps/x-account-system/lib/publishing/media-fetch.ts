/**
 * 写真添付の DL 配管（写真のみ・ffmpeg 不要・純配管 + IO 分離）。
 *
 * 承認時に post_drafts.attachments へ書かれた写真の upload intent を、投稿直前に
 * pbs.twimg.com から原寸(`?name=orig`)で DL し os.tmpdir()/xad-media/<draftId>-<idx>.<ext>
 * へ保存。その localPath と解決結果(resolved)を返す。x-scheduled-publish スキルが
 * 投稿前に呼び、localPath を chrome の upload_file へ順次渡す。
 *
 * 設計方針:
 *  - DL 失敗は throw せず該当 attachment を `skipped` に降格し fallbackReason + ログを残す
 *    （サイレント失敗禁止＝本領域の最大リスク。1 枚 DL 失敗で投稿全体を落とさない）。
 *  - 動画/GIF は本文 deep-link で扱うため本配管の対象外（attachments に入らない想定）。
 *  - IO（fetch / fs / tmpdir / log）は deps 注入で差し替え可能（jest）。
 */
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** post_drafts.attachments[] の要素（写真 upload intent + 実行結果）。 */
export interface PhotoAttachment {
  kind: string;
  mediaType: string;
  sourceUrl: string;
  sourceMaterialId?: string;
  localPath?: string;
  resolvedKind?: "upload" | "skipped";
  fallbackReason?: string;
}

/** 解決後 attachment（resolvedKind は必ず確定する）。 */
export interface ResolvedAttachment extends PhotoAttachment {
  resolvedKind: "upload" | "skipped";
}

export interface FetchDraftMediaResult {
  /** upload_file に渡せる順序付き localPath（resolvedKind='upload' のものだけ）。 */
  localPaths: string[];
  /** 全 attachment の解決結果（skipped 含む。観測・再試行用）。 */
  resolved: ResolvedAttachment[];
  uploaded: number;
  skipped: number;
}

export interface MediaFetchDeps {
  fetch: typeof fetch;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  mkdir: (dir: string) => Promise<void>;
  tmpDir: () => string;
  /** 構造化ログ（サイレント失敗防止）。 */
  log: (line: string) => void;
}

const defaultDeps: MediaFetchDeps = {
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  writeFile: (path, data) => fsWriteFile(path, data),
  mkdir: (dir) => fsMkdir(dir, { recursive: true }).then(() => undefined),
  tmpDir: () => tmpdir(),
  log: (line) => console.error(line),
};

/** pbs URL を原寸取得用に正規化（`name=orig` を付与/上書き）。
 *  `?format=jpg&name=small` も `media/XXX.jpg` も両対応。パース不能なら原文を返す。 */
export function toOrigUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.set("name", "orig");
    return u.toString();
  } catch {
    return raw;
  }
}

/** URL から拡張子を推定（?format= → パス拡張子 → 既定 jpg）。 */
export function inferExt(raw: string): string {
  try {
    const u = new URL(raw);
    const fmt = u.searchParams.get("format");
    if (fmt) {
      const clean = fmt.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (clean) return clean;
    }
    const m = u.pathname.match(/\.([a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
  } catch {
    /* fall through */
  }
  return "jpg";
}

function isUploadablePhoto(a: PhotoAttachment): boolean {
  return (
    a.kind === "upload" &&
    a.mediaType === "photo" &&
    typeof a.sourceUrl === "string" &&
    a.sourceUrl.length > 0
  );
}

/**
 * draft の写真 attachments を DL し localPath を解決する。
 * @param draftId    ファイル名の prefix（衝突回避）
 * @param attachments post_drafts.attachments（写真 upload intent）
 */
export async function fetchDraftMedia(
  draftId: string,
  attachments: PhotoAttachment[],
  deps: Partial<MediaFetchDeps> = {},
): Promise<FetchDraftMediaResult> {
  const d = { ...defaultDeps, ...deps };
  const dir = join(d.tmpDir(), "xad-media");
  const resolved: ResolvedAttachment[] = [];
  let dirReady = false;

  for (let idx = 0; idx < (attachments ?? []).length; idx++) {
    const a = attachments[idx];
    if (!a || !isUploadablePhoto(a)) {
      const reason = "unsupported attachment (写真 upload intent のみ DL 対象)";
      d.log(
        JSON.stringify({
          level: "warn",
          msg: "[media-fetch] skipped",
          draftId,
          idx,
          reason,
        }),
      );
      resolved.push({ ...a, resolvedKind: "skipped", fallbackReason: reason });
      continue;
    }

    const origUrl = toOrigUrl(a.sourceUrl);
    const ext = inferExt(a.sourceUrl);
    const localPath = join(dir, `${draftId}-${idx}.${ext}`);
    try {
      if (!dirReady) {
        await d.mkdir(dir);
        dirReady = true;
      }
      const res = await d.fetch(origUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0) {
        throw new Error("empty body");
      }
      await d.writeFile(localPath, buf);
      resolved.push({
        ...a,
        localPath,
        resolvedKind: "upload",
        fallbackReason: undefined,
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      // サイレント失敗禁止: skipped 降格 + 構造化ログ。投稿は本文のみで継続。
      d.log(
        JSON.stringify({
          level: "error",
          msg: "[media-fetch] download failed → skipped",
          draftId,
          idx,
          sourceUrl: a.sourceUrl,
          reason,
        }),
      );
      resolved.push({ ...a, resolvedKind: "skipped", fallbackReason: reason });
    }
  }

  const localPaths = resolved
    .filter((r): r is ResolvedAttachment & { localPath: string } =>
      r.resolvedKind === "upload" && typeof r.localPath === "string",
    )
    .map((r) => r.localPath);
  const uploaded = localPaths.length;
  const skipped = resolved.length - uploaded;
  return { localPaths, resolved, uploaded, skipped };
}
