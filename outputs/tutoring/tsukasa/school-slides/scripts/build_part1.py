"""Build pilot deck: cover plus two Shichirigahama slides."""

from pathlib import Path

from pptx.enum.text import MSO_ANCHOR
from pptx.util import Inches

from _deck_lib import (
    ACCENT_BG,
    LIGHT_GRAY,
    MID_GRAY,
    NAVY,
    ORANGE,
    SEA_BG,
    SEA_PALE,
    SOFT_GRAY,
    TEAL,
    TEAL_DARK,
    TEXT,
    WHITE,
    add_rect,
    add_shape,
    add_text,
    blank,
    footer,
    hero,
    new_presentation,
    photo_card,
)
from pptx.enum.shapes import MSO_SHAPE


ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT.parent / "school-images"
OUT = ROOT / "deck_part1.pptx"


def add_cover(prs):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=SEA_BG)
    add_shape(s, MSO_SHAPE.OVAL, Inches(8.7), Inches(-0.4), Inches(4.8), Inches(4.8), fill=SEA_PALE, line=SEA_PALE)
    add_shape(s, MSO_SHAPE.OVAL, Inches(-0.7), Inches(5.1), Inches(4.2), Inches(4.2), fill=ACCENT_BG, line=ACCENT_BG)
    add_rect(s, Inches(0.68), Inches(0.58), Inches(0.18), Inches(5.25), fill=TEAL, radius=True)
    add_text(
        s,
        "高校、こんなところがあるよ",
        Inches(1.05),
        Inches(2.35),
        Inches(10.8),
        Inches(0.88),
        size=38,
        bold=True,
        color=NAVY,
        line_spacing=1.0,
    )
    add_text(
        s,
        "写真でゆっくり眺める、湘南エリアの高校紹介",
        Inches(1.08),
        Inches(3.34),
        Inches(9.4),
        Inches(0.46),
        size=18,
        color=TEAL_DARK,
        line_spacing=1.0,
    )
    add_text(
        s,
        "七里ヶ浜高校 / 鎌倉高校 / 大船高校 / 柏陽高校",
        Inches(1.1),
        Inches(4.34),
        Inches(8.5),
        Inches(0.36),
        size=13,
        color=MID_GRAY,
    )
    add_rect(s, Inches(1.08), Inches(5.2), Inches(3.0), Inches(0.06), fill=ORANGE, radius=True)
    footer(s, prs, text="家庭教師つかさ本人向け 私的教材", page="")


def add_shichiri_hero(prs):
    s = blank(prs)
    path = IMAGE_ROOT / "七里ヶ浜" / "processed" / "wiki_campus_hero.jpg"
    hero(s, path, "七里ヶ浜高校", "海と江の島が見える、坂の上の学校")


def bullet_item(slide, text, top):
    x = Inches(0.72)
    add_shape(slide, MSO_SHAPE.OVAL, x, top + Inches(0.13), Inches(0.20), Inches(0.20), fill=TEAL, line=TEAL)
    add_text(
        slide,
        text,
        Inches(1.28),
        top,
        Inches(6.35),
        Inches(0.58),
        size=18,
        bold=True,
        color=TEXT,
        line_spacing=1.18,
    )


def add_shichiri_features(prs):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=SEA_BG)
    add_rect(s, 0, 0, prs.slide_width, Inches(0.10), fill=TEAL)
    add_text(
        s,
        "七里ヶ浜高校",
        Inches(0.72),
        Inches(0.46),
        Inches(6.4),
        Inches(0.42),
        size=24,
        bold=True,
        color=NAVY,
    )
    add_text(
        s,
        "写真と一緒に見る、学校の空気",
        Inches(0.74),
        Inches(0.96),
        Inches(5.6),
        Inches(0.28),
        size=11,
        color=MID_GRAY,
    )

    bullet_item(s, "教室から相模湾と江の島が一望できる、海沿いの立地", Inches(1.72))
    bullet_item(s, "校訓は「自学自習・自主自律」。自分で考えて動く自由な空気", Inches(2.72))
    bullet_item(s, "文化祭「七高祭」・体育祭「七里ンピック」は生徒が主役。野外ステージで盛り上がる行事も", Inches(3.72))

    add_rect(s, Inches(0.72), Inches(5.15), Inches(6.8), Inches(0.62), fill=WHITE, line=LIGHT_GRAY, radius=True)
    add_text(
        s,
        "江ノ電「七里ヶ浜」駅から徒歩すぐ",
        Inches(1.02),
        Inches(5.34),
        Inches(6.2),
        Inches(0.24),
        size=15,
        bold=True,
        color=TEAL_DARK,
        anchor=MSO_ANCHOR.MIDDLE,
    )

    photo_card(
        s,
        IMAGE_ROOT / "七里ヶ浜" / "processed" / "shichirinpic_card.jpg",
        Inches(8.05),
        Inches(1.52),
        Inches(4.62),
        Inches(2.72),
        caption="体育祭（七里ンピック）",
    )
    add_text(
        s,
        "出典: 神奈川県立七里ヶ浜高等学校 公式サイト / Wikimedia Commons",
        Inches(0.72),
        Inches(6.82),
        Inches(10.8),
        Inches(0.22),
        size=8,
        color=SOFT_GRAY,
    )


def main():
    prs = new_presentation()
    add_part(prs)
    prs.save(OUT)
    print(OUT)


def add_part(prs):
    add_cover(prs)
    add_shichiri_hero(prs)
    add_shichiri_features(prs)


if __name__ == "__main__":
    main()
