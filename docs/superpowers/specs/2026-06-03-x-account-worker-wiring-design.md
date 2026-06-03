# x-account-system Worker 配線 設計書

> 作成: 2026-06-03 / 対象: `apps/x-account-system`
> 上流: `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md`（v10.3）/ `phase1-day1-runbook.md`
> 状態: deploy 済 worker は全ハンドラ stub。本設計で `lib/`（実装済・テスト通過）を `src/worker.ts` に配線し、Phase 1 を実働させる。

## 1. 目的とスコープ

**目的**: Cloudflare Worker `ofmeton-x-account` の `scheduled()` / `fetch()` を、既存 `lib/` の実装に配線し、Phase 1（人間承認つき 1 投稿/日）を実働させる。

**スコープ（フル配線）**:
- cron 10 本全て（投稿×5 / buzz-ingest / inspirations-ingest / daily-digest / optimizer-update / rotation-notice）
- `/line/webhook`（署名検証 + 承認 postback + interviewer text）
- `/oauth/x/callback`（PKCE token 交換）

**非スコープ**: 新規 lib ロジックの機能追加（既存を配線するのみ）。IG/note 投稿の自動化（Phase 1 は X+note 中心、IG は H-6 別途）。Optimizer のモデル変更。

**安全制約（不変）**: `AUTONOMOUS_PUBLISH=false` / `PHASE=1`。**自動 live 投稿は恒久ブロック**。X publish は LINE 承認 postback 経由のみ。

## 2. アーキテクチャ（Workers 完結）

単一 Worker ランタイム。

```
scheduled(cron) ─→ dispatch(job) ─→ src/jobs/<job>.ts ─→ lib/* 合成
fetch(req) ─→ ルート分岐:
  POST /line/webhook ─→ 署名検証 ─→ {postback: approve/reject | text: interviewer}
  GET  /oauth/x/callback ─→ lib/oauth PKCE 交換
  GET  /health ─→ 既存
```

- **`lib/` は原則そのまま温存**（テスト資産を壊さない）。**例外は 2 箇所のみ**: (a) `hook-classifier/classify.ts` の `child_process` 経路撤去（§S1）、(b) `interviewer/line-flow.ts` の in-memory session を DB-backed 化（§3.5、テストも更新）。それ以外の lib は無改修。
- **`src/jobs/`（新規）に薄い orchestrator** を置き、job ごとに既存 lib 関数を合成。worker グルーは `src/` に集約。
- 主要 lib エントリ（実在）: `runEditor`（editor/pipeline）/ `draftForX`(writer/writer-x) / `publishToX`(publisher/x-publisher) / `runDailyDigest`(dashboard/digest) / `runOptimizerUpdate`(optimizer/update-loop) / interviewer の `createSession`/`nextQuestion`/`recordAnswer`/`finalizeSession`/`sendLineMessage`。

### 2.1 Workers 互換シム（3 点）

| # | 対象 | 現状 | 変更 |
|---|---|---|---|
| S1 | hook 分類器 | `classify.py`(220行 regex) を `child_process` で spawn | `lib/hook-classifier/classify-rules.ts`（純 TS 移植）。`classify.ts` は Workers で TS 版を使い `child_process` 経路を撤去。**Python 出力との parity を fixture テストで担保** |
| S2 | 静的 config | `cost-model.csv` / `fallback_channels.yaml` を `fs.readFileSync` | TS 定数（`cost/cost-model.ts` / `fallback/channels.ts`）に変換し import、`node:fs` 除去 |
| S3 | crypto | `node:crypto`（pkce-test のみ） + LINE 署名未実装 | LINE 署名検証 + PKCE を **WebCrypto**(`crypto.subtle.HMAC/SHA-256`) で実装 |

`@supabase/supabase-js` は Workers の fetch で動作（変更不要）。`SUPABASE_SCHEMA=xad` は適用済（2026-06-03）。

