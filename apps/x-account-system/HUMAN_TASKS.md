# Human Tasks — Phase 0 Week 0 → Phase 1 着手まで

> Claude が実装した部分以外で、**ofmeton (人間) 本人が実施する必要があるタスク**。  
> このリストを全て ✅ にすれば Phase 1 (人間承認つき 1 投稿/日) を開始できる。  
> v10.2 §8 Phase 0 Week 0 着手前リスト + Codex CR-1〜CR-5 + 外部サービス契約 を統合。

---

## H-1. X Developer Console (OAuth 2.0 PKCE) — CR-4

- [ ] https://developer.x.com/ にログイン (有料 X Premium Basic アカウントで)
- [ ] Project + App を作成 (App type: **Web App, Automated App or Bot**)
- [ ] User authentication settings:
  - [ ] OAuth 2.0 を ON
  - [ ] App permissions: **Read and write**
  - [ ] Type of App: Confidential client (推奨) または Public client (PKCE のみ)
  - [ ] Callback URI: `http://localhost:3000/oauth/x/callback` (テスト) + 本番 URL
  - [ ] Scopes: `tweet.read tweet.write users.read offline.access` ← **offline.access 必須**
- [ ] **Client ID** + **Client Secret** を取得
- [ ] `.env.local` の `X_CLIENT_ID` / `X_CLIENT_SECRET` にセット
- [ ] `lib/oauth/oauth-test-checklist.md` の Step 1-5 を完走 (`lib/oauth/pkce-test.ts` 実行)

## H-2. Supabase project 作成 + migration apply — CR-2

- [ ] https://supabase.com/ で project 作成 (Free tier、project 名 `ofmeton-x-account`)
  - ⚠️ Free tier は同時 2 project まで。既存 project を確認すること (現在 cdqtypyasyhwbpuibhtb = 民泊清掃 が 1 つ使用中)
- [ ] Settings → Database で `pgvector` extension を Enable
- [ ] Settings → API で `URL` / `anon_key` / `service_role_key` を取得
- [ ] `.env.local` に `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` をセット
- [ ] SQL Editor で migration を順次 apply:
  - [ ] `migrations/0001_materials_store.sql`
  - [ ] `migrations/0002_posts_performance.sql`
  - [ ] `migrations/0003_rls_policies.sql`
  - [ ] `migrations/0004_style_guide_optimizer.sql`
- [ ] Settings → Database → Roles で `human_admin` / `writer_agent` / `editor_agent` / `publisher_agent` の password を設定

## H-3. Anthropic API key + OpenAI API key

