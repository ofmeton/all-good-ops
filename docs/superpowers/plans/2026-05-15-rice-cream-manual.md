# RICE CREAM 営業オペレーションマニュアル Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 工藤陸の殴り書きメモ（PDF 2本）から、オコメン（アルバイト）が現場でフリック操作できるスマホ縦長スライドマニュアル PNG 群を生成する。

**Architecture:** Python + Pillow による単一スクリプト `build.py` がマニフェスト `slides.yaml` を読んで 1080×1920 PNG を連番出力する。マニフェストは人間が編集する単純な YAML（写真パス・見出し・本文・注意点）。PDF→ページ画像化と写真クロップは別工程（`pdftoppm` + 手動クロップ）。

**Tech Stack:** Python 3 / Pillow / PyYAML / pdftoppm（poppler）/ `~/.venvs/img-tools/`（既存 venv）/ ヒラギノ角ゴシック W6・W3（macOS 標準）

**Spec:** `docs/superpowers/specs/2026-05-15-rice-cream-manual-design.md`

---

## File Structure

| パス | 役割 |
|---|---|
| `outputs/clients/rice-cream/manual/build.py` | スライド生成スクリプト（メイン） |
| `outputs/clients/rice-cream/manual/test_build.py` | build.py のユニットテスト |
| `outputs/clients/rice-cream/manual/extract_pages.py` | PDF→ページ画像化スクリプト |
| `outputs/clients/rice-cream/manual/slides.yaml` | スライド定義マニフェスト（人間編集） |
| `outputs/clients/rice-cream/manual/_src/pages/` | PDF抽出ページ画像（gitignore） |
| `outputs/clients/rice-cream/manual/_src/photos/` | クロップ済み写真（gitignore） |
| `outputs/clients/rice-cream/manual/open-NNN.png` | 開店準備スライド最終物 |
| `outputs/clients/rice-cream/manual/biz-NNN.png` | 営業中スライド最終物 |
| `outputs/clients/rice-cream/manual/_TODO_photos.md` | 不足写真リスト |
| `outputs/clients/rice-cream/manual/.gitignore` | _src/ を ignore |

---

## Task 1: ディレクトリ初期化

**Files:**
- Create: `outputs/clients/rice-cream/manual/.gitignore`

- [ ] **Step 1: 作業ディレクトリ作成**

```bash
mkdir -p outputs/clients/rice-cream/manual/_src/pages
mkdir -p outputs/clients/rice-cream/manual/_src/photos
ls -d outputs/clients/rice-cream/manual/_src
```

Expected: `outputs/clients/rice-cream/manual/_src` が出力される

- [ ] **Step 2: .gitignore を作成**

`outputs/clients/rice-cream/manual/.gitignore`:
```
# PDF抽出ページ画像と写真の元素材はリポにコミットしない（重い）
_src/
```

- [ ] **Step 3: 環境確認**

```bash
~/.venvs/img-tools/bin/python -c "from PIL import Image, ImageDraw, ImageFont; import yaml; print('OK')"
which pdftoppm
ls -la "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc" "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"
```

Expected: `OK` / pdftoppm のパス / 両フォントが存在

PyYAML がない場合は `~/.venvs/img-tools/bin/pip install pyyaml` を実行。

- [ ] **Step 4: コミット**

```bash
git add outputs/clients/rice-cream/manual/.gitignore
git commit -m "chore: rice-cream manual ディレクトリ初期化"
```

---

## Task 2: build.py キャンバス生成 + テスト基盤

**Files:**
- Create: `outputs/clients/rice-cream/manual/build.py`
- Create: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: 失敗するテストを書く**

`outputs/clients/rice-cream/manual/test_build.py`:
```python
"""build.py のユニットテスト。実画像の見た目はテストしない（サイズ・色域のみ）。"""
from PIL import Image
import build


def test_canvas_size_and_white():
    img = build.make_canvas()
    assert img.size == (1080, 1920)
    assert img.mode == "RGB"
    # 左上1px が白
    assert img.getpixel((0, 0)) == (255, 255, 255)
```

- [ ] **Step 2: 失敗を確認**

```bash
cd outputs/clients/rice-cream/manual
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -10
```

Expected: `ModuleNotFoundError: No module named 'build'` で FAIL

- [ ] **Step 3: 最小実装**

`outputs/clients/rice-cream/manual/build.py`:
```python
"""RICE CREAM 営業マニュアル スライド生成。

入力: slides.yaml
出力: open-NNN.png / biz-NNN.png

仕様: docs/superpowers/specs/2026-05-15-rice-cream-manual-design.md
"""
from PIL import Image

CANVAS_W = 1080
CANVAS_H = 1920


def make_canvas() -> Image.Image:
    return Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))
```

