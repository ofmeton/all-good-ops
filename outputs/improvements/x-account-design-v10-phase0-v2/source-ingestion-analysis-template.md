# 発信ネタ仕入れ方法分析テンプレ (Phase 0 v2 新規 9 項目)

> 各アカが何を見て / どんな情報源から / どんなタイムラグで / どんな選別基準で発信しているかを質的分析。  
> Sonnet 4.6 で 24 アカ × top 20 投稿 = 480 投稿を分析、各アカ 1 row として CSV 出力。

---

## 1. テンプレ schema

```
handle,information_source,publishing_lag_hours,selection_criteria,translation_rate_pct,paraphrase_rate_pct,opinion_rate_pct,citation_explicit_rate_pct,cross_platform_intake_rate_pct,original_rate_pct,notes
```

| 列 | 定義 | 値 (例) |
|---|---|---|
| **handle** | アカウントハンドル | `Shimayus` |
| **information_source** | 主要情報源 (複数 OK、`/` 区切り) | `海外X/公式ブログ/GitHub/論文/Discord` |
| **publishing_lag_hours** | リリース → 投稿までの時間 (中央値) | `12` (海外発表から半日後) |
| **selection_criteria** | 取り上げ基準 (LLM judge ベース要約 1-2 行) | `engagement期待値高い+教育的価値+速報性` |
| **translation_rate_pct** | 海外発信を直訳に近い形で出す比率 | `15` |
| **paraphrase_rate_pct** | 構造 + 固有名詞 + 数字を変更している比率 | `25` |
| **opinion_rate_pct** | 「リリース → ofmeton 想定の意見・所感」型の比率 | `35` |
| **citation_explicit_rate_pct** | URL 明示で引用する比率 | `60` |
| **cross_platform_intake_rate_pct** | 他媒体 (note / YouTube / Podcast 等) から拾う比率 | `20` |
| **original_rate_pct** | 本人事業経験から発信する比率 | `25` |
| **notes** | 質的観察メモ | `Claude Code を Discord で先取りしている、X 公式リリースの 3-6 時間前に発信が多い` |

---

## 2. 分析プロセス

```
input: raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts/<handle>.json
       (top 20 投稿 × 24 アカ = 480 投稿、各 100-200 字 + url + likes)

prompt to Sonnet 4.6 (per handle, 1 call):
  "あなたは X 発信者の情報収集パターン分析者です。
   下記 20 投稿を読み、以下 9 項目を推定してください:
   1. 主要情報源 (海外X/公式ブログ/GitHub/論文/Discord/Slack/podcast/本/案件メモ 等)
   2. リリース→投稿までのタイムラグ (時間単位、中央値)
   3. 取り上げ基準 (1-2 行)
   4. 翻訳率 (直訳に近い形で出す比率、%)
   5. 翻案率 (構造+固有名詞+数字を変更している比率、%)
   6. 所感率 (リリース→意見展開型の比率、%)
   7. 引用元明示率 (URL 明示の比率、%)
   8. cross-platform 仕入れ (他媒体から拾う比率、%)
   9. オリジナル率 (本人事業経験ベースの比率、%)
   
   投稿:
   <20 投稿の本文 + url + 投稿日時>"

output: 1 row in source-ingestion-analysis.csv per handle
```

24 アカ × 1 call × Sonnet 4.6 input 5,000 tok + output 1,500 tok:
- input 120K tok × $3/MTok = $0.36
- output 36K tok × $15/MTok = $0.54
- 合計 $0.90 = 約 ¥140 (1 回限り)

---

## 3. 集計後の活用先

### ofmeton 用 transfer (Style Guide v1.1 反映)

```
24 アカ中央値が示す典型パターン:
  - 主要情報源: ?
  - publishing_lag_hours 中央値: ?
  - translation_rate / paraphrase_rate / opinion_rate のバランス: ?
  - citation_explicit_rate の高低: ?

ofmeton の方針 (v10.3 §4.3.6 軸 1: 所感 1 : 翻案 3 : 実体験 4 : 業種別 SOP 2):
  - 海外情報の opinion_rate を高めに (15-20%)、citation は任意
  - publishing_lag は意図的に遅らせる (24-48h、解釈時間を確保)
  - cross-platform 仕入れは note / Podcast 系を Optimizer が月次 refresh
```

### Optimizer 月次 refresh への反映 (§4.8)

各アカの分析結果を `optimizer_competitor_meta` テーブルに保存:

```sql
CREATE TABLE optimizer_competitor_meta (
  handle text PK,
  last_analyzed_at timestamptz,
  information_source text[],
  publishing_lag_hours numeric,
  selection_criteria text,
  translation_rate_pct numeric,
  paraphrase_rate_pct numeric,
  opinion_rate_pct numeric,
  citation_explicit_rate_pct numeric,
  cross_platform_intake_rate_pct numeric,
  original_rate_pct numeric,
  notes text
);
```

月次 refresh で値を更新 → trend を Optimizer Phase 2 (Opus) で「アカウント傾向の変化」として人間判定提示。

---

## 4. 完了判定

- [ ] 24 アカ分の source-ingestion-analysis.csv 出力
- [ ] 中央値 + 上位 4 アカ (信頼ベース) の特徴をまとめた summary.md
- [ ] Style Guide v1.1 への反映 (translation/paraphrase/opinion 比率の参考値として)

---

## 5. 追加情報収集が必要な場合の運用ルール (v10.3 ユーザー指示、2026-05-26)

仕入れ方法分析の精度を上げるために **追加情報収集** (twitterapi.io 追加 query / 追加アカ取得 / 追加 Sonnet 分析等) が必要になった時:

1. Claude が **コスト試算を先に提示** (項目別 ¥ + 合計 ¥、想定 hit 件数、想定追加価値)
2. ユーザーが **承認** したらすぐ実行 (¥10,000 月予算枠内なら基本承認、超過時はトレードオフを明示)
3. 実行後の raw + 集計を `outputs/improvements/x-account-design-v10-phase0-v2/extensions/<YYYY-MM-DD>-<topic>.md` に記録

ユーザー方針 (2026-05-26 確定):
- 「**仕入れ方法分析に必要な情報収集の API コストは提案もらえたら承認する**」スタンス
- 「**調査コスト損くらいなら全然問題ない**」(¥100 単位の試算は躊躇わず提案 OK)
- Claude は黙って妥協せず、調査価値があれば必ず提案
- 月予算 ¥10,000 を超える提案のみ「枠拡張の承認 = 月予算上限変更」として §5.1 承認必須 4 種 の 1 つに該当
- 月予算枠内なら基本承認、トレードオフが小さい場合は黙って実行も可 (事後報告)

### 提案テンプレ (Claude が出す形式)

```
[仕入れ方法分析の追加情報収集 提案]

目的: <例: 海外英語圏 17 アカの分析項目 #51 主要情報源を深掘りする>

追加コスト試算:
  - twitterapi.io 追加 query 3 個 × 100 tweets = ¥9
  - Sonnet 4.6 質的分析 17 アカ × 1 call = ¥100
  - 合計: ¥109 (1 回限り)

期待される追加価値:
  - 海外発信者の "情報源 → 投稿" タイムラグの中央値 (現状不明)
  - ofmeton の opinion 投稿の publishing_lag_hours 設計に直結

実施判断: ユーザー承認待ち (!approve / !reject / !defer)
```
