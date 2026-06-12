# mf-finance 引き継ぎ（別セッション再開用）

最終更新: 2026-06-12 / 作業ブランチ: `task/260606-mf-finance`（worktree `/Users/rikukudo/Projects/all-good-ops-mf-finance`）

## 0. これは何
マネーフォワードME（個人版・課金継続＝収集役）のデータを Claude 側で自動集計・分析する**個人家計ダッシュボード**。MF課金はやめず「収集=MF / 分析=本システム」。ユーザー=工藤陸（フリーランス・複数収入源）。
- **設計の重心**: home を開いた瞬間に「**今月あといくら使えるか**（可処分）」が分かること。
- **アーキ（2026-06-12 方針転換）**: コスト=無料＋家計データ非公開のため **完全ローカル**。データ=**SQLite 単一ファイル `data/mf-finance.db`（better-sqlite3, git ignore）**、UI=**ローカル Next.js（localhost のみ・認証なし・単一ユーザー）**。旧 Supabase 依存は撤廃（`legacy/` へ退役）。詳細 memory `project_mf_finance_dashboard.md`。

## 1. 必読ドキュメント（この順で読む）
1. 仕様: `docs/superpowers/specs/2026-06-06-mf-finance-dashboard-design.md`（ユーザーシナリオ・データモデル・可処分ロジック）
2. 全体設計: `apps/mf-finance/DESIGN.md`
3. ローカル化＋Plan2 計画: `/Users/rikukudo/.claude/plans/merry-spinning-glacier.md`
4. データ素性の注意: `raw/finance/moneyforward/README.md`
5. 再取得手順: `scripts/acquire.md`

## 2. 完了済み ✅
### Plan 1（データ基盤＋可処分ロジック）
- 純Nodeライブラリ＋node:testで TDD（11/11緑）: `scripts/lib/{csv,normalize,classify,recurring,disposable}.mjs`。**Supabase非依存・無改変で流用（回帰防止線）**。可処分式 SSOT = `disposable.mjs` の `computeMonthlyDisposable`。
- CLI: `scripts/normalize.mjs`（raw CSV→`data/normalized.json`）/ `scripts/detect-recurring.mjs`。

### ローカル SQLite 化 ＋ Plan 2 Phase 1（home 可処分表示）
- `db/schema.sql`: Postgres 7表の SQLite 移植（bool→0/1, timestamptz→TEXT, jsonb→TEXT, identity→AUTOINCREMENT）。
- `scripts/load.mjs`: **SQLite版（冪等 upsert）**。`data/normalized.json`→DB。投入後「収支対象=included=1 AND is_transfer=0」を recon値 3,194 と突合（一致）。
- `scripts/seed-recurring.mjs`: `recurring-candidates.json`→`recurring_items`。**支出 amountAvg は負値→`Math.abs` で正値格納**（disposable は income/expense とも正値前提・test 規約）。
- Next.js: `lib/db.ts`（server-only better-sqlite3 singleton）/ `lib/queries.ts`（`getDisposable` が `disposable.mjs` を流用）/ `lib/types.ts` / `lib/format.ts` / `app/page.tsx`（`force-dynamic`・当月）/ `app/components/{DisposableHero,DisposableBreakdown}.tsx`。ライト固定・Lexend・トラスト青/利益緑。`next.config.ts` に `serverExternalPackages:['better-sqlite3']`。
- 旧 Supabase 資産（`load-mgmt.mjs`, `supabase/migrations`）→ `legacy/`。
- 検証: build緑 / test 11緑 / home HTTP200・「あと使える ¥23,009」描画 / populated月(2026-03=228,071円)で算出一致。コミット `1c33382`。

## 3. 進行中・次の一手
### Plan 2 Phase 2（実装中）
月セレクタ（`?ym=YYYY-MM`）・月次収支・前月比・前年同月比・トレンド（軽量SVG棒）。`lib/queries.ts` に `getMonthlySummary` / `getMonthlySeries` 追加、`lib/format.ts` に月キーユーティリティ追加済み。空月（直近2ヶ月）には控えめな注記。

