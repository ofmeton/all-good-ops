---
type: meta
title: "Hot Cache"
updated: 2026-06-10
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-10 — **X optimizer 再アーキを1セッションで Stage1〜3 本番出荷＋Stage4 spec化**。二層アーキ（Thompson=数値knob閉ループ / LLM-optimizer=判断）。Stage1棚卸し(PR#143)/Stage2A reward配線修復=握る3本 時間帯・hook・format(PR#149)/metrics-ingest=X API v2 non_public_metrics取込(PR#150)/Stage2B 承認却下理由 approval_reason(PR#151)/**Stage3 LLM-optimizer x-optimizer-analyst MA(opus・PR#152)**=observability読み propose-only でランク付き提案を optimizer_proposal へ。本番実証5提案。worker deploy済(Version 1a42a1af・月次cron `0 16 1 * *`)。詳細 [[../memory/project_x_optimizer_redesign]]。

## Current Focus
- **optimizer Stage4（次セッション）**: 提案の実行＝自己改善ループ。spec済 `docs/superpowers/specs/2026-06-10-x-optimizer-apply-design.md`・worktree/branch `task/260610-xad-optimizer-apply` 残置。accept がゲート・実行は自動化・tier-L プロンプトは TS直編集(implementer方式CI/レビューgate)・全apply可逆・🔒コード強制。実装=4A レビューUI＋4B-1 apply-engine基盤(検証ゲート＋tier-T DB数値のみ)。4B-2(file編集+CI+deploy系)は別spec集中。writing-plans から。
- **X発信 段階1-1C（残）**: 定義編集UI→段階2承認/投稿UX→段階3。計画 `~/.claude/plans/41-magical-sketch.md`。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失 → 名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/x-account-system/lib/{optimizer,optimizer-analyst,metrics}/*` / `lib/ma/bootstrap-core.ts` / `src/{worker,queue}.ts`・`wrangler.toml`(cron)
- `apps/xad-dashboard/app/approval`・`app/api/drafts/approve`（2B）
- migrations `0022_metrics_ingest`・`0023_approval_reason`（本番適用済）
- `outputs/improvements/x-account-optimizer-redesign/01-lever-inventory.md`
- [[../outputs/retrospectives/2026-06-10-1056-optimizer-program]]

## Open Questions / Frontiers
- **🔴 taskcreate-threshold 5連続 open** — subagent-driven起動時TaskCreateの構造化トリガー既存・harness reminderも無視＝真の繰り返しミス。次回 subagent-driven起動直後に必ず TaskCreate
- **feature-factory-first 3連続 open** — CLAUDE.mdに既定=superpowers明確化済。次回どちら選んだか言語化
- 重い MA/opus は `timeoutMs` 明示（analyst 164s で既定120s timeout）
- 学習/最適化系は「燃料(実データ)が本番にあるか」を先に確認（原則2 派生）

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