### 2.2 ビルド時ガード

wrangler バンドルに `node:child_process` / `node:fs` が残らないことを検証する CI 的チェック（`npm run worker:bundle-check`: `wrangler deploy --dry-run --outdir` の出力を grep）。残れば fail。

## 3. ハンドラ配線（データ/状態つき）

### 3.1 投稿系 cron（post-morning / noon / evening-note / evening-quote / night-quote）

```
1. ガード: kill-switch(xad) / brownout / 月予算(cost_ledger) を確認 → 越えたら skip + 理由ログ
2. idea 取得: xad.core_ideas から status='queued' の次の1件を slot に応じて dequeue
   （無ければ skip + LINE 通知。core_ideas は buzz/inspirations + 初期 seed で供給）
3. draft: draftForX(idea)  （引用RT 系は draftForXWithRequest）
4. 審査: runEditor(draftInput) → decision=approved/rejected
5. 永続化: xad.post_drafts に保存 (status='pending_approval', draft_id, slot, idea_id, editor 結果)
6. LINE 承認依頼: Flex メッセージ push（本文プレビュー + [承認][却下] postback、data=approve:<draft_id> / reject:<draft_id>）
   - editor rejected の場合は push せず、却下理由を daily_digest に積む
```

**死守ガード / 配分**: 既存 lib（optimizer/死守ガード）に従う。`AUTONOMOUS_PUBLISH=false` のため本ステップは **draft + 承認依頼で必ず停止**。

### 3.2 `/line/webhook`（POST）

```
1. 署名検証: X-Line-Signature を WebCrypto HMAC-SHA256(body, LINE_CHANNEL_SECRET) と照合。不一致は 401
2. events 分岐:
   a. postback data="approve:<draft_id>":
      - xad.post_drafts load → 既に published/rejected なら冪等 no-op
      - publishToX({text, ...}) （kill-switch/brownout 再確認）
      - 成功: status='published' + xad.posted_records 記録 + LINE 完了通知
      - 失敗: status='publish_failed' + 理由 + LINE 通知
   b. postback data="reject:<draft_id>": status='rejected' + reason、daily_digest に計上
   c. text message: interviewer フロー
      - session を xad に永続化（§3.5）→ nextQuestion/recordAnswer → finalize で materials_store/interview_records へ
3. 200 を返す（LINE は 2xx 必須）。重い処理は ctx.waitUntil で非同期化
```

### 3.3 buzz-ingest / inspirations-ingest

```
- twitterapi.io（TWITTERAPI_IO_KEY）で海外/国内アカ取得 → 正規化 → xad へ
- buzz から content seed を core_ideas に queued で投入（投稿系の供給源）
- inspirations-ingest は週次（海外≥1/国内≥1/note≥1）
```

### 3.4 daily-digest / optimizer-update / rotation-notice

```
- daily-digest: runDailyDigest({...}) → KPI 集計(xad) → LINE 配信 → daily_digest_log 記録
- optimizer-update: runOptimizerUpdate(...) → posted_records の signal で posterior 更新 → optimizer_proposal 保存
- rotation-notice: X/Meta token の expires_at を見て期日が近ければ LINE 通知（自動 refresh は別途）
```

### 3.5 `/oauth/x/callback`（GET）

PKCE Step 2: code + code_verifier（KV or xad に一時保存した state 紐付け）→ token 交換 → X tokens を更新（secret 再投入は人間運用、ここでは取得・表示まで）。

### 3.6 状態モデル（xad）

| table | 役割 |
|---|---|
| `core_ideas` | 投稿ネタのキュー（status: queued/used） |
| `post_drafts` | draft + 承認状態（pending_approval / approved / published / rejected / publish_failed） |
| `posted_records` | 公開済み投稿 + metrics |
| `interview_records` | interviewer 完了素材 |
| `interview_sessions`（新規 migration 0007） | interviewer の途中状態（Workers ステートレス対策、§3.5） |
| `cost_ledger` | 予算消費 |
| `optimizer_proposal` | posterior 更新結果 |
| `daily_digest_log` | digest 履歴 |