- [ ] **Step 4: テストが通ることを確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
```

Expected: 1 passed

- [ ] **Step 5: コミット**

```bash
git add outputs/clients/rice-cream/manual/build.py outputs/clients/rice-cream/manual/test_build.py
git commit -m "feat(rcm): build.py キャンバス生成"
```

---

## Task 3: ヘッダ帯描画

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
def test_header_draws_dark_band():
    img = build.make_canvas()
    build.draw_header(img, phase="開店準備", index="1 / 38")
    # 上部40px の中央付近が暗色（黒系の帯）
    px = img.getpixel((540, 20))
    assert px != (255, 255, 255), f"ヘッダ帯が白のまま: {px}"
```

- [ ] **Step 2: 失敗を確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_header_draws_dark_band -v 2>&1 | tail -5
```

Expected: `AttributeError: module 'build' has no attribute 'draw_header'` で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
from PIL import ImageDraw, ImageFont

HEADER_H = 60
FONT_HEAVY = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_REG = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"
COLOR_DARK = (32, 32, 32)
COLOR_HEADER_TEXT = (255, 255, 255)


def draw_header(img: Image.Image, phase: str, index: str) -> None:
    """画面最上部に暗色帯＋フェーズ名（左）と連番（右）を描く。"""
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, CANVAS_W, HEADER_H], fill=COLOR_DARK)
    font = ImageFont.truetype(FONT_HEAVY, 28)
    draw.text((32, 14), phase, fill=COLOR_HEADER_TEXT, font=font)
    # 右寄せ
    bbox = draw.textbbox((0, 0), index, font=font)
    iw = bbox[2] - bbox[0]
    draw.text((CANVAS_W - 32 - iw, 14), index, fill=COLOR_HEADER_TEXT, font=font)
```

- [ ] **Step 4: テスト通過確認 + 目視確認画像出力**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
# 目視用に1枚出してみる
~/.venvs/img-tools/bin/python -c "
import build
img = build.make_canvas()
build.draw_header(img, '開店準備', '1 / 38')
img.save('_preview_header.png')
"
ls -la _preview_header.png
```

Expected: 2 passed / `_preview_header.png` 生成

- [ ] **Step 5: 目視 OK ならコミット**

`_preview_header.png` は確認後削除する:
```bash
rm _preview_header.png
git add build.py test_build.py
git commit -m "feat(rcm): ヘッダ帯（フェーズ名+連番）"
```

---

## Task 4: 写真領域配置（fit 描画）

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
from PIL import Image as _Image


def test_paste_photo_fits_in_photo_area(tmp_path):
    # 1000x500 ダミー写真を用意
    photo_path = tmp_path / "dummy.png"
    _Image.new("RGB", (1000, 500), (200, 50, 50)).save(photo_path)
    img = build.make_canvas()
    build.paste_photo(img, str(photo_path))
    # 写真領域内（y=60〜1360 の中央付近）に赤系の色が現れていること
    px = img.getpixel((540, 600))
    assert px[0] > 100 and px[1] < 100, f"写真が貼られていない: {px}"
```

- [ ] **Step 2: 失敗確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_paste_photo_fits_in_photo_area -v 2>&1 | tail -5
```

Expected: `AttributeError: ... paste_photo` で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
PHOTO_TOP = HEADER_H  # 60
PHOTO_BOTTOM = 1360  # 文字領域上端
PHOTO_AREA_H = PHOTO_BOTTOM - PHOTO_TOP  # 1300
COLOR_PHOTO_BG = (240, 240, 240)


def paste_photo(canvas: Image.Image, photo_path: str) -> None:
    """写真を写真領域(1080x1300)に黒帯ナシでフィット配置（letterbox: 余白は薄グレー）。"""
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, PHOTO_TOP, CANVAS_W, PHOTO_BOTTOM], fill=COLOR_PHOTO_BG)
    photo = Image.open(photo_path).convert("RGB")
    # 写真領域に収まるよう縮小（contain）
    photo.thumbnail((CANVAS_W, PHOTO_AREA_H), Image.LANCZOS)
    pw, ph = photo.size
    x = (CANVAS_W - pw) // 2
    y = PHOTO_TOP + (PHOTO_AREA_H - ph) // 2
    canvas.paste(photo, (x, y))
```

- [ ] **Step 4: テスト通過確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
```

Expected: 3 passed

- [ ] **Step 5: コミット**

```bash
git add build.py test_build.py
git commit -m "feat(rcm): 写真領域 fit 配置"
```

---

## Task 5: 文字領域（見出し+本文の自動折返し）

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
def test_draw_text_block_renders_heading_body():
    img = build.make_canvas()
    build.draw_text_block(
        img,
        heading="鍵を開ける",
        body="キーボックスから鍵を取り出してドアを開ける",
    )
    # 文字領域(y=1360〜1920)の中央付近に非白ピクセルがあること
    found_dark = False
    for x in range(40, 1040, 30):
        for y in range(1380, 1900, 30):
            if img.getpixel((x, y)) != (255, 255, 255):
                found_dark = True
                break
    assert found_dark, "文字が描かれていない"
```

