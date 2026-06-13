/**
 * lib/ingest/collector-thread.ts — スレッド非ルート（2番目以降）候補を TOP へ差し替える正規化。
 *
 * 探索で拾ったツイートが「スレッドの2番目以降（リプライ）」だと、文脈が欠けた断片が
 * キュレーション画面に並んでしまう。conversationId からスレッド TOP（=ルート）を引き、
 * 候補をルートツイートに差し替える。MA の get_thread 判断に委ねず**コード側で決定的に**行う。
 *
 * 判定: conversationId があり tweet.id ≠ conversationId なら非ルート（ルートは id===conversationId）。
 * fail-open: スレッド取得失敗・ルート不明なら元の候補をそのまま残す（取りこぼさない）。
 * cost: conversationId 単位で dedup し、1 run の取得回数を上限で bound（twitterapi.io 従量）。
 */
import type { Candidate } from "./collector-scoring.js";
import { getThread as getThreadDefault, type Tweet } from "./twitterapi-client.js";

export interface ThreadResolveDeps {
  key: string;
  fetchImpl: typeof fetch;
  /** test 注入用。未指定なら本物の getThread。 */
  getThread?: typeof getThreadDefault;
  /** 1 run のスレッド取得上限（cost 上限）。既定 30。 */
  maxThreadFetches?: number;
}

/** スレッド非ルート（2番目以降）か。conversationId があり自分が TOP でないとき true。 */
export function isNonRootReply(t: Tweet): boolean {
  return !!t.conversationId && !!t.id && t.id !== t.conversationId;
}

/** スレッド配列から TOP を選ぶ。id===conversationId 優先、無ければ最古を TOP とみなす。 */
export function pickThreadRoot(thread: Tweet[], conversationId: string): Tweet | null {
  if (thread.length === 0) return null;
  const exact = thread.find((t) => t.id === conversationId);
  if (exact) return exact;
  // fallback: 同一 conversation の最古（createdAt 最小）を TOP とみなす。
  const sameConv = thread.filter((t) => t.conversationId === conversationId);
  const pool = sameConv.length > 0 ? sameConv : thread;
  return pool.reduce((oldest, t) =>
    new Date(t.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? t : oldest,
  );
}

/**
 * 非ルート候補を TOP に差し替え、同一ルートへ収束した重複は 1 件に畳む。
 * 取得失敗・ルート不明は元のまま残す（fail-open）。スコアリング前に呼ぶ。
 */
export async function resolveThreadRoots(
  candidates: Candidate[],
  deps: ThreadResolveDeps,
): Promise<Candidate[]> {
  const getThread = deps.getThread ?? getThreadDefault;
  const maxFetches = deps.maxThreadFetches ?? 30;

  // 解決が必要な conversationId を dedup 収集。
  const needed = new Set<string>();
  for (const c of candidates) {
    if (isNonRootReply(c.tweet)) needed.add(c.tweet.conversationId as string);
  }
  if (needed.size === 0) return candidates;

  // conversationId → root tweet。cost 上限内で取得。
  const rootByConv = new Map<string, Tweet>();
  let fetches = 0;
  for (const cid of needed) {
    if (fetches >= maxFetches) {
      console.warn(JSON.stringify({ level: "warn", msg: "[collect] thread-root fetch cap reached", cap: maxFetches, remaining: needed.size - fetches }));
      break;
    }
    fetches += 1;
    try {
      const thread = await getThread(cid, deps.key, deps.fetchImpl);
      const root = pickThreadRoot(thread, cid);
      if (root && root.id) rootByConv.set(cid, root);
    } catch (e) {
      console.warn(JSON.stringify({ level: "warn", msg: "[collect] thread-root fetch failed (fail-open)", conversationId: cid, error: String(e) }));
    }
  }

  // 置換 + dedup（同一ツイート id は 1 件に。ルート収束で生じる重複を除く）。
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of candidates) {
    let next = c;
    if (isNonRootReply(c.tweet)) {
      const root = rootByConv.get(c.tweet.conversationId as string);
      if (root) {
        next = { tweet: root, discovery: c.discovery, threadRootOf: c.tweet.id };
      }
    }
    const id = next.tweet.id;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(next);
  }
  return out;
}
