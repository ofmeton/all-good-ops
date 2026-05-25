# X 発信アカウント運用自動化システム 設計書 v10 — 統合完全版

> v9 (1,177 行) + v9.1 note 詳述 (539 行) + v9.2 X/IG 詳述 (459 行) = 計 2,175 行を 1 つに統合した完全版設計書。
> v10 が new main 設計書として位置付けられ、v9 / v9.1 / v9.2 の独立 file は履歴として残置。
> 本ドキュメントだけで全 3 媒体 (X / Instagram / note) の運用が同精度に語られる。

---

## 0. このドキュメントの読み方

### 0.1 目的

ユーザー (ofmeton、フリーランス、葉山在住、Python/Java + 業務自動化バックグラウンド、ADHD/ASD 特性) が運営する **AI 業務自動化発信アカウント** の運用を、ほぼ全自動で回すシステムの設計書。
ターゲットは「**AI を活用したい非エンジニア (中小事業者・士業・コンサル) 経営者**」。

### 0.2 v9 → v9.1 → v9.2 → v10 の経緯

| 版 | 主な変更 | 行数 |
|---|---|---|
| v8 | 旧 4 媒体 (X/Threads/IG/Shorts)、ターゲット未確定 | 898 |
| v9 | クロスレビュー + B-1〜B-3 検証反映、3 媒体集約、ターゲット確定、MA 全部入り | 1,177 |
| v9.1 | note 章を競合調査ベースで詳述 | 539 (差分) |
| v9.2 | X / Instagram 章を競合調査ベースで詳述 | 459 (差分) |
| **v10** | **3 つを統合した完全版、new main 設計書** | 本ドキュメント |

### 0.3 v10 の構成原則

- v9 の全 13 章 + 付録 3 構造を継承
- §3.3 コスト試算 を v9.2 実測ベースで更新 (X 関連 ¥1,287/月)
- §4.3 Writer に v9.1 note 詳述 + v9.2 X / Instagram 詳述を統合
- §4.4 Visualizer に v9.2 デザインシステムを統合
- §4.7 Hook Analyzer に v9.2 新類型 3 つ (合計 13 類型) を統合
- §4.8 Optimizer に v9.2 タイムテーブル + 横断観察を統合
- §11 クロスレビュー観点に v9.1 E-28~E-33 + v9.2 E-34~E-38 を追加

### 0.4 用語

- **PCR**: Profile Click Rate (`user_profile_clicks ÷ impressions`)
- **MA**: Managed Agents (Anthropic 2026-04-08 public beta)
- **集客導線 3 パターン**: §4.8 参照
- **構成パターン 5 系統** (note): §4.3 note 章参照
- **X fmat 3 種**: 短文単発 / スレッド / 長文単発

---

## 1. 背景と発信戦略

### 1.1 発信主体のプロファイル

- **名義**: ofmeton (個人ブランド、X / Instagram / note の 3 媒体で統一)
- 29 歳フリーランス、葉山 (神奈川) 在住
- Python/Java/GAS/VBA 等の自動化実装経験
- Claude Code + MCP で建設業向け HP 制作、民泊清掃 SaaS 開発を実運用中
- 月¥260,000 の生活費確保が当面の収入目標
- ADHD/ASD 特性、INFJ-T (準備期間が長引くとモチベ枯渇しやすい)

### 1.2 発信の戦略目的

| 層 | 目的 |
|---|---|
| 表向き | 「非エンジニア経営者でも Claude で業務が仕組み化できる」事例発信でフォロワー獲得 |
| 本来 | 「業務仕組み化の翻訳者」ポジション確立 → note 販売 + AI 自動化代行 のリード経路化 |

CLAUDE.md KPI (Phase 3 = 2027-02 末) との整合:
- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー

### 1.3 真の北極星指標: PCR + url_link_clicks

優先順位:

| 順 | 指標 | 取得経路 |
|---|---|---|
| 1 | **PCR** (`user_profile_clicks ÷ impressions`) | X API v2 `non_public_metrics` (OAuth 2.0 PKCE 必須) |
| 2 | **url_link_clicks** | 同上 (note 送客 link クリック) |
| 3 | quote_count | public_metrics |
| 4 | bookmark_count | public_metrics |
| 5 | reply_count | public_metrics |
| 6 | like_count (観賞用) | public_metrics |

**削除**: dwell_time (X API v2 に存在しない、B-2 確認済)。

### 1.4 コンテンツバランスの初期方針

CLAUDE.md コンテンツ 4 本柱:

1. **Claude 活用事例** (業務 × 短縮時間 × ツール名) — 主軸 60%
2. **制作事例** (portfolio リポ作例集連動) — 20%
3. **tips** (プロンプト集、業務効率化) — 10%
4. **開発事例** (実装の裏側、コード公開) — 10%

**Phase 1 (初期 2-3 ヶ月): 翻案 5 : 実体験 3**
- 反応を見て「日本の非エンジニア経営者で何が刺さるか」を学習

**自動切替トリガ**: PCR 平均が 3 週連続 0.3% 超 + 上位投稿パターンが 3 類型以上特定できた時点で **実体験 6 : 翻案 4** に切替。

---

## 2. 設計の根本原則

### 2.1 自動化レベル

ユーザーの介入は以下に限定:
- インタビュー応答 (LINE 完結、1 日 1-2 回、各 5-10 ターン以内)
- キルスイッチ (`!stop`) 操作
- Phase 移行判断 (ユーザー主観)
- **承認必須ゲート (5 種のみ、§5.1)**

それ以外は **自動反映 + 事後報告**。

### 2.2 予算制約

月額 **¥10,000 以内**

### 2.3 マルチプラットフォーム展開

| プラットフォーム | 頻度 | ローンチ Phase | 実装状態 |
|---|---|---|---|
| **X (X Premium Basic 加入)** | 5 本/日 | Phase 1 | v10 実装対象 |
| **Instagram** | 1 本/日 (カルーセル) | Phase 1 | v10 実装対象 |
| **note** | 無料 3-5 本/月 + 有料 1 本/月 (500-1,480 円) | Phase 1 | v10 実装対象 |
| ~~Threads~~ | ~~2-3 本/日~~ | 次フェーズ | 設計のみ |
| ~~YouTube Shorts~~ | ~~1 本/日~~ | 次フェーズ | 設計のみ |

クロスポストではない。同じ核アイデアから各プラットフォーム向けに **派生生成**。

---

## 3. システムアーキテクチャ

### 3.1 レイヤー構成

