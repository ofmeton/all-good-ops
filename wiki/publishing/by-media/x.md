---
type: concept
created: 2026-05-20
updated: 2026-06-13
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md, outputs/research/2026-06-13-viral-writing-and-thread-study.md]
related: [[../buzz-patterns]], [[../by-theme/hook-patterns]]
tags: [publishing, x, ofmeton]
status: active
---

# X — 拡散・認知 → note 送客

## 役割

- 拡散・認知ピボット。note への送客が主目的
- 単発投稿 + Before-After 画像 + 数値見出しの組み合わせ
- テキストのみの単発投稿はリプ用に限定（フォロワー獲得には画像必須）

## 勝ちパターン（seed: spec §3.2）

- フック 1 行目に「数字 / Before-After / 結論先出し / 【】記号 / 問いかけ」
- 画像比率 1200×675 or 1080×1080
- スレッドは 2-4 件を基本にし、最終投稿に note / 記事 / 保存 CTA。長い chain は上位 engagement の主勝ち筋ではない
- リプライ engagement 重視（48h 以内に反応に返信）

## 観測 [2026-06-13] — 6アカ競合: 単発/スレッドの使い分け

出典: [2026-06-13 viral writing and thread study](../../../outputs/research/2026-06-13-viral-writing-and-thread-study.md)

- 保存・解説系は長文単発が主流。ClaudeCode_UT は single 96%、obsidianstudio9 は single 94%、ClaudeCode_love は single 77%。`fmat=long` で1投稿に詰める。
- 2026-06-13 の full thread body sample（top-by-faves 12 roots/handle）では、上位スレッドは短い。MakeAI_CEO は multi 9/12 でも max 3、Gencoin8 は multi 5/12 で max 4。
- `format-dist.json` の広域平均では MakeAI_CEO thread 平均 6.7 parts だが、like 上位では長い chain が勝ち筋ではない。強い long single + tight 2-4 parts が優先。
- 生成時は `---` 区切り、1本目=hook、2本目=具体/手順、3本目=補足/注意、4本目=まとめ/保存/note CTA。`thread_bodies` 最大 8 本は hard cap で、目標本数ではない。

## 観測 [2026-06-13] — チャエン / X Article gap-fill

出典: [2026-06-13 viral writing and thread study](../../../outputs/research/2026-06-13-viral-writing-and-thread-study.md)

- チャエン型は `【速報】` 固定ではない。top20 では `【】` 始まりは 7/20 で、`Claude Code有能すぎる。` のような「ツール名 + 体感断定」も主力。表示上は 150-220 字前後で短く締める。
- チャエンの保存価値は `【保存版】` ラベルではなく、速報/体感投稿の中に手順・数字・使いどころを埋め込むこと。スレッドは multi 8/15 でも最大3 parts、root完結 + 補足/ソース/導線に留める。
- X Article は保存/教育/送客の資産型。9本の実例では nobel_824 が 5/9、root は 9/9 がリンクのみ、本文はタイトル/preview/章立てが本体。
- Article を使う条件は、`タイトル（保存版/最新+ツール+到達状態+全手順/N選） → preview（悩み引用+共感+先に結論） → 章立て（手順/落とし穴/チェックリスト） → CTA/参考リンク` まで作れること。薄い素材は long single に留める。

## 媒体特化の禁忌

- リンク貼って終わりの単発投稿（ALG 評価下がる）
- 引用 RT で煽る運用
- AI 表記の隠蔽（透明性 NG）

## 観測 [2026-05-20] — uravation: 3 ツイート完結型

出典: [[../inspirations/note-2026-05-20-uravation-claude-x-viral]]
- X スレッドは「3 件 1 セット」で完結させる型が量産に向く。2026-06-13 の競合 top sample でも 2-4 件が主流
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
