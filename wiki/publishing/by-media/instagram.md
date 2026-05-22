---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-theme/visual-templates]]
tags: [publishing, instagram, ofmeton]
status: active
---

# Instagram — ブランド構築・保存型認知 → note + プロフ送客

## 役割

- ブランド構築・保存型認知ピボット
- カルーセル 9 枚 / リール補助
- プロフィール → note への送客動線（リンクツリー or 直リンク）

## 勝ちパターン（seed: spec §3.3）

- カルーセル 1 枚目に「数字 + 業務名」の強フック
- 全枚に視覚要素必須（テキストオンリー枚 NG）
- 9 枚目に CTA（「保存」「プロフ → note」）
- 背景 3 色 + 黄色アクセント + Noto Sans Heavy のデザインシステム遵守

## 媒体特化の禁忌

- カルーセル枚数 5 枚以下（保存率落ちる）
- フォントの混在（Noto Sans Heavy 固定）
- アクセント色の濫用（黄色 #FFD400 はハイライトのみ）

## カルーセル比率

- 1080 × 1350px（縦長）
- 文字サイズ最小: タイトル 96px / 本文 56px（スマホ視認性）

## 観測 [2026-05-20]

出典: [[../inspirations/instagram-2026-05-20-asc-carousel-15slides]]
「熱狂的ファン」設計では感情的つながり + ストーリー性が重要。9 枚 or 15 枚に関わらずこの設計思想は採用可能。

## 異論 [2026-05-20]: カルーセル枚数 — 9 枚 vs 15 枚

**自分の設計標準（既存方針）**: カルーセル 9 枚（spec §3.3、by-theme/visual-templates.md の「カルーセル 9 枚の標準構成」参照）

**ASC 側の主張（ingest 素材より）**:
「15 枚構成」を「完全保存版」として推奨。Dragon Ash 事例で「熱狂的ファン」生成に有効と主張。

**参考情報（raw ファイルに記載）**:
neworder 記事（https://www.neworder.co.jp/2026/04/19/instagram_carousel_8ro10/ ）は「8-10 枚」が最適と主張。

**現在の判断**: 9 枚で運用開始・計測し、保存率・リーチデータが揃い次第再判断。両論を保持。月次 lint でユーザーが採否判断。

## KPI（Phase 別）

| Phase | 期間 | フォロワー | 月リーチ目安 |
|---|---|---|---|
| Phase 1 | 〜2026-07末 | 300 | 5,000 |
| Phase 2 | 〜2026-10末 | 1,000 | 30,000 |
| Phase 3 | 〜2027-02末 | 3,000 | 100,000 |
