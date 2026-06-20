"""Build Ofuna High School section."""

from pathlib import Path

from _deck_lib import new_presentation
from _school_slide_helpers import add_full_bleed_hero, add_rich_feature_slide


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
        "和の施設がそろう、大船の大きな学校。",
    )
    add_rich_feature_slide(
        prs,
        "大船高校",
        [
            (IMAGE_ROOT / "大船" / "processed" / "wiki_sportsday_card.jpg", "体育祭（六国祭）"),
            (IMAGE_ROOT / "大船" / "processed" / "wiki_kannon_card.jpg", "大船のシンボル・大船観音"),
        ],
        [
            "能舞台付きの視聴覚室・純和風庭園・弓道場など、ちょっと珍しい和の施設がそろう",
            "文化祭「白帆祭」・体育祭「六国祭」は大規模校ならではの活気。応援団やチアも盛り上がる",
            "部活・同好会が三十近く、加入率も高い（演劇部は全国大会の常連）",
            "大船駅から徒歩。藤沢・鎌倉どちらからも通いやすい",
        ],
        "大船駅から徒歩",
        "出典: 神奈川県立大船高等学校 公式サイト / Wikimedia Commons",
    )


if __name__ == "__main__":
    main()
