/**
 * Attribution (UTM tracker) types (PR-E)
 *
 * SSoT:
 *   - main-design-all-versions.md E-48 (cross-platform 推定)
 *   - main-design-all-versions.md §2.8 集客導線 3 パターン
 *
 * 役割:
 *   - X / Instagram / note の各 URL に utm_source / utm_medium / utm_campaign を付与
 *   - 着地後の URL を parse して originating source を判定
 *   - Phase 0.5 では console.log のみ。Phase 1 で Supabase `attribution_events` に投入
 */

export type UtmSource = "x" | "instagram" | "note" | "line" | "direct";

export type UtmMedium =
  | "post" // X 単発 / IG リール / note 記事内リンク等の通常投稿
  | "carousel" // IG カルーセル スワイプ
  | "reel" // IG リール
  | "story" // IG ストーリーズ
  | "bio" // プロフィール bio リンク
  | "pinned"; // X pinned tweet

export type UtmParams = {
  source: UtmSource;
  medium: UtmMedium;
  /** "phase1_month1" / "claude_tip_jun" など */
  campaign: string;
  /** post_id 等 (任意) */
  content?: string;
};

export type TrackedUrl = {
  /** UTM 付き URL */
  url: string;
  params: UtmParams;
};

export type AttributionEvent = {
  url: string;
  /** 元投稿 ID (X tweet_id / IG post_id / note article_id) */
  sourcePost: string;
  landedAt: Date;
  params: UtmParams | null;
};
