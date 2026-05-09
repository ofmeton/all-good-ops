#!/usr/bin/env python3
"""QR画像を白背景透過＋黄金色化し、POP v3 に枠内いっぱい配置。
ユーザーIDは枠外に黄金色のセリフ書体で描画する。"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

QR_SRC = Path("/Users/rikukudo/Downloads/RICE CREAM/POP/insta follow/insta_QR.JPG")
POP_V3 = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/instagram-follow-100off-a5-v3.png")
QR_GOLD = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/qr_gold_transparent.png")
POP_OUT = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/instagram-follow-100off-a5-v8.png")

GOLD_RGB = (212, 169, 60)  # 稲穂の黄金色（マット）
USER_ID = "@BEATICE0923"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Didot.ttc",
    "/System/Library/Fonts/Supplemental/Bodoni 72.ttc",
    "/Library/Fonts/Didot.ttc",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/Times.ttc",
]


def find_card_mask(arr: np.ndarray) -> np.ndarray:
    white = (arr[:, :, 0] > 220) & (arr[:, :, 1] > 220) & (arr[:, :, 2] > 220)
    labels, n = ndimage.label(white)
    if n == 0:
        raise RuntimeError("白カード検出不可")
    sizes = ndimage.sum(white, labels, range(n + 1))
    largest = int(np.argmax(sizes[1:])) + 1
    return ndimage.binary_fill_holes(labels == largest)


def extract_qr_to_gold() -> tuple[Image.Image, tuple[int, int]]:
    img = Image.open(QR_SRC).convert("RGB")
    arr = np.array(img)
    card = find_card_mask(arr)

    ys, xs = np.where(card)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    card_arr = arr[y0:y1, x0:x1]
    card_mask = card[y0:y1, x0:x1]
    ch, cw, _ = card_arr.shape

    # カード内の「暗いピクセル」（紺色QRドット＋テキスト）
    summed = card_arr.astype(int).sum(axis=2)
    dark = card_mask & (summed < 600)

    # 行ごとの暗ピクセル密度。QRコードは行幅の15%以上を超えやすく、
    # 中央寄りのテキスト @BEATICE0923 行は超えない。よって min/max で範囲を取る。
    row_density = dark.sum(axis=1)
    threshold = int(cw * 0.16)
    dense_rows = np.where(row_density >= threshold)[0]
    if len(dense_rows) == 0:
        raise RuntimeError("QR行検出不可（密度しきい値超え行なし）")
    qr_y0, qr_y1 = int(dense_rows.min()), int(dense_rows.max()) + 1
    print(f"[qr-rows] threshold={threshold} range=[{qr_y0},{qr_y1}] count={len(dense_rows)}")

    # QR 行内の暗ピクセル x 範囲
    qr_cols = np.where(dark[qr_y0:qr_y1].any(axis=0))[0]
    qr_x0, qr_x1 = qr_cols.min(), qr_cols.max() + 1

    # 正方形に揃える（中心保持）
    qw = qr_x1 - qr_x0
    qh = qr_y1 - qr_y0
    qsize = max(qw, qh)
    cx = (qr_x0 + qr_x1) // 2
    cy = (qr_y0 + qr_y1) // 2
    qr_x0 = max(0, cx - qsize // 2)
    qr_y0 = max(0, cy - qsize // 2)
    qr_x1 = min(cw, qr_x0 + qsize)
    qr_y1 = min(ch, qr_y0 + qsize)

    block = card_arr[qr_y0:qr_y1, qr_x0:qr_x1]
    bh, bw, _ = block.shape

    # 暗さをα、色を黄金に
    luminance = block.astype(np.float32).mean(axis=2) / 255.0
    darkness = 1.0 - luminance
    alpha = (darkness * 255).clip(0, 255).astype(np.uint8)

    rgba = np.zeros((bh, bw, 4), dtype=np.uint8)
    rgba[..., 0] = GOLD_RGB[0]
    rgba[..., 1] = GOLD_RGB[1]
    rgba[..., 2] = GOLD_RGB[2]
    rgba[..., 3] = alpha

    out_img = Image.fromarray(rgba, "RGBA")
    out_img.save(QR_GOLD)
    print(f"[qr-gold] {QR_GOLD.name} -> {bw}x{bh}")
    return out_img, (bw, bh)


def find_blank_square(pop_rgb: np.ndarray) -> tuple[int, int, int, int]:
    h, w, _ = pop_rgb.shape
    r, g, b = pop_rgb[:, :, 0], pop_rgb[:, :, 1], pop_rgb[:, :, 2]
    gold = (r > 140) & (g > 90) & (g < 200) & (b < 130) & (r.astype(int) > b.astype(int) + 30)
    target = gold.copy()
    target[: h // 2, :] = False
    m = 60
    target[:, :m] = False
    target[:, -m:] = False
    target[-m:, :] = False

    labels, num = ndimage.label(target)
    sizes = ndimage.sum(target, labels, range(num + 1))
    best = None
    best_score = -1.0
    for i in range(1, num + 1):
        if sizes[i] < 100:
            continue
        ys, xs = np.where(labels == i)
        bw = xs.max() - xs.min()
        bh = ys.max() - ys.min()
        if bw == 0 or bh == 0 or min(bw, bh) < 200:
            continue
        ar = min(bw, bh) / max(bw, bh)
        if ar < 0.85:
            continue
        score = ar * sizes[i]
        if score > best_score:
            best_score = score
            best = (xs.min(), ys.min(), xs.max(), ys.max())
    if best is not None:
        return best
    fw = int(w * 0.32)
    cx, cy = w // 2, int(h * 0.78)
    return cx - fw // 2, cy - fw // 2, cx + fw // 2, cy + fw // 2


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for fp in FONT_CANDIDATES:
        if Path(fp).exists():
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def sample_bg_color(pop_rgb: np.ndarray) -> tuple[int, int, int]:
    h, w, _ = pop_rgb.shape
    patches = [
        pop_rgb[60:90, 60:90],
        pop_rgb[60:90, w - 90 : w - 60],
        pop_rgb[h - 90 : h - 60, 60:90],
        pop_rgb[h - 90 : h - 60, w - 90 : w - 60],
    ]
    stacked = np.concatenate([p.reshape(-1, 3) for p in patches], axis=0)
    return tuple(int(c) for c in np.median(stacked, axis=0))


def erase_below_blank(pop: Image.Image, fy1: int, bg: tuple[int, int, int], frame_margin: int = 50) -> None:
    """罫線下〜外周フレーム内側を背景色のフラット＋微ノイズで塗り潰し、SCAN TO FOLLOW を消す。"""
    pop_w, pop_h = pop.size
    rect_x0, rect_x1 = frame_margin, pop_w - frame_margin
    rect_y0, rect_y1 = fy1 + 8, pop_h - frame_margin
    rh, rw = rect_y1 - rect_y0, rect_x1 - rect_x0
    if rh <= 0 or rw <= 0:
        return
    base = np.full((rh, rw, 3), bg, dtype=np.uint8)
    rng = np.random.default_rng(0)
    noise = rng.integers(-6, 7, size=(rh, rw, 1), dtype=np.int16)
    base = np.clip(base.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    rgba = np.concatenate([base, np.full((rh, rw, 1), 255, dtype=np.uint8)], axis=2)
    pop.alpha_composite(Image.fromarray(rgba, "RGBA"), (rect_x0, rect_y0))


def compose():
    qr_gold, _ = extract_qr_to_gold()

    pop = Image.open(POP_V3).convert("RGBA")
    pop_arr = np.array(pop.convert("RGB"))
    fx0, fy0, fx1, fy1 = find_blank_square(pop_arr)
    print(f"[blank] x[{fx0},{fx1}] y[{fy0},{fy1}] size {fx1 - fx0}x{fy1 - fy0}")

    bg = sample_bg_color(pop_arr)
    print(f"[bg] {bg}")
    erase_below_blank(pop, fy1, bg)

    inset = 4
    tw = (fx1 - fx0) - inset * 2
    th = (fy1 - fy0) - inset * 2
    side = min(tw, th)
    qr_resized = qr_gold.resize((side, side), Image.LANCZOS)
    px = fx0 + inset + (tw - side) // 2
    py = fy0 + inset + (th - side) // 2
    pop.alpha_composite(qr_resized, (px, py))
    print(f"[paste-qr] at ({px},{py}) size {side}x{side}")

    pop_w, pop_h = pop.size
    font = load_font(36)
    bbox = font.getbbox(USER_ID)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (pop_w - text_w) // 2 - bbox[0]
    text_y = fy1 + 28
    draw = ImageDraw.Draw(pop)
    draw.text((text_x, text_y), USER_ID, font=font, fill=GOLD_RGB)
    print(f"[user-id] '{USER_ID}' at ({text_x},{text_y}) size {text_w}x{text_h}")

    pop.save(POP_OUT)
    print(f"[done] {POP_OUT}")


if __name__ == "__main__":
    compose()
