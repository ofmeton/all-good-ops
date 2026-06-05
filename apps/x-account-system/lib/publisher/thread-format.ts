/**
 * thread-format.ts — スレッド wire-format の単一契約 (SINGLE SOURCE OF TRUTH)
 *
 * ================== THE THREAD-FORMAT CONTRACT ==================
 * 以下 3 者がスレッドの「線上フォーマット」について必ず一致する:
 *   (1) WRITER prompt  — lib/writer/system-prompts.ts の THREAD_FORMAT_GUIDE
 *   (2) PUBLISHER split — lib/publisher/format-post.ts の segmentForPublish
 *   (3) label-strip rule — format-post.ts (本ファイルの正規表現を import)
 *
 * 契約 (CONTRACT):
 *   - 区切り (delimiter): ちょうど THREAD_DELIMITER (= "---") だけからなる 1 行。
 *     (publisher は後方互換のため "—"(em dash) / "ー"(長音) 単独行も区切りとして受理するが、
 *      writer が出力すべき正準デリミタは THREAD_DELIMITER のみ。)
 *   - ツイート本文に位置ラベルを含めない:
 *     「スレッドN本目」「N本目」「(1/3)」「1/3」などの足場ラベルは writer が絶対に出力しない
 *     (X 上で自動採番されるため)。
 *   - 各ツイートは日本語 ~THREAD_TWEET_JP_SOFT_LIMIT 字以内 /
 *     X の weighted-char ≤ THREAD_TWEET_MAX_WEIGHTED に収める。
 *   - publisher は後方互換 (legacy draft) のためラベルを strip するが、
 *     writer は最初からラベルを emit してはならない。
 * ===============================================================
 *
 * この契約定数を writer prompt と splitter の双方が import することで、
 * 「片方だけ delimiter を変えて巨大 1 ツイート化する」silent drift を防ぐ。
 * 整合は lib/publisher/thread-contract.test.ts の round-trip / drift-guard で担保。
 */

/** 正準デリミタ: ツイート間を区切る「この文字だけからなる行」。 */
export const THREAD_DELIMITER = "---";

/** X の weighted-char 上限 (日本語等 non-ASCII は 2 でカウント)。 */
export const THREAD_TWEET_MAX_WEIGHTED = 280;

/** 1 ツイートの日本語ソフト上限 (writer 向けの目安。weighted 換算でおよそ 260)。 */
export const THREAD_TWEET_JP_SOFT_LIMIT = 130;

/**
 * 正準デリミタ単独行を判定する正規表現。
 * THREAD_DELIMITER ("---") 以上のハイフン、または後方互換の "—" / "ー" のみの行。
 * THREAD_DELIMITER から派生させ、別リテラルを作らない。
 */
const HYPHEN_DELIMITER_RE = new RegExp(`^${THREAD_DELIMITER[0]}{${THREAD_DELIMITER.length},}$`);
const LEGACY_DELIMITER_RES = [/^—+$/, /^ー+$/];

/** delimiter 単独行 (--- / — / ー のみ) か判定する。 */
export function isDelimiterLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return false;
  return HYPHEN_DELIMITER_RE.test(t) || LEGACY_DELIMITER_RES.some((re) => re.test(t));
}

/**
 * 足場ラベル単独行の判定パターン (legacy draft 後方互換のため publisher が strip する)。
 * 行全体がラベルのときのみマッチ (文中のラベルは保持)。
 *   - スレッドN本目 / スレッド N 本目
 *   - N本目 / N 本目
 *   - (1/3) / （1/3）
 *   - 1/3 (単独行)
 */
export const SCAFFOLD_LABEL_RES: readonly RegExp[] = [
  /^スレッド\s*\d+\s*本目$/,
  /^\d+\s*本目$/,
  /^[（(]\s*\d+\s*\/\s*\d+\s*[)）]$/,
  /^\d+\s*\/\s*\d+$/,
];

/** 足場ラベル単独行か判定する (前後 whitespace 許容、行全体がラベルのときのみ true)。 */
export function isScaffoldLabelLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return false;
  return SCAFFOLD_LABEL_RES.some((re) => re.test(t));
}
