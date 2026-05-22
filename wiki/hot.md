---
type: meta
title: "Hot Cache"
updated: 2026-05-23
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-22 — money-bot Phase 1 セットアップ完了 (Supabase 同居 A 案 + Vercel link + 環境変数 8 個投入 + LINE channel + Instagram Graph API) + 振り返り反映 (memory 6 / improvement-log 4 / 新規スキル 3 / CLAUDE.md スキル一覧 37→40)。前段に ai-radar v2 ピボット全 Phase 完走も並走。

## Current Focus
- **money-bot Phase 1 残タスク** — SUPABASE_SERVICE_ROLE_KEY / Vercel AI Gateway / OpenAI API key / LINE_TO_USER_ID / CLAUDE_PROJECT_ROOT / Adobe Stock コントリビューター登録。次は実装本体 (system-engineer 別セッション)
- **ai-radar v2 安定運用観測** — Phase 1-8 + 7day 窓 + X 5 アカ稼働中。明朝 cron 観察
- claude-obsidian の 4 機能採用作業（別 task ブランチ）
- 発信ピボット Phase 4 進行中（X / Instagram / note の 3 媒体運用立ち上げ）
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納

## Recently Touched
- [[../docs/superpowers/specs/2026-05-22-money-bot-design]] (Plan-B 確定、Vercel WDK + Agent SDK + LINE 構成)
- [[../money-bot/]] (Supabase migration 適用済、Vercel link + 8 env 投入済)
- [[../raw/facts/situations/2026-05-22-money-bot-phase1-setup-progress]] (Phase 1 進捗の事実記録)
- [[../outputs/retrospectives/2026-05-22-2030-money-bot-phase1-setup]] (本セッション振り返り)
- [[domain/ai-industry/ai-radar-pointer]] (2026-05-22 v2.1 改訂、新目的 3 / 5 分類)
- [[../raw/ai-radar/README]] (raw export 機構、毎日 21:00 launchd 実行)
- [[../CLAUDE]] (スキル一覧 37→40、money-bot 系 3 スキル追加)

## Open Questions / Frontiers
- ai-radar 改修完了タイミング (money-bot §6.4 連携テスト着手のトリガー)
- money-bot 実装本体着手のタイミング (人間セットアップ残 3 項目完了後 / 別セッション)
- Vercel Workflow DevKit (WDK) の Hobby 無料枠で money-bot 月 900 invocations が収まるか実測
- local main の pull abort 解消 (別セッションの raw/ai-radar/ 整理待ち)
- ai-radar 1 件 30 秒問題の根本対策（pipeline.ts の extract と score を Promise.all 並列化 / Tier ごとに cron 分割）

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新（追記しない・古い項目は間引く）
