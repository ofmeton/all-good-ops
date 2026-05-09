#!/usr/bin/env python3
"""Build Part 2 (市況・業界構造の変化, 20p) of Marketing Catch-Up 2023-2026 deck.

Output: outputs/documents/marketing-catchup-2023-2026/deck_part2.pptx
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part2.pptx"

# Page number base (Part 2 starts at P11)
PNUM_BASE = 10


def pagenum(local):
    """Return formatted page number string like 'P11 / 250'."""
    return f"P{PNUM_BASE + local:02d} / 250"


# ---------- Slide builders ----------
def p11_divider(prs):
    part_divider(
        prs, 2, "市況・業界構造の変化",
        "2年半で業界地図は書き換えられた",
        "Cookieの『廃止→撤回→実質終了』の3幕劇、LINEヤフー統合、AI検索の勃興、\n"
        "代理店業界の再編まで。個別媒体の話に入る前に、業界の地殻変動を俯瞰する。",
        [
            "2024年 日本広告市場の構造",
            "Cookie / Privacy Sandbox の終焉",
            "Consent Mode v2 の実務",
            "LINEヤフー統合 2023→2026",
            "景表法ステマ規制・EU DSA",
            "生成AIの3波とAI検索",
            "代理店再編と運用職シフト",
            "Part 3 への橋渡し",
        ],
    )


def p12_market_structure(prs):
    s = blank(prs)
    page_frame(s, prs, "2024年 日本広告市場の構造",
               "電通『2024年 日本の広告費』(2025/02/27)", pagenum(2))

    # Left big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(4.0), Inches(5.3),
             fill=NAVY, radius=True)
    add_text(s, "2024年 総広告費", Inches(0.85), Inches(1.75),
             Inches(3.5), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s, "7.67", Inches(0.85), Inches(2.25),
             Inches(3.0), Inches(1.2),
             size=72, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "兆円", Inches(3.3), Inches(2.9), Inches(1.0), Inches(0.6),
             size=22, bold=True, color=WHITE)
    add_text(s, "前年比 +4.9%\n3年連続で過去最高更新",
             Inches(0.85), Inches(3.8), Inches(3.5), Inches(0.7),
             size=11, color=LIGHT_GRAY, line_spacing=1.4)
    # Split box
    add_rect(s, Inches(0.85), Inches(4.7), Inches(3.5), Inches(0.015),
             fill=ORANGE)
    add_text(s, "ネット広告シェア", Inches(0.85), Inches(4.85),
             Inches(3.5), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    add_text(s, "47.6%", Inches(0.85), Inches(5.2), Inches(3.5), Inches(1.0),
             size=56, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "= 3兆6,517億円 (+9.6%)",
             Inches(0.85), Inches(6.15), Inches(3.5), Inches(0.35),
             size=11, color=LIGHT_GRAY)
    add_text(s, "媒体費は 2兆9,611億円 (+10.2%)",
             Inches(0.85), Inches(6.45), Inches(3.5), Inches(0.3),
             size=10, color=SOFT_GRAY)

    # Right: structure table
    add_text(s, "媒体別内訳 (2024年, 億円)",
             Inches(5.0), Inches(1.55), Inches(7.0), Inches(0.4),
             size=12, bold=True, color=NAVY)

    rows = [
        ("インターネット広告", "36,517", "+9.6%", ORANGE, True),
        ("テレビメディア", "17,034", "-1.1%", NAVY, False),
        ("プロモーションメディア", "14,959", "+0.4%", NAVY, False),
        ("新聞", "3,351", "-3.6%", MID_GRAY, False),
        ("雑誌", "2,072", "-2.8%", MID_GRAY, False),
        ("ラジオ", "1,063", "+0.8%", MID_GRAY, False),
    ]
    row_y = Inches(2.1)
    for i, (name, val, chg, color, featured) in enumerate(rows):
        y = row_y + Inches(0.68) * i
        bg = ACCENT_BG if featured else (LIGHT if i % 2 == 1 else WHITE)
        add_rect(s, Inches(5.0), y, Inches(7.75), Inches(0.6),
                 fill=bg, line=LIGHT_GRAY, radius=True)
        # Color dot
        add_rect(s, Inches(5.15), y + Inches(0.19), Inches(0.22), Inches(0.22),
                 fill=color, radius=True)
        add_text(s, name, Inches(5.5), y + Inches(0.17),
                 Inches(3.8), Inches(0.4),
                 size=12, bold=featured, color=NAVY)
        add_text(s, val, Inches(9.3), y + Inches(0.17),
                 Inches(1.8), Inches(0.4),
                 size=14, bold=True, color=color, align=PP_ALIGN.RIGHT,
                 font=EN_FONT)
        add_text(s, chg, Inches(11.2), y + Inches(0.19),
                 Inches(1.5), Inches(0.4),
                 size=11, color=MID_GRAY, align=PP_ALIGN.RIGHT,
                 font=EN_FONT)

    # Bottom note
    add_text(s,
             "💡 ネット広告媒体費 2兆9,611億円の内訳は P13 で詳述。リテールメディア・動画広告が牽引",
             Inches(5.0), Inches(6.65), Inches(7.75), Inches(0.3),
             size=10, color=MID_GRAY)

    footer(s, prs)


def p13_operational_vs_mass(prs):
    s = blank(prs)
    page_frame(s, prs, "運用型広告がマス4媒体を超える構造",
               "2021年以降の構造転換が定着", pagenum(3))

    # Big takeaway
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.85),
             fill=ACCENT_BG, radius=True)
    add_text(s, "🔥",
             Inches(0.85), Inches(1.65), Inches(0.6), Inches(0.6),
             size=22)
    add_text(s, "運用型ネット広告費 ≒ 2.5兆円 > マス4媒体合計 ≒ 2.4兆円",
             Inches(1.45), Inches(1.6), Inches(11), Inches(0.5),
             size=20, bold=True, color=NAVY)
    add_text(s, "2021年に逆転、以降その差は拡大傾向",
             Inches(1.45), Inches(2.05), Inches(11), Inches(0.3),
             size=11, color=MID_GRAY)

    # Bar comparison
    add_text(s, "運用型 vs マス4媒体 (2024年, 億円)",
             Inches(0.6), Inches(2.65), Inches(8), Inches(0.4),
             size=12, bold=True, color=NAVY)

    bars = [
        ("運用型ネット広告", 24931, ORANGE, "検索+ディスプレイ+SNS+動画+その他"),
        ("マス4媒体合計", 23520, NAVY, "テレビ 17,034 + 新聞 3,351 + 雑誌 2,072 + ラジオ 1,063"),
    ]
    max_val = max(v for _, v, _, _ in bars)
    by = Inches(3.2)
    for i, (label, val, color, note) in enumerate(bars):
        y = by + Inches(1.1) * i
        add_text(s, label, Inches(0.6), y, Inches(3.5), Inches(0.35),
                 size=13, bold=True, color=color)
        # Bar
        bar_w = int(Inches(6.5) * (val / max_val))
        add_rect(s, Inches(4.2), y + Inches(0.05), Emu(bar_w),
                 Inches(0.6), fill=color, radius=True)
        add_text(s, f"{val:,}", Inches(4.3) + Emu(bar_w),
                 y + Inches(0.15), Inches(1.5), Inches(0.4),
                 size=14, bold=True, color=color,
                 font=EN_FONT)
        add_text(s, note, Inches(0.6), y + Inches(0.72),
                 Inches(11), Inches(0.3),
                 size=10, color=MID_GRAY)

    # Key observations
    add_text(s, "構造的ドライバー", Inches(0.6), Inches(5.6),
             Inches(12), Inches(0.4),
             size=12, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.95), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    obs = [
        ("01", "動画広告の急伸", "TikTok / YouTube Shorts / Meta Reels の縦型が牽引"),
        ("02", "AI配信キャンペーンの成熟", "PMax / Advantage+ / Smart+ で運用工数が激減"),
        ("03", "リテールメディア拡大", "Amazon / 楽天 / Yahoo!ショッピング広告が新勢力"),
    ]
    cx = Inches(0.6)
    cy = Inches(6.15)
    cw = Inches(3.95)
    ch = Inches(0.9)
    gap = Inches(0.15)
    for i, (n, title, body) in enumerate(obs):
        x = cx + (cw + gap) * i
        add_rect(s, x, cy, cw, ch, fill=LIGHT, radius=True)
        add_text(s, n, x + Inches(0.2), cy + Inches(0.08),
                 Inches(0.6), Inches(0.35),
                 size=18, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, x + Inches(0.9), cy + Inches(0.12),
                 cw - Inches(1.0), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.2), cy + Inches(0.5),
                 cw - Inches(0.3), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.35)

    footer(s, prs)


def p14_retail_media(prs):
    s = blank(prs)
    page_frame(s, prs, "リテールメディアの台頭",
               "Retail Media Network (RMN) が新勢力として確立", pagenum(4))

    # Definition callout
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.9),
             fill=NAVY, radius=True)
    add_text(s, "RMN =", Inches(0.85), Inches(1.65), Inches(1.5), Inches(0.6),
             size=22, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "購買データを持つEC/小売事業者が、自社面・他社面で広告を売るネットワーク。\n"
             "検索CVR・商品詳細ページCVRが極めて高く、ラストクリック計測が効きやすい。",
             Inches(2.1), Inches(1.6), Inches(10.5), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.4)

    # 3-pillar
    pillars = [
        ("Amazon Ads", "$569億 (2024) ※要確認",
         "世界広告売上 Google/Meta に次ぐ3位。\n"
         "Sponsored Products / Brands / Display.\n"
         "DSP / AMC (Amazon Marketing Cloud)"),
        ("楽天Ads", "国内シェア上位",
         "楽天市場出店者向け RPP/CPA/CPC広告。\n"
         "楽天RMP - Display Ads が新設。\n"
         "購買履歴+検索履歴で精緻"),
        ("Yahoo!ショッピング広告", "LINEヤフー傘下",
         "ストアページ広告 / アイテムマッチ / ブランドサーチ。\n"
         "2026春統合の LINEヤフー広告 に内包予定"),
    ]
    px = Inches(0.6)
    py = Inches(2.65)
    pw = Inches(3.95)
    ph = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, stat, body) in enumerate(pillars):
        x = px + (pw + gap) * i
        add_rect(s, x, py, pw, ph, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, py, pw, Inches(0.15), fill=ORANGE)
        add_text(s, name, x + Inches(0.3), py + Inches(0.3),
                 pw - Inches(0.6), Inches(0.5),
                 size=18, bold=True, color=NAVY)
        add_text(s, stat, x + Inches(0.3), py + Inches(0.85),
                 pw - Inches(0.6), Inches(0.35),
                 size=11, bold=True, color=ORANGE_DARK)
        add_rect(s, x + Inches(0.3), py + Inches(1.25), pw - Inches(0.6),
                 Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, body, x + Inches(0.3), py + Inches(1.4),
                 pw - Inches(0.6), ph - Inches(1.5),
                 size=11, color=TEXT, line_spacing=1.5)

    # Why this matters
    add_rect(s, Inches(0.6), Inches(5.9), Inches(12.15), Inches(1.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業運用代行の観点", Inches(0.85), Inches(6.05),
             Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Google/Meta/TikTok に加えて『クライアントの販売チャネル依存でリテールメディア』が標準。\n"
             "EC案件なら Amazon Ads / 楽天Ads の運用経験が強い差別化になる。",
             Inches(0.85), Inches(6.4), Inches(12), Inches(0.5),
             size=11, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p15_video_surge(prs):
    s = blank(prs)
    page_frame(s, prs, "動画広告の急伸と縦型の覇権",
               "ネット広告費の最大セグメントは『動画』に", pagenum(5))

    # Stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(5.5), Inches(5.3),
             fill=LIGHT, radius=True)
    add_text(s, "2024年 日本のビデオ広告費",
             Inches(0.85), Inches(1.75), Inches(5), Inches(0.4),
             size=12, bold=True, color=NAVY)
    add_text(s, "9,300+", Inches(0.85), Inches(2.25), Inches(4.5),
             Inches(1.2), size=68, bold=True, color=ORANGE,
             font=EN_FONT)
    add_text(s, "億円 (推計)", Inches(0.85), Inches(3.5),
             Inches(4), Inches(0.4),
             size=16, bold=True, color=NAVY)
    add_text(s,
             "※ 電通2024レポートより筆者推計\n"
             "ネット広告媒体費の約31%が動画",
             Inches(0.85), Inches(4.0), Inches(5), Inches(0.7),
             size=10, color=MID_GRAY, line_spacing=1.4)

    # 3 key shifts
    add_text(s, "動画広告の3つのシフト",
             Inches(0.85), Inches(4.9), Inches(5), Inches(0.35),
             size=12, bold=True, color=NAVY)
    add_rect(s, Inches(0.85), Inches(5.25), Inches(5), Inches(0.015),
             fill=LIGHT_GRAY)
    shifts_side = [
        ("①", "横型 → 縦型9:16 が主流"),
        ("②", "インストリーム → インフィード型"),
        ("③", "ブランディング → 購買導線"),
    ]
    for i, (n, t) in enumerate(shifts_side):
        y = Inches(5.4) + Inches(0.38) * i
        add_text(s, n, Inches(0.85), y, Inches(0.5), Inches(0.35),
                 size=14, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, t, Inches(1.4), y, Inches(4.5), Inches(0.35),
                 size=11, color=TEXT)

    # Right: platform grid
    add_text(s, "主要縦型動画プラットフォーム",
             Inches(6.3), Inches(1.55), Inches(6.5), Inches(0.4),
             size=12, bold=True, color=NAVY)

    platforms = [
        ("TikTok", "10代-30代\nB2C エンタメ/美容/Z世代",
         "Smart+ / Symphony AI / Shop Ads",
         ORANGE),
        ("YouTube\nShorts", "幅広い層\n動画全年代",
         "Demand Gen / Video Reach Campaign",
         NAVY),
        ("Meta\nReels", "Instagram+Facebook\n20-50代",
         "Advantage+ Creative / 自動動画生成",
         NAVY_SOFT),
        ("LINE\nVOOM", "日本特化\nLINEユーザーベース",
         "LINE広告 VOOM面配信",
         ORANGE_DARK),
    ]
    gx = Inches(6.3)
    gy = Inches(2.1)
    gw = Inches(3.15)
    gh = Inches(2.15)
    ggap = Inches(0.2)
    for i, (name, audience, features, color) in enumerate(platforms):
        r, c = divmod(i, 2)
        x = gx + (gw + ggap) * c
        y = gy + (gh + ggap) * r
        add_rect(s, x, y, gw, gh, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.12), gh, fill=color)
        add_text(s, name, x + Inches(0.3), y + Inches(0.2),
                 gw - Inches(0.4), Inches(0.7),
                 size=15, bold=True, color=NAVY, line_spacing=1.1)
        add_text(s, audience, x + Inches(0.3), y + Inches(0.95),
                 gw - Inches(0.4), Inches(0.65),
                 size=10, color=MID_GRAY, line_spacing=1.35)
        add_text(s, features, x + Inches(0.3), y + Inches(1.55),
                 gw - Inches(0.4), Inches(0.6),
                 size=10, bold=True, color=ORANGE_DARK, line_spacing=1.3)

    # Bottom
    add_text(s, "→ 媒体別の詳細は Part 3 (TikTok / YouTube / Meta / LINE)",
             Inches(0.6), Inches(6.95), Inches(12), Inches(0.3),
             size=10, color=MID_GRAY)
    footer(s, prs)


def p16_att_timeline(prs):
    s = blank(prs)
    page_frame(s, prs, "iOS/ATT シグナル減の系譜",
               "2021年から2026年までの4年半", pagenum(6))

    # Horizontal timeline (inset to keep labels within slide)
    tl_y = Inches(3.3)
    tl_x1 = Inches(1.7)
    tl_x2 = Inches(11.6)
    # Main line
    add_rect(s, tl_x1, tl_y, tl_x2 - tl_x1, Inches(0.08), fill=NAVY)

    events = [
        ("2021/04", "iOS 14.5\nATT 実装", "App Tracking Transparency 開始", False),
        ("2022", "Meta 影響\n公表", "計測困難・CPA高騰の影響確定", False),
        ("2023/07", "Consent Mode v2\n発表", "Google が後継仕様発表", False),
        ("2024/03", "Consent Mode v2\nEEA義務化", "EUで実装必須化", True),
        ("2024/07", "Cookie廃止\n撤回", "Google 方針転換", True),
        ("2025/10", "Privacy Sandbox\n実質終了", "Google 大半の技術を廃止", True),
    ]
    seg = (tl_x2 - tl_x1) / (len(events) - 1)
    for i, (date, title, desc, major) in enumerate(events):
        x = tl_x1 + seg * i
        # Dot
        dot_color = ORANGE if major else NAVY
        dot_size = Inches(0.35) if major else Inches(0.22)
        add_rect(s, x - dot_size / 2, tl_y + Inches(0.04) - dot_size / 2 + Inches(0.04),
                 dot_size, dot_size, fill=dot_color, radius=True)
        # Date (above)
        is_above = i % 2 == 0
        if is_above:
            add_text(s, date, x - Inches(0.75), Inches(2.1),
                     Inches(1.5), Inches(0.3),
                     size=11, bold=True, color=dot_color,
                     align=PP_ALIGN.CENTER, font=EN_FONT)
            add_text(s, title, x - Inches(1.0), Inches(2.4),
                     Inches(2), Inches(0.6),
                     size=12, bold=True, color=NAVY,
                     align=PP_ALIGN.CENTER, line_spacing=1.2)
            add_text(s, desc, x - Inches(1.25), Inches(3.02),
                     Inches(2.5), Inches(0.4),
                     size=9, color=MID_GRAY,
                     align=PP_ALIGN.CENTER, line_spacing=1.3)
            # Vertical connector
            add_rect(s, x - Inches(0.01), Inches(3.05),
                     Inches(0.015), tl_y - Inches(3.05),
                     fill=LIGHT_GRAY)
        else:
            add_text(s, date, x - Inches(0.75), tl_y + Inches(0.35),
                     Inches(1.5), Inches(0.3),
                     size=11, bold=True, color=dot_color,
                     align=PP_ALIGN.CENTER, font=EN_FONT)
            add_text(s, title, x - Inches(1.0), tl_y + Inches(0.65),
                     Inches(2), Inches(0.6),
                     size=12, bold=True, color=NAVY,
                     align=PP_ALIGN.CENTER, line_spacing=1.2)
            add_text(s, desc, x - Inches(1.25), tl_y + Inches(1.27),
                     Inches(2.5), Inches(0.4),
                     size=9, color=MID_GRAY,
                     align=PP_ALIGN.CENTER, line_spacing=1.3)
            # Vertical connector
            add_rect(s, x - Inches(0.01), tl_y + Inches(0.12),
                     Inches(0.015), Inches(0.55),
                     fill=LIGHT_GRAY)

    # Conclusion
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "結論", Inches(0.85), Inches(5.55), Inches(3), Inches(0.35),
             size=14, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Cookieの "
             "「廃止予定 → 撤回 → Privacy Sandbox 実質終了」 "
             "という3幕を経て、"
             "3rd Party Cookie は Chrome に残存することになった。\n"
             "しかし ATT 以降のシグナル減少自体は続いており、"
             "CAPI / Enhanced Conversions / SGTM / 1PD は依然として業界標準である。",
             Inches(0.85), Inches(5.95), Inches(12), Inches(1.0),
             size=12, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p17_cookie_reversal(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Google Cookie廃止『撤回』 2024/07/22",
               "6年越しの Privacy Sandbox 計画が方向転換", pagenum(7))

    # Big announcement card
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "📢",
             Inches(0.85), Inches(1.75), Inches(0.8), Inches(0.8),
             size=30)
    add_text(s, "Google 公式発表 (Privacy Sandbox Blog)",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "Chromeで3rd Party Cookieを廃止する計画を撤回。\n"
             "代わりにユーザーが Cookie 利用を選択できる新UIを提供する",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.7),
             size=14, bold=True, color=WHITE, line_spacing=1.45)

    # Why reverted
    add_text(s, "なぜ撤回したか", Inches(0.6), Inches(3.0),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.35), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    reasons = [
        ("初期テストでの収益ショック",
         "Google Ad Manager -34% / AdSense -21% (publisher側)"),
        ("規制当局の継続的懸念",
         "UK CMA / EU Commission / 米DOJ から競争上の懸念"),
        ("業界の反発",
         "広告業界・publishers が Cookie依存から抜け出せず"),
    ]
    for i, (head, body) in enumerate(reasons):
        y = Inches(3.55) + Inches(0.95) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.85),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, f"0{i+1}", Inches(0.8), y + Inches(0.12),
                 Inches(0.6), Inches(0.4),
                 size=20, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, head, Inches(1.6), y + Inches(0.12),
                 Inches(4.3), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, Inches(1.6), y + Inches(0.45),
                 Inches(4.3), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.35)

    # What it means
    add_text(s, "運用者にとっての含意", Inches(7.0),
             Inches(3.0), Inches(5.8), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(7.0), Inches(3.35), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    implications = [
        ("✓", "Cookie計測は当面使える", "3PCD待ちの実装延期は不要"),
        ("✗", "だが シグナル減は戻らない", "ATT / 各国規制 / ブラウザ固有制限は継続"),
        ("→", "CAPI / SGTM / 1PD は必須", "業界標準は変わらない、移行は進行中"),
    ]
    for i, (mark, head, body) in enumerate(implications):
        y = Inches(3.55) + Inches(0.95) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.85),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, mark, Inches(7.2), y + Inches(0.12),
                 Inches(0.5), Inches(0.4),
                 size=22, bold=True, color=ORANGE, align=PP_ALIGN.CENTER)
        add_text(s, head, Inches(7.85), y + Inches(0.12),
                 Inches(4.5), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, Inches(7.85), y + Inches(0.45),
                 Inches(4.8), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.35)

    # Source
    add_text(s,
             "出典: Google Privacy Sandbox Blog (2024/07/22) / Digiday / The Hacker News",
             Inches(0.6), Inches(6.95), Inches(12), Inches(0.3),
             size=9, color=SOFT_GRAY)
    footer(s, prs)


def p18_privacy_sandbox_end(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Privacy Sandbox 実質終了 2025/10/17",
               "3rd Party Cookie 問題の『6年の旅』が終結", pagenum(8))

    # Announcement
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=WARN, radius=True)
    add_text(s, "⚠",
             Inches(0.85), Inches(1.75), Inches(0.8), Inches(0.8),
             size=30)
    add_text(s, "Google公式 (2025/10/17) : Privacy Sandbox Update",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=WHITE)
    add_text(s,
             "Privacy Sandbox の大半の技術を廃止。『小さな機能セットと標準化に注力』へ転換。\n"
             "採用率の低さと規制当局の懸念が理由",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.7),
             size=13, bold=True, color=WHITE, line_spacing=1.45)

    # 2 col: 廃止 vs 継続
    add_text(s, "廃止される技術 (Retired)",
             Inches(0.6), Inches(3.0), Inches(5.8), Inches(0.35),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(0.6), Inches(3.35), Inches(5.8), Inches(0.015),
             fill=LIGHT_GRAY)
    retired = [
        ("Protected Audience API", "旧FLEDGE。リマーケ用途"),
        ("Topics API", "カテゴリベースターゲティング"),
        ("Attribution Reporting API", "計測用途"),
        ("Related Website Sets", "同一運営サイトの識別"),
        ("Shared Storage / Private Aggregation",
         "クロスサイト集計"),
    ]
    for i, (name, desc) in enumerate(retired):
        y = Inches(3.55) + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(5.8), Inches(0.5),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "✗", Inches(0.8), y + Inches(0.1),
                 Inches(0.4), Inches(0.35),
                 size=16, bold=True, color=WARN)
        add_text(s, name, Inches(1.2), y + Inches(0.1),
                 Inches(2.8), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, desc, Inches(4.0), y + Inches(0.14),
                 Inches(2.2), Inches(0.3),
                 size=10, color=MID_GRAY)

    # Right: 継続
    add_text(s, "継続する技術 (Continue)",
             Inches(6.9), Inches(3.0), Inches(5.8), Inches(0.35),
             size=13, bold=True, color=SUCCESS)
    add_rect(s, Inches(6.9), Inches(3.35), Inches(5.85), Inches(0.015),
             fill=LIGHT_GRAY)
    continued = [
        ("CHIPS",
         "Cookie Having Independent Partitioned State。Cookie分離"),
        ("FedCM",
         "Federated Credential Management。SSO 認証"),
    ]
    for i, (name, desc) in enumerate(continued):
        y = Inches(3.55) + Inches(0.9) * i
        add_rect(s, Inches(6.9), y, Inches(5.85), Inches(0.85),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "✓", Inches(7.1), y + Inches(0.2),
                 Inches(0.4), Inches(0.4),
                 size=18, bold=True, color=SUCCESS)
        add_text(s, name, Inches(7.55), y + Inches(0.12),
                 Inches(4.5), Inches(0.35),
                 size=13, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, desc, Inches(7.55), y + Inches(0.45),
                 Inches(5), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.35)

    # Right bottom: key stat
    add_rect(s, Inches(6.9), Inches(5.45), Inches(5.85), Inches(1.4),
             fill=NAVY, radius=True)
    add_text(s, "結果 :", Inches(7.1), Inches(5.55),
             Inches(3), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    add_text(s,
             "3rd Party Cookie は Chrome に無期限残存。\n"
             "廃止タイムラインは未定",
             Inches(7.1), Inches(5.85), Inches(5.6), Inches(0.95),
             size=13, bold=True, color=WHITE, line_spacing=1.4)

    add_text(s,
             "出典: Google Privacy Sandbox Blog (2025/10/17) / Search Engine Land / AdExchanger",
             Inches(0.6), Inches(6.95), Inches(12), Inches(0.3),
             size=9, color=SOFT_GRAY)
    footer(s, prs)


def p19_consent_mode_v2(prs):
    s = blank(prs)
    page_frame(s, prs, "Consent Mode v2 の義務化と日本実務",
               "2024/03/06 EEA 内で義務化", pagenum(9))

    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s, "Consent Mode v2 とは",
             Inches(0.85), Inches(1.65), Inches(6), Inches(0.35),
             size=12, bold=True, color=NAVY)
    add_text(s,
             "ユーザーの同意状態を Google 広告・分析プロダクトに伝える仕組み。\n"
             "同意がない場合はモデルベースで推計、同意がある場合は正確な計測データを送信する",
             Inches(0.85), Inches(2.0), Inches(12), Inches(0.55),
             size=11, color=TEXT, line_spacing=1.4)

    # 4 consent parameters
    add_text(s, "4 つの同意パラメータ",
             Inches(0.6), Inches(2.75), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.1), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    params = [
        ("ad_storage", "広告Cookieの使用",
         "広告計測・リマーケ・コンバージョンに使用"),
        ("ad_user_data", "ユーザーデータのGoogle共有",
         "顧客データ(メール/電話)をGoogleに送るか"),
        ("ad_personalization",
         "広告パーソナライズ", "履歴に基づくターゲティング可否"),
        ("analytics_storage",
         "分析Cookie使用", "GA4計測Cookieの保存可否"),
    ]
    for i, (key, label, body) in enumerate(params):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (Inches(6.08)) * c
        y = Inches(3.3) + (Inches(1.15)) * r
        add_rect(s, x, y, Inches(5.95), Inches(1.0),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), Inches(1.0), fill=ORANGE)
        add_text(s, key, x + Inches(0.3), y + Inches(0.12),
                 Inches(3), Inches(0.35),
                 size=13, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, label, x + Inches(0.3), y + Inches(0.45),
                 Inches(5.5), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.3), y + Inches(0.7),
                 Inches(5.5), Inches(0.3),
                 size=9, color=MID_GRAY)

    # 実務 impact
    add_rect(s, Inches(0.6), Inches(5.75), Inches(12.15), Inches(1.15),
             fill=ACCENT_BG, radius=True)
    add_text(s, "日本実務への影響",
             Inches(0.85), Inches(5.88), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• EEA外（日本）は義務ではないが、グローバル企業は同実装が事実上標準\n"
             "• CMP (Cookiebot / OneTrust / usercentrics / TrustArc) 導入案件が2024-2025で急増\n"
             "• 運用者側: ad_personalization 無効時のビッド低下・DDAモデルの精度低下を説明できる必要",
             Inches(0.85), Inches(6.22), Inches(12), Inches(0.65),
             size=11, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p20_ly_timeline(prs):
    s = blank(prs)
    page_frame(s, prs, "LINEヤフー統合タイムライン 2023 → 2026",
               "日本広告市場の構造変化を時系列で把握", pagenum(10))

    # Horizontal timeline (inset to keep labels within slide)
    tl_y = Inches(3.5)
    tl_x1 = Inches(1.7)
    tl_x2 = Inches(11.6)
    add_rect(s, tl_x1, tl_y, tl_x2 - tl_x1, Inches(0.08), fill=NAVY)

    events = [
        ("2023/10/01", "LINEヤフー\n発足",
         "LINE/ヤフー等5社合併", False),
        ("2023/10/02", "コネクトワン\n構想発表",
         "LINE+Yahoo! ID統合ロードマップ", False),
        ("2024/07", "DSP/LAP\n統合開始",
         "ディスプレイ配信面の統合", True),
        ("2024/10/04", "アカウント\n連携開始",
         "LINE+Yahoo!アカウントの一元化", False),
        ("2025/06/30", "ビジネスID\n統合",
         "広告管理画面の共通ID", True),
        ("2026/春", "LINEヤフー\n広告 統合",
         "単一プラットフォームへ完成", True),
    ]
    seg = (tl_x2 - tl_x1) / (len(events) - 1)
    for i, (date, title, desc, major) in enumerate(events):
        x = tl_x1 + seg * i
        dot_color = ORANGE if major else NAVY
        dot_size = Inches(0.35) if major else Inches(0.22)
        add_rect(s, x - dot_size / 2,
                 tl_y + Inches(0.04) - dot_size / 2 + Inches(0.04),
                 dot_size, dot_size, fill=dot_color, radius=True)
        is_above = i % 2 == 0
        if is_above:
            add_text(s, date, x - Inches(0.9), Inches(2.2),
                     Inches(1.8), Inches(0.3),
                     size=10, bold=True, color=dot_color,
                     align=PP_ALIGN.CENTER, font=EN_FONT)
            add_text(s, title, x - Inches(1.1), Inches(2.5),
                     Inches(2.2), Inches(0.6),
                     size=12, bold=True, color=NAVY,
                     align=PP_ALIGN.CENTER, line_spacing=1.2)
            add_text(s, desc, x - Inches(1.25), Inches(3.15),
                     Inches(2.5), Inches(0.35),
                     size=9, color=MID_GRAY,
                     align=PP_ALIGN.CENTER, line_spacing=1.3)
            add_rect(s, x - Inches(0.01), Inches(3.15),
                     Inches(0.015), tl_y - Inches(3.15),
                     fill=LIGHT_GRAY)
        else:
            add_text(s, date, x - Inches(0.9), tl_y + Inches(0.35),
                     Inches(1.8), Inches(0.3),
                     size=10, bold=True, color=dot_color,
                     align=PP_ALIGN.CENTER, font=EN_FONT)
            add_text(s, title, x - Inches(1.1), tl_y + Inches(0.65),
                     Inches(2.2), Inches(0.6),
                     size=12, bold=True, color=NAVY,
                     align=PP_ALIGN.CENTER, line_spacing=1.2)
            add_text(s, desc, x - Inches(1.25), tl_y + Inches(1.27),
                     Inches(2.5), Inches(0.35),
                     size=9, color=MID_GRAY,
                     align=PP_ALIGN.CENTER, line_spacing=1.3)
            add_rect(s, x - Inches(0.01), tl_y + Inches(0.12),
                     Inches(0.015), Inches(0.55),
                     fill=LIGHT_GRAY)

    # Reach stat at bottom
    add_rect(s, Inches(0.6), Inches(5.55), Inches(12.15), Inches(1.35),
             fill=NAVY, radius=True)
    add_text(s, "統合後リーチ",
             Inches(0.85), Inches(5.7), Inches(4), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    add_text(s, "94%", Inches(0.85), Inches(5.98),
             Inches(2.5), Inches(0.7),
             size=42, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "of 国内スマートフォンユーザー (重複除く)",
             Inches(3.2), Inches(6.05), Inches(9), Inches(0.35),
             size=13, color=WHITE)
    add_text(s,
             "Yahoo! の検索データ + LINE のチャット行動データの結合で\n"
             "ターゲティング精度が向上、広告効果も改善傾向",
             Inches(3.2), Inches(6.38), Inches(9), Inches(0.5),
             size=10, color=LIGHT_GRAY, line_spacing=1.35)

    footer(s, prs)


def p21_ly_impact(prs):
    s = blank(prs)
    page_frame(s, prs, "LINEヤフー広告 統合の実務インパクト",
               "運用者が押さえるべき変化ポイント", pagenum(11))

    # Left: Before / After comparison
    add_text(s, "Before (2023)",
             Inches(0.6), Inches(1.5), Inches(6), Inches(0.4),
             size=14, bold=True, color=MID_GRAY)
    add_text(s, "After (2026 春~)",
             Inches(7.0), Inches(1.5), Inches(6), Inches(0.4),
             size=14, bold=True, color=ORANGE)

    before = [
        "Yahoo!広告管理画面で別運用",
        "LINE広告マネージャで別運用",
        "データ連携なし (別ID)",
        "在庫・面を横断できない",
        "別々に予算設定・レポート作成",
    ]
    after = [
        "LINEヤフー広告（統合管理画面）",
        "横断で配信面を指定可",
        "Yahoo!検索データ + LINE行動データ",
        "ビジネスID で一元管理",
        "統合レポート・横断最適化",
    ]
    for i, item in enumerate(before):
        y = Inches(1.95) + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.5),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "✗", Inches(0.8), y + Inches(0.1),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=WARN)
        add_text(s, item, Inches(1.2), y + Inches(0.13),
                 Inches(4.8), Inches(0.3),
                 size=11, color=MID_GRAY)

    for i, item in enumerate(after):
        y = Inches(1.95) + Inches(0.55) * i
        add_rect(s, Inches(7.0), y, Inches(5.85), Inches(0.5),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "✓", Inches(7.2), y + Inches(0.1),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=SUCCESS)
        add_text(s, item, Inches(7.6), y + Inches(0.13),
                 Inches(4.8), Inches(0.3),
                 size=11, color=NAVY)

    # Bottom: ad formats
    add_text(s, "主要広告フォーマット (統合後)",
             Inches(0.6), Inches(5.0), Inches(12), Inches(0.4),
             size=12, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.35), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    formats = [
        ("ディスプレイ", "YDA + LAP統合。\nYahoo!面+LINE面+提携サイト"),
        ("検索", "Yahoo!検索広告。\nAIアシスト機能追加"),
        ("LINE公式アカウント", "友だち獲得・\nメッセージ配信"),
        ("LINE特有面", "トーク上部 / LINE NEWS /\nVOOM / ウォレット"),
    ]
    fx = Inches(0.6)
    fy = Inches(5.55)
    fw = Inches(2.95)
    fh = Inches(1.35)
    gap = Inches(0.1)
    for i, (name, body) in enumerate(formats):
        x = fx + (fw + gap) * i
        add_rect(s, x, fy, fw, fh, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, fy, fw, Inches(0.1), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), fy + Inches(0.2),
                 fw - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.2), fy + Inches(0.55),
                 fw - Inches(0.4), Inches(0.75),
                 size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p22_stealth_marketing(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 景表法ステマ規制 2023/10/01 施行",
               "事業者が広告であることを明示する義務", pagenum(12))

    # Header
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.2),
             fill=NAVY, radius=True)
    add_text(s, "法的根拠",
             Inches(0.85), Inches(1.65), Inches(3), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    add_text(s, "景品表示法 第5条第3号 告示 (消費者庁)",
             Inches(0.85), Inches(1.95), Inches(12), Inches(0.35),
             size=14, bold=True, color=WHITE)
    add_text(s,
             "告示公布 2023/03/28 / 施行 2023/10/01 / 違反は措置命令・課徴金の対象",
             Inches(0.85), Inches(2.3), Inches(12), Inches(0.3),
             size=11, color=LIGHT_GRAY)

    # What & Who
    add_text(s, "規制される表示",
             Inches(0.6), Inches(2.95), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.3), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    add_rect(s, Inches(0.6), Inches(3.5), Inches(6), Inches(1.5),
             fill=LIGHT, radius=True)
    add_text(s,
             "事業者が自己の供給する商品または役務について行う表示であって、\n"
             "一般消費者が広告と判別することが困難なもの",
             Inches(0.85), Inches(3.7), Inches(5.7), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.5)

    add_text(s, "規制対象", Inches(7.0), Inches(2.95),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(7.0), Inches(3.3), Inches(5.8), Inches(0.015),
             fill=LIGHT_GRAY)
    actors = [
        ("事業者 (広告主)", True, "規制の対象 = 違反時は措置命令・課徴金"),
        ("インフルエンサー・発信者",
         False, "規制対象ではない (景表法上)"),
    ]
    for i, (name, target, desc) in enumerate(actors):
        y = Inches(3.5) + Inches(0.8) * i
        add_rect(s, Inches(7.0), y, Inches(5.8), Inches(0.7),
                 fill=ACCENT_BG if target else LIGHT,
                 line=LIGHT_GRAY, radius=True)
        add_text(s, "✓" if target else "✗",
                 Inches(7.2), y + Inches(0.2),
                 Inches(0.4), Inches(0.4),
                 size=18, bold=True,
                 color=ORANGE if target else MID_GRAY)
        add_text(s, name, Inches(7.7), y + Inches(0.12),
                 Inches(4.5), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, desc, Inches(7.7), y + Inches(0.42),
                 Inches(4.8), Inches(0.3),
                 size=10, color=TEXT)

    # PR表記 examples
    add_rect(s, Inches(0.6), Inches(5.2), Inches(12.15), Inches(1.75),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業運用代行での実務", Inches(0.85), Inches(5.35),
             Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "インフルエンサー案件・アフィリエイト案件では PR表記の徹底をクライアントに助言。\n"
             "推奨表記: #PR / #広告 / #スポンサード / #タイアップ / [広告] / [提供:〇〇] など\n"
             "不適切表記: 表記なし、感想風装、小さすぎる文字、スクロールで見えなくなる位置",
             Inches(0.85), Inches(5.75), Inches(12), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.55)

    footer(s, prs)


def p23_eu_dsa(prs):
    s = blank(prs)
    page_frame(s, prs, "EU DSA (Digital Services Act) 2024/02/17 全面適用",
               "広告の透明性・子ども保護・センシティブデータ禁止", pagenum(13))

    # Summary
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.85),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "EU域内の広告・AdTech 全事業者に影響。"
             "VLOPs/VLOSEs (超大規模プラットフォーム) には特に厳しい義務",
             Inches(0.85), Inches(1.7), Inches(12), Inches(0.55),
             size=12, bold=True, color=ORANGE_DARK, line_spacing=1.4)

    # 3 columns: 禁止 / 透明性 / 罰則
    cols = [
        ("禁止されるターゲティング",
         WARN,
         [
             ("子ども (18歳未満)",
              "TikTok/Meta/Snapchat 既に対応済"),
             ("センシティブデータ",
              "人種・政治・宗教・性的指向・健康等"),
             ("プロファイリング基盤",
              "上記カテゴリを推定するML禁止"),
         ]),
        ("義務付けられる透明性",
         ORANGE,
         [
             ("広告であることの明示",
              "\"ad\"ラベル必須"),
             ("広告主・資金源の開示",
              "誰が払ったか・なぜ配信されたか"),
             ("VLOPs 広告レポジトリ",
              "全広告を公開APIで閲覧可能に"),
         ]),
        ("主な罰則事例",
         NAVY,
         [
             ("X (Twitter)",
              "EUR 45百万 (広告レポジトリ違反)"),
             ("Meta",
              "調査中 (広告関連複数)"),
             ("最大罰金",
              "全世界年間売上の6%"),
         ]),
    ]
    cx = Inches(0.6)
    cy = Inches(2.55)
    cw = Inches(3.95)
    ch = Inches(3.8)
    gap = Inches(0.15)
    for i, (title, color, items) in enumerate(cols):
        x = cx + (cw + gap) * i
        add_rect(s, x, cy, cw, ch, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, cy, cw, Inches(0.6), fill=color)
        add_text(s, title, x + Inches(0.2), cy + Inches(0.15),
                 cw - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=WHITE)
        for j, (head, body) in enumerate(items):
            y = cy + Inches(0.85) + Inches(0.95) * j
            add_rect(s, x + Inches(0.2), y,
                     cw - Inches(0.4), Inches(0.015),
                     fill=LIGHT_GRAY)
            add_text(s, head, x + Inches(0.2), y + Inches(0.1),
                     cw - Inches(0.4), Inches(0.3),
                     size=11, bold=True, color=NAVY)
            add_text(s, body, x + Inches(0.2), y + Inches(0.4),
                     cw - Inches(0.4), Inches(0.5),
                     size=10, color=TEXT, line_spacing=1.35)

    # Japan implication
    add_rect(s, Inches(0.6), Inches(6.5), Inches(12.15), Inches(0.45),
             fill=NAVY, radius=True)
    add_text(s,
             "💡 日本発でEU配信する場合も対象。グローバル配信のクライアントには事前説明必須",
             Inches(0.85), Inches(6.58), Inches(12), Inches(0.35),
             size=11, bold=True, color=WHITE)

    footer(s, prs)


def p24_us_state_laws(prs):
    s = blank(prs)
    page_frame(s, prs, "米国のプライバシー規制 ─ 州法の乱立",
               "連邦法なきまま州別対応が現実解", pagenum(14))

    # Map note
    add_text(s, "2026年時点で 20州以上が包括プライバシー法を施行",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    # State list table
    rows_header = ["施行年", "主な州法", "特徴"]
    col_widths = [Inches(2), Inches(4.5), Inches(5.65)]
    col_x = [Inches(0.6), Inches(2.6), Inches(7.1)]
    add_rect(s, Inches(0.6), Inches(2.1), Inches(12.15), Inches(0.55),
             fill=NAVY)
    for i, h in enumerate(rows_header):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(2.22),
                 col_widths[i] - Inches(0.2), Inches(0.4),
                 size=11, bold=True, color=WHITE)

    state_rows = [
        ("2020 / 2023強化", "CCPA → CPRA (California)",
         "消費者データアクセス権・削除権・オプトアウト権"),
        ("2023", "VCDPA (Virginia) / CPA (Colorado)",
         "CCPA準拠 + 影響評価義務"),
        ("2023-2024", "UCPA (Utah) / CTDPA (Connecticut)",
         "企業規模・収益閾値ベース"),
        ("2024", "Texas DPSA / Florida FDBR",
         "広範囲の事業者をカバー"),
        ("2024-2026", "その他 15州以上",
         "Oregon/Montana/Tennessee/Delaware/Iowa/Indiana 等"),
    ]
    for i, (yr, law, feat) in enumerate(state_rows):
        y = Inches(2.65) + Inches(0.7) * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.65),
                 fill=bg, line=LIGHT_GRAY)
        add_text(s, yr, col_x[0] + Inches(0.15), y + Inches(0.15),
                 col_widths[0] - Inches(0.2), Inches(0.4),
                 size=10, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, law, col_x[1] + Inches(0.15), y + Inches(0.15),
                 col_widths[1] - Inches(0.2), Inches(0.4),
                 size=11, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, feat, col_x[2] + Inches(0.15), y + Inches(0.17),
                 col_widths[2] - Inches(0.2), Inches(0.4),
                 size=10, color=TEXT)

    # Implications
    add_text(s, "運用実務への影響", Inches(0.6), Inches(6.35),
             Inches(12), Inches(0.35),
             size=12, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(6.7), Inches(12.15), Inches(0.25),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "CMP (Consent Management Platform) で州別対応 + グローバル統合運用が現実解",
             Inches(0.85), Inches(6.75), Inches(12), Inches(0.25),
             size=10, bold=True, color=ORANGE_DARK)

    footer(s, prs)


def p25_genai_3waves(prs):
    s = blank(prs)
    page_frame(s, prs, "生成AIの広告業界インパクト ─ 3波",
               "2023 → 2024 → 2025-: 段階的に仕事が書き換わる", pagenum(15))

    waves = [
        ("第1波", "2023", "コピー生成",
         "ChatGPT / Claude / Gemini",
         "運用者の広告文作成工数が激減。\nテキスト系クリエイティブが民主化"),
        ("第2波", "2024", "画像・動画生成",
         "Midjourney / DALL·E / Firefly / Sora / Veo / Runway",
         "クリエイティブ制作そのものが変容。\nデザイナー役割の再定義"),
        ("第3波", "2025-", "運用AI / エージェント",
         "PMax / Advantage+ / Smart+ / Claude Computer Use / Operator",
         "運用オペレーション自体が自動化。\n運用職は『AIを導く』役へ"),
    ]
    top = Inches(1.55)
    w = Inches(4.0)
    h = Inches(5.0)
    gap = Inches(0.1)

    for i, (name, year, topic, tools, impact) in enumerate(waves):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.1),
                 w - Inches(0.6), Inches(0.35),
                 size=14, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, year, x + Inches(0.3), top + Inches(0.4),
                 w - Inches(0.6), Inches(0.35),
                 size=20, bold=True, color=WHITE, font=EN_FONT)
        add_text(s, topic, x + Inches(0.3), top + Inches(1.05),
                 w - Inches(0.6), Inches(0.6),
                 size=20, bold=True, color=NAVY, line_spacing=1.2)
        add_rect(s, x + Inches(0.3), top + Inches(1.75),
                 w - Inches(0.6), Inches(0.015),
                 fill=ORANGE)
        # Tools box
        add_text(s, "代表的ツール",
                 x + Inches(0.3), top + Inches(1.9),
                 w - Inches(0.6), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, tools, x + Inches(0.3), top + Inches(2.2),
                 w - Inches(0.6), Inches(1.3),
                 size=11, color=TEXT, line_spacing=1.4, font=EN_FONT)
        # Impact
        add_text(s, "広告業界インパクト",
                 x + Inches(0.3), top + Inches(3.55),
                 w - Inches(0.6), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, impact, x + Inches(0.3), top + Inches(3.85),
                 w - Inches(0.6), Inches(1.0),
                 size=11, color=TEXT, line_spacing=1.5)

    # Common pattern
    add_rect(s, Inches(0.6), Inches(6.65), Inches(12.15), Inches(0.35),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "共通パターン : 各波で『AIを導く』人間の介在が減少、差別化は意思決定と翻訳に移動",
             Inches(0.85), Inches(6.7), Inches(12), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)

    footer(s, prs)


def p26_ai_search(prs):
    s = blank(prs)
    page_frame(s, prs, "AI検索の勃興 2024→2026",
               "『青いリンク』検索の終わりの始まり", pagenum(16))

    # 4 key players
    players = [
        ("Google\nAI Overview",
         "2024/05/14",
         "Google検索結果上部にAI要約を表示。\n"
         "従来の青いリンクトラフィックを一部置換。\n"
         "影響: SEOでの情報収集型クエリのトラフィック減"),
        ("ChatGPT\nSearch",
         "2024/10",
         "ChatGPT内の Web検索機能。\n"
         "ユーザーはリンク列挙でなく回答で消費。\n"
         "OpenAI Search Experience 内の広告枠も登場予定"),
        ("Perplexity",
         "2023-2024急成長",
         "直接回答型検索エンジン。\n"
         "情報源明示付き。広告枠を2024年から導入。\n"
         "企業契約型 Perplexity Enterprise Pro"),
        ("Claude + Web",
         "2025",
         "Anthropic Claude の Web検索機能。\n"
         "プロフェッショナル用途で支持"),
    ]
    px = Inches(0.6)
    py = Inches(1.55)
    pw = Inches(2.95)
    ph = Inches(4.2)
    gap = Inches(0.1)

    for i, (name, date, body) in enumerate(players):
        x = px + (pw + gap) * i
        add_rect(s, x, py, pw, ph, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, py, pw, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), py + Inches(0.3),
                 pw - Inches(0.4), Inches(0.8),
                 size=14, bold=True, color=NAVY, line_spacing=1.2)
        add_text(s, date, x + Inches(0.2), py + Inches(1.25),
                 pw - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE, font=EN_FONT)
        add_rect(s, x + Inches(0.2), py + Inches(1.6),
                 pw - Inches(0.4), Inches(0.015),
                 fill=LIGHT_GRAY)
        add_text(s, body, x + Inches(0.2), py + Inches(1.75),
                 pw - Inches(0.4), ph - Inches(1.9),
                 size=10, color=TEXT, line_spacing=1.5)

    # Impact stat
    add_rect(s, Inches(0.6), Inches(5.9), Inches(12.15), Inches(1.05),
             fill=NAVY, radius=True)
    add_text(s, "SEO への影響",
             Inches(0.85), Inches(6.0), Inches(4), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    add_text(s,
             "情報収集型クエリで -10% 〜 -30% のクリック減が観測される事例多数。\n"
             "ブランド検索・Transactional クエリは影響軽微 (※測定手法・業界で差) ※要確認",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.6),
             size=11, color=WHITE, line_spacing=1.45)

    footer(s, prs)


def p27_geo(prs):
    s = blank(prs)
    page_frame(s, prs, "GEO (Generative Engine Optimization)",
               "LLMに引用される情報源になる新しい最適化領域", pagenum(17))

    # Definition
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=LIGHT, radius=True)
    add_text(s, "GEO とは",
             Inches(0.85), Inches(1.65), Inches(3), Inches(0.3),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Generative Engine Optimization。Google AI Overview / ChatGPT Search /\n"
             "Perplexity 等の LLM検索が『回答で引用する情報源』になるための最適化技術。\n"
             "SEOの後継/拡張として2024年後半から急速に用語定着",
             Inches(0.85), Inches(1.95), Inches(12), Inches(0.85),
             size=11, color=TEXT, line_spacing=1.5)

    # Key tactics
    add_text(s, "主な手法",
             Inches(0.6), Inches(3.0), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.35), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    tactics = [
        ("01", "構造化データ・FAQ形式",
         "Schema.org / HowTo / FAQPage。\nLLMが抽出しやすい形式"),
        ("02", "権威性・専門家監修",
         "E-E-A-T準拠。\n著者プロフ・資格・実績を明示"),
        ("03", "明確な因果・数字",
         "曖昧さを排し、数値・比較を提示。\nLLM が引用しやすい文"),
        ("04", "llms.txt",
         "2024末-2025導入。\nrobots.txt の LLM版"),
        ("05", "Reddit / Quora シグナル",
         "LLM 学習データ上での露出。\nコミュニティ発信の重要度↑"),
        ("06", "ブランドワード化",
         "『〇〇といえば〇〇』の\n言及文脈を増やす"),
    ]
    tx = Inches(0.6)
    ty = Inches(3.45)
    tw = Inches(3.95)
    th = Inches(1.5)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (n, title, body) in enumerate(tactics):
        r, c = divmod(i, 3)
        x = tx + (tw + gap_x) * c
        y = ty + (th + gap_y) * r
        add_rect(s, x, y, tw, th, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, n, x + Inches(0.2), y + Inches(0.15),
                 Inches(0.6), Inches(0.35),
                 size=20, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, x + Inches(0.85), y + Inches(0.2),
                 tw - Inches(1.0), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.2), y + Inches(0.6),
                 tw - Inches(0.4), th - Inches(0.7),
                 size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p28_agency_reshuffle(prs):
    s = blank(prs)
    page_frame(s, prs, "代理店業界の再編 2024-2026",
               "内製化・省人化・成果報酬シフト", pagenum(18))

    # Three major shifts
    shifts = [
        ("⚙", "内製AI化で省人化加速",
         "電通 / 博報堂 / CARTA / アナグラム等、大手は社内AI基盤整備。\n"
         "運用者1人あたり担当案件数が増加、『人月』ビジネスの単価下落圧力"),
        ("🏢", "Tier2 代理店の統合・淘汰",
         "専門特化型・地域密着型の中堅代理店で M&A 進行。\n"
         "ジェネラリスト型代理店は競争優位を失う傾向"),
        ("📊", "成果報酬・Retainer + Outcome へ",
         "月額固定(人月)から、成果連動(CPA/ROAS 連動 or 売上連動)への移行。\n"
         "クライアント側も『何に払うか』を問い直す時期"),
    ]
    top = Inches(1.55)
    for i, (ic, title, body) in enumerate(shifts):
        y = top + Inches(1.45) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(1.3),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.12), Inches(1.3), fill=ORANGE)
        add_text(s, ic, Inches(0.9), y + Inches(0.3),
                 Inches(1.0), Inches(0.9),
                 size=44, color=ORANGE)
        add_text(s, title, Inches(2.0), y + Inches(0.25),
                 Inches(10), Inches(0.5),
                 size=16, bold=True, color=NAVY)
        add_text(s, body, Inches(2.0), y + Inches(0.7),
                 Inches(10.5), Inches(0.6),
                 size=11, color=TEXT, line_spacing=1.5)

    # Opportunity callout
    add_rect(s, Inches(0.6), Inches(6.0), Inches(12.15), Inches(0.9),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業運用代行のチャンス",
             Inches(0.85), Inches(6.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "代理店経由ではなく直接クライアント取引の時代。\n"
             "中小企業の AI導入支援 + 運用代行は需要過多、価格決定権も持ちやすい",
             Inches(0.85), Inches(6.45), Inches(12), Inches(0.55),
             size=11, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p29_role_shift(prs):
    s = blank(prs)
    page_frame(s, prs, "運用職の役割シフトと人材要件 2026",
               "『AIを導く運用職』で差別化する", pagenum(19))

    # Before / After
    add_text(s, "旧 (〜2023)",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=16, bold=True, color=MID_GRAY)
    add_text(s, "新 (2026〜)",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=16, bold=True, color=ORANGE)

    pairs = [
        ("配信設定・入札調整を手動で", "キャンペーン構造を設計し AIに任せる"),
        ("クリエイティブ指示をテキストで",
         "生成AIでABテスト用素材を大量量産"),
        ("レポート作成に数時間", "Looker Studio + AI要約で30分"),
        ("ラストクリックCVを追う",
         "Incrementality / MMM / LTVで意思決定"),
        ("媒体ごとのサイロ運用", "横断で予算配分・検証設計"),
    ]
    for i, (old, new) in enumerate(pairs):
        y = Inches(2.1) + Inches(0.65) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.55),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "✗", Inches(0.8), y + Inches(0.13),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=WARN)
        add_text(s, old, Inches(1.2), y + Inches(0.16),
                 Inches(4.8), Inches(0.3),
                 size=11, color=MID_GRAY)
        add_rect(s, Inches(7.0), y, Inches(5.85), Inches(0.55),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "✓", Inches(7.2), y + Inches(0.13),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=SUCCESS)
        add_text(s, new, Inches(7.6), y + Inches(0.16),
                 Inches(4.8), Inches(0.3),
                 size=11, color=NAVY)

    # Required skills
    add_text(s, "必須スキル 2026 (チェックリスト)",
             Inches(0.6), Inches(5.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(6.05), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    skills = [
        ("GA4/SGTM/CAPIの実装理解", "計測基盤"),
        ("生成AI 3種のワークフロー化", "Claude/ChatGPT/Midjourney"),
        ("MMM/Lift 実験設計", "Robyn/Meridian"),
        ("LTV/CAC/Payback の会話", "ビジネス翻訳"),
    ]
    sx = Inches(0.6)
    sy = Inches(6.2)
    sw = Inches(2.95)
    sh = Inches(0.85)
    gap = Inches(0.1)
    for i, (skill, tag) in enumerate(skills):
        x = sx + (sw + gap) * i
        add_rect(s, x, sy, sw, sh, fill=NAVY, radius=True)
        add_text(s, "☑", x + Inches(0.15), sy + Inches(0.15),
                 Inches(0.4), Inches(0.3),
                 size=14, bold=True, color=ORANGE)
        add_text(s, skill, x + Inches(0.55), sy + Inches(0.13),
                 sw - Inches(0.65), Inches(0.3),
                 size=11, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, tag, x + Inches(0.55), sy + Inches(0.48),
                 sw - Inches(0.65), Inches(0.3),
                 size=9, color=LIGHT_GRAY)

    footer(s, prs)


def p30_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "Part 2 まとめ → Part 3 へ",
               "業界構造の3大変化と次章の橋渡し", pagenum(20))

    # 3 main takeaways
    takeaways = [
        ("01",
         "Cookie『廃止→撤回→実質終了』の3幕劇",
         "3rd Party Cookie は Chrome に残存するが、ATT 以降のシグナル減は不可逆。\n"
         "CAPI / SGTM / 1PD / Enhanced Conversions が業界標準として定着"),
        ("02",
         "LINEヤフー統合 + AI検索勃興で日本広告市場は新構造",
         "LINEヤフー広告 (2026春〜) が Google / Meta に次ぐ第3の柱に。\n"
         "AI Overview・ChatGPT・Perplexity で検索トラフィック構造が変化"),
        ("03",
         "代理店内製化 + 運用職シフト = 副業代行にチャンス",
         "中小企業の AI導入支援 + 運用代行は需要過多。\n"
         "『AIを導く運用職』として GA4/SGTM/Incrementality を備えた人材は希少"),
    ]
    top = Inches(1.5)
    for i, (n, title, body) in enumerate(takeaways):
        y = top + Inches(1.35) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(1.2),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), Inches(1.2),
                 fill=ORANGE)
        add_text(s, n, Inches(0.95), y + Inches(0.2),
                 Inches(1.0), Inches(0.7),
                 size=34, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, Inches(2.1), y + Inches(0.2),
                 Inches(10.5), Inches(0.45),
                 size=15, bold=True, color=NAVY)
        add_text(s, body, Inches(2.1), y + Inches(0.7),
                 Inches(10.5), Inches(0.5),
                 size=11, color=TEXT, line_spacing=1.5)

    # Next chapter teaser
    add_rect(s, Inches(0.6), Inches(5.7), Inches(12.15), Inches(1.2),
             fill=NAVY, radius=True)
    add_text(s, "NEXT →  Part 3 媒体別キャッチアップ (110p)",
             Inches(0.85), Inches(5.85), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Google Ads (25p) / Meta (22p) / YouTube (12p) / Yahoo! (10p) / TikTok (15p)\n"
             "LINE (10p) / X (6p) / LinkedIn (5p) / Amazon Ads (5p)",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.6),
             size=12, color=WHITE, line_spacing=1.5)

    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p11_divider(prs)
    p12_market_structure(prs)
    p13_operational_vs_mass(prs)
    p14_retail_media(prs)
    p15_video_surge(prs)
    p16_att_timeline(prs)
    p17_cookie_reversal(prs)
    p18_privacy_sandbox_end(prs)
    p19_consent_mode_v2(prs)
    p20_ly_timeline(prs)
    p21_ly_impact(prs)
    p22_stealth_marketing(prs)
    p23_eu_dsa(prs)
    p24_us_state_laws(prs)
    p25_genai_3waves(prs)
    p26_ai_search(prs)
    p27_geo(prs)
    p28_agency_reshuffle(prs)
    p29_role_shift(prs)
    p30_summary(prs)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
