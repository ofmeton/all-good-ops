# money-bot

24時間自律エージェントで月1万円稼ぐ — **Plan-B (半自律・規約遵守・人間関与月30-60分)** 実装本体。

- 親 spec: [`docs/superpowers/specs/2026-05-22-money-bot-design.md`](../docs/superpowers/specs/2026-05-22-money-bot-design.md)
- 規約調査: [`outputs/research/2026-05-22-platform-policy-research.md`](../outputs/research/2026-05-22-platform-policy-research.md)
- ステータス: **Phase 1 Claude 担当部分 実装完了 (2026-05-23)**。本番稼働には人間タスク（Supabase / LINE / Meta / Vercel link / env 投入）が必須
- ブランチ: `task/260523-money-bot-phase1`

## このディレクトリの位置づけ

`money-bot/` は all-good-ops worktree のサブディレクトリ。
- 既存の `.claude/agents/` `.claude/skills/` `wiki/` `raw/` を **そのまま filesystem 経由で再利用** する設計 (Claude Agent SDK の `settingSources: ['project']`)。
- 実装本体は Vercel project として独立 link する想定。Vercel project の Root Directory = `money-bot/`。

## 構成

```
money-bot/
├── package.json                       # next 16 / WDK 4.2 / claude-agent-sdk 0.3 / LINE 11 / Supabase / zod 4
├── tsconfig.json                      # strict, noUncheckedIndexedAccess
├── next.config.ts                     # outputFileTracingRoot で親 .claude/ を bundle
├── vercel.json                        # crons + functions maxDuration
├── .env.example                       # 必要 env 一覧
├── README.md                          # ← このファイル
├── PHASE_1_CHECKLIST.md               # Phase 1 タスク網羅チェックリスト
├── app/                               # Next.js App Router
│   ├── layout.tsx / globals.css       # 共通レイアウト
│   ├── page.tsx                       # ランディング
│   ├── api/
│   │   ├── cron/daily-publish/route.ts   # cron entry (CRON_SECRET 認証 + start workflow)
│   │   ├── approval-hook/route.ts        # 承認 hook resolver
│   │   └── line-webhook/route.ts         # LINE webhook 受け口 (userId capture)
│   └── approval-queue/[runId]/
│       ├── page.tsx                   # server: publish_queue 読み込み + プレビュー
│       └── approval-form.tsx          # client: Y/N + edits 入力
├── workflows/
│   └── daily-publish.ts               # WDK durable workflow ("use workflow" + defineHook + 5 step chain)
├── lib/
│   ├── agents.ts                      # Claude Agent SDK query() ラッパー + zod schema 安全パース
│   ├── ai-radar.ts                    # ai-radar 連携 (direct supabase α / API β) + mock fallback
│   ├── budget.ts                      # recordKpi / checkBudgetOrAbort / KillSwitch
│   ├── notify.ts                      # LINE messagingApi.MessagingApiClient + Resend fallback
│   ├── publishers.ts                  # publishInstagram (Graph API 4-step) + note/X は publish_queue 保存
│   └── supabase.ts                    # createClient + service_role キャッシュ
└── supabase/
    └── migrations/
        └── 0001_init.sql              # publish_queue / approvals / kpi_daily / ai_radar_signals_cache
```

## Phase 1 Claude 担当部分 — 完了状況 (2026-05-23)

| カテゴリ | 担当 | ステータス |
|---|---|---|
| Section 2 依存 install + 環境構築 | 🤖 | ✅ 完了 (`npm install` + lockfile commit + `npx tsc --noEmit` 0 error + `next build` success) |
| Section 3.1 Claude Agent SDK | 🤖 | ✅ `lib/agents.ts` で `query()` + `settingSources: ['project']` + zod schema 出力パース実装 |
| Section 3.2 WDK | 🤖 | ✅ `workflows/daily-publish.ts` で `"use workflow"` + `defineHook` + `start()` 実装 |
| Section 3.3.1-2 LINE Messaging API | 🤖 | ✅ `lib/notify.ts` (messagingApi.MessagingApiClient) + `app/api/line-webhook/route.ts` (signature 検証 + userId capture) |
| Section 3.4.2-4 承認 UI | 🤖 | ✅ `app/approval-queue/[runId]/page.tsx` + `approval-form.tsx` (軽量 Web 方式) + `/api/approval-hook` で `approvalHook.resume()` |
| Section 3.5.1-2 Instagram Graph API | 🤖 | ✅ `lib/publishers.ts::publishInstagram()` で 4-step (slide upload → carousel container → publish → permalink) |
| Section 3.5.4 60日トークン refresh | ⏳ | 未着手 (Phase 1 末で着手予定) |
| Section 3.6 ai-radar 連携 | 🤖 | ✅ `lib/ai-radar.ts` で α (direct supabase) + β (API endpoint) 両対応。env 未設定なら mock |
| Section 3.7 KPI + budget guard | 🤖 | ✅ `lib/budget.ts` (recordKpi / checkBudgetOrAbort / KillSwitchError / BudgetExceededError) |
| Section 4 動作確認 | ⏳ | E2E は env 投入後に実施 (人間タスク) |
| Section 5 ドキュメント整備 | 🤖 | ✅ README / wiki / memory / raw/facts 更新済み |

