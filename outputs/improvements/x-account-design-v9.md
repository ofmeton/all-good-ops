# X 発信アカウント運用自動化システム 設計書 v9

> v8 (898 行) を base にクロスレビュー指摘 + B-1〜B-3 検証実測を全反映した起草版。
> v9 では媒体を X/Instagram/note の 3 媒体に集約 (Shorts/Threads は次フェーズ)、既存資産は全撤廃、MA 全部入り採用。
> note 生成フローは叩き台レベル、X/Instagram と同様の精度に詰めるのは v9.1 以降のイテレーション。

---

## 0. このドキュメントの読み方

### 0.1 目的

ユーザー (ofmeton 名義、フリーランス、葉山在住、Python/Java + 業務自動化バックグラウンド) が運営する **AI 業務自動化発信アカウント** の運用を、ほぼ全自動で回すシステムの設計書。
ターゲットは「**AI を活用したい非エンジニア (中小事業者・士業・コンサル) 経営者**」。Tips や技術解説寄りの表現は縮小し、業務結果 / ROI 寄りの訴求にピボット済み。

### 0.2 v8 からの主要変更点

| # | 変更 | 根拠 |
|---|---|---|
| 1 | 媒体: X/Threads/Instagram/Shorts → **X/Instagram/note** | CLAUDE.md 戦略 KGI 1 + ユーザー指示 (Shorts/Threads は設計のみ、実装は次フェーズ) |
| 2 | ターゲット: AI Tips 関心層 → **非エンジニア経営者** | 競合調査 (上位 10 アカ) で空白領域確定 |
| 3 | 北極星指標: dwell_time 削除 → **url_link_clicks 昇格** | B-2 確認: X API v2 に dwell_time 存在しない |
| 4 | 既存資産 (brand-publisher / visual-designer / content-reviewer / x-buzz-radar / ai-radar) を **全撤廃** | ユーザー指示「上位プロジェクト化、再実装も不要」 |
| 5 | スタック: Cloudflare Workers + MA 維持 (MA 全部入り (仮)) | B-3 実測: 月 ¥357 で予算余裕 |
| 6 | コスト試算を **実測ベース** に更新 (合計 ¥6,153-6,353/月) | B-2 / B-3 実測値 |
| 7 | Writer フォーマット選択: ε-greedy → **Contextual Thompson Sampling** | Codex クロスレビュー |
| 8 | Visualizer モード切替: 自動 → **準実験 PSM + 段階 rollout** | 交絡因子分離 |
| 9 | 自動反映: 全自動 → **3 区分 (Full auto / Auto+brownout / 承認必須)** | ユーザー指示「極力承認少なく」+ ブランド毀損防止 |
| 10 | 集客導線 3 パターン (プロフ常時 / 送客ツイート派生 / 投稿末尾 CTA) を **Optimizer 改善対象に追加** | ユーザー指示、PCR 直結 |
| 11 | **§10 法務・規約ガード章を新設** | Codex 指摘: ステマ規制 / 翻案 / X automation |
| 12 | Phase 0 期間: 4-6 週「投稿なし」 → **Week 1 から人間承認つき 1 本/日 + 競合分析計画通り 1,300 投稿** | ADHD/ASD モチベ枯渇対策 + 「既存収集分は追加実施で」 |
| 13 | 失業手当ガード章: **除外** | ユーザー方針 (現時点では意識的に無視) |

### 0.3 用語

- **PCR**: Profile Click Rate (`user_profile_clicks ÷ impressions`)
- **MA**: Managed Agents (Anthropic 2026/4/8 public beta)
- **集客導線 3 パターン**: §4.8 参照

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
| **表向き** | 「非エンジニア経営者でも Claude で業務が仕組み化できる」事例発信でフォロワー獲得 |
| **本来** | 「業務仕組み化の翻訳者」ポジション確立 → note 販売 + AI 自動化代行 (CLAUDE.md KGI 2) のリード経路化 |

CLAUDE.md KPI (Phase 3 = 2027-02 末) との整合:
- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー

### 1.3 真の北極星指標: Profile Click Rate (PCR) + url_link_clicks

**理由**: note 販売リンク / AI 自動化代行問合せ導線は全てプロフィール経由。プロフ訪問されることが収益直結。url_link_clicks は note 送客の直接指標。

優先順位:

| 順 | 指標 | 取得経路 |
|---|---|---|
| 1 | **PCR** (`user_profile_clicks ÷ impressions`) | X API v2 `non_public_metrics` (OAuth 2.0 PKCE 必須) |
| 2 | **url_link_clicks** | 同上 (note 送客 link クリック) |
| 3 | quote_count (DM 共有 / 引用 RT の代理) | public_metrics |
| 4 | bookmark_count | public_metrics |
| 5 | reply_count (深度別は別途集計) | public_metrics |
| 6 | like_count (観賞用、判断に使わない) | public_metrics |

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
- **承認必須ゲート (4 種のみ、§5.1)**

それ以外 (Optimizer 提案、設定変更、Style Guide 更新、プロンプト更新等) は全て **自動反映 + 事後報告**。

### 2.2 予算制約

月額 **¥10,000 以内** (CLAUDE.md preference: コンテンツ自動化システム予算天井)

実測ベース見積もりは §3.3 参照。

### 2.3 マルチプラットフォーム展開

| プラットフォーム | 頻度 | ローンチ Phase | 実装状態 |
|---|---|---|---|
| **X (X Premium Basic 加入)** | 5 本/日 | Phase 1 | v9 実装対象 |
| **Instagram** | 1 本/日 (カルーセル) | Phase 1 | v9 実装対象 |
| **note** | 無料 3-5 本/月 + 有料 1 本/月 (500-980円) | Phase 1 | v9 実装対象 (叩き台、詳細は v9.1) |
| ~~Threads~~ | ~~2-3 本/日~~ | 次フェーズ持ち越し | v9 では設計のみ |
| ~~YouTube Shorts~~ | ~~1 本/日~~ | 次フェーズ持ち越し | v9 では設計のみ |

クロスポストではない。同じ核アイデアから各プラットフォーム向けに **派生生成**。

---

## 3. システムアーキテクチャ

### 3.1 レイヤー構成

