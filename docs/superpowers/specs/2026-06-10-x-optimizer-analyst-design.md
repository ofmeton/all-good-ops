# X LLM-optimizer（x-optimizer-analyst MA）設計 — Stage 3

## Context（なぜ）

optimizer 再設計プログラムの本丸。下の階（Thompson）は数値knob 3本を自己調整し、metrics-ingest で reward 燃料も供給された（Stage 2A/metrics-ingest）。承認/却下理由も記録され始めた（Stage 2B）。
**上の階＝LLM-optimizer** は、人間が容易にできない定性分析——session の思考・承認理由・performance パターン・funnel を読んで、**構造的改善（プロンプト/テンプレ/閾値/新レバー/収集クエリ）を提案**する。これが [[project_x_optimizer_redesign]] の中核。

**確定スコープ**: **propose-only ループ一式**（観測→評価→分析→仮説→リサーチ→立案→`optimizer_proposal` へランク付き提案→LINE通知）。**実行は人間ゲート**（Stage 4 で自動化）。実装は **Managed Agent 化**（collector/writer/checker と同じ永続 MA・[[project_x_ma_persistent_rearch]]）。

## ゴール / 非ゴール

- **ゴール**: 月次（＋随時）に走る `x-optimizer-analyst` MA が、observability 全体を読み、根拠付き・ランク付きの改善提案を `xad.optimizer_proposal` に書き、LINE で上位を通知する。
- **非ゴール（Stage 4 / 後続）**: 提案の自動適用（プロンプト version-up・閾値変更の実行）/ 死守ガード・安全ルールの変更提案 / dashboard 提案レビュー UI（後続で追加可）。

## アーキテクチャ

新永続 MA **`x-optimizer-analyst`**（model=`claude-opus-4-8`）を MA レジストリに登録。新 cron job **`optimizer-analyst`** が `runMaSession`（`lib/ma/run-session.ts`）で起動。agent は **seed スナップショット**を起点に、**read-only ツールで自らデータを掘り下げ**、`submit_proposal` ツールで提案を書く。agent 自身の思考も `session_event`（migration 0021）に残る＝メタ観測。

### MA 登録（`lib/ma/bootstrap-core.ts`）
- `SYSTEM_BUILDERS` に `buildOptimizerAnalystSystemPrompt`（新規 `lib/optimizer-analyst/prompts.ts`）。
- `MA_TOOL_REGISTRY` に `OPTIMIZER_ANALYST_TOOL_REGISTRY`（下記ツール＋`web_toolset`）。
- `AGENT_MANIFESTS` に `x-optimizer-analyst`（key / model=opus-4-8 / system builder / tools）。
- 反映は既存フロー：`npm run ma:render` → `npm run ma:bootstrap`（新規 create）。`xad.ma_agents` に登録され worker が lookup。

## コンポーネント（新規 `lib/optimizer-analyst/`）

### snapshot.ts — seed 観測スナップショット
直近期間（既定 30 日、cron は月次なので実質1ヶ月）の構造化ダイジェストを組み、初期 userMessage に注入：
- **lever別 performance**: 握る3レバー（posting_time band / hook / x_format）の値別の avg PCR・url_link_clicks・件数 ＋ 現 posterior mean/confidence。
- **承認/却下理由**: `post_drafts.approval_reason`（直近）＋ status（approved/rejected）＋ editor risk。
- **異常**: optimizer rollback 履歴（あれば）。
- **funnel**: 素材→core_idea→draft→approved→published→performance の段階別件数（ソース別＝収集クエリ評価の素地）。
- **cost**: 当月 cost_ledger（category別）。
- **過去提案**: 直近の optimizer_proposal（accepted/implemented/business_effect）＝重複回避・効果学習の種。

### tools.ts — MA custom ツール（read-only クエリ＋submit）
既存 MA ツール（collector_tools / submit_draft / submit_check）と同じ「schema＋handler」方式。handler は Supabase を read（service role）。

| ツール | 役割 |
|---|---|
| `get_lever_performance` | time/hook/format の値別 performance ＋ posterior（snapshot の深掘り） |
| `get_approval_reasons` | 承認/却下理由＋draft結末（フィルタ可） |
| `get_post_detail` | 特定 draft の body / editor_output(12ルール) / writer・checker の session 思考(session_event) / performance |
| `get_funnel_stats` | 素材→…→performance 変換・ソース別 |
| `get_optimizer_state` | 現 posterior＋直近変化＋異常 |
| `get_recent_proposals` | 過去提案＋採否＋効果 |
| `web_toolset` | 外部リサーチ（writer/checker と同一） |
| `submit_proposal` | 提案を `optimizer_proposal` へ書込み（複数回呼べる） |