**残る人間タスク (Section 1):**
1. Supabase project 作成 + `0001_init.sql` 適用
2. LINE Messaging API channel 作成 + bot 友だち追加 + userId 控え
3. Meta for Developers > Instagram Graph API app + 60日トークン取得
4. Vercel project link (Root Directory = `money-bot/`) + env 投入
5. `git config user.email` を Vercel team authorized email と一致確認
6. Adobe Stock コントリビューター登録 (Phase 2 で運用)

env 投入後は `npm run dev` で local 動作確認 → preview deploy → cron 観察 1日 へ進む。

## Phase 1 セットアップ手順 (人間が実施)

**spec §8.1: 1日集中 / 合計 5-7h を想定。**

### 0. 前提

- macOS / Linux
- Node.js ≥ 20.0 (`node -v` で確認)
- 各種アカウント:
  - Anthropic (API key)
  - Supabase (無料枠でよい)
  - Vercel (Hobby plan で OK、cron 1日1回制約を遵守)
  - Meta for Developers (Facebook + Instagram プロアカウント連携済み)
  - LINE Developers (Messaging API channel)
  - Adobe Stock コントリビューター (Phase 1 末で登録、Phase 2 から運用)

### 1. リポジトリ確認 (5分)

```bash
cd /Users/rikukudo/Projects/private-agents/all-good-ops-money-bot
git status          # task/260522-money-bot-design / clean
git branch --show-current
ls money-bot/
```

### 2. Supabase project 作成 (30分)

1. https://supabase.com → New project
   - region: `ap-northeast-1` (Tokyo) 推奨
   - 無料枠で OK
2. Project Settings → API から `URL` / `anon` / `service_role` を控える
3. `0001_init.sql` を適用:
   ```bash
   # 方法 A (推奨): supabase CLI
   cd money-bot
   supabase login
   supabase link --project-ref <ref>
   supabase db push   # migrations/ を見て適用

   # 方法 B: SQL editor で `supabase/migrations/0001_init.sql` を貼って実行
   ```
4. 4 テーブル (`publish_queue` / `approvals` / `kpi_daily` / `ai_radar_signals_cache`) が作成されていることを Table editor で目視確認

### 3. LINE Messaging API bot 作成 + 承認 UI (1-2h)

1. https://developers.line.biz → Provider 作成 (なければ) → Messaging API channel 作成
2. channel access token (long-lived) / channel secret を控える
3. bot を自分の LINE で友だち追加し、適当にメッセージを送る
4. Phase 1 着手セッションで `/api/line-webhook` を仮実装 → webhook URL を bot に登録 → `event.source.userId` をログから控える
5. **承認 UI の方式判断**:
   - **方式 a) 軽量 Web** (推奨): `/approval-queue/[runId]` を Next.js page で実装。LINE 通知の中の URL からブラウザ起動。OAuth 設定不要で速い
   - **方式 b) LIFF**: LINE トーク内で開ける。OAuth 設定が必要だが体験は滑らか。最初は a で立ち上げ、運用慣れた後に b を検討するのが無難
   - **Phase 1 着手セッションで a / b を確定** すること

### 4. Instagram Graph API 認証 (2-3h)

1. Instagram プロアカウントを Facebook ページに連携 (ofmeton ブランドの Facebook ページが未作成なら先に作成)
2. Meta for Developers > app 作成 (type: Business) → Instagram Graph API 製品を追加
3. アクセストークン取得フロー:
   - Graph API Explorer で短期トークン取得
   - `oauth/access_token?grant_type=fb_exchange_token` で **60日有効の長期トークン** に交換
   - 控えた長期トークンを `INSTAGRAM_GRAPH_API_TOKEN` に投入
4. **トークン自動 refresh** は Phase 1 後半 or Phase 2 で実装 (TODO comment 入り)
5. `INSTAGRAM_BUSINESS_ACCOUNT_ID` を `/me/accounts` レスポンスから取得

### 5. Vercel project 作成・link (30分)

1. https://vercel.com → New Project → import GitHub repo (worktree ではなく親 repo を選び、Root Directory を `money-bot/` に指定)
2. `vercel env add` または Web UI で `.env.example` の全 KEY を `production` / `preview` / `development` 各環境に投入
   - **Secret は configure ウィザード or Web UI 直接入力**。ローカル `.env.local` の値を貼り付ける時はクリップボード履歴に注意
