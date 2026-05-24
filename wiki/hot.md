---
type: meta
title: "Hot Cache"
updated: 2026-05-24
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-24 — 日本の Claude / AI 業務自動化発信者 上位10アカウント調査完走 (twitterapi.io 約¥45) + 振り返り反映 (memory 2新規/1追記 + improvement-log 2 + 新規 skill 1 + 新規 wrapper script 1 + CLAUDE.md スキル一覧 40→41)。

## Current Focus
- **発信ピボット Phase 4 進行中** — 上位10発信者ベンチマーク済、空白領域 Tier1/2/3 明文化済（REPORT.md）。次は wiki/publishing/ への ingest と コンテンツ柱への落とし込み
- **money-bot Phase 1 残タスク** — SUPABASE_SERVICE_ROLE_KEY / Vercel AI Gateway / OpenAI API key / LINE_TO_USER_ID / CLAUDE_PROJECT_ROOT / Adobe Stock 登録。実装本体は人間セットアップ完了後の別セッション
- **ai-radar v2 安定運用観測** — Phase 1-8 + 7day 窓 + X 5 アカ稼働中
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納

## Recently Touched
- [[../outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT]] (上位10発信者分析 + 空白領域 Tier1/2/3)
- [[../outputs/retrospectives/2026-05-24-1358-jp-ai-publishers-research]] (本セッション振り返り)
- [[../.claude/skills/external-api-cost-disclosure]] (新規 skill #41)
- [[../.claude/scripts/twitterapi_io]] (新規 wrapper, retry/pacing/cursor 内蔵)
- [[../raw/facts/misc/2026-05-24-twitterapi-io-key-location]] (key 所在の事実記録)
- [[../docs/superpowers/specs/2026-05-22-money-bot-design]] (Plan-B 確定済、進行は別ブランチ)
- [[../CLAUDE]] (スキル一覧 40→41)

## Open Questions / Frontiers
- wiki/publishing/ への REPORT 内容 ingest（buzz-patterns / by-media/x など）の粒度
- Instagram での AI業務自動化発信が完全空白 → ofmeton カルーセル枠の優先度判断
- 上位発信者 8 名の note アカウント有無の確認（X だけでなく note 側の競合状況）
- money-bot 実装本体着手のタイミング（人間セットアップ残 3 項目完了後）
- ai-radar 1 件 30 秒問題の根本対策

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新（追記しない・古い項目は間引く）
