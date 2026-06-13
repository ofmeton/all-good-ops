// lib/thread-logic.ts — スレッド本文の純ロジック（DB/IO 非依存・vitest 対象）。
//
// ⚠️ 契約ミラー: x-account-system `lib/curation/thread.ts` と**同一契約**。
//    apps 間 import 不可のため同型コードを両方に置く。
//    片方を変更したら必ずもう片方も同じ契約で修正すること（drift 禁止）。
//    drift を起こすと thread_bodies(投稿時の正) と body(join 派生) が DB で食い違う。
//    node:* 非依存に保つ（Cloudflare Worker import 可な純ロジックに揃える）。

/** スレッド本文を 1 つの body に join する際の区切り（DB body の正準形）。 */
export const THREAD_DELIM = "\n\n---\n\n";

/** スレッド最大本数（X の運用目安・暴走 payload ガード）。 */
export const THREAD_MAX_PARTS = 8;

/** 1 ツイートの全角換算 目安上限（超過は warn のみ・人間ゲート委譲）。 */
export const TWEET_SOFT_LIMIT = 140;

/** parts を DB body 用の単一文字列へ join（THREAD_DELIM 区切り）。 */
export function joinThread(parts: string[]): string {
  return parts.join(THREAD_DELIM);
}

/** body を THREAD_DELIM で split し、各 part を trim、空 part を除去して返す。
 *  単一本文（区切りなし）は要素 1 の配列になる。 */
export function splitThread(body: string): string[] {
  if (typeof body !== "string") return [];
  return body
    .split(THREAD_DELIM)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export interface ValidateThreadResult {
  ok: boolean;
  errors: string[];
}

/** スレッド parts を検証する。
 *  - 空配列禁止 / 空 part 禁止（error）
 *  - 最大 THREAD_MAX_PARTS 本超過は error
 *  - 1 ツイート TWEET_SOFT_LIMIT 字超は warn 相当（errors には入れず ok=true を維持）
 *    → 本数・空のみを hard error とし、長さは人間ゲートに委ねる（決定: 超過は warn のみ）。 */
export function validateThreadParts(parts: string[]): ValidateThreadResult {
  const errors: string[] = [];
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push("スレッド本文が空です（1 本以上必要）");
    return { ok: false, errors };
  }
  if (parts.length > THREAD_MAX_PARTS) {
    errors.push(`スレッドは最大 ${THREAD_MAX_PARTS} 本までです（現在 ${parts.length} 本）`);
  }
  parts.forEach((p, i) => {
    if (typeof p !== "string" || p.trim().length === 0) {
      errors.push(`${i + 1} 本目が空です`);
    }
  });
  return { ok: errors.length === 0, errors };
}