### prompts.ts — `buildOptimizerAnalystSystemPrompt`
- 役割: 「X 発信フロー全体の改善アナリスト。観測を読み、根拠付きの改善提案を出す。実行はしない」。
- **propose-only 厳命**: optimizer_proposal に書く以外の副作用禁止。
- **🔒 不可侵を明記**: FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / 死守パラメータ（first_hand≥30% / industry_sop≥月5 / AI画像≤10% / hashtag0 / failure_story 月≤4）は**変更提案の対象外**。
- 提案できる範囲: writer/checker/collector のプロンプト patch（MA version-up 経由）/ 8テンプレ patch / 自由閾値（hook strength・cosine 等）/ 据え置きレバー（visualizer/lag/citation/content_axis）の bandit化是非 / 収集クエリ（watchlist 追加削除・KW・scoringWeights）/ 新規観測の要望。
- 各提案に proposal_type・scope・hypothesis・evidence（数値根拠）・rank（A/B/C）を必須化。
- 掟: 既出提案の重複回避、データ薄い領域は「measurement_request」で観測要求に留める、最大 N 提案（例 5）。

### run-analyst.ts — オーケストレーション
`runMaSession` を呼び（onEvent で session_event 永続化）、seed snapshot を userMessage に、ツールを bind。終了後：書かれた proposal を集計し **LINE へ上位サマリ通知**（`lib/dashboard/digest` or LINE push の既存経路を再利用）。cost_ledger に opus セッションコスト記録。

## データフロー

cron(月次) → queue `optimizer-analyst` → `runOptimizerAnalyst()`:
1. `buildSnapshot(30d)` → seed userMessage。
2. `runMaSession({ agentKey: "x-optimizer-analyst", userMessage, tools, onEvent })` → agent が get_* ツールで深掘り → `submit_proposal` を複数回。
3. 書かれた proposals を集計 → LINE 通知（rank A を強調）。
4. cost_ledger 記録。

## 配線（既存パターン踏襲）
- `src/worker.ts`: JobMessage union ＋ CRON_JOBS（月次 cron）＋ CRON_JOBS_BY_NAME に `optimizer-analyst`。
- `src/queue.ts`: `case "optimizer-analyst"`（dynamic import → runOptimizerAnalyst → log）。
- `wrangler.toml`: 月次 cron 追加。
- `lib/safety/brownout-handler.ts`: `optimizer-analyst` は LLM 使用＝`STOP_POSTING_ALLOWED` には**入れない**（collect/compose/check と同列で停止）。`ALL_JOBS` のみ。
- MA bootstrap: `npm run ma:render` → `npm run ma:bootstrap`（新 agent create・人間ゲート）。

## エラー処理
fail-open（job本体 throw しない・queue ACK）。snapshot クエリ失敗は当該セクションを空にして継続。submit_proposal の書込み失敗は warn。MA session 失敗（token/API）は log＋LINE 異常通知。

## テスト（TDD）
- `snapshot.ts`: 集約ロジック（lever別集計・funnel カウント・承認理由抽出）を in-memory fixture で。
- `tools.ts`: 各 handler のクエリ整形・null安全・`submit_proposal` の書込みペイロード（DI で fake Supabase）。
- `run-analyst.ts`: DI で fake runMaSession＋fake tools、提案集計→通知の流れ。
- MA session 実体は live（bootstrap 後 `/admin/enqueue?job=optimizer-analyst` で実証）。

## 触るファイル
- 新規: `lib/optimizer-analyst/{snapshot,tools,prompts,run-analyst}.ts` ＋テスト。
- 改修: `lib/ma/bootstrap-core.ts`（agent/tool/system 登録）/ `src/worker.ts` / `src/queue.ts` / `wrangler.toml` / `lib/safety/brownout-handler.ts`。
- migration: 不要（optimizer_proposal は既存。`run_id` 紐付けが欲しければ後続で `optimizer_proposal.run_id` 追加＝Stage 2B 残課題と合流可、本spec ではスコープ外）。
- 再利用: `lib/ma/run-session.ts`（runMaSession・onEvent）/ session-event-store / cost-ledger / 既存 MA ツール定義パターン / digest/LINE 通知。

## 検証（実装後）
- 単体 TDD 緑。
- `npm run ma:render` 差分確認 → `npm run ma:bootstrap`（人間ゲート）で `x-optimizer-analyst` を本番 create。
- `/admin/enqueue?job=optimizer-analyst`（or ローカル `prod-lib-diag` で runOptimizerAnalyst）→ optimizer_proposal に提案が入り、LINE 通知が飛び、session_event に agent の思考が残ることを確認。

## 後続（Stage 4 / 別spec）
提案の**実行**：rank・採否を人間が承認 → プロンプト変更＝`ma:render/bootstrap --update`、閾値/config 変更＝ファイル編集→deploy、bandit化＝コード。autonomy tiers（T=DB直書き / L=proposal→人間merge / 🔒）を権限境界として定義。dashboard 提案レビュー UI もここで。
