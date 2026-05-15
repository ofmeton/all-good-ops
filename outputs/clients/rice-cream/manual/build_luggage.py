"""2階の荷物グリッドスライド（open-006）を生成する。

slides.yaml には含まれない。build.py の出力と並行して生成。
工藤指示「ものをくり抜いて1ページにまとめて見させたい」(透過なし・トリミングのみ)。
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import build

# 1階に下ろす荷物（page 5-10 の検出写真から選ぶ）。
# 写真がない品目はラベルだけのセルを置く。
ITEMS = [
    ("段ボール", "_src/photos/open-05-1.png"),
    ("レジ", "_src/photos/open-06-1.png"),
    ("白ケース", "_src/photos/open-07-1.png"),
    ("テーブル&クロス", "_src/photos/open-08-1.png"),
    ("ドリンク材料", "_src/photos/open-09-1.png"),
    ("洗い物", "_src/photos/open-10-1.png"),
    ("ソフトミックス", None),
    ("ライスミルク", None),
    ("ロックアイス", None),
]

OUT = Path(__file__).parent / "open-006.png"
LABEL_SIZE = 32
LABEL_PAD = 8


def main() -> None:
    img = build.make_canvas()
    build.draw_header(img, phase="開店準備", index="6 / 29")

    cols, rows = 3, 3
    cell_w = build.CANVAS_W // cols
    cell_h = build.PHOTO_AREA_H // rows
    draw = ImageDraw.Draw(img)
    f_label = ImageFont.truetype(build.FONT_HEAVY, LABEL_SIZE)

    for i, (label, fname) in enumerate(ITEMS):
        col = i % cols
        row = i // cols
        x0 = col * cell_w
        y0 = build.PHOTO_TOP + row * cell_h

        if fname:
            src = Path(__file__).parent / fname
            p = Image.open(src).convert("RGB")
            margin = 12
            avail_w = cell_w - margin * 2
            avail_h = cell_h - margin * 2 - LABEL_SIZE - LABEL_PAD
            scale = min(avail_w / p.width, avail_h / p.height)
            new_w = max(1, int(p.width * scale))
            new_h = max(1, int(p.height * scale))
            p = p.resize((new_w, new_h), Image.LANCZOS)
            img.paste(p, (x0 + (cell_w - new_w) // 2, y0 + margin))
        else:
            # 写真なし: 中央に「写真なし」を薄字で
            f_no = ImageFont.truetype(build.FONT_REG, 28)
            no_text = "写真なし"
            bbox = draw.textbbox((0, 0), no_text, font=f_no)
            tw = bbox[2] - bbox[0]
            draw.text(
                (x0 + (cell_w - tw) // 2, y0 + cell_h // 2 - 40),
                no_text,
                fill=(160, 160, 160),
                font=f_no,
            )

        # ラベル（セル下部、中央寄せ）
        bbox = draw.textbbox((0, 0), label, font=f_label)
        lw = bbox[2] - bbox[0]
        draw.text(
            (x0 + (cell_w - lw) // 2, y0 + cell_h - LABEL_SIZE - LABEL_PAD),
            label,
            fill=build.COLOR_TEXT,
            font=f_label,
        )

    # 文字領域
    build.draw_text_block(
        img,
        heading="下ろす荷物（全9種）",
        body="2階から1階に下ろす荷物のリスト。",
    )

    img.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
