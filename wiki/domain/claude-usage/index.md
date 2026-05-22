---
type: index
created: 2026-05-22
updated: 2026-05-22
related: [[ai-radar-pointer]]
tags: [claude, ai-usage, knowledge-base]
status: active
---

# Claude 活用 wiki (v2 Phase 7)

> ai-radar が抽出した Claude 活用 Tips を蓄積するクラスタ。
> ingest 元: ai-radar `articles.codex_tip_recipe` (高スコア記事の試行レシピ)

## 構造

- `tips-by-task/` — 業務領域別 Tips (コード生成 / LP 制作 / データ分析 / コンテンツ制作 / 自動化 / リサーチ / 文章校正)
- `tips-by-feature/` — Claude 機能別 Tips (プロンプト / MCP / Skills / Subagent / Hooks / Cookbook / Codex 連携)
- `log.md` — ingest 履歴

## ingest フロー

1. ai-radar ダッシュボードで claude_tip 系記事の「Claude で試す」ボタン → Codex worker が試行レシピ生成
2. レシピが `articles.codex_tip_recipe` に保存される
3. brand-publisher のセッション開始時に「未 ingest の高スコア tip_recipe」を提示
4. ユーザー Y/N で承認 → 該当タスク / 機能カテゴリにファイル化
5. `log.md` に append

## 命名規約

`<task or feature>/YYYY-MM-DD-<slug>.md` (kebab-case)

例:
- `tips-by-task/code-generation/2026-05-22-nextjs-server-action-pattern.md`
- `tips-by-feature/mcp/2026-05-22-supabase-mcp-migration-flow.md`

## 関連

- ai-radar (外部スポーク): [[ai-radar-pointer]]
- 発信ピボット戦略: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
- 計画書 v2.1: `outputs/documents/ai-radar/09-pivot-plan.md` §7
