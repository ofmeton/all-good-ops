/**
 * lib/check/check-config.ts — チェックAg(MA checker) の数値・設定レバー SSOT。
 * 改善はここを編集する（散在禁止）。投機的レバーは置かない（必要時に追加）。
 */
export interface CheckConfig {
  /** checker モデル（ファクトは「明らかに変か」の低い bar なので安価な haiku で可） */
  checkerModel: string;
  /** 1 job 実行で点検する最大ドラフト数（wall-clock bound。MA session ~web で十数秒/件） */
  maxCheckPerRun: number;
  /** 重複比較に使う直近投稿の遡及日数 */
  recentPostsLookbackDays: number;
  /** 1 MA session の wall-clock 上限 */
  timeoutMs: number;
  /** suspicious/similar で差し戻し再生成する最大回数。これ以上は flag を付けて人間へ回す（ループ停止の上限）。 */
  maxRedoAttempts: number;
}

export const CHECK_CONFIG: CheckConfig = {
  checkerModel: "claude-haiku-4-5",
  maxCheckPerRun: 5,
  recentPostsLookbackDays: 14,
  timeoutMs: 120_000,
  maxRedoAttempts: 2,
};
