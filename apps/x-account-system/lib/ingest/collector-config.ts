/**
 * lib/ingest/collector-config.ts — Collector の数値・設定系レバー SSOT。
 * 改善レバー L1/L2/L4/L7/L8/L10 はここを編集する（散在禁止）。
 * （L9 dedupWindowDays は dead config だったため 2026-06-11 削除。dedup は tweet_id unique 依存。）
 */

export interface CollectorWatchSource {
  handle: string;
  category: "ai_official" | "en_curator" | "jp_publisher";
}

export interface CollectorConfig {
  /** L1: 固定 watchlist（初期ソース） */
  watchlist: CollectorWatchSource[];
  /** L4: 海外トレンド woeid（海外=US(23424977)。woeid=1 は実測で日本が返るため使わない） */
  trendWoeids: number[];
  /** L5(数値側): 3軸の重み（overall 算出の参考。LLM に rubric として渡す） */
  scoringWeights: { freshness: number; velocity: number; target_fit: number };
  /** L8: 1 run で fetch する最大件数（budget 上限。P3 後は MA explore の soft cap として handler が参照） */
  maxFetchPerRun: number;
  /** L8: 探索ループの最大反復の目安。P3 で explore は永続 MA session 化し、ループ境界は
   *  session の timeoutMs + maxFetchPerRun soft cap + agent 判断が担う（本値は情報用に据置）。 */
  maxExploreIterations: number;
  /** L7: scoring モデル */
  scoringModel: string;
  /** L7: 海外ツイート翻訳モデル（Haiku・cost_ledger 配下） */
  translationModel: string;
  /** L8: scoring の1バッチ件数 */
  scoringBatchSize: number;
  /** L2: 新ソース候補を即 watchlist 昇格しない（常に candidate_sources へ） */
  autoPromoteDiscoveredSources: false;

  // --- P2 二段採点（collector-prerank）レバー。tier-config（人間+PR で変更）---
  /** prerank の適用モード。"shadow"=選抜は計算/記録のみで fine-score は全件（挙動不変・既定）。
   *  "enforce"=選抜のみ fine-score（shadow データで上澄み非劣化を実証後・人間ゲートで切替）。 */
  prerankMode: "shadow" | "enforce";
  /** topK: prior 降順で fine-score に回す上位件数。 */
  shortlistTopK: number;
  /** exploration: 残余から via 層化ランダムで拾う件数（セレンディピティ＋剪定群の不偏推定）。 */
  explorationQuota: number;
  /** floor stale 判定の age 閾値（時間）。これを超え velocity<1 で provably-zero 候補。 */
  prerankMaxAgeHours: number;
  /** fresh-protect: この時間未満の新しい候補は floor しない（遅咲き保護）。 */
  freshnessProtectHours: number;
  /** prior の3成分の重み（w_f·freshness + w_v·velocity + w_e·engagement）。 */
  prerankWeights: { w_f: number; w_v: number; w_e: number };
  /** freshness = exp(-age_hours/τ) の τ（時間）。大きいほど減衰が緩やか。 */
  prerankTau: number;
  /** discovery.via 別の prior 加点（探索経路の事前優先度）。 */
  viaBoost: Record<string, number>;
}

/**
 * 全 34 ソース。2026-06-11 収集最適化（PR-6）:
 *  - 転換ゼロの英語/非日本語アカ 4 件を除去（gerardsans/csaba_kissi/jason_coder0/Fluyeporlaweb。
 *    本番実測で collected 多数・queued 0・低 avg。探索は handle 限定でないので同じツイートは
 *    keyword/trend 経由で拾い得る＝取りこぼしリスクは低い）。
 *  - ai_official に Google系/主要ラボ/開発ツール/Anthropic製品 計 10 アカを追加（公式速報の一次ソース・
 *    inbox セーフガード対象）。dashboard の AI_OFFICIAL_HANDLES と同期させること。
 * jp_publisher 16 / ai_official 13 / en_curator 5。
 */
