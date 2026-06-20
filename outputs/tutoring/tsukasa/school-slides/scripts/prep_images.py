"""Prepare only the approved source images for Tsukasa's school deck."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT.parent / "school-images"

APPROVED = [
    ("七里ヶ浜", "wiki_beach.jpg", "hero", 1600, None),
    ("七里ヶ浜", "wiki_campus.jpg", "hero", 1600, None),
    ("七里ヶ浜", "wiki_enoden.jpg", "card", 1000, (3.7, 1.45)),
    ("七里ヶ浜", "shichirinpic.jpg", "card", 1000, (5.15, 2.45)),
    ("鎌倉", "wiki_fumikiri.jpg", "hero", 1600, None),
    ("鎌倉", "wiki_campus.jpg", "hero", 1600, None),
    ("大船", "wiki_sportsday.jpg", "card", 1000, (5.8, 1.86)),
    ("大船", "wiki_kannon.jpg", "card", 1000, (5.8, 1.86)),
    ("大船", "wiki_campus.jpg", "hero", 1600, None),
    ("柏陽", "wiki_hongodai.jpg", "card", 1000, (8.0, 2.02)),
    ("柏陽", "wiki_campus.jpg", "hero", 600, None),
]


def resize_long_edge(img, max_long_edge):
    w, h = img.size
    long_edge = max(w, h)
    if long_edge <= max_long_edge:
        return img.copy()
    scale = max_long_edge / long_edge
    return img.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)


def center_crop_ratio(img, ratio):
    if ratio is None:
        return img
    target = ratio[0] / ratio[1]
    w, h = img.size
    current = w / h
    if current > target:
        new_w = round(h * target)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    if current < target:
        new_h = round(w / target)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))
    return img


def main():
    for school, filename, kind, max_edge, crop_ratio in APPROVED:
        raw = IMAGE_ROOT / school / "raw" / filename
        out_dir = IMAGE_ROOT / school / "processed"
        out_dir.mkdir(parents=True, exist_ok=True)
        suffix = "hero" if kind == "hero" else "card"
        out = out_dir / f"{Path(filename).stem}_{suffix}.jpg"

        with Image.open(raw) as img:
            prepared = resize_long_edge(img.convert("RGB"), max_edge)
            prepared = center_crop_ratio(prepared, crop_ratio)
            prepared.save(out, quality=90, optimize=True)
            print(f"{out.relative_to(ROOT.parents[3])}: {prepared.size[0]}x{prepared.size[1]}")


if __name__ == "__main__":
    main()
