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

## [2026-05-09] phase | BSA wiki 新規 3 ページ作成

- business/bsa/overview.md (topic 型)
- business/bsa/proposals/templates.md (concept 型)
- business/bsa/lessons-proposal-patterns.md (topic 型)
overview から pricing-catalog/proven-track-record/lessons へ cross-link。

## [2026-05-09] phase | motion-techniques 移行

`knowledge/context/motion-techniques-catalog.md` → `wiki/domain/lp-hp-design/motion-techniques.md` 移動。
4 ファイル（conversion-designer, design-director, system-engineer, rapid-hp-operator）のリンク更新。
frontmatter 追加（type=concept, identity=n/a）。

## [2026-05-09] phase | proven-track-record 移行

`knowledge/context/proven-track-record.md` → `wiki/business/bsa/proven-track-record.md` 移動。
- prompt-builder.ts の readFileSync パス更新（実行時に新パスを参照）
- rapid-hp-operator.md のリンク更新
- frontmatter 追加（type=source, identity=工藤陸）
- パス解決動作確認済み（node -e existsSync=true）