- [ ] **Step 2: 失敗確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_draw_text_block_renders_heading_body -v 2>&1 | tail -5
```

Expected: AttributeError で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
TEXT_TOP = PHOTO_BOTTOM  # 1360
TEXT_BOTTOM = CANVAS_H  # 1920
TEXT_AREA_H = TEXT_BOTTOM - TEXT_TOP  # 560
COLOR_TEXT = (32, 32, 32)
MARGIN_X = 48


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """日本語前提のシンプル折返し（文字単位）。"""
    lines: list[str] = []
    buf = ""
    for ch in text:
        if ch == "\n":
            lines.append(buf)
            buf = ""
            continue
        trial = buf + ch
        bbox = font.getbbox(trial)
        if bbox[2] - bbox[0] > max_w and buf:
            lines.append(buf)
            buf = ch
        else:
            buf = trial
    if buf:
        lines.append(buf)
    return lines


def draw_text_block(canvas: Image.Image, heading: str, body: str) -> None:
    """文字領域に見出し+本文を描く。"""
    draw = ImageDraw.Draw(canvas)
    f_heading = ImageFont.truetype(FONT_HEAVY, 72)
    f_body = ImageFont.truetype(FONT_REG, 48)
    max_w = CANVAS_W - MARGIN_X * 2

    y = TEXT_TOP + 32
    for line in _wrap_text(heading, f_heading, max_w):
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_heading)
        y += 84
    y += 16  # 見出し→本文の余白
    for line in _wrap_text(body, f_body, max_w):
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_body)
        y += 60
```

- [ ] **Step 4: テスト通過 + 目視確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
~/.venvs/img-tools/bin/python -c "
import build
img = build.make_canvas()
build.draw_header(img, '開店準備', '1 / 38')
build.draw_text_block(img, '鍵を開ける', 'キーボックスから鍵を取り出してドアを開ける')
img.save('_preview_text.png')
"
```

Expected: 4 passed / `_preview_text.png` 生成

- [ ] **Step 5: コミット**

```bash
rm _preview_text.png
git add build.py test_build.py
git commit -m "feat(rcm): 文字領域（見出し+本文+折返し）"
```

---

## Task 6: 赤帯（注意）・青帯（補足）

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
def test_draw_note_band_red():
    img = build.make_canvas()
    build.draw_note_band(img, kind="note", text="暗証番号は「0025」")
    # 文字領域下部に赤系ピクセルがある
    found_red = False
    for y in range(1700, 1900, 20):
        px = img.getpixel((540, y))
        if px[0] > 150 and px[1] < 100 and px[2] < 100:
            found_red = True
            break
    assert found_red, "赤帯が見つからない"


def test_draw_note_band_blue():
    img = build.make_canvas()
    build.draw_note_band(img, kind="info", text="あれば追加してOK")
    found_blue = False
    for y in range(1700, 1900, 20):
        px = img.getpixel((540, y))
        if px[2] > 150 and px[0] < 100:
            found_blue = True
            break
    assert found_blue, "青帯が見つからない"
```

- [ ] **Step 2: 失敗確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_draw_note_band_red -v 2>&1 | tail -5
```

Expected: AttributeError で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
BAND_H = 90
COLOR_RED = (200, 50, 50)
COLOR_BLUE = (40, 90, 180)
COLOR_BAND_TEXT = (255, 255, 255)


def draw_note_band(canvas: Image.Image, kind: str, text: str) -> None:
    """文字領域下端に注意/補足の帯を描く。

    kind: "note"=赤帯（注意）, "info"=青帯（補足）
    """
    color = COLOR_RED if kind == "note" else COLOR_BLUE
    draw = ImageDraw.Draw(canvas)
    band_top = CANVAS_H - BAND_H
    draw.rectangle([0, band_top, CANVAS_W, CANVAS_H], fill=color)
    f = ImageFont.truetype(FONT_HEAVY, 40)
    prefix = "⚠ " if kind == "note" else "ℹ "
    msg = prefix + text
    max_w = CANVAS_W - MARGIN_X * 2
    lines = _wrap_text(msg, f, max_w)
    y = band_top + (BAND_H - len(lines) * 48) // 2
    for line in lines:
        draw.text((MARGIN_X, y), line, fill=COLOR_BAND_TEXT, font=f)
        y += 48
```

