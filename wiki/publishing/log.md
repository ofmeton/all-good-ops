---
type: topic
created: 2026-05-20
updated: 2026-05-20
sources: []
related: [[index]]
tags: [publishing, log]
status: active
identity: ofmeton
---

# wiki/publishing/ Log

> 時系列 append-only。`grep "^## \[" log.md | tail -10` で直近 10 イベントが見える形式。

## [2026-05-20] ingest | uravation「Claude CodeでX投稿バイラル｜3ツイート構成プロンプト7選」(X)

- raw: raw/publishing/inspirations/note-20260520-uravation-claude-x-viral.md
- wiki: wiki/publishing/inspirations/note-2026-05-20-uravation-claude-x-viral.md
- 反映先: buzz-patterns.md（パターン 2.5 新設・パターン 7 観測追加）/ by-media/x.md / by-theme/hook-patterns.md
- 抽出された学び: 3 ツイート完結型は量産向き。Few-Shot 自己学習ループが 2 件で確認されパターン確度↑。note → X 圧縮ワークフロー設計の必要性を示唆

## [2026-05-20] ingest | ASC「Instagramカルーセル15枚構成プロンプト集」(Instagram)

- raw: raw/publishing/inspirations/instagram-20260520-asc-carousel-15枚構成.md
- wiki: wiki/publishing/inspirations/instagram-2026-05-20-asc-carousel-15slides.md
- 反映先: by-media/instagram.md（異論 1 件追加）/ by-theme/visual-templates.md（異論 1 件追加）
- 抽出された学び: カルーセル 15 枚説 vs 9 枚標準 → 両論併記。ALG データ揃い次第採否判断。感情的つながり + ストーリー性の設計思想は枚数非依存で採用可能

## [2026-05-20] ingest | 梶谷健人「Claude Code はエンジニア以外も全員が使うべき」(note)

- raw: raw/publishing/inspirations/note-20260520-kajiken-claudecode-everyone.md
- wiki: wiki/publishing/inspirations/note-2026-05-20-kajiken-claudecode-everyone.md
- WebFetch: https://note.com/kajiken0630/n/nc0cb92bc080f（raw が URL のみのため取得）
- 反映先: buzz-patterns.md（パターン 1 に断言型フック観測追加）/ by-media/note.md / by-theme/prompt-collection.md
- 抽出された学び: 年号 + 断言型フックが non-engineer 向けに強い。「1コマンドで○○自動化」型の解説記事は有料化候補

## [2026-05-20] ingest | チャエン「Xでバズる投稿をAIで自動生成する5ステップ」(meta/X)

- raw: raw/publishing/inspirations/meta-20260520-chaen-buzz-5steps.md
- wiki: wiki/publishing/inspirations/meta-2026-05-20-chaen-buzz-5steps.md
- 反映先: buzz-patterns.md（パターン 7 新設・異論 1 件追加）/ by-media/x.md / by-theme/hook-patterns.md（異論 1 件追加）
- 抽出された学び: Few-Shot 自己学習ループが新規パターンとして有効。【】記号フックは rubric との矛盾あり → 両論併記（月次 lint 判断）。**rubric 更新提案あり**

## [2026-05-20] ingest | スマートラウンド「非エンジニアの Claude Cowork 活用事例 3 選」(note)

- raw: raw/publishing/inspirations/note-20260520-smartround-cowork-cases.md
- wiki: wiki/publishing/inspirations/note-2026-05-20-smartround-cowork-cases.md
- 反映先: buzz-patterns.md（パターン 1 & 5 観測追加）/ by-media/note.md / by-theme/before-after.md
- 抽出された学び: Before-After は分単位の数値化が必須。業種 × ツール名の組み合わせ事例集は 500 円帯有料記事の型として有効

## [2026-05-20] phase | Phase 4 初期化

- wiki/publishing/ クラスタ作成
- spec §3（リサーチ要点）を seed として buzz-patterns / by-media / by-theme に注入
- 以降の自動 ingest は raw/publishing/inspirations/ → 本 log にエントリ追加