```
┌──────────────────────────────────────────────────────────┐
│ ① 素材レイヤー (2 系統)                                   │
│   ・twitterapi.io (海外バズ + 日本 Claude/AI 発信 +       │
│     公式アカウント @AnthropicAI / @ClaudeAI 等を追跡)     │
│   ・Claude Code 履歴 + Git commit + 案件メモ + 音声メモ   │
│   ※ ai-radar コードは撤廃済、Anthropic 公式情報は         │
│     twitterapi.io 経由でカバー (別実装不要)                │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ② インデックス層 (pgvector)                               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ③ Interviewer (LINE 完結、5-10 ターン)                   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ④ 選別レイヤー (log1p + 分位補正 + テーマ別半減期)         │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑤ 生成レイヤー (Managed Agents)                          │
│   ・Writer (3 媒体派生 + フォーマット選択)                │
│   ・Visualizer (OpenAI gpt-image-2 / 1)                   │
│   ・Hook Analyzer (動的拡張 13 類型)                      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑥ Editor (6+1 ルール + ステマ表記)                       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑦ 投稿レイヤー (X 公式 OAuth 2.0 PKCE / IG Graph / note)  │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑧ 計測レイヤー (PCR / url_link_clicks)                    │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑨ Optimizer (3 フェーズ + そもそも論 weekly レビュー)      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 技術スタック (v9.2 + v9 実測ベース)

| 層 | 採用 |
|---|---|
| 実行基盤 | Cloudflare Workers Paid ($5/月、cron 250 本、CPU 30s〜15min) |
| エージェント基盤 | **Claude Managed Agents** (beta、`managed-agents-2026-04-01` header 必須) |
| ランタイム | Node.js v24+ + **tsx** (ts-node は v24 で silent exit 確認済) |
| DB / pgvector | Supabase Free (500MB 制限、Pro 移行検討) |
| 通知 | LINE Messaging API (200 通/月無料、超過 5円/通) |
| 画像生成 | **OpenAI gpt-image-2** 第一候補 (実装時 pricing 再確認)、利用不可なら gpt-image-1 |
| TTS / 動画 (次フェーズ) | VOICEVOX + Remotion + GitHub Actions |
| X 認証 | **OAuth 2.0 PKCE (User context)** (`non_public_metrics` 取得に必須) |
| X 読み | twitterapi.io ($0.15/1,000 tweets) + X owned reads ($0.001/req) |
| X 書き | X 公式 API pay-per-use ($0.015/req、URL 付き $0.200/req) |
| Instagram | Instagram Graph API (Business アカウント + FB ページ連携) |
| LLM プロバイダ | Anthropic Haiku 4.5 / Sonnet 4.6 / Opus 4.7 |

### 3.3 コスト試算 (月額、v9.2 実測ベース更新版)

| 項目 | 月額 (JPY) | 根拠 |
|---|---|---|
| Cloudflare Workers Paid | ¥780 | $5 × ¥156 |
| **Managed Agents** | **¥357** | B-3 実測 (Interviewer ¥140 + Optimizer ¥217) |
| **X API (1 日 5 投稿 = URL 付き 1 + URL なし 4)** | **¥1,287** | v9.2 §1.4 タイムテーブル基準 |
| Supabase Free | ¥0 | |
| twitterapi.io | ¥100 | |
| OpenAI gpt-image-2/1 (low 中心、月 150 枚) | ¥300-500 | low $0.011 × 150 ≒ $1.65 |
| LINE Messaging API (Daily 30 + Weekly 4 + 完結インタビュー 300) | ¥700 | 200 通超過分 |
| X Premium Basic | ¥980 | |
| バッファ (cache miss / web search) | ¥1,000 | |
| **合計** | **¥5,504-5,704** | 月予算 ¥10,000 に対して ¥4,300 余裕 |

v9 想定 ¥6,153-6,353 から **約 ¥600 下方修正** (X コスト v9.2 で精緻化、月コスト軽減確認)。

### 3.4 Managed Agents 一本化の判断

#### 採用理由 (B-3 実測で再検証済)

- Interviewer 5 ターン会話の state 管理が MA 側で自動 (Messages API 直叩きだと N² トークン)
- Optimizer の長時間バッチ処理が Workers の 15 min 制限を超えても動かせる
- **B-3 実測コスト**: 月 ¥357 (v8 想定 ¥4,510 の 8%)。MA 採用判断にとって追い風
- **prompt cache が極めて効く**: Sonnet 5 ターン対話で input が +3 tokens/turn のみ伸びる

#### B-3 実測知見

- `active_seconds` は **idle/sleep 中カウントしない** (アクティブ LLM 処理時間のみ)
- `duration_seconds` は **create→終了の wall-clock**
- session-hour 課金単価は **session 実行コスト USD 0.02 = ¥3** (4 session 分、誤差レベル)
- 月想定 ¥3-15 (v9 想定 ¥217 から大幅下方修正可能)

#### リスクと対処

**リスク 1**: ベータ依存
- 対処: **AgentRunner 抽象化レイヤー** (`run_task(input) → {artifact, cost, trace_id, retryable, confidence}` の契約 + idempotency key + Messages API fallback)

**リスク 2**: 料金体系の不透明性
- B-3 で active vs duration の billing 差を実測
- Console billing dashboard で「セッション実行コスト」line item として表示確認済

**リスク 3**: Research preview 機能への依存
- 対処: **使わない** (memory は Supabase、orchestration は Workers、self-evaluation は Optimizer)

**リスク 4**: idle/running 中断 session の課金リーク
- 対処: **「処理終了 → 即 retrieve (stats 取得) → archive」を全 MA 実装で強制**

---

## 4. 各エージェント・モジュールのロジック詳細

### 4.1 Interviewer

#### 設計意図

- 「素材を待つ」ではなく「素材を引き出す」
- 仮説駆動 (頭の中に記事構想を持った状態で質問)
- **短くて深い (5-10 ターン上限、1 ターン 1 質問)** — cache 効くので 5 → 10 ターン拡張可
- **LINE 完結** (ターミナル起動の摩擦なし)

#### 内部状態スキーマ (概念)

```
InterviewState {
  source_material: {raw_log, summary, key_decisions, key_struggles}
  hypothesis: {
    working_title, target_platform, target_reader_profile,
    expected_angle, expected_takeaway
  }
  knowledge_gaps: [{ gap_id, question_intent, priority, status }]
  collected_answers: [{ gap_id, raw_answer, distilled_insight, confidence }]
  turn_count: 0  // ハードリミット 10
  satisfaction_score: 0.0  // 0~1
  abort_reason: null  // "low_signal" / "user_request" / "max_turns"
}
```

#### 質問パターンライブラリ (8 種)

| pattern_id | パターン | 例 |
|---|---|---|
| concrete_moment | 具体的瞬間 | 「その時、最初に頭に浮かんだのは何？」 |
| decision_fork | 分岐点 | 「A と B の間で迷った時、どっちに傾いてた？」 |
| revise_with_hindsight | 後知恵 | 「もう一回やるなら、最初の 3 手を変えるとしたら？」 |
| stop_signal | 中断ライン | 「うまくいかない時、続けるか中断するかの判断ラインって？」 |
| feeling_check | 感覚 | 「[出来事] の時、嬉しさと焦りどっちが強かった？」 |
| friction_zoom | 詰まり | 「一番時間吸われた瞬間って、具体的にどこ？」 |
| would_recommend | 推薦判断 | 「これ、同じ立場の友達に薦める？薦めるなら誰に？」 |
| if_constraint | 制約思考 | 「もし時間が半分だったら、何を切る？」 |

#### LINE 完結方式 (v9 §4.1 より)

- LINE Webhook → Cloudflare Worker → MA Interviewer Session → LINE reply
- ユーザーは LINE 上で 5-10 ターン応答
- LINE 通数試算: 月 60 セッション × 平均 8 turn = 480 通 → 200 通超過 280 通 × ¥5 = +¥1,400 (¥10,000 枠内)
- 24h 応答無し: **backlog に寝かせる** (次回 LINE 開いた時に「未回答テーマを続ける / 新規」を選択)

### 4.2 選別エージェント

#### 翻案候補スコア式 (v9.1 修正版)

```
log_engagement = log1p(likeCount + 2*RT + 4*bookmarkCount + 3*replyCount + quoteCount)

