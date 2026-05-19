"""Notes.app から取得した items.yaml をベースに、正しい順序の slides.yaml を構築する。

ルール:
  - 各 text item の次に並ぶ img item をその text の写真として割り当てる
  - 1 text + 1 img → 1 slide
  - 1 text + N img → N slide (同じ heading で連番、body は (1/N) で区別)
  - 荷物リスト範囲（段ボール〜看板）は luggage グリッドに集約（slides.yaml に入れない）
  - to-claude 3指示は別途展開（manual で展開済みの形を slides.yaml に入れる）
"""
from pathlib import Path
import yaml

ROOT = Path(__file__).parent
NOTES = ROOT / "_src" / "notes"

# luggage グリッドに集約する text ラベル群
LUGGAGE_LABELS = {
    "色々入った段ボール",
    "レジ",
    "カップなどなどが入った白ケース",
    "アイスの置物",
    "グッズ類",
    "ドリンクの材料たち（左の冷蔵庫に入ってます）",
    "前日の営業で洗われたものたち",
    "テーブル&テーブルクロス",
    "看板",
}


def pair_items(items: list[dict]) -> list[dict]:
    """text item と直後の img item 群をペアにする。"""
    pairs = []
    i = 0
    while i < len(items):
        if items[i]["type"] != "text":
            i += 1
            continue
        text = items[i]["content"]
        imgs = []
        i += 1
        while i < len(items) and items[i]["type"] == "img":
            imgs.append(items[i]["content"])
            i += 1
        pairs.append({"text": text, "imgs": imgs})
    return pairs


def clean_text(text: str) -> str:
    """テキストから余分な空行を整理する。"""
    lines = [ln.strip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)


def _strip_prefix(s: str) -> str:
    """先頭の・/③/↓/数字記号を削除して見出しを綺麗に。"""
    s = s.lstrip()
    for p in ("・", "③", "②", "①", "↓", "※", "*"):
        if s.startswith(p):
            s = s[len(p):].lstrip()
    return s


def split_heading_body(text: str, max_heading_chars: int = 18) -> tuple[str, str]:
    """1行目から heading にし、長すぎる場合は句読点で分割。残りは body に流す。"""
    lines = [ln for ln in clean_text(text).split("\n") if ln.strip()]
    if not lines:
        return ("", "")
    first = _strip_prefix(lines[0])
    rest = lines[1:]
    if len(first) <= max_heading_chars:
        head = first
        body_lines = rest
    else:
        # 句点や読点で短縮
        head = first[:max_heading_chars]
        body_lines = [first[max_heading_chars:]] + rest
        for delim in ("。", "、", "）", " "):
            idx = first.find(delim, 4, max_heading_chars + 4)
            if 0 < idx <= max_heading_chars:
                head = first[: idx + 1].rstrip("。")
                tail = first[idx + 1 :].strip()
                body_lines = ([tail] if tail else []) + rest
                break
    body = "\n".join(body_lines)
    return (head, body)


