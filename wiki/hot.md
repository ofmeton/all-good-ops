---
type: meta
title: "Hot Cache"
updated: 2026-06-09
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-09 — **feature-factory（ソフトウェア工場）体制を実装・本番反映**（PR#147 merged）。X記事「7人のAI社員」を落とし込み、欠落していた上流・検証3役割を専任エージェント新設: **story-writer**（受け入れ基準つきストーリー定義・Read only）/ **test-verifier**（受け入れテスト実走・スタック依存）/ **spec-validator**（仕様照合・ギャップ深刻度分類・修正しない）。`skill:feature-factory` が「調査→story→⏸CP①→architect設計→⏸CP②→system-engineer実装→test-verifier→spec-validator→⏸CP③PR」を逐次連鎖（並列teamと別レイヤー）。**人間CP①ストーリー承認を新規追加**。記事8人フル再現せず欠落観点のみ補完・並列team最大4は維持。dispatch ライブロード確認済。詳細: [[../memory/project_agent_teams_orchestration]]。

## Current Focus
- **feature-factory 実走検証（残）**: 小さい実機能を1本 feature-factory に流し、CP①②③・差し戻し・受け入れテストが回るか実案件で実証（PR#147 チェックリスト）。
- **X発信 段階1-1B**: 実行履歴トラッキング UI。`xad.run_trace`＋相関キーで過去1実行の各工程を `apps/xad-dashboard` runs/[id] に展開。その後 1C 定義編集 UI → 段階2 承認/投稿 UX → 段階3。計画書 `~/.claude/plans/41-magical-sketch.md`。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先消失 → 名義境界の戦略再判断が未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `.claude/agents/dev-automation/{story-writer,test-verifier,spec-validator}.md`（新規）/ `.claude/skills/feature-factory/SKILL.md`（新規）/ `wiki/dev/{agent-teams-playbook,standards}.md` / `CLAUDE.md` 起動マップ
- `docs/superpowers/specs|plans/2026-06-09-feature-factory*`
- memory `project_agent_teams_orchestration`（feature-factory 追記）
- [[../outputs/retrospectives/2026-06-09-1700-feature-factory]]

## Open Questions / Frontiers
- feature-factory の検証段は spec-validator 主＋複雑case のみ pr-review-toolkit 追加。この線引きが実走で妥当か
- **taskcreate-threshold が2回連続で未定着** — 着手前の閾値判定トリガーが「自分の気づき」頼み。hook/skill 側で発火させる手を入れるか（次回判断）
- squash merge×worktree の `--delete-branch` 罠 — 今回 verified（付けず手動remove成功）。3回目を出さないか継続監視

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
