---
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: [docs/superpowers/specs/2026-05-20-publishing-pivot-design.md]
related: [[../buzz-patterns]], [[../by-media/instagram]]
tags: [publishing, visual-templates, ofmeton]
status: active
---

# 視覚デザインの参考集

## デザインシステム（SSOT は `.claude/skills/visual-design-system.md`）

- フォント: Noto Sans Heavy
- 背景 3 色: 黒 #0A0A0A / 濃紺 #0B1B3A / 朱赤 #C23A2C
- アクセント: 黄色 #FFD400（ハイライト・矢印・強調のみ）
- スクショ装飾: 8px 角丸 + ドロップシャドウ

## 比率

| 用途 | 比率 |
|---|---|
| X 画像 | 1200×675 横長 or 1080×1080 正方形 |
| Instagram カルーセル | 1080×1350 縦長 |
| note 図解 | 800×450 横長 |
| note サムネ | 1280×670（note 公式推奨） |

## カルーセル 9 枚の標準構成

| 枚 | 役割 |
|---|---|
| 1 | 強フック（数字 + 業務 / Before-After 宣言） |
| 2-3 | 困りごと提示（失敗例や非効率の具体） |
| 4-7 | 解決策の段階展開（プロンプト・ステップ・図解） |
| 8 | Before-After 比較 or 結論まとめ |
| 9 | CTA（保存 / プロフ → note リンク） |

## 異論 [2026-05-20]: カルーセル枚数 — 9 枚標準 vs 15 枚説

**本ページの既存方針**: カルーセル 9 枚の標準構成（上記テーブル参照）

**ASC の主張（ingest 素材より）**:
出典: [[../inspirations/instagram-2026-05-20-asc-carousel-15slides]]
「15 枚構成」を「完全保存版」として推奨。保存率・ファン化に有効と主張。

**さらに別の説**:
neworder 記事（https://www.neworder.co.jp/2026/04/19/instagram_carousel_8ro10/ ）は「8-10 枚」が最適と主張（未 ingest）。

**現在の判断**: 9 枚で運用開始し保存率・リーチを計測。ALG データが出てから採否を判断。消さず両論を保持。

## 参考にしたい外部アカウント（ingest 候補）

- raw/publishing/inspirations/ に投げ込まれた素材を ingest 後、ここに採用テンプレを蓄積
- 参考事例の出所は `inspirations/<id>.md` への back-link で辿れるように
