# mf-finance ダッシュボード 設計仕様（第一弾：土台＋コア）

- 日付: 2026-06-06
- ブランチ: `task/260606-mf-finance`
- 関連: `apps/mf-finance/DESIGN.md`（全体像）／`raw/finance/moneyforward/README.md`（データ素性）

## 1. 目的・背景
マネーフォワードME（個人版・課金継続＝データ収集役）が各口座/カードから集めた家計データを Claude 側で自動集計・分析する。MF課金はやめず「収集はMF・分析は本システム」の役割分担。
本仕様は **第一弾＝土台（取得→正規化→Supabase）＋コア（可処分ダッシュボード）** に限定する。残り機能は同じ土台の上に順次モジュール追加（各々別spec）。

**設計の重心**: ダッシュボードを開いた瞬間に「**今月あといくら使えるか**」が分かること。

## 2. スコープ
### 第一弾に含む
- 入出金・資産推移の取得（chrome-devtools fetch, cron-ready）と正規化
- Supabase `mf_finance` スキーマへの冪等ロード
- 定期項目（固定費・定期収入）の自動検出→人間が確定
- 可処分ダッシュボード（home）：今月の「あと使える」＋内訳、月次収支・前月比・前年同月比・トレンド

### 第一弾に含まない（後続モジュール・別spec）
カテゴリ深掘りUI／サブスク一覧UI／LLM自動ラベリング／資産推移＋手入力負債トラッキング＋KGI連動／CF予測／異常アラート／freee統合／予算実績。
※ ただしデータモデルは後続を見越したテーブルを最初に用意する（`manual_liabilities`・`category_rules` 等）。

## 3. データソースと素性（recon 確定）
- 入出金CSV: `GET /cf/csv?from=YYYY/MM/01&month=M&year=YYYY`（月次・任意月）。10列：`計算対象,日付,内容,金額(円),保有金融機関,大項目,中項目,メモ,振替,ID`。**実体Shift-JIS**（Content-Type は utf-8 詐称）→ UTF-8 変換必須。`ID` が取引一意キー。
- 資産推移CSV: `GET /bs/history/csv`（表示中範囲。日次＋月末混在、2025-03〜）。`日付,合計,預金・現金・暗号資産,ポイント`。
- 負債: `/bs/liability` 画面のみ（CSV履歴なし）→ 前方スナップショット蓄積。
- 既知の注意: ①2026-04以前は連携停止で薄かった（再連携済で復活）②`大項目=現金・カード`はATM引出等の内部移動を含み支出過大計上→補正必要。

## 4. データモデル（Supabase schema `mf_finance`）
| テーブル | PK | 主なカラム | 用途 |
|---|---|---|---|
| `transactions` | `id`(MFのID) | included(計算対象), date, description, amount(負=支出), account, category_major, category_middle, memo, is_transfer, is_internal_move, classification, llm_labeled, source, ingested_at | 入出金明細（冪等upsert） |
| `recurring_items` | bigserial | kind(income/expense), name, match_pattern, amount, day, active, confirmed(auto/user), created_at | **固定費＋定期収入を一元管理（コアの肝）** |
| `asset_history` | `date` | total, deposit_cash_crypto, points | 資産推移 |
| `liability_snapshots` | `snapshot_date` | total, breakdown(jsonb), captured_at | MF負債の前方スナップショット |
| `manual_liabilities` | bigserial | name, lender, balance, rate, monthly_payment, as_of_date | 手入力借金（アコム/奨学金/横浜バイクローン/修学支援貸付） |
| `category_rules` | bigserial | pattern, match_type, category_major, category_middle, classification, source(llm/manual), created_at | ラベリング規則（後続で使用） |

RLS: 個人用単一ユーザー。anon 無効。Next.js は server 側で service role 使用、UI はログイン保護。

## 5. 派生ロジック（normalize で確定）
- **収支対象** = `included=1 AND is_transfer=0`。`is_transfer=1` は口座間移動で収支から除外。
- **内部移動補正**: `大項目=現金・カード` 等のATM引出/カード引落（振替フラグ未付与の過大計上）を `is_internal_move=true` で別管理し、変動費・消費計算から除外。
- **classification**: transfer / internal / income(amount>0) / fixed / variable / unknown。fixed は `recurring_items(expense, confirmed)` にマッチするもの＋既定ヒューリスティック（住宅・通信費・保険）。

## 6. コア計算ロジック（今月）
```
定期収入見込み = Σ recurring_items(kind=income, active) の当月該当額
スポット着金   = 今月の入金(amount>0) のうち定期収入にマッチしない実着金
今月の収入見込 = 定期収入見込み + スポット着金
固定費         = Σ recurring_items(kind=expense, active, confirmed)
変動費実績     = 今月の支出 − 振替 − 内部移動 − 固定費該当
可処分枠       = 今月の収入見込 − 固定費
あと使える     = 可処分枠 − 変動費実績(これまで)
```
home は「あと使える」を主役表示し、内訳（収入見込／固定費／変動費実績／可処分枠）を併記。

## 7. 定期項目 自動検出→確定 UX
1. 取込時、`transactions` を `内容(正規化名)×近い金額` でグルーピングし、**月次周期性**（毎月±数日に同名・近似額）を検出。
2. 固定費／定期収入の **候補リスト** を提示（検出根拠：直近N ヶ月の出現・平均額）。
3. 陸さんが各候補を **ON/OFF＋金額微調整** して確定 → `recurring_items` に `confirmed=user` で保存。未操作の自動検出分は `confirmed=auto` 扱い。
4. この仕組みは後続「サブスク検出UI」の素地を兼ねる。

## 8. アーキテクチャ／データフロー
```
refresh.mjs (chrome-devtools fetch, cron-ready, 当面手動)
  → raw/finance/moneyforward/*.csv (UTF-8, immutable)
normalize.mjs → 派生フラグ付き normalized.json
load.mjs → Supabase mf_finance.* に ID で upsert（冪等）
Next.js(App Router) → Supabase 読取 → 可処分ダッシュボード(home)
```
各スクリプトは単一責務・独立テスト可能に分離。技術: Next.js App Router＋Supabase（`ofmeton-apps` プロジェクトの `mf_finance` スキーマ分離）。UI は scaffold 直後にライトテーマ固定（既知の暗→明同化バグ回避）。

## 9. 実装フェーズ（第一弾）
- P0 データ更新: 全期間入出金＋資産推移を再fetch→raw CSV 最新化。
- P1 `normalize.mjs`＋データモデル確定（DB不要・テスト可）。
- P2 Supabase `mf_finance` migration〔人間確認〕。
- P3 `load.mjs`＋`refresh.mjs`（cron-ready）。
- P4 定期項目 自動検出→確定。
- P5 可処分ダッシュボード(home)。

## 10. 人間確認ゲート
Supabase migration（DB書込）／Vercel deploy（後続）／LLM従量課金（後続・コスト先出し）／cron 有効化（将来）。

## 11. 検証
- P1: normalized の行数・月次集計が recon 突合値と一致（推測補完しない）。
- 可処分ロジック: home の「あと使える」が CSV 実集計（振替・内部移動・固定費除外後）と一致することを単体テストで担保。
- P5 UI: responsive-snap で全 viewport 崩れなし。
- 取得は自分データの読取のみ（外部送信・金銭操作なし）。作業後 remote debugging 無効化。