```
┌──────────────────────────────────────────────────────────┐
│ ① 素材レイヤー (v9 で 2 系統)                              │
│   ・twitterapi.io                                          │
│     - 海外バズ + 日本 Claude/AI 発信                       │
│     - **Anthropic 公式・関連アカウント** (@AnthropicAI /    │
│       @ClaudeAI / @simonw / Anthropic Engineering の X 上の│
│       告知等) をフォロー対象に追加することで「公式情報」を │
│       カバー (twitterapi.io 上で配信される範囲)             │
│     - 関連業界アカウント (Claude/AI 業務自動化発信者) も同 │
│       じく twitterapi.io でカバー → RSS / market_signal の  │
│       別実装は不要                                          │
│   ・Claude Code 履歴 + Git commit + 案件メモ + 音声メモ   │
│   ※ ai-radar のコード・機能とも撤廃・再実装不要。公式情報  │
│     は twitterapi.io で取得できる範囲で間接カバー             │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ② インデックス層                                          │
│   ・初回バッチで全素材をベクトル化 (embedding-3-large 等) │
│   ・Supabase pgvector に格納                              │
│   ・増分更新は毎晩 cron                                   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ③ Interviewer (1 日 2 回、朝 7 時 / 夕 17 時、LINE 完結) │
│   ・素材から仮説駆動で質問生成 (5-10 ターン主義)          │
│   ・LINE Webhook → Cloudflare Worker → MA Interviewer    │
│   ・回答を DB 格納                                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ④ 選別レイヤー                                            │
│   ・翻案候補: twitterapi.io スコア式 (log1p + 分位補正)   │
│   ・実体験候補: インタビュー回答 + 直近ログ                │
│   ・重複検出 (cos 類似度)                                  │
│   → 当日の「核アイデア」5〜7 個                            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑤ 生成レイヤー (Managed Agents)                          │
│   ・Writer (テキスト、3 媒体派生 + フォーマット選択)       │
│   ・Visualizer (画像、§4.4 で 3 モード)                   │
│   ・Hook Analyzer (生成後の品質評価)                      │
│   ※ Videographer は v9 ではスタブ (Shorts 次フェーズ)      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑥ Editor (6+1 ルールチェック、§4.6)                      │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑦ 投稿レイヤー                                            │
│   ・X 公式 API (OAuth 2.0 PKCE、pay-per-use)              │
│   ・Instagram Graph API                                    │
│   ・note: 半自動 (下書き保存 → 人間最終公開 or Playwright) │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑧ 計測レイヤー                                            │
│   ・X API v2 `non_public_metrics` (PCR / url_link_clicks) │
│   ・Instagram Graph API Insights                          │
│   ・note: Google Analytics でリファラ別流入               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ⑨ Optimizer (改善レイヤー、§4.8)                          │
│   ・Phase 1: 数値分析 (週次・Sonnet 4.6)                  │
│   ・Phase 2: 仮説検証 (週次・Opus 4.7、extended thinking) │
│   ・Phase 3: 施策立案 + 自動反映 (3 区分、§5.1)            │
│   ・集客導線 3 パターンの最適化対象                        │
└──────────────────────────────────────────────────────────┘
```

### 3.2 技術スタック (v8 から実測ベース更新)

| 層 | 採用 | 注 |
|---|---|---|
| 実行基盤 | **Cloudflare Workers Paid** ($5/月、cron 250 本、CPU 30s〜15min) | cron interval で CPU 上限変動 |
| エージェント基盤 | **Claude Managed Agents** (beta、2026-04-08 公開) | beta header `managed-agents-2026-04-01` 必須 |
| ランタイム | Node.js v24+ + **tsx** (ts-node は v24 で silent exit、B-3 検証) | |
| DB / Storage / pgvector | Supabase Free (500MB 制限、バックアップ別途) | Free 上限到達したら Pro 移行検討 |
| 動画レンダリング | (次フェーズ) GitHub Actions (private 2,000 分/月) | v9 では未使用 |
| 通知 | LINE Messaging API (200 通/月無料、超過 5円/通) | LINE 完結インタビューで月 340 通想定 → ¥700 超過 |
| 画像生成 | **OpenAI gpt-image-2** を第一候補 (API 経由で利用可能の想定。料金は実装着手時に公式 pricing で再確認、暫定 gpt-image-1 並 low $0.011 / mid $0.042 / high $0.167 per image で試算)。利用不可なら gpt-image-1 で fallback | Codex MCP 無料前提は B-2 で撤回 |
| TTS | (次フェーズ) VOICEVOX (商用 OK、クレジット表記必須) | v9 では未使用 |
| 動画フレームワーク | (次フェーズ) Remotion | v9 では未使用 |
| X 認証 | **OAuth 2.0 PKCE (User context)** | non_public_metrics 取得に必須 (B-2) |
| X 読み | twitterapi.io ($0.15/1,000 tweets) + X owned reads ($0.001/req) | 既存運用 (money-bot の API key 流用) |
| X 書き | X 公式 API pay-per-use ($0.015/req、URL 付き $0.200/req) | 無料枠 1,500/月は v9 では撤回 (実態 pay-per-use) |
| Instagram | Instagram Graph API (Business アカウント + FB ページ連携必須) | |
| LLM プロバイダ | Anthropic Haiku 4.5 / Sonnet 4.6 / Opus 4.7 を使い分け | |

### 3.3 コスト試算 (月額、実測ベース)

| 項目 | 月額 (JPY) | 根拠 |
|---|---|---|
| Cloudflare Workers Paid | ¥780 | $5 × ¥156 |
| Supabase Free | ¥0 | |
| **Managed Agents** | **¥357** | B-3 実測: Interviewer ¥140 + Optimizer ¥217 |
| X API (投稿 URL なし 70% / URL 付き 30% / self-watch reads) | ¥1,936 | B-2 試算 |
| twitterapi.io | ¥100 | 既存運用 |
| OpenAI gpt-image-1 (低品質中心、月 150 枚想定) | ¥300-500 | low $0.011 × 150 ≒ $1.65 |
| LINE Messaging API (Daily Digest 30 + Weekly 4 + LINE 完結インタビュー 300 = 月 340 通) | ¥700 | 200 通超過分 140 × ¥5 |
| X Premium Basic | ¥980 | ofmeton アカ既存契約想定 |
| バッファ (cache miss / Opus thinking 有効化 / Web search) | ¥1,000 | |
| **合計** | **¥6,153-6,353** | |

予算 ¥10,000 に対して **¥3,600-3,800 余裕**。v8 試算 ¥7,370 より ¥1,000 強の安全マージン拡大。

### 3.4 Managed Agents 一本化の判断

#### 採用理由 (B-3 実測で再検証)

- Interviewer 5 ターン会話の state 管理が MA 側で自動 (Messages API 直叩きだと N²トークン)
- Optimizer の長時間バッチ処理が Workers の 15 min 制限を超えても動かせる (extended thinking 有効化前提)
- **B-3 実測コスト**: 月 ¥357 (v8 想定 ¥4,510 の 8%)。MA 採用判断にとって追い風
- **prompt cache が極めて効く**: Sonnet 5 ターン対話で input が +3 tokens/turn のみ伸びる

#### 採用判断 (v9 確定)

- **MA 全部入り (仮)** を採用
- 用途: Interviewer / 選別 / Writer / Visualizer / Editor / Hook Analyzer / Optimizer Phase 1-3
- 既存 x-buzz-radar の Vercel + Server Action 設計は v9 で**完全撤廃**、MA + Cloudflare Workers に再構築
- ロジック (Supabase スキーマ 8 テーブル / 選別プロンプト / 媒体派生プロンプト / 2 軸自己改善ループ) は **設計参考素材**として活用

#### リスクと対処

**リスク 1**: ベータ依存 (仕様変更 / 値上げ / サービス終了)
- 対処: **AgentRunner 抽象化レイヤー**を実装初期に組む。`run_task(input) → {artifact, cost, trace_id, retryable, confidence}` の契約、状態 export、idempotency key、同一タスクの Messages API fallback を最初から持つ

**リスク 2**: 料金体系の不透明性 (active vs duration billing)
- B-3 で `active_seconds` と `duration_seconds` の乖離を確認 (Sleep 版で 2.5×、中断版で 6.4×)
- 対処: **Anthropic Console の billing dashboard で active か duration かを最終確認** (人間タスク残)。確定するまで `duration_seconds × $0.08/h` で保守的に試算

