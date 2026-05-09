"""Split chroma-key grid sheets into transparent per-cell PNGs.

Generic template. Adjust ROOT, SRC, GRIDS to match each project.

Run with the shared image-tools venv:
    ~/.venvs/img-tools/bin/python chromakey_grid_split.py [name-filter]

Input:  <SRC>/<NN>_<name>-grid.png  (any size, magenta or cyan flat bg)
Output: <ROOT>/<NN>_<name>/01.png 02.png ... (RGBA, trimmed)

GRIDS dict drives behavior per file:
  (rows, cols)  -> real-gap detection with that expected count, falling
                   back to even split when detection is ambiguous
  None          -> connected-component detection (irregular layouts)
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "透過"

# Tuning knobs
EDGE_FEATHER_PX = 2          # alpha gradient width near key color
HUE_TOLERANCE = 18 / 360.0    # how close in hue to count as background
SAT_THRESHOLD = 0.45          # min saturation to count as keyable bg
VAL_THRESHOLD = 0.45          # min value
MIN_OPAQUE_PIXELS = 400       # below this, treat cell as empty
INNER_MARGIN_PX = 0           # extra crop inside each detected cell


def rgb_to_hsv_array(rgb: np.ndarray) -> np.ndarray:
    """Vectorised RGB->HSV. Input HxWx3 uint8 -> HxWx3 float32 in [0,1]."""
    r, g, b = rgb[..., 0] / 255.0, rgb[..., 1] / 255.0, rgb[..., 2] / 255.0
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    df = mx - mn
    h = np.zeros_like(mx)
    mask = df > 0
    # red dominant
    rmask = mask & (mx == r)
    h[rmask] = ((g[rmask] - b[rmask]) / df[rmask]) % 6
    gmask = mask & (mx == g) & ~rmask
    h[gmask] = ((b[gmask] - r[gmask]) / df[gmask]) + 2
    bmask = mask & (mx == b) & ~rmask & ~gmask
    h[bmask] = ((r[bmask] - g[bmask]) / df[bmask]) + 4
    h = (h / 6.0) % 1.0
    s = np.where(mx > 0, df / np.maximum(mx, 1e-9), 0.0)
    v = mx
    return np.stack([h, s, v], axis=-1).astype(np.float32)


def detect_bg_color(img: np.ndarray) -> tuple[float, str]:
    """Sample 4 corners + center-edge points; pick dominant key hue.

    Returns (hue_in_unit, label).
    """
    h, w, _ = img.shape
    samples = []
    for y in (5, h - 6):
        for x in (5, w - 6):
            samples.append(img[y, x])
    samples = np.array(samples, dtype=np.uint8)[None, ...]
    hsv = rgb_to_hsv_array(samples)[0]
    hue = float(np.median(hsv[:, 0]))
    # magenta hue ~ 0.83, cyan hue ~ 0.5
    label = "magenta" if (hue > 0.75 or hue < 0.05) else "cyan"
    return hue, label


def make_alpha(img_rgb: np.ndarray, key_hue: float) -> np.ndarray:
    """Return alpha 0..255 array. 0 = key color, 255 = keep."""
    hsv = rgb_to_hsv_array(img_rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # circular hue distance
    dh = np.minimum(np.abs(h - key_hue), 1.0 - np.abs(h - key_hue))
    # core key mask: close hue + saturated + bright
    is_bg = (dh < HUE_TOLERANCE) & (s > SAT_THRESHOLD) & (v > VAL_THRESHOLD)
    alpha = np.where(is_bg, 0.0, 1.0)
    # feather: pixels with hue close-but-mid-sat get partial alpha
    near = (dh < HUE_TOLERANCE * 1.6) & (s > SAT_THRESHOLD * 0.5) & (v > VAL_THRESHOLD * 0.6) & ~is_bg
    # alpha proportional to (1 - sat) for near pixels
    alpha[near] = np.clip((s[near] - SAT_THRESHOLD * 0.5) / (SAT_THRESHOLD * 0.5), 0.0, 1.0)
    alpha[near] = 1.0 - alpha[near]
    return (alpha * 255).astype(np.uint8)


def despill(rgb: np.ndarray, alpha: np.ndarray, key_hue: float) -> np.ndarray:
    """Reduce key-colour bleed on semi-transparent edges.

    Cheap approach: for partially transparent pixels, desaturate toward
    the average of the non-key channels.
    """
    out = rgb.copy().astype(np.float32)
    edge = (alpha > 0) & (alpha < 255)
    if not edge.any():
        return out.astype(np.uint8)
    if 0.75 < key_hue or key_hue < 0.05:
        # magenta: pull G up toward avg(R,B) where edge
        r, g, b = out[..., 0], out[..., 1], out[..., 2]
        target_g = (r + b) / 2
        new_g = np.where(edge, np.maximum(g, target_g - 10), g)
        out[..., 1] = new_g
    else:
        # cyan: pull R up toward avg(G,B) where edge
        r, g, b = out[..., 0], out[..., 1], out[..., 2]
        target_r = (g + b) / 2
        new_r = np.where(edge, np.maximum(r, target_r - 10), r)
        out[..., 0] = new_r
    return np.clip(out, 0, 255).astype(np.uint8)


def even_split(length: int, n: int) -> list[tuple[int, int]]:
    """Evenly divide [0, length) into n ranges."""
    cell = length / n
    runs: list[tuple[int, int]] = []
    for k in range(n):
        s = int(round(k * cell)) + INNER_MARGIN_PX
        e = int(round((k + 1) * cell)) - INNER_MARGIN_PX
        runs.append((s, e))
    return runs


def detect_split_axis(alpha: np.ndarray, axis: int, expected: int,
                      gap_min_len: int = 8, near_bg: float = 0.99) -> list[tuple[int, int]]:
    """Detect cell boundaries along an axis using actual gap rows/cols.

    axis=0 -> rows (returns y ranges); axis=1 -> cols (returns x ranges).
    Falls back to even_split if detected gap count != expected+1 boundaries.
    """
    # bg ratio per line
    if axis == 0:
        ratio = (alpha == 0).mean(axis=1)
    else:
        ratio = (alpha == 0).mean(axis=0)
    n = len(ratio)
    is_gap_line = ratio >= near_bg

    # Build gap runs (consecutive gap-lines)
    gaps: list[tuple[int, int]] = []
    in_run = False
    s = 0
    for i, b in enumerate(is_gap_line):
        if b and not in_run:
            in_run = True
            s = i
        elif not b and in_run:
            in_run = False
            if i - s >= gap_min_len:
                gaps.append((s, i))
    if in_run and n - s >= gap_min_len:
        gaps.append((s, n))

    # Merge gaps separated by very thin content slivers (< 12 px)
    merged: list[tuple[int, int]] = []
    for s, e in gaps:
        if merged and s - merged[-1][1] < 12:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    gaps = merged

    # Need (expected + 1) gaps to define expected cells: leading edge, inner
    # boundaries, trailing edge. Synthesize edge "gaps" only if missing.
    edge_threshold = 30
    if not gaps or gaps[0][0] > edge_threshold:
        gaps.insert(0, (0, 0))
    if gaps[-1][1] < n - edge_threshold:
        gaps.append((n, n))

    if len(gaps) - 1 != expected:
        # Detection failed — fall back to even split
        return even_split(n, expected)

    # Cell range = (end-of-prev-gap, start-of-next-gap)
    runs = []
    for k in range(expected):
        s = gaps[k][1] + INNER_MARGIN_PX
        e = gaps[k + 1][0] - INNER_MARGIN_PX
        runs.append((s, e))
    return runs


def trim_to_content(rgba: np.ndarray) -> np.ndarray:
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha > 8)
    if len(ys) == 0:
        return rgba
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    pad = 2
    h, w = rgba.shape[:2]
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(h, y1 + pad)
    x1 = min(w, x1 + pad)
    return rgba[y0:y1, x0:x1]


# Hand-tuned grid expectations. None = use connected-component detection
# instead of even grid split (for irregular layouts).
GRIDS: dict[str, tuple[int, int] | None] = {
    "01_logo-header-footer-grid.png": None,
    "02_buttons-cta-grid.png": (4, 3),
    "03_badges-labels-grid.png": (4, 4),
    "04_icons-grid.png": (3, 4),
    "05_cards-panels-ui-grid.png": (3, 3),
    "06_characters-grid.png": (4, 3),
    "07_decorative-nature-objects-grid.png": (5, 5),
    "08_section-backgrounds-grid.png": (2, 3),
}


def detect_components(alpha: np.ndarray, min_area: int = 1500) -> list[tuple[int, int, int, int]]:
    """Find connected blobs of non-bg pixels. Returns list of (y0, y1, x0, x1).

    Sorted in reading order (top-to-bottom, left-to-right) using row bands.
    """
    mask = alpha > 200
    mask = ndimage.binary_closing(mask, iterations=4)
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    out = []
    for i, sl in enumerate(ndimage.find_objects(labels), 1):
        if sl is None:
            continue
        if sizes[i - 1] < min_area:
            continue
        ys, xs = sl
        out.append((ys.start, ys.stop, xs.start, xs.stop))
    out.sort(key=lambda r: (r[0] // 200, r[2]))  # row-band then x
    return out


def process_one(path: Path, *, dry: bool = False) -> tuple[int, int]:
    img = Image.open(path).convert("RGB")
    rgb = np.array(img)
    key_hue, label = detect_bg_color(rgb)
    alpha = make_alpha(rgb, key_hue)
    rgb = despill(rgb, alpha, key_hue)

    grid = GRIDS[path.name]
    h, w = alpha.shape
    if grid is None:
        cells = detect_components(alpha)
    else:
        rows, cols = grid
        y_runs = detect_split_axis(alpha, axis=0, expected=rows)
        x_runs = detect_split_axis(alpha, axis=1, expected=cols)
        cells = [(y0, y1, x0, x1) for (y0, y1) in y_runs for (x0, x1) in x_runs]

    folder_name = path.stem.replace("-grid", "")
    out_dir = ROOT / folder_name
    if not dry:
        out_dir.mkdir(exist_ok=True)

    saved = 0
    skipped = 0
    idx = 1
    for (y0, y1, x0, x1) in cells:
        cell_rgb = rgb[y0:y1, x0:x1]
        cell_a = alpha[y0:y1, x0:x1]
        opaque = int((cell_a > 64).sum())
        if opaque < MIN_OPAQUE_PIXELS:
            skipped += 1
            continue
        rgba = np.dstack([cell_rgb, cell_a])
        rgba = trim_to_content(rgba)
        out_path = out_dir / f"{idx:02d}.png"
        if not dry:
            Image.fromarray(rgba, mode="RGBA").save(out_path, optimize=True)
        saved += 1
        idx += 1
    print(f"[{label:7}] {path.name}: saved={saved} skipped_empty={skipped} -> {out_dir.name}/")
    return saved, skipped


def main() -> int:
    targets = sorted(SRC.glob("*.png"))
    if not targets:
        print(f"No PNGs in {SRC}", file=sys.stderr)
        return 1
    only = sys.argv[1] if len(sys.argv) > 1 else None
    total_saved = 0
    total_skipped = 0
    for p in targets:
        if only and only not in p.name:
            continue
        s, k = process_one(p)
        total_saved += s
        total_skipped += k
    print(f"--- total: saved={total_saved} skipped={total_skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
