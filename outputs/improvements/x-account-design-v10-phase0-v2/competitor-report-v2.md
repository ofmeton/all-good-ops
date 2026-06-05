# 競合調査 v2 レポート — 非エンジニア経営者向け AI 発信アカウント 24 アカ詳細分析

> Phase 0 v2 の競合調査 (24 アカ + 5 query + 9 項目仕入れ方法分析) を統合した最終レポート。  
> v10.3 設計書の Style Guide / Optimizer / Writer 章への transfer 推奨値を含む。

---

## 0. このレポートの位置付け

| 版 | 日付 | スコープ | 行数 |
|---|---|---|---|
| Phase 0 (v1) | 2026-05-24 | 10 アカ × 50 項目、無差別母集団 | 既存 `competitor-report.md` |
| **Phase 0 v2 (本 file)** | **2026-05-26** | **24 アカ (信頼 4 + 新 20) × 50 + 9 項目、target_fit 重視** | 本 file |
| Phase 0 v3 (将来) | 未定 | 海外英語圏拡張 + 国内士業/業種別深掘り | — |

### 改訂点 (v1 → v2)

1. 母集団から **target_fit_score < 0.5 の 6 アカを除外** (umiyuki_ai / kosuke_agos / minorun365 / icoxfog417 / ai_jitan / milbon_)
2. 信頼 4 アカを継承 (Shimayus / SuguruKun_ai / masahirochaen / ClaudeCode_love)
3. **新規 20 アカを追加** (ユーザー指定、§1.2)
4. 5 query (Q1-Q5) で 244 unique handles 発掘 → Phase 0 v3 候補プール
5. **9 項目「発信ネタ仕入れ方法分析」を新規追加** (Sonnet 4.6 で 24 アカ質的分析、CSV 永続化)
6. query 文字列・cursor chain を `query-meta.json` で永続化 (Phase 0 v1 で欠落していた再現性を確保)

---

## 1. 母集団の構成

### 1.1 既存信頼 4 アカ (継承)

| handle | 主軸 | 採用根拠 |
|---|---|---|
| Shimayus | AIエージェント実装・業務効率化、株式会社quai CEO 医師起業家 | 2026-05-25 ユーザー評価で「めっちゃ参考になる」確定 |
| SuguruKun_ai | ChatGPT/Claude/Gemini 全般 + 公式資料解説、AI研修・開発会社 CEO | 同上 |
| masahirochaen | AIニュース最速発信、デジライズ CEO、法人向け AI 開発・研修 | 同上 |
| ClaudeCode_love | Claude Code 機能速報 + 海外バズ、Claude Code ガチ勢 3 人運営 | 同上 |

### 1.2 新規 20 アカ (Phase 0 v2 で raw 取得)

国内 (推定 日本語主) と海外 (英語/スペイン語) を混在で取得し、target_fit を Sonnet 分析の中で確認:

| group | 該当 handle |
|---|---|
| 国内 Claude / Codex / Obsidian 系 | ClaudeCode_UT / obsidianstudio9 / claudecode_lab / ObsidianOtaku / so_ainsight / Codestudiopjbk / tetumemo / mmmiyama_D / MakeAI_CEO / daifukujinji / commte |
| 海外 (英語) AI / Codex / 開発系 | jason_coder0 / heynavtoor / ethancoder0 / cyrilXBT / csaba_kissi / ai_explorer25 / Atenov_D |
| 海外 (スペイン語) GitHub OSS | Fluyeporlaweb |
| 詳細不明 (要 Phase 0 v3 確認) | exploraX_ |

raw 永続化: `raw/publishing/research/2026-05-26-jp-ai-publishers-v2/raw/posts/<handle>.json` (新 20) + `posts-existing-4/<handle>.json` (既存 4)

### 1.3 5 query で発掘した 244 unique handles の上位 (Phase 0 v3 候補)

非エンジニア経営者向け target ニッチに query が刺さっている兆候:

