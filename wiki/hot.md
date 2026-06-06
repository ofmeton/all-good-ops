---
type: meta
title: "Hot Cache"
updated: 2026-06-06
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-06 — **agent teams 開発オーケストレーション体制を構築**（Claude Code 並列チーム機能）。1案件=1worktree=1team・最大4人（lead/architect/implementer/reviewer）。設計 SSOT [[dev/standards]] 新設（A:スタック非依存の設計規律 + B:スタック別規約[採用時のみ]、**技術スタックは案件ごと選定**）。**architect 新設**（設計専任・読み取り専用・opus・ユーザー/改善シナリオ網羅を設計ステップ化）。**system-engineer を implementer に拡張**（陳腐化参照 mcp-architect/quality-auditor 修正）。運用正本 [[dev/agent-teams-playbook]]。`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 投入済（要 v2.1.32+）。

## Current Focus
- **agent teams 初実走（次の実開発）**: playbook に沿って 1 案件で設計→承認→実装→レビュー→人間ゲートを 1 サイクル。手戻り減・トークン対効果を usage-log で評価。品質 hook（テスト緑強制 TaskCompleted）は効果を見てから追加。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先が消失 → 名義境界の戦略再判断が未着手。
- **運用ハイジーン**: hook 化で再建済（cron復活せず）。worktree-hygiene-scan / stop-hygiene-reminder。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- [[dev/standards]] / [[dev/agent-teams-playbook]] / `.claude/agents/dev-automation/architect.md`（新設）
- `.claude/agents/dev-automation/system-engineer.md`（implementer 拡張）/ `.claude/settings.json`（agent teams flag）/ spec `~/.claude/plans/ok-lazy-hellman.md`
- [[../outputs/retrospectives/2026-06-05-2147-anthropic-skill-alignment]] / PR#94(22スキルSKILL.md化)

## Open Questions / Frontiers
- agent teams: 実走でトークン対効果が見合うか / 品質 hook を入れるタイミング
- はぐりん収益化: monetize-os 廃止後の委譲先（戦略再判断）
- スキル頻度監視: revisit 時に low-freq を plugin 化するか

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
