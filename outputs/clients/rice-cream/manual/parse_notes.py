"""Notes.app から書き出した HTML をパースして、テキストと画像の出現順を維持したまま抽出する。

入力: _src/notes/<src>.html
出力:
  _src/notes/<src>-items.yaml   : [{type: text|img, content: text or path}, ...] in order
  _src/notes/<src>-img-NN.heic  : 画像（heic）
  _src/notes/<src>-img-NN.png   : sips で変換した png
"""
import base64
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

import yaml

NOTES_DIR = Path(__file__).parent / "_src" / "notes"


class NotesParser(HTMLParser):
    def __init__(self, src: str):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.items: list[dict] = []
        self.text_buf: list[str] = []
        self.img_count = 0

    def handle_starttag(self, tag, attrs):
        if tag == "img":
            self._flush_text()
            attrs_d = dict(attrs)
            src_val = attrs_d.get("src", "")
            if src_val.startswith("data:"):
                self._save_image(src_val)
        elif tag == "br":
            self.text_buf.append("\n")

    def handle_endtag(self, tag):
        if tag == "div":
            self.text_buf.append("\n")

    def handle_data(self, data):
        self.text_buf.append(data)

    def _flush_text(self):
        text = "".join(self.text_buf).strip()
        if text:
            self.items.append({"type": "text", "content": text})
        self.text_buf = []

    def _save_image(self, data_url: str):
        # data:image/heic;base64,xxx
        m = re.match(r"data:image/(\w+);base64,(.+)", data_url, re.DOTALL)
        if not m:
            print(f"  ! unsupported img data: {data_url[:80]}")
            return
        fmt, b64 = m.group(1), m.group(2)
        self.img_count += 1
        heic_path = NOTES_DIR / f"{self.src}-img-{self.img_count:02d}.{fmt}"
        heic_path.write_bytes(base64.b64decode(b64))
        png_path = NOTES_DIR / f"{self.src}-img-{self.img_count:02d}.png"
        # sips で heic→png 変換
        if fmt in ("heic", "jpeg", "jpg"):
            subprocess.run(
                ["sips", "-s", "format", "png", str(heic_path), "--out", str(png_path)],
                check=True,
                capture_output=True,
            )
        elif fmt == "png":
            png_path.write_bytes(heic_path.read_bytes())
        self.items.append({"type": "img", "content": str(png_path.relative_to(NOTES_DIR.parent.parent))})
        print(f"  img {self.img_count:02d}: {fmt} -> {png_path.name}")

    def finish(self):
        self._flush_text()


def parse_file(src: str) -> None:
    html_path = NOTES_DIR / f"{src}.html"
    print(f"=== {src} ({html_path.stat().st_size / 1024 / 1024:.1f}MB) ===")
    parser = NotesParser(src)
    with html_path.open("r", encoding="utf-8", errors="replace") as f:
        while chunk := f.read(1024 * 1024):
            parser.feed(chunk)
    parser.finish()

    items_path = NOTES_DIR / f"{src}-items.yaml"
    items_path.write_text(
        yaml.safe_dump(parser.items, allow_unicode=True, sort_keys=False, default_flow_style=False)
    )
    print(f"  -> {len(parser.items)} items, {parser.img_count} images")
    print(f"  meta: {items_path}")


def main() -> None:
    targets = sys.argv[1:] or ["open", "biz"]
    for src in targets:
        parse_file(src)


if __name__ == "__main__":
    main()
