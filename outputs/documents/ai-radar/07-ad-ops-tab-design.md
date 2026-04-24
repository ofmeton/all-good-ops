# ai-radar 広告運用タブ 設計ドキュメント

**作成日**: 2026-04-25
**作成者**: 工藤陸 + Claude (brainstorming skill)
**位置づけ**: ai-radar 第3パイプライン（広告運用キャッチアップ）の要件定義＋設計
**前提ドキュメント**:
- `./01-implementation-plan.md` — 既存 ai-radar の全体実装計画
- `./04-sources.md` — 既存25ソース
- `./05-schema.sql` — Supabase DDL
- `../marketing-catchup-2023-2026/SPEC.md` — 過去2.5年分の一気キャッチアップPPTX（別プロジェクト、棲み分けは §16 参照）

---

## 1. 目的

AIエコシステム機会発見 / Skills事業防衛 に続く第3の用途として、**広告運用の媒体情報・トレンド・業界知識・AI活用情報のキャッチアップ**を ai-radar に統合する。

背景:
- ユーザーは広告運用の現役から約2年離れており、媒体仕様・業界動向の再キャッチアップが必要
- BSA の L3商品（Rapid LP + 広告運用初月 10万円）の質向上と提案武器化が必要
- 生成AIを使った広告運用（AI×広告）で差別化ポジションを取りたい

目的は以下4つが同時並行：

| 記号 | 目的 | 内容 |
|---|---|---|
| A | 現場復帰 | 媒体仕様・UI・入札戦略・計測の再キャッチアップ |
| B | 受注武器化 | 提案・商談で使える事例・数字・ベンチマーク収集 |
| C | AI×広告差別化 | 生成AI活用の広告運用手法・ツールの動向把握 |
| D | 業界雑食 | 媒体・業界ニュース・ポリシー変更の網羅把握 |

対外的な見せ方（Google/Meta主軸・Yahoo!を前面に出さない等）はキャッチアップ対象には関係しない。媒体は Yahoo!/LINE/Amazon/Criteo/X/Microsoft 等も含めて網羅的に拾う。

---

## 2. スコープの大前提

- **既存 ai-radar に統合**。別プロジェクト化しない
- **インフラ全流用**: Vercel Cron / Supabase / Gemini 2.5 Flash + Haiku 4.5 / 深掘りキュー / Gmail通知
- **ダッシュボードは3タブ構成**に拡張: 機会発見 / 事業防衛 / 広告運用（新規）
- **1記事は複数タブに多重所属可**（例: Google Ads の Gemini入札リリース → 事業防衛 ∧ 広告運用）

---

## 3. UI

### 3.1 タブ構造

```
[ 機会発見 ] [ 事業防衛 ] [ 広告運用 ]  ← 新規
```

### 3.2 広告運用タブのレイアウト

```
┌──────────────────────────────────────────────────────┐
│ 🚨 広告運用トリガーフラグ（該当時のみ赤帯）            │
├──────────────────────────────────────────────────────┤
│ フィルタチップ: [媒体▼] [テーマ▼] [形式▼] [並び順▼]   │
├──────────────────────────────────────────────────────┤
│ 記事カード（デフォルト: 媒体変化度順）                 │
│ ┌──────────────────────────────────────────┐        │
│ │ [Meta] Advantage+ ショッピング新機能      │        │
│ │ 総合 82 ｜変化 90 受注 60 AI 70 実務 85  │        │
│ │ タグ: #媒体:Meta #テーマ:新機能 #AI活用  │        │
│ │ [深掘り依頼]                              │        │
│ └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

### 3.3 並び順切替

| ソートキー | 想定ユースケース |
|---|---|
| 媒体変化度（デフォルト） | 「何が変わったか」をキャッチアップしたい時 |
| 受注ネタ度 | 提案ネタを仕入れたい時 |
| AI活用度 | AI差別化ネタを探す時 |
| 実務直結度 | 今日明日の運用で使える情報を探す時 |
| 総合スコア | 全体俯瞰 |
| 新着順 | 時系列確認 |

### 3.4 フィルタチップ

- **媒体**: Google / Meta / TikTok / LinkedIn / X / Yahoo / LINE / Amazon / Microsoft / Criteo / 複数
- **テーマ**: 新機能 / UI変更 / ポリシー変更 / サ終・廃止 / 入札・アルゴリズム / 計測・アトリビューション / クリエイティブ / B2B / EC / ローカル / ブランド / AI活用 / ケーススタディ / ベンチマーク
- **形式**: 公式発表 / 業界ニュース / 事例・数字 / 解説・How-to / 個人見解 / コミュニティ議論 / ツールリリース

複数選択可。タブ上部にチップ配置、選択状態はURLクエリパラメータで保持。

---

## 4. パイプライン（`pipeline-ad-ops.ts`）

既存の `pipeline-opportunity.ts` / `pipeline-business.ts` と同パターン：

```
RSS/GitHub/スクレイプ取得
  ↓
