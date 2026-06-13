---
name: large-pptx-generation
description: "50p 以上の大型 PPTX を python-pptx + Part 別ビルド + PDF 結合で制作する標準フロー。「100ページのパワポ作って」「資料 200p 書いて」等、50p以上が想定される PPTX 制作依頼時に使う（50p未満は presentation-reviewer 直行）。"
---

# 大型PPTX生成（Large PPTX Generation）

## 概要

50p以上の PPTX をユーザー要件で制作する時に起動。python-pptx + 共通ライブラリ + Part 別ビルド + PDF 結合の標準フローを規定する。

- **誰が**: system-engineer（メイン）/ writer（原稿）/ researcher（ファクト）
- **いつ**: 50p以上のPPTX制作依頼があった時。50p未満は presentation-reviewer 直行で十分
- **何のために**: 245p のような大型 PPTX をテキスト overflow / レイアウト崩れを最小化して効率制作する

## トリガー

- 「100ページのパワポ作って」「資料 200p 書いて」「PPTX 大量にスライド」
- 50p以上が想定される時

## 前提条件

- python-pptx インストール済 (`python3 -c "import pptx"` で確認)
- LibreOffice (soffice) インストール済 (PDF変換用)
- pdftoppm (poppler) インストール済 (PNG変換用)
- 作業ディレクトリ: `outputs/documents/<topic-slug>/`

## ファイル構造（標準）

```
outputs/documents/<topic-slug>/
├── deck.pptx                    # 最終結合版
├── deck.pdf                     # 最終PDF
├── deck_partN.pptx              # Part別ビルド成果物
├── SPEC.md                      # 設計書
├── draft/
│   └── part-NN.md               # Part 別原稿
├── scripts/
│   ├── _deck_lib.py             # 共通ライブラリ (Part 2 抽出後)
│   ├── build_partN.py           # Part 別ビルドスクリプト
│   └── merge_decks.py           # 結合スクリプト
└── preview/
    └── pN-NN.png                # Part別 PNG プレビュー
```

## 標準フロー（6ステップ）

### Step 1 — 設計（SPEC.md）

ブレストで以下を確定:
- 目的・対象読者・期間
- 章構成 (Part数 + 各 Part のページ数)
- スタイル方針 (カラー / フォント / 密度 / 図解方針)
- 配置場所
- 情報源ポリシー

### Step 2 — Part 1 でパイロット（10p前後）

- 全テンプレ（表紙 / TL;DR / 比較表 / 3カラム / 棒グラフ / グリッド / フロー / 目次）を1Partで網羅
- ユーザーにスタイル承認を取る
- ここで承認されないスタイルは Part 2-N で繰り返し問題になる

### Step 3 — 共通ライブラリ抽出（Part 2 で実施）

`scripts/_deck_lib.py` に以下を集約:

```python
# 必須エクスポート
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

# Color tokens
NAVY, ORANGE, LIGHT, ACCENT_BG, WHITE, TEXT, ...

# Helpers
new_presentation()      # 16:9 widescreen
blank(prs)              # add blank slide
add_rect(slide, l, t, w, h, *, fill, line, radius)
add_text(slide, text, l, t, w, h, *, size, bold, color, align, anchor, font, line_spacing)
add_runs(slide, runs, l, t, w, h, ...)  # 複数 run 1 paragraph
page_frame(slide, prs, title, subtitle, pagenum)  # 共通ヘッダー
footer(slide, prs, text, page)
part_divider(prs, num, title, subtitle, summary, chapters)  # Part ディバイダー

# 推奨追加ヘルパー（経験則から）
add_big_stat(slide, l, t, w, h, value, label, *, value_size=42)  # 大型数字
add_hub_spoke(slide, hub_text, spokes, ...)  # Hub & Spoke 図
add_timeline(slide, events, ...)              # 横タイムライン
add_text_block(slide, l, t, w, h, text, *, size=10, line_spacing=1.4)  # 縦長テキスト
```

**関数シグネチャは ライブラリ冒頭にコメントで明示する**。`add_text` に `italic=` `y=` 等の存在しない kwargs を推測で渡すとビルドエラーになる。

### Step 4 — Part 別ビルド & プレビュー

