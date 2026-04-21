# ai-radar 実装計画（第3回 実行計画会議 成果物）

**作成日**: 2026-04-21
**目的**: AIエコシステム内の新規需要発見（機会発見）＋ Skills/ワークフロー販売事業の防衛（事業防衛）を両立する、常時稼働型ダッシュボードの構築
**関連ドキュメント**:
- `./02-setup-guide.md` — ユーザー作業のセットアップ手順
- `./03-prompts.md` — LLMプロンプトテンプレート
- `./04-sources.md` — 初期25ソース詳細
- `./05-schema.sql` — Supabase DDL完全版
- `./06-agent-draft.md` — `ai-radar` エージェント定義ドラフト
- `../dashboard-requirements-skills-marketplace.md` — 事業防衛要件書（統合元）

---

## 1. 決定事項サマリ

| 項目 | 決定内容 |
|---|---|
| **プロジェクト名** | `ai-radar` |
| **配置** | `/Users/rikukudo/Projects/ai-radar/`（all-good-ops とは別リポジトリ） |
| **スタック** | Next.js 15 (App Router) / TypeScript / Tailwind / shadcn/ui / Supabase (Postgres) / Vercel |
| **LLM** | Gemini 2.5 Flash API (Google Search grounding) + Claude Haiku 4.5 API + Codex CLI (ローカル手動) |
| **認証** | なし（URL knowing） |
| **パイプライン** | 2本立て: ①機会発見 ②事業防衛（共通インフラ） |
| **スコア** | 機会度スコア 0-100 + 事業影響スコア 0-100（記事ごとに両方算出） |
| **クロール頻度** | Tier1ソース: 毎時 / その他: 朝7:00 & 夜19:00 |
| **通知** | Tier1即時Gmail / 朝8:00夜20:00 ダイジェスト / 日曜8:00 週次 / 毎月1日10:00 月次 |
| **深掘り** | ダッシュボード→キュー→ローカルCodex worker (launchd常駐) → 結果を Supabase 保存 |
| **Phase 2以降** | X/Twitter、中国語ソース、monetize-os連携（当面は見送り） |

---

## 2. アーキテクチャ

```
[ Vercel Cron ]
     ├─ tier1-hourly    (毎時) ──┐
     ├─ biannual        (7,19)  ─┤
     ├─ daily-digest    (8,20)  ─┼─> [ Vercel Route Handlers ]
     ├─ weekly          (日曜8) ─┤       │
     └─ monthly         (1日10) ─┘       │
                                         ├─ RSS取得 / GitHub Releases / docs差分
                                         ├─ Gemini 2.5 Flash で要約＋タグ＋日本類似サービス検索
                                         ├─ Haiku 4.5 でスコア計算（機会度 & 事業影響）
                                         └─ Supabase (Postgres) に保存
                                                │
                      ┌─────────────────────────┼───────────────────────────┐
                      ▼                         ▼                           ▼
            [ Next.js Dashboard ]      [ Gmail API 送信 ]          [ JSONL Export ]
            (Vercel, noauth)           (即時/定時/週次/月次)       (all-good-ops/data/)
                      │
                      ▼
            [ 「Codexに深掘り依頼」]
                      │
                      ▼
            [ deep_dive_queue table ]
                      │
                      ▼
            [ ローカル Mac ] ← launchd + codex-worker.ts
                      │
                      ▼
                 Codex CLI 実行
                      │
                      ▼
                 結果Markdownを Supabase に書き戻し
```

---

## 3. ディレクトリ構成

