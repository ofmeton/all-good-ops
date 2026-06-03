# x-account-system Worker 配線 + backend 実装 設計書

> 作成: 2026-06-03 / 改訂: 2026-06-03（過去ドキュメント網羅レビュー + Codex レビュー反映、v2）
> 対象: `apps/x-account-system`
> 上流 SSOT: `outputs/improvements/x-account-design-consolidated/`（`main-design-all-versions.md` v10.3 / `style-guide-all-versions.md` v1.4 / `initial-values-design.md` / `phase1-day1-runbook.md` / `launch-roadmap.md`）
> 状態: deploy 済 worker（`ofmeton-x-account`、Cloudflare Workers Paid **確定**）は全ハンドラ stub。本設計で `lib/` を配線し、**lib の未実装 production backend も実装**して Phase 1 を実働させる。

## 0. レビューで判明した前提の訂正（v1 → v2）

v1 は「lib は実装済・配線のみ」を前提にしたが、network 横断レビュー + Codex 検証で以下が判明し、スコープ・構造を改訂した:

- **lib の production backend が未実装**（テスト緑は `IN_MEMORY_FALLBACK` 経路のみ）。本番経路は throw / no-op:
  - `runEditor` の LLM judge（Anthropic）が throw（`lib/editor/llm-judge.ts:45-48`）
  - `saveOptimizerState` が throw（`lib/optimizer/state-store.ts:182`）
  - `daily_digest_log` / `optimizer_proposal` への永続化が無い（README のみ）
  - `publishToX` が DB の kill-switch/brownout を見ない（env override のみ、`lib/publisher/x-publisher.ts:40-48`）
  - optimizer の `extractSuccessSignals`/`aggregatePerformanceWindow` も本番 throw（`reward-extractor.ts:49,93`）
  - コードが参照する `safety_state` テーブルの migration が欠落（`kill-switch.ts:69,137`）
  → **「配線」ではなく「配線 + これら backend の実装」がスコープ**（人間決定 2026-06-03）。詳細は §2.2 / §3.6。
- **投稿頻度**: master v10.3 は「1 投稿/日」だが、**人間決定で 3 投稿/日 = 90 本/月**（X API Premium Basic の 100 投稿/月ハードキャップ内。1 投稿/日設計からの意図的拡張）。
- **アーキ**: Codex 推奨に従い **Cloudflare Queues** 分割（`scheduled`=enqueue、consumer で処理）。Workers の `waitUntil` 30 秒 / CPU 制限を回避。
- `process.env`: `nodejs_compat` + `compatibility_date=2026-05-01` で **secret/var は `process.env` に populate される**（Codex 検証）。ただし module top-level read は bridge が間に合わないため、worker entry で保険 bridge を行い、lib は関数内 read に限定する。

## 1. 目的とスコープ

**目的**: Worker の `scheduled()` / `queue()` / `fetch()` を lib に配線し、未実装 backend を実装して Phase 1（人間承認つき **3 投稿/日**）を実働させる。

**スコープ**:
- A. **互換シム**（Workers ランタイム適合）
- B. **未実装 backend の実装**（LLM judge / optimizer Supabase store / digest・optimizer 永続化 / publisher DB gate）
- C. **配線**（cron job 群 + Queues consumer + `/line/webhook` + `/oauth/x/callback`）
- D. **安全装置の完全配線**（kill-switch / brownout 4 段階 / rollback-monitor / 予算 / 投稿枠監視）

**非スコープ**: IG 投稿自動化（H-6 別途）。Optimizer のアルゴリズム変更。note 記事の自動投稿（note は送客のみ、手動公開）。

**安全制約（不変）**: `AUTONOMOUS_PUBLISH=false` / `PHASE=1`。自動 live 投稿は恒久ブロック。X publish は **LINE 承認 postback 経由のみ**。

## 2. アーキテクチャ（Workers + Queues）

```
scheduled(cron) ─→ ジョブを Queue に enqueue（軽量・即終了）
queue(batch) ─→ consumer: 各 job を実処理（draft→editor→persist→LINE / digest / optimizer / ingest …）
fetch(req):
  POST /line/webhook ─→ 署名検証(WebCrypto) → Queue に {approve|reject|interview} を enqueue → 即 200
  GET  /oauth/x/callback ─→ PKCE 交換（同期・軽量）
  GET  /health
```

