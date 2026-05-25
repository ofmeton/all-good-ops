# X 発信アカウント運用自動化システム 設計書 v10.2 — Codex 重大指摘 5 件 inline patch

> v10.1 (Phase 0 反映版) に対し、Codex MCP クロスレビューで検出された **Phase 1 着手前ブロッカー 5 件** を inline patch した版。  
> 5 件以外の Codex 指摘 (中重要度 8 件) は本ドキュメント末尾 付録 C に記録、v10.3 以降で順次反映。  
> Source: `outputs/improvements/x-account-design-v10-phase0/codex-cross-review.md` §16 修正項目重要度順 1-5。

---

## 0. このドキュメントの読み方

### 0.1 v10.1 → v10.2 の経緯

| 版 | 主な変更 | 行数 |
|---|---|---|
| v10.1 | Phase 0 反映 (M-1〜M-14) | 約 600 |
| **v10.2** | **Codex クロスレビュー重大 5 件 inline patch** | 本ドキュメント |

### 0.2 v10.2 で反映した重大 5 件 (= Codex §16 重要度 1-5)

| # | 内容 | 対応章 | Phase 1 着手前必須 |
|---|---|---|---|
| **CR-1** | バックアップアカウント = X 規約違反 → 削除 + 所有導線置換 | §10.3 | ✅ |
| **CR-2** | 個人情報・顧客秘密の公開許諾 gate 新設 | §10.7 (新章) + §3.1 + §4.6 | ✅ |
| **CR-3** | 全 agent の月額費用再算定 (Writer / Editor / Opus thinking / image mix / p95) | §3.3 | ✅ |
| **CR-4** | X OAuth 2.0 PKCE 実装 gate (offline.access / refresh / metrics read / 失敗停止) | §3.5 (新章) + §8.0 (Phase 0 Foundation 内) | ✅ |
| **CR-5** | Phase 0 Hook 比率の因果主張を撤回、primary_hook 1 + devices 複数の再分類 | §4.7 + Style Guide v1 (Phase 0 Report §6.2 へ remark) | ✅ |

### 0.3 v10.2 の構成原則

- **v10.2 = v10.1 を継承、変更があった章のみ詳述**
- 変更なしの章は「v10.1 §X 参照」で短く済ませる
- 重大 5 件以外の Codex 指摘は **付録 C** に記録、v10.3 以降で反映
- Phase 0 Report の Hook 比率は本 v10.2 で「未検証仮説」として再定義 (CR-5)、Style Guide v1 自体は維持しつつ「Phase 1 期間中は計測のみ、設定固定 = NO」を §7 に追記

### 0.4 用語

v10.1 §0.4 を継承 + 以下追加:

- **CR-X**: Codex Required X (Codex 指摘の必須修正項目、X は番号)
- **公開許諾 gate**: 投稿生成前に「素材の公開許諾 + DLP redaction + retention 同意」を確認するエージェント (§10.7)
- **owned channel fallback**: X ban / 障害時に「note メール購読」「所有ドメイン」「同意済み LINE 連絡先」で運用継続する仕組み (§10.3)
- **primary_hook + devices**: Hook 分類を「主類型 1 つ + 修辞 device 複数」の 2 軸に分離 (§4.7)

---

## 1. 背景と発信戦略

v10.1 §1 と同じ。**変更なし**。

---

## 2. 設計の根本原則

v10.1 §2 と同じ。**変更なし**。

---

## 3. システムアーキテクチャ

### 3.1 レイヤー構成

v10.1 §3.1 を継承、**①素材レイヤーに「公開許諾 gate」を必須中継として追加** (CR-2 対応):

```
┌──────────────────────────────────────────────────────────┐
│ ① 素材レイヤー (2 系統)                                   │
│   ・twitterapi.io (海外バズ + 国内 AI + 公式アカ追跡)     │
│   ・Claude Code 履歴 + Git commit + 案件メモ + 音声メモ   │
│                                                          │
│   ↓ ① の出力は全件 → 「公開許諾 gate (§10.7)」を通過必須   │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 公開許諾 gate (CR-2 新規) — pii / client_confidential /   │
│ publication_consent / purpose / retention を必須属性化     │
│ DLP redaction (氏名 / 社名 / ID / 金額 / 画面 / ログ)      │
│ 同意なし案件素材は投稿 pool へ入れない                     │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ ② インデックス層 (pgvector)                               │
└──────────────────────────────────────────────────────────┘
                          ↓ (以下、v10.1 §3.1 と同じ)
```

