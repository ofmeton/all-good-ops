#!/usr/bin/env python3
"""Build the merged Tsukasa school deck from the part builders."""

from pathlib import Path

from _deck_lib import new_presentation
from build_part1 import add_part as add_part1
from build_part2 import add_part as add_part2
from build_part3 import add_part as add_part3
from build_part4 import add_part as add_part4


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "deck.pptx"


def main():
    prs = new_presentation()
    add_part1(prs)
    add_part2(prs)
    add_part3(prs)
    add_part4(prs)
    prs.save(OUTPUT)
    print(f"Saved: {OUTPUT}")
    print(f"Total slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