Gemini 2.5 Flash: 日本語要約 + タグ付け（媒体/テーマ/形式）
  ※ 英語記事は既存パイプライン同様にGeminiで日本語要約して保存
  ↓
Haiku 4.5: サブスコア4軸を同一プロンプト内で同時算出
  ↓
総合スコア計算（均等重み 0.25 × 4、初期値）
  ↓
広告運用トリガーキーワード照合 → ad_ops_trigger_flag セット
  ↓
Supabase 保存
  ↓
必要に応じて Gmail 即時通知（Tier1ソース or トリガー発火時）
```

既存 `pipeline-business.ts` / `pipeline-opportunity.ts` との相違点：
- サブスコア4軸算出（既存は単一スコア）
- タグ体系が広告運用特化
- トリガーキーワードが広告運用ドメイン専用
- 多重所属前提（他パイプラインと同一記事でもそれぞれが独立にスコア付与）

---

## 5. スコアリング

### 5.1 サブスコア4軸（0-100）

| 軸 | 定義 | 高得点例 | 低得点例 |
|---|---|---|---|
| **媒体変化度** | 媒体の仕様/UI/ポリシー/商品設計の変化の大きさ | サ終・機能廃止・大型リリース・入札ロジック変更 | マイナーUI調整・既報の焼き直し |
| **受注ネタ度** | 提案・商談で使える具体数字・事例・ベンチマークの濃度 | 「CPA○円→○円」「CV○倍」等の数値事例、業種別ベンチマーク | 抽象論・思想・ポエム |
| **AI活用度** | 生成AI/機械学習の広告運用への実装度・新規性 | AI入札の新機能、クリエイティブ自動生成の実装事例、運用AIエージェント動向 | AI要素なし |
| **実務直結度** | ユーザーが明日の運用（日本×Google/Meta中心）で使えるか | 日本でGAされてる機能、具体手順、既存アカウントで再現可能 | 海外限定プレビュー、研究段階、米国小売特化 |

### 5.2 スコア算出

- Haiku 4.5 で1プロンプト内に4軸同時スコア化（コスト節約）
- 既存の `business-impact.ts` と同パターンで `src/lib/prompts/ad-ops-subscores.ts` を新設
- プロンプト内で4軸それぞれの評価基準を明示し、JSON構造で返却

### 5.3 総合スコア

`ad_ops_total_score = 0.25 × 変化 + 0.25 × 受注 + 0.25 × AI + 0.25 × 実務`

初期は均等重み。3ヶ月運用後にヒット実績と手動ラベル（読んだ/読まなかった）をもとに重み再設計。

タブ内のデフォルトソートは**媒体変化度**（キャッチアップ目的に最も直結）。

### 5.4 広告運用トリガーフラグ

`ad_ops_trigger_flag = true` の記事は即時Gmail＋ダッシュボード赤帯。キーワードセット2カテゴリ：

#### 商品設計直撃

```
英語: agency restriction, agency certification, Performance Max deprecation,
      Advantage+ pricing, platform management fee, ad agency regulation,
      minimum spend change, ad platform fee change
