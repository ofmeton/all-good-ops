---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/hook-patterns]]
tags: [publishing, x, ofmeton]
status: active
identity: ofmeton
---

# X — 拡散・認知 → note 送客

## 役割

- 拡散・認知ピボット。note への送客が主目的
- 単発投稿 + Before-After 画像 + 数値見出しの組み合わせ
- テキストのみの単発投稿はリプ用に限定（フォロワー獲得には画像必須）

## 勝ちパターン（seed: spec §3.2）

- フック 1 行目に「数字 / Before-After / 結論先出し / 【】記号 / 問いかけ」
- 画像比率 1200×675 or 1080×1080
- スレッドは 4-7 件、最終投稿に note へのリンク
- リプライ engagement 重視（48h 以内に反応に返信）

## 媒体特化の禁忌

- リンク貼って終わりの単発投稿（ALG 評価下がる）
- 引用 RT で煽る運用
- AI 表記の隠蔽（透明性 NG）

## 観測 [2026-05-20] — uravation: 3 ツイート完結型

出典: [[../inspirations/note-2026-05-20-uravation-claude-x-viral]]
- X スレッドは「3 件 1 セット」で完結させる型が量産に向く（現行の「4-7 件スレッド」との使い分けを検討）
- note 記事 1 本 → X 3 ツイート × 2-3 セットへの圧縮ワークフローが効率的
- 過去投稿の Few-Shot 化は chaen の事例と合わせて 2 件確認 → 運用開始後に実装

## 観測 [2026-05-20] — chaen: バズ構成

出典: [[../inspirations/meta-2026-05-20-chaen-buzz-5steps]]
- 140 字前後の簡潔性が高エンゲージメントの共通項
- 過去の成功投稿を Few-Shot に組み込む自己学習ループが有効（X 投稿 10 件貯まってから実装推奨）
- 「⇩」等の誘導記号の AI 感 NG 判定は未確認 — rubric 確認後に採否決定

## KPI（Phase 別）

| Phase | 期間 | フォロワー | 月インプレッション目安 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 500 | 30,000 |
| Phase 2 | 〜2026-10末 | 2,000 | 200,000 |
| Phase 3 | 〜2027-02末 | 5,000 | 500,000 |
