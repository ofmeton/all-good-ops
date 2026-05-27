/**
 * Hook 配分 SSoT (initial-values §3.2 反映)
 *
 * v10.3 §4.7.1 で定義された primary_hook 4 種について、月間出現比率の
 * 目安と verified failure_story の月次上限を持つ。
 *
 * VERIFIED_FAILURE_STORY_MONTHLY_CAP=4 は PR-A の必須 gate (X3 ルール)。
 *   - failure_story 自体は月 4 件を超えても fail にしない (X3 は失敗談記事のみ厳格 gate)
 *   - "verified" (publication_consent='granted' + verified_failure_story=true + redaction_reviewed=true)
 *     の failure_story 投稿は月 4 件まで
 */

export type PrimaryHook =
  | "failure_story"
  | "business_repro"
  | "critique"
  | "tips_enum";

/**
 * 月間 hook 配分の目標値 (initial-values §3.2)
 *
 * 合計 100%。Editor 段階では参考値として持つだけで、PR-A では fail しない。
 * 配分 monitoring は将来の supervisor / analyst で扱う。
 */
export const HOOK_QUOTA_PCT: Record<PrimaryHook, number> = {
  failure_story: 20,
  business_repro: 40,
  critique: 15,
  tips_enum: 25,
};

/**
 * verified failure_story 月次上限。X3 ルールで参照。
 */
export const VERIFIED_FAILURE_STORY_MONTHLY_CAP = 4;

/**
 * Hook 強度の最低閾値 (X1 ルール)
 */
export const HOOK_STRENGTH_THRESHOLD = 0.4;

/**
 * R5 重複判定の cos sim 閾値
 */
export const DUPLICATE_COSINE_THRESHOLD = 0.85;

/**
 * R5 重複検査の検査窓 (日)
 */
export const DUPLICATE_WINDOW_DAYS = 14;
