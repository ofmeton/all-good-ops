# money-bot Phase 1 チェックリスト

spec: [`docs/superpowers/specs/2026-05-22-money-bot-design.md`](../docs/superpowers/specs/2026-05-22-money-bot-design.md) §11 Phase 1

Phase 1 = 基盤構築 (2026-05-23 〜 2026-05-29 目安)。
本ファイルは Phase 1 のタスクを「**担当 (人間 / Claude / system-engineer)**」「**所要時間**」付きで網羅したもの。
Phase 1 着手準備 (scaffold + skeleton) は本セッション (2026-05-22) で完了済み。

凡例: 👤 人間 / 🤖 Claude (system-engineer subagent) / 📝 ドキュメント整備

---

## 0. Phase 1 着手準備 (本セッション 2026-05-22)

| # | 内容 | 担当 | 所要 | ステータス |
|---|------|------|------|------------|
| 0.1 | `money-bot/` scaffold (package.json / tsconfig / vercel.json / .env.example) | 🤖 | 30min | ✅ 完了 |
| 0.2 | workflow skeleton (`daily-publish.ts`) + Agent SDK ラッパー (`lib/agents.ts`) | 🤖 | 30min | ✅ 完了 |
| 0.3 | Supabase 初期 migration (`0001_init.sql`) | 🤖 | 20min | ✅ 完了 |
| 0.4 | README.md + 本 PHASE_1_CHECKLIST.md | 🤖 | 20min | ✅ 完了 |
| 0.5 | commit + push (3-4 個に分割) | 🤖 | 10min | ✅ 完了 |

---

## 1. 外部アカウント・サービス準備 (👤 人間タスク中心)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 1.1 | Supabase project 作成 (region: ap-northeast-1) | 👤 | 30min | 無料枠で OK。URL / anon / service_role を控える |
| 1.2 | `0001_init.sql` を Supabase に適用 | 👤 (or 🤖 with 承認) | 15min | `supabase db push` or SQL editor。MCP 経由は人間承認必須 |
| 1.3 | LINE Developers > Messaging API channel 作成 | 👤 | 30min | access token / secret を控える |
| 1.4 | LINE bot を ofmeton 個人アカウントで友だち追加 | 👤 | 5min | webhook で userId 取得用 |
| 1.5 | Meta for Developers > Instagram Graph API app 作成 | 👤 | 1-2h | Facebook ページ未作成なら先に作成、Business 認証経由 |
| 1.6 | Instagram 長期トークン (60日) 取得 | 👤 | 30min | `oauth/access_token?grant_type=fb_exchange_token` |
| 1.7 | Vercel project 作成 + GitHub repo import | 👤 | 15min | Root Directory = `money-bot/` を指定 |
| 1.8 | Vercel env に `.env.example` の全 KEY 投入 | 👤 | 30min | 各値は Web UI 直接入力 (チャット貼り付け禁止) |
| 1.9 | `git config user.email` を Vercel team authorized email と一致確認 | 👤 | 5min | feedback_vercel_git_author_authorization.md |
| 1.10 | Adobe Stock コントリビューター登録 | 👤 | 30min | Phase 1 後半 or Phase 2 で運用開始 |

**1 セクション合計: ~5-7h (spec §8.1 と一致)**

---

## 2. 依存 install + 環境構築 (🤖 主導)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 2.1 | `cd money-bot && npm install` | 🤖 | 5min | lockfile commit |
| 2.2 | WDK / Claude Agent SDK の最新 API shape を context7 で再確認 | 🤖 | 30min | 0.1.x 系を想定。breaking change ないか確認 |
| 2.3 | `package.json` のバージョン pin (caret → 固定 or 厳密 range) | 🤖 | 10min | spec §13-6 |
| 2.4 | `cp .env.example .env.local` → 値投入 | 👤 | 15min | 各値は手動入力 |
| 2.5 | `npm run typecheck` を通す (TODO 起因の型エラー解消) | 🤖 | 30min | mock を消して実 SDK 呼び出しに差し替えながら |

