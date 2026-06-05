# Deploy — Cloudflare Workers (Phase 1)

x-account-system を Cloudflare Workers に反映する手順。設計 SSOT は
`outputs/improvements/x-account-design-consolidated/main-design-all-versions.md`
(runtime = MA + Cloudflare Workers, L783 / L1098)。

> **Phase 1 の安全方針**: 「人間承認つき 1 投稿/日」。`wrangler.toml` の
> `AUTONOMOUS_PUBLISH=false` により、scheduled() は draft 生成 + LINE 承認依頼まで。
> live 投稿は LINE 承認タップ後に fetch ハンドラ経由でのみ発火する。

---

## 0. 前提

- Cloudflare Workers **Paid** プラン契約済 (HUMAN_TASKS H-4)
- `apps/x-account-system/.env.local` に全 credentials 投入済 (Phase 0.5 完了)
- Node.js v24+ / `npm install` 済

## 1. ツール導入

```bash
cd apps/x-account-system
npm install            # wrangler / @cloudflare/workers-types を含む
npx wrangler login     # ブラウザで Cloudflare 認証 (対話: ! 接頭辞 or Terminal.app 推奨)
```

## 2. Secrets 投入

`.env.local` の値を Workers Secret として投入する (vars には機密を書かない)。

```bash
# API token があれば wrangler login 不要 (headless)。先に export:
#   export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' .env.local | cut -d= -f2-)
#   export CLOUDFLARE_ACCOUNT_ID=$(grep '^CLOUDFLARE_ACCOUNT_ID=' .env.local | cut -d= -f2-)
#
# 投入リスト = worker が実際に読む process.env.* (src/lib を grep して確定。2026-06-02 実態同期)
# ※ SUPABASE_SCHEMA は必須 (=xad。無いと public 参照で本番空振り)
# ※ META/IG/TWITTERAPI は現状 worker 未使用 (IG=H-6 別途、buzz=Python 別運用) のため除外
# ※ deploy で worker 作成後に secret put する (secret は worker 単位)
for k in ANTHROPIC_API_KEY OPENAI_API_KEY \
  SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_SCHEMA \
  X_CLIENT_ID X_CLIENT_SECRET X_ACCESS_TOKEN X_REFRESH_TOKEN X_TOKEN_EXPIRES_AT X_REDIRECT_URI X_OAUTH_SCOPES \
  LINE_CHANNEL_ACCESS_TOKEN LINE_USER_ID_OFMETON; do
  v=$(grep "^$k=" .env.local | cut -d= -f2-)
  [ -n "$v" ] && printf '%s' "$v" | npx wrangler secret put "$k"
done
```

投入済 secret 一覧確認: `npx wrangler secret list`

## 3. typecheck → deploy

```bash
npm run worker:typecheck   # tsc -p src/tsconfig.json --noEmit
npm run worker:dev         # ローカル動作確認 (http://localhost:8787/health)
npm run worker:deploy      # 本番反映
```

## 4. cron 検証

`wrangler.toml [triggers]` の cron は **UTC** 指定 (JST = UTC+9)。
deploy 後、Cloudflare Dashboard → Workers → ofmeton-x-account → Triggers で
登録済み cron を確認。手動発火テスト:

```bash
# 特定 cron を即時発火 (scheduled handler の動作確認)
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+22+*+*+*"   # 朝 7:00 JST 投稿 job
```

cron → job 対応は `wrangler.toml` のコメント表 / `src/worker.ts` の `CRON_JOBS` 参照。

## 5. LINE Webhook 接続

LINE Developers Console → Messaging API → Webhook URL に
`https://ofmeton-x-account.<account>.workers.dev/line/webhook` を設定し
「Webhook の利用」を ON。承認タップ (postback) と Interviewer 応答の入口。

---

## Python ジョブは Workers 対象外 (別運用)

`scripts/fetch-github-trending.py` (H-14) と `scripts/relabel-tweets.py` は
Python のため Workers では動かない。下記いずれかで運用:

- **GitHub Actions** (推奨): `.github/workflows/` に schedule (cron) で
  `python3 apps/x-account-system/scripts/fetch-github-trending.py` を実行し、
  生成 JSON を `raw/publishing/github-trending/` に commit (immutable raw 規約準拠)。
- **mac launchd**: `~/Library/LaunchAgents/` に plist。Mac 常時起動が前提。

GitHub Trending は 07:00 JST 日次 (設計 §2.5)。GitHub Actions の cron は UTC →
`0 22 * * *` (= 07:00 JST)。

---

## 次フェーズ (Workers 互換化) TODO

`src/worker.ts` の各 job は現状 stub。lib/ を Workers 互換化して配線する:

1. **投稿系** (`post-*`): Writer (lib/writer) → Editor 6+5 (lib/editor/pipeline.ts)
   → approved を LINE 承認依頼 push。`fs` config 読み込みを KV / インライン化。
2. **buzz-ingest / inspirations-ingest**: twitterapi.io fetch → Supabase。
3. **daily-digest**: lib/dashboard/digest.ts → LINE 配信。
4. **optimizer-update**: lib/optimizer/update-loop.ts → posterior 更新 (Supabase 永続)。
5. **LINE webhook fetch**: 署名検証 → postback approve/reject → publish / 破棄。
