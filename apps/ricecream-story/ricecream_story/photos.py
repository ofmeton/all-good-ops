"""写真を 1080x1920 に cover 配置する。

素材は 9:16（2304x4096）が主だが 3:4 も混ざる。contain（余白）にすると
ストーリーとして成立しないので cover 一本にし、切り落とす側を crop_focus で
制御する。3:4 の写真は焦点を上に寄せてコーンの先端を残す。
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

CANVAS_W = 1080
CANVAS_H = 1920


def load_cover(
    path: Path,
    focus: tuple[float, float] = (0.5, 0.5),
    size: tuple[int, int] = (CANVAS_W, CANVAS_H),
) -> Image.Image:
    """アスペクト比を保って領域を埋め、focus を中心に切り出す。

    focus は元画像の正規化座標 (x, y)。切り出し窓が画像外に出る場合はクランプする
    ので、0.0 や 1.0 を渡しても端に張り付くだけで例外にはならない。
    """
    target_w, target_h = size
    with Image.open(path) as opened:
        photo = opened.convert("RGB")

    scale = max(target_w / photo.width, target_h / photo.height)
    scaled_w = max(target_w, round(photo.width * scale))
    scaled_h = max(target_h, round(photo.height * scale))
    photo = photo.resize((scaled_w, scaled_h), Image.LANCZOS)

    focus_x, focus_y = focus
    left = round(scaled_w * focus_x - target_w / 2)
    top = round(scaled_h * focus_y - target_h / 2)
    left = max(0, min(left, scaled_w - target_w))
    top = max(0, min(top, scaled_h - target_h))

    return photo.crop((left, top, left + target_w, top + target_h))
