# mf-finance 引き継ぎ（別セッション再開用）

最終更新: 2026-06-06 / 作業ブランチ: `task/260606-mf-finance`（worktree `/Users/rikukudo/Projects/all-good-ops-mf-finance`）

## 0. これは何
マネーフォワードME（個人版・課金継続＝収集役）のデータを Claude 側で自動集計・分析する**個人家計ダッシュボード**。MF課金はやめず「収集=MF / 分析=本システム」。ユーザー=工藤陸（フリーランス・複数収入源・借金あり・月収26万KGI）。
- **設計の重心**: home を開いた瞬間に「**今月あといくら使えるか**（可処分）」が分かること。
- 成果物=**Next.js(App Router)+Supabase**（`ofmeton-apps`=`hofvvcvhjslevymhbcqj` の `mf_finance` スキーマ分離）。

## 1. 必読ドキュメント（この順で読む）
1. 仕様: `docs/superpowers/specs/2026-06-06-mf-finance-dashboard-design.md`（ユーザーシナリオ網羅・データモデル・可処分ロジック）
2. Plan 1（データ基盤=完了）: `docs/superpowers/plans/2026-06-06-mf-finance-data-layer.md`
3. 全体設計: `apps/mf-finance/DESIGN.md`
4. データ素性の注意: `raw/finance/moneyforward/README.md`
5. 上位計画: `/Users/rikukudo/.claude/plans/chrome-devtools-virtual-hennessy.md`

## 2. 完了済み（Plan 1 = データ基盤＋可処分ロジック）✅
- 純Nodeライブラリ＋node:testで TDD（11/11緑）: `scripts/lib/{csv,normalize,classify,recurring,disposable}.mjs`
- CLI: `scripts/normalize.mjs`（raw CSV→`data/normalized.json`）/ `scripts/detect-recurring.mjs` / `scripts/load.mjs`（supabase-js）/ `scripts/load-mgmt.mjs`（Management API フォールバック）
- Supabase `mf_finance` スキーマ: 7テーブル（transactions / recurring_items / account_status / asset_history / liability_snapshots / manual_liabilities / category_rules）＋RLS有効＋service_role権限。migration: `supabase/migrations/0001_*.sql`,`0002_*.sql`
- **データ投入済み**: `transactions` に **3,742行**（収支対象3,194 / 2020-01〜2026-06）。分類分布 variable1904/transfer548/unknown484/income338/fixed258/internal210。
- 検証: `cd apps/mf-finance && npm test` で全緑。Supabase件数は MCP `execute_sql` で確認済。

## 3. 未着手・次の一手
### 3-1. Plan 2 着手前の2ブロッカー（Task #9）
1. **PostgREST 公開反映の確認**: `mf_finance` を exposed schemas に追加済（設定は永続化、`db_schema=public,graphql_public,xad,mf_finance`）だが、**稼働中PostgRESTが未反映**だった（`PGRST106 Invalid schema`）。supabase-js が `from('transactions')` で読めるか再確認すること。まだ未反映なら memory `reference_supabase_nonpublic_schema_exposed.md` 参照（反映は再起動待ち。投入は `load-mgmt.mjs` で迂回可）。
2. **最新データ再取得（P0）**: 現在DBのデータは**再連携“前”のスナップショット**。再連携後のフル版を引き直す→reload。手順は `scripts/acquire.md`：個人Chromeで MF ログイン＋`chrome://inspect`で remote debugging 有効化→chrome-devtools MCP で `/cf/csv?from=YYYY/MM/01&month=M&year=YYYY`（全月ループ）と `/bs/history/csv` を fetch（**Shift-JIS→UTF-8**）→`raw/finance/moneyforward/*.csv` 更新→`npm run normalize`→`load`。作業後 remote debugging 無効化。

