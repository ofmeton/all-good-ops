---
name: defuddle-usage
description: "URL→ingest フローで HTML を読みやすい markdown に剥がす CLI ツール defuddle の運用ガイド。広告・装飾を除去し LLM token を 40-60% 削減する。URL を ingest・取り込みする時の第一選択として使う（失敗時 WebFetch fallback）。"
---

# defuddle 運用ガイド

## 用途

URL → ingest のフローで、HTML を読みやすい markdown に剥がすための CLI ツール。広告・ナビ・装飾を除去し、LLM token を 40-60% 削減する（claude-obsidian 計測値）。

## 位置付け

- **第一選択（URL ingest 時）**: `defuddle <url>` が通れば自動採用
- **fallback**: defuddle 未インストール時は WebFetch（既存挙動を維持）
- **無料 OSS**: 課金なし。Firecrawl の「無料枠のみ・第二選択」原則と独立

## インストール

```bash
# 推奨: npm global
npm i -g defuddle-cli

# 確認
which defuddle && defuddle --version
```

別経路（npm が使えない時）:
- GitHub releases から binary を `~/.local/bin/defuddle` に配置
- Homebrew tap が公開されたらそちら

CLI 名が `defuddle` でなく別名（e.g. `defuddle-cli`）になっている場合は alias を貼る:

```bash
# ~/.zshenv or ~/.zshrc
alias defuddle="defuddle-cli"
```

## 使用フロー

ingest 対象が URL の時、`publishing-wiki-ingest.md` や標準 ingest プロトコルから呼び出される:

```bash
# 1. 存在確認
which defuddle 2>/dev/null

# 2a. ある: 清書版を raw に保存
defuddle <url> > raw/articles/<slug>-$(date +%Y-%m-%d).md

# 2b. ない: WebFetch fallback（既存挙動）
```

raw 側に frontmatter ヘッダを追記:

```markdown
---
source_url: <url>
fetched: YYYY-MM-DD
cleaned_by: defuddle
---

<defuddle 出力本文>
```

## 落とし穴

- **動的 SPA**: defuddle は静的 HTML 前提。JS で render される SPA はうまく取れない → Playwright MCP / Firecrawl にフォールバック
- **長文の noise**: defuddle 後でも footer に大量の関連リンクが残ることがある → ingest 時に手動で末尾を切る
- **URL リダイレクト**: 一部 URL で末尾 slash 違いの redirect が原因で fetch 失敗 → URL を末尾 slash 揃えてリトライ

## 制限と運用

- 1 URL = 1 ファイル原則（複数 URL を 1 raw にまとめない）
- raw 保存先は素材種別ごとに分ける:
  - 記事: `raw/articles/`
  - バズ投稿: `raw/publishing/inspirations/`
  - 案件素材: `raw/deals/`
- `cleaned_by: defuddle` を frontmatter に明記（後で品質差分を見たい時の手がかり）

## 参照

- `wiki/SCHEMA.md` §ingest プロトコル §URL ingest の defuddle 前処理
- `.claude/skills/publishing-wiki-ingest.md` （URL ingest の組込み箇所）
- claude-obsidian 部分採用 spec: `docs/superpowers/specs/2026-05-22-llm-wiki-claude-obsidian-adoption-design.md` §1.4
