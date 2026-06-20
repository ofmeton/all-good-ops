"""Build Kamakura High School section."""

from pathlib import Path

from _deck_lib import new_presentation
from _school_slide_helpers import add_full_bleed_hero, add_rich_feature_slide


ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = ROOT.parent / "school-images"
OUT = ROOT / "deck_part2.pptx"


def main():
    prs = new_presentation()
    add_part(prs)
    prs.save(OUT)
    print(OUT)


def add_part(prs):
    add_full_bleed_hero(
        prs,
        IMAGE_ROOT / "鎌倉" / "processed" / "wiki_fumikiri_hero.jpg",
        "鎌倉高校",
        "江ノ電の踏切の、すぐそば。",
    )
    add_rich_feature_slide(
        prs,
        "鎌倉高校",
        [
            (IMAGE_ROOT / "鎌倉" / "processed" / "wiki_campus_hero.jpg", "校舎"),
        ],
        [
            "江ノ電「鎌倉高校前」駅の踏切は、海と江の島が広がる超有名スポット（アニメの聖地で観光客も訪れる）",
            "晴れた日は校内から富士山が見える、海沿いの高台に建つ",
            "ダンス部「カマダン」や弓道部など部活が活発。行事も生徒主体でにぎやか",
            "校訓は「自主自律」。明るくのびのびした自由な校風",
        ],
        "江ノ電「鎌倉高校前」駅から徒歩すぐ",
        "出典: 神奈川県立鎌倉高等学校 公式サイト / Wikimedia Commons",
    )


if __name__ == "__main__":
    main()
