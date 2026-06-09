/**
 * lib/curation/compose-config.ts — 執筆Ag(MA writer) の数値・設定レバー SSOT。
 * 改善はここを編集する（散在禁止）。投機的レバーは置かない（必要時に追加）。
 */
export interface ComposeConfig {
  /** writer モデル（投稿品質。cost と相談） */
  writerModel: string;
  /** 1 job 実行で処理する最大素材数（wall-clock bound。MA session ~12s/件） */
  maxComposePerRun: number;
  /** 1 MA session の wall-clock 上限 */
  timeoutMs: number;
  /** 素材に template_id が無い時に使う既定テンプレ ID（compose-templates.ts と一致）。 */
  defaultTemplateId: string;
}

export const COMPOSE_CONFIG: ComposeConfig = {
  // P2: 永続 writer agent は opus-4-8 で執筆（cost は cost-of の opus-4-8 override 5/25 で計上）。
  writerModel: "claude-opus-4-8",
  maxComposePerRun: 3,
  timeoutMs: 120_000,
  defaultTemplateId: "template_chaen_gold",
};
