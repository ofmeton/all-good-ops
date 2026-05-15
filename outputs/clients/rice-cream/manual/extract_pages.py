"""PDF（開店準備・営業中・アイスマシーン取説）をページPNGに展開する。

出力: _src/pages/<source>-page-NNN.png
"""
import subprocess
from pathlib import Path

SOURCES = [
    ("open", "/Users/rikukudo/Downloads/RICE CREAM/マニュアル/マニュアル_開店準備.pdf"),
    ("biz", "/Users/rikukudo/Downloads/RICE CREAM/マニュアル/マニュアル_営業中.pdf"),
    ("ice", "/Users/rikukudo/Downloads/RICE CREAM/業務/manual_NA-1412AE.pdf"),
]

OUT_DIR = Path(__file__).parent / "_src" / "pages"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, pdf in SOURCES:
        print(f"extracting {name} from {pdf}")
        subprocess.run(
            [
                "pdftoppm",
                "-png",
                "-r", "150",
                pdf,
                str(OUT_DIR / f"{name}-page"),
            ],
            check=True,
        )
    print("done")


if __name__ == "__main__":
    main()