日本語: 運用代行 認定, 運用代行 規制, 月次運用費, 最低出稿額,
        媒体社 手数料変更, 代理店手数料, 運用代行 禁止
```

#### 競合ポジション直撃

```
英語: AI ad ops agency, AI marketing agent, autonomous ad ops,
      AI bidding agency, generative ad agency,
      ClaudeSkills ads, n8n ads plugin
日本語: AI広告運用代行, AIエージェント広告, 自動運用AI,
        AI入札代行, 生成AI広告代理店
```

ヒット時は `ad_ops_trigger_reason` カラムに該当キーワードを記録。既存の事業防衛トリガー（`business_trigger_flag`）とは独立に管理。

---

## 6. 情報源

### 6.1 Tier 1（毎時クロール・即時通知対象）

主要4媒体公式。破壊的変更を即時キャッチするため毎時クロール。

| 媒体 | 想定URL | 方式 |
|---|---|---|
| Google Ads & Commerce Blog | blog.google/products/ads-commerce/ | RSS |
| Meta for Business News | www.facebook.com/business/news | RSS/スクレイプ |
| TikTok Business Blog | www.tiktok.com/business/ja/blog | RSS/スクレイプ |
| LinkedIn Marketing Solutions Blog | business.linkedin.com/marketing-solutions/blog | RSS |

### 6.2 Tier 2（朝夜クロール）

#### その他媒体公式
Yahoo!広告公式 / LINE for Business / Amazon Ads / Microsoft Advertising Blog / Criteo Blog / X Business

#### 海外業界メディア
Search Engine Land / Search Engine Roundtable / Marketing Land / MarTech / AdAge / Digiday / AdExchanger / The Drum

#### 日本業界メディア
MarkeZine / DIGIDAY JP / Exchangewire JP / 電通報 / 宣伝会議 / Web担当者Forum / ITmedia マーケティング

#### AI×広告特化
AdCreative.ai Blog / Pencil Blog / Smartly.io Blog / HubSpot AI / Zapier AI / Anthropic・OpenAI の広告ユースケース発信 / 関連スタートアップ公式発信

### 6.3 Tier 3（週次まとめ）

#### Reddit コミュニティ
r/PPC / r/adops / r/FacebookAds / r/bigseo

#### 日本の個人発信
辻正浩 / 中村修平 / その他有力運用者の note・X長文（長期的に人選追加）

#### ニュースレター
RSS化可能なもの: Search Engine Journal NL / MarTech Today 等

### 6.4 Phase 2 以降

| カテゴリ | 理由 |
|---|---|
| YouTube / Podcast | 文字起こしパイプライン要実装（Perpetual Traffic / Marketing School 等） |
| 特許・求人・投資動向 | AdTech系投資ニュース・求人トレンド |
| 中国語ソース | 翻訳パイプライン整備後 |

### 6.5 初期投入規模

MVP時点で **Tier1-2 の約30ソース** を seed 投入。Tier3は Phase 2 で追加し合計40-50ソースまで拡張。

### 6.6 ソース信頼度スコア初期値

既存 `sources` テーブルの `trust_score` (0-10) を広告運用ソースにも付与。初期値方針：

| カテゴリ | trust_score 初期値 |
|---|---|
| 主要媒体公式（Google/Meta/TikTok/LinkedIn 等） | 10 |
| その他媒体公式（Yahoo/LINE/Amazon/Microsoft/Criteo/X） | 9 |
| 海外業界メディア（Search Engine Land / MarTech 等） | 8 |
| 日本業界メディア（MarkeZine / DIGIDAY JP / Web担 等） | 7 |
| AI×広告特化スタートアップ公式発信 | 7 |
| 日本の個人発信（note・X長文） | 6 |
| ニュースレター | 6 |
| Reddit コミュニティ | 4 |

※ 各ソースの具体URL・RSSフィード確定は実装計画（writing-plans）側で行う。

---

## 7. タグ体系

広告運用タブ専用タグを3軸で付与。Gemini 2.5 Flash のタグ付けプロンプトで自動生成。

| 軸 | 値 |
|---|---|
| **媒体** | `Google` `Meta` `TikTok` `LinkedIn` `X` `Yahoo` `LINE` `Amazon` `Microsoft` `Criteo` `複数` `媒体横断` |
| **テーマ** | `新機能` `UI変更` `ポリシー変更` `サ終/廃止` `入札/アルゴリズム` `計測/アトリビューション` `クリエイティブ` `B2B` `EC` `ローカル` `ブランド` `AI活用` `ケーススタディ` `ベンチマーク` |
| **形式** | `公式発表` `業界ニュース` `事例/数字` `解説/How-to` `個人見解` `コミュニティ議論` `ツールリリース` |

DB には JSONB で `ad_ops_tags: {"media": [...], "theme": [...], "format": [...]}` として格納。

---

## 8. 通知・鮮度

既存の ai-radar 通知基盤にセクション追加で統合。

| 頻度 | 内容 |
|---|---|
| **Tier1即時Gmail** | `ad_ops_trigger_flag=true` または Tier1ソース（主要4媒体公式）の新着 → 即時送信 |
| **朝8時ダイジェスト** | 広告運用タブの直近12h Top5（`ad_ops_total_score` 降順、同値時は `ad_ops_change_score` 降順でタイブレーク） |
| **夜20時ダイジェスト** | 朝8時以降の新着 Top5（同上の並び順） |
| **日曜8時 週次** | 週のトップ記事（直近7日の `ad_ops_total_score` Top10）・テーマ別集計・気になった動き |
| **月次（1日10時）** | ソース別ヒット率・スコア分布・トリガー発火履歴・ソース追加削除提案 |

Gmailテンプレートは既存 `digest-builder.ts` に「## 📣 広告運用」セクションを追加。

---

## 9. 月次レポート統合

ai-radar エージェントが作成する月次レポートに広告運用セクション追加：

- 広告運用タブのヒット記事 Top10
- 媒体別・テーマ別のヒット分布
- トリガーフラグ発火履歴
- ユーザーの L3商品（LP+広告運用10万）への示唆と要アクションの有無
- サブスコア重みの見直し提案（3ヶ月実績蓄積後）

---

## 10. ai-radar エージェント拡張

`/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/ai-radar.md` を改訂：

### 守備範囲に追加
- 広告運用の媒体情報・トレンド・業界知識キャッチアップ支援
- 広告運用 × AI活用情報の解釈と優先度判定
- 広告運用トリガーフラグ発火時の即時解釈と推奨アクション提示

### 受け取る依頼例に追加
- 「広告運用の最新トレンドどう？」
- 「Google Ads の新機能ウォッチして」
- 「Meta Advantage+ の動きある？」
- 「L3商品に影響ありそうな動きある？」

### 出力フォーマットに追加
状況報告型の末尾に以下セクション：

```
## 📣 広告運用 Top3
1. [媒体] 日本語タイトル（総合: xx/100｜変化:xx 受注:xx AI:xx 実務:xx）
   - Why this matters: 1行
   - L3商品への示唆 or 運用アクション: 1行