- [ ] Anthropic Console (https://console.anthropic.com/) で API key 取得
  - [ ] `.env.local` の `ANTHROPIC_API_KEY` にセット
  - [ ] (任意) ZDR (Zero Data Retention) 契約の必要性を再評価 (v10.2 §10.7.4)。Phase 1 では顧客素材を投入しない方針なので **ZDR 未契約で開始可**
- [ ] OpenAI Platform (https://platform.openai.com/) で API key 取得
  - [ ] `.env.local` の `OPENAI_API_KEY` にセット
  - [ ] `gpt-image-2` が利用可能か確認 (利用不可なら `OPENAI_IMAGE_MODEL=gpt-image-1` に fallback)
- [ ] **両 key を月予算 ¥10,000 内に収める使用上限を Console で設定** (Anthropic は monthly limit、OpenAI は usage limit)

## H-4. Cloudflare Workers Paid プラン契約

- [ ] https://dash.cloudflare.com/ で Workers Paid プラン契約 ($5/月)
- [ ] Account ID + API Token (D1 / KV / Cron 操作権限つき) を取得
- [ ] `.env.local` の `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` にセット
- [ ] (Phase 1 着手時) `wrangler.toml` を作成し、cron schedule を設定

## H-5. LINE Messaging API + 個人 user ID

- [ ] LINE Developers Console (https://developers.line.biz/) でチャネル作成 (公式アカウント "ofmeton 業務通知" 等)
- [ ] Channel access token + secret を取得
- [ ] `.env.local` の `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` にセット
- [ ] ofmeton 個人 LINE で公式アカウントを友だち追加 → user ID を Webhook で取得
- [ ] `.env.local` の `LINE_USER_ID_OFMETON` にセット
- [ ] (任意) LINE Form Builder で「note 更新通知」「業務通知」の topic を分けて作成

## H-6. Meta (Instagram Graph API) — Phase 1 開始時

- [ ] Instagram Business アカウントを作成 (既存 IG 個人 → Business 切替 or 新設)
- [ ] FB ページを作成して IG と連携
- [ ] Meta App (https://developers.facebook.com/) で App 作成
- [ ] App Review で `instagram_content_publish` + `instagram_basic` permission 申請
- [ ] App ID / App Secret / IG Business Account ID / 60-day access token を取得
- [ ] `.env.local` にセット
- [ ] **Phase 1 IG launch は X launch とは独立**: H-1 完了後でも IG App Review 承認まで IG 投稿は停止

## H-7. twitterapi.io API key (海外バズ + 公式追跡用)

- [ ] money-bot/.env.local に既に `TWITTERAPI_IO_KEY` が存在 (cs:p3-4107) → コピー
- [ ] `.env.local` の `TWITTERAPI_IO_KEY` にセット
- [ ] (Phase 1 着手時) cron で海外 17 アカ + 国内業種別 7 アカ × 週次取得 を有効化

## H-8. CR-1: Owned channel fallback 準備

`config/fallback_channels.yaml` で定義した 3 つの所有導線を準備。

### note メール購読 (target: 50 件)

- [ ] note プロフィールに Form Builder を有効化
- [ ] X bio / note プロフィールに購読リンク追加
- [ ] Phase 1 month-1 中に 50 件購読獲得 (現状 0、達成判定は別途)

### 所有ドメイン

- [ ] **ofmeton.com** を取得 (Cloudflare Registrar 推奨、年 ¥1,500 前後)
- [ ] (Phase 1 後半) Vercel に Astro static blog をデプロイ
- [ ] X bio / Linktree に追加

### 同意済み LINE 連絡先 (target: 30 件)

- [ ] LINE 公式アカウント友達追加 URL を bio に追加
- [ ] 公開許諾 gate (Supabase `materials_store.publication_consent`) で `granted` 取得時、同意済み連絡先として記録
- [ ] Phase 1 month-1 中に 30 件確保

## H-9. 顧客同意取得フロー (v10.3 改訂、許諾済前提全投入)

v10.3 §10.7 で「**本人事業 4 種 + 案件 client 全て許諾済前提**」に方針変更。  
ofmeton が既に各 client に許諾を取得済の前提で、追加の同意取得作業は不要。  
監査用に下記を **任意で** 記録:

- [ ] 案件 client (terra-isshiki / minpaku-cleaning 等) との許諾取得経路を `materials_store.consent_obtained_from` に記録 ('LINE' / 'email' / 'in_person' / 'na' 等)
- [ ] 取得日時を `consent_obtained_at` に記録
- [ ] **投稿文に固有名詞 (氏名 / 社名 / 案件名) は出さない** = Editor +5 DLP redaction で機械的に担保 (人間負担ゼロ)

新規 client が増えた時のみ、許諾の有無を ofmeton 本人が判断して `publication_consent='granted'` or `'denied'` を materials INSERT 時に明示。

## H-10. 月予算 ¥10,000 設定 + brownout 同意

- [ ] `lib/cost/budget-calculator.ts` を実行して expected / p95 シナリオを確認
- [ ] `.env.local` の `BUDGET_MONTHLY_LIMIT_JPY=10000` / `BUDGET_BROWNOUT_THRESHOLD_JPY=11500` 確認
- [ ] brownout 発動時の挙動を理解・同意 (投稿停止 / 計測継続 / Daily Digest 継続、§3.3.4)

## H-11. ハードウェア / 環境

- [ ] Node.js v24+ がインストール済 (`node -v`)
- [ ] Python 3.10+ がインストール済 (`python3 --version`)
- [ ] `npm install` を `apps/x-account-system/` で実行
- [ ] ローカル動作確認: `npm run budget` で予算試算が動く

## H-12. note 販売 compliance (v10.3 §10.8、Phase 1 初回有料公開前)

- [ ] note プロフィール or 自社サイトに **特商法表記** ページを用意
  - 提供内容 / 価格 / 解約・返品 / 連絡方法 / 個別相談の提供条件 / 問い合わせ対応時間
- [ ] 返金方針を明文化
- [ ] note の **ML 学習データ提供設定** を確認 (ofmeton は default OFF を推奨)
- [ ] 初回有料 note 公開前に上記 3 項目 ✅

## H-13. 業法ガード 初動運用 (v10.3 §10.9、業種フォーカス開始時)

- [ ] §1.2 月別業種フォーカス開始時 (2026-07 = 経理 / 業務効率化横断) は **業法独占キーワード hit ゼロ** を Editor +5 で確認
- [ ] 2026-11 以降 (税理士 / 社労士 / 行政書士 / 司法書士 / 弁護士) は high risk 投稿 1 件ずつ承認 (まとめ NG)
- [ ] `lib/dlp/business-law.ts` の検査ロジックを `npm run dlp:lint` で動作確認

## H-14. GitHub Trending 日次 cron 登録 (Style Guide v1.2 / v1.3 §2.5)

- [ ] cron 実行基盤を選定 (推奨: Cloudflare Workers Scheduled Event / GitHub Actions / mac launchd)
- [ ] `apps/x-account-system/scripts/fetch-github-trending.py` を 07:00 JST で日次実行に登録
- [ ] 永続化先 `raw/publishing/github-trending/YYYY-MM-DD.json` の git ingest workflow を確認 (immutable raw 規約準拠)
- [ ] 初回手動実行で生成 JSON の中身を目視確認
- [ ] 1 週間運用後に各言語別 hit 件数を Optimizer に投入し inspect

## H-15. Phase 0 v4 発動判定 (review-cycle-1 後追い)

Phase 0 v3 で seed hit 70% を達成。残 30% (海外英語圏 6 アカ + 国内 1 アカ) は Phase 0 v4 で対応。発動条件:

- [ ] Phase 1 Month 1 末で素材不足 (failure_story 月 4 / industry_sop 月 6 が物理的に出せない) を Optimizer が判定
- [ ] ofmeton 本人が「もう少しサンプル増やしたい」と希望
- [ ] 上記いずれかが trigger された時点で Claude に「Phase 0 v4 着手して」と依頼

Phase 0 v4 想定コスト: ¥40 (海外英語圏 query 再設計 6 アカ × 100 tweets) + 必要なら Sonnet 4.6 再分析 ¥80。

---

## 完了判定

H-1 〜 H-5 + H-8 + H-10 が全て ✅ になった時点で **Phase 1 X launch 可能**。  
H-6 + H-7 + H-9 + H-11 + H-12 + H-13 + H-14 は Phase 1 着手中に順次。  
※ H-12 は note 有料公開を始める前 (Phase 1 month-1 末) までに完了必須。  
※ H-15 は trigger ベース (素材不足判定時のみ着手)。

不明点 / 引っかかった項目があれば、Claude に「[H-N] の手順詳しく」と聞いて補完してください。