- [ ] **Step 4: テスト通過確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
```

Expected: 6 passed

- [ ] **Step 5: コミット**

```bash
git add build.py test_build.py
git commit -m "feat(rcm): 注意（赤）・補足（青）帯"
```

---

## Task 7: テキストオンリースライド（写真なし）

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
def test_text_only_uses_photo_area_for_text():
    img = build.make_canvas()
    build.draw_text_only(
        img,
        heading="写真未撮影",
        body="ここは追加撮影後にスライド差し替えます。",
    )
    # 写真領域(y=80〜1300) にも文字が描かれている（白でない）
    found = False
    for x in range(40, 1040, 40):
        for y in range(200, 1200, 40):
            if img.getpixel((x, y)) != (255, 255, 255):
                found = True
                break
    assert found, "テキストオンリー時に写真領域が文字に転用されていない"
```

- [ ] **Step 2: 失敗確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_text_only_uses_photo_area_for_text -v 2>&1 | tail -5
```

Expected: AttributeError で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
def draw_text_only(canvas: Image.Image, heading: str, body: str) -> None:
    """写真なしスライド。写真領域+文字領域をすべて文字に使う。"""
    draw = ImageDraw.Draw(canvas)
    f_heading = ImageFont.truetype(FONT_HEAVY, 110)
    f_body = ImageFont.truetype(FONT_REG, 60)
    max_w = CANVAS_W - MARGIN_X * 2

    # 全文行数を計算して縦中央配置
    h_lines = _wrap_text(heading, f_heading, max_w)
    b_lines = _wrap_text(body, f_body, max_w)
    total_h = len(h_lines) * 130 + 40 + len(b_lines) * 76
    y = HEADER_H + (PHOTO_BOTTOM - HEADER_H + TEXT_AREA_H - total_h) // 2

    for line in h_lines:
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_heading)
        y += 130
    y += 40
    for line in b_lines:
        draw.text((MARGIN_X, y), line, fill=COLOR_TEXT, font=f_body)
        y += 76
```

- [ ] **Step 4: テスト通過**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -5
```

Expected: 7 passed

- [ ] **Step 5: コミット**

```bash
git add build.py test_build.py
git commit -m "feat(rcm): テキストオンリースライド"
```

---

## Task 8: マニフェスト読み込み + render_slide + CLI

**Files:**
- Modify: `outputs/clients/rice-cream/manual/build.py`
- Modify: `outputs/clients/rice-cream/manual/test_build.py`

- [ ] **Step 1: テスト追加**

`test_build.py` に追加:
```python
def test_render_slide_with_photo(tmp_path):
    photo = tmp_path / "p.png"
    _Image.new("RGB", (800, 600), (50, 200, 50)).save(photo)
    slide = {
        "id": "open-001",
        "phase": "開店準備",
        "index": "1 / 38",
        "photo": str(photo),
        "heading": "鍵を開ける",
        "body": "キーボックスから取り出す",
        "note": "暗証番号は「0025」",
    }
    img = build.render_slide(slide)
    assert img.size == (1080, 1920)


def test_render_slide_text_only():
    slide = {
        "id": "open-002",
        "phase": "開店準備",
        "index": "2 / 38",
        "photo": None,
        "heading": "未撮影箇所",
        "body": "後で写真を差し込みます",
    }
    img = build.render_slide(slide)
    assert img.size == (1080, 1920)
```

- [ ] **Step 2: 失敗確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py::test_render_slide_with_photo -v 2>&1 | tail -5
```

Expected: AttributeError で FAIL

- [ ] **Step 3: 実装**

`build.py` に追加:
```python
import argparse
import sys
from pathlib import Path
import yaml


def render_slide(slide: dict) -> Image.Image:
    """スライド定義dict からPNG画像を生成して返す。"""
    img = make_canvas()
    draw_header(img, phase=slide["phase"], index=slide["index"])

    if slide.get("photo"):
        paste_photo(img, slide["photo"])
        draw_text_block(img, heading=slide["heading"], body=slide["body"])
    else:
        draw_text_only(img, heading=slide["heading"], body=slide["body"])

    if slide.get("note"):
        draw_note_band(img, "note", slide["note"])
    elif slide.get("info"):
        draw_note_band(img, "info", slide["info"])
    return img


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="slides.yaml")
    parser.add_argument("--out-dir", default=".")
    parser.add_argument("--only", help="特定 id だけ生成（デバッグ用）")
    args = parser.parse_args()

    manifest = yaml.safe_load(Path(args.manifest).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for slide in manifest["slides"]:
        if args.only and slide["id"] != args.only:
            continue
        img = render_slide(slide)
        out_path = out_dir / f"{slide['id']}.png"
        img.save(out_path)
        print(f"wrote {out_path}")
        count += 1
    print(f"done: {count} slides")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: テスト通過確認**

```bash
~/.venvs/img-tools/bin/python -m pytest test_build.py -v 2>&1 | tail -10
```

Expected: 9 passed

- [ ] **Step 5: コミット**

```bash
git add build.py test_build.py
git commit -m "feat(rcm): マニフェスト読込+render_slide+CLI"
```

---

## Task 9: PDF→ページ画像化スクリプト

**Files:**
- Create: `outputs/clients/rice-cream/manual/extract_pages.py`

- [ ] **Step 1: 実装**

`outputs/clients/rice-cream/manual/extract_pages.py`:
```python
"""PDF（開店準備・営業中・アイスマシーン取説）をページPNGに展開する。

出力: _src/pages/<source>-page-NNN.png
"""
import subprocess
from pathlib import Path