```
/Users/rikukudo/Projects/ai-radar/
├── .env.local                          # APIキー類（.gitignore）
├── .env.example                        # 環境変数テンプレ
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vercel.json                         # Cron 設定
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # ダッシュボードトップ（タブUI）
│   │   ├── article/[id]/page.tsx       # 記事詳細＋深掘り依頼ボタン
│   │   ├── globals.css
│   │   └── api/
│   │       ├── cron/
│   │       │   ├── tier1-hourly/route.ts
│   │       │   ├── biannual/route.ts
│   │       │   ├── daily-digest/route.ts
│   │       │   ├── weekly/route.ts
│   │       │   └── monthly/route.ts
│   │       ├── deep-dive/route.ts       # 深掘り依頼受付
│   │       └── articles/route.ts        # クライアント取得API
│   │
│   ├── components/
│   │   ├── Tier1Banner.tsx              # トップの赤帯アラート
│   │   ├── TabSwitcher.tsx
│   │   ├── ArticleCard.tsx              # 記事カード（スコア表示）
│   │   ├── ScoreBadge.tsx
│   │   ├── MidIndicatorRow.tsx          # PC版で中間指標横並び
│   │   └── DeepDiveButton.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts                  # Supabase クライアント
│   │   ├── gemini.ts                    # Gemini API wrapper (grounding)
│   │   ├── anthropic.ts                 # Claude API wrapper
│   │   ├── gmail.ts                     # Gmail送信
│   │   ├── rss-parser.ts
│   │   ├── github-releases.ts
│   │   ├── docs-scraper.ts              # code.claude.com/docs 差分
│   │   ├── crawler.ts                   # オーケストレーション
│   │   ├── pipeline-opportunity.ts      # 機会発見パイプライン
│   │   ├── pipeline-business.ts         # 事業防衛パイプライン
│   │   ├── scoring.ts                   # スコア計算
│   │   ├── digest-builder.ts            # ダイジェスト生成
│   │   ├── sources.ts                   # 情報源定義（静的）
│   │   └── prompts/                     # 03-prompts.md と同期
│   │       ├── summarize.ts
│   │       ├── classify-tag.ts
│   │       ├── opportunity-score.ts
│   │       ├── business-impact.ts
│   │       └── similar-services.ts
│   │
│   └── types/
│       ├── article.ts
│       ├── source.ts
│       └── score.ts
│
├── scripts/
│   ├── backfill.ts                      # 初回バックフィル（直近48hを埋める）
│   ├── export-jsonl.ts                  # all-good-ops/data/ai-radar-events.jsonl 出力
│   ├── test-pipeline.ts                 # パイプライン単体テスト
│   └── codex-worker.ts                  # ローカル常駐
│
├── launchd/
│   └── jp.ofmeton.ai-radar-codex.plist  # macOS launchd 設定
│
└── supabase/
    ├── migrations/
    │   └── 0001_init.sql                # 05-schema.sql と同内容
    └── seed.sql                         # 初期25ソース投入
```

---

## 4. 実装スケジュール（Day 1〜 Day 5）

### Day 1: インフラ構築（所要 4-6h）
- [ ] `/Users/rikukudo/Projects/ai-radar/` ディレクトリ作成
- [ ] Next.js 15 プロジェクト初期化 (TypeScript / Tailwind / shadcn/ui)
- [ ] GitHub リポジトリ作成＆初期コミット
- [ ] Supabase プロジェクト作成＆`0001_init.sql` 実行
- [ ] `.env.local` / `.env.example` 作成
- [ ] Vercel プロジェクト接続
- [ ] `src/lib/supabase.ts` 実装（クライアント初期化）
- [ ] 動作確認（Vercel 初回デプロイ）

### Day 2: クローラー & 機会発見パイプライン（所要 5-7h）
- [ ] `src/lib/rss-parser.ts` 実装（`rss-parser` npm使用）
- [ ] `src/lib/github-releases.ts` 実装（octokit使用）
- [ ] `src/lib/docs-scraper.ts` 実装（fetch + cheerio）
- [ ] `src/lib/gemini.ts` 実装（Google Search grounding有効化）
- [ ] `src/lib/anthropic.ts` 実装
- [ ] `src/lib/prompts/*.ts` 実装（03-prompts.md 転記）
- [ ] `src/lib/pipeline-opportunity.ts` 実装
- [ ] `src/lib/scoring.ts`（機会度スコア計算）
- [ ] `src/app/api/cron/biannual/route.ts` 実装
- [ ] ローカル手動実行テスト（`scripts/test-pipeline.ts`）

### Day 3: 事業防衛パイプライン & ダッシュボードUI（所要 5-7h）
- [ ] `src/lib/pipeline-business.ts` 実装（Tier判定 + トリガー検知）
- [ ] `src/lib/scoring.ts` に事業影響スコア追加
- [ ] `src/app/api/cron/tier1-hourly/route.ts` 実装（Tier1ソースのみ）
- [ ] `src/app/page.tsx` 実装（タブUI: 機会発見/事業影響/全記事）
- [ ] `src/components/Tier1Banner.tsx` / `ArticleCard.tsx` / `ScoreBadge.tsx`
- [ ] `src/components/MidIndicatorRow.tsx`（PC版で中間指標表示）
- [ ] Vercel デプロイ＆スマホ確認

