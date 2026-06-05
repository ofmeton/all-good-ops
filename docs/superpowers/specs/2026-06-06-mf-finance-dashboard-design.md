# mf-finance ダッシュボード 設計仕様（第一弾：土台＋コア）

- 日付: 2026-06-06
- ブランチ: `task/260606-mf-finance`
- 関連: `apps/mf-finance/DESIGN.md`（全体像）／`raw/finance/moneyforward/README.md`（データ素性）

## 1. 目的・背景
マネーフォワードME（個人版・課金継続＝データ収集役）が各口座/カードから集めた家計データを Claude 側で自動集計・分析する。MF課金はやめず「収集はMF・分析は本システム」。
本仕様は **第一弾＝土台（取得→正規化→Supabase）＋コア（可処分ダッシュボード）** に限定。残り機能は同じ土台に順次モジュール追加（各々別spec）。
**設計の重心**: 開いた瞬間に「**今月あといくら使えるか**」が分かること。ユーザー＝工藤陸（フリーランス・複数収入源・借金あり・月収26万KGI・事務負荷削減）。

## 2. ユーザーシナリオ（網羅）→ 機能要件
凡例: ✅第一弾コア / 🆕第一弾に追加（本検討で確定）/ 🔜後続モジュール
### A. 日常の現状把握
- A1 出先で「これ買っていい？」→ home「あと使える」即表示 ✅
- A2 「支出ペースは」→ 日次トレンド/バーンレート ✅
- A3 「報酬入った？」→ スポット着金検知 ✅ ＋ 着金警告 🆕
- A4 「このカード今月いくら」→ 口座/カード別の当月利用 🆕
### B. 意思決定
- B1 大型出費前「固定費＋返済払って平気？」→ CF予測 🔜
- B2 「サブスクどれ解約」→ サブスク一覧＋年額換算 🔜
- B3 「交際費/食費 使いすぎ？」→ カテゴリ別 前月比 🔜
- B4 「締めて貯蓄に回せる？」→ 可処分残×貯蓄目標 🔜
### C. 長期・目標
- C1 月次レビュー「KGI26万 届いた？」→ 月次収支＋KGI進捗 ✅/🔜
- C2 「純資産 増えてる？」→ 資産推移 🔜
- C3 「借金 減ってる？完済いつ？」→ 負債トラッキング＋返済シミュ 🔜
- C4 「貯蓄ペースで目標いつ」→ 貯蓄/CF予測 🔜
### D. 事業×家計（フリーランス特有）
- D1 「事業の利益 出てる？」→ freee統合・事業/家計分離 🔜
- D2 「確定申告用に経費集計」→ 年間経費抽出・税区分 🔜
- D3 「事業入金と家計入金を分けたい」→ **収入の source_type タグ** 🆕（土台）
- D4 「給与＋案件＋発信収益の内訳」→ 収入源別ビュー 🔜（土台のタグを利用）
### E. 異常・リスク
- E1 「残高ヤバい、今月赤字？」→ 可処分マイナス警告 🆕
- E2 「身に覚えのない引落」→ 異常/新規取引アラート 🔜
- E3 「連携切れてデータ古い」→ **連携鮮度表示＋refresh促し** 🆕
- E4 「カード引落日に残高足りる？」→ **引落予定 vs 残高カレンダー** 🆕
### F. データ運用
- F1 「未分類を分類して」→ LLM自動ラベリング 🔜
- F2 「分類ルール直したい」→ category_rules編集 🔜
- F3 「最新化して」→ refresh実行 ✅
- F4 「過去の特定月を見たい」→ 月セレクタ ✅
- F5 「現金払いを記録」→ 手入力取引 🔜
### G. 設定
- G1 「定期収入の見込み設定」→ recurring_items編集 ✅
- G2 「アコム/奨学金の残高更新」→ manual_liabilities更新 🔜

## 3. スコープ
### 第一弾に含む
取得（cron-ready）＋正規化＋Supabaseロード／定期項目 自動検出→確定／**収入・取引の source_type タグ**／可処分ダッシュボード(home)＝「あと使える」＋内訳・月次収支・前月比・前年同月比・トレンド／**連携鮮度表示＋refresh促し**／**口座・カード別 当月利用**／**赤字/着金の警告**／**引落予定 vs 残高カレンダー**。
### 第一弾に含まない（後続・別spec）
カテゴリ深掘りUI／サブスク一覧UI／LLM自動ラベリング／資産推移＋手入力負債トラッキング＋KGI連動／CF予測／異常アラート／freee統合／予算実績／確定申告用経費集計／手入力取引。
※ データモデルは後続を見越して `manual_liabilities`・`category_rules` も最初に用意。

## 4. データソースと素性（recon 確定）
- 入出金CSV: `GET /cf/csv?from=YYYY/MM/01&month=M&year=YYYY`。10列：`計算対象,日付,内容,金額(円),保有金融機関,大項目,中項目,メモ,振替,ID`。**実体Shift-JIS**（Content-Type utf-8 詐称）→UTF-8変換必須。`ID`=取引一意キー。
- 資産推移CSV: `GET /bs/history/csv`（日次＋月末混在、2025-03〜）。`日付,合計,預金・現金・暗号資産,ポイント`。
- 負債: `/bs/liability` 画面のみ→前方スナップショット。
- 連携状態: `/accounts` に口座別「最終取得日／更新状態(正常/設定エラー/要OTP)」→ 鮮度表示の元データ。
- 既知の注意: ①連携停止で薄くなる期間あり（鮮度表示で可視化）②`大項目=現金・カード`はATM引出等の内部移動で支出過大→補正必要。

