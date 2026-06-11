---
type: meta
title: "Hot Cache"
updated: 2026-06-11
---

# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-11 — **X optimizer 自己改善ループ 全段完成・本番稼働**。Stage4(4A レビューUI + 4B-1 apply-engine tier-T・PR#153)＋Stage4-B2(apply-code runner＝nested `claude -p` で config/prompt を自動コード適用・PR#154)。両方とも**本番フル実証 ALL PASS**（4B-1=tier-T apply→rollback／4B-2=throwaway dedupWindowDays14→15 apply PR#160→rollback PR#161 で正味ゼロ）。初回実走が安全弁となり4実バグ摘出・修正(PR#155空diff/#156 acceptEdits=bypass securityレビュー対応/#159 secret unset)。詳細 [[../memory/project_x_optimizer_redesign]]。

## Current Focus
- **optimizer 運用フェーズへ**: 人間は dashboard `/proposals` で accept → tier-T は worker(optimizer-apply job)、config/prompt は `npm run apply-code`(skill `x-optimizer-apply-code`)が agent にコードを書かせ gate→merge→deploy。可逆(`--rollback`)。
- **apply-code runner hardening（次回 apply-code 運用時）**: `mergePr --delete-branch`(merged remote branch残る) / 実行時 PATH 明示 / Docker sandbox(acceptEdits の worktree外 Write 残存リスク)。
- **X発信 段階1-1C（残）**: 定義編集UI→段階2承認/投稿UX→段階3。
- **🔴 はぐりん persona 運用**: monetize-os 廃止で委譲先消失 → 名義境界の戦略再判断 未着手。
- **🔴 ミナト広告設定（再開待ち）**: chrome-devtools MCP 接続待ち。[[project-minato-ad-settings]]

## Recently Touched
- `apps/x-account-system/lib/optimizer-apply/*`(4B-1) / `lib/optimizer-apply-code/*`+`scripts/optimizer-apply-code.ts`(4B-2) / `src/{worker,queue}.ts` / `lib/safety/brownout-handler.ts`
- `apps/xad-dashboard/app/proposals`・`app/api/proposals/decide`・`lib/proposals-queries.ts`（4A）
- migration `0024_proposal_decision`（RPC set_proposal_decision・本番適用済）
- `.claude/skills/x-optimizer-apply-code/SKILL.md`
- [[../outputs/retrospectives/2026-06-11-1300-optimizer-apply-stage4]]

## Open Questions / Frontiers
- nested `claude -p` 起動は permission-mode acceptEdits + secret unset + PATH明示（memory [[headless-claude-subprocess]] / wiki 原則7）
- 外部CLI(claude/gh/wrangler)を含む経路は dry-run と別に単発 smoke を先に
- `taskcreate-threshold` は retire（6連続open・ワークフロー不適合）。harness reminder 任せ
- 重い MA/opus は `timeoutMs` 明示／学習系は本番に燃料(実データ)があるか先に確認

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