normalized = log_engagement / log1p(max(author.followers, 1000))
  ※ 分位補正: フォロワー帯別 quartile 内 z-score
    - micro(<5k) / mid(5k-50k) / large(50k+)

freshness = exp(-hours_since_post / half_life)
  ※ テーマ別 half_life:
    - トレンド系 (新モデル発表): 24h
    - SOP・思考系 (プロンプト集): 14 日

hook_score = HookAnalyzer.score(tweet.text)  # 0~1
topic_relevance = TopicClassifier.score(tweet.text)  # 0~1

final_score = normalized * freshness * (0.4 + 0.3*hook_score + 0.3*topic_relevance)
```

各重み係数は Optimizer が週次で調整。

#### 実体験候補の優先度

```
priority_score = recency_weight * 0.4
               + topic_freshness * 0.3
               + interview_depth * 0.3

ガード:
  - topic_freshness < 0.5 → 「直近投稿との差分説明を必須」(シリーズ化を殺さない)
  - interview_depth < 0.3 → 警告タグ
```

#### 重複検出

```
過去 90 日の投稿全件 embedding 比較:
  - max_sim ≥ 0.85 → 除外
  - 0.70 ≤ max_sim < 0.85 → 警告タグ
  - max_sim < 0.70 → クリア
```

### 4.3 Writer (3 媒体派生 + フォーマット選択)

#### 4.3.1 マルチプラットフォーム派生原則

- core_idea 1 個 × 適性スコア ≥ 0.6 のプラットフォーム のみ生成
- 各プラットフォームのスタイル制約は Style Guide から取得

#### 4.3.2 X 投稿フォーマット詳述 (v9.2 §1 統合)

##### 上位 10 アカ avg❤ 観察 (publishing research ベース)

- **短文+数字** = 最高効率 (@Shimayus 7,460 / 11k フォロワー)
- **長文批評** = 強い (@umiyuki_ai 2,710 / 63k)
- **箇条書きスレッド + 公式リソース** = フォロワー多いがエンゲージメント率低 (@SuguruKun_ai 0.47%)
- **ニュース速報型** = avg❤ 低い (@masahirochaen 0.09%)

##### ofmeton 向け fmat 選択指針 (Contextual Thompson Sampling)

| fmat | Phase 1 目標比率 | 主用途 |
|---|---|---|
| **短文単発 (280 字以内)** | 60% | 失敗談 / ROI Before-After / 1 ポイント tips |
| **スレッド (2-7 本)** | 30% | 業種別 SOP の概要 / 段階型 / 比較解説 |
| **長文単発 (1,000-3,000 字)** | 10% | 思考フレーム / 業界批評 / 月 1-2 本 |

各カテゴリ毎に Beta 分布 (α=2, β=8 の弱い事前分布) でスタート、運用データで更新。

##### X スレッド構成 4 パターン

| パターン | 本数 | 構成 |
|---|---|---|
| 列挙型 | 5-10 本 | Hook → 1 → 2 → ... → N → 結論 / CTA |
| 構造化解説型 | 3-5 本 | Hook → 背景 → 手順 → 注意点 → CTA |
| Q&A 型 | 3-4 本 | 質問 → 答え → 補足 → CTA |
| ストーリー型 | 4-7 本 | きっかけ → 試行錯誤 → 解決 → 学び → CTA |

ofmeton 中軸: **ストーリー型 (失敗談先行)** + **構造化解説型 (業種別 SOP)**。

#### 4.3.3 Instagram カルーセル詳述 (v9.2 §2 統合)

##### 競合観察

- publishing research T2-4「**Instagram カルーセル形式の AI 業務自動化は完全空白**」
- ofmeton の先行者利得を取れる枠
- WebFetch では SPA 制約で active 競合調査限定的 → transfer learning ベース

##### カルーセル 9 枚構成 5 テンプレ (note 5 構成パターンから transfer)

| テンプレ | 構造 | 由来 (note 構成) |
|---|---|---|
| A. まとめ型 | Hook → 9 項目 → まとめ → CTA | §4.3.4.1 まとめ型 |
| B. 段階型 | Hook → 3 Step → コスト → CTA | §4.3.4.1 段階型 |
| C. ツール比較型 | Hook → 比較軸 → A vs B → 結論 | §4.3.4.1 ツール比較型 |
| D. 専門職×AI 型 | 自己紹介 → 業務 → 失敗 → 成功 → 提言 | §4.3.4.1 専門職×AI 型 |
| E. シリーズ実践記型 | おさらい → 今回 → 結果 → 次回予告 | §4.3.4.1 シリーズ実践記型 |

#### 4.3.4 note 生成フロー詳述 (v9.1 統合)

##### 4.3.4.1 構成パターン 5 系統 (competitor analysis 抽出)

| # | パターン | 文字数 | 価格 | 主用途 |
|---|---|---|---|---|
| 1 | **まとめ型** | 5,000-10,000 字 (大) / 2,000-3,000 字 (小) | 無料 or ¥980-1,480 | 「30 職種コンプリート図鑑」「16 選」 |
| 2 | **段階型** | 3,000-5,000 字 | ¥980 | 「3 ステップで AI 委託」「コスト別設計図」 |
| 3 | **ツール比較型** | 3,000-6,000 字 | 無料 or ¥500 | 「Zapier vs Make」「Claude vs ChatGPT」 |
| 4 | **専門職×AI 型** | 3,000-5,000 字 | 無料 (初回) → ¥980 | 「税理士の私が AI に挑戦」 |
| 5 | **シリーズ実践記型** | 1,500-3,000 字 | ¥300 個別 or マガジン購読 | 「Cursor 実践記 — 5」 |

##### 4.3.4.2 タイトル付け方ライブラリ (4 必須要素)

| 要素 | 役割 | 例 |
|---|---|---|
| 【】カッコ | 記事 type 明示 | 【完全保存版】【最新】【第 1 回】 |
| 数字明示 | 量 / 価格 / 効果 | 「30 職種」「16 選」「月 3,000 円」 |
| 権威付け表現 | 網羅性 / 完成度 | 「コンプリート図鑑」「徹底比較」 |
| 読者層明示 | 「誰のための記事か」 | 「非エンジニア」「1 人社長」「コード書けません」 |

##### 4.3.4.3 価格 × CVR テーブル

| 価格 | 用途 | 想定 CVR (Phase 1) |
|---|---|---|
| 無料 | 集客 / プロフ送客 | プロフ訪問 → note クリック 10% |
| ¥500 | 軽量 tips | note 訪問 → 購入 3% |
| **¥980 (主軸)** | 中規模解説 / 業種別 SOP | note 訪問 → 購入 2% |
| ¥1,480 | 大型まとめ / 完全保存版 | note 訪問 → 購入 1.5% |

月配分: 無料 3 本 (集客) + ¥500 1 本 + ¥980 1 本 = ¥30,000 売上目標 (Phase 1)

##### 4.3.4.4 ティーザー境界設計テンプレ

**設計原則** (ofmeton 差別化): 「無料部分で問題提起と Why を完結 + **無料でも実装可能な軽量版を入れる**」+ 「有料部分で結論と How」

無料部分 (800-1,500 字):
```
1. リード (100-200 字): 誰のための記事 / 何を解決
2. 問題提起 (400-600 字): 具体的詰まり / 既存解決策の限界
3. 無料軽量版 (200-400 字): 5 分で試せる入門編 ← ofmeton 差別化
4. 有料部分への期待値 (100-200 字): 「結論 + 再現手順 + 数値開示」予告
```

有料部分 (1,500-6,000 字):
```
1. 結論 (300-500 字): 答え + 具体数値
2. 再現手順 (1,000-3,000 字): Step by Step + スクショ / コード
3. ハマりどころ (300-500 字): 同手順で詰まる箇所と対処
4. 応用例 (200-500 字): 別業種への transfer
5. CTA (100-200 字): 個別相談 / メンバーシップ
```

##### 4.3.4.5 マガジン構造 (Phase 1 から 2-3 並走)

| マガジン名 (案) | 価格戦略 |
|---|---|
| 「非エンジニア経営者の Claude 翻訳実装術」(本流) | 月額 ¥980 (Phase 2 から) |
| 「ofmeton 実践記」(シリーズ) | 個別 ¥300 or マガジン購読 ¥980/月 |
| 「業種別 Claude SOP カタログ」(まとめ) | 個別 ¥980 / マガジン買切 ¥4,980 |

##### 4.3.4.6 投稿時間最適化

- note 朝 8:00 公開で X / IG の朝投稿余波を吸収
- X / IG との連動: §4.8 集客導線 3 パターン × 1 日 5 投稿タイムテーブル参照

##### 4.3.4.7 SEO 整備

- note 内検索: タイトル先頭 30 字に主要キーワード + 本文冒頭 200 字に重複
- Google 検索: 「<キーワード> + <数字> + <記事 type>」、h2/h3 階層、画像 alt text
- 関連記事リンク (内部 SEO)
- Optimizer 月次で SEO Brief 生成

##### 4.3.4.8 メンバーシップ移行設計 (Phase 2-3 検討)

判定条件 (ALL 必須):
1. note フォロワー ≥ 300
2. 個別有料記事の月売上 ≥ 5 件 (月 ¥5,000 以上)
3. リピート購入 ≥ 30%
4. プロフィール訪問数 ≥ 月 1,000

価格案: ベーシック ¥480 / スタンダード ¥980 / プロ ¥2,980

#### 4.3.5 1 トピックの 3 媒体展開フロー (v9.2 §4 統合)

```
1 つの core idea
     │
     ├─→ X 短文 (朝・昼 = 失敗談 / ROI 数字)
     ├─→ X note 送客ツイート + 派生 (夕 = note 送客 / 17:30 + 21:00 引用 RT)
     ├─→ note 1 記事 (朝 8 時公開、構成パターン 5 系統から選択)
     ├─→ Instagram カルーセル 9 枚 (朝 9 時、5 テンプレから選択)
     └─→ Instagram ストーリーズ (カルーセル新着告知 + ハイライト追加)
