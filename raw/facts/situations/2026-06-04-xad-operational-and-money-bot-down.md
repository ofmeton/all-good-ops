---
date: 2026-06-04
category: situations
source: session
---

# x-account-system 実運用入り（実投稿4件）+ money-bot 不調発覚 (2026-06-04)

## x-account-system が実運用に入った
2026-06-04 01:01〜03:18 JST に **はぐりん名義の X アカウント(@_ha…/ALL GOOD STUDIO)へ実投稿4件**が LINE 承認経由で出た（実ツイートID付き、posted_records 記録あり。スレッド形式1件含む。ユーザーは後で末尾の切れたツイートを削除）。AUTONOMOUS_PUBLISH=false のため全て人間承認を経て投稿。これにより「deploy 済(6/3)」から「実投稿が出る実運用(6/4)」へ移行。

実走で多数の本番バグを発見・修正（同日 PR #72〜#81）:
- X token 失効(5/28) → publish 経路に自動リフレッシュ実装（回転 refresh_token を oauth_tokens 永続化）。
- スレッド形式が「スレッド1本目」ラベルごと1ツイートに固まる事故 → thread は ---区切りで分割+ラベル除去し reply 連結投稿に。long/medium は分割せず1投稿。writer/分割/ラベル除去を thread-format.ts に単一契約化。
- LLM judge が tool_use 応答で項目を非決定的に欠落 → rule クラッシュ → post-job orphan。欠損項目を skip 補完で堅牢化。
- ideation の orphan-claim（全素材 claim→20件だけ処理→残り固着）で素材枯渇・昼の空スキップ → claim を batch 限定に修正。固着329件を復旧。
- DLP の money_jpy / client_name_signal 等ヒューリスティック誤検出を soft 化（確実な PII のみ hard）。
- 投稿の Markdown(*等)除去・煽り文体強化・出典グラウンディング(X6 事実チェック)・max_tokens フォーマット別化(thread/long 8192)。
- 手動起動投稿は manual-xxx slot に分離（標準スロット投稿済み管理は cron のみ反映）。
- コスト実数ダイジェスト（LINE枠/Claude実コスト/X投稿数/cost_ledger。Anthropic Admin key 投入）。
- cron 自動稼働確認（06:00 buzz が自動で129件収集 / github-trending Actions 稼働）。

## money-bot が不調
別システム **money-bot** の `dailyPublishWorkflow` が `persistPublishQueue` ステップで失敗（`publish_queue upsert failed: TypeError: fetch failed`、3リトライ後 FatalError）。エラーは同じ LINE に通知。ユーザー判断で**一旦放置**（x-account に集中）。原因は未調査（Supabase 通信失敗か設定不備の可能性）。
