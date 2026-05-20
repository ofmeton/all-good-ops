---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/prompt-collection]]
tags: [publishing, note, ofmeton]
status: active
identity: ofmeton
---

# note — 収益化・深掘り → 上位事業へのリード

## 役割

- 収益化ピボット。深掘り記事で読者を「上位事業（AI 自動化代行）」のリードに育てる
- 無料記事 3-5 本 + 有料記事 1 本/月（500-980 円）
- 画像リッチ度: 1 スクロール（≈600px）あたり最低 1 枚

## 勝ちパターン（seed: spec §3.1）

- SCQA + 失敗談先行型構造（「困りごと → 失敗 → 疑問 → 解決策」が冒頭 500 字以内）
- プロンプト集型（コピペ即使える）
- 業務 × ツール名の組み合わせタイトル
- 序盤無料 → 終盤有料（「なるほど」→「これで動ける」の境目で線引き）

## 媒体特化の禁忌

- AI っぽい定型表現（「〜について解説します」「重要なポイントは 3 つあります」等は content-quality-rubric で機械検出）
- 画像なし長文（テキストオンリーは読了率激落ち）
- 専門用語の濫用（LLM / RAG / Embedding 等は注釈付きで）

## 収益化モデル

詳細は `.claude/skills/note-revenue-playbook.md`。

## KPI（Phase 別）

| Phase | 期間 | 月売上 | 有料記事本数累積 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 3万円 | 3 |
| Phase 2 | 〜2026-10末 | 5万円 | 6 |
| Phase 3 | 〜2027-02末 | 10万円相当 | 10+ |