```

月 30 core ideas × 平均 8 投稿 = **月 240 投稿**運用想定。

### 4.4 Visualizer (3 モード + v9.2 §2.3 デザインシステム統合)

#### モード

| モード | 動作 |
|---|---|
| ai-only | OpenAI gpt-image-2 (low/mid/high 動的選択) で毎回生成 (デフォルト) |
| self-only | ユーザーに撮影指示、待つ |
| hybrid | 投稿内容で自動判定 (実装系 = self、概念系 = ai、数値系 = programmatic) |

#### モード自動切替判定 (準実験 PSM + 段階 rollout)

```
入力: 過去 30 日の投稿データ
process:
  if len(ai_only) < 10 or len(self_only) < 10:
    return current_mode  # サンプル不足

  # Propensity Score Matching
  matched_pairs = psm_match(ai_only, self_only, covariates=[theme, hour, format])
  effect_estimate = mean(pcr_diff) over matched_pairs

  if abs(effect_estimate) > significance_threshold:
    proposed_mode = best_mode_from_psm
    # 7 日 50% rollout → 14 日 100% (PCR -20% で自動巻き戻し)
  else:
    proposed_mode = current_mode
```

**自動切替は承認制** (§5.1)。

#### デザインシステム (v9.2 §2.3 統合、visual-designer skill 引き継ぎ)

##### カラーパレット (4 色)

| 役割 | 色 (仮置き、Phase 0 で確定) |
|---|---|
| Primary | ofmeton ブランドカラー (例: ネイビー #1A2B5F) |
| Accent | アクセント色 (例: コーラルレッド #FF6B6B) |
| Background | オフホワイト #F8F8F5 |
| Text | チャコールグレー #2A2A2A |

##### フォント

- 見出し: **Noto Sans JP Heavy (900)**
- 本文: Noto Sans JP Regular (400)

##### レイアウト (Instagram カルーセル)

- サイズ: 1080×1080 px
- 余白: 全 4 辺 8-10% (= 86-108 px)
- 文字サイズ最小値: **32 px** (大型スマホで読める下限)

### 4.5 Videographer

**v10 では実装しない** (Shorts 次フェーズ持ち越し)。設計のみ残す:
- Remotion + VOICEVOX、30-60 秒スクリプト、3 部構成
- GitHub Actions の workflow_dispatch でレンダリング委譲
- VOICEVOX クレジット表記必須 (§10)

### 4.6 Editor (6+1 ルール)

| # | ルール | 判定方法 |
|---|---|---|
| 1 | 業務仕組み化テーマに繋がるか | LLM judge |
| 2 | 実体験要素 1 行 (実体験スロット必須) | 正規表現 + LLM judge |
| 3 | 「対象は意見、敵は作らない」 | LLM judge |
| 4 | 対立構図フィルタ | ハードコード禁止フレーズリスト |
| 5 | 直近 2 週で類似投稿なし | cos 類似度 |
| 6 | 結論の断定性 | LLM judge |
| +1 | Hook 強度 ≥ 0.4 | HookAnalyzer.score |
| +2 (v10 新規) | **ステマ表記** (アフィリエイト / 自社販売リンク含む投稿は明示) | 正規表現 + LLM judge |

### 4.7 Hook Analyzer (動的拡張、v9.2 §1.3 で初期 13 類型)

#### 初期 13 類型 (v9 既存 10 + v9.2 新規 3)

**既存 10 (v9)**:
1. 結論先出し型
2. 数字インパクト型
3. 問いかけ型
4. 逆張り型
5. 経験談導入型
6. 共感型
7. 警告型
8. 比較型
9. 自己卑下型
10. メタ言及型

**v10 新規 3 (v9.2 統合)**:
11. **「みんな X と言うが実は Y」型** (逆張り強化、@umiyuki_ai 由来)
12. **「Before-After 数字」型** (数字インパクト強化、ROI 直結)
13. **「実は私も最初は X」型** (経験談 + 共感、ofmeton ブランド整合)

#### 分類ロジック

```
入力: 投稿テキスト (1~3 行目)
process:
  既知 13 類型と Embedding similarity 計算
  max_sim 判定:
    - max_sim ≥ 0.75 → 既知類型として分類確定
    - 0.55 ≤ max_sim < 0.75 → 信頼度低タグで暫定登録
    - max_sim < 0.55 → 「未知パターン候補」として隔離