### 3.2 技術スタック

v10.1 §3.2 を継承、**Anthropic / OpenAI / Supabase 送信前に DLP redaction を行う設計を §3.2 末尾に明記**:

- **`materials_store` テーブルに `pii=true` / `client_confidential=true` の素材を投稿生成 prompt として送信しない**
- 必要時は redacted version (顧客名 → "T 社" 等) のみを生成 prompt に渡す
- `materials_store` 自体は Supabase に **隔離スキーマ** で保管 (RLS で投稿生成エージェントから読めない)

### 3.3 コスト試算 (CR-3 全 agent 月額費用再算定)

v10.1 §3.3 を **全面差し替え**。Codex 独立指摘 1-1〜1-4 に基づく workload 表形式:

#### 3.3.1 workload 表 (Phase 1 expected)

| Agent | runs/month | input_tok/run | output_tok/run | retry_rate | model | unit cost (in/out) | 月額 (JPY) |
|---|---:|---:|---:|---:|---|---|---:|
| **Writer (核アイデア → 媒体派生 8 個)** | 30 core × 8 platform = 240 | 4,500 (Style Guide + 履歴) | 3,000 (投稿草案) | 30% (Editor reject) | Sonnet 4.6 | $3/$15 per MTok | **¥1,840** |
| **Editor (6+4 ルール判定)** | 240 × 1.3 retry = 312 | 1,500 (投稿 + ルール) | 500 (判定 + 理由) | 5% (LLM 自体 retry) | Sonnet 4.6 | $3/$15 per MTok | **¥321** |
| **Hook Analyzer (類型分類 + 新候補検出)** | 312 + 月 30 (新候補) = 342 | 800 | 300 | 5% | Sonnet 4.6 (Haiku 4.5 でも可) | $3/$15 per MTok | **¥234** |
| **Visualizer 制御 (画像生成プロンプト)** | 月 150 枚 × 1.2 retry = 180 | 1,200 | 200 | 20% (画像 retry) | Sonnet 4.6 | $3/$15 per MTok | **¥130** |
| **Interviewer (月 60 セッション)** | 60 | 2,000 (cache) | 1,500 (1 ターン) × 平均 8 ターン = 12,000 | 5% (素材不在) | Sonnet 4.6 | $3/$15 per MTok | **¥1,140** |
| **Optimizer Phase 1 (Sonnet weekly)** | 月 4 (週次) | 30,000 (週次データ) | 5,000 (数値ファクト) | 0% | Sonnet 4.6 | $3/$15 per MTok | **¥125** |
| **Optimizer Phase 2 (Opus weekly + thinking)** | 月 4 | 50,000 (Phase 1 出力 + 過去 Style Guide) | 12,000 (thinking 5,000 + 仮説 7,000) | 0% | Opus 4.7 + extended thinking | $15/$75 per MTok | **¥702** |
| **Optimizer Phase 3 (施策立案、Sonnet)** | 月 4 | 20,000 | 5,000 | 0% | Sonnet 4.6 | $3/$15 per MTok | **¥110** |
| **MA session overhead (active_seconds 課金)** | 60 + 4 + 4 + 4 = 72 sessions | — | — | — | MA | $0.005/sec × avg 1.3 min | **¥84** |
| **Image (low 120 / medium 30 / high 0 / edit 0)** | 150 | — | — | 0% | gpt-image-2 | low $0.00816, medium $0.03168 | **¥321** |
| **X API (1 日 5 投稿 = URL 付き 1 + URL なし 4)** | 月 150 | — | — | — | X PPP | URL 付 $0.200, URL なし $0.015 | **¥1,287** |
| **twitterapi.io (海外/国内追跡 + transfer learning)** | 月 50 query | — | — | — | $0.15/1000 tweets | — | **¥100** |
| **Cloudflare Workers Paid** | — | — | — | — | Paid plan | $5/月 | **¥780** |
| **Supabase Free** | — | — | — | — | Free | — | **¥0** |
| **LINE Messaging API** | 200 通超過 = 340 通 (Daily 30 + Weekly 4 + Interview 300 + 異常 6) | — | — | — | $0.03 = ¥5/通 | — | **¥700** |
| **X Premium Basic** | — | — | — | — | — | ¥980/月 | **¥980** |
| **Anthropic API (上記合算検証用)** | (Writer + Editor + Hook Analyzer + Visualizer + Interviewer + Optimizer 1+2+3) | — | — | — | — | — | **¥4,502** |
| **合計** | — | — | — | — | — | — | **¥9,154** |