**Workers ステートレス対策**: interviewer の `sessionStore = new Map()`（in-memory）は Worker isolate を跨げない。→ セッション途中状態を **xad.interview_sessions（新規 migration 0007）** に永続化。`getSession`/`createSession`/`recordAnswer` を DB-backed に改修（migration は本プロジェクト方針通り 000N ファイル + MCP apply、§7 PR-W3 で実施）。

## 4. エラーハンドリング

- **ガード**: 全 LLM/publish 前に kill-switch / brownout / 予算を確認（既存 lib）。LINE で `!stop` → kill-switch ON（既存）。
- **冪等性**: post job は `(date, slot)` で dedup。承認 postback は draft status で二重 publish を防止。
- **job 単位 try/catch**: 失敗は log + critical は LINE アラート。1 job の失敗が他に波及しない。
- **LINE 2xx 必須**: webhook は受信即 200、処理は `ctx.waitUntil`。
- **署名失敗**: 401 で破棄（ログのみ）。

## 5. テスト戦略

- **S1 parity**: `classify-rules.ts` の出力を `classify.py` の出力（fixture 化）と照合する parity テスト（代表 20+ ケース）。既存 editor テストは TS 版経路で緑維持。
- **worker handler**: `Env` mock + `publishToX.__setFetchImpl` で X 投稿をスタブ。各 job dispatch / webhook 分岐の unit テスト。
- **署名検証**: 既知 body+secret で WebCrypto HMAC の一致/不一致テスト。
- **interviewer 永続化**: DB-backed session の往復テスト（IN_MEMORY_FALLBACK で in-proc、本番は xad）。
- **dry-run**: 既存 `pipeline:dryrun` を worker 配線後も緑維持。新規 `worker:dryrun`（scheduled を手動 invoke）。
- 既存 148 テストを壊さないこと（回帰ゲート）。

## 6. ビルド & デプロイ

- `wrangler deploy --dry-run` でバンドル検証 → §2.2 の Node-only import ガード。
- 段階デプロイ: (1) 互換シム S1-S3 + テスト → (2) 投稿系 + webhook 承認（launch critical）→ (3) digest/optimizer/buzz/oauth。各段で deploy + smoke。
- smoke: `/health` 200 / `wrangler tail` で cron stub→実処理化を確認 / テスト postback で承認→publish（X はステージング or __setFetchImpl で本番回避）。

## 7. 段階実装の順序（PR 分割）

1. **PR-W1**: Workers 互換シム（S1 classify-rules + parity / S2 config bundle / S3 WebCrypto util）+ build ガード
2. **PR-W2**: 投稿系 dispatch 配線（idea dequeue → draftForX → runEditor → post_drafts → LINE 承認 push）
3. **PR-W3**: `/line/webhook`（署名 + approve→publishToX / reject / interviewer 永続化）
4. **PR-W4**: daily-digest / optimizer-update / buzz / inspirations / rotation-notice / oauth callback

各 PR で deploy + smoke。PR-W2+W3 完了で **launch critical（1 投稿/日 承認フロー）が実働**。

## 8. リスクと未確定

- **classify parity**: 移植で微妙な差が出る可能性 → fixture parity で 95%+ 一致を基準、差分は許容範囲か人間確認。
- **core_ideas 供給**: 初期キューが空だと投稿系が空振り → launch 前に初期 seed（`phase1-month1` の C-2 等）を投入する運用が必要。
- **X publish の本番テスト**: 承認→publish の E2E は実投稿を伴う → soft launch 当日に 1 本で確認（事前は __setFetchImpl）。
- **CPU 時間**: Workers の CPU 制限。LLM は I/O 待ちで問題なし想定だが、editor 多段が重い場合は計測。