- **`scheduled` / webhook は軽量化**（enqueue のみ）。重い処理（LLM・publish）は **Queue consumer** に逃がす。各メッセージに冪等キー（`job:(date,slot)` / `draft_id` / `event_id`）。
- **`lib/` は原則温存**。改修は下記の **B（backend 実装）** と互換シムに限定。
- **`src/`**: `worker.ts`（entry + ルーティング）/ `src/queue.ts`（consumer）/ `src/jobs/<job>.ts`（orchestrator）/ `src/env-bridge.ts`。

### 2.1 互換シム（A）

| # | 対象 | 現状（file:line） | 変更 |
|---|---|---|---|
| S1 | hook 分類器 | `classify.ts:13` が `node:child_process` で `classify.py` spawn | `lib/hook-classifier/classify-rules.ts`（純 TS 移植）。正規表現は **`u` flag + `\u{1F300}` 形式**（emoji astral `classify.py:79-80`、`[一-龯]` 等）。`classify.ts` は TS 版を使い child_process 撤去。**Python 出力との parity を fixture テスト（20+ ケース）で担保** |
| S2 | 静的 config | `budget-calculator.ts:118` CSV / `fallback/trigger.ts:44` YAML を `node:fs` 読み | TS 定数（`cost-model.ts` / `channels.ts`）化し import、`node:fs` 除去 |
| S3 | crypto | LINE 署名未実装 / PKCE は `pkce-test.ts:27` の node:crypto（CLI のみ） | **WebCrypto**(`crypto.subtle` HMAC-SHA256 / digest SHA-256 / base64url) で LINE 署名検証 + PKCE 実装。Workers の WebCrypto で十分（Codex 確認） |
| S4 | digest module 分離 | `digest.ts:19` が `dotenv/config`、`:136` に CLI `process.argv`、`:104` axios | Worker 用 entry から dotenv/CLI を分離。LINE 送信は **`fetch()` 直書き**（axios 排除、`line-flow.ts:238` も同様） |
| S5 | env 注入 | lib は `process.env.*`、worker は `env`。lib に **module top-level read が実在**（`reward-extractor.ts:16` / `state-store.ts:19` / `digest.ts:23` / `kpi-collector.ts:12` / `brownout-handler.ts:16`） | **主**: `nodejs_compat`(compat_date 2026-05-01 ≥ 2025-04-01) の **native populate に依拠**（ランタイムが module 評価前に vars/secrets を `process.env` に注入するため top-level read も成立）。**要実機検証**（`wrangler tail` で top-level read 時点の値確認）。**保険**: `src/env-bridge.ts` の bridge は top-level read には間に合わない（static import 後評価のため）ので defense-in-depth 限定。**`SUPABASE_SCHEMA="xad"` を `wrangler.toml [vars]` に追加**（非機密、現状 [vars] 未追加） |

ビルド時ガード: `worker:bundle-check`（`wrangler deploy --dry-run` 出力を grep）で `node:child_process` / `node:fs` 残留を検出して fail。

### 2.2 未実装 backend の実装（B）

| backend | 現状 | 実装方針 |
|---|---|---|
| LLM judge | `llm-judge.ts:45-48,117-124` が throw（Anthropic 未実装） | Anthropic Messages API（tool_use で `LlmJudgeResult` 型固定）を実装。`runEditor` Stage 2 を本番動作化。予算ガード下で呼ぶ |
| optimizer state | `state-store.ts:182-210` が throw（Supabase backend 未実装）。**reward-extractor の `extractSuccessSignals`/`aggregatePerformanceWindow` も本番 throw**（`reward-extractor.ts:49,93`） | `xad.optimizer_proposal` + 新規 `xad.optimizer_state`（migration 0007 同梱）で load/save 実装。reward-extractor の posted_records 集計も Supabase 実装 |
| safety_state | コードが `safety_state` を参照・upsert（`kill-switch.ts:69,137`）するが **migration が存在しない** | **migration 0007 に `xad.safety_state` を新規作成**（kill-switch / publisher gate / brownout 状態の永続化先） |
| digest 永続化 | `runDailyDigest` に `daily_digest_log` insert 無し | digest 実行結果を `xad.daily_digest_log` に記録 |
| optimizer 永続化 | posterior 更新結果の保存無し | `runOptimizerUpdate` 結果を `xad.optimizer_proposal` に保存 |
| publisher gate | env override のみ | `publishToX` 直前に DB の kill-switch / brownout を確認（`assertPublishingEnabled()`） |

