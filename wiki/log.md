# wiki Log

> append-only。各エントリは `## [YYYY-MM-DD] <event> | <title>` で始める。
> `<event>` は `ingest` | `query` | `lint` | `phase`。
> `grep "^## \[" log.md | tail -10` で直近イベントが見える。

## [2026-05-09] phase | Phase 0 開始

LLM Wiki パターン導入の土台構築開始。
Spec: `docs/superpowers/specs/2026-05-09-llm-wiki-design.md`
Plan: `docs/superpowers/plans/2026-05-09-llm-wiki-phase0-1.md`

## [2026-05-09] phase | Phase 1 開始 - pricing-catalog 移行

`knowledge/context/pricing-catalog.md` → `wiki/business/bsa/pricing-catalog.md` 移動。
14 ファイルのリンク張替え済み（残存ゼロ確認）。frontmatter 追加（type=source, identity=工藤陸）。
