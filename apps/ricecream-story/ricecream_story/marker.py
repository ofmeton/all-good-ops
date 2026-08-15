"""文字の背面に置く差し色の帯。

当初は sample の実物に寄せて手描き風（エッジの波打ち・端の先細り・傾き・インクのムラ）に
していたが、2026-08-15 に陸さんが「逆に変だから直線でOK」と判断したので単純な矩形にした。
乱数を使わなくなったので、両機で同じ画像が出ることは自明に成り立つ。
"""
from __future__ import annotations

from PIL import Image, ImageDraw

THICKNESS = 46


def draw_marker(
    canvas: Image.Image,
    *,
    x_center: float,
    center_y: float,
    width: float,
    color: tuple[int, int, int],
    thickness: int = THICKNESS,
) -> None:
    """帯を1本置く。呼び出し側は文字より先にこれを描く。"""
    span = max(8, round(width))
    left = round(x_center - span / 2)
    top = round(center_y - thickness / 2)
    ImageDraw.Draw(canvas).rectangle([left, top, left + span, top + thickness], fill=color)