出力: { type, confidence, raw_features }
```

#### 新類型認定 (月次、**承認必須**)

```
1. 過去 30 日の未知パターン候補を全件取得
2. HDBSCAN でクラスタリング (min_cluster_size=5)
3. クラスタ条件: 投稿数 ≥ 5 件 + 平均 PCR が既知中央値より +20% 以上
4. クラスタの新類型を Opus が言語化
5. LINE で「新類型認定しますか?」と承認求める (§5.1 承認 gate)
```

### 4.8 Optimizer (3 フェーズサイクル)

#### Phase 1: 数値分析 (週次・Sonnet 4.6)

```
入力: 過去 7-90 日のメトリック全件
処理:
  a. 全投稿の (fmat, Hook 類型, 内容類型, 時間帯, 集客導線パターン, 媒体) ×
     (PCR, url_link_clicks, bookmark 率, インプ, 媒体間遷移率) のクロス集計
  b. 統計的有意性テスト (Mann-Whitney U / Kruskal-Wallis)
  c. 相関分析 (PCA で寄与の高い変数特定)
出力: 数値ファクトのリスト
```

#### Phase 2: 仮説検証 (週次・Opus 4.7、extended thinking)

```
入力: Phase 1 のファクト + 過去の Style Guide + 自動反映履歴
処理:
  a. ファクトを統合して "なぜ起きているか" の仮説を 3 個生成
  b. 各仮説に反例検索 (反例なし → A、反例少数 → B、反例多数 → C)
  c. ランク付け
出力: 確度ランク付き仮説リスト
```

#### Phase 3: 施策立案 + 自動反映 (週次・Sonnet 4.6)

```
入力: A/B ランク仮説
処理:
  a. 仮説ごとに具体的な設定変更案
  b. 変更幅キャップに収まるよう調整
  c. ロールバック条件を明示
  d. config テーブルに書き込み (区分別、§5.1)
  e. Daily Digest で事後報告
```

#### 改善対象 (v9 + v9.2 統合、設計全体が対象)

**重要原則**: Optimizer の改善対象は **小さな数値パラメータだけではない**。エージェント定義 / フロー / レイヤー構造そのものも継続的に疑い、より良い形を提案する責務を持つ。

ただし、**骨組み変更は承認必須** (§5.1)。

##### Full auto (承認不要)
- twitterapi.io クエリ (min_faves 閾値、キーワード)
- 選別スコア重み
- 投稿時間スロット ±60 分
- Hook 強度閾値
- 既存類型の自然死 (180 日休眠)

##### Auto + 7 日 brownout
- Writer プロンプト追記 (骨組み変更でない範囲)
- Editor ルール追加・削除 (6+2 範囲内)
- フォーマット選択の重み (Thompson Sampling 事前分布)
- Interviewer 質問パターン (8 種ライブラリ内)
- **集客導線 3 パターン (A/B/C) の URL 付き比率最適化**

##### 承認必須 (5 種)
1. **Style Guide v 変更**
2. **新類型認定**
3. **媒体追加・停止** (Threads / Shorts ローンチ含む)
4. **月予算上限変更**
5. **骨組み変更** (エージェント定義 / レイヤー構造 / 6+2 ルール / 北極星指標 / スタック)

#### 集客導線 3 パターン × 1 日 5 投稿タイムテーブル (v9.2 §1.4 統合)

```
朝 7:00  X: 失敗談先行型 (短文、Hook=「実は私も」型)
         集客導線 A、URL なし

昼 12:00 X: ROI Before-After (短文、Hook=「Before-After 数字」型)
         集客導線 A、URL なし

夕 17:00 X: note 送客告知 (短文 + URL)
         集客導線 B、URL 付き ($0.200/req)

夕 17:30 X: 17:00 ツイート引用 RT + 補足
         集客導線 B 派生、URL なし

夜 21:00 X: 17:00 ツイート引用 RT + 別角度
         集客導線 C (末尾「→ プロフィール参照」)、URL なし
```

月 X コスト: $8.25 ≒ **¥1,287/月** (v9.2 実測)

#### 横断観察 (v9.2 §4 統合)

| 観察軸 | 内容 |
|---|---|
| 媒体次元 | X / IG / note のクロスで「同じテーマがどの媒体で最も効率良いか」 |
| 媒体間遷移率 | X PCR → プロフィール → note 訪問 → note 購入 の漏斗各段階 CVR |
| 横断補完スコア | 3 媒体合算エンゲージメント vs 個別単独運用 (補完効果定量化) |
| カニバリ検知 | X 短文 + IG カルーセル 1 枚目で全部言って note 不要にしてないか |

Optimizer が weekly で全媒体の遷移率を観察、Writer プロンプトに警告組込。

#### そもそも論 weekly レビュー (v9.2 統合)

Optimizer Phase 2 (Opus 4.7) が weekly に以下を観測:

1. エージェント分割は適切か
2. レイヤー間 IF の摩擦
3. 北極星指標の妥当性
4. 媒体の取捨選択
5. データソースの妥当性

Weekly Brief で「考察」セクションとして提示 → ユーザー判断で深掘り依頼 / 保留 / 採用 (承認必須) を選ぶ。

#### ナレッジベース蓄積

```
Phase 2 でランク A 仮説を別テーブルに蓄積
→ Style Guide v2 (中期版) の主原料

