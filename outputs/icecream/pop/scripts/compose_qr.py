#!/usr/bin/env python3
"""QR画像の白カード部分を透過抽出し、POP v3 にはめ込んで v4 を生成する。"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

QR_SRC = Path("/Users/rikukudo/Downloads/RICE CREAM/POP/insta follow/insta_QR.JPG")
POP_V3 = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/instagram-follow-100off-a5-v3.png")
QR_OUT = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/qr_transparent.png")
POP_V4 = Path("/Users/rikukudo/Projects/private-agents/all-good-ops/outputs/icecream/pop/instagram-follow-100off-a5-v4.png")


def extract_qr_card(src: Path, out: Path) -> Image.Image:
    img = Image.open(src).convert("RGB")
    arr = np.array(img)

    white = (arr[:, :, 0] > 220) & (arr[:, :, 1] > 220) & (arr[:, :, 2] > 220)
    labels, num = ndimage.label(white)
    if num == 0:
        raise RuntimeError("白カードを検出できませんでした")
    sizes = ndimage.sum(white, labels, range(num + 1))
    largest = int(np.argmax(sizes[1:])) + 1
    card = labels == largest
    filled = ndimage.binary_fill_holes(card)

    ys, xs = np.where(filled)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1

    cropped_rgb = arr[y0:y1, x0:x1]
    cropped_mask = filled[y0:y1, x0:x1]

    h, w = cropped_mask.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = cropped_rgb
    rgba[:, :, 3] = cropped_mask.astype(np.uint8) * 255

    card_img = Image.fromarray(rgba, "RGBA")
    out.parent.mkdir(parents=True, exist_ok=True)
    card_img.save(out)
    print(f"[extract] {out.name} -> {w}x{h}")
    return card_img


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
    cx = w // 2
    cy = int(h * 0.78)
    return cx - fw // 2, cy - fw // 2, cx + fw // 2, cy + fw // 2


def compose(qr_card: Image.Image, pop_v3: Path, out: Path) -> None:
    pop = Image.open(pop_v3).convert("RGBA")
    pop_arr = np.array(pop.convert("RGB"))
    fx0, fy0, fx1, fy1 = find_blank_square(pop_arr)
    print(f"[blank] bbox x[{fx0},{fx1}] y[{fy0},{fy1}] size {fx1 - fx0}x{fy1 - fy0}")

    pad = 14
    tw = (fx1 - fx0) - pad * 2
    th = (fy1 - fy0) - pad * 2

    qw, qh = qr_card.size
    qar = qw / qh
    tar = tw / th
    if qar > tar:
        nw = tw
        nh = int(nw / qar)
    else:
        nh = th
        nw = int(nh * qar)

    qr_resized = qr_card.resize((nw, nh), Image.LANCZOS)
    px = fx0 + pad + (tw - nw) // 2
    py = fy0 + pad + (th - nh) // 2

    pop.alpha_composite(qr_resized, (px, py))
    pop.save(out)
    print(f"[compose] {out.name} <- paste at ({px},{py}) size {nw}x{nh}")


if __name__ == "__main__":
    card = extract_qr_card(QR_SRC, QR_OUT)
    compose(card, POP_V3, POP_V4)
