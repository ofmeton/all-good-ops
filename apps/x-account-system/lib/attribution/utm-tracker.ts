/**
 * UTM tracker (PR-E)
 *
 * SSoT: main-design-all-versions.md E-48 (cross-platform 推定)
 *
 * 機能:
 *   - addUtm(url, params)              : URL に utm_source / utm_medium / utm_campaign / utm_content を付与
 *   - parseUtmFromIncomingUrl(url)     : 着地後 URL から UTM を parse (なければ null)
 *   - logAttribution(event)            : Phase 0.5 では console.log。Phase 1+ で Supabase に投入
 *
 * 設計メモ:
 *   - 既存 utm_* パラメータがあれば優先 (overwrite しない場合の挙動はオプションで切替可能)
 *   - URL fragment (#hash) は保持
 *   - 不正な URL (parse 失敗) は throw
 */

import type {
  AttributionEvent,
  TrackedUrl,
  UtmParams,
} from "./types.ts";

/**
 * URL に UTM 4 種を付与する。
 *
 * @throws URL が parse できなかった場合
 */
export function addUtm(url: string, params: UtmParams): string {
  const u = new URL(url); // throw if invalid
  u.searchParams.set("utm_source", params.source);
  u.searchParams.set("utm_medium", params.medium);
  u.searchParams.set("utm_campaign", params.campaign);
  if (params.content) {
    u.searchParams.set("utm_content", params.content);
  }
  return u.toString();
}

/**
 * 着地 URL の query string から UTM を取り出す。
 * 4 必須項目 (source / medium / campaign) が揃っていない場合は null。
 */
export function parseUtmFromIncomingUrl(url: string): UtmParams | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const source = u.searchParams.get("utm_source");
  const medium = u.searchParams.get("utm_medium");
  const campaign = u.searchParams.get("utm_campaign");
  const content = u.searchParams.get("utm_content") ?? undefined;
  if (!source || !medium || !campaign) return null;
  return {
    source: source as UtmParams["source"],
    medium: medium as UtmParams["medium"],
    campaign,
    content,
  };
}

/**
 * URL に UTM を付与した結果を構造体で返す (`addUtm` の wrapper)
 */
export function buildTrackedUrl(url: string, params: UtmParams): TrackedUrl {
  return {
    url: addUtm(url, params),
    params,
  };
}

/**
 * Attribution event を投入する。
 *
 * Phase 0.5: console.log のみ
 * Phase 1+ : Supabase `attribution_events` table に insert
 */
export function logAttribution(event: {
  url: string;
  sourcePost: string;
  landedAt: Date;
}): AttributionEvent {
  const params = parseUtmFromIncomingUrl(event.url);
  const record: AttributionEvent = {
    url: event.url,
    sourcePost: event.sourcePost,
    landedAt: event.landedAt,
    params,
  };
  // Phase 0.5: console.log fallback
  if (process.env.IN_MEMORY_FALLBACK === "true" || !process.env.SUPABASE_URL) {
    console.log(
      `[attribution] sourcePost=${event.sourcePost} url=${event.url} params=${JSON.stringify(params)}`,
    );
    return record;
  }
  // Phase 1+: Supabase insert (本ファイルでは未実装、PR-F で fastdeliver)
  throw new Error(
    "Supabase attribution_events insert not implemented in Phase 0.5",
  );
}

/**
 * cross-platform 推定: source が "direct" のときに referer / cookie ヒントから source を推測する。
 * Phase 0.5 では純粋関数のみ (Supabase / referrer 解析は Phase 1+)。
 *
 * 簡易ヒューリスティック:
 *   - referer に "x.com" / "twitter.com" → source="x"
 *   - referer に "instagram.com" → source="instagram"
 *   - referer に "note.com" → source="note"
 *   - referer に "line.me" → source="line"
 *   - それ以外 → "direct"
 */
export function inferSourceFromReferer(referer: string | null): UtmParams["source"] {
  if (!referer) return "direct";
  // URL から host を取り出す。bare host 文字列も許容
  let host = referer;
  try {
    host = new URL(referer).host;
  } catch {
    // not a URL → そのまま host として扱う
  }
  if (/(^|\.)x\.com$|(^|\.)twitter\.com$/i.test(host)) return "x";
  if (/(^|\.)instagram\.com$/i.test(host)) return "instagram";
  if (/(^|\.)note\.com$/i.test(host)) return "note";
  if (/(^|\.)line\.me$/i.test(host)) return "line";
  return "direct";
}
