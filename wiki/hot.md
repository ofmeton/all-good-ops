---
type: meta
title: "Hot Cache"
updated: 2026-05-23
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。LLM はセッション開始時に最優先でこれを読む。詳細仕様: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-05-23 — x-buzz-radar (海外 X バズ収集 + 3 媒体発信ネタ化) の spec v7 + T1-T20 一気通貫実装完了 (task/260523-x-buzz-radar、未 push)

## Current Focus
- x-buzz-radar 人間タスク待ち (Supabase 新規 project / twitterapi.io / IG Business / LINE Notify) → 詳細 `[[../raw/facts/situations/2026-05-23-x-buzz-radar-impl-complete]]`
- ai-radar X 取得部の物理削除は dogfooding 後 (migration 0008 起草済 / ai-radar 側 task/260523-prepare-x-removal、apply 保留)
- 発信ピボット Phase 4 進行中 (X / Instagram / note の 3 媒体運用立ち上げ)
- terra-isshiki / minpaku-cleaning 個人案件は 2026-06 末完納に向けて稼働

## Recently Touched
- [[../docs/superpowers/specs/2026-05-23-x-buzz-radar-design]] (v7 確定、commit 8034dec)
- [[../docs/superpowers/plans/2026-05-23-x-buzz-radar]] (22 tasks, commit aacb88b)
- [[../x-buzz-radar/README]] (新規実装、43 files / 7811 insertions, commit 83df5df)
- [[../outputs/retrospectives/2026-05-23-2300-x-buzz-radar-design-impl]] (本振り返り)
- [[SCHEMA]] (2026-05-22 claude-obsidian 採用機能追記予定、未着手のまま)
- [[../CLAUDE]] (体制刷新 2026-05-20 ピボット反映済)

## Open Questions / Frontiers
- ofmeton Instagram が Business / Creator アカウントか未確認 → x-buzz-radar Sprint 着手前に確認必須
- ai-radar 0008 migration の apply タイミング (x-buzz-radar dogfooding 1-2 週後)
- defuddle CLI のインストール経路 (npm global / homebrew / 個別 binary) 未確定 (前回 hot.md から継続)
- claude-obsidian 4 機能採用 (hot.md / Query Modes / manifest / defuddle) は別ブランチで保留

## Conventions
- ファイルサイズ目安: 500 words 以内
- 文体: declarative present tense (「やる」「やった」明示)
- 更新タイミング: ingest 完了後 / 大きな query 合成完了後 / 戦略変更 commit 後 / セッション振り返り完了時
- 全置換更新 (追記しない・古い項目は間引く)