**リスク 3**: Research preview 機能への依存 (Advanced memory tooling / MCP tunnels / Dreaming 等)
- 対処: **これらは使わない**。memory は Supabase、orchestration は Workers、self-evaluation は Optimizer で自前実装

**リスク 4**: idle / running 中断 session の課金リーク
- B-3 で archive 漏れ session が中断後も課金継続することを確認
- 対処: **「処理終了 → 即 retrieve (stats 取得) → archive」を全 MA 実装で強制** (§5.3 brownout mode の一部)

> **論点 E-7, E-10, E-11, E-12**: §11 参照

---

## 4. 各エージェント・モジュールのロジック詳細

### 4.1 Interviewer

#### 設計意図

- 「素材を待つ」ではなく「素材を引き出す」
- 仮説駆動 (頭の中に記事構想を持った状態で質問)
- **短くて深い (5-10 ターン上限、1 ターン 1 質問)**
- 質問は定型でなく素材ログを把握した上で具体的に
- **LINE 完結** (ターミナル起動の摩擦なし)

#### 内部状態スキーマ (概念)

```
InterviewState {
  source_material: {raw_log, summary, key_decisions, key_struggles}

  hypothesis: {
    working_title: 仮タイトル
    target_platform: X / Instagram / note
    target_reader_profile: 中小企業経営者 / 士業 / コンサル
    expected_angle: なぜそれを選んだか / 失敗からの学び / 比較考察
    expected_takeaway: 読者が持ち帰る具体的な行動指針
  }

  knowledge_gaps: [
    { gap_id, question_intent, priority, status }
  ]

  collected_answers: [
    { gap_id, raw_answer, distilled_insight, confidence }
  ]

  turn_count: 0  // ハードリミット 10 (cache 効くので拡張可)
  satisfaction_score: 0.0  // 0~1
  abort_reason: null  // "low_signal" / "user_request" / "max_turns"
}
```

#### 質問生成 5 ステップ

1. **初期仮説形成 (Sonnet 4.6)** — 素材を読み、仮タイトル・想定読者・記事の骨格・knowledge_gaps 3-5 個を生成
2. **最初の質問生成** — 最優先 gap 選び、抽象論回避・具体的瞬間引き出す質問 1 つ
3. **回答受信後の更新** — gap 埋まり判定、新規 gap 追加、必要なら仮説修正
4. **終了判定** — turn_count ≥ 10 / satisfaction_score ≥ 0.7 / 収穫逓減検知 / ユーザー明示終了
5. **次の質問生成** — 未消化な感情語・ぼかし表現があれば同 gap 深掘り、なければ次 gap へ

#### 質問パターンライブラリ (8 種、pattern_id でログ記録)

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

#### インタビュー実施場所 (v8 から変更)

**LINE 完結方式**:

- LINE Webhook → Cloudflare Worker → MA Interviewer Session → LINE reply
- ユーザーは LINE 上で 5-10 ターン応答
- ターミナル起動の摩擦ゼロ
- LINE 通数試算: 月 60 セッション × 平均 8 turn = 480 通 → 200 通超過 280 通 × ¥5 = +¥1,400 (¥10,000 枠内)
- (Daily Digest 30 + Weekly 4 含めても合計 ¥700-1,400 の追加課金で許容)

24 時間応答無しの場合: 別テーマに自動切替せず、**backlog に寝かせる** (Codex 指摘の「高価値テーマを捨てない」)。次回ユーザーが LINE 開いた時に「未回答テーマを続ける / 新規」を選択。

### 4.2 選別エージェント

#### 翻案候補スコア式 (v8 から修正)

```
log_engagement = log1p(likeCount + 2*RT + 4*bookmarkCount + 3*replyCount + quoteCount)

normalized = log_engagement / log1p(max(author.followers, 1000))
  ※ 分位補正: フォロワー帯別 quartile 内 z-score を併用
  ※ 帯: micro(<5k) / mid(5k-50k) / large(50k+)

freshness = exp(-hours_since_post / half_life)
  ※ テーマ別 half_life:
    - トレンド系 (新モデル発表など): 24h
    - SOP・思考系 (プロンプト集など): 14 日

hook_score = HookAnalyzer.score(tweet.text)  # 0~1

topic_relevance = TopicClassifier.score(tweet.text)  # 0~1
                  # 「非エンジニア経営者向け業務仕組み化」「Claude 固有」等への近さ

final_score = normalized * freshness * (0.4 + 0.3*hook_score + 0.3*topic_relevance)
```

各重み係数は Optimizer が週次で調整。

#### 実体験候補の優先度

```
priority_score = recency_weight * 0.4
               + topic_freshness * 0.3   # 直近 2 週で同テーマを投稿してないか
               + interview_depth * 0.3   # インタビュー回答の satisfaction_score

ガード:
  - topic_freshness < 0.5 → 強制除外でなく「直近投稿との差分説明を必須」(シリーズ化を殺さない、Codex 指摘)
  - interview_depth < 0.3 → 警告タグ
```

#### 重複検出ロジック

```
過去 90 日の投稿全件 embedding 比較 → 最大 cos 類似度で判定:
  - max_sim ≥ 0.85 → "実質同一"として除外
  - 0.70 ≤ max_sim < 0.85 → "近接トピック"、警告タグ
  - max_sim < 0.70 → クリア

※ 閾値は 100 件の既知ペアで ROC 確認してから決定 (Phase 0 ドライランで実施)
```

### 4.3 Writer (マルチプラットフォーム派生 + フォーマット選択)

#### X フォーマットの選択肢

| フォーマット | 文字数 | 構造特性 | dwell_time 期待 (削除) → url_link_clicks 期待 |
|---|---|---|---|
| 短文単発 | ~280 字 | 一発で結論 | 低 |
| **スレッド** | 280 字 × N 投稿 (2-10 本) | 各ツイート個別 like/RT/quote 可能 | 中〜高 |
| **長文単発 (Premium)** | ~25,000 字 | preview + Show more、太字/斜体可、メディア添付 | 高 |

#### フォーマット選択ロジック (v8 ε-greedy から変更)

```
ステップ 1: フォーマット適性スコア
  for fmt in [短文, スレッド, 長文]:
    fit_score(fmt) =
      0.4 * 内容量適性(core_idea.complexity, fmt の文字数中央値)
    + 0.3 * フォーマット別の期待 PCR (style_guide 統計)
    + 0.3 * 過去類似投稿での実績 PCR (このユーザーのアカウント履歴)

ステップ 2: 選定 (Contextual Thompson Sampling)
  各フォーマットの過去 PCR 分布 (β分布) からサンプリング
  最初は均等探索、運用後は不確実性に応じて探索率を逓減
  ※ 固定 ε-greedy 20% は採用しない (Codex 指摘: 機会損失)

ステップ 3: フォーマット別の生成
  短文: 既存 Writer
  スレッド:
    - ツイート数を core_idea.complexity から推定 (2-10 本)
    - 構成パターンを style_guide から選択
    - 各ツイート単体で意味が通るよう生成
    - Hook は 1 本目に集中、最終本に CTA
  長文:
    - 文字数 1000-3000 字を基本帯
    - 段落構造を明示 (太字見出し含む)
    - preview 部分 (最初の ~140 字) は Hook として完成形に

ステップ 4: メディア併用判定
  Visualizer に渡す前に画像/動画の挿入箇所を決定
```

#### プラットフォーム派生

