---
type: concept
created: 2026-06-07
updated: 2026-06-07
related: [[dev/standards]], [[dev/vercel-deploy-gotchas]], [[self/engineering-principles]], [[business/freee-invoice]]
tags: [external-api, cost, crawler, rate-limit, sdk, dev]
status: active
---

# 外部 API 運用 playbook

外部の有料 / 従量課金 / rate-limited API を新規に叩く時の運用正本。
「実装してから動かない・高すぎる・仕様が違う」を着手前に潰すための型。

> 振り返り由来の atomic な注意点を束ねた実用 playbook。詳細手順は所在（skill）を指す。

## 1. 着手前にコストを先出し（従量課金の鉄則）

外部 LLM（Claude/Gemini/OpenAI/Codex）や有料 API を伴う新機能は、**実装着手前に「1 アクション単価（円）」を提示してユーザー確認**を取る。月額試算だけでは足りない。

- 想定 input / output トークン数（1 アクション）
- 該当モデルの単価（$/1M tokens を円換算）
- **1 回あたりの想定コスト（円）**
- 想定利用頻度 × 月間想定額

ルール:
- 「1 アクション単価 ≒ (想定 input × 単価) + (想定 output × 単価)」を計画段階で算出
- **数十円/回以上**になる機能は必ず事前承認（個人事業の感覚値）
- **プラン提示と同じターンに円/回を併記**する（「コスト試算もして」と言わせたら後出し）。ライト/スタンダード/リッチの 3 段階 + 各円換算をプラン本体に折り込む → `skill:external-api-cost-disclosure`
- 想定がつかない場合は「1 回空打ちして実測 → 提示」
- **Claude Code / Anthropic API はサブスク内のため計上しない**（コスト表に並べるとノイズで判断ミスを誘発）。外部 API（twitterapi.io 等）のみ計上対象

教訓: 2026-04-23 ai-radar で Codex 深掘り機能を実装完了後「数十円/回なら使わない」と判明し 476 行がデッドコード化。

## 2. 料金は WebSearch で最新取得（memory を盲信しない）

X / OpenAI / Anthropic / Stripe / Gemini / Vercel / Supabase など料金変動が激しい API は、料金提示の前に **WebSearch / WebFetch で最新公式情報を取得**する。memory の料金は 3 ヶ月で陳腐化する前提。

- memory に料金がある場合も WebSearch で 1 度確認（X 配下は 402 固定なので発信元以外を当たる）
- memory に料金を保存する時は **取得日付を frontmatter に必ず入れる**（例: `reference_x_api_pricing_2026`）
- 月額固定でない pay-per-use 系は **単価 + 想定使用量 + 月額試算** をセットで提示
- 過去料金は legacy / grandfather 適用がよくあるので「新規受付」「既存サブスク」を区別

教訓: 2026-05-22 X API Basic を「$200/月」と提示 → 実は 2026-02 から pay-per-use 化 + Basic/Pro は新規受付停止だった。

## 3. crawler 実装前に curl で 1 サンプル確認

新規 crawler（source_type 追加）を実装する前に、対象 API の代表 URL を curl で 1 回叩いて確認する。

```bash
curl -s -A "Mozilla/5.0" "<url>" -o /tmp/test.html -w "HTTP %{http_code} / %{size_download}B / %{content_type}\n"
```

- HTTP status（200 / 401 / 429）、response size（**0B 警戒**）、content-type
- 想定要素が含まれるか: `grep -oE '<想定要素>' /tmp/test.html | head`（`__NEXT_DATA__` / RSS の `<item>` / JSON の `data[]` 等）
- 0B or 429 or 想定要素なし → 別方式（公式 API / 別エンドポイント / 別 source 自体）を検討してから実装
- memory に過去の動作可否があっても、外部 API は半年で仕様変動する前提で再確認

教訓: 2026-05-22 `twitter-syndication.ts` を memory 盲信で実装 → 本番で「HTTP 200 / size 0B」、34 ソース全部 enable=false に。