例:
[hypothesis_id: 042]
"スレッド 7-10 本構成は単発長文より PCR 有意に高い"
ランク: A
根拠: Phase 1 ファクト (p < 0.01, n=68)
採用日: 2026-06-15
関連設定: writer.format_selection_v3
```

---

## 5. 自動反映 + 事後報告 + 安全装置

### 5.1 自動反映の 3 区分 (v9 + v9.2 + v10 で 5 種承認)

| 区分 | 対象 | 動作 |
|---|---|---|
| **Full auto** | スコア重み / 閾値 / スロット ±60 分 / Hook 強度閾値 / 自然死 | 即反映 + 事後報告 |
| **Auto + 7 日 brownout** | Editor ルール / fmat 重み / Writer プロンプト追記 / Interviewer パターン / 集客導線比率 | 反映後 7 日異常検知 → 自動巻き戻し |
| **承認必須 (5 種)** | (1) Style Guide v 変更 (2) 新類型認定 (3) 媒体追加・停止 (4) 月予算上限変更 **(5) 骨組み変更** | LINE で `!approve` or `!reject` |

承認頻度想定: 月 2-3 回 (Style Guide v は四半期、新類型は月 1、骨組みは四半期-半年)。

### 5.2 事後報告 (LINE Messaging API)

#### Daily Digest (毎晩 23:00 JST)

```
━━━ 5/25 Daily ━━━
投稿: X 5 / IG 1 / note 0
平均PCR: 0.34% (前日比 +0.05)
url_link_clicks: 12 件 (note 送客)
特記:
  - 08:00 X 投稿の PCR 0.71% で過去最高
  - インタビュー 1 件完了 (LINE 7 ターン)
自動反映:
  - twitterapi.io クエリ "min_faves" 300 → 250
  - 新類型「対比強調型」候補が暫定登録 (承認待ち)
承認待ち:
  - 「対比強調型」を新類型認定する？ !approve_042 / !reject_042
詳細→ supabase dashboard
```

#### Weekly Brief (毎月曜朝)

```
━━━ Week 22 Brief ━━━
投稿総数 / 平均PCR / url_link_clicks
集客導線比較: A (プロフ常時) 0.41% / B (送客 RT) 28 clicks / C (末尾 CTA) 0.38%
自動反映 5 件 / Optimizer 提案要約
そもそも論考察: 「note の 5 構成パターン、ツール比較型の CVR が他より 20% 低い。比較記事を月 1 → 月 0.5 に減らす案」
```

通数試算: Daily 30 + Weekly 4 + 異常通知数件 + 完結インタビュー 300 ≈ 月 340 通 → 200 通超過 140 × ¥5 = +¥700。

### 5.3 安全装置

#### 変更幅キャップ

- スコア重み: 1 回の変更で旧との差 < 30%
- クエリ min_faves: ±200 まで
- 時間スロット: ±60 分まで

#### 異常検知ロールバック

- 反映後 7 日間モニタ
- 平均 PCR -30% 以上 → 自動ロールバック
- 平均インプ -50% 以上 → 自動ロールバック
- LINE 通知 + 理由ログ

#### 設定変更ログ

- 全変更履歴 Supabase 保存、任意時点へ巻き戻し可能

#### キルスイッチ

- LINE で `!stop` → 全自動反映を 48 時間停止 + 自動投稿停止

#### brownout mode (費用上限 ¥10,000 到達時)

- **投稿停止** (X / Instagram / note 全媒体)
- **計測継続** (analytics ingestion)
- **通知継続** (LINE Daily Digest は止めない)
- **バックアップ継続**

#### MA Session 即 archive (B-3 発見)

全 MA session 終了時に **retrieve → archive を強制** (idle 課金リーク防止)。

---

## 6. 競合調査 50 項目 (Phase 0 実施)

合計 65 アカウント × 直近 3 ヶ月の上位 20 投稿 ≈ 1,300 投稿を分析。

**Phase 0 状態 (2026-05-25 時点)**:
- 既完済: 10 アカ × 90 日 × 928 tweets (publishing research)
- 残: 55 アカ × 90 日 ≈ 400 tweets を Phase 0 で追加実施

### A〜H 50 項目分類 (v9 §6 引継)

- A. 構造・フォーマット系 (1-6): 文字数、投稿形式、絵文字、ハッシュタグ
- B. 内容・トーン系 (7-14): 文体、一人称、結論位置、CTA
- C. 画像系 (15-21): 画像割合、内容類型、トーン
- D. 動画系 (22-28): 動画長さ、字幕、BGM (次フェーズ用に分析のみ)
- E. 時系列・運用系 (29-32): 時間帯ヒートマップ
- F. ファネル系 (33-35): プロフィール、固定ポスト
- G. Hook 系 (36-40): タイプ分類、強度
- H. X フォーマット系 (41-50): スレッド長さ、構成パターン

### 二軸集計

```
primary: 50 項目
secondary: フォーマット (短文 / スレッド / 長文) + 集客導線パターン (A/B/C)
```

---

## 7. Style Guide の段階運用 (承認制)

| 版 | 用途 | 主原料 | タイミング | 承認 |
|---|---|---|---|---|
| **v1 (初期)** | 投稿開始前 Foundation | 65 アカ分析 (publishing research 10 + 残 55) + Tier1 空白 + **note 5 構成 + X fmat + IG 5 テンプレ** | Phase 0 | 不要 (初期生成) |
| **v2 (中期)** | アカウント学習後 | 競合分析 + Optimizer ナレッジベース 3 ヶ月分 + 自アカ実績 | 3 ヶ月目 | **必要** |
| **v3 (長期)** | 安定運用後 | v2 + 半年分の自アカ実績 | 6 ヶ月目以降 | **必要** |

---

## 8. Phase 計画

### Phase 0: Foundation (2-3 週間、Week 1 から人間承認つき 1 本/日 投稿開始)

```
Week 1-2:  競合アカウント収集 (残 55 アカ × 各 60 投稿 = 1,300 投稿規模)
Week 2:    50 項目で全投稿を分析 + Style Guide v1 生成
Week 2-3:  過去 Claude Code ログのインデックス化 (pgvector)
Week 1 から並行: 人間承認つき 1 本/日 投稿開始 (Writer 生成 → 人間確認 → 手動投稿)
```

Phase 0 コスト: 競合分析 ¥2,000-3,000 + 人間承認投稿 Writer ¥500

### Phase 1: X + Instagram + note ローンチ (~ 2026-07 末)

KPI (CLAUDE.md):
- note 月売上 3 万円
- X 500 フォロワー
- IG 300 フォロワー

### Phase 2: 拡張 (~ 2026-10 末)

KPI:
- note 月売上 5 万円 + **メンバーシップ起ち上げ検討**
- X 2,000 フォロワー
- IG 1,000 フォロワー

### Phase 3: 安定化 + Threads/Shorts 検討 (~ 2027-02 末)

KPI:
- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー

---

## 9. データフロー + observability

### 9.1 論理構造

```
[素材ソース] → [Materials store] → [Indexer] → [Vector index]
                                                      ↓
                            ┌─────────────────────────┴───┐
                            ↓                             ↓
                     [Interviewer]              [Curation Selector]
                            ↓                             ↓
                     [Q&A records]                 [Curation pool]
                            ↓                             ↓
                            └─────────────┬───────────────┘
                                          ↓
                                  [Core Ideas pool]
                                          ↓
                            [Writer / Visualizer]
                                          ↓
                                  [Post drafts]
                                          ↓
                                       [Editor]
                                          ↓
                          [Scheduled posts (per platform)]
                                          ↓
                                  [Posted records]
                                          ↓
                              [Analytics ingestion]
                                          ↓
                                  [Performance store]
                                          ↓
                                       [Optimizer]
                                          ↓
                              ┌───────────┴───────────┐
                              ↓                       ↓
                    [自動反映 configs]          [Knowledge base]
