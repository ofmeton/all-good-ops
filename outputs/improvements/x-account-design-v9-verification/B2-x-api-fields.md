# B-2: X API 実機フィールド確認

> v9 の北極星指標 PCR / dwell_time / engagement が X API v2 (Pay-Per-Use plan) で実取得可能か確認。x-buzz-radar 現実装コード read + 公式 docs 1 ページ確認で結論。

## 確認方法

1. x-buzz-radar の self-watch コード read (`src/lib/self-watch/x.ts` on branch `task/260523-x-buzz-radar`、git show 経由)
2. x-buzz-radar の twitterapi.io adapter read (`src/lib/fetchers/twitterapi.ts`)
3. 公式 docs https://docs.x.com/x-api/fundamentals/metrics を WebFetch 1 ページ
4. クロスレビュー (Codex) 既確認の pricing 情報を参照

実機 1 投稿テストは未実施 (上記で結論が固まったため不要)。

## X API v2 metrics の全体像

| グループ | 認証 | 制約 | 含まれるフィールド |
|---|---|---|---|
| **public_metrics** | App-only Bearer OK | 制限なし、誰でも | `like_count` / `retweet_count` / `reply_count` / `bookmark_count` / `impression_count` / `quote_count` |
| **non_public_metrics** | **User context (OAuth 2.0 PKCE)** 必須 | **自身の投稿のみ** | `impression_count` / `url_link_clicks` / **`user_profile_clicks`** / `engagements` / video の `playback_0/25/50/75/100_count` |
| **organic_metrics** | User context 必須 | 自身の投稿のみ、**30 日制限** | non_public_metrics の全項目 + 一部派生 |
| **promoted_metrics** | User context 必須 + 広告由来のみ | 30 日制限 | 広告経由の派生 |

出典: https://docs.x.com/x-api/fundamentals/metrics

## v9 北極星指標 (§1.3) との対応

| v9 指標 | 取得可否 | 経路 | x-buzz-radar 現実装 |
|---|---|---|---|
| **1. PCR (Profile Click Rate)** = user_profile_clicks ÷ impressions | ✅ 取得可能 | `/2/tweets/{id}?tweet.fields=non_public_metrics`、**OAuth 2.0 PKCE 認証必須** | ❌ **未対応** (Bearer Token のみ、`non_public_metrics.impression_count` のみ取得) |
| **2. dwell_time** (投稿の表示時間 = 滞在時間) | ❌ **存在しない** | — | — |
| **3. DM共有 / 引用RT クリック発生** | △ | quote_count は public_metrics で OK。DM 共有は API で取得不能 | quote_count 取得対象外 |
| **4. ブックマーク率** | ✅ | public_metrics.bookmark_count | ✅ 取得済 |
| **5. リプライ深度** | △ | reply_count は取れるが「深度 (返信ツリーの長さ)」は別 conversation API が必要 | reply_count のみ |
| **6. いいね (観賞用)** | ✅ | public_metrics.like_count | ✅ 取得済 |

## v9 設計への影響 (確定 4 点)

### 1. §1.3 北極星指標から `dwell_time` を削除

X API v2 に dwell_time は存在しない (`url_link_clicks` / `user_profile_clicks` / `engagements` / video playback counts のみ)。**設計書 §1.3 の優先度 #2 を別指標に置換**:

代替候補:
- (a) **engagements (総エンゲージメント数)**: non_public_metrics に存在、impressions 比で「エンゲージメント率」算出可
- (b) **url_link_clicks**: note 送客リンクや CTA リンクのクリック数。集客導線 (前ターン議論) と直結
- (c) **read-through rate** (代用): スレッドの 2 ツイート目以降の impression_count を比較

→ 推奨: **(b) url_link_clicks** を優先度 #2 に昇格。note 送客導線の KPI とも整合

### 2. §3.2 認証設計を OAuth 2.0 PKCE に変更

PCR 取得のため `non_public_metrics` を読む必要 → **User context auth (OAuth 2.0 PKCE)** が必須。v8 §3.2「X 書き = X 公式 API 無料枠」を以下に書き直し:

```
X 認証: OAuth 2.0 PKCE (User context)
  - 投稿: POST /2/tweets (pay-per-use $0.015/req、URL 付き $0.200/req)
  - 自投稿 analytics 読み: GET /2/tweets/{id}?tweet.fields=non_public_metrics
  - X owned reads: $0.001/req (price page 確認済)
```

token refresh 戦略も v9 で設計章追加。

### 3. §4.4 Visualizer モード切替の評価指標を変更

v8 §4.4: `ai_pcr_median > self_pcr_median * 1.3` で Mann-Whitney U test

→ PCR 取得が User context で安定するまでは、**bookmark 率 + url_link_clicks** の複合指標で代替。前ターン議論の通り Visualizer は準実験 (PSM) + 段階 rollout に変更し、自動切替自体を保留

### 4. §3.3 コスト試算更新

x-buzz-radar self-watch 実績ベースで:

| 種別 | 単価 | 月間想定 (3 媒体合計) | 月額 |
|---|---|---|---|
| X 投稿 (URL なし) | $0.015 | 150 (X 5本/日 × 30 × URL なし比 0.7) | $1.58 |
| X 投稿 (URL 付き、note 送客) | $0.200 | 45 (URL あり比 0.3) | $9.00 |
| X self-watch (24h/72h/7d × 3 回 × 投稿数) | $0.001 | 1,950 reads | $1.95 |
| **X 計** | | | **$12.53 ≒ ¥1,936** |

**前ターンの「集客導線 3 パターン」(プロフ常時 / 送客ツイート + 引用派生 / 投稿末尾 CTA) によって URL 付き比率は大きく変動**。Optimizer の改善対象として「URL 付き比率」を持つことで月コスト最適化が直接効く設計に。

## 未確認・要追加検証

- **OAuth 2.0 PKCE フローの実機テスト**: Pay-Per-Use plan で `/2/tweets/{id}?tweet.fields=non_public_metrics` が実際に 200 を返すか (Free tier では 403 の報告もあり、Pay-Per-Use plan 必須の可能性)
- **30 日超過の挙動**: non_public_metrics に「30 日制限」の明記はないが、実機検証が必要 (organic_metrics は 30 日制限明記あり)
- **URL 付き投稿の課金実体**: docs に詳細記載なし、Codex 確認結果 ($0.200/req) は要追検
- **reply tree 深度**: `/2/tweets/search/recent` の `conversation_id` 検索で代替可能、別途設計

これらは v9 起草後の Phase 0 ドライランで実機テストする。

## 結論

v9 §1.3 と §3.2 は **v8 から書き直し必須**。書き換え 4 点 (北極星指標 / 認証 / Visualizer 評価指標 / コスト試算) は確定情報として A フェーズに引き継ぐ。

実機 1 投稿テストは Phase 0 ドライラン (v9 起草後) に回す。今は v9 起草を進めて差し支えない。