`@supabase/supabase-js` は Workers で動作（Codex 確認）。`{db:{schema:'xad'}}` は exposed schema 前提（適用済 2026-06-03、本設計 §6 で再検証）。

## 3. ハンドラ配線（C）

### 3.1 投稿系（3 slot / 時間帯 band）

cron は **3 投稿/日**に是正（v1 の 5 slot を撤回）。slot を initial-values §3.1 の時間帯 band に対応:

| job | JST | time-band | 主形式（例） |
|---|---|---|---|
| `post-morning` | 07:00 | morning | 失敗談先行 / 業務効率化 |
| `post-noon` | 12:00 | noon | ROI Before-After |
| `post-evening` | 19:00 | evening | note 送客（集客導線 B） |

> 集客導線 C（末尾「→プロフィール参照」）は **Phase 2**（master L558/L918）なので Phase 1 では使わない。時間帯 band は Optimizer の学習対象パラメータ（initial-values §8）。

**フロー（enqueue → consumer）**:
```
scheduled(post-*) → Queue enqueue {job, date, slot}
consumer:
  1. ガード: kill-switch(xad) / brownout 段階(§4) / 月予算(cost_ledger) / X投稿枠(§4) を確認 → 越え/停止段階なら skip + 理由ログ
  2. idea: xad.core_ideas から status='queued' を band に応じ 1 件 dequeue（空なら skip + LINE 通知）
  3. draft: draftForX(idea)
  4. 審査: runEditor(...)（LLM judge backend 実装済）→ approved/rejected
  5. 永続化: xad.post_drafts (status='pending_approval', draft_id, slot, idea_id)。冪等: (date,slot) 一意制約（migration 0007）
  6. LINE 承認依頼: Flex push（プレビュー + [承認][却下] postback data=approve:<draft_id>/reject:<draft_id>）。rejected は push せず却下理由を daily_digest に計上
```

### 3.2 `/line/webhook`（POST）

```
1. 署名検証: X-Line-Signature を WebCrypto HMAC-SHA256(body, LINE_CHANNEL_SECRET) と照合。不一致 401
2. 即 Queue enqueue（event_id 冪等）→ 200 を即返す（LINE 2xx 要件）
consumer:
  a. postback approve:<draft_id>: post_drafts load（published/rejected は冪等 no-op）→ assertPublishingEnabled()
     → publishToX（**note 送客 URL に utm_attribution 付与: utm_source=x_post**）→ status='published' + posted_records + LINE 完了通知。失敗は status='publish_failed' + 理由 + LINE
  b. postback reject:<draft_id>: status='rejected' + reason、daily_digest 計上
  c. text message: interviewer（session を xad.interview_sessions に永続化、§3.6）→ finalize で materials_store/interview_records
  d. consultation_request（form 経由のテキスト/問い合わせ）: attribution として記録（master L137）
3. MA/LLM session 終了時は retrieve→archive を強制（idle 課金リーク防止、master §8.1.6）
```

### 3.3 ingest 系

| job | JST/頻度 | 内容 |
|---|---|---|
| `buzz-ingest` | 日次 06:00 | twitterapi.io 海外/国内 → 正規化 → xad。content seed を `core_ideas` に queued 投入 |
| `github-trending` | **日次 07:00（H-14、v1 欠落を追加）** | GitHub Trending 取得 → `raw/publishing/github-trending/` 相当 → core_ideas 供給（style-guide v1.4 日次化 SSOT） |
| `inspirations-ingest` | 週次 月 09:00 | 海外≥1/国内≥1/note≥1 |

### 3.4 digest / optimizer / rollback / rotation