---

## 3. 各 API 接続実装 (🤖 主導 / 段階的に動作確認しながら)

### 3.1 Claude Agent SDK (記事生成パイプライン)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.1.1 | `lib/agents.ts` の `runAgent()` を実 SDK 呼び出しに差し替え | 🤖 | 1h | `settingSources: ['project']` で .claude/ ロード |
| 3.1.2 | CLAUDE_PROJECT_ROOT を Vercel build に含める bundling 確定 | 🤖 | 30min | vercel.json `includeFiles` or 別戦略 |
| 3.1.3 | writer → visual-designer → content-reviewer → sns-generator の chain を local で 1 cycle 通す | 🤖 | 1h | mock データで充分 |
| 3.1.4 | usage (input/output tokens) を Supabase に記録する処理を追加 | 🤖 | 30min | 月予算観測のため (spec §7 リスク観察項目) |

### 3.2 Vercel Workflow DevKit

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.2.1 | `"use workflow"` directive + `defineHook` + `DurableAgent` を実 SDK に差し替え | 🤖 | 1h | context7 で正確な shape 取得 |
| 3.2.2 | `/api/cron/daily-publish` route 実装 + CRON_SECRET 認証 | 🤖 | 30min | Vercel route handler |
| 3.2.3 | `/api/approval-hook` route 実装 (承認 hook resolver) | 🤖 | 30min | runId → approval 決定を hook に流す |
| 3.2.4 | local dev で workflow を 1 cycle 通す (approval なしの自動承認 mock で) | 🤖 | 1h | |

### 3.3 LINE Messaging API

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.3.1 | `lib/notify.ts` の `notifyApprovalReady()` を実装 | 🤖 | 30min | `@line/bot-sdk` の pushMessage |
| 3.3.2 | `/api/line-webhook` 実装 (event.source.userId を Supabase に保存) | 🤖 | 30min | bot に webhook URL 登録 |
| 3.3.3 | テスト送信: 自分の LINE に push が届くか確認 | 👤 | 5min | |

### 3.4 承認 UI

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.4.1 | 方式判断: 軽量 Web vs LIFF | 👤 + 🤖 | 15min | 着手セッション冒頭で決定 |
| 3.4.2 | `/approval-queue/[runId]` ページ実装 (ドラフト/SNS プレビュー + Y/N + edits 入力) | 🤖 | 2h | モバイル最適化必須 |
| 3.4.3 | Y/N 押下 → `/api/approval-hook` への POST → WDK hook resolve | 🤖 | 30min | |
| 3.4.4 | 承認 → publish 実行 → 結果が Supabase に書き込まれるところまで E2E | 🤖 | 30min | mock publisher で |

### 3.5 Instagram Graph API

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.5.1 | `publishInstagram()` 実装 (4-step: media upload → carousel container → publish) | 🤖 | 2h | spec §5.1 step 8 |
| 3.5.2 | Supabase Storage に slide 画像を upload する関数を追加 | 🤖 | 30min | public URL 経由で Graph API に渡すため |
| 3.5.3 | テスト投稿: 自分の Instagram に実際に carousel が公開されるか確認 | 👤 | 10min | この時点でテスト投稿を削除可 |
| 3.5.4 | 60 日トークン refresh の自動化 (cron に同居 or 別 endpoint) | 🤖 | 30min | Phase 1 末でも可 |

### 3.6 ai-radar 連携 (改修完了後)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.6.1 | ai-radar 改修完了通知を受領 | 👤 | - | `raw/facts/situations/2026-05-22-ai-radar-money-bot-integration.md` |
| 3.6.2 | 接続方式 α (direct Supabase) / β (API endpoint) を確定 | 👤 + 🤖 | 30min | spec §6.4 |
| 3.6.3 | `fetchAiRadarSignals()` を mock → 実接続に差し替え | 🤖 | 1h | |
| 3.6.4 | `ai_radar_signals_cache` への upsert を実装 | 🤖 | 30min | 24h window で de-dup |

