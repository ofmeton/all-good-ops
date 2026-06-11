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
  /** L9: dedup ウィンドウ（日。これより古い同一 tweet_id は無視＝実質 tweet_id unique 依存） */
  dedupWindowDays: number;
  /** L2: 新ソース候補を即 watchlist 昇格しない（常に candidate_sources へ） */
  autoPromoteDiscoveredSources: false;
}

/**
 * 全 28 ソース（旧 buzz-ingest の SEED_SOURCES 由来。buzz-ingest は legacy retire で削除済）。
 * 2026-06-11: category を本番 materials_store の実言語分布で裏取りし再分類（jp_publisher に紛れていた
 *   英語/非日本語アカ 8 件を en_curator へ）。lane（要件4）は category でなく per-material の lang で
 *   決まるため機能影響はないが、SSOT 正確性のため修正。
 * jp_publisher 16 / ai_official 3 / en_curator 9。
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
    // --- ai_official: AI 企業公式（速報の一次ソース・inbox セーフガード対象）---
    { handle: "AnthropicAI", category: "ai_official" },
    { handle: "OpenAI", category: "ai_official" },
    { handle: "GoogleDeepMind", category: "ai_official" },
    // --- en_curator: 英語/非日本語 AI 解説者（海外バズ早期検知。実分布で ja=0 を確認）---
    { handle: "gerardsans", category: "en_curator" },
    { handle: "csaba_kissi", category: "en_curator" },
    { handle: "Atenov_D", category: "en_curator" },
    { handle: "cyrilXBT", category: "en_curator" },
    { handle: "heynavtoor", category: "en_curator" },
    { handle: "exploraX_", category: "en_curator" },
    { handle: "Fluyeporlaweb", category: "en_curator" },
    { handle: "jason_coder0", category: "en_curator" },
    { handle: "ai_explorer25", category: "en_curator" },
  ],
  trendWoeids: [23424977],
  scoringWeights: { freshness: 0.3, velocity: 0.3, target_fit: 0.4 },
  maxFetchPerRun: 120,
  maxExploreIterations: 8,
  scoringModel: "claude-sonnet-4-5",
  translationModel: "claude-haiku-4-5-20251001",
  scoringBatchSize: 20,
  dedupWindowDays: 14,
  autoPromoteDiscoveredSources: false,
};