#### 3.3.2 シナリオ別予算 (low / expected / p95)

| シナリオ | 月額 (JPY) | 主な差分 |
|---|---:|---|
| **low** | ¥6,500 | Writer retry 10% / Editor retry 0% / image low only / Opus thinking 無効 / Interviewer 月 40 |
| **expected (上記表)** | **¥9,154** | 上記前提値 |
| **p95** | ¥13,800 | Writer retry 50% / Editor retry 20% / image medium 50 枚 / Opus thinking high / Interviewer 月 80 |

#### 3.3.3 月予算 ¥10,000 との関係

- expected ¥9,154 は月予算 ¥10,000 を **¥846 上回らない**ギリギリ枠
- p95 ¥13,800 で **超過リスク 30-40%** → §5 brownout mode の発動条件を再評価必須
- v10.1 (¥5,504-5,704) は **約 ¥3,500-4,000 過小評価** だった (主因: Writer / Editor の生成・判定費用未計上)

#### 3.3.4 brownout mode の条件 (CR-3 反映)

v10.1 §5.3 を継承し、以下を追加:

- 月コスト ≥ ¥10,000 到達時 → **投稿停止** (既出) + Writer retry を全部 reject + Optimizer Opus weekly を Sonnet にダウングレード
- 月コスト ≥ ¥11,500 到達時 → **投稿 + Interviewer + Optimizer 全停止**、Daily Digest + Weekly Brief は LINE で継続

### 3.4 Managed Agents 一本化の判断

v10.1 §3.4 を継承 + **Opus weekly 実本番条件** を追加 (Codex 1-2):

```
追加 gate:
- 本番 prompt + 対象 1 週分データ + thinking 設定固定で 4 回 dry-run
- 各 dry-run の active_seconds / cost / 仮説品質 (人間レビュー) を記録
- 4 回平均で expected ¥702/月 (本表 §3.3.1) を ±30% 内で予測可能なら本番投入
- 範囲外なら Sonnet 4.6 のみで運用、Opus は 月次に降格
```

### 3.5 (新章) OAuth 2.0 PKCE 実装 gate (CR-4 対応)

v10.1 では §10.6 Secrets rotation に 1 行触れていただけ。v10.2 で **Phase 1 着手前の必須 gate** として独立章化:

#### 3.5.1 X OAuth 2.0 PKCE 必須 scope

| scope | 用途 | 必須 |
|---|---|---|
| `tweet.read` | 投稿 read | ✅ |
| `tweet.write` | 投稿 write | ✅ |
| `users.read` | 自アカ情報 | ✅ |
| `offline.access` | refresh token 発行 | ✅ **(欠落するとアクセス 2 時間で失効)** |
| `bookmark.read` | 競合観察用 (Phase 2 以降) | △ |

#### 3.5.2 Phase 1 着手前の実機テスト 4 項目

```
☐ 1. PKCE 完全フローで access_token + refresh_token を 1 回取得 (offline.access scope 付き)
☐ 2. refresh_token rotation を 2 回連続成功 (各 refresh で新 refresh_token が発行されること)
☐ 3. non_public_metrics (user_profile_clicks + url_link_clicks) を user context で 1 回 GET 成功
☐ 4. refresh 失敗を意図的に発生させ、`auth_blocked` 状態が LINE に通知され、投稿 cron が停止すること
```

これら 4 項目を 1 つでも fail した時点で Phase 1 着手不可。

#### 3.5.3 refresh token 保管

