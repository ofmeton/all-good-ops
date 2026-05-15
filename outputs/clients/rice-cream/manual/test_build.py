"""build.py のユニットテスト。実画像の見た目はテストしない（サイズ・色域のみ）。"""
from PIL import Image
import build


def test_canvas_size_and_white():
    img = build.make_canvas()
    assert img.size == (1080, 1920)
    assert img.mode == "RGB"
    assert img.getpixel((0, 0)) == (255, 255, 255)


def test_header_draws_dark_band():
    img = build.make_canvas()
    build.draw_header(img, phase="開店準備", index="1 / 38")
    px = img.getpixel((540, 20))
    assert px != (255, 255, 255), f"ヘッダ帯が白のまま: {px}"


def test_paste_photo_fits_in_photo_area(tmp_path):
    photo_path = tmp_path / "dummy.png"
    Image.new("RGB", (1000, 500), (200, 50, 50)).save(photo_path)
    img = build.make_canvas()
    build.paste_photo(img, str(photo_path))
    px = img.getpixel((540, 600))
    assert px[0] > 100 and px[1] < 100, f"写真が貼られていない: {px}"


def test_draw_text_block_renders_heading_body():
    img = build.make_canvas()
    build.draw_text_block(
        img,
        heading="鍵を開ける",
        body="キーボックスから鍵を取り出してドアを開ける",
    )
    found_dark = False
    for x in range(40, 1040, 30):
        for y in range(1380, 1900, 30):
            if img.getpixel((x, y)) != (255, 255, 255):
                found_dark = True
                break
    assert found_dark, "文字が描かれていない"


def test_draw_note_band_red():
    img = build.make_canvas()
    build.draw_note_band(img, kind="note", text="暗証番号は「0025」")
    found_red = False
    for y in range(1700, 1900, 20):
        px = img.getpixel((540, y))
        if px[0] > 150 and px[1] < 100 and px[2] < 100:
            found_red = True
            break
    assert found_red, "赤帯が見つからない"


def test_draw_note_band_blue():
    img = build.make_canvas()
    build.draw_note_band(img, kind="info", text="あれば追加してOK")
    found_blue = False
    for y in range(1700, 1900, 20):
        px = img.getpixel((540, y))
        if px[2] > 150 and px[0] < 100:
            found_blue = True
            break
    assert found_blue, "青帯が見つからない"


def test_text_only_uses_photo_area_for_text():
    img = build.make_canvas()
    build.draw_text_only(
        img,
        heading="写真未撮影",
        body="ここは追加撮影後にスライド差し替えます。",
    )
    found = False
    for x in range(40, 1040, 40):
        for y in range(200, 1200, 40):
            if img.getpixel((x, y)) != (255, 255, 255):
                found = True
                break
    assert found, "テキストオンリー時に写真領域が文字に転用されていない"


def test_render_slide_with_photo(tmp_path):
    photo = tmp_path / "p.png"
    Image.new("RGB", (800, 600), (50, 200, 50)).save(photo)
    slide = {
        "id": "open-001",
        "phase": "開店準備",
        "index": "1 / 38",
        "photo": str(photo),
        "heading": "鍵を開ける",
        "body": "キーボックスから取り出す",
        "note": "暗証番号は「0025」",
    }
    img = build.render_slide(slide)
    assert img.size == (1080, 1920)


def test_render_slide_text_only():
    slide = {
        "id": "open-002",
        "phase": "開店準備",
        "index": "2 / 38",
        "photo": None,
        "heading": "未撮影箇所",
        "body": "後で写真を差し込みます",
    }
    img = build.render_slide(slide)
    assert img.size == (1080, 1920)
