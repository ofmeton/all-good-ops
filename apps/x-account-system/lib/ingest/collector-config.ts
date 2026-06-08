/**
 * lib/ingest/collector-config.ts — Collector の数値・設定系レバー SSOT。
 * 改善レバー L1/L2/L4/L7/L8/L9/L10 はここを編集する（散在禁止）。
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
  /** L8: 1 run で fetch する最大件数（budget 上限） */
  maxFetchPerRun: number;
  /** L8: 探索ループの最大反復（agent の tool_use 往復上限） */
  maxExploreIterations: number;
  /** L7: scoring モデル */
  scoringModel: string;
  /** L8: scoring の1バッチ件数 */
  scoringBatchSize: number;
  /** L9: dedup ウィンドウ（日。これより古い同一 tweet_id は無視＝実質 tweet_id unique 依存） */
  dedupWindowDays: number;
  /** L2: 新ソース候補を即 watchlist 昇格しない（常に candidate_sources へ） */
  autoPromoteDiscoveredSources: false;
}

/**
 * 全 28 ソース（旧 buzz-ingest の SEED_SOURCES 由来。buzz-ingest は legacy retire で削除済）。
 * jp_publisher 24 件 / ai_official 3 件 / en_curator 1 件。
 */
export const COLLECTOR_CONFIG: CollectorConfig = {
  watchlist: [
    // --- jp_publisher: 既存信頼 4 アカ ---
    { handle: "Shimayus", category: "jp_publisher" },
    { handle: "SuguruKun_ai", category: "jp_publisher" },
    { handle: "masahirochaen", category: "jp_publisher" },
    { handle: "ClaudeCode_love", category: "jp_publisher" },
    // --- jp_publisher: ユーザー追加 20 アカ ---
    { handle: "ClaudeCode_UT", category: "jp_publisher" },
    { handle: "obsidianstudio9", category: "jp_publisher" },
    { handle: "MakeAI_CEO", category: "jp_publisher" },
    { handle: "mmmiyama_D", category: "jp_publisher" },
    { handle: "tetumemo", category: "jp_publisher" },
    { handle: "claudecode_lab", category: "jp_publisher" },
    { handle: "ObsidianOtaku", category: "jp_publisher" },
    { handle: "so_ainsight", category: "jp_publisher" },
    { handle: "Codestudiopjbk", category: "jp_publisher" },
    { handle: "exploraX_", category: "jp_publisher" },
    { handle: "jason_coder0", category: "jp_publisher" },
    { handle: "heynavtoor", category: "jp_publisher" },
    { handle: "ethancoder0", category: "jp_publisher" },
    { handle: "cyrilXBT", category: "jp_publisher" },
    { handle: "daifukujinji", category: "jp_publisher" },
    { handle: "Fluyeporlaweb", category: "jp_publisher" },
    { handle: "commte", category: "jp_publisher" },
    { handle: "csaba_kissi", category: "jp_publisher" },
    { handle: "ai_explorer25", category: "jp_publisher" },
    { handle: "Atenov_D", category: "jp_publisher" },
    // --- ai_official: AI 企業公式（速報の一次ソース）---
    { handle: "AnthropicAI", category: "ai_official" },
    { handle: "OpenAI", category: "ai_official" },
    { handle: "GoogleDeepMind", category: "ai_official" },
    // --- en_curator: 英語 AI 解説者（海外バズ早期検知）---
    { handle: "gerardsans", category: "en_curator" },
  ],
  trendWoeids: [23424977],
  scoringWeights: { freshness: 0.3, velocity: 0.3, target_fit: 0.4 },
  maxFetchPerRun: 120,
  maxExploreIterations: 8,
  scoringModel: "claude-sonnet-4-5",
  scoringBatchSize: 20,
  dedupWindowDays: 14,
  autoPromoteDiscoveredSources: false,
};
