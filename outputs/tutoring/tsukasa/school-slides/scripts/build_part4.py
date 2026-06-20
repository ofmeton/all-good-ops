"""Build Hakuyo High School section."""

from pathlib import Path

from _deck_lib import new_presentation
from _school_slide_helpers import add_contained_hero, add_feature_slide


ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT.parent / "school-images"
OUT = ROOT / "deck_part4.pptx"


def main():
    prs = new_presentation()
    add_part(prs)
    prs.save(OUT)
    print(OUT)


def add_part(prs):
    add_contained_hero(
        prs,
        IMAGE_ROOT / "柏陽" / "processed" / "wiki_campus_hero.jpg",
        "柏陽高校",
        "自分でテーマを決めて、とことん掘る学校",
    )
    add_feature_slide(
        prs,
        IMAGE_ROOT,
        "柏陽",
        "柏陽高校",
        [
            "校訓は「己を拓く」。校則はゆるめで、自主性を大事にする自由な空気",
            "理科の研究が特色（SSH）。「柏陽の知」で一年かけて自分のテーマを研究できる",
            "横浜・栄区、本郷台駅エリア（大船から根岸線で行ける）",
        ],
        "JR根岸線「本郷台」駅から（大船から一本）",
        "出典: 神奈川県立柏陽高等学校 公式サイト / Wikimedia Commons",
    )


if __name__ == "__main__":
    main()
