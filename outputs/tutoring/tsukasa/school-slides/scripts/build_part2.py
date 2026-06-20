"""Build Kamakura High School section."""

from pathlib import Path

from _deck_lib import new_presentation
from _school_slide_helpers import add_feature_slide, add_full_bleed_hero


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
        IMAGE_ROOT / "鎌倉" / "processed" / "wiki_campus_hero.jpg",
        "鎌倉高校",
        "「青春日本一」を名乗る、自由な学校",
    )
    add_feature_slide(
        prs,
        IMAGE_ROOT,
        "鎌倉",
        "鎌倉高校",
        [
            "江ノ電沿線。晴れた日は校内から富士山が見える",
            "「自主自律」を大事に、生徒主体でいろいろ動く校風",
            "ダンス部「カマダン」が名物。部活も行事もエネルギッシュ",
        ],
        "七里ヶ浜と同じ江ノ電沿線エリア（鎌倉・大船から）",
        "出典: 神奈川県立鎌倉高等学校 公式サイト / Wikimedia Commons",
    )


if __name__ == "__main__":
    main()