### 3.7 KPI 記録 + Budget guard

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 3.7.1 | `recordKpi()` を実装 (publish 後に kpi_daily を upsert) | 🤖 | 30min | channel ごと |
| 3.7.2 | Anthropic / OpenAI / Vercel コストの日次集計取得 | 🤖 | 1h | Vercel AI Gateway 経由なら usage 取得しやすい |
| 3.7.3 | `checkBudgetOrAbort()` を実装 (月初〜今日のコスト SUM > MONEY_BOT_MONTHLY_BUDGET_JPY なら throw) | 🤖 | 30min | spec §7 kill switch |
| 3.7.4 | kill switch 発動テスト (MONEY_BOT_KILL_SWITCH=1 で次サイクルが冒頭 return するか) | 🤖 | 10min | |

---

## 4. 動作確認 (E2E)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 4.1 | local dev で 1 cycle (mock 全部繋ぎ) を完走 | 🤖 | 1h | |
| 4.2 | Vercel preview deploy で 1 cycle | 👤 + 🤖 | 30min | `deploy_to_vercel` は人間承認必須 |
| 4.3 | preview で実 LINE 通知 → 実 承認 UI → 実 Instagram 投稿 を 1 回通す | 👤 + 🤖 | 1h | テスト投稿は事後削除可 |
| 4.4 | cron 手動 trigger (`curl -H Auth: Bearer $CRON_SECRET`) で daily-publish が走るか | 👤 | 10min | |
| 4.5 | 観察 1 日: 翌日 JST 14:00 に cron が自動起動するか | 👤 | 1d | 1 日後の動作確認 |

---

## 5. ドキュメント整備 (📝)

| # | 内容 | 担当 | 所要 | 備考 |
|---|------|------|------|------|
| 5.1 | README.md に Phase 1 完了状況を追記 | 🤖 | 15min | |
| 5.2 | `wiki/projects/money-bot/` を新設 (運用 wiki エントリ) | 🤖 | 30min | wiki/SCHEMA.md 準拠 |
| 5.3 | `raw/facts/situations/2026-05-XX-money-bot-phase-1-complete.md` を保存 | 🤖 | 5min | Phase 1 完了の事実記録 |
| 5.4 | `memory/project_money_bot.md` を作成 | 🤖 | 15min | 体制・URL・KPI スナップショットを auto memory に |

---

## Phase 1 完了の Definition of Done

- [ ] `money-bot/` 配下に `npm install` 済みで `npm run typecheck` がエラー 0
- [ ] Supabase 4 テーブル運用稼働 (publish_queue / approvals / kpi_daily / ai_radar_signals_cache)
- [ ] Vercel preview environment で daily-publish workflow を mock で 1 cycle 完走
- [ ] LINE 通知 → 承認 UI → 実 Instagram 投稿の E2E が成功
- [ ] cron が JST 14:00 に自動起動することを 1 日観察で確認
- [ ] ai-radar 連携が本接続済み (or 改修完了待ちで mock のまま明示記録)
- [ ] budget guard + kill switch 動作確認
- [ ] 上記 5.1-5.4 のドキュメント整備完了

---

## Phase 1 で **やらない** こと (Phase 2 以降に持ち越し)

- KDP pipeline (spec §11 Phase 3)
- note メンバーシップ (spec §11 Phase 3)
- 公開 KPI ダッシュボード (`/dashboard/money-bot`)
- LIFF UI (軽量 Web で立ち上げ → 慣れたら LIFF に移行)
- A/B テスト本格運用 (Phase 2 で原資 ¥1,000/月 を回す)
- stock-batch-gen workflow (Phase 2 で Adobe Stock 運用と一緒に立ち上げ)
- RLS ポリシー設計 (公開ダッシュボード作るタイミングで)