- core_idea 1 個 × 適性スコア ≥ 0.6 のプラットフォーム のみ生成
- 各プラットフォームのスタイル制約は Style Guide から取得

#### note 生成フロー (叩き台、v9.1 で詳述。**初期設計も競合調査ベース**)

**設計原則**: note の構成・文字数・媒体連動・トーンは **競合調査ベースで「改善施策の引き出し」を持つ**。初期設計から競合調査の結果を反映、Optimizer の改善対象として常時更新。

| 項目 | 仕様 (叩き台、競合調査で確定する) |
|---|---|
| 頻度 | 無料 3-5 本/月 + 有料 1 本/月 (500-980 円) ※競合上位の更新頻度から再校正 |
| 文字数 | 無料 2,000-4,000 字 / 有料 5,000-8,000 字 ※競合上位 N アカの分布から再校正 |
| 構成 | SCQA / 失敗談先行 / Before-After 数値開示 / 業種別 SOP 等 ※競合調査で発見した「刺さる型」をライブラリ化 |
| 価格設計 | 500 円 (単発 tips) / 980 円 (深掘り事例) / 980-1,480 円 (シリーズ) ※競合の価格帯と CVR から再校正 |
| ティーザー設計 | 無料部分で問題提起完結、有料部分で「結論 + 再現手順」※競合の境界線設計から学習 |
| 投稿時間 | 朝 7 時 (X 連動) / 夜 21 時 ※競合の time-of-day × engagement から再校正 |
| 媒体連動 | X 短文/スレッドで note タイトル + Before-After 数値見出し → プロフィール経由 ※集客導線 3 パターン (§4.8) と組み合わせ |
| トーン | 非エンジニア経営者向け、業務結果 / ROI 寄り (Tips 寄り表現は縮小) ※競合トーン分析の H1 トップ層から学習 |
| CVR 目標 | プロフ訪問 → note クリック 10% / note 訪問 → 購入 2% (Phase 1) |
| 改善施策の引き出し | publishing research REPORT.md の Tier1 空白領域 + 残 55 アカ分析で「型 × フォーマット × トーン」マトリクス化、Optimizer が週次で新 type を提案 |
| 実装状態 | **v9 叩き台、x-buzz-radar の note outline 生成プロンプトを設計参考素材** |

> **TODO (v9.1)**:
> - note Writer の構成パターンライブラリ (10+ パターン)・SEO 整備・関連記事サジェスト・有料記事のティーザー A/B テストロジックを X/Instagram と同レベルに詰める
> - 競合調査 (publishing research REPORT.md + 残 55 アカ Phase 0) から **note 専用の「刺さる型カタログ」「価格 × CVR テーブル」「ティーザー境界設計テンプレ」を抽出 → 初期設計に反映**
> - Phase 0 完了時に v9.1 を起こす (Style Guide v1 と一緒)

### 4.4 Visualizer (3 モード)

| モード | 動作 |
|---|---|
| ai-only | OpenAI gpt-image-1 (low/mid/high 動的選択) で毎回生成 (デフォルト) |
| self-only | ユーザーに撮影指示、待つ |
| hybrid | 投稿内容で自動判定 (実装系 = self、概念系 = ai、数値系 = programmatic) |

#### モード自動切替判定 (v8 Mann-Whitney から変更)

```
入力: 過去 30 日の投稿データ
process:
  ai_only_posts = filter(images_were_ai_generated)
  self_only_posts = filter(images_were_user_captured)

  if len(ai_only_posts) < 10 or len(self_only_posts) < 10:
    return current_mode  # サンプル不足

  # 準実験 (Propensity Score Matching)
  # テーマ・時間帯・フォーマットが近いペアを作って画像条件の効果を推定
  matched_pairs = psm_match(ai_only_posts, self_only_posts, covariates=[theme, hour, format])
  effect_estimate = mean(pcr_diff) over matched_pairs

  # 段階 rollout (自動切替やめて、人間判断材料として提示)
  if abs(effect_estimate) > significance_threshold:
    proposed_mode = best_mode_from_psm
    # 7 日 50% rollout → 14 日 100% (PCR -20% で自動巻き戻し)
  else:
    proposed_mode = current_mode
```

**判断**: 自動切替は **承認制** (§5.1)。準実験で「ai-only と self-only の effect 差」を Optimizer が weekly digest に出し、人間が approve / reject。

> **論点 E-2.6 (画像 vs テキスト交絡)**: 準実験 (PSM) + 段階 rollout で交絡部分対応。完全分離はランダム化実験必要だが、ブランド分裂避けるため v9 では採用せず

### 4.5 Videographer

**v9 では実装しない** (Shorts 次フェーズ持ち越し)。

設計のみ残す:
- Remotion + VOICEVOX
- 30-60 秒スクリプト、3 部構成 (フック 3 秒 / 本体 40 秒 / CTA 10 秒)
- GitHub Actions の workflow_dispatch でレンダリング委譲
- 完了 webhook を Cloudflare Worker が受信、YouTube Data API v3 で投稿
- VOICEVOX クレジット表記必須 (§10 法務章)

### 4.6 Editor (6+1 ルール)

| # | ルール | 判定方法 |
|---|---|---|
| 1 | 業務仕組み化テーマに繋がるか | LLM judge (具体例セットは publishing research REPORT.md + 競合上位投稿) |
| 2 | 実体験要素 1 行 (実体験スロット必須) | 正規表現 + LLM judge |
| 3 | 「対象は意見、敵は作らない」 | LLM judge (褒め混じり観察は OK / 断罪は NG の境界) |
| 4 | 対立構図フィルタ | ハードコード禁止フレーズリスト (vs ChatGPT 等) |
| 5 | 直近 2 週で類似投稿なし | cos 類似度 |
| 6 | 結論の断定性 | LLM judge |
| +1 | Hook 強度 ≥ 0.4 | HookAnalyzer.score |

判定基準は `wiki/publishing/` (Phase 4 整備) + publishing research REPORT.md を必読リストに含む。

### 4.7 Hook 分析エージェント (動的拡張)

#### 既知類型 (初期 10 種)

結論先出し型、数字インパクト型、問いかけ型、逆張り型、経験談導入型、共感型、警告型、比較型、自己卑下型、メタ言及型

#### 分類ロジック

```
入力: 投稿テキスト (1~3 行目)
process:
  既知 N 類型と Embedding similarity 計算
  max_sim 判定:
    - max_sim ≥ 0.75 → 既知類型として分類確定
    - 0.55 ≤ max_sim < 0.75 → 信頼度低タグで暫定登録
    - max_sim < 0.55 → 「未知パターン候補」として隔離
出力: { type, confidence, raw_features }
```

#### 新類型認定 (月次、**承認必須**)

```
1. 過去 30 日の未知パターン候補を全件取得
2. HDBSCAN でクラスタリング
   - min_cluster_size=5 (v9 で 8 → 5 に変更、サンプル少時)
3. クラスタ条件:
   - 含まれる投稿数 ≥ 5 件
   - 平均 PCR が既知類型の中央値より +20% 以上
4. 該当クラスタの新類型を Opus が言語化
5. LINE で「新類型「対比強調型」を認定しますか？」と承認求める (§5.1 承認必須 gate)
6. 承認後、類型ライブラリに追加 + Daily Digest で報告
```

#### 既存類型の自然死