export const COLLECTOR_CONFIG: CollectorConfig = {
  watchlist: [
    // --- jp_publisher: 日本語 AI 発信者（実分布で ja 優勢を確認）---
    { handle: "Shimayus", category: "jp_publisher" },
    { handle: "SuguruKun_ai", category: "jp_publisher" },
    { handle: "masahirochaen", category: "jp_publisher" },
    { handle: "ClaudeCode_love", category: "jp_publisher" },
    { handle: "ClaudeCode_UT", category: "jp_publisher" },
    { handle: "obsidianstudio9", category: "jp_publisher" },
    { handle: "MakeAI_CEO", category: "jp_publisher" },
    { handle: "mmmiyama_D", category: "jp_publisher" },
    { handle: "tetumemo", category: "jp_publisher" },
    { handle: "ObsidianOtaku", category: "jp_publisher" },
    { handle: "so_ainsight", category: "jp_publisher" },
    { handle: "daifukujinji", category: "jp_publisher" },
    { handle: "commte", category: "jp_publisher" },
    // lang 不明（テキスト lang null・media/コード中心）。証拠不十分のため据置。
    { handle: "claudecode_lab", category: "jp_publisher" },
    { handle: "Codestudiopjbk", category: "jp_publisher" },
    { handle: "ethancoder0", category: "jp_publisher" },
    // --- ai_official: AI 企業/製品公式（速報の一次ソース・inbox セーフガード対象）---
    { handle: "AnthropicAI", category: "ai_official" },
    { handle: "OpenAI", category: "ai_official" },
    { handle: "GoogleDeepMind", category: "ai_official" },
    // 2026-06-11 追加（Google系 / 主要ラボ / 開発ツール / Anthropic製品）
    { handle: "GoogleAI", category: "ai_official" },
    { handle: "GeminiApp", category: "ai_official" },
    { handle: "xai", category: "ai_official" },
    { handle: "AIatMeta", category: "ai_official" },
    { handle: "MistralAI", category: "ai_official" },
    { handle: "perplexity_ai", category: "ai_official" },
    { handle: "cursor_ai", category: "ai_official" },
    { handle: "vercel", category: "ai_official" },
    { handle: "v0", category: "ai_official" },
    { handle: "claudeai", category: "ai_official" },
    // --- en_curator: 英語/非日本語 AI 解説者（海外バズ早期検知。実分布で ja=0 を確認）---
    // 転換ゼロの gerardsans/csaba_kissi/jason_coder0/Fluyeporlaweb は 2026-06-11 に除去。
    { handle: "Atenov_D", category: "en_curator" },
    { handle: "cyrilXBT", category: "en_curator" },
    { handle: "heynavtoor", category: "en_curator" },
    { handle: "exploraX_", category: "en_curator" },
    { handle: "ai_explorer25", category: "en_curator" },
  ],
  trendWoeids: [23424977],
  scoringWeights: { freshness: 0.3, velocity: 0.3, target_fit: 0.4 },
  maxFetchPerRun: 120,
  maxExploreIterations: 8,
  scoringModel: "claude-sonnet-4-5",
  translationModel: "claude-haiku-4-5-20251001",
  scoringBatchSize: 20,
  autoPromoteDiscoveredSources: false,
  // P2 二段採点（既定 shadow＝挙動不変。enforce 切替は shadow 実証後・人間ゲート）
  prerankMode: "shadow",
  shortlistTopK: 60,
  explorationQuota: 10,
  prerankMaxAgeHours: 72,
  freshnessProtectHours: 6,
  prerankWeights: { w_f: 0.4, w_v: 0.35, w_e: 0.15 },
  prerankTau: 24,
  viaBoost: { fixed: 0, keyword: 0.1, trend: 0.1, user_search: 0.05, following: 0.05 },
};