SOURCES = [
    ("open", "/Users/rikukudo/Downloads/RICE CREAM/マニュアル/マニュアル_開店準備.pdf"),
    ("biz", "/Users/rikukudo/Downloads/RICE CREAM/マニュアル/マニュアル_営業中.pdf"),
    ("ice", "/Users/rikukudo/Downloads/RICE CREAM/業務/manual_NA-1412AE.pdf"),
]

OUT_DIR = Path(__file__).parent / "_src" / "pages"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, pdf in SOURCES:
        print(f"extracting {name} from {pdf}")
        subprocess.run(
            [
                "pdftoppm",
                "-png",
                "-r", "150",  # 150dpi
                pdf,
                str(OUT_DIR / f"{name}-page"),
            ],
            check=True,
        )
    print("done")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 実行（時間かかる。開店準備PDFは1.6GB×40p）**

```bash
cd outputs/clients/rice-cream/manual
~/.venvs/img-tools/bin/python extract_pages.py 2>&1 | tail -5
ls _src/pages | head -5
ls _src/pages | wc -l
```

Expected: `open-page-01.png` 〜 `open-page-40.png`、`biz-page-01.png` 〜 4、`ice-page-XX.png`（取説の総ページ）

- [ ] **Step 3: コミット**

```bash
git add outputs/clients/rice-cream/manual/extract_pages.py
git commit -m "feat(rcm): PDF→ページ画像化スクリプト"
```

---

## Task 10: 開店準備マニフェスト草案作成

このタスクは**人間がメモを読み下しながら slides.yaml を組み立てる作業**。Claude が支援する。

**Files:**
- Create: `outputs/clients/rice-cream/manual/slides.yaml`

- [ ] **Step 1: 工藤殴り書きテキスト全文を再読**

```bash
ls /tmp/rcm-manual/open.txt /tmp/rcm-manual/biz.txt
cat /tmp/rcm-manual/open.txt
```

- [ ] **Step 2: ページ画像を確認してフェーズごとの写真位置を把握**

`_src/pages/open-page-01.png` 〜 40 を順に Read で確認し、各写真が何のシーンかメモする（暗号番号の暗号箱・荷物・コンセント・電気・看板など）。

- [ ] **Step 3: slides.yaml の骨子を作る**

```yaml
# RICE CREAM 営業マニュアル スライド定義
# 各スライド: id, phase, index, photo (or null), heading, body, note (optional), info (optional)
slides:
  - id: open-001
    phase: 開店準備
    index: 1 / NN  # NN は最終確定時に置換
    photo: _src/photos/open-001.png  # クロップ済み写真
    heading: 鍵を開ける
    body: |
      キーボックスから鍵を取り出す。
      ドアの鍵を開けて入店。
    note: 暗証番号は「0025」

  - id: open-002
    phase: 開店準備
    index: 2 / NN
    photo: _src/photos/open-002.png
    heading: アイスマシーンを起動
    body: |
      停止ボタン → 運転ボタンの順で押す。
      保冷ランプが点灯したら準備OK。

  # ... 続く
```

工藤殴り書きの順番（開店準備の①〜⑥）に沿って **30〜45 スライド**を埋める。「to claude:」指示3つは個別タスク（Task 12）で展開する。

- [ ] **Step 4: バリデーション**

```bash
~/.venvs/img-tools/bin/python -c "
import yaml
m = yaml.safe_load(open('outputs/clients/rice-cream/manual/slides.yaml'))
print('slide count:', len(m['slides']))
for s in m['slides']:
    assert 'id' in s and 'phase' in s and 'index' in s and 'heading' in s
print('OK')
"
```

- [ ] **Step 5: コミット**

```bash
git add outputs/clients/rice-cream/manual/slides.yaml
git commit -m "feat(rcm): 開店準備フェーズ slides.yaml 草案"
```

---

## Task 11: 写真クロップ（開店準備分）

このタスクは Claude がページ画像を見ながらクロップ範囲を決め、PIL でクロップする。

**Files:**
- Create: `outputs/clients/rice-cream/manual/_src/photos/open-NNN.png`（slides.yaml の各 photo: 参照分）

- [ ] **Step 1: クロップ用ユーティリティを作る**