```
- 過去 90 日で 1 回も該当しなかった → 「休眠タグ」
- 180 日休眠で → 自動廃止 + Daily Digest 通告 (§5.1 Full auto)
```

### 4.8 Optimizer (3 フェーズサイクル)

#### Phase 1: 数値分析 (週次・Sonnet 4.6)

```
入力: 過去 7-90 日のメトリック全件
処理:
  a. 全投稿の (フォーマット, Hook 類型, 内容類型, 時間帯, 集客導線パターン) ×
     (PCR, url_link_clicks, bookmark 率, インプ) のクロス集計
  b. 統計的有意性テスト (Mann-Whitney U / Kruskal-Wallis)
  c. 相関分析 (主成分分析で寄与の高い変数特定)
出力: 数値ファクトのリスト
```

#### Phase 2: 仮説検証 (週次・Opus 4.7、extended thinking 有効化)

```
入力: Phase 1 のファクト + 過去の Style Guide + 自動反映履歴
処理:
  a. ファクトを統合して "なぜ起きているか" の仮説を 3 個生成
  b. 各仮説に反例検索: 「もしその仮説が正しいなら、こういう投稿も
     PCR ↑ のはず」→ 該当データを取り出し整合性チェック
  c. 仮説の確度を A/B/C にランク付け
     A: 反例なし、データ十分 → 施策化
     B: 反例少数 or データ薄 → 探索的施策
     C: 反例多数 or 主観的 → 棄却
出力: 確度ランク付き仮説リスト

注: B-3 で Opus が extended thinking 無しで即応答した
    v9 では client.beta.agents.create で thinking 有効化必須
```

#### Phase 3: 施策立案 + 自動反映 (週次・Sonnet 4.6)

```
入力: A/B ランク仮説
処理:
  a. 仮説ごとに具体的な設定変更案
  b. 変更幅キャップに収まるよう調整
  c. ロールバック条件を明示
  d. config テーブルに書き込み → 関係エージェントが次回起動時に新設定読込
  e. Daily Digest で事後報告
```

#### 改善対象 (3 区分、§5.1 と整合) — **設計上の全てが改善対象、そもそもから疑う**

**重要原則**: Optimizer の改善対象は **小さな数値パラメータだけではない**。エージェント定義 / フロー / レイヤー構造そのものも継続的に疑い、より良い形を提案する責務を持つ。「現在の v9 設計が正解」と仮定せず、運用データから設計骨子の見直しを weekly 提案する。

ただし、**骨組み (エージェント定義 / フロー / レイヤー構造) の改変は承認必須** (§5.1)。

**Full auto (承認不要)**:
- twitterapi.io クエリ (min_faves 閾値、キーワード)
- 選別スコア重み (likeCount, RT, bookmark, reply, quote の係数)
- 投稿時間スロット (±60 分)
- Hook 強度閾値
- 既存類型の自然死 (180 日休眠)
- 各種数値パラメータの微調整 (変更幅キャップ §5.3 内)

**Auto + brownout (反映後 7 日異常検知で自動巻き戻し)**:
- Writer プロンプト追記・修正 (骨組み変更でない範囲)
- Editor ルール追加・削除 (6+1 ルールの範囲内)
- フォーマット選択の重み (Thompson Sampling 事前分布)
- Interviewer 質問パターン (追加/削除/オフ、8 種ライブラリ内の範囲)
- 集客導線 3 パターン (A/B/C) の URL 付き比率最適化

**承認必須 (LINE で `!approve [change_id]` or `!reject`)**:
- **Style Guide v 変更 (v1 → v2 → v3)**
- **新類型認定** (§4.7)
- **媒体追加/停止** (Threads / Shorts ローンチ含む)
- **月予算上限変更**
- **骨組み変更** (v9 新規):
  - 新規エージェント追加 / 既存エージェント廃止
  - レイヤー構成の変更 (例: 選別 → Writer の間に新レイヤー追加)
  - データフロー変更 (例: ベクトル index を別 DB に分離)
  - 6+1 ルールの 7 番目追加 / 既存ルール廃止
  - 北極星指標の変更 (PCR → 別指標 への切替提案)
  - スタック変更 (Cloudflare Workers → Vercel / MA → Messages API 等)

→ **そもそも論の改善提案も Optimizer の役割**。「現状の設計骨子が局所最適に陥っていないか」「より上流から再設計したほうが効率的か」を weekly 観測。

#### そもそも論 weekly レビューの観点 (v9 新規)

Optimizer Phase 2 (Opus 4.7 + extended thinking) が以下の問いに対する答えを weekly 観測:

1. **エージェント分割は適切か**: 「Writer と Editor が分かれている意味あるか / Visualizer と Writer を統合した方が良いか」等
2. **レイヤー間 IF の摩擦**: 「選別 → Writer の間で情報が落ちていないか」等
3. **北極星指標の妥当性**: 「PCR は本当に収益に直結しているか / 別指標 (note 直接購入率) を主にすべきか」等
4. **媒体の取捨選択**: 「note は十分機能しているか / Threads/Shorts を投入する妥当性」等
5. **データソースの妥当性**: 「twitterapi.io バズ翻案より自社コンテンツ過去版の再編集の方が PCR 高くないか」等

これらは weekly Brief で「考察」セクションとして提示 → ユーザー判断で深掘り依頼 / 一旦保留 / 採用 (承認必須) を選ぶ。

#### 集客導線 3 パターンの改善対象追加 (v9 新規)

| パターン | 内容 | Optimizer 改善指標 |
|---|---|---|
| **A. プロフィール常時 note リンク + X 投稿は URL 無し** | URL 課金 ($0.20/req) 回避、PCR でプロフ送客 | PCR、プロフ訪問 → note クリック率 |
| **B. たまに送客ツイート (URL 付き) + 引用 RT 派生** | 送客ツイート 1 本 → 引用派生 3-5 本で再露出 | url_link_clicks、引用派生の cascade ratio |
| **C. 投稿末尾「→ プロフィール参照」CTA** | URL なしでプロフ誘導、PCR ブースト | CTA 付き投稿の PCR vs 無し PCR の差分 |

Optimizer は週次で 3 パターンの効果を比較、URL 付き比率を Thompson Sampling で最適化 (月コスト最適化に直結)。

#### ナレッジベース蓄積

