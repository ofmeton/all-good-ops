"""手描き風のマーカー帯（蛍光ペンで一筆引いたような帯）。

sample の実物を計測すると、帯は「上下エッジがわずかに波打つ／両端が斜めに切れて
先細る／輪郭が 1〜2px だけソフト／インクにムラがある」という形。ブラシ画像を
素材化する案は、写真の上に乗った帯からマスクを抽出することになり汚れが避けられ
ないので採らず、手続き生成にした。

乱数は必ず random.Random インスタンス経由。random のグローバル関数と組み込み
hash() は PYTHONHASHSEED や プロセス状態に依存し、両機で出力が変わるので使わない。
"""
from __future__ import annotations

import hashlib
import math
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

THICKNESS = 46
EDGE_FRACTION = 0.04
EDGE_POINTS = 14
MARGIN = 28
TILT_RANGE = (-1.6, 0.3)
EDGE_ANGLE_RANGE = (8.0, 14.0)
TAPER_RANGE = (0.25, 0.60)
EDGE_NOISE = 0.10
WIDTH_JITTER = (0.97, 1.04)
OFFSET_JITTER = (-0.03, 0.02)
INK_RANGE = (0.88, 1.0)
BLUR_RADIUS = 1.2


def seeded_rng(*parts: object) -> random.Random:
    """引数から決定論的に RNG を作る。同じ引数なら両機で同じ乱数列になる。"""
    payload = "|".join(str(part) for part in parts).encode("utf-8")
    seed = int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")
    return random.Random(seed)


def _half_thickness(fraction: float, thickness: float, taper_l: float, taper_r: float) -> float:
    if fraction < EDGE_FRACTION:
        factor = taper_l + (1.0 - taper_l) * (fraction / EDGE_FRACTION)
    elif fraction > 1.0 - EDGE_FRACTION:
        factor = taper_r + (1.0 - taper_r) * ((1.0 - fraction) / EDGE_FRACTION)
    else:
        factor = 1.0
    return thickness * factor / 2.0


def _band_mask(width: int, thickness: int, rng: random.Random) -> Image.Image:
    canvas_w = width + 2 * MARGIN
    canvas_h = thickness * 4
    mask = Image.new("L", (canvas_w, canvas_h), 0)
    draw = ImageDraw.Draw(mask)

    center_y = canvas_h / 2.0
    slant = thickness * math.tan(math.radians(rng.uniform(*EDGE_ANGLE_RANGE)))
    taper_l = rng.uniform(*TAPER_RANGE)
    taper_r = rng.uniform(*TAPER_RANGE)

    top: list[tuple[float, float]] = []
    bottom: list[tuple[float, float]] = []
    for index in range(EDGE_POINTS):
        fraction = index / (EDGE_POINTS - 1)
        half = _half_thickness(fraction, thickness, taper_l, taper_r)
        # 上辺は右へ、下辺は左へずらして平行四辺形にする（一筆の傾いた切り口）。
        x_top = MARGIN + slant + fraction * (width - slant)
        x_bottom = MARGIN + fraction * (width - slant)
        top.append((x_top, center_y - half + rng.uniform(-EDGE_NOISE, EDGE_NOISE) * thickness))
        bottom.append(
            (x_bottom, center_y + half + rng.uniform(-EDGE_NOISE, EDGE_NOISE) * thickness)
        )

    draw.polygon(top + list(reversed(bottom)), fill=255)
    return mask


def _ink_noise(size: tuple[int, int], rng: random.Random) -> Image.Image:
    """低周波のムラ。小さいノイズを拡大するので粒ではなく濃淡になる。"""
    width, height = size
    small_w = max(2, width // 40)
    noise = Image.new("L", (small_w, 3))
    noise.putdata(
        [round(255 * rng.uniform(*INK_RANGE)) for _ in range(small_w * 3)]
    )
    return noise.resize(size, Image.BILINEAR)


def draw_marker(
    canvas: Image.Image,
    *,
    x_center: float,
    baseline: float,
    text_width: float,
    cap_height: float,
    color: tuple[int, int, int],
    width_ratio: float,
    rng: random.Random,
    thickness: int = THICKNESS,
) -> None:
    """文字の背面に帯を1本置く。呼び出し側は文字より先にこれを描く。"""
    width = max(8, round(text_width * width_ratio * rng.uniform(*WIDTH_JITTER)))
    mask = _band_mask(width, thickness, rng)
    mask = mask.rotate(rng.uniform(*TILT_RANGE), resample=Image.BICUBIC, expand=True)
    mask = mask.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    mask = ImageChops.multiply(mask, _ink_noise(mask.size, rng))

    # 回転前の帯の中心はマスク画像の中心と一致する（左右マージンが対称）。
    # rotate(expand=True) は中心を保つので、回転後も中心＝画像中心。
    center_x = x_center + rng.uniform(*OFFSET_JITTER) * width
    center_y = baseline + 0.06 * cap_height + rng.uniform(-EDGE_NOISE, EDGE_NOISE) * thickness
    left = round(center_x - mask.width / 2)
    top = round(center_y - mask.height / 2)

    canvas.paste(Image.new("RGB", mask.size, color), (left, top), mask)