`outputs/clients/rice-cream/manual/crop.py`:
```python
"""ページ画像からクロップ範囲を指定して写真を切り出す簡易ユーティリティ。

使い方: python crop.py <page.png> <out.png> <x> <y> <w> <h>
"""
import sys
from PIL import Image

def main() -> None:
    src, out, x, y, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
    img = Image.open(src)
    img.crop((x, y, x + w, y + h)).save(out)
    print(f"cropped {src} -> {out} ({w}x{h})")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: ページ画像を1枚ずつ Read で確認して bbox を決定**

各ページ画像（`_src/pages/open-page-XX.png`）を順に `Read` ツールで開き、写真の位置（x, y, w, h）をメモする。Pillow の `Image.open(path).size` でページサイズを取得して比率からの算出も可。

- [ ] **Step 3: 各クロップを実行**

```bash
cd outputs/clients/rice-cream/manual
~/.venvs/img-tools/bin/python crop.py _src/pages/open-page-01.png _src/photos/open-001.png 50 100 800 1000
# ... 各スライド分繰り返し
ls _src/photos | wc -l
```

`_src/` は gitignore 済みなのでコミット不要。

- [ ] **Step 4: コミット（crop.py のみ）**

```bash
git add outputs/clients/rice-cream/manual/crop.py
git commit -m "feat(rcm): 写真クロップユーティリティ"
```

---

## Task 12: 「to claude:」指示3つの個別展開

工藤の特殊指示を slides.yaml に追加する。

**Files:**
- Modify: `outputs/clients/rice-cream/manual/slides.yaml`

### 12-A: アイスマシーン停止→運転（3スライド）

- [ ] **Step 1: 取説 NA-1412AE の始業時操作ページを確認**

`_src/pages/ice-page-XX.png` のうち「始業時の操作」「停止ボタン」「運転ボタン」が載っているページを目視で特定し、それぞれクロップして `_src/photos/open-ice-stop.png`, `open-ice-run.png`, `open-ice-ready.png` に保存。

- [ ] **Step 2: slides.yaml に追記**

```yaml
  - id: open-ice-01
    phase: 開店準備
    index: NN / NN
    photo: _src/photos/open-ice-stop.png
    heading: アイスマシーン 停止ボタンを押す
    body: |
      操作パネルの「停止」ボタンを1回押す。
    info: 取扱説明書「始業時の操作」より

  - id: open-ice-02
    phase: 開店準備
    index: NN / NN
    photo: _src/photos/open-ice-run.png
    heading: 続けて「運転」ボタンを押す
    body: |
      停止表示が消えたら、運転ボタンを押す。

  - id: open-ice-03
    phase: 開店準備
    index: NN / NN
    photo: _src/photos/open-ice-ready.png
    heading: 保冷ランプ点灯で起動完了
    body: |
      製品出口をアルコール消毒して、ソフトが出せる状態に。
    note: 製品出口の消毒を絶対に忘れない