def build_open_slides(open_pairs: list[dict]) -> list[dict]:
    """開店準備フェーズのスライドを構築する。"""
    slides = []
    idx = 1

    # to-claude 用 アイスマシーン取説スライドのプレースホルダ
    ice_inserted = False
    luggage_inserted = False

    for pi, pair in enumerate(open_pairs):
        text = pair["text"]
        imgs = pair["imgs"]
        cleaned = clean_text(text)
        first_line = cleaned.split("\n")[0] if cleaned else ""

        # アイスマシーン操作 to-claude
        if "アイスマシーンで停止ボタン" in cleaned:
            # ice 写真 (open-img-03.png は実物アイスマシーン) を使う + 取説引用1スライド
            slides.append(
                {
                    "id": f"open-{idx:03d}",
                    "phase": "開店準備",
                    "index": f"{idx} / TBD",
                    "photo": imgs[0] if imgs else None,
                    "heading": "アイスマシーンを起動",
                    "body": "操作パネルの「停止」ボタンを押してから、\n「運転」ボタンを押す。",
                    "info": "取扱説明書「始業時の操作」より",
                }
            )
            idx += 1
            slides.append(
                {
                    "id": f"open-{idx:03d}",
                    "phase": "開店準備",
                    "index": f"{idx} / TBD",
                    "photo": None,
                    "heading": "保冷ランプ点灯で起動完了",
                    "body": "製品出口をアルコール消毒して、\nソフトクリームが出せる状態に。",
                    "note": "製品出口の消毒を忘れない",
                }
            )
            idx += 1
            ice_inserted = True
            continue

        # 荷物リスト範囲（luggage 化）
        if first_line in LUGGAGE_LABELS:
            if not luggage_inserted:
                slides.append(
                    {
                        "id": f"open-{idx:03d}",
                        "phase": "開店準備",
                        "index": f"{idx} / TBD",
                        "photo": "_luggage_placeholder_",  # build_luggage.py で上書き
                        "heading": "下ろす荷物（一覧）",
                        "body": "2階から1階に下ろす全荷物の一覧。\n下記の通り。",
                    }
                )
                idx += 1
                luggage_inserted = True
            continue

        # 荷物リストの先頭「下ろす荷物はこれら↓」 + 段ボールが同じテキストにある → これも luggage
        if "下ろす荷物はこれら" in cleaned:
            if not luggage_inserted:
                slides.append(
                    {
                        "id": f"open-{idx:03d}",
                        "phase": "開店準備",
                        "index": f"{idx} / TBD",
                        "photo": "_luggage_placeholder_",
                        "heading": "下ろす荷物（一覧）",
                        "body": "2階から1階に下ろす全荷物の一覧。\n下記の通り。",
                    }
                )
                idx += 1
                luggage_inserted = True
            continue

        # ソフトミックス・ライスミルク行 (荷物リストの最後だが luggage に含めない、写真は別)
        if "ソフトミックス" in cleaned and "ロックアイス" in cleaned and "あれば" in cleaned:
            # ここは荷物の最後の項目だが、写真 (冷蔵庫の様子) は別途意味がある
            # luggage には含めず、別スライドとして
            for ii, img in enumerate(imgs, 1):
                slides.append(
                    {
                        "id": f"open-{idx:03d}",
                        "phase": "開店準備",
                        "index": f"{idx} / TBD",
                        "photo": img,
                        "heading": "材料の保管場所",
                        "body": "冷凍庫・冷蔵庫の保管場所。\nロックアイスもあれば。",
                    }
                )
                idx += 1
            if not imgs:
                slides.append(
                    {
                        "id": f"open-{idx:03d}",
                        "phase": "開店準備",
                        "index": f"{idx} / TBD",
                        "photo": None,
                        "heading": "ソフトミックス・ライスミルク・ロックアイス",
                        "body": "冷凍庫・冷蔵庫に。\n写真なし箇所もあるが、あれば一緒に。",
                    }
                )
                idx += 1
            continue

        # 通常: 1 text + N img → N スライド (heading 共通)
        heading, body = split_heading_body(cleaned)
        # heading 整形（先頭の・や③等の記号は残す）
        # body 整形
        body = body.strip()

        if not imgs:
            slides.append(
                {
                    "id": f"open-{idx:03d}",
                    "phase": "開店準備",
                    "index": f"{idx} / TBD",
                    "photo": None,
                    "heading": heading,
                    "body": body if body else heading,
                }
            )
            idx += 1
        else:
            for img in imgs:
                slides.append(
                    {
                        "id": f"open-{idx:03d}",
                        "phase": "開店準備",
                        "index": f"{idx} / TBD",
                        "photo": img,
                        "heading": heading,
                        "body": body if body else "",
                    }
                )
                idx += 1

    return slides


def build_biz_slides(biz_pairs: list[dict]) -> list[dict]:
    slides = []
    idx = 1
    for pair in biz_pairs:
        text = pair["text"]
        imgs = pair["imgs"]
        cleaned = clean_text(text)

        # 補給ランプ to-claude は不要（ユーザー指示で削除）
        if "補給ランプ" in cleaned:
            continue

        heading, body = split_heading_body(cleaned)
        body = body.strip()

        if not imgs:
            slides.append(
                {
                    "id": f"biz-{idx:03d}",
                    "phase": "営業中",
                    "index": f"{idx} / TBD",
                    "photo": None,
                    "heading": heading,
                    "body": body if body else heading,
                }
            )
            idx += 1
        else:
            for img in imgs:
                slides.append(
                    {
                        "id": f"biz-{idx:03d}",
                        "phase": "営業中",
                        "index": f"{idx} / TBD",
                        "photo": img,
                        "heading": heading,
                        "body": body if body else "",
                    }
                )
                idx += 1
    return slides


def finalize_index(slides: list[dict], total_count: int) -> None:
    """index フィールドを「N / total」に修正。"""
    for i, s in enumerate(slides, 1):
        s["index"] = f"{i} / {total_count}"


def main() -> None:
    open_items = yaml.safe_load((NOTES / "open-items.yaml").read_text())
    biz_items = yaml.safe_load((NOTES / "biz-items.yaml").read_text())

    open_pairs = pair_items(open_items)
    biz_pairs = pair_items(biz_items)

    open_slides = build_open_slides(open_pairs)
    biz_slides = build_biz_slides(biz_pairs)

    finalize_index(open_slides, len(open_slides))
    finalize_index(biz_slides, len(biz_slides))

    all_slides = open_slides + biz_slides
    out = {"slides": all_slides}
    (ROOT / "slides.yaml").write_text(
        yaml.safe_dump(out, allow_unicode=True, sort_keys=False, default_flow_style=False)
    )
    print(f"wrote slides.yaml: open={len(open_slides)}, biz={len(biz_slides)}")
    # luggage placeholder の slide id を出力
    luggage_ids = [s["id"] for s in open_slides if s.get("photo") == "_luggage_placeholder_"]
    print(f"luggage placeholder slide id(s): {luggage_ids}")


if __name__ == "__main__":
    main()
