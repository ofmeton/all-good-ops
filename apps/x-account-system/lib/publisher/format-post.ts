/**
 * format-post.ts — 投稿前のセグメント化 (PR: thread 実投稿対応)
 *
 * publishToX が「実際に X に投稿するクリーンな本文の配列」を得るための変換。
 *
 * 解決する本番バグ:
 *   fmat='thread' の本文は LLM が
 *     スレッド1本目\n\n<本文1>\n\n---\n\nスレッド2本目\n\n<本文2>...
 *   のように足場ラベル + "---" 区切りで出力する。
 *   これを 1 ツイートとして投稿すると「スレッドN本目」「---」がそのまま載った
 *   巨大ツイートになる。
 *
 * segmentForPublish は:
 *   - 足場ラベル行 (「スレッドN本目」「N本目」「(1/3)」「1/3」単独行) を除去
 *   - thread は "---" / "—" / "ー" 単独行で分割し、各セグメントをクリーン化
 *   - 280 weighted-char (日本語 2 / ASCII 1) を超えるセグメントは
 *     段落 → 文 → ハード分割で自動分割し、長文単独形式も自動スレッド化
 *   - 必ず非空配列 (≥1) を返す
 */
import type { PublishFormat } from "./types.ts";
import {
  THREAD_TWEET_MAX_WEIGHTED,
  isDelimiterLine,
  isScaffoldLabelLine,
} from "./thread-format.ts";

/**
 * X の weighted-char 上限 (日本語等 non-ASCII は 2 でカウント)。
 * スレッド契約 (thread-format.ts) の THREAD_TWEET_MAX_WEIGHTED から導出し、別リテラルを作らない。
 */
export const X_WEIGHTED_LIMIT = THREAD_TWEET_MAX_WEIGHTED;

/**
 * X の weighted length 近似。
 * X API は code point > 0x10FF や絵文字など細かい規則を持つが、ここでは
 * 「ASCII (<=0x7F) は 1、それ以外は 2」のシンプル近似で十分安全側に倒す。
 * URL も loose に文字数そのままで数える (短縮 t.co を考慮しない安全側)。
 */
export function weightedLen(s: string): number {
  let n = 0;
  for (const ch of s) {
    // code point ベース (surrogate pair も 1 文字として扱う)
    const cp = ch.codePointAt(0) ?? 0;
    n += cp > 0x7f ? 2 : 1;
  }
  return n;
}

// 足場ラベル / delimiter の判定はスレッド契約 (thread-format.ts) を SSOT として import。
// ここで再定義すると writer prompt と silent drift するため絶対に複製しない。

/** 1 セグメントから足場ラベル単独行を除去して trim する。 */
function stripLabels(segment: string): string {
  const kept = segment
    .split("\n")
    .filter((line) => !isScaffoldLabelLine(line));
  return kept.join("\n").trim();
}

/**
 * weighted length が limit を超えるテキストを段落→文→ハード分割で
 * limit 以下のチャンク配列に分割する。各チャンクは trim 済み・非空。
 */
function splitToFit(text: string, limit: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (weightedLen(trimmed) <= limit) return [trimmed];

  // 1. 段落 (\n\n) で割り、greedy に詰める
  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.trim().length > 0) out.push(buf.trim());
    buf = "";
  };

  for (const para of paragraphs) {
    const candidate = buf.length > 0 ? `${buf}\n\n${para}` : para;
    if (weightedLen(candidate) <= limit) {
      buf = candidate;
      continue;
    }
    // 現バッファを確定してから段落単体を評価
    flush();
    if (weightedLen(para) <= limit) {
      buf = para;
    } else {
      // 2. 段落単体が超過 → 文 (。/ 改行) で割る
      for (const piece of splitParagraph(para, limit)) {
        out.push(piece);
      }
      buf = "";
    }
  }
  flush();
  return out.length > 0 ? out : [trimmed];
}

/** 段落を文 (。/ \n) 境界で limit 以下に分割。最終手段は hard-split。 */
function splitParagraph(para: string, limit: number): string[] {
  // 「。」と改行を境界に。区切り文字 (。) は前のチャンクに残す。
  const sentences = para
    .split(/(?<=。)|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    const candidate = buf.length > 0 ? `${buf}\n${sentence}` : sentence;
    if (weightedLen(candidate) <= limit) {
      buf = candidate;
      continue;
    }
    if (buf.length > 0) {
      out.push(buf.trim());
      buf = "";
    }
    if (weightedLen(sentence) <= limit) {
      buf = sentence;
    } else {
      // 3. 文単体でも超過 → weighted で hard-split
      for (const chunk of hardSplit(sentence, limit)) out.push(chunk);
      buf = "";
    }
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

/** weighted length 基準で強制分割 (最終手段)。 */
function hardSplit(text: string, limit: number): string[] {
  const out: string[] = [];
  let buf = "";
  let w = 0;
  for (const ch of text) {
    const cw = (ch.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
    if (w + cw > limit && buf.length > 0) {
      out.push(buf);
      buf = "";
      w = 0;
    }
    buf += ch;
    w += cw;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

/**
 * 投稿用のクリーンなツイート本文配列を返す。
 *
 * @param body 元の draft 本文 (足場ラベル/区切りを含む可能性あり)
 * @param fmat 投稿形式
 * @returns 実際に投稿する各ツイートの本文 (足場なし)。必ず ≥1。
 */
export function segmentForPublish(body: string, fmat: PublishFormat): string[] {
  const raw = (body ?? "").replace(/\r\n/g, "\n");

  let baseSegments: string[];
  if (fmat === "thread") {
    // delimiter 単独行で分割 → 各セグメントからラベル除去
    const lines = raw.split("\n");
    const groups: string[][] = [[]];
    for (const line of lines) {
      if (isDelimiterLine(line)) {
        groups.push([]);
      } else {
        groups[groups.length - 1].push(line);
      }
    }
    baseSegments = groups
      .map((g) => stripLabels(g.join("\n")))
      .filter((s) => s.length > 0);
  } else {
    // 非 thread: ラベル除去した本文全体を 1 セグメントとして開始
    const stripped = stripLabels(raw);
    baseSegments = stripped.length > 0 ? [stripped] : [];
  }

  // 長さ安全: 各セグメントを weighted limit 以下に分割
  const out: string[] = [];
  for (const seg of baseSegments) {
    for (const piece of splitToFit(seg, X_WEIGHTED_LIMIT)) {
      out.push(piece);
    }
  }

  // 空配列にならないよう保険 (全部ラベル/区切りだった等)。
  if (out.length === 0) {
    const fallback = raw.trim();
    return [fallback.length > 0 ? fallback : ""];
  }
  return out;
}