```

### 12-B: 2階から下ろす荷物の一覧スライド

- [ ] **Step 3: 荷物別にページ画像から個別にクロップ**

工藤メモから抽出される荷物リスト（12種）:
段ボール / レジ / 白ケース / 置物 / グッズ / 材料 / 洗い物 / テーブル&クロス / 看板 / ソフトミックス / ライスミルク / ロックアイス

各アイテムを `_src/photos/luggage-NN.png` にクロップ（透過なし・四角形クロップのみ）。

- [ ] **Step 4: グリッド合成用の特殊スライド生成スクリプト**

`outputs/clients/rice-cream/manual/build_luggage.py`:
```python
"""2階の荷物グリッド合成スライド専用ビルダー（写真領域に2x6 or 2x4グリッドで配置）。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import build

ITEMS = [
    ("段ボール", "luggage-01.png"),
    ("レジ", "luggage-02.png"),
    ("白ケース", "luggage-03.png"),
    ("置物", "luggage-04.png"),
    ("グッズ", "luggage-05.png"),
    ("材料", "luggage-06.png"),
    ("洗い物", "luggage-07.png"),
    ("テーブル&クロス", "luggage-08.png"),
    ("看板", "luggage-09.png"),
    ("ソフトミックス", "luggage-10.png"),
    ("ライスミルク", "luggage-11.png"),
    ("ロックアイス", "luggage-12.png"),
]

SRC_DIR = Path(__file__).parent / "_src" / "photos"
OUT_PATH = Path(__file__).parent / "open-luggage.png"


def main() -> None:
    img = build.make_canvas()
    build.draw_header(img, phase="開店準備", index="2階の荷物")
    draw = ImageDraw.Draw(img)

    # 3列×4行 (12個) で配置
    cols, rows = 3, 4
    photo_area_w = build.CANVAS_W
    photo_area_h = build.PHOTO_AREA_H
    cell_w = photo_area_w // cols
    cell_h = photo_area_h // rows
    f_label = ImageFont.truetype(build.FONT_HEAVY, 30)

    for i, (label, fname) in enumerate(ITEMS):
        col = i % cols
        row = i // cols
        x0 = col * cell_w
        y0 = build.PHOTO_TOP + row * cell_h
        src = SRC_DIR / fname
        if src.exists():
            p = Image.open(src).convert("RGB")
            p.thumbnail((cell_w - 20, cell_h - 60), Image.LANCZOS)
            pw, ph = p.size
            img.paste(p, (x0 + (cell_w - pw) // 2, y0 + 10))
        # ラベル
        bbox = draw.textbbox((0, 0), label, font=f_label)
        lw = bbox[2] - bbox[0]
        draw.text((x0 + (cell_w - lw) // 2, y0 + cell_h - 44), label, fill=build.COLOR_TEXT, font=f_label)

    build.draw_text_block(img, heading="2階から下ろす荷物", body="これら全部を1階に下ろす")
    img.save(OUT_PATH)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
```

slides.yaml には id: `open-luggage` を入れず、別途 `build_luggage.py` で生成。最終的に open-NNN.png 連番に手動でリネーム/コピー。

### 12-C: アイスマシーン補給ランプ（3スライド・営業中）

- [ ] **Step 5: 取説の補給手順ページを確認→クロップ**

`_src/photos/biz-ice-lamp.png`, `biz-ice-supply.png`, `biz-ice-confirm.png`

- [ ] **Step 6: slides.yaml に営業中フェーズとして追記**

```yaml
  - id: biz-ice-01
    phase: 営業中
    index: NN / NN
    photo: _src/photos/biz-ice-lamp.png
    heading: 補給ランプが光ったら
    body: |
      アイスマシーンの「補給」ランプが点灯したら、
      ソフトミックスの補給時期。

  - id: biz-ice-02
    phase: 営業中
    index: NN / NN
    photo: _src/photos/biz-ice-supply.png
    heading: 冷蔵庫からソフトミックスを出して投入
    body: |
      上蓋を開けて、規定量のソフトミックスを補給。
    note: 蓋を閉め忘れない / こぼしたら即拭く

  - id: biz-ice-03
    phase: 営業中
    index: NN / NN
    photo: _src/photos/biz-ice-confirm.png
    heading: 補給ランプ消灯を確認
    body: |
      しばらく待ってランプが消えれば完了。
```

- [ ] **Step 7: コミット**

```bash
git add outputs/clients/rice-cream/manual/slides.yaml outputs/clients/rice-cream/manual/build_luggage.py
git commit -m "feat(rcm): to-claude 指示3つ展開（マシーン操作・荷物グリッド・補給ランプ）"
```

---

## Task 13: モックスライド1枚生成 → 工藤レビュー

**Files:**
- 出力のみ（gitに含めない）

- [ ] **Step 1: 開店準備の最初のスライド（鍵を開ける）を生成**

```bash
cd outputs/clients/rice-cream/manual
~/.venvs/img-tools/bin/python build.py --manifest slides.yaml --only open-001 --out-dir .
ls -la open-001.png
```

Expected: `open-001.png` が生成される（1080×1920）

- [ ] **Step 2: 工藤に Read で見せて確認**

ユーザーに「このトンマナで全スライド進めて良いか」を確認。NG なら spec or テンプレ調整して再生成。

- [ ] **Step 3: 承認後にスナップショットコミット**

```bash
git add outputs/clients/rice-cream/manual/open-001.png
git commit -m "feat(rcm): モックスライド1枚目（承認済み）"
```

---

## Task 14: 開店準備フェーズ全スライド生成

**Files:**
- Create: `outputs/clients/rice-cream/manual/open-002.png` 〜 `open-NNN.png`
- Create: `outputs/clients/rice-cream/manual/open-luggage.png`（荷物グリッド）

- [ ] **Step 1: 全スライドの index フィールドを `NN / 総数` に置換**

```bash
~/.venvs/img-tools/bin/python -c "
import yaml
p = 'outputs/clients/rice-cream/manual/slides.yaml'
m = yaml.safe_load(open(p))
open_slides = [s for s in m['slides'] if s['phase'] == '開店準備']
biz_slides = [s for s in m['slides'] if s['phase'] == '営業中']
for i, s in enumerate(open_slides, 1):
    s['index'] = f'{i} / {len(open_slides)}'
for i, s in enumerate(biz_slides, 1):
    s['index'] = f'{i} / {len(biz_slides)}'
yaml.safe_dump(m, open(p, 'w'), allow_unicode=True, sort_keys=False)
print('updated indices')
"
```

- [ ] **Step 2: 開店準備フェーズの全スライドを生成**

```bash
cd outputs/clients/rice-cream/manual
~/.venvs/img-tools/bin/python build.py --manifest slides.yaml --out-dir . 2>&1 | tail -5
~/.venvs/img-tools/bin/python build_luggage.py
ls open-*.png | wc -l
```

- [ ] **Step 3: 全枚数を Read で目視確認**

`open-001.png` から最終番号まで `Read` で1枚ずつチェック。文字切れ・写真切れ・色違反がないか。

- [ ] **Step 4: コミット**

```bash
git add outputs/clients/rice-cream/manual/open-*.png
git commit -m "feat(rcm): 開店準備フェーズ 全スライド生成"
```

---

## Task 15: 営業中フェーズ全スライド生成

**Files:**
- Create: `outputs/clients/rice-cream/manual/biz-NNN.png`

- [ ] **Step 1: 営業中フェーズのみ生成**

```bash
cd outputs/clients/rice-cream/manual
# build.py は phase に関わらず slides.yaml の全エントリを処理するので、
# biz-* の id だけを書き出す
~/.venvs/img-tools/bin/python build.py --manifest slides.yaml --out-dir . 2>&1 | grep biz-
ls biz-*.png | wc -l
```

- [ ] **Step 2: 目視確認 + コミット**

```bash
git add outputs/clients/rice-cream/manual/biz-*.png
git commit -m "feat(rcm): 営業中フェーズ 全スライド生成"
```

---

## Task 16: 不足写真リストの作成

**Files:**
- Create: `outputs/clients/rice-cream/manual/_TODO_photos.md`

- [ ] **Step 1: テキストオンリーで暫定埋めしたスライド一覧を抽出**

```bash
~/.venvs/img-tools/bin/python -c "
import yaml
m = yaml.safe_load(open('outputs/clients/rice-cream/manual/slides.yaml'))
print('# 追加撮影リスト\n')
print('テキストオンリーで暫定埋めしているスライドの写真を撮影お願いします。\n')
for s in m['slides']:
    if not s.get('photo'):
        print(f\"- [ ] **{s['id']}** ({s['phase']}): {s['heading']}\")
        print(f\"  - 想定内容: {s['body'].splitlines()[0]}\")
" > outputs/clients/rice-cream/manual/_TODO_photos.md
cat outputs/clients/rice-cream/manual/_TODO_photos.md
```

- [ ] **Step 2: 必要なら任意の不足箇所も手動で追記**

殴り書きで読み取れなかったが現場で必要そうな「鍵を回す瞬間 / 抹茶マシーン置き場 / 沸騰ボタン押下後のポット表示」等を追記。

- [ ] **Step 3: コミット**

```bash
git add outputs/clients/rice-cream/manual/_TODO_photos.md
git commit -m "docs(rcm): 不足写真リスト出力"
```

---

## Task 17: 最終確認 + LINEアルバム化案内

- [ ] **Step 1: 全成果物の枚数確認**

```bash
cd outputs/clients/rice-cream/manual
echo "open: $(ls open-*.png | wc -l) sheets"
echo "biz:  $(ls biz-*.png | wc -l) sheets"
echo "total: $(ls open-*.png biz-*.png | wc -l)"
du -sh open-*.png biz-*.png | tail -3
```

- [ ] **Step 2: 工藤に渡す手順をメッセージで提示**

工藤への引き継ぎメッセージ:
```
outputs/clients/rice-cream/manual/ 配下に PNG が並んでいます。
- AirDrop or iCloud Drive 経由でスマホに転送
- LINE → アルバム作成 → 全選択でアップロード
- _TODO_photos.md の写真を撮影して送ってもらえれば差し替えます
```

- [ ] **Step 3: TaskUpdate で全タスク完了マーク**

writing-plans 完了。

---

## Self-Review

**1. Spec coverage**:
- §4.1 ファイル形式・命名 → Task 8 (CLI), Task 14/15
- §4.2 レイアウト（70/30、ヘッダ、色） → Task 2-6
- §4.3 写真トリミング（透過なし） → Task 11
- §5 構造化ルール（4パターン+業務語化） → Task 10
- §5.1 フェーズ構成（30-45 / 8-15） → Task 14, 15
- §6.1-6.3 to claude 3つ → Task 12 A/B/C
- §7 写真不足の扱い → Task 7 (text-only) + Task 16
- §8 作業フロー → Task 9 (PDF抽出) → Task 13 (モック承認) → Task 14, 15
- §9 完了条件 → Task 14, 15, 16
- §10 YAGNI（ブランド色なし・透過なし・PDF化なし） → 計画にも入れず
- §11 技術スタック → Task 1 で環境確認
- §12 レビュー観点 → Task 13 (モックレビュー), Task 14 Step 3 (全枚目視)

**2. Placeholder scan**:
- 「NN / NN」は Task 14 Step 1 で機械置換するため意図的。実装段階で残らない。
- 「TODO」「TBD」なし。

**3. Type consistency**:
- `make_canvas()`, `draw_header()`, `paste_photo()`, `draw_text_block()`, `draw_note_band()`, `draw_text_only()`, `render_slide()` — 全タスクで命名一致。
- 引数: `kind="note"|"info"` で統一。slide dict のキー: `id/phase/index/photo/heading/body/note/info` で統一。
