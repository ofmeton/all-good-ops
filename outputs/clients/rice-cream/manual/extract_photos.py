"""ページ画像から写真矩形を彩度ベースで自動検出してクロップする。

各ページ画像 _src/pages/<src>-page-NN.png に対して:
  1. RGB の彩度マスクを取る（テキストは彩度0、写真は彩度高い）
  2. scipy で連結成分ラベリング
  3. 面積 >= MIN_AREA かつアスペクト比が極端でない成分を写真候補に
  4. y 順にソートして _src/photos/<src>-NN-M.png として書き出し
  5. メタを _src/photos/_detected.yaml にまとめる

使い方:
  python extract_photos.py <src>     # src: open / biz / ice
"""
import sys
from pathlib import Path
import numpy as np
import yaml
from PIL import Image
from scipy.ndimage import label

PAGES_DIR = Path(__file__).parent / "_src" / "pages"
PHOTOS_DIR = Path(__file__).parent / "_src" / "photos"
META_PATH = PHOTOS_DIR / "_detected.yaml"

SAT_THRESHOLD = 30
MIN_AREA = 30000  # 30k pixel ≈ 175x175 相当
MAX_ASPECT = 4.0
MARGIN = 8


def detect_photos(page_path: Path) -> list[tuple[int, int, int, int]]:
    """ページ画像から写真の bbox リストを返す。"""
    img = Image.open(page_path).convert("RGB")
    arr = np.array(img)
    h, w, _ = arr.shape

    sat = arr.max(axis=2).astype(int) - arr.min(axis=2).astype(int)
    mask = sat > SAT_THRESHOLD

    labels, n = label(mask)
    bboxes: list[tuple[int, int, int, int]] = []
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        area = len(ys)
        if area < MIN_AREA:
            continue
        y0, y1 = int(ys.min()), int(ys.max())
        x0, x1 = int(xs.min()), int(xs.max())
        bw, bh = x1 - x0, y1 - y0
        if bw == 0 or bh == 0:
            continue
        ratio = max(bw, bh) / min(bw, bh)
        if ratio > MAX_ASPECT:
            continue
        # マージン付与
        y0 = max(0, y0 - MARGIN)
        y1 = min(h, y1 + MARGIN)
        x0 = max(0, x0 - MARGIN)
        x1 = min(w, x1 + MARGIN)
        bboxes.append((x0, y0, x1, y1))

    bboxes.sort(key=lambda b: b[1])
    return bboxes


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python extract_photos.py <src>  (src: open / biz / ice)")
        sys.exit(1)
    src = sys.argv[1]
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    pages = sorted(
        PAGES_DIR.glob(f"{src}-page-*.png"),
        key=lambda p: int(p.stem.rsplit("-", 1)[1]),
    )

    meta: list[dict] = []
    for page_path in pages:
        page_num = int(page_path.stem.rsplit("-", 1)[1])
        bboxes = detect_photos(page_path)
        img = Image.open(page_path)
        for i, (x0, y0, x1, y1) in enumerate(bboxes, 1):
            out_path = PHOTOS_DIR / f"{src}-{page_num:02d}-{i}.png"
            img.crop((x0, y0, x1, y1)).save(out_path)
            meta.append(
                {
                    "src": src,
                    "page": page_num,
                    "idx": i,
                    "bbox": [x0, y0, x1, y1],
                    "path": str(out_path.relative_to(Path(__file__).parent)),
                }
            )
        print(f"page {page_num}: {len(bboxes)} photos")

    # メタを追記
    existing = []
    if META_PATH.exists():
        existing = yaml.safe_load(META_PATH.read_text()) or []
    # src 分を上書き
    existing = [m for m in existing if m["src"] != src]
    existing.extend(meta)
    META_PATH.write_text(yaml.safe_dump(existing, allow_unicode=True, sort_keys=False))
    print(f"wrote {len(meta)} photos to {PHOTOS_DIR}")
    print(f"meta: {META_PATH}")


if __name__ == "__main__":
    main()
