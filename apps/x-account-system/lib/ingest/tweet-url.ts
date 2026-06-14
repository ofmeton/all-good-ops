/**
 * lib/ingest/tweet-url.ts — X/Twitter URL 貼付から tweet id を抽出する小さな境界 util。
 */

const TWEET_ID_RE = /^\d+$/;
const STATUS_PATH_RE = /^\/[^/]+\/status(?:es)?\/(\d+)(?:\/)?$/;

function splitInput(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;
  return input.split(/[\s,]+/);
}

function parseOne(entry: string): string | null {
  const raw = entry.trim();
  if (TWEET_ID_RE.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (!/^(?:www\.|mobile\.)?(?:x\.com|twitter\.com)$/.test(host)) return null;
    const m = u.pathname.match(STATUS_PATH_RE);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseTweetIds(input: string | string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of splitInput(input)) {
    const id = parseOne(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
