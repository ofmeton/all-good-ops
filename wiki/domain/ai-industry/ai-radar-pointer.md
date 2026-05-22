---
type: entity
created: 2026-05-15
updated: 2026-05-22
sources: []
related: [[streams]]
tags: [external, ai-industry, ai-radar]
status: active
---

# ai-radar（外部スポーク・ポインタ）

> このページは **ポインタ**。実体は別リポジトリにあり、本 wiki には詳細を持ち込まない。

## 概要 (v2.1 改訂)

**目的 (旧)**: AI エコシステム機会発見 + Claude Skills 事業の防衛シグナル検知。
**目的 (新, 2026-05-22 ピボット)**:
1. ユーザー自身の **Claude 活用ネタ集め** (プロンプト・MCP・ワークフロー・新機能)
2. 3 媒体発信 (X / Instagram / note) の **発信ネタ集め**
3. **市況シグナル監視** (縮小版): vertical_surge (発信ターゲット業界) / bm_shift (収益化プラットフォーム) / r1_risk (Anthropic 公式商品化)

Next.js / Supabase / Vercel + Codex MCP worker で常時稼働。

## 実体の所在

- リポジトリ: `/Users/rikukudo/Projects/ai-radar/`
- 計画書 v2.1: `outputs/documents/ai-radar/09-pivot-plan.md`
- Phase 1 apply guide: `outputs/documents/ai-radar/10-phase1-apply-guide.md`
- 担当エージェント: `ai-radar`（横断チーム）。実装コード改修は `system-engineer`

## 新 pipeline 分類 (v2.1)

| pipeline | 内容 |
|---|---|
| `claude_tip` | Claude 活用 Tips の元ネタ (Anthropic 公式 / dev.to / Zenn / Qiita / Simon Willison 等) |
| `content_seed` | 3 媒体発信ネタ (X / Instagram / note 各 fit スコア) |
| `market_signal` | 市況シグナル 3 種 (vertical_surge / bm_shift / r1_risk) |
| `both` | claude_tip + content_seed の両方 |
| `noise` | 評価対象外 |

## ソース構成 (v2.1)

旧 25 ソース → 新 62 ソース (公式メディア重視 → コミュニティ・SNS 重視)
- Anthropic 公式 8 / Claude RSS 3 / 日本語 vertical 1 / HN+PH 3 / Reddit 13 / X 海外 24 / X 日本 10

## Codex 3 モード (v2.1 Phase 5)

ダッシュボードから記事ごとに 4 ボタン:
- **note 記事化** / **X ポスト化** / **IG カルーセル化** (content_seed_drafts mode + target_media)
- **Claude で試す** (claude_tip_recipe mode)

→ 結果は articles.codex_drafts_x / _ig / _note / codex_tip_recipe に保存

## all-good-ops との関係

- ハブ・スポーク構造のスポーク。秘書が `ai-radar` エージェントに委譲
- MCP: Supabase / Vercel (`apply_migration` / 書き込み系 SQL / `deploy_*` は人間確認必須)
- 関連 wiki: [[claude-usage|wiki/domain/claude-usage]] (Claude Tips の蓄積先)
