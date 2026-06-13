/**
 * 画像/メディアDLプロキシの純粋ロジック（SSRF 境界検証 + ファイル名/原寸URL生成）。
 *
 * クロスオリジン（pbs.twimg.com 等）の <a download> はブラウザ仕様で無視されるため、
 * same-origin の /api/media/download 経由で Content-Disposition: attachment を付けて返す。
 * その際、外部入力の url を必ず allowlist で検証する（任意 URL を fetch させない＝SSRF 防止）。
 *
 * 注: collector は video/animated_gif でも media_url_https（=サムネ画像, pbs.twimg.com）を保存し、
 * mp4 を含む video_info は破棄している（twitterapi-client.ts mapTweet）。よって現状 DL 対象は実質
 * すべて pbs.twimg.com の画像。video.twimg.com は将来 mp4 を保存し始めた時のための forward-compat。
 */

/** fetch を許可するホスト（完全一致のみ。サブドメイン詐称を弾くため endsWith は使わない）。 */
export const ALLOWED_MEDIA_HOSTS = new Set(["pbs.twimg.com", "video.twimg.com"]);

export interface PreparedDownload {
  /** 実際に fetch する URL（pbs.twimg.com の画像は原寸 name=orig に正規化済み）。 */
  fetchUrl: string;
  /** Content-Disposition に載せる安全なファイル名。 */
  filename: string;
}

/** ファイル名に使える文字だけに丸める（Content-Disposition / OS 双方で安全側）。 */
function sanitizeBase(s: string): string {
  const cleaned = s
    .replace(/[^A-Za-z0-9._-]/g, "") // 許可文字以外を除去（/ や % を含む）
    .replace(/\.{2,}/g, ".") // 連続ドットを1つに（".." 残留を防ぐ）
    .replace(/^[._-]+/, "") // 先頭の . _ - を除去
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "media";
}

/** 拡張子を推定。query の format → path 拡張子 → 既定 jpg の順。 */
function inferExt(u: URL): string {
  const fmt = u.searchParams.get("format");
  if (fmt && /^[a-z0-9]{1,5}$/i.test(fmt)) return fmt.toLowerCase();
  const m = u.pathname.match(/\.([a-z0-9]{1,5})$/i);
  if (m) return m[1].toLowerCase();
  return "jpg";
}

/** path の basename（拡張子除去）。pbs の /media/<id>.jpg → <id>。 */
function pathBase(u: URL): string {
  const last = u.pathname.split("/").filter(Boolean).pop() ?? "media";
  return last.replace(/\.[a-z0-9]{1,5}$/i, "");
}

/**
 * 外部入力 url を検証し、fetch 用 URL とファイル名を組み立てる。
 * 不正（http(s)以外 / host 非許可 / パース失敗）は null。route 側で 400 を返す。
 */
export function prepareMediaDownload(raw: string | null | undefined): PreparedDownload | null {
  if (!raw || typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!ALLOWED_MEDIA_HOSTS.has(u.hostname)) return null;

  const ext = inferExt(u);
  const filename = `${sanitizeBase(pathBase(u))}.${ext}`;

  // pbs.twimg.com の画像は原寸を取得（X CDN は ?format=&name=orig で最大解像度）。
  if (u.hostname === "pbs.twimg.com" && u.pathname.startsWith("/media/")) {
    u.searchParams.set("format", ext);
    u.searchParams.set("name", "orig");
  }
  return { fetchUrl: u.toString(), filename };
}

/** UI から叩く same-origin DL エンドポイントの href を作る。 */
export function mediaDownloadHref(rawUrl: string): string {
  return `/api/media/download?url=${encodeURIComponent(rawUrl)}`;
}
