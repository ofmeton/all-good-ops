"""未検出ページ（彩度低い写真）を緩めの閾値で再クロップする。

写真領域とテキスト領域を分離して、写真だけを取り出す。
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_opening

PAGES_DIR = Path(__file__).parent / "_src" / "pages"
PHOTOS_DIR = Path(__file__).parent / "_src" / "photos"

MISSING_PAGES = [8, 11, 14, 31, 33, 37]


def detect_photo_loose(page_path: Path):
    """白でない領域から最大連結成分を抽出。テキストはサイズ小で除外。"""
    img = Image.open(page_path).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape
    # 白でない（暗いまたは色付き）
    gray = arr.mean(axis=2)
    mask = gray < 240
    # 細かいノイズ除去（テキストの文字を消す）
    mask = binary_opening(mask, iterations=5)

    labels, n = label(mask)
    best = None
    best_area = 0
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        area = len(ys)
        if area < 20000:
            continue
        y0, y1 = int(ys.min()), int(ys.max())
        x0, x1 = int(xs.min()), int(xs.max())
        bw, bh = x1 - x0, y1 - y0
        if bw == 0 or bh == 0:
            continue
        ratio = max(bw, bh) / min(bw, bh)
        if ratio > 4.0:
            continue
        if area > best_area:
            best_area = area
            best = (x0, y0, x1, y1)
    return best


def main() -> None:
    for page_num in MISSING_PAGES:
        page_path = PAGES_DIR / f"open-page-{page_num:02d}.png"
        bbox = detect_photo_loose(page_path)
        if bbox is None:
            print(f"page {page_num}: NOT detected even with loose threshold")
            continue
        img = Image.open(page_path)
        # マージン
        m = 12
        x0, y0, x1, y1 = bbox
        x0, y0 = max(0, x0 - m), max(0, y0 - m)
        x1, y1 = min(img.width, x1 + m), min(img.height, y1 + m)
        out = PHOTOS_DIR / f"open-{page_num:02d}-1.png"
        img.crop((x0, y0, x1, y1)).save(out)
        print(f"page {page_num}: cropped {x1-x0}x{y1-y0} -> {out.name}")


if __name__ == "__main__":
    main()
