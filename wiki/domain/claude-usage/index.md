---
type: index
created: 2026-05-22
updated: 2026-05-27
tags: [claude, ai-usage, knowledge-base]
status: active
---

# Claude 活用 wiki

> Claude 活用 Tips を蓄積するクラスタ。
>
> **2026-05-27 改訂**: ai-radar 撤廃に伴い、自動 ingest 機能は停止。今後は手動で raw → wiki ingest する運用に縮小。

## 構造

- `tips-by-task/` — 業務領域別 Tips (コード生成 / LP 制作 / データ分析 / コンテンツ制作 / 自動化 / リサーチ / 文章校正)
- `tips-by-feature/` — Claude 機能別 Tips (プロンプト / MCP / Skills / Subagent / Hooks / Cookbook / Codex 連携)
- `log.md` — ingest 履歴

## ingest フロー（手動運用版）

1. ユーザーが raw/ai-radar/highlights/claude-tip/ または別途集めた tip 素材を共有
2. brand-publisher または秘書が該当タスク / 機能カテゴリに合致するか判断
3. ユーザー Y/N で承認 → ファイル化
4. `log.md` に append

## 命名規約

`<task or feature>/YYYY-MM-DD-<slug>.md` (kebab-case)

例:
- `tips-by-task/code-generation/2026-05-22-nextjs-server-action-pattern.md`
- `tips-by-feature/mcp/2026-05-22-supabase-mcp-migration-flow.md`

## 関連

- ~~ai-radar (外部スポーク): [[ai-radar-pointer]]~~ **(archived 2026-05-27)**
- 発信ピボット戦略: `docs/superpowers/specs/2026-05-20-publishing-pivot-design.md`