- `.env.local` のみで管理、git に commit しない
- Supabase に保管する場合は **RLS で投稿 cron user のみ read 可能**、Web UI は read 不可
- 漏洩疑い時の即時 revoke 手順を別 doc 化 (v10.1 §10.6 と同じ)

#### 3.5.4 Meta (Instagram Graph API) launch gate

Codex 3-4 に基づき、Instagram は X とは独立 launch:

```
☐ 1. Business アカウント + FB ページ連携完了
☐ 2. Meta App Review で publish_actions / instagram_content_publish 承認取得
☐ 3. publish test (テスト画像 1 枚で投稿成功)
☐ 4. 60 日 token refresh 動作確認

→ 4 項目すべて完了するまで Phase 1 IG launch は実施しない (X launch とは独立フェーズ化)
```

---

## 4. 各エージェント・モジュールのロジック詳細

### 4.1 Interviewer

v10.1 §4.1 と同じ + **公開許諾 gate との接続** (CR-2):

```
追加: InterviewState に
  publication_consent_status: pending | granted | denied
  client_impacted_flag: bool

ユーザー (ofmeton) が応答した内容に「顧客名 / 案件秘密」が含まれる場合、
Interviewer は raw を Q&A records にする前に「この内容、note / X で公開してよいですか?」を 1 ターン挟む
- granted → 通常フロー
- denied → 「公開しない」フラグ付きで記録、投稿 pool へ流さない
- pending → 投稿 pool 投入禁止、Daily Digest で再確認
```

### 4.2 選別エージェント

v10.1 §4.2 と同じ + **公開許諾済み素材のみ pool 投入** を明示。

### 4.3 Writer

v10.1 §4.3 を継承。**ただし Writer プロンプト内で**:
- redacted 顧客名 (例: "T 社" "S さん") を使う
- 元素材の固有名詞は **DLP redaction 済み素材** から生成
- Hook 比率は固定でなく **Phase 0 Report §6.2 を仮説扱い** (CR-5)、Phase 1 では Hook 別成果計測のみ実施し、固定配分は Month 3 以降

### 4.4 Visualizer

v10.1 §4.4 と同じ。**PSM 自動切替は §4.4 内ですでに「承認制」**だが、Codex 13-1 に基づき **Phase 1 は PSM 適用前提を満たさない** (10 対 10 件で 3 共変量 matching = pair 不足)。

→ **Phase 1 は PSM 停止、ランダム割当 + 週単位 switchback で運用** (付録 C に記載、v10.3 で詳述)

### 4.5 Videographer

v10.1 §4.5 と同じ。

### 4.6 Editor (CR-2 対応 = 公開許諾 gate との連携)

v10.1 §4.6 の 6+4 ルールを継承 + **+5 (新規) 公開許諾チェック** を追加:

| # | ルール | 判定方法 |
|---|---|---|
| 1-6, +1, +2 | (v10.1 と同じ) | (v10.1 と同じ) |
| +3 | 失敗談スロット必須、実体験ソース ID 添付必須 (v10.1) | (v10.1 と同じ) |
| +4 | 読者像 1 行明示 (v10.1) | (v10.1 と同じ) |
| **+5 (CR-2)** | **公開許諾 OK 素材のみ使用、顧客名・社名・ID・金額・画面・ログの redaction 済確認** | DLP 正規表現 + `materials_store.publication_consent='granted'` の SQL チェック |

### 4.7 Hook Analyzer (CR-5: primary_hook + devices 分離)

v10.1 §4.7 を **全面差し替え**:

#### 4.7.1 primary_hook + devices の 2 軸分類

```
primary_hook (1 つ、排他):
  - 失敗談先行型 (経験談 + ストーリー駆動が中核)
  - 業務再現型 (具体的な業務手順 + 数字 + Before-After)
  - 業界批評型 (思考フレーム + 異論)
  - tips 列挙型 (情報密度重視)

devices (複数、追加可):
  - 数字 (例: "30 分 → 3 分")
  - Before-After
  - 結論先出し
  - 問いかけ
  - 逆張り ("みんな X と言うが実は Y")
  - 共感 ("実は私も最初は X")
  - メタ言及
  - 自己卑下
  - 比較 ("vs")
  - 警告
  - 経験談 (一人称 + 過去形)
  - 【】カッコ
  - emoji 起点
```