3. `vercel link` をローカルから (money-bot/ 配下で実行):
   ```bash
   cd money-bot
   vercel link
   # ↑ プロンプトは全て no スタンスでよい (env pull で .env.local を壊さない方針 — feedback_vercel_cli_env_pull_pitfall.md)
   ```
4. **git author email 認可確認** (feedback_vercel_git_author_authorization.md):
   ```bash
   git config user.email  # Vercel 側に登録されたメールと一致確認
   ```

### 6. ローカル動作確認 (1h)

1. `cd money-bot && npm install`
2. `cp .env.example .env.local` し、各値を埋める (上記 1-5 で取得済み)
3. `npm run typecheck` で型エラーがないこと確認 (TODO コメント箇所で型エラーが出るのは想定内 — Phase 1 実装時に解消)
4. ai-radar 連携接続テスト:
   - ai-radar 改修完了通知が来たら接続方式 (α direct / β API) を確定
   - `AI_RADAR_*` env を埋めて `fetchAiRadarSignals()` を mock → 実装に差し替え

### 7. cron 設定確認 (30分)

1. `vercel.json` の `crons[].path` が `/api/cron/daily-publish`、`schedule` が `0 5 * * *` (UTC = JST 14:00) になっていることを確認
2. **Hobby plan は cron 1日1回までの制約** に違反していないか (feedback_vercel_hobby_cron_constraint.md)
3. `CRON_SECRET` を発行して env に投入 (Authorization header で検証)
4. dry-run: `curl -H "Authorization: Bearer $CRON_SECRET" https://<deploy-url>/api/cron/daily-publish` で 200 が返るか

### 8. Adobe Stock コントリビューター登録 (30分・後回し可)

1. https://contributor.stock.adobe.com → 登録
2. 「Generative AI コンテンツ」のチェックを入れる (PIXTA と違って Adobe Stock は AI 生成 OK)
3. アップロードフローは Phase 2 で `stock-batch-gen` workflow から運用

## Phase 1 着手 (別セッションで実装する項目)

`PHASE_1_CHECKLIST.md` の 「Claude が実装する項目」を参照。要点:

1. `npm install` 実行 + lockfile 確定 (バージョン pin)
2. WDK / Claude Agent SDK の最新 API shape を context7 で再確認 → `daily-publish.ts` / `lib/agents.ts` の TODO を解消
3. `/api/cron/daily-publish` `/api/approval-hook` `/api/line-webhook` の Vercel function を実装
4. `/approval-queue/[runId]` の承認 UI 実装 (方式 a / b を確定後)
5. mock 関数 (`publishNote` / `postX` / `publishInstagram` / `recordKpi`) を実 API 接続に差し替え
6. ai-radar 連携 (改修完了後)
7. budget guard 実装 (kpi_daily.cost SUM × 月初比較)
8. dry-run end-to-end (mock 段階で 1 cycle 通す)

## 制約・禁止事項 (CLAUDE.md 準拠)

- 既存 `.claude/agents/` `.claude/skills/` `wiki/` `raw/` を **破壊しない** (この money-bot/ 配下に閉じ込める)
- 本番 Supabase への INSERT/UPDATE/DELETE/DROP は **人間確認必須** (Supabase MCP の write 系)
- Vercel 本番 deploy は **人間確認必須** (`deploy_to_vercel` MCP)
- 外部送信 (LINE / Email) は実 API 着手前にユーザーへ「これから送信します」確認を一度挟む
- `.env.local` の値は **チャットに貼らない**。configure ウィザードや Vercel UI 直接入力

## 既知の判断ポイント (後で見直すべき箇所)

1. **WDK / Agent SDK バージョン pin**: `package.json` は目安バージョン。Phase 1 着手時に context7 で最新 stable を確認し、`package-lock.json` に固定 (spec §13-6)
2. **承認 UI 方式 (LIFF vs 軽量 Web)**: 着手セッション冒頭で確定
3. **note 半自動 publish の手段**: ブラウザ自動化グレー or 「Supabase に下書き保存 → 人間がコピペ」の二択
4. **ai-radar 連携方式 (α direct vs β API)**: ai-radar 改修完了通知後に確定
5. **CLAUDE_PROJECT_ROOT の bundling 戦略**: Vercel build に `.claude/` を含めるかをどう実現するか (vercel.json の `includeFiles` か、Agent SDK の filesystem read fallback)

## 関連メモリ

- `memory/feedback_external_api_cost_check.md` — 外部 API は実装前に 1 アクション単価を提示
- `memory/feedback_image_approval_gate.md` — 画像生成は承認ゲート default
- `memory/feedback_vercel_hobby_cron_constraint.md` — cron 1日1回まで
- `memory/feedback_vercel_cli_env_pull_pitfall.md` — `.env.local` 上書き事故予防
- `memory/feedback_vercel_git_author_authorization.md` — Vercel team は authorized email でないと silent ERROR