| handle | hit 数 | 推定領域 |
|---|---|---|
| **kandmybike** | 15 | 要確認 (国内、自転車? AI?) |
| **AIshukyaku** | 13 | 集客 × AI |
| **ichiaimarketer** | 12 | マーケター × AI |
| **Jeanscpa** | 7 | 会計士系 (士業 hit) |
| **sakai_tax** | 5 | 税理士系 |
| **TakeshiYonese** | 5 | 要確認 |
| **houki_ai_keiri** | 5 | 経理 × AI (target に直撃) |
| **nekokoroconsul1** | 4 | コンサル × AI |
| **taharakoichi** | 4 | 要確認 |
| **sugawara11** | 4 | 要確認 |

→ Phase 0 v3 で 5-10 アカを追加母集団化候補

### 1.4 Q5 が 0 件だった件

Q5 = `"AI automation" ("small business" OR "non-engineer" OR "non-coder") -is:retweet lang:en min_faves:100`

→ **0 tweets**。原因仮説:
- `min_faves:100` が厳しすぎ (海外英語圏 X では Claude Code 系 tweet は数十 faves が標準)
- 単語の組合せが narrow (`small business` よりも `SMB` / `agency` / `freelancer` が一般的)
- twitterapi.io advanced_search の英語 token 解析が日本語ほど smooth でない可能性

Phase 0 v3 で再設計予定:
- `min_faves:30` まで緩和
- query を `"non-technical" OR "non-engineer" OR "SMB" OR "agency"` に拡張
- `"AI automation" -is:retweet lang:en` + 個別キーワードに分割

---

## 2. 9 項目仕入れ方法分析 (Sonnet 4.6) サマリ

詳細は `source-ingestion-analysis-summary.md` 参照。中央値:

| 項目 | 中央値 | 解釈 |
|---|---|---|
| publishing_lag_hours | **9h** | 海外発表から半日以内 |
| translation_rate | 7.5% | 直訳は少ない |
| **paraphrase_rate** | **32.5%** | **主流パターン** |
| opinion_rate | 17.5% | 控えめ |
| citation_explicit_rate | 37.5% | 半数以下のアカが引用元明示 |
| cross_platform_intake | 40% | 半数程度 |
| original_rate | 27.5% | 中程度 |

### 主要情報源 (24 アカ中)

1. 海外X: 96% (23 アカ)
2. 公式ブログ: 75% (18 アカ)
3. GitHub: 62% (15 アカ)

→ **3 大情報源で 80%+ をカバー**。Discord / Podcast / 国内資料は 25% 以下 = 差別化余地

### アカウント タイポロジー

- **Type A (12 アカ)**: 海外X 翻案・要約・パラフレーズ型 (定型フォーマット、煽り CTA)
- **Type B (3 アカ)**: 一次体験・本人実装型 (mmmiyama_D / daifukujinji / masahirochaen) **← ofmeton の参考軸**
- **Type C (5 アカ)**: 英語圏キュレーション再パッケージ型 (リスト編集中心、引用希薄)
- **Type D (2 アカ)**: コミュニティ活動・短文返信型

---

## 3. テーマ × フォーマット マトリクス (24 アカ x 全カバー)

縦軸: テーマ (target に刺さるか) / 横軸: フォーマット (発信スタイル)

| テーマ \ フォーマット | 海外バズ翻案 | Tips リスト | 一次体験デモ | 所感型 (リリース→意見) | 失敗談 | 業種別 SOP |
|---|---|---|---|---|---|---|
| Claude Code 機能速報 | ◎ 12 アカ | ○ 6 | △ 3 | △ 2 | × 0 | × 0 |
| プロンプト集 | ○ 7 | ◎ 9 | △ 2 | △ 1 | × 0 | × 0 |
| AI ツール比較 | ○ 5 | ◎ 8 | △ 2 | △ 1 | × 0 | × 0 |
| GitHub OSS 紹介 | ○ 6 | ◎ 6 | △ 1 | △ 1 | × 0 | × 0 |
| 業務効率化 (経理/請求書/見積) | × 0 | △ 2 | △ 2 | × 0 | × 0 | **△ 2** |
| 士業 (税理士/社労士) × AI | × 0 | × 0 | × 0 | × 0 | × 0 | × 0 |
| 中小経営者 1 人社長向け | × 0 | △ 1 | △ 1 | × 0 | × 0 | × 0 |
| AI 実装失敗談 | × 0 | × 0 | × 0 | × 0 | **× 0** | × 0 |