| job | JST | 内容 |
|---|---|---|
| `daily-digest` | 21:00 | runDailyDigest → KPI(xad) 集計 + **X投稿枠/LINE枠 残量** → LINE 配信 → daily_digest_log 記録（backend 実装） |
| `optimizer-update` | 23:00 | runOptimizerUpdate → posted_records signal → posterior 更新 → optimizer_proposal 保存（backend 実装） |
| **`rollback-monitor`** | **2h 毎（v1 欠落を追加）** | `lib/safety/rollback-monitor.ts` 配線。PCR 異常ドロップ検知 → LINE 警告。**注: 現コードは検知のみで snapshot 復帰が no-op（`rollback-monitor.ts:101`）→ snapshot 復帰実処理は PR-W5 で実装**（runbook §3.3 Day1 必須ガード） |
| `rotation-notice` | 月初 | X/Meta token expires_at 監視 → 期日接近で LINE 通知 |

### 3.5 `/oauth/x/callback`（GET）

PKCE Step 2: code + code_verifier（**KV に TTL 5 分で一時保存**した state 紐付け。「PKCE code は 30 秒〜数分で expire」整合）→ token 交換（WebCrypto）→ X tokens 更新。

### 3.6 状態モデル（xad）

**⚠️ 既存 DDL の列名に厳密に合わせる**（Codex 検証で v1 の発明列名が実態とズレと判明）:

| table | 役割 | 既存列（`0002_posts_performance.sql` 他）/ 0007 追加 |
|---|---|---|
| `core_ideas` | 投稿ネタキュー | **既存 `status`= draft/approved/published/rejected/archived**（v2 の queued/used は使わない。idea 供給は `status='draft'` を未消費とみなす運用、または 0007 で `pipeline_status` 列追加。実装時に確定） |
| `post_drafts` | draft + 承認状態 | **既存 `id` / `editor_status` / `human_approval_status`**（v1 の status/date/slot/draft_id は誤り）。0007 で `(scheduled_date, slot)` 一意制約 + 必要列を追加 |
| `posted_records` | 公開済 + metrics | 既存 |
| `interview_records` | interviewer 完了素材 | 既存 |
| `interview_sessions` | interviewer 途中状態（Workers ステートレス対策） | **新規 0007** |
| `optimizer_state` | Optimizer posterior 永続 | **新規 0007** |
| `safety_state` | kill-switch / brownout / publisher gate 状態（コード参照済だが migration 欠落） | **新規 0007（必須）** |
| `cost_ledger` / `optimizer_proposal` / `daily_digest_log` | 予算 / 提案 / digest 履歴 | 既存（書込を backend 実装） |

> 実装 PR の最初に **既存 migration 0001-0006 の実 DDL を inspect**（`feedback_db_migration_pre_inspect`）し、列名・型・制約を確定してから 0007 を書く。
> 注: `phase1-day1-runbook.md §1.3` は接続確認テーブルに `optimizer_state` / `attribution_events` を挙げるが後者は実在せず（実体は `performance_metrics` / `business_outcomes`）。runbook の当該記述は誤りとして別途修正対象。

migration は本プロジェクト方針（`migrations/000N_*.sql` + MCP apply、CLI db push 不可）に従い **0007** を追加。0007 は `interview_sessions` / `optimizer_state` / `safety_state` 新規 + `post_drafts` 制約/列追加 を含む。

## 4. エラーハンドリング / 安全装置

- **kill-switch**: 全 LLM/publish 前に xad の kill-switch を確認。LINE `!stop`→ON（既存）。
- **brownout 4 段階**（master §8.1.5、v1 単一閾値を是正）:

  | 月コスト | 挙動 |
  |---|---|
  | ¥10,000 | Writer retry reject + Optimizer downgrade |
  | ¥11,500 | 投稿 + Interviewer + Optimizer 全停止（**Daily Digest は止めない**） |
  | ¥12,500 | 全 cron 停止、LINE のみ |
  | ¥13,800 | 即エスカレーション、cron 完全停止 |

- **rollback-monitor**: §3.4 で 2h 毎発火（runbook Day1 必須）。
- **投稿枠監視**: X 100/月（3×30=90、retry 余裕監視）・LINE push 200/月（承認 90 + digest 30 ≈ 120）を daily-digest で残量表示。接近時は LINE 警告。
- **冪等性**: post job `(date,slot)` DB 一意制約 + Queue メッセージ冪等キー。承認 postback は draft status で二重 publish 防止。
- **Queue リトライ**: consumer 失敗は Queue の retry。**`max_batch_size=1`**（または message ごとに `ack()`/`retry()` を明示）で「batch 1 件失敗→全体 retry」を回避。毒メッセージは **DLQ**（`dead_letter_queue` 設定）。Cloudflare Queues は Paid で月 1,000,000 operations included。
- **LINE 2xx**: webhook は署名後即 enqueue→200。重処理は consumer。

