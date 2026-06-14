# mf-finance — 個人家計 分析ダッシュボード 設計

MF ME のエクスポートを取り込み、Claude で自動集計・分析する個人家計システム。
MF課金は継続（収集役）／本システムは分析役。SSOT データは Supabase `ofmeton-apps` の `mf_finance` スキーマ。

## 全体パイプライン
```
[1 ingest]   個人Chrome(ログイン済) に chrome-devtools で fetch
             /cf/csv(月次) ・ /bs/history/csv ・ /bs/liability(画面)
                 ↓ raw/finance/moneyforward/*.csv（UTF-8変換・immutable）
[2 normalize] scripts/normalize.mjs : CSV → 型付き・派生フラグ付き JSON（DB不要・テスト可）
                 ↓ apps/mf-finance/data/normalized.json
[3 load]     scripts/load.mjs : Supabase mf_finance.* に ID で upsert（要人間確認＝DB書込）
[4 enrich]   未分類取引を Claude API で大項目/中項目推定 → category_rules 蓄積
[5 app]      Next.js(App Router) ダッシュボード : Supabase 読取 → 可視化（Vercelデプロイ＝要確認）
```

## データモデル（Supabase schema `mf_finance`）
- **transactions**（入出金, PK=`id`＝MFのID列で冪等upsert）
  `id text PK, included bool(計算対象), date date, description text, amount int(負=支出), account text, category_major text, category_middle text, memo text, is_transfer bool(振替), is_internal_move bool(派生:現金引出等), classification text(fixed|variable|transfer|internal|income|unknown), llm_labeled bool, source text, ingested_at timestamptz`
- **asset_history**（資産推移, PK=`date`）
  `date date PK, total int, deposit_cash_crypto int, points int`
- **liability_snapshots**（負債・履歴CSVなし→前方スナップショット蓄積, PK=`snapshot_date`）
  `snapshot_date date PK, total int, breakdown jsonb, captured_at timestamptz`
- **category_rules**（自動/手動ラベリング規則）
  `id bigserial PK, pattern text, match_type text, category_major text, category_middle text, classification text, source text(llm|manual), created_at`

RLS: 単一ユーザー個人用。anon無効・service_role / 認証ユーザーのみ（Next.js は server 側で service key 使用、UIはログイン保護）。

## 派生ロジック（normalize で確定・分析の前提）
- 収支対象 = `included=1 AND is_transfer=0`。`is_transfer=1` は口座間移動で収支から除外。
- **内部移動補正**: 大項目`現金・カード`等のATM引出/カード引落（振替フラグ未付与の過大計上）を `is_internal_move=true` で別管理し、"真の消費"から除外（README既知注意点に対応）。
- 固定費/変動費: `category_rules` ＋ 既定ヒューリスティック（住宅/通信費/保険/サブスク=fixed）。
- income = amount>0 かつ 非振替・非内部移動。

## 機能モジュール（段階実装）
1. 月次収支ダッシュボード（収入/支出/収支・前月比・前年同月比・トレンド）
2. カテゴリ別深掘り＋固定費/変動費分離＋**使途不明金/内部移動補正**
3. サブスク・定期支払い自動検出（金額×名寄せの周期性）
4. 資産推移トラッキング＋KGI（月収26万・貯蓄）連動
5. 借金残高トラッキング（前方スナップショット）
6. 未分類取引の LLM 自動ラベリング（Claude API）
7. キャッシュフロー予測（固定費＋平均変動費）
8. 異常支出アラート（新規/大型取引フラグ）
9. 家計×事業(freee)統合ビュー（cashflow-tracker 連動）
10. 予算 vs 実績（MF予算データ）

## フェーズ計画
- P1: normalize.mjs ＋ データモデル確定（DB不要・本コミット）← 着手
- P2: Supabase `mf_finance` schema migration（要確認）
- P3: load.mjs upsert ＋ ingest/refresh スクリプト整理
- P4: Next.js scaffold ＋ 月次収支ダッシュボード（コア）
- P5: カテゴリ深掘り/固定変動/使途不明金
- P6: サブスク検出 ＋ 異常アラート
- P7: LLM 自動ラベリング
- P8: 資産/負債トラッキング ＋ KGI
- P9: freee統合 ＋ 予算実績
- P10: Vercel デプロイ（要確認）

## データ現況（2026-06-06 recon）
- 入出金 3,743行(2020-01〜2026-06, 計算対象+非振替 3,193) / 資産推移 51行(2025-03〜) / 負債 204,985円(snapshot)
- ⚠️ ポケットカード以外の連携が設定エラーで停止 → 2026-04以降データ激減・資産凍結。再連携で復活。
