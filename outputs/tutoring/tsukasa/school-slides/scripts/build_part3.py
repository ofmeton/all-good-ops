"""Build Ofuna High School section."""

from pathlib import Path

from _deck_lib import new_presentation
from _school_slide_helpers import add_feature_slide, add_full_bleed_hero


ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT.parent / "school-images"
OUT = ROOT / "deck_part3.pptx"


def main():
    prs = new_presentation()
    add_part(prs)
    prs.save(OUT)
    print(OUT)


def add_part(prs):
    add_full_bleed_hero(
        prs,
        IMAGE_ROOT / "大船" / "processed" / "wiki_campus_hero.jpg",
        "大船高校",
        "駅から近くて、行事が盛り上がる学校",
    )
    add_feature_slide(
        prs,
        IMAGE_ROOT,
        "大船",
        "大船高校",
        [
            "大船駅から徒歩。藤沢・鎌倉どちらからも通いやすい近さ",
            "自習室・図書館など施設が充実、落ち着いて過ごせる",
            "文化祭「白帆祭」・体育祭「六国祭」は応援団やチアまで本気",
        ],
        "大船駅から徒歩",
        "出典: 神奈川県立大船高等学校 公式サイト / Wikimedia Commons",
    )


if __name__ == "__main__":
    main()
