---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: []
related: [[streams]]
tags: [external, ai-industry, ai-radar]
status: active
---

# ai-radar（外部スポーク・ポインタ）

> このページは **ポインタ**。実体は別リポジトリにあり、本 wiki には詳細を持ち込まない。

## 概要

AIエコシステムの機会発見 + Claude Skills 事業の防衛シグナル検知を行うダッシュボード。
Next.js / Supabase / Vercel で常時稼働。

## 実体の所在

- リポジトリ: `/Users/rikukudo/Projects/ai-radar/`
- 実装計画: `outputs/documents/ai-radar/01-implementation-plan.md`（本リポ内）
- 担当エージェント: `ai-radar`（横断チーム）。実装コード改修は `system-engineer`

## all-good-ops との関係

- ハブ・スポーク構造のスポーク。秘書が `ai-radar` エージェントに委譲し、
  ダッシュボードのヒット確認・ソース精査・深掘り依頼を任せる
- MCP: Supabase / Vercel（`apply_migration` / 書き込み系 SQL / `deploy_*` は人間確認必須）