```

### 9.2 各ストアの論理単位

- Materials store: 素材源 1 件 = 1 レコード、ソース種別、時系列タグ、機密タグ
- Vector index: 「投稿可能な瞬間」単位
- Q&A records: インタビュー 1 回 = 1 レコード、全ターン履歴、satisfaction_score
- Core Ideas pool: 投稿の核 1 個 = 1 レコード
- Post drafts: 1 核アイデア × プラットフォーム数のレコード
- Posted records: 投稿 1 回 = 1 レコード、**集客導線パターン (A/B/C)** 含む
- Performance store: 投稿 × 時系列のメトリック

### 9.3 Observability (v9 §9 引継)

全テーブルに以下を持つ:

- `trace_id`: 1 件の素材 → 投稿 → 計測の end-to-end トレース ID
- `run_id`: cron run ID
- `post_id`: 内部 ID
- `platform_post_id`: X tweet_id / IG media_id / note article_id
- `cost`: その record 生成にかかった USD
- `failure_stage`: 失敗時のレイヤー
- `agent_version`: MA agent version pinning
- `media`: X / IG / note (横断観察用、v10 新規)
- `funnel_stage`: 媒体間遷移 (X → プロフ → note → 購入) のどの段階か (v10 新規)

---

## 10. 法務・規約ガード

### 10.1 ステマ規制 (景表法、2023-10-01 施行)

note 販売 / コンサル誘導 / アフィリエイト / 案件紹介を含むコンテンツは **「広告であることが分かる表示」が必須**。

**対応**:
- Editor の +2 ルールに「アフィリエイト / 自社販売リンクを含む投稿は明示表記 (`#PR` または「PR」「広告」「プロモーション」のいずれか)」を追加
- note 送客ツイート → 冒頭に「PR」「[note 販売中]」明示
- 出典: [消費者庁ステルスマーケティング](https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/)

### 10.2 翻案ルール (著作権 / 依拠性)

twitterapi.io 取得の海外バズの「翻案」は依拠性リスク。

**対応**:
- 翻案元 URL を Posted records に必ず記録
- 抽象化メモ (どのアイデアを取り、どこを変えたか) を残す
- cos 類似度 0.85 以上は「翻訳扱い」として再考
- 固有表現 (人名・社名・特定の言い回し) を残さない

### 10.3 X / Meta 自動投稿規約

X の Automation rules / Meta の Threads/IG API 規約違反で **shadowban or ban** リスク。

**対応**:
- X 1 日 5 本 → 公式 API 経由・User context auth で実施
- 連続投稿の間隔は 30 分以上開ける
- 同じ文面の繰り返し投稿しない
- **バックアップアカウントを 1 つ用意** (ban 時の保険)

### 10.4 VOICEVOX クレジット表記 (次フェーズ)

Shorts 実装時に VOICEVOX 使用する場合、音声ライブラリ規約に従ったクレジット表記を Shorts 概要欄テンプレートに固定。

### 10.5 AI 生成画像の表記

- alt text に「AI 生成画像 (gpt-image-2 / gpt-image-1)」
- カルーセル末尾に「画像は AI 生成」と 1 行
- CLAUDE.md「AI 表記: 自然な範囲で透明性を持って言及（隠蔽 NG、誇大 NG）」と整合

### 10.6 Secrets rotation 戦略

- key を `.env.local` のみで管理、git に commit しない
- 月次で X / Meta access token を refresh (OAuth 2.0 PKCE)
- 半年に 1 回 Anthropic API key / OpenAI API key を rotate
- 漏洩疑い時の即時 revoke 手順を別 doc 化

---

## 11. クロスレビューしてほしい論点 (v9 + v9.1 + v9.2 統合 38 件)

### 11.1 v9 ロジック検証 (E-1〜E-3)

| # | 論点 |
|---|---|
| E-1 | Interviewer 収穫逓減検知アルゴリズム |
| E-2 | Hook 動的拡張 HDBSCAN パラメータ (min_cluster_size=5) |
| E-3 | 選別スコアの分位補正 + log1p、フォロワー帯分割の妥当性 |

### 11.2 v9 概念的弱箇所 (E-4〜E-6)

| # | 論点 |
|---|---|
| E-4 | 「業務仕組み化テーマに繋がるか」の LLM judge 基準 |
| E-5 | 「敵を作らない」判定の安定性 |
| E-6 | Visualizer モード切替の PSM、コバリエート (theme, hour, format) で交絡因子分離 |

### 11.3 v9 検証なしで決め打ち (E-3.7〜E-17)

| # | 論点 |
|---|---|
| E-3.7 | 5-10 ターンで「深い」インタビュー達成 |
| E-3.8 | Claude Code ログに「100 単位」の投稿可能瞬間 |
| E-3.9 | 65 アカ × 3 ヶ月で意味ある統計 |
| E-15 | インタビューパターン 8 種で素材抽出十分 |
| E-16 | core_idea.complexity で fmat 選択妥当判定 |
| E-17 | 翻案 5 から実体験への自然移行の閾値 |

### 11.4 v9 Managed Agents (E-7〜E-14)

| # | 論点 |
|---|---|
| E-7 | MA state 管理の有利さ → B-3 で ¥357 実測、有利確認 |
| E-10 | MA beta 依存リスク |
| E-11 | AgentRunner 抽象化設計 |
| E-12 | 初月モニタリング → B-3 実測ベース更新済 |
| E-13 | research preview 機能を使わない判断 |
| E-14 | active vs duration billing → Console で確認済 (¥3) |

### 11.5 v9 自動反映 (E-8, E-18, E-19, E-20)

| # | 論点 |
|---|---|
| E-8 | 自動反映の安全装置 (-30% 閾値、ロールバック判定) |
| E-18 | キルスイッチ 48 時間停止の長さ |
| E-19 | 変更幅キャップ (30%, ±200, ±60 分) の妥当性 |
| E-20 | 承認必須 5 種で十分か |

### 11.6 v9 フォーマット選択 (E-9, E-21)

| # | 論点 |
|---|---|
| E-9 | Contextual Thompson Sampling 事前分布 (α, β) |
| E-21 | フォーマット別の期待 PCR の初期値設定 |

### 11.7 v9 集客導線 (E-22, E-23)

| # | 論点 |
|---|---|
| E-22 | 集客導線 3 パターン (A/B/C) の effect 差をどう推定 |
| E-23 | URL 付き比率の Thompson Sampling 最適化と月コスト制約 |

### 11.8 v9 / v9.1 note 詳述 (E-24, E-25, E-28〜E-33)