凡例: ◎ 8+ / ○ 5-7 / △ 1-4 / × 0

### 空白領域 (Tier 1 = 最優先) — 1〜2 アカ以下しかカバーしていない

1. **AI 実装失敗談** (全 24 アカで 0 件、Phase 0 v1 でも 3.2% のみ確認、ofmeton の 8 倍差別化レバーとして既確証)
2. **業種別 SOP (経理/請求書/見積/家庭教師/民泊清掃)** (houki_ai_keiri など Phase 0 v3 候補にのみ存在、ofmeton は terra-isshiki / minpaku-cleaning / RICE CREAM の素材で先行可能)
3. **士業 × AI 実装** (税理士/社労士/行政書士向け、Q2 hit handle = Phase 0 v3 候補で発見、ofmeton 自身は士業でないが「翻訳者」ポジション活用可)
4. **中小経営者 1 人社長向け Claude 活用事例** (Q1 hit handle = 同上)

### 二次空白 (Tier 2 = 4 アカ以下)

5. AI ツール比較を一次体験デモで (3 アカのみ)
6. 業務効率化を所感型で (0-1 アカ)

### Tier 3 (差別化余地はあるが供給は十分)

7. Claude Code 機能速報 (12 アカ、ただし「実装の失敗→修正の記録」軸は空白)
8. プロンプト集 (9 アカ、ただし「非エンジニア向け業務翻訳」軸は空白)

---

## 4. ofmeton 用 推奨コンテンツ角度

### 4.1 第 1 軸 (最強差別化)

**「AI 実装失敗談 → 修正の記録」型ポスト**
- 24 アカ全員が 0% で発信していない
- ofmeton の "Python/Java/業務自動化バックグラウンド + Claude Code 実運用" のクレデンシャルと整合
- 失敗 → 修正のセット = 「Tips」「Before/After」「Carousel」全フォーマット展開可

### 4.2 第 2 軸 (target 直撃)

**「業種別 SOP (経理/請求書/見積/民泊清掃/士業)」型ポスト**
- terra-isshiki / minpaku-cleaning / RICE CREAM の自分の案件素材で先行可能 (DLP redaction で固有名詞マスク前提)
- 競合 24 アカ中 0-2 アカのみカバー
- note 有料記事への直接転換可 (例: 「中小経営者向け請求書発行自動化 SOP 完全版 ¥1,480」)
- **v1.2 改訂**: 士業 (税理士/社労士/行政書士) は主軸ターゲットから外し、本 industry_sop 軸の **1 業種セグメント** として扱う。発信トーンは経営者向けに統一しつつ業種別 SOP の対象には士業も含める

### 4.3 第 3 軸 (誠実性レバー)

**「引用元明示 60%+」「publishing_lag 24-48h (意図的に遅らせる)」**
- 競合中央値: citation_explicit 37.5% / lag 9h
- ofmeton: citation 60%+ / lag 24-48h で「速報 → 解釈時間を入れた所感」型に
- ニッチではないが信頼形成のレバー

### 4.4 第 4 軸 (補助)

**「Discord / Podcast / 国内資料」など低使用情報源の活用**
- Discord (1 アカ) / 国内資料 (1 アカ) = ほぼブルーオーシャン
- ofmeton の Claude Code Discord 参加履歴を活用可

---

## 5. Phase 1 着手前の transfer 設計

詳細は `style-guide-v1.1.md` 参照。主要 transfer:

| 項目 | 競合中央値 | **ofmeton 推奨** | 根拠 |
|---|---|---|---|
| paraphrase_rate | 32.5% | **20%** | 翻案は主流だが他で差別化 |
| opinion_rate | 17.5% | **30%** | 所感は弱い競合多数 |
| original_rate | 27.5% | **40%** | 一次体験 + 失敗談で差別化 |
| translation_rate | 7.5% | **10%** | ほぼ維持 |
| citation_explicit_rate | 37.5% | **65%+** | 誠実性レバー |
| publishing_lag_hours | 9h | **24-48h** | 解釈時間を確保 |
| cross_platform_intake | 40% | **35-50%** | 競合と同等。note / Podcast を refresh で確認 |

### 情報源プリセット

ofmeton の初期プリセット (v10.3 §3.1 素材レイヤー方針との整合):
1. 海外X (Anthropic / OpenAI / 開発者の公式アカ) ← twitterapi.io 経由
2. 公式ブログ (Anthropic Claude Tips / OpenAI / Google AI)
3. GitHub Trending (Claude Code / Codex / AI ツール)
4. **Claude Code 履歴 + Git commit + 案件メモ (terra-isshiki / minpaku-cleaning / RICE CREAM)** ← 一次体験ソース
5. Discord (Claude Code / Anthropic) ← 競合 1 アカのみ使用、差別化レバー
6. 音声メモ (案件中の気づき) ← 公開許諾 gate 通過後

---

## 6. Phase 1 着手前ブロッカー 5 件の状況再確認

cs:p2-5906 / p2-3936 の 5 件ブロッカー:

1. ✅ §10.3 バックアップアカウント問題 → v10.3 で所有導線に置換済 (PR #20 で確定、PR #21 で main 到達)
2. ✅ 公開許諾 gate → v10.3 で Schema 明文化済
3. ✅ §3.3 コスト過小見積 → cs:p2-aeba で実測 ¥6,500/9,154/13,800 月確定
4. ⚠️ X OAuth 2.0 PKCE offline.access scope → 実機テストは未着手 (HUMAN_TASKS H-1)
5. ✅ Hook 比率 75% 重複ラベル → v10.3 §4.7 で primary_hook + devices 再分類済

→ **#4 は人間タスク**。Claude 側で詰める作業は Phase 0 v2 と本レポートで完了

---

## 7. 次フェーズへの引き継ぎ

### 即着手可能 (Claude 側)

- [x] source-ingestion-analysis.csv 出力 (#2 完了)
- [x] summary.md (本レポート §2 + 別 file)
- [x] **competitor-report-v2.md (本 file)** (#3 完了)
- [x] **style-guide-v1.1.md** (#3 完了)

### 人間タスク (ofmeton 本人、¥980-1,500 初期 + Phase 1 月¥9,414)

cs:p2-5906 の残課題 #4:
- HUMAN_TASKS H-1 (X Developer Console)
- HUMAN_TASKS H-2 (Supabase project 作成)
- HUMAN_TASKS H-3 (Anthropic key)
- HUMAN_TASKS H-4 (OpenAI key)
- HUMAN_TASKS H-5 (Cloudflare Workers Paid)
- HUMAN_TASKS H-8 (所有ドメイン取得)
- HUMAN_TASKS H-10 (X 投稿アカウント認証)

### Phase 0 v3 候補 (将来、推定 ¥80-150)

- 5 query 発掘 244 handles から target_fit_score ≥ 0.5 を 5-10 アカ追加母集団化
- Q5 (海外英語圏) を再設計して再実行
- 候補上位: kandmybike / AIshukyaku / ichiaimarketer / Jeanscpa / sakai_tax / houki_ai_keiri / nekokoroconsul1

### Phase 1 (着手 = 1 投稿/日、月 ¥9,414)

- 失敗談軸 ・業種別 SOP 軸でコンテンツ 30 本投下
- Style Guide v1.1 の transfer 値で運用
- 30 日後に PCR / url_link_clicks / followers の実測値を Optimizer に投入