```

### 起動時チェックに追加
- `ad_ops_trigger_flag` が立っている記事があれば最優先で報告

---

## 11. データモデル追加

### 11.1 articles テーブル

既存の `pipeline` enum カラムを拡張して多重所属を表現（既存クエリの書き換え最小化）。列追加は広告運用専用フィールドのみ。

**既存 `pipeline` enum 拡張**:
```
既存: 'opportunity' | 'business_defense' | 'both' | 'noise'
追加: 'ad_ops' | 'opp_ad' | 'biz_ad' | 'all'
```

| enum値 | 意味 |
|---|---|
| `opportunity` | 機会発見のみ |
| `business_defense` | 事業防衛のみ |
| `both` | 機会発見＋事業防衛（既存） |
| `ad_ops` | 広告運用のみ |
| `opp_ad` | 機会発見＋広告運用 |
| `biz_ad` | 事業防衛＋広告運用 |
| `all` | 3パイプライン全て |
| `noise` | ノイズ（どこにも入れない） |

広告運用タブ表示クエリは `pipeline IN ('ad_ops', 'opp_ad', 'biz_ad', 'all')`。

**列追加**:
```sql
ALTER TABLE articles ADD COLUMN ad_ops_change_score      smallint;  -- 媒体変化度 0-100
ALTER TABLE articles ADD COLUMN ad_ops_sales_angle_score smallint;  -- 受注ネタ度 0-100
ALTER TABLE articles ADD COLUMN ad_ops_ai_usage_score    smallint;  -- AI活用度 0-100
ALTER TABLE articles ADD COLUMN ad_ops_practical_score   smallint;  -- 実務直結度 0-100
ALTER TABLE articles ADD COLUMN ad_ops_total_score       smallint;  -- 総合スコア 0-100
ALTER TABLE articles ADD COLUMN ad_ops_trigger_flag      boolean DEFAULT false;
ALTER TABLE articles ADD COLUMN ad_ops_trigger_reason    text;
ALTER TABLE articles ADD COLUMN ad_ops_tags              jsonb;
```

**インデックス**:
```sql
CREATE INDEX idx_articles_ad_ops_total_score
  ON articles (ad_ops_total_score DESC)
  WHERE pipeline IN ('ad_ops', 'opp_ad', 'biz_ad', 'all');