```
Phase 2 でランク A だった仮説を別テーブルに蓄積
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

### 5.1 自動反映の 3 区分 (v8 全自動から変更)

ユーザー指示「承認を極力少なく」を尊重しつつブランド毀損を構造的に防ぐ:

| 区分 | 対象 | 動作 |
|---|---|---|
| **Full auto (承認不要)** | スコア重み / min_faves 閾値 / 投稿時間スロット ±60 分 / Hook 強度閾値 / 選別重み / 既存類型自然死 / 数値パラメータ微調整 (変更幅キャップ内) | 即反映 + 事後報告 (Daily Digest) |
| **Auto + 7 日 brownout** | Editor ルール追加 (6+1 範囲内) / フォーマット選択の重み / Writer プロンプト追記 / Interviewer 質問パターン (8 種ライブラリ内) / 集客導線 3 パターン URL 付き比率 | 反映後 7 日異常検知 → 自動巻き戻し (PCR -30% / インプ -50%) |
| **承認必須 (5 種)** | (1) Style Guide v 変更 / (2) 新類型認定 / (3) 媒体追加・停止 / (4) 月予算上限変更 / **(5) 骨組み変更** (エージェント定義 / フロー / レイヤー構造 / 6+1 ルールの追加廃止 / 北極星指標変更 / スタック変更) | LINE で `!approve [change_id]` or `!reject` |

承認頻度想定: 月 2-3 回 (Style Guide v 変更は四半期、新類型は月 1 程度、骨組み変更は四半期-半年に 1 回)。

**「骨組み変更」を承認必須に入れる理由**: Optimizer は「そもそも論」として現状の設計骨子を継続的に疑う (§4.8 そもそも論 weekly レビュー)。提案自体は自動だが、実装に踏み切る前にユーザー承認を必須とすることで、ブランド毀損 / 学習リセット / 運用混乱を構造的に防ぐ。

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
投稿総数 / 平均PCR / url_link_clicks / 上位 3 パターン / 下位 3 パターン
集客導線比較:
  - パターン A (プロフ常時): PCR 0.41%, URL コスト 0
  - パターン B (送客 RT): url_clicks 28, URL コスト ¥900
  - パターン C (末尾 CTA): PCR 0.38%
自動反映 5 件 (詳細リンク)
Optimizer 提案要約:
  - Writer プロンプト更新済み
  - 投稿時間スロット 18:00 → 18:30 実験中
```

通数試算: Daily 30 + Weekly 4 + 異常通知数件 ≈ 月 40 通 (200 通枠の 20%)。
LINE 完結インタビュー含めて月 340 通 → 200 通超過 140 通 × ¥5 = +¥700 (¥10,000 枠内)。

### 5.3 安全装置

#### 変更幅キャップ

- スコア重み: 1 回の変更で旧との差 < 30%
- クエリ min_faves: ±200 まで
- 時間スロット: ±60 分まで

#### 異常検知ロールバック

- 反映後 7 日間モニタ
- 平均 PCR -30% 以上低下 → 自動ロールバック
- 平均インプ -50% 以上低下 → 自動ロールバック
- LINE 通知 + 理由ログ

#### 設定変更ログ

- 全変更履歴 Supabase 保存、任意時点へ巻き戻し可能

#### キルスイッチ

- LINE で `!stop` 返信 → 全自動反映を 48 時間停止 + 自動投稿停止

#### brownout mode (v9 新規)

費用上限 ¥10,000 到達時:
- **投稿停止**（X / Instagram / note 全媒体）
- **計測継続** (analytics ingestion は走らせる、後で再開時に空白が出ない)
- **通知継続** (LINE Daily Digest は止めない)
- **バックアップ継続**
- 「全停止」ではなく「投稿だけ止まる」モードで運用継続

#### MA Session 即 archive (v9 新規、B-3 発見)

全 MA session 終了時に **retrieve → archive を強制**。
idle 状態で session-hour 課金が続くため。

> **論点 E-8 (-30% / -50% 閾値の妥当性)**: 既存運用データで再校正、Phase 0 ドライランで実機検証

---

## 6. 競合調査 50 項目 (Phase 0 実施)

合計 65 アカウント × 直近 3 ヶ月の上位 20 投稿 ≈ 1,300 投稿を分析。

**Phase 0 状態 (2026-05-24 時点)**:
- 既完済: 10 アカ × 90 日 × 928 tweets (`outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md`、別 worktree `all-good-ops-jp-publishers`、commit de16523)
- 残: 55 アカ × 90 日 ≈ 400 tweets を Phase 0 で追加実施

「スキップせず実行、既存収集分も分析対象に加える」ユーザー指示通り、計画通り 1,300 投稿規模で実施。

### A. 構造・フォーマット系 (6 項目)

1. 1 投稿の文字数分布 (平均・中央値・上位 10%)
2. 投稿形式 (単発 / スレッド / 引用 RT / 画像メイン / 動画メイン)
3. スレッドの場合の連結投稿数
4. 改行・空行の使い方 (密集型 / スカスカ型 / リスト型)
5. 絵文字の使用率と種類
6. ハッシュタグの位置と数

### B. 内容・トーン系 (8 項目)

7. 文体 (ですます / である / タメ口 / 関西弁等)
8. 一人称 (俺 / 僕 / 私 / なし)
9. 結論の置き方 (冒頭 / 末尾 / 結論なし)
10. 具体数値の出現頻度
11. 「敵」の作り方 (明示敵 / 暗示敵 / 敵なし)
12. CTA の形式と頻度
13. 自慢構造の割合
14. 質問投げかけ率

### C. 画像系 (7 項目)

15-21. (v8 と同じ)

### D. 動画系 (7 項目、次フェーズ用に分析のみ)

22-28. (v8 と同じ)

### E. 時系列・運用系 (4 項目)

29-32. (v8 と同じ)

### F. ファネル系 (3 項目)

33-35. (v8 と同じ)

### G. Hook 系 (5 項目)

36-40. (v8 と同じ)

### H. X フォーマット系 (10 項目)

41-50. (v8 と同じ)

### 二軸集計

```
primary: 50 項目
secondary: フォーマット (短文 / スレッド / 長文) + 集客導線パターン (A/B/C)
```

---

## 7. Style Guide の段階運用 (承認制)

| 版 | 用途 | 主原料 | 更新タイミング | 承認 |
|---|---|---|---|---|
| **v1 (初期)** | 投稿開始前の Foundation | 競合調査 65 アカ分析 (publishing research 既完 10 + 残 55 アカ) + Tier1 空白領域 | Phase 0 で 1 回作成 | 不要 (初期生成) |
| **v2 (中期)** | アカウント学習後 | 競合分析 + Optimizer ナレッジベース 3 ヶ月分 + 自アカ実績 | 3 ヶ月目に切替 | **必要 (LINE 承認)** |
| **v3 (長期)** | 安定運用後 | v2 + 半年分の自アカ実績、競合再分析は 1/4 に縮小 | 6 ヶ月目以降 | **必要 (LINE 承認)** |

切替は Optimizer がフェーズ判定して提案、**ユーザー LINE で承認**。

---

## 8. Phase 計画

### Phase 0: Foundation (2-3 週間、人間承認つき 1 本/日 投稿開始)

```
Week 1-2:  競合アカウント収集 + 投稿スクレイピング
           ├ twitterapi.io で 残 55 アカ × 各 60 投稿
           ├ publishing research 既完 10 アカ × 928 tweets と合わせて 1,300 投稿
           ├ Instagram Graph API
           └ 約 1,300 投稿 + 関連メディアを Supabase に保存

Week 2:    50 項目で全投稿を分析 (Sonnet バッチ処理)
           └ 出力: 競合分析データセット v1

Week 2-3:  Style Guide v1 を生成 (Opus 4.7)
           └ 各エージェントのシステムプロンプト初版

Week 3:    過去 Claude Code ログのインデックス化 (pgvector)

Week 1 から並行:  人間承認つき 1 本/日 投稿開始
           ├ Writer 生成 → 人間確認 → 手動投稿
           ├ ADHD/ASD モチベ枯渇対策 + Style Guide v1 fail-fast 検証
           └ 自アカでの反応データを Phase 1 開始時に持ち越せる
```

Phase 0 のコスト見積もり:
- 競合分析バッチ処理 (1,300 投稿 × Sonnet) ≈ ¥2,000-3,000 (一時費用、月額予算とは別枠)
- 人間承認つき投稿の Writer cost ≈ ¥500 (1 日 1 本 × 21 日 × $0.015)

