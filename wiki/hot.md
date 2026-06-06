---
type: meta
title: "Hot Cache"
updated: 2026-06-07
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-07 — **session-retrospective スキルを実働化 + memory 棚卸し**（PR#117/#118）。スキル改訂: ①ループを閉じる §0.5 前回フォローアップ（improvement-log を読み返し status 更新・再計測。cron停止中の唯一の消費経路）②保存関門（memory/skill は「既存追記 or 保留」がデフォルト・一般化原則は wiki へ）③観点レンズ（未活用資産/プロンプト改善/Claude機能/トークンコスパ、ヒット時のみ）。191→125行に短縮。memory 棚卸し: 236→206件（project6件索引降格・廃止案件9件削除・クラスタ21件を wiki playbook へ集約）。

## Current Focus
- **新 retro スキルの定着確認（次回）**: 「振り返って」で §0.5 が前回 improvement-log を読み返し再計測から始まるか / 保存関門で新規memoryが抑制されるか。
- **agent teams 初実走（次の実開発）**: playbook に沿って設計→承認→実装→レビュー→人間ゲートを 1 サイクル。手戻り減・トークン対効果を usage-log で評価。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で収益化委譲先が消失 → 名義境界の戦略再判断が未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `.claude/skills/session-retrospective/SKILL.md`（実働化）/ [[dev/external-api-ops]] [[dev/vercel-deploy-gotchas]] [[dev/subagent-dispatch]] [[business/freee-invoice]]（クラスタ集約・新設）
- memory MEMORY.md（索引10行除去）/ [[../outputs/retrospectives/2026-06-07-0026-retro-skill-and-memory-cleanup]]
- [[dev/standards]] / [[dev/agent-teams-playbook]]（前回 agent teams 体制）

## Open Questions / Frontiers
- retro スキル: §0.5 の再計測が機能し改善が定着するか / memory 肥大が再発しないか
- agent teams: 実走でトークン対効果が見合うか / 品質 hook を入れるタイミング
- はぐりん収益化: monetize-os 廃止後の委譲先（戦略再判断）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