Part 単位で:
1. `build_partN.py` 実行 → `deck_partN.pptx` 生成
2. `soffice --headless --convert-to pdf --outdir preview deck_partN.pptx`
3. `pdftoppm -png -r 100 preview/deck_partN.pdf preview/pN`
4. `Read tool` で PNG 目視 → 崩れ修正 → 再ビルド
5. ユーザーに該当 Part 報告 → 次 Part へ

**TaskUpdate 即時化**: Part 完了 → completed → 次 Part TaskCreate を機械的に実行。

### Step 5 — 結合

`scripts/merge_decks.py`:

```python
import copy
from pathlib import Path
from pptx import Presentation

PARTS = ["deck_part1.pptx", "deck_part2.pptx", ...]
ROOT = Path(__file__).resolve().parent.parent

def merge(parts, output):
    merged = Presentation(str(parts[0]))
    for path in parts[1:]:
        src = Presentation(str(path))
        for slide in src.slides:
            new_slide = merged.slides.add_slide(merged.slide_layouts[6])
            for shape in slide.shapes:
                el = shape.element
                new_el = copy.deepcopy(el)
                new_slide.shapes._spTree.insert_element_before(new_el, 'p:extLst')
    merged.save(str(output))
```

### Step 6 — 最終 PDF + 配置

```bash
soffice --headless --convert-to pdf --outdir . deck.pptx
mv deck.pdf <output_path>/
```

## レイアウト崩れの定石（経験則）

### テキストボックス overflow 対策

| ケース | 推奨パラメータ |
|---|---|
| 一般本文 | `size=11, line_spacing=1.55-1.6` |
| 縦長テキストブロック (10行以上) | `size=10, line_spacing=1.4` |
| カード内本文 | `size=10-11, line_spacing=1.5-1.6` |
| 見出し | `size=14-15, line_spacing=1.2` |
| 大型数字 | `size=42-72, align=PP_ALIGN.CENTER` |

**試算**: `必要height ≈ size × 1.0/72 × line_spacing × 行数`（72pt = 1 inch）

### Hub & Spoke 図の罠

- Spoke の Y 位置を hard-code すると Bottom 注釈と干渉しがち
- Spoke を `cy ± offset` で対称配置、Bottom 注釈は spoke height の下に置く
- ヘルパー化推奨

### 大型数字の枠外オーバーフロー

- 大型フォント単独で配置すると text-frame の幅を超える
- 必ず `align=PP_ALIGN.CENTER` + 余裕のある box サイズ
- `add_big_stat()` ヘルパーで定型化

### よくあるパラメータ誤用

- `add_text(s, ..., italic=True)` → `italic` パラメータは存在しない
- `add_rect(s, y=y, left=l)` → 引数は positional `(slide, left, top, width, height)`
- 使用前に必ず `grep "def add_text" _deck_lib.py` で確認

## コスト感

- python-pptx ビルド = ローカルで完結、API コスト 0
- ファクトチェックの web_search = ChatGPT/Claude プラン枠内で完結
- 245p の制作 ≒ 1.5日 (AI 駆使 + Part別並行)

## 既存仕組みとの関係

| 既存 | 関係 |
|---|---|
| `presentation-reviewer.md` | 50p未満の PPTX レビュー時。大型は本スキル後に実行 |
| `ui-ux-pro-max:ui-ux-pro-max` | UI実装時。PPTX とは独立 |
| `superpowers:writing-plans` | Part数 ≥ 5 の時は事前に書く |
| `feedback_pptx_generation.md` | memory 側にレイアウト経験則 |

## 絶対にやらないこと

1. **Part 1 のスタイル承認なしに Part 2-N に進む**
   → 後から全 Part に修正が波及する
2. **共通ライブラリの関数シグネチャを推測で使う**
   → grep で確認してから使う
3. **テキストボックス overflow を「大丈夫だろう」で書く**
   → 事前試算 or 標準サイズ表に従う
4. **Part 完了 → TaskUpdate を放置**
   → completed に変えてから次 Part に進む
5. **結合 PPTX を作らずに終わる**
   → 必ず `merge_decks.py` 相当で 1ファイル化 + PDF 化

## 関連リソース

- 共通ライブラリのテンプレ: `outputs/templates/pptx-deck-lib.py` ※未整備
- 過去事例: `outputs/documents/marketing-catchup-2023-2026/` (245p, 2026-04-25〜26)
- memory: `feedback_pptx_generation.md`