### 3-2. Plan 2 = 可処分ダッシュボードUI（未作成）
`writing-plans` で Plan 2 を起こす。内容: Next.js App Router scaffold（**scaffold直後ライト固定**）、home（あと使える＋内訳:収入見込/固定費/変動費実績）、月次収支・前月比・前年同月比・トレンド、**連携鮮度表示＋refresh促し**、**口座/カード別の当月利用**、**赤字/着金の警告**、**引落予定vs残高カレンダー**、定期項目 確定UI（recurring_items の ON/OFF＋金額調整）。skill: `ui-ux-pro-max`（旧frontend-design）/ `nextjs-supabase-site-gotchas` / `responsive-layout` / `supabase`。
- 注意: PostgREST `max_rows=1000`。transactions 3700件超はページング/集計クエリで対応。
- 接続: server側 service_role（RLSバイパス）。鍵は金庫（下記）。

### 3-3. 後続モジュール（さらに先・各々小spec）
カテゴリ深掘り／サブスク一覧UI／LLM自動ラベリング(未分類484件・Claude API・従量課金は先出し)／資産推移＋手入力負債(アコム/奨学金/横浜バイクローン/修学支援貸付=`manual_liabilities`手入力)トラッキング＋KGI連動(wiki/self/goals)／CF予測／異常アラート／freee統合(MCP読取のみ・cashflow-tracker連動)／予算実績／確定申告用経費集計。

## 4. 確定済みの要件（再議論しない）
- 可処分式: **あと使える = (定期収入見込み＋スポット着金) − 固定費 − 変動費実績**
- 収入=定期収入見込み（`recurring_items` kind=income）＋スポット着金（未マッチ入金）。**事業/給与/その他の `source_type` タグ**で分離。
- 固定費=自動検出→人間がON/OFF確定（`recurring_items` kind=expense, confirmed）。
- 内部移動補正: `大項目=現金・カード` は `is_internal_move=true` で消費から除外（過大計上対策）。
- 借金=ダッシュボードで手入力。データ更新=いずれ cron（現 cron 全停止中→当面手動 refresh、cron-ready に作る）。

## 5. 環境・鍵・ハマり所
- **金庫（共通鍵束）**: repo-root `.env.local`（`/Users/rikukudo/Projects/private-agents/all-good-ops/.env.local`）に `SUPABASE_URL`(=ofmeton-apps) と `SUPABASE_SERVICE_ROLE_KEY` あり。**新規追加不要**。`load.mjs` は両名(`SUPABASE_SERVICE_KEY`/`SUPABASE_SERVICE_ROLE_KEY`)を許容。実行例: `cd apps/mf-finance && node --env-file=/Users/rikukudo/Projects/private-agents/all-good-ops/.env.local scripts/load.mjs`。worktree統合時は金庫を main 側に維持。
- **Management API トークン**: keychain から（memory `reference_supabase_mgmt_api_keychain`）。`load-mgmt.mjs` は `SB_MGMT_TOKEN` env で受ける。
- **CSV は Shift-JIS**（Content-Type は utf-8 と詐称）。`raw/finance/moneyforward/*.csv` は UTF-8 変換済。CSVには**メモ欄に物理改行**が混じる→`csv.mjs` は char-by-char パーサで対応済（正レコード数=3742、README記載の3743は継続行二重計上）。
- chrome-devtools は**個人Chromeにアタッチ**方式（automation Chromeはbot検知でログイン不可）。memory `reference_chrome_devtools_mcp`。
- 認証情報は会話に再掲しない・repoに永続化しない。

## 6. 再開手順（コピペ用）
```
cd /Users/rikukudo/Projects/all-good-ops-mf-finance
git status && git log --oneline -5
cd apps/mf-finance && npm test            # 11/11 緑を確認
# PostgREST反映チェック→未反映なら load-mgmt、反映済なら supabase-js
# 次: 3-1の2ブロッカー解消 → writing-plans で Plan 2 → subagent-driven で実装
```
進捗管理は TaskList（#5 後続モジュール群 / #9 Plan2前ブロッカー が残）。
