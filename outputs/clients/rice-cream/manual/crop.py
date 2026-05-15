"""ページ画像からクロップ範囲を指定して写真を切り出す簡易ユーティリティ。

使い方:
  python crop.py <src_page.png> <out.png> <x> <y> <w> <h>
"""
import sys
from PIL import Image


def main() -> None:
    src, out = sys.argv[1], sys.argv[2]
    x, y, w, h = (int(v) for v in sys.argv[3:7])
    img = Image.open(src)
    img.crop((x, y, x + w, y + h)).save(out)
    print(f"cropped {src} -> {out} ({w}x{h})")


if __name__ == "__main__":
    main()
