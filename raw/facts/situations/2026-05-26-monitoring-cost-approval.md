---
date: 2026-05-26
category: situations
source: session
---

# x-account-design 定点観測コスト承認 (Phase 1 着手から有効化)

ユーザーが 2026-05-26 セッションで明示承認:

> 「定点観測もコストそれくらいならしちゃおう。」

## 承認された月次定常コスト (¥260 追加)

| 項目 | 月額 | 用途 |
|---|---:|---|
| twitterapi.io 週次定点 + 月次新規発掘 | ¥120/月 | 24 アカ (信頼 4 + ユーザー追加 20) × 週次 50 tweets + 月次新規発掘 5 query (v10.3 §3.1.1) |
| source_ingestion_analysis_monthly (Sonnet 4.6) | ¥140/月 | 月次 24 アカ source-ingestion 9 項目質的分析 (v10.3 §4.8、トレンド追跡) |
| **追加合計** | **¥260/月** | **月予算 ¥10,000 内、expected ¥9,154 + ¥260 ≒ ¥9,414 = 余裕 ¥586** |

## 有効化タイミング

- v10.3 設計 + Phase 0 v2 実 API call 完了後 (= Phase 1 着手と同時)
- 着手後 cron は毎週月曜 09:00 JST 起動
- 月次 refresh は毎月 1 日 10:00 JST 起動 (Optimizer Phase 3 月次ジョブに統合)

## 想定アウトプット

- inspirations ingest: 週次 ≥ 3 件、wiki/publishing/inspirations/ 蓄積
- 月次 source-ingestion 分析: optimizer_competitor_meta テーブル更新 + trend 提示
- Phase 2 移行時の業種特化/横断/アグリゲーター選択 (R-12) の根拠データ

## 関連

- v10.3 §3.1.1 / §4.8 / §6.4
- cost-model.csv (twitterapi_io / source_ingestion_analysis_monthly)
- query-design.md / source-ingestion-analysis-template.md
