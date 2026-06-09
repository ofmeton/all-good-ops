export type DraftRow = { id: string; body: string; publishedAt: string | null };
export type TweetLite = { id: string; text: string; createdAt: string };

/** 照合用に本文を正規化: lowercase(latin) / 連続空白→単一空白 / 末尾 t.co・http(s) URL 除去 / trim */
export function normalizeForMatch(text: string): string {
  if (!text) return "";
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * tweet を published draft 群に照合。正規化一致 or 一方が他方の prefix、
 * かつ公開時刻が ±windowMs 以内。該当が一意のときのみ返す（曖昧/不一致は null）。
 */
export function matchTweetToDraft(
  tweet: TweetLite,
  drafts: DraftRow[],
  windowMs = 24 * 3600 * 1000,
): DraftRow | null {
  const nt = normalizeForMatch(tweet.text);
  if (!nt) return null;
  const tMs = Date.parse(tweet.createdAt);
  const hits = drafts.filter((d) => {
    if (!d.publishedAt) return false;
    const nb = normalizeForMatch(d.body);
    if (!nb) return false;
    const textOk = nb === nt || nb.startsWith(nt) || nt.startsWith(nb);
    if (!textOk) return false;
    const dMs = Date.parse(d.publishedAt);
    return Number.isFinite(dMs) && Math.abs(dMs - tMs) <= windowMs;
  });
  return hits.length === 1 ? hits[0] : null;
}