| # | 論点 |
|---|---|
| E-24 | note 生成フローを X/IG と同レベルに詰める → **v9.1 で実施** |
| E-25 | note 有料記事ティーザー設計 / 価格 (500/980/1480) |
| E-28 | 競合 5 作家の調査を Firecrawl で深掘りすべきか |
| E-29 | 価格 ¥500 / ¥980 / ¥1,480 の使い分け A/B 計画 |
| E-30 | ティーザー境界の「無料軽量版」設計の CVR 効果 |
| E-31 | マガジン 2-3 並走は Phase 1 で過剰でないか |
| E-32 | メンバーシップ移行判定基準の閾値妥当性 |
| E-33 | SEO 整備の Optimizer Phase 1 数値分析への組込み |

### 11.9 v9.2 X / Instagram 詳述 (E-34〜E-38)

| # | 論点 |
|---|---|
| E-34 | X fmat の Phase 1 比率 (短文 60 / スレッド 30 / 長文 10) |
| E-35 | Hook 補強 3 類型 (11-13) が既存 10 と独立か |
| E-36 | 1 日 5 投稿が ADHD/ASD ofmeton 継続性に過剰でないか |
| E-37 | Instagram カルーセル 5 テンプレが note と並列化される設計の妥当性 |
| E-38 | 媒体間遷移率の観察を Optimizer 実装時、計測可能データが揃う Phase |

### 11.10 v9 設計不確実性 (E-4.11, E-26, E-27)

| # | 論点 |
|---|---|
| E-4.11 | LINE 200 通制限のフォールバック (Discord/Slack) |
| E-26 | twitterapi.io の安定性、終了/料金改定リスク |
| E-27 | OAuth 2.0 PKCE の token refresh 戦略 (X / Meta) |

---

## 12. 議論の経過

| 版 | 主な変更 | 日付 |
|---|---|---|
| v1 | 短文 Tips カード型 | — |
| v2 | PCR を北極星、note 販売連動 | — |
| v3-v7 | インタビュアー / マルチプラットフォーム / Hook 動的拡張 / 競合調査 50 項目 / Managed Agents 比較 | — |
| v8 | All Managed Agents 採用、初月モニタリング | 〜2026-05-23 |
| **v9** | クロスレビュー + B-1〜B-3 実測反映、3 媒体集約、ターゲット非エンジニア確定 | 2026-05-24 |
| **v9.1** | note 詳述 (competitor analysis 5 作家 + 構成 5 系統 + 価格 × CVR + ティーザー) | 2026-05-25 |
| **v9.2** | X / Instagram 詳述 (X publishing research + IG transfer learning) | 2026-05-25 |
| **v10** | **v9 + v9.1 + v9.2 統合完全版 (new main 設計書)** | **2026-05-25** |

---

## 13. レビュアーへの最終依頼

このドキュメントを読んだ上で:

1. **§3 アーキテクチャ + コスト試算** が ¥10,000 月予算枠内で持続可能か
2. **§4.3 Writer の 3 媒体派生** で各媒体の精度が揃っているか
3. **§4.4 Visualizer** の準実験設計が実装可能か
4. **§4.7 Hook Analyzer 初期 13 類型** が overlap なく独立か
5. **§4.8 Optimizer のそもそも論 weekly レビュー** が骨組み改善提案として機能するか
6. **§5.1 承認必須 5 種** で十分なガードか (承認少なすぎ・多すぎ の bias)
7. **§10 法務・規約ガード** で抜けている規約や 2026 年現在の新規制
8. **§11 クロスレビュー観点 38 件** の優先度ランキング

特に **「3 ヶ月運用してから後悔する箇所」** を予測して指摘してほしい。実装着手前の今が、設計修正の最大のレバレッジを持つタイミング。

---

## 付録 A: v9 / v9.1 / v9.2 との関係

| 文書 | 役割 | 状態 |
|---|---|---|
| **v10 (本ドキュメント)** | **new main 設計書、3 統合完全版** | 起草中 (本 PR) |
| v9 (1,177 行) | 全体設計の起源、PR #14 で main 入り | 履歴として残置 |
| v9.1 (539 行) | note 詳述、PR #15 で main 入り | 履歴として残置 |
| v9.2 (459 行) | X / IG 詳述、PR #16 で main 入り | 履歴として残置 |

v10 は「3 つを再構成して 1 ファイルにまとめた完成版」。実装時の参照は v10 のみで十分、v9.x は履歴のために残置。

## 付録 B: 検証成果へのリンク

- B-1 既存資産棚卸し: `outputs/improvements/x-account-design-v9-verification/B1-asset-inventory.md`
- B-2 X API フィールド: `outputs/improvements/x-account-design-v9-verification/B2-x-api-fields.md`
- B-3 MA 実コスト: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost.md` + `B3-ma-cost-result.md`
- B-3 実装 script: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script/`
- 競合調査 (X): 別 worktree `all-good-ops-jp-publishers` の `outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md`
- 競合調査 (note): `raw/facts/situations/2026-05-25-note-competitor-research.md`
- Anthropic Console billing 観測: `raw/facts/situations/2026-05-25-anthropic-console-billing-observation.md`
- Instagram 競合調査スキップ理由: `raw/facts/situations/2026-05-25-instagram-competitor-research-skip.md`
- v9 体制決定: `raw/facts/situations/2026-05-24-x-account-design-v9-restructure.md`
- v9 資産 disposition: `raw/facts/situations/2026-05-24-x-account-design-v9-asset-disposition.md`
- v9.0.1 review revisions: `raw/facts/situations/2026-05-24-x-account-design-v9-review-revisions.md`
- v9.0.2 final revisions: `raw/facts/situations/2026-05-24-x-account-design-v9-final-revisions.md`

## 付録 C: v10 以降の改善候補 (v10.1 / v11)

### 競合調査の深掘り
- note 競合 5 作家を Firecrawl で再取得 (数値検証)
- Instagram 競合の active 観察 (Phase 1 中盤、ofmeton 自アカ実投稿開始後の自データ含め)
- メンバーシップ運営の上位 5 アカ調査
- ステマ規制 / 景表法に関する note 記事の競合分析

### 実装着手前の検証
- Phase 0 ドライランで X API OAuth 2.0 PKCE 実機検証
- 集客導線 3 パターンの effect 差を A/B テスト計画
- ティーザー境界の「無料軽量版」設計の CVR 効果検証

### 拡張機能 (Phase 2-3)
- Threads / Shorts ローンチ判定
- Videographer (Remotion + VOICEVOX) 実装
- メンバーシップ (note) 起ち上げ判定
- リール戦略の詳細化

### ブランド整備 (Phase 0 で確定)
- ofmeton ブランドカラー (4 色)
- ofmeton ロゴ / アイコン
- Instagram bio + Linktree の文面
- ハッシュタグ戦略 (1 投稿 3-5 個 / 30 個など)

---

*以上、x-account-design v10 (統合完全版) 終わり。v10 が new main 設計書。実装着手準備としては、Phase 0 ドライラン (人間承認つき 1 本/日 投稿開始) + 残 55 アカ競合調査 + Style Guide v1 生成 が次のアクション。*