#### 4.7.2 Hook Analyzer の出力

```typescript
type HookAnalysis = {
  primary_hook: 'failure_story' | 'business_repro' | 'critique' | 'tips_enum';
  devices: Array<'number' | 'before_after' | 'conclusion_first' | ...>;
  confidence: 0..1;
  raw_features: { ... };  // 規則ベース判定の中間結果
};
```

#### 4.7.3 Phase 1 配分制御の方針 (CR-5)

- v10.1 §4.7 で「Phase 1 主軸 3 + テスト枠 4」と書いていたが、**Phase 1 中はあくまで観察、配分固定は Month 3 以降の Style Guide v2 で**
- Phase 1 中は Writer プロンプトに「**primary_hook を毎回ランダムに 4 種から選択、devices は自然な範囲で使う**」を指示
- Optimizer Phase 1 (weekly Sonnet) で primary_hook × 成果 (PCR / url_link_clicks / qualified_consultation) のクロス集計を残し、Month 3 末で人手判定により Style Guide v2 配分を決める

#### 4.7.4 新類型認定 (HDBSCAN の停止、Codex 12-1 に基づく)

v10.1 §4.7「新類型認定」は HDBSCAN で min_cluster_size=5 だったが、**Phase 1 は 1 投稿/日 = 月 30 投稿、未知候補は 6 件程度 = HDBSCAN 適用不可**。

→ **Phase 1 は HDBSCAN 停止、未知投稿は月次に人手ラベル付け**。自動 clustering は `unknown ≥ 50` かつ各候補 `impressions ≥ 1,000` の Phase 2 以降。

### 4.8 Optimizer

v10.1 §4.8 を継承。**ただし「そもそも論 weekly レビュー」は Phase 1 着手 Month 1-2 に限定して "異常・運用詰まり・追加計測の提案" のみに縮退** (Codex 11-1):

```
Month 1-2:
  Optimizer Phase 2 (Opus weekly) の出力は:
    - 異常検知 (PCR 急落 / cost 超過 / token refresh 失敗等)
    - 運用詰まり (公開許諾 deny 多発 / 失敗談 supply 不足等)
    - 追加計測の提案

Month 3 以降:
  - Opus weekly は構造改善提案を再開
  - 提案には 90 日窓 + business KPI + 変更前後の評価計画を含む decision memo 形式必須
  - 採用は四半期決定 (= 月次でなく)
```

---

## 5. 自動反映 + 事後報告 + 安全装置

v10.1 §5 を継承 + **brownout 条件を §3.3.4 で更新** (上記)。

---

## 6. 競合調査

v10.1 §6 と同じ + **Phase 0 Report §1 / §2 / §6 の Hook 比率は「未検証仮説」** であることを明示 (CR-5)。

---

## 7. Style Guide の段階運用

v10.1 §7 を継承 + **Phase 1 期間中は Style Guide v1 の数値設定 (敬体率 / Hook 比率 / 文字数) は計測のみ、Writer プロンプトの固定設定は最小限**:

```
Style Guide v1 (Phase 0 Report §6) の取り扱い:

Phase 1 (Week 1 - Month 3) = 観測フェーズ:
  - Writer プロンプト固定: "禁止" (詰め込みアフィリエイト誘導、業法違反、誇大表現) と "許可" (文字数上限 + 言語禁止リスト) のみ
  - 数値項目 (敬体率 40-55% / Hook 比率 / 改行密度 etc.) は計測タグとして記録、Writer に強制しない

Month 3 (Phase 1 終了時):
  - 各数値項目 × 成果 (PCR / qualified_consultation / paid_revenue) のクロス集計
  - 人手判定で Style Guide v2 を承認
  - Writer プロンプトに数値制約として固定 (v2 適用)
```

---

## 8. Phase 計画 (CR-4 反映)

### Phase 0: Foundation (2026-05-25 完了)

