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

## [2026-05-10] ingest | spade-motion-study (motion-techniques orphan 解消)

raw/notes/2026-04-26-spade-motion-absorption.md から取り込み:
- wiki/domain/lp-hp-design/spade-motion-study.md (source) 新規作成
- 双方向 cross-link: [[motion-techniques]] ↔ [[spade-motion-study]]
- motion-techniques.md frontmatter に sources/related 追加

並行作業 (Task E):
- wiki/business/bsa/overview.md に「演出技法（モーション）」セクション追加
- L1〜L4 商品ライン別の必須/推奨/過剰技法を明示
- BSA → motion-techniques 参照経路を確立

orphan 状況:
- 旧 motion-techniques.md wikilink:0 → 現 wikilink:2 (spade-motion-study + overview)
- 4 週間検証指標の ingest 件数: 1/5

## [2026-05-10] lint | MVP 動作確認 (Task 18)

軽量 lint（orphan / 名義3ライン混在 / wikilink 整合）実行:

検出:
1. **motion-techniques.md (orphan)**: wiki 内部から `[[motion-techniques]]` 参照なし。外部 (`.claude/agents/`) からは参照あり。MVP 段階では許容、Phase 2 で BSA overview から参照追加検討
2. **overview.md:44 broken wikilink**: `[[テラ一色民泊HP]]` → `[[terra-hayama]]` に修正済み

合格:
- 名義3ライン混在なし（identity: 工藤陸 = 8 ページ全て BSA + personal + clients 配下、ofmeton = SCHEMA 例示のみ、n/a = motion-techniques のみ）
- proposals/templates.md は `[[proposals/templates]]` 形式で参照されているため non-orphan

lint script 学び: basename フィルタ正規表現に `/` プレフィクス必要（`(log)\.md$` だと `pricing-catalog.md` を誤除外）。

## [2026-05-10] ingest | TERRA HAYAMA HP 制作（パイロット ingest）

raw/deals/2026-04-terra-isshiki/ から 4 素材を取り込み:
- 01-confirmation-items.md (v0.1, 2026-05-01)
- 02-confirmation-items-v0.2.md (v0.2, 2026-05-07 — 依頼者回答反映、最新)
- 03-photo-mapping-v0.2.md
- 04-design-direction-v0.1.md

作成ページ:
- wiki/people/clients/terra-hayama.md (entity)
- wiki/business/personal/deals/2026-04-terra-isshiki.md (source)

cross-link: 双方向 [[terra-hayama]] ↔ [[2026-04-terra-isshiki]]

設計調整: SCHEMA.md「名義3ライン分離」を update。工藤陸名義は BSA 配下のみ → BSA + personal + 関連 clients。
新クラスタ: wiki/business/personal/ + wiki/people/clients/

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
