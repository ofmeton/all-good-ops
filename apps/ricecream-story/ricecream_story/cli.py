"""ricecream-story の CLI。

--json は stdout に1行だけ出す（ログは stderr）。呼び出し側の claude-gateway が
subprocess で叩いてパースするので、機械可読を人間向けログと混ぜない。

  plan          営業日判定・時間・ラベル・写真候補（画像は作らない = dry-run）
  render        画像を1枚作る
  doctor        環境と config の健康診断
  contact-sheet 生成分と sample を並べた目視回帰用の1枚
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import sys
from datetime import date, datetime
from pathlib import Path

from PIL import Image, ImageDraw

from . import RENDERER_VERSION
from .config import (
    APP_DIR,
    FONT_HEADLINE,
    FONT_TEXT,
    OUT_DIR,
    SAMPLE_DIR,
    ConfigError,
    find_photo,
    load_photos,
    load_store,
    validate_hours,
)
from .photos import CANVAS_H, CANVAS_W
from .render import render, render_to_files
from .schedule import hour_presets_for, resolve

EXPECTED_PILLOW = "11.3.0"
FONT_SHA256 = {
    "PlayfairDisplay-Black.ttf": "14c4c9b95250301c04c960d79e1aba04874d0496cfa578d30165c50701fbf548",
    "PlayfairDisplay-Bold.ttf": "93f49f025833ed86a38ca85e62359675288cfc21812b3ec18bcda0c74cdfb134",
}


def _log(message: str) -> None:
    print(message, file=sys.stderr)


def _emit(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def _parse_date(value: str | None) -> date:
    if not value:
        return date.today()
    return datetime.strptime(value, "%Y-%m-%d").date()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cmd_plan(args: argparse.Namespace) -> int:
    store = load_store()
    photos = load_photos()
    day = _parse_date(args.date)
    plan = resolve(store, day, args.hours)

    payload = {
        **plan.to_dict(),
        "maps_url": store.maps_url,
        "hour_presets": hour_presets_for(store, plan.hours),
        "photos": [
            {"id": p.id, "file": p.file, "accent": p.accent, "enabled": p.enabled}
            for p in photos
        ],
        "renderer": RENDERER_VERSION,
    }
    if args.json:
        _emit(payload)
    else:
        state = plan.hours_label if plan.is_business_day else f"closed ({plan.closed_reason})"
        _log(f"{plan.date_label}  {state}")
    return 0


def cmd_render(args: argparse.Namespace) -> int:
    store = load_store()
    photos = load_photos()
    day = _parse_date(args.date)
    plan = resolve(store, day, args.hours)

    if not plan.is_business_day:
        _log(f"{plan.date_label}: closed ({plan.closed_reason}) — nothing to render")
        if args.json:
            _emit({**plan.to_dict(), "rendered": False})
        return 1

    photo = find_photo(photos, args.photo) if args.photo else photos[0]
    out_dir = Path(args.out_dir).expanduser() if args.out_dir else OUT_DIR
    result = render_to_files(store, plan, photo, out_dir)
    result["rendered"] = True
    result["pillow"] = Image.__version__

    if args.json:
        _emit(result)
    else:
        _log(f"wrote {result['png']}")
    return 0


def _source_modules() -> list[tuple[Path, ast.Module]]:
    modules = []
    for path in sorted((APP_DIR / "ricecream_story").glob("*.py")):
        modules.append((path, ast.parse(path.read_text(encoding="utf-8"))))
    return modules


def _docstring_nodes(tree: ast.Module) -> set[int]:
    """docstring の Constant ノードの id 集合。説明文が検査に引っかかるのを避ける。"""
    ids: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            body = getattr(node, "body", [])
            if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
                if isinstance(body[0].value.value, str):
                    ids.add(id(body[0].value))
    return ids


def _find_home_paths() -> list[str]:
    """文字列リテラルに絶対ホームパスが混ざっていないか。

    needle は Path.home() から導出する。ここに "/Users/" と直書きすると
    この検査自身が引っかかるし、そもそも mini では別のパスになる。
    """
    needle = f"{Path.home().parent}/"
    hits: list[str] = []
    for path, tree in _source_modules():
        skip = _docstring_nodes(tree)
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in skip:
                if needle in node.value:
                    hits.append(f"{path.name}:{node.lineno}")
    return hits


def _find_global_random() -> list[str]:
    """random.random() のようなグローバル呼び出し。両機で出力が変わる。"""
    hits: list[str] = []
    for path, tree in _source_modules():
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.Attribute)
                and isinstance(node.value, ast.Name)
                and node.value.id == "random"
                and node.attr != "Random"
            ):
                hits.append(f"{path.name}:{node.lineno}")
    return hits


def _find_builtin_hash() -> list[str]:
    """組み込み hash() は PYTHONHASHSEED 依存。seed には hashlib を使う。"""
    hits: list[str] = []
    for path, tree in _source_modules():
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "hash":
                hits.append(f"{path.name}:{node.lineno}")
    return hits


def cmd_doctor(args: argparse.Namespace) -> int:
    checks: list[tuple[str, bool, str]] = []

    checks.append(
        ("pillow", Image.__version__ == EXPECTED_PILLOW, f"{Image.__version__} (want {EXPECTED_PILLOW})")
    )

    for font_path in (FONT_HEADLINE, FONT_TEXT):
        if not font_path.exists():
            checks.append((f"font {font_path.name}", False, "missing — run scripts/build-fonts.sh"))
            continue
        actual = _sha256(font_path)
        want = FONT_SHA256[font_path.name]
        checks.append((f"font {font_path.name}", actual == want, actual[:16]))

    try:
        store = load_store()
        checks.append(("config store.json", True, f"{len(store.business_weekdays)} business weekdays"))
    except (ConfigError, OSError, ValueError) as error:
        store = None
        checks.append(("config store.json", False, str(error)))

    try:
        photos = load_photos()
        missing = [p.file for p in photos if not p.path.exists()]
        checks.append(("config photos.json", not missing, f"{len(photos)} photos, missing={missing}"))
    except (ConfigError, OSError, ValueError) as error:
        checks.append(("config photos.json", False, str(error)))

    samples = sorted(SAMPLE_DIR.glob("*.jpg"))
    checks.append(("samples", bool(samples), f"{len(samples)} files"))

    for label, finder in (
        ("no absolute home paths", _find_home_paths),
        ("no global random", _find_global_random),
        ("no builtin hash()", _find_builtin_hash),
    ):
        hits = finder()
        checks.append((label, not hits, ", ".join(hits) if hits else "clean"))

    ok = all(passed for _, passed, _ in checks)
    if args.json:
        _emit({"ok": ok, "checks": [{"name": n, "ok": p, "detail": d} for n, p, d in checks]})
    else:
        for name, passed, detail in checks:
            _log(f"{'PASS' if passed else 'FAIL'}  {name:28} {detail}")
        _log("")
        _log("doctor: " + ("ok" if ok else "problems found"))
    return 0 if ok else 1


def cmd_contact_sheet(args: argparse.Namespace) -> int:
    store = load_store()
    photos = load_photos()
    day = _parse_date(args.date)
    plan = resolve(store, day, args.hours or store.hour_presets[0])

    thumb_w, thumb_h = CANVAS_W // 4, CANVAS_H // 4
    tiles: list[tuple[str, Image.Image]] = []
    for photo in photos:
        tiles.append((photo.id, render(store, plan, photo).resize((thumb_w, thumb_h), Image.LANCZOS)))
    for path in sorted(SAMPLE_DIR.glob("*.jpg")):
        with Image.open(path) as opened:
            tiles.append((f"sample {path.stem[:6]}", opened.convert("RGB").resize((thumb_w, thumb_h), Image.LANCZOS)))

    columns = 6
    rows = (len(tiles) + columns - 1) // columns
    label_h = 22
    sheet = Image.new("RGB", (columns * thumb_w, rows * (thumb_h + label_h)), (250, 250, 248))
    draw = ImageDraw.Draw(sheet)
    for index, (label, tile) in enumerate(tiles):
        col, row = index % columns, index // columns
        x, y = col * thumb_w, row * (thumb_h + label_h)
        sheet.paste(tile, (x, y + label_h))
        draw.text((x + 4, y + 4), label, fill=(60, 60, 58))

    out_path = Path(args.out).expanduser() if args.out else OUT_DIR / "contact-sheet.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, "PNG")
    _log(f"wrote {out_path} ({len(tiles)} tiles: {len(photos)} rendered + {len(tiles) - len(photos)} samples)")
    if args.json:
        _emit({"path": str(out_path), "tiles": len(tiles)})
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ricecream_story.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_json(target: argparse.ArgumentParser) -> None:
        target.add_argument(
            "--json", action="store_true", help="machine-readable single line on stdout"
        )

    def add_common(target: argparse.ArgumentParser) -> None:
        add_json(target)
        target.add_argument("--date", help="YYYY-MM-DD (default: today)")
        target.add_argument("--hours", type=lambda v: validate_hours(v, "--hours"), help="HH:MM-HH:MM")

    plan_parser = sub.add_parser("plan", help="resolve business day and hours only")
    add_common(plan_parser)
    plan_parser.set_defaults(func=cmd_plan)

    render_parser = sub.add_parser("render", help="render one story image")
    add_common(render_parser)
    render_parser.add_argument("--photo", help="photo id (default: first in photos.json)")
    render_parser.add_argument("--out-dir")
    render_parser.set_defaults(func=cmd_render)

    doctor_parser = sub.add_parser("doctor", help="check environment and config")
    add_json(doctor_parser)
    doctor_parser.set_defaults(func=cmd_doctor)

    sheet_parser = sub.add_parser("contact-sheet", help="rendered + sample thumbnails in one image")
    add_common(sheet_parser)
    sheet_parser.add_argument("--out")
    sheet_parser.set_defaults(func=cmd_contact_sheet)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except (ConfigError, ValueError, OSError) as error:
        _log(f"error: {error}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