## 4. バルク呼び出しは「curl 確認 → wrapper 1 ファイル化」の 2 段準備

rate-limited API（twitterapi.io / X / OpenAI 互換 / 第三者データ API）でバルク呼び出しが必要な時、本ループ着手前に以下を 1 ファイル化してから走る。

1. **curl で 1 リクエスト動作確認**: response shape / required params / pagination 仕様（cursor or page）を実データで確認（上記 §3）
2. **pacing 内蔵 wrapper を 1 ファイル化**: pacing（default 2s/call）+ retry-on-429（指数バックオフ 15s→30s→60s→120s）+ cursor pagination を一度に書く
3. **本ループはこの wrapper を呼ぶだけにする**

ルール:
- API call 5 回以上を伴うタスクは、最初に「wrapper を 1 ファイル化」を計画に組み込む
- pacing default は 2 秒（rate-limit window 不明時の安全値。clean run 後に 1 秒以下へチューニング可）
- cursor pagination は wrapper 内で「`has_next_page == false` or cursor 空」で break するロジックを最初から
- twitterapi.io 用 wrapper は常設化済（再発明禁止） → `twitterapi-io-wrapper-script`

教訓: 2026-05-24 twitterapi.io で 22 アカウント取得時、pacing なし 0.1s 間隔で全件 429 → 2 秒 pacing + retry で書き直しの二度手間。wrapper を inline で書いて pacing が後付けになったのが原因。

## 5. 公式情報 ingestion は既存の社会 API で first try

公式情報（Anthropic 公式アナウンス / RSS / market_signal 等）を取り込みたい時、新規インフラを提案する前に、**既存の社会 API integration（twitterapi.io 等）が公式アカ追跡でカバーできないか first try**。

- 取れるなら別実装不要（twitterapi.io で @AnthropicAI / @ClaudeAI / @simonw / Anthropic Engineering 等を fetch）
- 取れない場合のみ別実装（Cloudflare Workers + Supabase 等）を、根拠を明示して提案
- 既存 ai-radar / x-buzz-radar / twitterapi.io 統合が project にある場合は特に最初に check

教訓: 2026-05-24 「Anthropic 公式 / RSS 持ちたい」に Cloudflare Workers + Supabase 新規実装を提案 → 「twitterapi.io でカバーしよう、別実装不要」と訂正。

## 6. 外部 SDK は採用前にデプロイ環境での動作を実証

spec / 設計段階で外部 SDK / ライブラリを採用する時、以下 5 項目を**実装前に必ず検証**する。

1. **ランタイム要件確認**: SDK が require する runtime（Node / Python / native binary / WASM / CLI spawn / fs アクセス）を公式 docs で確認
2. **デプロイ先制約確認**: 採用予定ホスティングの制約
   - Vercel serverless（Functions）: 50MB ZIP、no persistent fs、**no native binary spawn**、no long-running process
   - Vercel Sandbox: Firecracker microVM で binary OK だが cold start + コスト
   - Cloud Run: Linux binary OK、container ベース
3. **実 deploy テスト（最重要）**: 最小サンプル（Hello world + SDK 1 関数）を**採用予定環境にデプロイして実動作確認**。spec 確定の前に「動くこと」を実証
4. **代替パッケージ検証**: 同目的の別 SDK / 公式 SDK が同環境で動くか比較（例: Agent SDK の代わりに公式 Anthropic SDK の messages API）
5. **memory / wiki 反映**: 「この SDK は X 環境で動く/動かない」を記録

NG パターン:
- 「公式 docs に Vercel example があるから動くだろう」→ example は別パターンの可能性
- 「context7 で API shape 取れたから OK」→ API shape ≠ deploy runtime 適合性
- 「local で動くから OK」→ local の Node fs と Vercel sandbox は別物

教訓: 2026-05-23 money-bot で Claude Agent SDK を採用 → deploy 後 "Native CLI binary for linux-x64 not found"。SDK が内部で Claude CLI binary を `child_process.spawn` する設計で、Vercel serverless では動かなかった。