```
✅ Week 0: Phase 0 競合調査 + Style Guide v1 確定 (本セッション)
✅ Week 0: v10.2 起草、Codex 重大 5 件 inline patch

☐ Week 1 着手前 (Phase 0 残作業):
  ☐ §3.5 OAuth 2.0 PKCE 実機テスト 4 項目 完了 (CR-4)
  ☐ §10.7 公開許諾 gate Schema 設計 + Supabase migration (CR-2)
  ☐ §10.3 バックアップアカウント設計の削除 + 所有導線 fallback 設計 (CR-1)
  ☐ §3.3 cost_model.csv 作成 + Phase 1 予算 commit (CR-3)
  ☐ §4.7 primary_hook + devices Schema 設計 + 既存 50 項目集計の再ラベリング (CR-5)
```

### Phase 1: X + Instagram + note ローンチ (~ 2026-07 末)

v10.1 と同じ KPI + **business KPI を追加** (Codex 8-1):

```
v10.1 KPI:
- note 月売上 3 万円
- X 500 フォロワー
- IG 300 フォロワー

v10.2 追加 KPI (CR-4 / Codex 8-1):
- qualified_consultation 月 ≥ 3 件 (note 経由 or X DM 経由)
- paid_revenue 月 ≥ ¥30,000 (note 売上のみ Phase 1)
- impressions 月 ≥ 20,000
- profile_clicks 月 ≥ 60 件
```

### Phase 2 / Phase 3

v10.1 §8 と同じ。

---

## 9. データフロー + observability

v10.1 §9 を継承 + **publication_consent_status / client_impacted_flag** を全テーブルに追加 (CR-2)。

---

## 10. 法務・規約ガード (CR-1 / CR-2 反映)

### 10.1 ステマ規制

v10.1 §10.1 と同じ。

### 10.2 翻案ルール (v10.1 と同じ + Codex 10-5)

v10.1 §10.2 を継承 + **source ごとに `permitted_storage` / `retention` / `derived_use` / `deletion` を定める**:

```
inspirations source 別ルール:
  X (twitterapi.io 経由):
    permitted_storage: URL + post ID + 短文要約のみ
    retention: 90 日 (元本文は保持しない)
    derived_use: 翻案 (固有名詞置換 + 数字差替 + 構造変更)
    deletion: 90 日経過時に自動 archive
  
  note (Firecrawl / WebSearch 経由):
    permitted_storage: URL + タイトル + 構成メモのみ (本文は保持しない)
    retention: 180 日
    derived_use: 構成 transfer (本文翻案不可、構成パターンの参考のみ)
    deletion: 180 日経過時に自動 archive
```

### 10.3 X / Meta 自動投稿規約 (CR-1: バックアップ削除)

v10.1 §10.3 を **全面差し替え**:

```
X 公式 Automation Rules 遵守:
- 1 日 5 本 → 公式 API 経由 (OAuth 2.0 PKCE)
- 連続投稿の間隔 30 分以上
- 同じ文面の繰り返し禁止
- 当日内の引用 RT chain (17:00 元投稿 → 17:30 / 21:00 引用) は cos 類似度 ≤ 0.5 必須、同一 CTA / claim / link の再掲は 1 日 1 回まで
- v10.1 で記述した「バックアップアカウント = ban 時の保険」は X Automation Rules の duplicate-account 禁止に違反するため **削除**

v10.2 新規: owned channel fallback (CR-1):
- X ban 時の代替:
  ☐ note メール購読 (50 件以上のメール購読を Phase 1 で確保、note Form Builder 経由)
  ☐ 所有ドメイン (ofmeton.com 等) で blog 公開
  ☐ 同意済み LINE 連絡先 (公開許諾 gate 経由で 30 件確保)
- これらに発信を切り替え、人間に appeal 申請するまでの繋ぎとする
```

### 10.4-10.6

v10.1 §10.4-10.6 と同じ。

### 10.7 (新章) 個人情報・公開許諾ガード (CR-2)

v10.1 では言及なし。v10.2 で **Phase 1 着手前の Schema 設計が必須**:

#### 10.7.1 公開許諾 gate の Schema

