---
type: meta
title: "Hot Cache"
updated: 2026-06-05
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-05 — **Anthropic 公式 BP リサーチ → 反映**。横断ツール系**22スキルを `<name>/SKILL.md` 化**(PR#94)し自動検出/自動invoke 可に（flat .md は frontmatter があっても非検出が根本原因）。CLAUDE.md 誘導簡素化(164行維持)・陳腐化パス参照を全体修正・`claude-md-health-check` に公式チェックリスト item8・[[self/engineering-principles]] 原則6 追記。**pre-commit ガード復旧**（削除済 worktree への dangling symlink を自リポ tracked スクリプトへ再 install）。**plugin化(目的=token節約)は先送り＋監視**（~2026-07-05 revisit、[[project-skill-plugin-token-deferral]]）。**monetize-os / ai-radar 廃止**を反映（CLAUDE.md 外部スポーク除去・はぐりん委譲先保留）。

## Current Focus
- **スキル体系**: 22 SKILL.md 常時 on。使用頻度を一定期間監視し、低頻度を off 既定 plugin に逃がして起動メタ分(~1.3k tok/session)を回収する（revisit ~2026-07-05、頻度は `~/.claude/projects/**/*.jsonl` から集計）。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先が消失 → 名義境界の戦略再判断が未着手。
- **運用ハイジーン残課題**: cron 安全網の再建（cron復活 or hook化）は未着手。cron 系統は INACTIVE で棚卸し済。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- [[../outputs/retrospectives/2026-06-05-2147-anthropic-skill-alignment]] / PR#94(22スキルSKILL.md化)
- `.claude/skills/<22個>/SKILL.md` / `CLAUDE.md`(スポーク除去) / [[self/engineering-principles]](原則6)
- memory 新規 [[feedback_bash_bulk_replace_one_file_first]] / [[feedback_git_mv_update_references]] / [[project-skill-plugin-token-deferral]]
- `raw/facts/situations/2026-06-05-monetize-os-airadar-discontinued.md`
- [[../outputs/retrospectives/2026-06-05-2009-cron-inventory-cleanup]] / PR#95(前スレッド)

## Open Questions / Frontiers
- はぐりん収益化: monetize-os 廃止後の委譲先・運用をどうするか（戦略再判断）
- スキル頻度監視: revisit 時に low-freq を plugin 化するか、常時 on のままにするか
- 運用ハイジーン: cron復活 vs hook化で安全網を再建するか

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