## 5. データモデル（Supabase schema `mf_finance`）
| テーブル | PK | 主なカラム | 用途 |
|---|---|---|---|
| `transactions` | `id`(MFのID) | included, date, description, amount(負=支出), account, category_major, category_middle, memo, is_transfer, is_internal_move, classification, **source_type(business/salary/other/personal)**, llm_labeled, source, ingested_at | 入出金（冪等upsert）|
| `recurring_items` | bigserial | kind(income/expense), name, match_pattern, amount, day, **source_type**, active, confirmed(auto/user) | 固定費＋定期収入の一元管理（コアの肝）|
| `account_status` | bigserial | account, status, last_fetched_at, captured_at | **連携鮮度**（refresh時に /accounts から取得）|
| `asset_history` | `date` | total, deposit_cash_crypto, points | 資産推移 |
| `liability_snapshots` | `snapshot_date` | total, breakdown(jsonb), captured_at | MF負債の前方スナップショット |
| `manual_liabilities` | bigserial | name, lender, balance, rate, monthly_payment, as_of_date | 手入力借金（後続UI）|
| `category_rules` | bigserial | pattern, match_type, category_major, category_middle, classification, source_type, source(llm/manual) | ラベリング/タグ規則 |

RLS: 個人用単一ユーザー・anon無効。Next.js は server 側で service role、UIはログイン保護。

## 6. 派生ロジック（normalize で確定）
- 収支対象 = `included=1 AND is_transfer=0`。`is_transfer=1` は除外。
- 内部移動補正: `大項目=現金・カード` 等を `is_internal_move=true` で別管理し消費計算から除外。
- classification: transfer / internal / income / fixed / variable / unknown。
- **source_type**: 既定は口座・規則(`category_rules`)から推定（例: RICE CREAM給与口座→salary、案件入金→business）、UIで上書き可。第一弾は**収入のタグ付けを主**とし、支出の事業/家計は後続(確定申告モジュール)で拡張。

## 7. コア計算ロジック（今月）
```
定期収入見込み = Σ recurring_items(kind=income, active) の当月該当額
スポット着金   = 今月の入金(amount>0) のうち定期収入に未マッチの実着金
今月の収入見込 = 定期収入見込み + スポット着金   （source_type で内訳保持）
固定費         = Σ recurring_items(kind=expense, active, confirmed)
変動費実績     = 今月の支出 − 振替 − 内部移動 − 固定費該当
可処分枠       = 今月の収入見込 − 固定費
あと使える     = 可処分枠 − 変動費実績(これまで)
```
home は「あと使える」を主役表示＋内訳（収入見込／固定費／変動費実績／可処分枠）。**赤字接近・大口着金は警告表示**。

## 8. 定期項目 自動検出→確定 UX
取込時、`transactions` を `内容(正規化名)×近い金額` でグルーピングし月次周期性を検出→固定費/定期収入の候補提示（根拠：直近Nヶ月の出現・平均額）→陸さんが ON/OFF＋金額調整で `recurring_items` 確定（未操作の自動検出は `confirmed=auto`）。後続「サブスク検出UI」の素地を兼ねる。

## 9. アーキテクチャ／データフロー
```
refresh.mjs (chrome-devtools fetch, cron-ready, 当面手動) → raw/finance/moneyforward/*.csv (UTF-8, immutable)
  ＋ /accounts から連携状態を取得 → account_status
normalize.mjs → 派生フラグ付き normalized.json
load.mjs → Supabase mf_finance.* に ID で upsert（冪等）
Next.js(App Router) → Supabase 読取 → 可処分ダッシュボード(home)
```
各スクリプトは単一責務・独立テスト可能。技術: Next.js App Router＋Supabase（`ofmeton-apps` の `mf_finance` スキーマ分離）。UIは scaffold 直後ライトテーマ固定。

## 10. 実装フェーズ（第一弾）
- P0 データ更新: 全期間入出金＋資産推移＋連携状態を再fetch→raw 最新化。
- P1 `normalize.mjs`＋データモデル確定（DB不要・テスト可）。
- P2 Supabase `mf_finance` migration〔人間確認〕。
- P3 `load.mjs`＋`refresh.mjs`（cron-ready、account_status 取得込み）。
- P4 定期項目 自動検出→確定 ＋ source_type 推定。
- P5 可処分ダッシュボード(home)：あと使える＋内訳／月次収支・前月比・前年同月比・トレンド／連携鮮度＋refresh促し／口座・カード別利用／赤字着金警告／引落予定vs残高カレンダー。

## 11. 人間確認ゲート
Supabase migration（DB書込）／Vercel deploy（後続）／LLM従量課金（後続・コスト先出し）／cron有効化（将来）。

## 12. 検証
- P1: normalized 行数・月次集計が recon 突合値と一致（推測補完しない）。
- 可処分ロジック: home の「あと使える」が CSV 実集計（振替・内部移動・固定費除外後）と一致することを単体テストで担保。
- P5 UI: responsive-snap で全 viewport 崩れなし。連携鮮度・引落カレンダーは account_status/recurring_items を正しく反映。
- 取得は自分データの読取のみ（外部送信・金銭操作なし）。作業後 remote debugging 無効化。