```
materials_store テーブル (Supabase):
  id: uuid PK
  source_type: 'claude_code' | 'git_commit' | 'project_memo' | 'voice_memo' | 'x_inspirations' | 'note_inspirations' | 'manual'
  raw_text: text (RLS で投稿生成 user は読めない、人間のみ)
  redacted_text: text (顧客名 → "T 社", ID → "ID_XXX" 等、投稿生成 user は読める)
  
  pii: bool (氏名 / メール / 住所が含まれる)
  client_confidential: bool (契約秘密が含まれる)
  publication_consent: 'pending' | 'granted' | 'denied'
  consent_obtained_from: text? (案件 client 名前 等)
  consent_obtained_at: timestamptz?
  
  purpose: 'public_post' | 'internal_only' | 'unknown'
  retention: '90d' | '180d' | '1y' | 'forever'
  expires_at: timestamptz
  
RLS:
  - 投稿生成エージェント user: raw_text 読めない、redacted_text + publication_consent='granted' なら読める
  - 人間 user: 全 read 可能
```

#### 10.7.2 投稿生成前の必須チェック (Editor +5 ルール)

```
WriterOutput が以下を満たさないと Editor で reject:
- 使用 source_id の全件で publication_consent='granted'
- redacted_text のみを参照 (raw_text は使用していない、ログで確認)
- DLP 正規表現 (氏名・社名・メール・電話・契約金額・契約日) が draft text に含まれない

Daily Digest に「公開許諾 granted 件数 / pending 件数 / denied 件数」を毎日表示
```

#### 10.7.3 顧客同意の取得フロー

```
ofmeton が「この案件の Y を投稿で使いたい」と判断した時:
1. 案件 client に「業務改善内容を抽象化して X / note で発信したい、顧客名は出さない」と LINE / メール
2. 同意取得 → consent_obtained_from / consent_obtained_at を materials_store に記録
3. publication_consent = 'granted' に更新
4. Writer 投入可能に

顧客非同意 / 反応待ち:
- publication_consent = 'pending' / 'denied'
- Writer 投入禁止、本人の事業運用ログ (RICE CREAM / 家庭教師 / portfolio 自分の事業) は consent 不要
```

#### 10.7.4 ZDR / API 送信ガード

```
Anthropic / OpenAI / Supabase に送信する payload は:
- raw_text を含めない
- redacted_text のみ
- pii=true / client_confidential=true の素材は ID のみで text を送信しない

Anthropic 標準: 入出力 30 日 retention、本契約は ZDR (Zero Data Retention) 別契約必要、beta 製品は ZDR 適用外の場合あり
→ Phase 1 では「顧客素材は投入禁止、本人事業のみ」に限定 (Codex 10-2)
```

### 10.8 note 販売 compliance (付録 C に詳述、v10.3 で本章化)

---

## 11. クロスレビュー観点 (E-39〜E-41 + Codex 観点を統合)

v10.1 §11 を継承 + **以下を新規追加**:

| # | 論点 |
|---|---|
| **E-42 (CR-3)** | 全 agent 月額費用再算定の精度: low / expected / p95 の 3 シナリオが Month 1 実測でどれだけ的中するか |
| **E-43 (CR-2)** | 公開許諾 gate の運用負荷: 案件 client への同意取得が ofmeton の業務時間をどれだけ圧迫するか |
| **E-44 (CR-4)** | OAuth 2.0 PKCE 実機テスト 4 項目の Phase 1 着手前完了可能性 |
| **E-45 (CR-1)** | owned channel fallback (note メール / ドメイン / LINE) が ban 時に実運用継続できる規模感 |
| **E-46 (CR-5)** | primary_hook + devices 再分類の Phase 1 計測精度 (人手ラベル 100 件で primary 分類精度はどれだけ出るか) |

---

## 12. 議論の経過