CREATE INDEX idx_articles_ad_ops_trigger
  ON articles (ad_ops_trigger_flag, published_at DESC)
  WHERE ad_ops_trigger_flag = true;
```

### 11.2 sources テーブル

既存 `pipeline` カラムを廃止し、`in_opportunity` / `in_business_defense` / `in_ad_ops` の boolean 3列化する。

理由：
- 多重所属ソース（例: PR Times AI が機会発見と事業防衛の両方に属する既存ケース）を正しく表現
- 今後の Phase 追加（例: `in_kodomo_ibasho` 等）でも拡張容易
- sources テーブルは articles より参照頻度が低く、既存クエリ影響が限定的

**既存データ移行**:
- `pipeline = 'opportunity'` → `in_opportunity = true`
- `pipeline = 'business_defense'` → `in_business_defense = true`
- `pipeline = 'both'` → `in_opportunity = true AND in_business_defense = true`

---

## 12. 実装フェーズ分け

| Phase | 内容 |
|---|---|
| **MVP (Phase 1)** | タブUI追加 / `pipeline-ad-ops.ts` 実装 / サブスコア4軸プロンプト / トリガーキーワード実装 / Tier1-2 約30ソース seed / Gmail通知セクション追加 / ai-radar エージェント定義更新 / DBマイグレーション |
| **Phase 2** | Tier3 ソース追加（Reddit・日本個人発信・ニュースレター、合計40-50件）/ 月次レポート広告運用セクション精緻化 / サブスコア重み再設計（3ヶ月実績蓄積後） |
| **Phase 3** | YouTube/Podcast 文字起こしパイプライン / 特許・求人・投資動向 / 中国語ソース |

---

## 13. 非スコープ（今回やらない）

- **自動化された広告運用（実行系）**: これはキャッチアップ用であって、実入札や入稿自動化は対象外
- **日本語AIニュースの既存ソースとの重複排除**: Tier2の日本業界メディアの一部は既存の機会発見・事業防衛ソースと重なるが、`ad_ops_in_pipeline` を多重所属で持つので問題として扱わない
- **認証・ユーザー別設定**: 既存同様 URL knowing のみ
- **モバイル専用UI最適化**: 既存タブと同様、デスクトップ優先で設計（モバイルでも閲覧可能だが主対象ではない）
- **広告運用スキル教材・学習コンテンツの自動生成**: 別プロジェクト

---

## 14. 決定事項サマリ

| 項目 | 決定内容 |
|---|---|
| 統合方針 | 既存 ai-radar の第3パイプラインとして統合 |
| タブ構造 | 機会発見 / 事業防衛 / 広告運用（3タブ） |
| 記事の多重所属 | 可能（1記事が複数タブに出現可） |
| スコア軸 | サブスコア4軸（媒体変化度 / 受注ネタ度 / AI活用度 / 実務直結度） |
| 総合スコア | 均等重み合成（初期 0.25 × 4、3ヶ月後再設計） |
| デフォルトソート | 媒体変化度（タブ内） |
| トリガーフラグ | 広告運用専用 `ad_ops_trigger_flag` を新設（商品設計直撃＋競合ポジション直撃の2カテゴリ） |
| 媒体カバレッジ | Google/Meta/TikTok/LinkedIn/X/Yahoo/LINE/Amazon/Microsoft/Criteo を網羅 |
| 情報源Tier | Tier1=毎時+即時 / Tier2=朝夜 / Tier3=週次 |
| MVP情報源数 | 約30ソース（Tier1-2） |
| Phase 2情報源数 | 合計40-50ソース（Tier3追加） |
| タグ体系 | 媒体 × テーマ × 形式 の3軸 |
| 通知 | 既存 Gmail 基盤に「📣 広告運用」セクション追加 |
| 月次レポート | 広告運用セクション追加（L3商品への示唆含む） |
| ai-radar エージェント | 守備範囲・出力フォーマット・依頼例・起動時チェックに広告運用を追加 |
| DBスキーマ articles | 既存 `pipeline` enum を `ad_ops`/`opp_ad`/`biz_ad`/`all` で拡張 + 広告運用専用列8つ追加 |
| DBスキーマ sources | 既存 `pipeline` カラム廃止、`in_opportunity` / `in_business_defense` / `in_ad_ops` の boolean 3列化 |

---

## 15. 関連プロジェクトとの棲み分け

同時期に進行中の `outputs/documents/marketing-catchup-2023-2026/` は**過去2.5年分（2023-09 以降）の一気キャッチアップPPTX**（約250ページ、静的成果物）。本プロジェクト（ai-radar 広告運用タブ）は**2026-04-25 以降のリアルタイム継続監視ダッシュボード**。両者は補完関係：

| 観点 | marketing-catchup-2023-2026 | ai-radar 広告運用タブ（本件） |
|---|---|---|
| 時間軸 | 過去2.5年の一気圧縮 | 現在以降の継続監視 |
| 形式 | PPTX（静的資料） | Web ダッシュボード（動的フィード） |
| スコープ | 有限（1回作って完成） | 無限（日々更新） |
| ユースケース | 知識ベースの再構築 | 日次キャッチアップ＋トリガー検知 |
| BSA L3 への還元 | 実装ガイド章として一括整理 | トリガー発火時の即時示唆・月次レポート |

両者の成果物は相互参照可能。marketing-catchup-2023-2026 の PPTX で基礎を固めた後、ai-radar 広告運用タブで差分キャッチアップを続ける想定。

---

## 16. 次のステップ

1. 本ドキュメントをレビュー・承認
2. writing-plans スキルで実装計画（`08-ad-ops-implementation-plan.md`）を作成
3. system-engineer に委譲して MVP 実装に着手
4. 初期ソースリスト具体化（実装計画フェーズ）
5. プロンプトテンプレート詳細化（実装計画フェーズ）
