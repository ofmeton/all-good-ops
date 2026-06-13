# X performance_metrics 取込みパイプライン 設計（metrics-ingest）

## Context（なぜ）

optimizer 再設計 Stage 2A で reward 配線を修復したが、本番の `xad.performance_metrics` が **0 行**（posted_records=11）と判明。engagement 実績（impressions / profile_clicks / url_link_clicks）の取込みが存在しないため、Thompson は学習燃料ゼロのまま。本機能はその供給源を作る。

関連: [[project_x_optimizer_redesign]] / reward 消費側 = `lib/optimizer/reward-extractor.ts`（impressions / pcr / url_link_clicks を読む）。

## ゴール / 非ゴール

- **ゴール**: 公開済みツイートの engagement を `performance_metrics` に自動取込みし、optimizer の reward を満たす。
- **非ゴール（YAGNI・後続）**: business_outcomes（売上 attribution）/ 時系列スナップショット（成熟度正規化）/ 公開時 tweet_id 捕捉 / Instagram・note のメトリクス。

## データソースの決定

reward に必要な3値（impressions / user_profile_clicks / url_link_clicks）は **X API v2 の `non_public_metrics` 一択**。twitterapi.io は likes/RT/views 止まりで profile_clicks / url_link_clicks / impressions を返さない。
本人トークンは `xad.oauth_tokens`（provider='x'、scope `tweet.read users.read offline.access`、`rotation-job` で自動 refresh）で利用可。`/2/tweets/:id` / `/2/users/:id/tweets` の non_public_metrics は **本人・公開30日以内**で取得可（`lib/oauth/pkce-test.ts` で実証済）。コスト ≈ ¥0.5/req。

## アーキテクチャ

新 cron job **`metrics-ingest`** を1本追加。LLM 不使用・**読み取り専用**（投稿しない＝人間ゲート不要、cron 自動化 OK）。タイムライン照合 backfill 方式で、公開フロー（chrome-devtools 半手動）は無改修・既存公開分も拾う。

新規モジュール `lib/metrics/`（責務分離）:
- `x-metrics-client.ts` — X API v2 呼び出し（`/2/users/me`、`/2/users/:id/tweets?tweet.fields=public_metrics,non_public_metrics,created_at`、ページング）。`token-store.ts` からトークン取得。
- `match.ts` — 本文正規化＋公開時刻窓で tweet ↔ published `post_drafts` を照合（純関数・テスト容易）。
- `ingest.ts` — オーケストレーション（取得→照合→upsert→cost記録）。`runMetricsIngest()` を export。

## データフロー

1. **トークン**: `getXAccessToken()` / `ensureFreshToken()`（`lib/publisher/token-store.ts`）。失敗時は skip＋警告（kill-switch は publishing 用なので metrics には波及させない）。
2. **本人ID**: `GET /2/users/me` で user id（1 run 1回）。
3. **タイムライン**: `GET /2/users/:id/tweets?max_results=100&tweet.fields=public_metrics,non_public_metrics,created_at`（直近のみ・必要に応じ1〜数ページ）。
4. **照合（`match.ts`）**: tweet 本文と `post_drafts.body`（`published_at IS NOT NULL`）を `normalize()`（前後空白除去 / 連続空白圧縮 / 末尾URL・t.co除去 / 全角半角・絵文字差の吸収は最小限）して比較。**正規化一致 ＋ 公開時刻が tweet `created_at` の ±窓（例 ±24h）** で高確度マッチ。thread（`fmat='thread'`）は先頭セグメントで照合。**曖昧（複数 draft 該当）・不一致は skip＋ログ**（誤紐付けしない）。
5. **書き込み（upsert・冪等）**:
   - `posted_records`: `(draft_id, platform='x', platform_post_id=tweet_id, posted_at=tweet.created_at)`。tweet_id で冪等 upsert。
   - `performance_metrics`: **posted_record あたり1行＝最新スナップショット upsert**。`impressions / user_profile_clicks / url_link_clicks / pcr(=user_profile_clicks/impressions、impressions=0 は null) / like_count / retweet_count / reply_count / quote_count / bookmark_count / measured_at=now / funnel_stage`。
6. **コスト**: `recordCostLedger({category:'x_api_metrics', costJpy≈0.5×reqCount, unitCount:reqCount})`（`lib/cost/cost-ledger.ts`、fail-open）。1 run 数 req＝**月 <¥60** 想定。

## upsert キーと冪等性

- `posted_records`: `platform_post_id`（tweet_id）に一意制約が無い場合は migration で `unique(platform, platform_post_id)` を追加し `onConflict` upsert。
- `performance_metrics`: 最新スナップショット方針のため `unique(posted_record_id)` を migration で追加し `onConflict: posted_record_id` upsert（reward-extractor が `[0]` を読む前提と整合）。
  - 注: スキーマは時系列対応（idx posted_record_id, measured_at）だが、MVP は1行/postに限定。時系列化は後続。

## 運用

- **cron**: 毎日 **20:00 JST = `0 11 * * *`**（daily-digest 21:00 / optimizer-update 23:00 の前に metrics を満たす）。`wrangler.toml` crons に追加。
- **手動**: `/admin/enqueue?job=metrics-ingest`（`CRON_JOBS_BY_NAME` に追加）。
- **brownout**: 読み取り＝`daily-digest` と同列で reduced/stop_posting 状態でも許可（`brownout-handler.ts` の allowedJobs）。

## エラー処理

fail-open（job 本体は throw しない・queue ACK）。トークン refresh 失敗・API エラー・照合不一致は **当該分のみ skip＋構造化ログ**、他は継続。non_public_metrics が30日超で欠ける tweet は **public_metrics のみ記録**（impressions/profile/url は null、reward 側は null→0 既定）。

## テスト（TDD）

- `match.ts`: `normalize()` の正規化、正規化一致＋時刻窓でマッチ、複数該当は skip、時刻窓外は skip。
- レスポンス→行マッピング: non_public_metrics→performance_metrics 行、pcr 計算（impressions=0 で null）、public_metrics 欠損の null 安全。
- 冪等性: 同一 tweet 再取込みで posted_records / performance_metrics が重複しない（upsert）。
- `x-metrics-client`: fetch をモックしレスポンス整形・ページング・トークンヘッダ付与を検証（in-memory fixture）。

## 触るファイル

- 新規: `lib/metrics/{x-metrics-client,match,ingest}.ts` ＋ テスト。
- 改修: `src/worker.ts`（JobMessage union ＋ CRON_JOBS ＋ CRON_JOBS_BY_NAME）/ `wrangler.toml`（cron）/ `src/queue.ts`（`case "metrics-ingest"`）。
- migration `0022_metrics_ingest.sql`: `posted_records` に `unique(platform, platform_post_id)`、`performance_metrics` に `unique(posted_record_id)`。
- 再利用: `lib/publisher/token-store.ts` / `lib/cost/cost-ledger.ts` / `lib/oauth/pkce-test.ts`（X API 呼び出しの参照実装）。

## 検証（実装後）

- 単体: 上記 TDD 緑。
- 本番実証（`prod-lib-diag`）: 本番トークンで `runMetricsIngest()` をローカル tsx 実行 → posted_records / performance_metrics が埋まり、`extractSuccessSignals` が非空を返すこと、timeBand/hook/fmat が実値分布することを確認（Stage 2A の配線が初めて燃料を得る）。