| 版 | 日付 |
|---|---|
| v10 | 2026-05-25 (PR #17 merged) |
| v10.1 | 2026-05-25 (Phase 0 反映) |
| **v10.2** | **2026-05-25 (Codex 重大 5 件 inline patch)** |

---

## 13. レビュアーへの最終依頼

v10.1 §13 を継承 + **v10.2 で追加された以下も明示的にレビュー希望**:

1. **§3.3 cost_model 再算定** が Month 1 実測でどれだけ的中するか
2. **§10.7 公開許諾 gate** が顧客同意取得 + DLP redaction で運用継続可能か
3. **§4.7 primary_hook + devices** が Phase 1 計測で意味のあるデータを残せるか
4. **§3.5 OAuth 2.0 PKCE 実機テスト 4 項目** が Phase 1 着手前にすべて完了可能か
5. **§10.3 owned channel fallback** が X ban 時の実用代替として十分か

---

## 付録 A: v10 / v9 系との関係 + 付録 B: Phase 0 成果へのリンク

v10.1 と同じ + 以下追加:

- v10.2 自身: 本ドキュメント
- v10.1 (Phase 0 反映): `outputs/improvements/x-account-design-v10-1.md`
- Codex クロスレビュー: `outputs/improvements/x-account-design-v10-phase0/codex-cross-review.md`

---

## 付録 C: v10.3 以降の改善候補 (Codex 中重要度 8 件 + 残存指摘)

Codex §16 重要度 6-13 の 8 件、および追加指摘:

| 順 | 内容 | Codex § | v10.3 反映タイミング |
|---|---|---|---|
| C-6 | v10.2 を単独で読める統合仕様へ再生成 (v10.1 / v10 参照を削除) | Codex §16 #6 | Phase 1 Month 1 末 |
| C-7 | IG / Meta launch を独立 gate 化 | Codex §16 #7 | Phase 1 着手前 (CR-4 と並列実施可) |
| C-8 | note 販売 compliance 追加 (特商法表記 / 返金 / ML 設定確認) | Codex §16 #8 | Phase 1 初回 note 有料公開前 |
| C-9 | auto-post 移行基準を品質・運用 gate に変更 (重大誤り 0 件 / 規約差戻し 0 件 / 承認滞留 p95 < 24h / token refresh 正常) | Codex §16 #9 | Phase 1 Month 1 末 |
| C-10 | PCR から売上までの計測を設計 (impression 下限 / purchase / qualified lead / 受注記録) | Codex §16 #10 | Phase 1 着手前 (KPI 設計と並列) |
| C-11 | Visualizer PSM を停止、ランダム割当 / switchback に変更 + 負荷 KPI 追加 | Codex §16 #11 | Phase 1 着手前 |
| C-12 | HDBSCAN 自動認定を保留、unknown ≥ 50 + impressions ≥ 1,000 までは人手 label | Codex §16 #12 | Phase 1 全期間 |
| C-13 | 失敗談下限 KPI を撤回、`verified_failure_story ≤ 4/月` の供給上限から開始 | Codex §16 #13 | Phase 1 着手前 |
| C-14 (R-19) | X token refresh 失敗時の auth_blocked 通知 | Codex §15 R-19 | CR-4 と統合 |
| C-15 (R-23) | PSM 負荷 KPI 含めない問題 → C-11 と統合 | Codex §15 R-23 | C-11 と統合 |
| C-16 (R-24) | Optimizer の偶然差を Style Guide 永続化リスク → 多重比較制御 + 事前登録 | Codex §15 R-24 | Phase 1 Month 2 |
| C-17 (R-25) | note ML 二次利用設定確認 → C-8 と統合 | Codex §15 R-25 | C-8 と統合 |
| C-18 (Self R-13) | Phase 1 中盤で読者からツール比較を求める声を観察 → Optimizer Weekly Brief に「未採用構成パターンへの読者反応」項目追加 | Self R-13 | Phase 1 Month 2 |
| C-19 (Self A-2) | §4.8 タイムテーブルにスレッド / 長文枠を明示 (週 31 投稿の内訳) | Self A-2 | Phase 1 Month 1 |
| C-20 (Self C-1) | Editor +3 実体験ソース ID の Supabase テーブル設計 (materials_store 拡張) | Self C-1 + CR-2 と統合 | CR-2 と統合 |

---

*以上、x-account-design v10.2 終わり。CR-1〜CR-5 の Phase 1 ブロッカー解消が PR の主旨。残り C-6〜C-20 は v10.3 以降で順次反映。Phase 1 着手前の必須完了タスクは §8 Phase 0 Week 0 着手前リスト参照。*
