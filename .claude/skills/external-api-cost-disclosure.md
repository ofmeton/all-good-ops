# 外部 API コスト開示 (External API Cost Disclosure)

## 概要

従量課金の外部 API（twitterapi.io / Stripe / Firecrawl / X 公式 API / OpenAI 互換 / Resend 等）を**新規に叩く**時、プラン提示と同じターンに **円/回コスト**を併記する。ユーザーから「コスト試算もしてね」と言わせない（言わせたら後出し）。

**Claude Code / Anthropic API はサブスク内のため対象外**（[[memory: feedback_external_api_cost_check, project p2-212e 参照]]）。

## トリガー（自動適用）

以下の **新規** API 呼び出しを伴うタスクで自動適用。既存運用の繰り返し実行は対象外。

- twitterapi.io / Twitter API / X API
- Firecrawl（無料枠超過時）
- OpenAI / OpenAI 互換（gpt-5-codex 等、サブスク外）
- Stripe（テスト除く本番 API）
- Resend / Twilio / SendGrid（メール・SMS 送信）
- freee 等の SaaS で「件数課金枠」を持つ API
- LLM の他社 API（Gemini / Mistral / Cohere 等、Anthropic 以外）

## 出力フォーマット（プラン提示と同ターン）

プラン提示時に、以下の表を併記する：

```markdown
**コスト試算**

| プラン | 内容 | API call 数 | 単価 | 想定円 |
|---|---|---|---|---|
| A | <内容> | <N> | $0.XX/call | **約 ¥XX** |
| B | <内容> | <M> | $0.YY/call | **約 ¥XX** |

換算: 1 USD = 150 円 (2026 年中央値)
```

- **複数プラン併記**: ライト/スタンダード/リッチの 3 段階を default 提示
- **円換算明示**: USD は併記しても良いが、最終単位は円
- **既消費分も併記**: そのセッションで既に消費した API call があれば「消費済み」枠を分けて表示

## 既消費の確認

新規 API call 着手前、同セッション内で既に呼んだ API call があれば集計し、「ここまでの累計 ¥XX」を最初に提示する。

## 数十円/回超の事前承認

`[memory: feedback_external_api_cost_check]` ルール: **1 アクション単価が数十円/回以上**の API は、コスト表に加えて明示的に「事前承認を取りますか?」と AskUserQuestion で取る。

## 想定がつかない場合

単価情報が不明な時は「1 回空打ち → 実測 → 提示」の手順を取る。推測単価で進めない。

## 単価リファレンス（2026-05 時点・要再確認）

| サービス | 単価 | 備考 |
|---|---|---|
| twitterapi.io | $0.00015/tweet (約 0.022 円) | advanced_search / user/info / last_tweets 等 |
| Firecrawl | 無料 1,000/月、超過 0.75 円/回 | 無料枠優先 |
| OpenAI gpt-4o | $5/$15 per 1M tokens (in/out) | 円換算 0.75/2.25 円/1K tokens |
| Stripe API | 無料（取引手数料は別） | |
| Resend | 無料 3,000通/月、超過 $20/100K | |

**重要**: 単価は変動する。本表は memo 程度。実行前に必ず最新の公式料金ページか過去実測で確認。

## ペアスキル

- `cost-control.md`（全体のコスト管理思想）
- `feedback_external_api_cost_check.md`（事前承認ライン）
- `feedback_external_api_wrapper_first.md`（rate-limit/pacing wrapper 1 ファイル化）

## やらないこと

1. **コスト試算を後出しにする** → プラン提示と同ターン必須
2. **Anthropic API / Claude Code をコストに含める** → サブスク内のため明示的に除外
3. **「数百円程度です」と概算で済ます** → 表で明示
4. **想定単価が不明なまま実装に入る** → 1 回空打ち → 実測 → 提示