### Phase 1: X + Instagram + note ローンチ (~ 2026-07 末)

Phase 0 完了後、ユーザーの主観的判断 (「行けそう」) で開始。

KPI (CLAUDE.md と整合):
- note 月売上 3 万円
- X 500 フォロワー
- IG 300 フォロワー

Optimizer が Foundation Readiness を毎週レポート (競合分析完了数、Style Guide 作成状況、インデックス化件数、人間承認投稿数等)。

### Phase 2: 拡張 (~ 2026-10 末)

PCR 3 週連続 0.3% 超 で自動移行候補 (人間承認必須)。

KPI:
- note 月売上 5 万円
- X 2,000 フォロワー
- IG 1,000 フォロワー

### Phase 3: 安定化 + Threads/Shorts 検討 (~ 2027-02 末)

KPI:
- note 月売上 10 万円相当
- X 5,000 フォロワー
- IG 3,000 フォロワー

Threads / Shorts の実装着手はこの Phase 中に判断。

---

## 9. データフロー (論理構造、observability 追加)

```
[素材ソース] ──ingest──→ [Materials store]
                              ↓
                         [Indexer (embedding)]
                              ↓
                          [Vector index]
                              ↓
            ┌────────────────┴────────────────┐
            ↓                                 ↓
      [Interviewer]                    [Curation Selector]
            ↓                                 ↓
      [Q&A records]                    [Curation pool]
            ↓                                 ↓
            └────────────────┬────────────────┘
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
                  ┌──────────┴──────────┐
                  ↓                     ↓
        [自動反映 configs]         [Knowledge base]
```

各ストアの論理単位:

- Materials store: 素材源 1 件 = 1 レコード、ソース種別、時系列タグ、機密タグ
- Vector index: 「投稿可能な瞬間」単位
- Q&A records: インタビュー 1 回 = 1 レコード、全ターン履歴、satisfaction_score
- Core Ideas pool: 投稿の核 1 個 = 1 レコード、由来 (interview / curation)
- Post drafts: 1 核アイデア × プラットフォーム数のレコード
- Posted records: 投稿 1 回 = 1 レコード、内容スナップショット、配信時刻、**集客導線パターン (A/B/C)**
- Performance store: 投稿 × 時系列のメトリック

### Observability (v9 新規)

全テーブルに以下のフィールドを持つ:

- `trace_id`: 1 件の素材 → 投稿 → 計測の end-to-end トレース ID
- `run_id`: cron run ID (Cloudflare Workers / MA session)
- `post_id`: 内部 ID
- `platform_post_id`: X tweet_id / IG media_id / note article_id
- `cost`: その record 生成にかかった USD
- `failure_stage`: 失敗時のレイヤー (素材 / 選別 / Writer / Editor / 投稿 / 計測)
- `agent_version`: MA agent version pinning

→ 3 ヶ月後に「どこで何が止まったか」を trace_id で追える。

---

## 10. 法務・規約ガード (v9 新規章)

### 10.1 ステマ規制 (景表法、2023-10-01 施行)

note 販売 / コンサル誘導 / アフィリエイト / 案件紹介を含むコンテンツは **「広告であることが分かる表示」が必須**。違反すると景品表示法違反 (措置命令 + 課徴金) のリスク。

**v9 での対応**:
- Editor の +1 ルールに「アフィリエイト / 自社販売リンクを含む投稿は明示表記 (`#PR` または「PR」「広告」「プロモーション」のいずれか)」を追加
- 例: note 送客ツイート → 「PR」「[note 販売中]」を冒頭に明示
- 出典: [消費者庁ステルスマーケティング](https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/)

### 10.2 翻案ルール (著作権 / 依拠性)

twitterapi.io 取得の海外バズの「翻案」は依拠性のリスクあり。

**v9 での対応**:
- 翻案元 URL を Posted records に必ず記録
- 抽象化メモ (どのアイデアを取り、どこを変えたか) を残す
- 翻案後の投稿について cos 類似度 0.85 以上のものは「翻訳扱い」として再考
- 公開文面に翻案元の固有表現 (人名・社名・特定の言い回し) を残さない
- 引用形式で記載する場合は出典明記 + 主従関係を明確化

### 10.3 X / Meta 自動投稿規約

X の Automation rules / Meta の Threads/IG API 規約に違反すると **shadowban or ban** リスク。1 アカ全賭けは危険。