## 5. テスト戦略

- **互換シム**: classify-rules parity（py 出力 fixture と 95%+ 一致）/ WebCrypto 署名一致・不一致 / bundle-check（node:* 残留 fail）。
- **backend**: LLM judge（Anthropic mock で tool_use 応答→`LlmJudgeResult`）/ optimizer store 往復 / digest・optimizer 永続化 insert / publisher DB gate（kill-switch ON で publish 阻止）。
- **配線**: queue consumer の各 job 分岐（Env mock + `publishToX.__setFetchImpl` で X 投稿スタブ）/ webhook 分岐 / 冪等（同 event 二重）。
- **回帰**: 既存 148 テスト緑維持。citation ≥65% / hashtag 0 を editor 経路で enforce している回帰観点を追加（smoke）。
- **dry-run**: `worker:dryrun`（scheduled 手動 invoke → enqueue 確認）。

## 6. ビルド & デプロイ

- **Queues セットアップ**: `wrangler.toml` に producer/consumer binding + DLQ。`[vars] SUPABASE_SCHEMA="xad"` 追加。cron を 3 投稿 + buzz/github-trending/inspirations/digest/optimizer/rollback-monitor/rotation に是正。
- **Supabase**: `xad` exposed schema 済（2026-06-03）+ migration 0007 を MCP apply。接続を実機再検証。
- **段階デプロイ**: PR ごとに `wrangler deploy --dry-run`（bundle-check）→ deploy → smoke（`/health` / `wrangler tail` で stub→実処理 / テスト postback で承認→publish は `__setFetchImpl` で本番回避、最終は soft launch 当日 1 本）。

## 7. 段階実装（PR 分割）

1. **PR-W1**: 互換シム S1-S5（classify-rules + parity / config bundle / WebCrypto util / digest 分離 / env-bridge + vars）+ bundle-check。
2. **PR-W2**: backend 実装 B（LLM judge / optimizer store / digest・optimizer 永続化 / publisher gate）+ migration 0007（interview_sessions / optimizer_state / post_drafts 一意制約）。
3. **PR-W3**: Queues 基盤 + 投稿系配線（enqueue→consumer: idea dequeue→draftForX→runEditor→post_drafts→LINE 承認）。
4. **PR-W4**: `/line/webhook`（署名 + approve→publishToX+utm / reject / interviewer 永続化 / consultation）。
5. **PR-W5**: ingest（buzz/github-trending/inspirations）+ digest + optimizer + rollback-monitor + rotation + oauth callback + brownout 4 段階。

**PR-W1〜W4 完了で launch critical（3 投稿/日 承認フロー + 安全装置）が実働**。W5 で全自動化。

## 8. リスクと未確定

- **LLM judge コスト**: Editor 全件で Anthropic 呼び出し → 予算（月¥10,000）への寄与を実測。brownout 段階で Optimizer/retry を絞る設計で吸収。
- **classify parity**: 移植差分は fixture 95%+ 基準、未達は人間確認。
- **core_ideas 初期キュー**: launch 前に初期 seed（`phase1-month1` C-2 等）投入が運用前提。
- **Queues 課金**: Cloudflare Queues は操作課金あり。3 投稿/日規模では小さい想定だが Paid プラン枠内を確認。
- **X publish 本番 E2E**: 承認→publish の実投稿は soft launch 当日 1 本で確認（事前は `__setFetchImpl`）。
- **X 投稿枠の実値**: handson は「Premium Basic 100/月」と記載だが、X 公式 docs は現状 pay-per-use 表記で 100/月 cap は公開 docs から確証できない（Codex 指摘）。3/日=90/月 は保守的だが、**実契約の quota を X developer console で要確認**。超過時は 2/日へ縮退。
- **wrangler.toml 是正**: 現行は 5投稿/日相当 + Queues/github-trending/rollback-monitor 無し。PR で 3投稿/日 + Queues binding + 追加 cron へ更新（実装タスク）。
- **CPU/wall**: consumer 分割で 1 メッセージ 1 処理に縮小、editor 多段が重い場合はさらに step 分割。