### B2 = データ鮮度（最新化）✅ 完了（2026-06-12）
MF側でデータが回復していたため再取得を実施。chrome-devtools MCP が個人Chromeにアタッチ済み（**再起動不要**だった）→ `evaluate_script` の `fetch(credentials:'include')` で `/cf/csv`（2024-01〜2026-06 の30ヶ月）と `/bs/history/csv` を取得（Shift-JIS→UTF-8、`filePath` でファイル保存し context 非汚染）。
- 成果: 直近月が回復（2026-05: 4→116件 / 2026-06: 2→43件 / 04: 34→72）。DB total 3742→**4164行**・収支対象**3503件**。資産最新 2026-06-12 ¥375,756。固定費 detect 14→20件（完全データでより正確）。
- raw 追加（immutable・新ファイル）: `cashflow-2024-01_2026-06-refetch-20260612.csv` / `asset-history-2025-03_2026-06-refetch-20260612.csv`。
- **再現性**: `normalize.mjs` は引数なしで `raw/.../cashflow-*.csv` を**全併読**（旧フル+refetch、loader が ID で ON CONFLICT 後勝ち重複排除）→ `npm run normalize && npm run load` で再構築可。`/api/refresh` も同経路。
- 次回以降の最新化手順 `scripts/acquire.md`: ①個人Chrome で MF ログイン（連携エラー口座があれば再連携）→ ②chrome-devtools が未接続なら `chrome://inspect/#remote-debugging` 有効化（接続済なら不要）→ ③`/cf/csv` 月次ループ＋`/bs/history/csv` を fetch → raw に新ファイル → `npm run normalize && npm run load && npm run load:assets && npm run detect && npm run seed:recurring`。④作業後 remote debugging を無効化（cookie 露出防止）。MF=金融・認証情報は会話に出さない。

### Phase 3 以降（仕様順）
連携鮮度バナー＋手動refresh促し / 口座別当月利用 / 赤字・着金警告 / 引落予定vs残高カレンダー（`asset_history`）/ 定期項目 確定UI（`recurring_items` ON/OFF＋金額・server action）/ 手入力負債（`manual_liabilities`）/ カテゴリ深掘り / サブスク一覧 / LLM自動ラベリング(未分類484件) / CF予測 / freee統合(MCP読取)。

## 4. 確定済みの要件（再議論しない）
- 可処分式: **あと使える =（定期収入見込み＋スポット着金）− 固定費 − 変動費実績**
- 収入=定期収入見込み（`recurring_items` kind=income, active）＋スポット着金（recurring income 名に一致しない当月入金）。
- 固定費=自動検出→人間がON/OFF確定（`recurring_items` kind=expense, confirmed='user'）。`recurring_items.amount` は**正の magnitude**。
- 内部移動補正: `is_internal_move=true`/`classification='internal'` は消費から除外。
- 借金=ダッシュボードで手入力。データ更新=当面手動 refresh（cron全停止中・cron-ready に作る）。

## 5. 環境・ハマり所
- **データは全てローカル・git ignore**: `data/*.db`（機微・コミット厳禁）, `data/*.json`。`.next/`, `node_modules/` も ignore。
- **金庫（repo-root `.env.local`）の Supabase 鍵は mf-finance では不要**になった（xad 等が使用中なので削除はしない）。
- better-sqlite3 はネイティブモジュール。`npm install`（Node v24）でABI一致バイナリ取得。`next.config.ts` の `serverExternalPackages` 必須。Edge Runtime 非対応（`runtime='edge'` を書かない）。
- **CSV は Shift-JIS**（Content-Type は utf-8 詐称）。メモ欄に物理改行混入→`csv.mjs` の char-by-char パーサで対応済（正レコード数=3742）。
- chrome-devtools は**個人Chromeにアタッチ**方式（automation Chromeはログイン不可）。memory `reference_chrome_devtools_mcp`。
- 認証情報は会話に再掲しない・repoに永続化しない。

## 6. 再開手順（コピペ用）
```
cd /Users/rikukudo/Projects/all-good-ops-mf-finance/apps/mf-finance
git status && git log --oneline -5
npm install                       # 初回 or 依存変更時
npm test                          # 11/11 緑を確認
npm run load && npm run seed:recurring   # DB を data/mf-finance.db に再構築（冪等）
npm run dev                       # http://localhost:3000
# 次: Phase 2 仕上げ → B2 データ再取得 → Phase 3
```
進捗の上位計画: `/Users/rikukudo/.claude/plans/merry-spinning-glacier.md`。
