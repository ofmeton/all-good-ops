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
 *  - 過大サイズは握りつぶさず skipped 降格（容量/DoS ガード。MAX_DOWNLOAD_BYTES）。
 *  - 他者写真をローカルに無期限残留させない: fetch 開始時に xad-media/ の古いファイルを
 *    mtime ベースで掃除し、投稿後は cleanupDraftMedia で対の削除を行う。
 */
import {
  mkdir as fsMkdir,
  writeFile as fsWriteFile,
  readdir as fsReaddir,
  stat as fsStat,
  unlink as fsUnlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** DL 1 枚あたりのサイズ上限（写真想定。超過は skipped 降格）。 */
export const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024; // 8MB
/** fetch 開始時に掃除する経過時間（これより古い xad-media/ の一時ファイルを削除）。 */
export const STALE_MEDIA_MS = 24 * 60 * 60 * 1000; // 24h

/** post_drafts.attachments[] の要素（写真 upload intent + 実行結果）。 */
export interface PhotoAttachment {
  kind: string;
  mediaType: string;
  sourceUrl: string;
  sourceMaterialId?: string;
  /** writer outline 由来のブロック番号（記事ブロック別生成画像）。 */
  blockIndex?: number;
  /** generated は Supabase Storage 由来。DL 配管では sourceUrl を通常写真として扱う。 */
  source?: "generated" | "manual";
  role?: string;
  promptUsed?: string;
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
  unlink: (path: string) => Promise<void>;
  /** ディレクトリ内のファイル名一覧（存在しなければ []）。 */
  readdir: (dir: string) => Promise<string[]>;
  /** mtime(ms) を返す。 */
  statMtimeMs: (path: string) => Promise<number>;
  tmpDir: () => string;
  now: () => number;
  /** 構造化ログ（サイレント失敗防止）。 */
  log: (line: string) => void;
}

const defaultDeps: MediaFetchDeps = {
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  writeFile: (path, data) => fsWriteFile(path, data),
  mkdir: (dir) => fsMkdir(dir, { recursive: true }).then(() => undefined),
  unlink: (path) => fsUnlink(path),
  readdir: (dir) => fsReaddir(dir).catch(() => [] as string[]),
  statMtimeMs: (path) => fsStat(path).then((s) => s.mtimeMs),
  tmpDir: () => tmpdir(),
  now: () => Date.now(),
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

/** xad-media/ の古い一時ファイル（mtime が maxAgeMs より古い）を掃除する。
 *  cleanup 漏れ（手動 rm 失敗・異常終了）があっても、次回 fetch で他者写真を残さない安全網。
 *  個々の削除失敗はログのみ（掃除は best-effort）。削除件数を返す。 */
export async function sweepStaleMedia(
  deps: Partial<MediaFetchDeps> = {},
  maxAgeMs = STALE_MEDIA_MS,
): Promise<number> {
  const d = { ...defaultDeps, ...deps };
  const dir = join(d.tmpDir(), "xad-media");
  const cutoff = d.now() - maxAgeMs;
  let removed = 0;
  const names = await d.readdir(dir);
  for (const name of names) {
    const p = join(dir, name);
    try {
      const mtime = await d.statMtimeMs(p);
      if (mtime < cutoff) {
        await d.unlink(p);
        removed++;
      }
    } catch (e) {
      d.log(
        JSON.stringify({
          level: "warn",
          msg: "[media-fetch] sweep 失敗（次回再試行）",
          path: p,
          reason: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
  return removed;
}

/** 投稿確定後に対の一時ファイルを削除する。削除失敗はログのみ（次回 fetch の sweep が拾う）。 */
export async function cleanupDraftMedia(
  localPaths: string[],
  deps: Partial<MediaFetchDeps> = {},
): Promise<void> {
  const d = { ...defaultDeps, ...deps };
  for (const p of localPaths ?? []) {
    try {
      await d.unlink(p);
    } catch (e) {
      d.log(
        JSON.stringify({
          level: "warn",
          msg: "[media-fetch] cleanup 失敗（次回 sweep で掃除）",
          path: p,
          reason: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
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

  // 開始時に古い一時ファイルを掃除（cleanup 漏れの安全網。失敗してもダウンロードは続行）。
  await sweepStaleMedia(deps).catch(() => 0);

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
      // 容量ガード①: content-length が上限超なら読み込まず skipped 降格。
      const declared = Number(res.headers?.get?.("content-length") ?? "");
      if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
        throw new Error(`too large (content-length ${declared} > ${MAX_DOWNLOAD_BYTES})`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength === 0) {
        throw new Error("empty body");
      }
      // 容量ガード②: ヘッダ詐称/欠落に備え実体サイズでも検証。
      if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
        throw new Error(`too large (${buf.byteLength} > ${MAX_DOWNLOAD_BYTES})`);
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
