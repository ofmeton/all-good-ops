---
date: 2026-05-28
category: situations
source: session
---
x-account-system Phase 0.5 Pre-launch の H タスク群が一括完了 (PR #43 + PR #44 MERGED)。
振り返り時に raw 保存漏れを検出した事実情報を 1 ファイルに集約。

## 取得 / 流用済 credentials

- **H-1 X OAuth**: ofmeton 本番アカで PKCE flow Step 1-3 通過。access_token + refresh_token 取得、rotation 2 回確認済。`X_CLIENT_ID` / `X_CLIENT_SECRET` 取得済
- **H-3 OpenAI**: API key 新規取得済 (sk-proj-...)
- **H-3 Anthropic**: money-bot/.env.local から流用 (同一個人運用)
- **H-4 Cloudflare**: Workers Paid プラン契約済 ($5/月)、Account ID + API token 取得済 (Permissions: Workers Scripts:Edit + Workers KV Storage:Edit + D1:Edit。handson doc の「Cloudflare Workers:Edit」は実画面に存在せず削除)
- **H-5 LINE**: money-bot 流用 (`LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`)、`LINE_USER_ID_OFMETON` も money-bot の `LINE_TO_USER_ID` (Uf12461eb...) を流用
- **H-6 Meta/IG**: `all-good-studio-publisher` app 既存流用、App Review 不要 (development mode + self-test)。`META_APP_ID` / `META_APP_SECRET` を Meta for Developers Dashboard から取得、`IG_BUSINESS_ACCOUNT_ID` (17841437446483422) と `IG_ACCESS_TOKEN` を money-bot から流用
- **H-7 twitterapi.io**: money-bot 流用

すべて `apps/x-account-system/.env.local` 投入済 (gitignore 済、main repo + worktree (削除済) 両方)。

## 既存 note 有料 draft 保留方針

- 対象: `outputs/improvements/x-account-design-consolidated/content-drafts/note-paid-1-draft.md` (民泊清掃 ¥980 / target 2026-07-31)
- 判断: 非公開戻し + LINE Interviewer 本番起動後にインタビュー素材で書き直し
- 理由: AI sub-agent が wiki/memory から組み立てたもの、ofmeton 本人の生の声・失敗談の温度感が無い

## H-4 推奨方針の不採用

- handson §4.4 推奨は mac launchd 代替 (¥0)
- 採用: Cloudflare Workers Paid ($5/月) — mac sleep 中も動作する利便性優先

## money-bot/.env.local 改行抜け bug 修正

- 旧: `INSTAGRAM_BUSINESS_ACCOUNT_ID=17841437446483422LINE_TO_USER_ID=Uf12461eb...` (1 行連結)
- 新: 2 行に分離 (Edit 適用済)
- ただし IG account ID は別途記録された LINE_TO_USER_ID 行 (line 37) で正常値が運用に使われており、実害は INSTAGRAM_BUSINESS_ACCOUNT_ID の値破損だけだった

## H-10 brownout 同意

- budget-calculator 3 シナリオ: low ¥7,041 / expected ¥8,994 / p95 ¥13,648
- p95 が brownout 閾値 ¥11,500 越え (¥10,000 月予算 + 15%)
- 判断: 現状維持 (投稿停止 + 翌月持ち越し)。Phase 1 month-2 実測後に閾値再判断
- record: data/usage-log.jsonl 末尾追加済

## Phase 0.5 H タスク gate 残り

- ofmeton.com ドメイン取得 (Phase 1 では必須でない判断、Phase 2 中盤までで OK)
- LINE 友達追加 URL 取得 (manager.line.biz)
- note メンバーシップ公開判定 (ストック 2-3 本溜まったタイミング)
- X Step 4 non_public_metrics (本番投稿後の検証)