**v9 での対応**:
- X 1 日 5 本 → 公式 API 経由・User context auth で実施 (Automation rules で自動投稿は許可される範囲)
- 連続投稿の間隔は 30 分以上開ける
- 同じ文面の繰り返し投稿しない (cos 類似度ガード §4.2 で重複検出済み)
- **バックアップアカウントを 1 つ用意** (ban されてもゼロにならない、運用負荷低くする)
- 出典: [X automation rules](https://help.x.com/articles/76915-automation-rules-and-best-practices), [X Developer Policy](https://docs.x.com/developer-terms/policy)

### 10.4 VOICEVOX クレジット表記 (次フェーズ)

Shorts 実装時に VOICEVOX 使用する場合、各音声ライブラリの規約に従ったクレジット表記を Shorts 概要欄テンプレートに固定で入れる。

### 10.5 AI 生成画像の表記

X / Meta は AI 生成コンテンツへの自主表記を推奨。OpenAI gpt-image-1 で生成した画像を投稿する場合:
- alt text に「AI 生成画像 (gpt-image-1)」を入れる
- カルーセル末尾に「画像は AI 生成」と 1 行入れる (ユーザーから見える形)

CLAUDE.md「AI 表記: 自然な範囲で透明性を持って言及（隠蔽 NG、誇大 NG）」と整合。

### 10.6 Secrets rotation 戦略

X / Meta / LINE / Anthropic / OpenAI / Supabase key の漏洩リスク対応:
- key を `.env.local` のみで管理、git に commit しない
- 月次で X / Meta access token を refresh (OAuth 2.0 PKCE)
- 半年に 1 回 Anthropic API key / OpenAI API key を rotate
- 漏洩疑い時の即時 revoke 手順を別 doc 化

---

## 11. クロスレビューしてほしい論点 (v9 で再整理)

### 11.1 v9 でロジック検証してほしい (動くか確認)

| # | 論点 |
|---|---|
| E-1 | Interviewer の収穫逓減検知アルゴリズム (LLM judge vs embedding 距離) |
| E-2 | Hook 動的拡張の HDBSCAN パラメータ (`min_cluster_size=5`) の初期データ不足時の挙動 |
| E-3 | 選別スコアの分位補正 + log1p、フォロワー帯分割の妥当性 |

### 11.2 概念的に弱い箇所

| # | 論点 |
|---|---|
| E-4 | 「業務仕組み化テーマに繋がるか」の LLM judge 基準 (具体例セットは publishing research + 競合上位投稿で対処) |
| E-5 | 「敵を作らない」の判定の安定性 (褒め混じり観察は OK / 断罪は NG の境界) |
| E-6 | Visualizer モード切替の PSM、コバリエート (theme, hour, format) で交絡因子を十分に分離できるか |

### 11.3 検証なしで決め打ちした仮説

| # | 論点 |
|---|---|
| E-3.7 | 5-10 ターンで「深い」インタビューが達成可能か |
| E-3.8 | 過去 2-3 年の Claude Code ログに「100 単位」の投稿可能瞬間があるか |
| E-3.9 | 65 アカ × 3 ヶ月で意味ある統計が取れるか (publishing research 10 アカ × 928 tweets + 残 55 アカ追加で 1,300 投稿) |
| E-15 | インタビューパターン 8 種で素材抽出が十分か |
| E-16 | core_idea.complexity でフォーマット選択が妥当判定できるか |
| E-17 | 翻案 5 から実体験へ自然移行できるか (素材枯渇判定の閾値) |

### 11.4 v9 新規 (Managed Agents 関連、B-3 検証済)

| # | 論点 |
|---|---|
| E-7 | MA の state 管理がユーザーの用途で本当に有利か → **B-3 で月 ¥357 実測、有利と確認** |
| E-10 | MA beta 依存リスクの定量化 → AgentRunner 抽象化で対処 |
| E-11 | AgentRunner 抽象化レイヤーの設計妥当性 |
| E-12 | 初月モニタリング計画 (週 ¥1,500 上限) の現実性 → B-3 で実測ベース更新済み |
| E-13 | research preview 機能を本当に使わない判断は正しいか |
| **E-14 (新)** | **active vs duration billing** の判別 → Console billing dashboard で人間確認 (B-3 残課題) |

### 11.5 v9 新規 (自動反映系)

| # | 論点 |
|---|---|
| E-8 | 自動反映の安全装置 (-30% 閾値、ロールバック判定) の妥当性 |
| E-18 | キルスイッチ 48 時間停止の長さの妥当性 |
| E-19 | 変更幅キャップ (30%, ±200, ±60 分) の数値の妥当性 |
| **E-20 (新)** | **承認必須 4 種で十分か** (Style Guide v 変更 / 新類型認定 / 媒体追加・停止 / 月予算上限変更) |

### 11.6 v9 新規 (フォーマット選択)

| # | 論点 |
|---|---|
| E-9 | Contextual Thompson Sampling の事前分布設定 (Beta 分布のα, β) |
| E-21 | フォーマット別の期待 PCR を「style_guide 統計」で推定する際の初期値設定 |

### 11.7 v9 新規 (集客導線)

| # | 論点 |
|---|---|
| **E-22 (新)** | **集客導線 3 パターン (A/B/C) の effect 差を週次でどう推定するか** |
| **E-23 (新)** | URL 付き比率の Thompson Sampling 最適化と月コスト制約のバランス |

### 11.8 v9 新規 (note 生成)

| # | 論点 |
|---|---|
| **E-24 (新)** | **note 生成フローを X/Instagram と同様に詰める (v9 では叩き台のみ)** |
| **E-25 (新)** | note 有料記事のティーザー設計 / 価格 (500/980/1480) の Optimizer 改善対象化 |

### 11.9 設計の不確実性

| # | 論点 |
|---|---|
| E-4.11 | LINE Messaging API 200 通制限のフォールバック (Discord/Slack) の必要性 |
| E-26 | twitterapi.io の安定性 (サードパーティ依存)、終了/料金改定リスク |
| E-27 | OAuth 2.0 PKCE の token refresh 戦略 (X / Meta) |

---

## 12. 議論の経過 (補足)

| 版 | 主な変更 |
|---|---|
| v1 | 短文 Tips カード型、ブックメ率を北極星指標 |
| v2 | PCR を北極星に変更、煽り回避ルール、note 販売連動を本来目的化 |
| v3 | 自動化志向、実体験 7:翻案 3 (後に逆転)、インタビュアー追加検討 |
| v4 | インタビュアー詳細化、マルチプラットフォーム、Hook 動的拡張、競合調査 50 項目化 |
| v5 | コスト試算詳細、ローカル vs サーバー比較、Phase 0 計画 |
| v6 | ロジック深掘り (全エージェント)、Optimizer 改善対象拡張、3 フェーズサイクル |
| v7 | Managed Agents 比較、自動反映 + 事後報告、X フォーマット拡張 (スレッド/長文)、Style Guide v1/v2/v3 |
| v8 | All Managed Agents 採用、AgentRunner 抽象化、初月モニタリング |
| **v9** | **クロスレビュー + B-1〜B-3 実測反映、ターゲット非エンジニア経営者確定、媒体 3 集約、既存資産全撤廃、MA 全部入り採用 (実測根拠)、Contextual Thompson Sampling、集客導線 3 パターン Optimizer 対象化、法務章新設、Phase 0 期間 4-6 週 → 2-3 週短縮 + Week 1 から投稿開始、note 叩き台のみ (v9.1 で詳述)** |

---

## 13. レビュアーへの最終依頼

このドキュメントを読んだ上で、以下の順で批判してほしい:

1. **§11.1〜11.3 のロジック検証** — 「動かない可能性」を指摘
2. **§11.4 の Managed Agents 全部入り判断** — B-3 実測 ¥357 を踏まえても十分か
3. **§11.5〜11.7 の自動反映・フォーマット選択・集客導線** — 数値の妥当性、より良い手法の提案
4. **§11.8 の note 生成** — v9 叩き台レベルから v9.1 で詰めるべき具体項目
5. **§10 法務章** — 抜けている規約や 2026 年現在の新規制
6. **設計全体の盲点** — このドキュメントに書かれていないが、運用開始前に検討すべきこと

特に **「3 ヶ月運用してから後悔する箇所」** を予測して指摘してほしい。実装着手前の今が、設計修正の最大のレバレッジを持つタイミング。

---

## 付録 A: B-1〜B-3 検証成果へのリンク

- B-1 既存資産棚卸し: `outputs/improvements/x-account-design-v9-verification/B1-asset-inventory.md`
- B-2 X API フィールド確認: `outputs/improvements/x-account-design-v9-verification/B2-x-api-fields.md`
- B-3 MA 実コスト測定: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost.md` + `B3-ma-cost-result.md`
- B-3 実装 script: `outputs/improvements/x-account-design-v9-verification/B3-ma-cost-script/`

## 付録 B: 既存資産参考素材へのリンク (撤廃済、設計参考のみ)

- x-buzz-radar SSOT: `docs/superpowers/specs/2026-05-23-x-buzz-radar-design.md` (v7)
- x-buzz-radar 計画: `docs/superpowers/plans/2026-05-23-x-buzz-radar.md` (T1-T22)
- x-buzz-radar コード: branch `task/260523-x-buzz-radar`、commit 83df5df (`git show` で参照)
- publishing research REPORT: 別 worktree `all-good-ops-jp-publishers/outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md` (commit de16523)

## 付録 C: v9.1 で詰めるべき項目 (note 生成中心)

1. **note 構成パターンライブラリ** (SCQA / 失敗談先行 / Before-After / etc) の詳細化
2. **note SEO 整備** (タイトル文字数 / キーワード密度 / 関連記事サジェスト)
3. **有料記事のティーザー A/B テストロジック** (無料部分の終わり方、有料への期待値設計)
4. **note 投稿時間最適化** (X / IG との連動タイミング)
5. **note メンバーシップ移行設計** (Phase 2-3 で月額制検討)

---

*以上、運用設計書 v9 終わり。クロスレビュー結果を v9.1 (note 詳述 + クロスレビュー指摘反映) に進む想定。*