### Day 4: 通知系（所要 4-5h）
- [ ] `src/lib/gmail.ts` 実装（OAuth2トークン管理含む）
- [ ] `src/lib/digest-builder.ts` 実装（5種テンプレート生成）
- [ ] `src/app/api/cron/daily-digest/route.ts`（朝8時・夜20時）
- [ ] `src/app/api/cron/weekly/route.ts`（日曜朝8時）
- [ ] `src/app/api/cron/monthly/route.ts`（毎月1日10時）
- [ ] Tier1即時通知を `pipeline-business.ts` に組み込み（検知直後にGmail送信）
- [ ] `vercel.json` のCron設定完了
- [ ] 受信テスト

### Day 5: Codex深掘り連携 & 運用ツール（所要 4-5h）
- [ ] `src/app/api/deep-dive/route.ts`（キュー投入）
- [ ] `src/components/DeepDiveButton.tsx`
- [ ] `scripts/codex-worker.ts` 実装（5分間隔でキュー確認 → Codex CLI実行 → 結果書き戻し）
- [ ] `launchd/jp.ofmeton.ai-radar-codex.plist` 設定＆`launchctl load`
- [ ] `scripts/backfill.ts` 実装＆直近48hバックフィル
- [ ] `scripts/export-jsonl.ts` 実装
- [ ] all-good-ops 側に `ai-radar` エージェント定義追加（承認後）
- [ ] all-good-ops `CLAUDE.md` ルーティングテーブル更新（承認後）
- [ ] 初期25ソースの精査・見直しサイクル組み込み
- [ ] ドキュメント（README.md）完成

---

## 5. 運用レビュー機会（劣化防止）

| タイミング | 内容 | 担当 |
|---|---|---|
| **毎週日曜朝 週次サマリー** | 今週の検知結果サマリ＋意思決定フラグ確認 | ai-radar エージェント |
| **毎月1日 月次レポート** | ソース別シグナル密度・スコア分布・プロンプト精度／ソース入替判断 | ai-radar エージェント |
| **3ヶ月ごと** | パイプライン構造レビュー（LLMコスパ・データ量・機能追加） | 秘書＋ai-radar＋ユーザー（熟議） |
| **年次** | 事業戦略との整合性総点検 | 秘書＋ユーザー（熟議） |

月次レポートで自動提案するもの:
- ヒット率が低いソース → 削除候補
- 新規追加候補ソース（他記事で言及頻度が高い外部URL）
- スコア重みの調整提案（分布が偏っている場合）

---

## 6. 想定月次コスト

| 項目 | 単価 | 月想定 |
|---|---|---|
| Gemini 2.5 Flash API（要約＋日本類似検索） | $0.075/1M入力 | **月300-500円** |
| Claude Haiku 4.5 API（スコアリング） | $1/1M入力 | **月500-1000円** |
| Supabase（Free tier） | $0 | 0円 |
| Vercel（Hobby） | $0 | 0円 |
| GitHub（Free） | $0 | 0円 |
| Gmail API | $0 | 0円 |
| **合計（ChatGPT Plus除く）** | | **月800-1500円** |
| ChatGPT Plus（既存契約・Codex） | $20 | 3000円 |

---

## 7. リスクと対処

| リスク | 対処 |
|---|---|
| Vercel Hobby の Cron 実行時間制限（60秒） | 重い処理は分割。Supabase Edge Functionに寄せる or Vercel Pro 検討 |
| Gemini Search grounding のコスト急騰 | 毎月1日のコストチェック、超過時は Haiku単独 fallback |
| RSS配信中断・スクレイピング壊れ | ヘルスチェック `/api/health` 追加、週次メールに ソース健全性 列を追加 |
| Tier1スクレイピング失敗（Anthropic側構造変更）でR1検知漏れ | 二段構え: RSSとスクレイピング両方、どちらかで拾えれば通知。かつ月1で手動確認 |
| Codex worker がローカル停止 | launchd で自動再起動、1時間キュー滞留で秘書へエスカレーション通知 |
| Gmail送信クォータ超過（1日500通） | 余裕大きいので当面問題なし。将来SNS通知追加時に再検討 |

---

## 8. 承認が必要なポイント（人間確認）

このまま実装着手するために、以下3点のユーザー承認が必要:

1. **`.claude/agents/ai-radar.md` の新設** — エージェント定義ドラフトは `./06-agent-draft.md`
2. **`CLAUDE.md` ルーティングテーブルへの ai-radar 追加** — 担当キーワード: AI動向、AI業界、機会発見、ビジネスチャンス（AI限定）、Anthropic動向、Skills事業防衛、競合動向（AI）など
3. **新規ディレクトリ `/Users/rikukudo/Projects/ai-radar/` の作成とコード着手** — GitHubリポジトリ名は `ai-radar`

承認後、即 Day 1 に着手。
