#!/usr/bin/env python3
"""Build Part 3-C YouTube + Yahoo! (22p, P78-P99)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part3c.pptx"
PNUM_BASE = 77  # P78-P99


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def divider_with_subs(prs, sub_label, title, subtitle, pages, summary,
                      subsections):
    """Divider for combined chapters."""
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 3 / 媒体別キャッチアップ",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, sub_label, Inches(1.2), Inches(1.4),
             Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, title, Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=54, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, subtitle, Inches(1.2), Inches(3.3),
             Inches(11), Inches(0.4),
             size=16, color=LIGHT_GRAY)
    add_rect(s, Inches(10.8), Inches(1.0), Inches(2.0), Inches(0.7),
             fill=ORANGE, radius=True)
    add_text(s, pages, Inches(10.8), Inches(1.18),
             Inches(2.0), Inches(0.5),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
             font=EN_FONT)
    add_rect(s, Inches(1.2), Inches(4.0), Inches(10), Inches(0.015),
             fill=ORANGE)
    add_text(s, summary, Inches(1.2), Inches(4.2),
             Inches(11), Inches(1.0),
             size=13, color=LIGHT_GRAY, line_spacing=1.5)
    # 2 subsection cards at bottom
    sx = Inches(1.2)
    sy = Inches(5.5)
    sw = Inches(5.5)
    sh = Inches(1.5)
    gap = Inches(0.3)
    for i, (name, pages_str, items) in enumerate(subsections):
        x = sx + (sw + gap) * i
        add_rect(s, x, sy, sw, sh, fill=NAVY_DARK, radius=True)
        add_rect(s, x, sy, Inches(0.1), sh, fill=ORANGE)
        add_text(s, name, x + Inches(0.25), sy + Inches(0.1),
                 sw - Inches(0.4), Inches(0.4),
                 size=18, bold=True, color=ORANGE)
        add_text(s, pages_str, x + Inches(0.25), sy + Inches(0.5),
                 sw - Inches(0.4), Inches(0.3),
                 size=11, color=LIGHT_GRAY)
        add_text(s, items, x + Inches(0.25), sy + Inches(0.85),
                 sw - Inches(0.4), Inches(0.65),
                 size=10, color=WHITE, line_spacing=1.4)


# ---------- YouTube section ----------
def p78_divider(prs):
    divider_with_subs(
        prs,
        "3-C   |   動画 + 日本ポータル",
        "YouTube + Yahoo!",
        "Connected TV へ拡張する YouTube + LINEヤフー広告 統合直前の Yahoo!",
        "22p",
        "YouTube は CTV (Connected TV) 軸で再定義される時期。Shoppable CTV (2026/01) と\n"
        "VRC Non-Skip (2026/03) が global ロールアウト。Yahoo!は LINEヤフー広告統合 (2026春) の直前",
        [
            ("YouTube", "12p (P78-P89)",
             "Demand Gen / VRC / Shorts /\nCTV / Shoppable / Brand Lift /\nABCD クリエイティブ"),
            ("Yahoo!", "10p (P90-P99)",
             "LINEヤフー広告統合 2026春 /\nYahoo!検索広告 / YDA /\nLINE連携の現在地"),
        ],
    )


def p79_yt_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube Ads ランドスケープ 2026",
               "再生面 + 配信面 + 課金軸の3層で整理", pagenum(2))
    # 3 layers
    layers = [
        ("再生面",
         "Mobile / Desktop / TV Screen (CTV)",
         "CTV比率が急増 (2025 US$33B市場)。\n80% の PMax 広告主が CTV配信中"),
        ("配信面",
         "InStream / InFeed / Shorts",
         "縦型Shortsの伸びが最大。\nInStream は Skippable と Non-Skippable に分岐"),
        ("課金軸",
         "CPV / CPM / CPA",
         "Awareness=CPM, Demand Gen=CPA/tROAS,\nVideo Reach=CPM, Conversion=CPA"),
    ]
    top = Inches(1.55)
    h = Inches(1.55)
    gap = Inches(0.15)
    for i, (cat, opts, body) in enumerate(layers):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, cat, Inches(0.95), y + Inches(0.18),
                 Inches(2.5), Inches(0.5),
                 size=18, bold=True, color=NAVY)
        add_text(s, opts, Inches(0.95), y + Inches(0.7),
                 Inches(11), Inches(0.35),
                 size=12, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, body, Inches(0.95), y + Inches(1.05),
                 Inches(11), Inches(0.45),
                 size=11, color=TEXT, line_spacing=1.5)

    # Bottom CTV stat
    add_rect(s, Inches(0.6), Inches(6.45), Inches(12.15), Inches(0.5),
             fill=NAVY, radius=True)
    add_text(s,
             "🔥 2026年最大の変化 : YouTube 配信は『動画広告』から『TV広告』へ。CTV最適化が必須",
             Inches(0.85), Inches(6.55), Inches(12), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    footer(s, prs)


def p80_yt_campaign_types(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube キャンペーンタイプ 2026 整理",
               "目的別に5タイプ", pagenum(3))
    types_ = [
        ("Demand Gen", "需要喚起+CV",
         "InStream/InFeed/Shorts +\nDiscover+Gmail。\n2024-2025でVAC統合", ORANGE),
        ("Video Reach Campaign",
         "リーチ最大化",
         "TrueView/Bumper/Skippable統合。\n2026~ Non-Skip 6/15/30秒\n全世界ロールアウト",
         NAVY),
        ("Video Action Campaign",
         "(Demand Gen に統合済)",
         "2024-2025 で段階的に\nDemand Gen にアップグレード。\n新規作成不可", MID_GRAY),
        ("Performance Max",
         "全在庫CV最適化",
         "YT在庫を含む全配信。\nShoppable CTV 統合 (2026/01)",
         NAVY_SOFT),
        ("App Campaign",
         "アプリインストール",
         "YouTube動画含む全在庫。\nUAC = Universal App Campaign", NAVY_SOFT),
    ]
    top = Inches(1.55)
    w = Inches(2.43)
    h = Inches(2.6)
    gap = Inches(0.05)
    for i, (name, role, body, color) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7), fill=color)
        add_text(s, name, x + Inches(0.15), top + Inches(0.15),
                 w - Inches(0.3), Inches(0.45),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, role, x + Inches(0.15), top + Inches(0.85),
                 w - Inches(0.3), Inches(0.35),
                 size=10, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.25),
                 w - Inches(0.3), Inches(1.3),
                 size=10, color=TEXT, line_spacing=1.5,
                 align=PP_ALIGN.CENTER)

    # Note
    add_rect(s, Inches(0.6), Inches(4.5), Inches(12.15), Inches(2.45),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえるポイント",
             Inches(0.85), Inches(4.65), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• ブランディング案件 = Video Reach Campaign (2026 Non-Skip 6/15/30秒)\n"
             "• CV系/D2C案件 = Demand Gen (Shorts縦型 + InStream + Gmail)\n"
             "• ECで全在庫狙う = Performance Max (Shoppable CTV含む)\n"
             "• Video Action Campaign は新規作成不可、既存はDemand Genへ移行\n"
             "• ブランド + CV のミックス = Video Reach + Demand Gen 並行運用が定番",
             Inches(0.85), Inches(5.05), Inches(12), Inches(1.85),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p81_demand_gen_shorts(prs):
    s = blank(prs)
    page_frame(s, prs, "Demand Gen + YouTube Shorts 縦型",
               "2024/10〜の縦型シフトに対応", pagenum(4))
    # Stats / Shorts importance
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.2),
             fill=NAVY, radius=True)
    add_text(s,
             "YouTube Shorts は 2025年時点で月間 700億回再生 / 月間20億ユーザー (Google公式) ※要確認\n"
             "Demand Gen は YouTube Shorts 単独配信指定が可能 (2025〜 Channel Controls)",
             Inches(0.85), Inches(1.65), Inches(12), Inches(1.0),
             size=12, color=WHITE, line_spacing=1.55)

    # 2025 updates
    add_text(s, "2025年 Demand Gen の Shorts関連アップデート",
             Inches(0.6), Inches(2.85), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    updates = [
        ("9:16 縦型画像アセット対応",
         "Shorts用に縦型静止画も配信可能"),
        ("Channel Controls (Shortsのみ指定)",
         "InStream / InFeed / Shorts を個別ON/OFF"),
        ("動画拡張 (1動画→複数アスペクト比)",
         "横型動画から縦型を自動生成"),
        ("Shorts単独パフォーマンス指標",
         "InStream / InFeed と分離してレポート化"),
    ]
    top = Inches(3.3)
    w = Inches(5.95)
    h = Inches(0.95)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (head, body) in enumerate(updates):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, head, x + Inches(0.25), y + Inches(0.12),
                 w - Inches(0.4), Inches(0.4),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.5),
                 w - Inches(0.4), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.4)

    # Tip
    add_rect(s, Inches(0.6), Inches(5.7), Inches(12.15), Inches(1.3),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Shorts クリエイティブ鉄則 (2026)",
             Inches(0.85), Inches(5.85), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 1秒以内に視覚インパクト (テキスト/人物動き)\n"
             "• 9:16 縦型必須、上下に余白を残してUIで隠れる対策\n"
             "• 字幕/テロップ常時表示 (音声OFFユーザー対応)\n"
             "• 15秒以下推奨 (TikTok Smart+ 同様の鉄則)",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p82_vrc_nonskip(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Video Reach Campaign + Non-Skip (2026/03 グローバル)",
               "TrueView/Bumper/Skippable + Non-Skip 6/15/30秒",
               pagenum(5))
    # Big announcement
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.2),
             fill=NAVY, radius=True)
    add_text(s, "📢", Inches(0.85), Inches(1.75),
             Inches(0.8), Inches(0.8), size=30)
    add_text(s, "Google 公式 (2026年3月 グローバルロールアウト)",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "Non-Skippable 動画広告 (6秒/15秒/30秒) が VRC で運用可。\n"
             "Smart TV / Roku / Fire TV / Apple TV / Chromecast 全対応",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.65),
             size=12, bold=True, color=WHITE, line_spacing=1.45)

    # Format types
    add_text(s, "VRC で配信可能なフォーマット",
             Inches(0.6), Inches(2.85), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    formats = [
        ("Bumper", "6秒\nNon-Skippable",
         "認知最大化、CPM最適"),
        ("Skippable\nIn-Stream", "5秒以降スキップ可\n15秒〜",
         "視聴完了で課金、CPV"),
        ("🔥 Non-Skip\n6秒", "新規 (2026~)",
         "短時間ブランディング"),
        ("🔥 Non-Skip\n15秒", "新規 (2026~)",
         "標準的ブランディング"),
        ("🔥 Non-Skip\n30秒", "新規 (2026~)",
         "長尺ストーリー"),
    ]
    top = Inches(3.3)
    w = Inches(2.43)
    h = Inches(2.0)
    gap = Inches(0.05)
    for i, (name, fmt, desc) in enumerate(formats):
        x = Inches(0.6) + (w + gap) * i
        is_new = "🔥" in name
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12),
                 fill=ORANGE if is_new else NAVY)
        add_text(s, name, x + Inches(0.15), top + Inches(0.25),
                 w - Inches(0.3), Inches(0.65),
                 size=12, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.25)
        add_text(s, fmt, x + Inches(0.15), top + Inches(0.95),
                 w - Inches(0.3), Inches(0.45),
                 size=10, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)
        add_text(s, desc, x + Inches(0.15), top + Inches(1.45),
                 w - Inches(0.3), Inches(0.5),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.4)

    # Note
    add_rect(s, Inches(0.6), Inches(5.6), Inches(12.15), Inches(1.4),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Non-Skip 30秒の意味",
             Inches(0.85), Inches(5.75), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "従来の『2連続15秒』を置換。CTV/TVスクリーンでの視聴体験が『TV CMライク』に。\n"
             "ブランド広告主にとっては動画素材の長尺化が必須に。\n"
             "副業代行は『6/15/30秒の素材セット』をクライアントから入手 → AIが配信面別に最適化",
             Inches(0.85), Inches(6.1), Inches(12), Inches(0.85),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p83_abcd(prs):
    s = blank(prs)
    page_frame(s, prs, "ABCD原則 + クリエイティブ鉄則",
               "YouTube動画広告のグローバル鉄板", pagenum(6))
    abcd = [
        ("A", "Attract", "最初の3秒で掴む",
         "・人物登場/音響/テロップで意表\n・ブランドカラーを早期露出"),
        ("B", "Brand", "5秒以内にブランド明示",
         "・ロゴ/商品/色のいずれかを表示\n・Bumper では1秒以内"),
        ("C", "Connect", "ベネフィットを具体的に",
         "・数字/事例/Before-After\n・ターゲット視聴者像を意識"),
        ("D", "Direct", "CTAを明確化",
         "・『今すぐ』『LINE友達追加』\n・URL / QR / 末尾オーバーレイ"),
    ]
    top = Inches(1.5)
    w = Inches(2.95)
    h = Inches(2.55)
    gap = Inches(0.1)
    for i, (letter, word, role, body) in enumerate(abcd):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, letter, x + Inches(0.2), top + Inches(0.15),
                 Inches(1.0), Inches(1.2),
                 size=72, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, word, x + Inches(1.4), top + Inches(0.3),
                 w - Inches(1.5), Inches(0.4),
                 size=18, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, role, x + Inches(1.4), top + Inches(0.75),
                 w - Inches(1.5), Inches(0.35),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.2), top + Inches(1.5),
                 w - Inches(0.4), Inches(0.95),
                 size=10, color=TEXT, line_spacing=1.5)

    # Plus 4 modern rules
    add_text(s, "2026年版・追加鉄則",
             Inches(0.6), Inches(4.25), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.65), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    rules = [
        "音声OFF前提のキャプション/テロップ常時表示",
        "9:16 縦型 + 16:9 横型 + 1:1 正方形 の3パターン用意",
        "AI生成クリエイティブの活用 (Veo/Sora/Runway)",
        "CTV向けは TVスクリーンで読める文字サイズで設計",
    ]
    for i, r in enumerate(rules):
        y = Inches(4.85) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, r, Inches(1.0), y + Inches(0.03),
                 Inches(11), Inches(0.4),
                 size=11, color=TEXT, line_spacing=1.4)
    footer(s, prs)


def p84_ctv(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Connected TV (CTV) — 2026年市場",
               "YouTube on TV Screen が広告の主戦場へ", pagenum(7))
    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(5.5), Inches(5.4),
             fill=NAVY, radius=True)
    add_text(s, "US CTV広告市場規模",
             Inches(0.85), Inches(1.7), Inches(5), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s, "$33.35B", Inches(0.85), Inches(2.1),
             Inches(5), Inches(1.4),
             size=68, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "2025年 (デジタル広告全体の 9.6%)",
             Inches(0.85), Inches(3.5), Inches(5), Inches(0.4),
             size=12, color=LIGHT_GRAY)
    add_rect(s, Inches(0.85), Inches(4.0), Inches(5), Inches(0.015),
             fill=ORANGE)
    add_text(s, "2026年予測", Inches(0.85), Inches(4.15),
             Inches(5), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s, "$38B", Inches(0.85), Inches(4.45),
             Inches(5), Inches(1.0),
             size=48, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "前年比 +14% YoY",
             Inches(0.85), Inches(5.5), Inches(5), Inches(0.35),
             size=12, color=LIGHT_GRAY)
    add_text(s, "出典: ALM Corp / eMarketer 集計 ※要確認",
             Inches(0.85), Inches(6.5), Inches(5), Inches(0.35),
             size=9, color=SOFT_GRAY)

    # Right: PMax adoption
    add_text(s, "Performance Max での CTV 利用",
             Inches(6.3), Inches(1.55), Inches(7), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(6.3), Inches(2.05), Inches(6.45), Inches(2.2),
             fill=ACCENT_BG, radius=True)
    add_text(s, "80%", Inches(6.4), Inches(2.4),
             Inches(2.7), Inches(1.5),
             size=58, bold=True, color=ORANGE, font=EN_FONT,
             align=PP_ALIGN.CENTER)
    add_text(s, "of PMax 広告主が\n既に CTV配信中 (2025-2026)",
             Inches(9.1), Inches(2.7), Inches(3.5), Inches(1.0),
             size=13, bold=True, color=NAVY, line_spacing=1.4)

    # Devices
    add_text(s, "対応デバイス",
             Inches(6.3), Inches(4.4), Inches(7), Inches(0.35),
             size=12, bold=True, color=NAVY)
    devices = ["Smart TV", "Roku", "Fire TV", "Apple TV", "Chromecast",
               "Google TV"]
    dx = Inches(6.3)
    dy = Inches(4.85)
    dw = Inches(2.0)
    dh = Inches(0.5)
    for i, d in enumerate(devices):
        r, c = divmod(i, 3)
        x = dx + (dw + Inches(0.15)) * c
        y = dy + (dh + Inches(0.15)) * r
        add_rect(s, x, y, dw, dh, fill=NAVY, radius=True)
        add_text(s, d, x, y + Inches(0.13),
                 dw, Inches(0.3),
                 size=11, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)

    # Note
    add_text(s,
             "💡 副業代行 : Awareness/Branding 案件は CTV配信を提案に組み込み (2026年標準)",
             Inches(6.3), Inches(6.5), Inches(7), Inches(0.35),
             size=11, bold=True, color=ORANGE_DARK)
    footer(s, prs)


def p85_shoppable(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Shoppable CTV Ads (2026/01)",
               "TVを見ながら商品をブラウズ・購入できる", pagenum(8))

    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Demand Gen でTV画面に表示される動画広告に商品カルーセル + QRコードを組み合わせ。\n"
             "Google Merchant Center の商品データから自動生成、QRで個別商品ページに遷移",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 step flow
    add_text(s, "ユーザー体験フロー",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    flow = [
        ("STEP 1", "TVで動画広告視聴",
         "YouTube on TVで\n通常の動画広告が再生"),
        ("STEP 2", "商品カルーセル表示",
         "動画下部に商品画像 + 価格\nが横スクロールで表示"),
        ("STEP 3", "QRスキャン → 購入",
         "スマホでQR読取 →\n商品ページへ直遷移"),
    ]
    top = Inches(3.15)
    w = Inches(3.95)
    h = Inches(2.4)
    gap = Inches(0.15)
    for i, (no, name, body) in enumerate(flow):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, no, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.5),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), top + Inches(1.3),
                 w - Inches(0.4), Inches(1.0),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Implementation
    add_rect(s, Inches(0.6), Inches(5.75), Inches(12.15), Inches(1.2),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で実装するために必要なもの",
             Inches(0.85), Inches(5.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Google Merchant Center 商品データフィード (Shopify/WooCommerce/EC-CUBE 連携可)\n"
             "• Demand Gen キャンペーン (CTV配信ON)\n"
             "• 動画クリエイティブ + 商品リンクURL",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p86_brandconnect(prs):
    s = blank(prs)
    page_frame(s, prs, "BrandConnect / Creator Partnerships",
               "クリエイター連携で広告を発信する仕組み", pagenum(9))

    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "YouTube BrandConnect : 広告主とクリエイターをマッチングし、ブランド統合動画を制作・配信。\n"
             "Creator Partnerships : 既存のクリエイター動画を広告フォーマット (Sponsored Video) に活用",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=TEXT, line_spacing=1.5)

    # 2 paths
    paths = [
        ("BrandConnect",
         "ブランド統合動画",
         "Google公式マッチングプログラム\n"
         "ブリーフ提出 → クリエイター提案\n"
         "広告主が選定 → 動画制作 → 配信",
         "事例: 大手ブランド・マーケットリーダー"),
        ("Creator Partnerships",
         "既存動画の広告活用",
         "クリエイターが投稿済の動画を\n広告として配信 (Sponsored Video)\n"
         "広告主とクリエイターの直接契約",
         "事例: D2Cブランド・アパレル・コスメ"),
    ]
    top = Inches(2.65)
    w = Inches(6.0)
    h = Inches(3.2)
    gap = Inches(0.15)
    for i, (name, sub, body, ex) in enumerate(paths):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=18, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.5),
                 size=11, color=TEXT, line_spacing=1.5)
        add_rect(s, x + Inches(0.3), top + Inches(2.55),
                 w - Inches(0.6), Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, ex, x + Inches(0.3), top + Inches(2.7),
                 w - Inches(0.6), Inches(0.5),
                 size=10, color=ORANGE_DARK,
                 line_spacing=1.4)

    # Note
    add_text(s,
             "💡 中小予算 (月50万円以下) には Creator Partnerships が現実的。Google公式 BrandConnect は大型予算向き",
             Inches(0.6), Inches(6.05), Inches(12), Inches(0.3),
             size=10, color=MID_GRAY)
    footer(s, prs)


def p87_yt_measurement(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube 計測 : Brand Lift / Search Lift / Conversion",
               "認知系も含めて効果を可視化する", pagenum(10))

    metrics = [
        ("Brand Lift Study",
         "認知・想起・購入意向",
         "TestとControl群へポーリング配信。\n4指標で定量化"),
        ("Search Lift",
         "ブランド検索数の上昇",
         "広告接触群と非接触群で\nブランド名検索数を比較"),
        ("Conversion (DDA)",
         "Demand Gen / VRC のCV",
         "Cross-channel DDAで配信寄与を算出。\nラストクリック過小評価を補正"),
        ("View-Through CV",
         "視聴後の遅延CV",
         "動画視聴 → 24/72時間以内のCV。\nブランド系で重要"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(metrics):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.3),
                 w - Inches(0.4), Inches(0.7),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.25)
        add_text(s, sub, x + Inches(0.2), top + Inches(1.05),
                 w - Inches(0.4), Inches(0.4),
                 size=11, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), top + Inches(1.55),
                 w - Inches(0.4), Inches(0.85),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(4.35), Inches(12.15), Inches(2.6),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で押さえるレポート方針",
             Inches(0.85), Inches(4.5), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• ブランディング案件 = Brand Lift + Search Lift で効果証明\n"
             "• CV案件 = DDA + View-Through で『動画は見るだけ』のCV寄与を可視化\n"
             "• Brand Lift Study は Meta と同様、月100万円以上の予算で標準利用\n"
             "• Search Lift はオフラインCVも見える化 — 来店・電話など Google Ads に直接戻らないCVも追える\n"
             "• YouTube単独 ROI ではなく『Cross-channel 寄与』として説明する",
             Inches(0.85), Inches(4.85), Inches(12), Inches(2.0),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p88_yt_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube : 鉄板運用メソッド 2026年版",
               "新規YouTube案件で最初の30日にやること",
               pagenum(11))
    steps = [
        ("Day 0-2 : 計測 + クリエイティブ設計",
         [
             "Google Ads × YouTube連携",
             "DDA を Conversion設定で有効化",
             "クリエイティブ尺別に分類 (6/15/30秒)",
             "Merchant Center 連携 (EC案件のみ)",
         ]),
        ("Day 3-7 : キャンペーン構造",
         [
             "Awareness系 = VRC + Bumper/Skippable",
             "CV系 = Demand Gen (Shorts含む)",
             "EC = Performance Max (CTV含む)",
             "Channel Controls で配信面を分離",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "Brand Lift Study 申請 (該当時)",
             "Audience Signal に1PD投入",
             "アセット追加は週1回程度",
             "View-Through Window を確認",
         ]),
        ("Day 22-30 : 最適化",
         [
             "Brand Lift / Search Lift の結果確認",
             "アセット Best/Low の入替",
             "CTV配信比率を最適化",
             "月次レポート + 次月提案",
         ]),
    ]
    top = Inches(1.5)
    h = Inches(1.3)
    gap = Inches(0.1)
    for i, (title, items) in enumerate(steps):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, title, Inches(0.95), y + Inches(0.15),
                 Inches(11.5), Inches(0.35),
                 size=14, bold=True, color=NAVY)
        for j, item in enumerate(items):
            r, c = divmod(j, 2)
            x = Inches(0.95) + Inches(5.95) * c
            yy = y + Inches(0.5) + Inches(0.35) * r
            add_text(s, "▸", x, yy, Inches(0.25), Inches(0.3),
                     size=10, bold=True, color=ORANGE)
            add_text(s, item, x + Inches(0.25), yy + Inches(0.03),
                     Inches(5.6), Inches(0.35),
                     size=10, color=TEXT, line_spacing=1.3)
    footer(s, prs)


def p89_yt_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube : よくある失敗と回避策",
               "副業代行で『YouTube あるある』を防ぐ",
               pagenum(12))
    pitfalls = [
        ("16:9 横型のみで配信",
         "Shorts (9:16) で機会損失",
         "9:16 / 16:9 / 1:1 の3パターン用意"),
        ("ラストクリックでCV評価",
         "View-Through CV見えず、過小評価",
         "DDA + View-Through Window 7-14日で評価"),
        ("音声前提のクリエイティブ",
         "ミュート視聴で訴求が伝わらない",
         "テロップ常時表示、字幕焼き付け"),
        ("CTV配信の無視",
         "2026年で機会損失大、市場 +14%/年",
         "Awareness / VRC / PMax で CTV ON"),
        ("Brand Lift Study 未活用",
         "ブランド広告のROIが説明できない",
         "月100万円以上は Brand Lift で効果証明"),
        ("Demand Gen と VRC を混同",
         "目的別に使い分けないと予算非効率",
         "CV = Demand Gen, 認知 = VRC を徹底"),
    ]
    top = Inches(1.45)
    w = Inches(5.95)
    h = Inches(1.7)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (mistake, reason, fix) in enumerate(pitfalls):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=WARN)
        add_text(s, "✗", x + Inches(0.25), y + Inches(0.15),
                 Inches(0.5), Inches(0.35),
                 size=18, bold=True, color=WARN)
        add_text(s, mistake, x + Inches(0.7), y + Inches(0.15),
                 w - Inches(0.85), Inches(0.4),
                 size=12, bold=True, color=NAVY, line_spacing=1.3)
        add_text(s, reason, x + Inches(0.25), y + Inches(0.65),
                 w - Inches(0.4), Inches(0.45),
                 size=10, color=MID_GRAY, line_spacing=1.4)
        add_rect(s, x + Inches(0.25), y + Inches(1.1),
                 w - Inches(0.4), Inches(0.015),
                 fill=ORANGE)
        add_text(s, f"→  {fix}",
                 x + Inches(0.25), y + Inches(1.2),
                 w - Inches(0.4), Inches(0.45),
                 size=10, bold=True, color=ORANGE_DARK, line_spacing=1.4)
    footer(s, prs)


# ---------- Yahoo! section ----------
def p90_yahoo_divider(prs):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 3 / 媒体別キャッチアップ — 3-C 後半",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, "日本市場の二大ポータル",
             Inches(1.2), Inches(1.4), Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, "Yahoo!広告", Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=54, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, "LINEヤフー広告 統合 (2026春) 直前の現在地",
             Inches(1.2), Inches(3.3), Inches(11), Inches(0.4),
             size=16, color=LIGHT_GRAY)
    add_rect(s, Inches(10.8), Inches(1.0), Inches(2.0), Inches(0.7),
             fill=ORANGE, radius=True)
    add_text(s, "10p", Inches(10.8), Inches(1.18),
             Inches(2.0), Inches(0.5),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
             font=EN_FONT)
    add_rect(s, Inches(1.2), Inches(4.0), Inches(10), Inches(0.015),
             fill=ORANGE)
    add_text(s,
             "2025/09/25 公式発表 : LINE広告 + Yahoo!広告ディスプレイ広告 (運用型・予約型) を統合し、\n"
             "2026年春から『LINEヤフー広告 ディスプレイ広告』として提供開始。\n"
             "Yahoo!ユーザーは自動移行、LINE側は移行ツール or 手動移行",
             Inches(1.2), Inches(4.2), Inches(11), Inches(1.2),
             size=13, color=LIGHT_GRAY, line_spacing=1.5)
    # topics
    add_text(s, "▸ 章内の主要トピック",
             Inches(1.2), Inches(5.6), Inches(8), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    topics = [
        "LINEヤフー広告統合 2026春",
        "Yahoo!検索広告 + AI機能",
        "YDA (ディスプレイ広告)",
        "LINE広告との連携",
        "ターゲティング・オーディエンス",
        "計測・コンバージョンタグ",
        "鉄板運用メソッド",
        "よくある失敗・回避策",
    ]
    for i, t in enumerate(topics):
        c = i // 4
        r = i % 4
        x = Inches(1.2) + Inches(5.7) * c
        y = Inches(5.95) + Inches(0.32) * r
        add_text(s, f"• {t}", x, y, Inches(5.5), Inches(0.32),
                 size=11, color=WHITE)


def p91_ly_integration(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 LINEヤフー広告 統合 2026春",
               "LINE + Yahoo! ディスプレイ広告が一本化される",
               pagenum(14))
    # Big announcement
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "📢", Inches(0.85), Inches(1.75),
             Inches(0.8), Inches(0.8), size=30)
    add_text(s, "LINEヤフー公式発表 (2025/09/25)",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "LINE広告 (Talk Head View含む) + Yahoo!広告 ディスプレイ広告 (運用型・予約型) を統合\n"
             "2026年春より『LINEヤフー広告 ディスプレイ広告』として提供開始",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.7),
             size=12, bold=True, color=WHITE, line_spacing=1.5)

    # Migration paths
    add_text(s, "現在ユーザーの移行パス",
             Inches(0.6), Inches(2.95), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    paths = [
        ("Yahoo!広告ユーザー",
         "✓ 自動移行",
         "設定・データそのまま引継ぎ\n運用者の作業は不要",
         SUCCESS),
        ("LINE広告ユーザー",
         "⚠ 移行ツール or 手動移行",
         "管理画面の移行ツール経由\n手動セットアップも可",
         WARN),
    ]
    top = Inches(3.4)
    w = Inches(6.0)
    h = Inches(2.0)
    gap = Inches(0.15)
    for i, (audience, action, body, color) in enumerate(paths):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, Inches(0.1), h, fill=color)
        add_text(s, audience, x + Inches(0.25), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, action, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=color)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(0.85),
                 size=11, color=TEXT, line_spacing=1.5)

    # Connect One context
    add_rect(s, Inches(0.6), Inches(5.65), Inches(12.15), Inches(1.3),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Connect One 構想とは",
             Inches(0.85), Inches(5.78), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "LINE公式アカウントを起点に、広告 / 販促 / コマース / 予約 / 顧客分析 を統合提供する構想。\n"
             "2026春の広告統合はその第一弾。LINE + Yahoo! の統合データで MLモデルが共有学習 → 配信効果向上を期待",
             Inches(0.85), Inches(6.13), Inches(12), Inches(0.8),
             size=11, color=TEXT, line_spacing=1.5)
    footer(s, prs)


def p92_yahoo_search(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo!検索広告 — 現在 + AI機能",
               "Google検索広告とは異なる立ち位置を維持",
               pagenum(15))
    # Stats
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "Yahoo!JAPAN は日本国内での検索シェア 約20-25% (Google約75%) ※要確認。\n"
             "高年齢層 + 男性比率高 + ニュース閲覧と連動した検索行動が特徴",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=TEXT, line_spacing=1.5)

    # 3 features
    features = [
        ("自動入札",
         "目的別自動入札",
         "Maxコンバージョン / 目標CPA /\n目標ROAS / Maxクリック等"),
        ("レスポンシブ検索広告",
         "見出し最大15・説明文最大4",
         "Google Ads RSA と同様\nAIが組合せ最適化"),
        ("AIアシスト機能",
         "広告文生成・キーワード提案",
         "管理画面でAIが下書き生成\n人間が最終承認"),
        ("Microsoft広告連携",
         "Bing経由の広告も拡張可",
         "Microsoft広告が日本撤退後 ※\nYahoo!検索広告のみ運用"),
    ]
    top = Inches(2.7)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.3),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=NAVY)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.85),
                 w - Inches(0.4), Inches(0.4),
                 size=10, bold=True, color=ORANGE_DARK,
                 line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), top + Inches(1.4),
                 w - Inches(0.4), Inches(1.05),
                 size=10, color=TEXT, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行での扱い",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• B2C / 高年齢層ターゲット (50代以上) の案件では Google単独より Yahoo!併用が効く\n"
             "• B2B でも Yahoo!検索の方が CPA安い業種あり (士業/不動産/保険)\n"
             "• 提案には『Google + Yahoo!』の2軸セット提案がデフォルト\n"
             "• 名義方針 : 提案文では『Yahoo!広告』と明記OK、ただし前面押しはしない",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p93_yda(prs):
    s = blank(prs)
    page_frame(s, prs, "YDA (Yahoo!広告 ディスプレイ広告)",
               "2026春の統合直前の現状", pagenum(16))
    # 2 types
    types_ = [
        ("運用型",
         "オークション型・自動最適化",
         "リアルタイム入札\nAI自動配信が主流\n"
         "中小予算でも運用可\n"
         "2026春に LINEヤフー広告に統合"),
        ("予約型",
         "保証型・期間契約",
         "ブランドパネル / Yahoo! JAPANトップ等\n大型予算 (数百万〜数千万円)\n"
         "認知獲得・大型キャンペーン向け\n"
         "2026春に LINEヤフー広告に統合"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=18, bold=True, color=ORANGE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # AI features
    add_text(s, "YDA の AI機能 (2026年現在)",
             Inches(0.6), Inches(4.85), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.25), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    ai_features = [
        ("自動入札",
         "目標CPA / ROAS / コンバージョン最大化"),
        ("オートターゲティング",
         "AIがオーディエンス自動拡張"),
        ("広告クリエイティブAI",
         "テキスト・画像のAI生成 (限定機能)"),
        ("LINE側ML共有 (2026〜)",
         "統合後 LINE行動データを学習に組込"),
    ]
    for i, (cat, body) in enumerate(ai_features):
        y = Inches(5.45) + Inches(0.38) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(4), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(5.0), y + Inches(0.02),
                 Inches(7.5), Inches(0.3),
                 size=11, color=TEXT)
    footer(s, prs)


def p94_line_yahoo_link(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告との連携 — 現在 → 2026春統合の流れ",
               "現状の連携機能と2026春の完全統合",
               pagenum(17))
    # Now (2025) vs After (2026)
    add_text(s, "現状 (2025) — 部分連携",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=14, bold=True, color=MID_GRAY)
    add_text(s, "After (2026春~) — 完全統合",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=14, bold=True, color=ORANGE)

    nows = [
        "Yahoo!とLINEは別管理画面",
        "ID / オーディエンス別管理",
        "LINEオーディエンスをYDAで活用 (一部)",
        "YDAでLINE友だち追加広告配信可",
        "ビジネスID統合 (2025/06/30~)",
    ]
    afters = [
        "LINEヤフー広告 ディスプレイ広告に一本化",
        "ビジネスID + 統合データ",
        "LINE + Yahoo! 横断ターゲティング",
        "LINE側ML改善で配信効果向上",
        "1キャンペーンで両在庫配信",
    ]
    for i, item in enumerate(nows):
        y = Inches(2.05) + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.5),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "•", Inches(0.8), y + Inches(0.12),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=MID_GRAY)
        add_text(s, item, Inches(1.1), y + Inches(0.13),
                 Inches(4.8), Inches(0.3),
                 size=11, color=MID_GRAY)
    for i, item in enumerate(afters):
        y = Inches(2.05) + Inches(0.55) * i
        add_rect(s, Inches(7.0), y, Inches(5.85), Inches(0.5),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "✓", Inches(7.2), y + Inches(0.12),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=SUCCESS)
        add_text(s, item, Inches(7.55), y + Inches(0.13),
                 Inches(4.8), Inches(0.3),
                 size=11, color=NAVY)

    # Bottom note
    add_rect(s, Inches(0.6), Inches(5.05), Inches(12.15), Inches(1.9),
             fill=NAVY, radius=True)
    add_text(s, "💡 2026春の統合に向けた副業代行の準備",
             Inches(0.85), Inches(5.2), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "1. Yahoo!広告ユーザーのクライアント — 自動移行されるので運用継続のみ\n"
             "2. LINE広告ユーザーのクライアント — 移行ツールの確認、テストアカウントで予行演習\n"
             "3. 両方使うクライアント — 統合後はキャンペーン構造を再設計 (在庫横断最適化)\n"
             "4. 提案資料 : 『2026春から日本市場の主要DSPに格上げ』として LINEヤフー広告を組込み\n"
             "5. リーチ : LINE+Yahoo!合算で 国内スマホユーザー 94% (重複除く) を訴求",
             Inches(0.85), Inches(5.55), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p95_yahoo_targeting(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo!広告 ターゲティング・オーディエンス",
               "Yahoo!固有のデータが強みの領域", pagenum(18))
    targets = [
        ("属性",
         "年齢 / 性別 / 地域 / 言語",
         "Yahoo!JAPAN 登録情報ベース"),
        ("興味関心",
         "Yahoo!検索履歴 + 閲覧履歴",
         "ニュース / Y!知恵袋 / 不動産等"),
        ("ライフイベント",
         "結婚 / 転職 / 出産 / 引越し",
         "Yahoo!サービスからの推定"),
        ("購買意欲層",
         "EC検索行動からの推定",
         "Yahoo!ショッピング検索を活用"),
        ("カスタムオーディエンス",
         "1PD アップロード",
         "ハッシュ化された顧客リスト"),
        ("類似拡張",
         "Lookalike 相当",
         "Yahoo!ユーザーから類似抽出"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (cat, body, source) in enumerate(targets):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), y + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.65),
                 w - Inches(0.4), Inches(0.4),
                 size=11, color=TEXT, line_spacing=1.4)
        add_text(s, source, x + Inches(0.25), y + Inches(1.1),
                 w - Inches(0.4), Inches(0.35),
                 size=9, color=ORANGE_DARK)

    # Highlight
    add_rect(s, Inches(0.6), Inches(5.0), Inches(12.15), Inches(1.95),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Yahoo!固有データの強み",
             Inches(0.85), Inches(5.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Yahoo!ニュース閲覧履歴ベースの興味関心 → トレンド連動の訴求が可能\n"
             "• Yahoo!不動産・知恵袋・ファイナンス等の高関与サービス連動 → 購買意欲層が強い\n"
             "• 高年齢層 (50代以上) のリーチ網はGoogle/Metaより強い\n"
             "• 2026春以降 + LINEデータ : チャット行動 + 検索行動の組合せでターゲティング精度UP",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p96_yahoo_measurement(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo!広告 計測・コンバージョンタグ",
               "Cookie対応 + サイトジェネラルタグ",
               pagenum(19))
    # 2 tag types
    tags = [
        ("サイトジェネラルタグ",
         "全ページに設置",
         "Google の gtag.js 相当。\n"
         "GTM経由でも実装可。\n"
         "コンバージョン測定の基盤"),
        ("コンバージョン測定タグ",
         "サンクスページに設置",
         "CV発生時に発火。\n"
         "Yahoo! Tag Managerで一元管理可。\n"
         "アプリ計測も含む"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tags):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=ORANGE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.55)

    # Cookie post era
    add_rect(s, Inches(0.6), Inches(4.25), Inches(12.15), Inches(2.7),
             fill=NAVY, radius=True)
    add_text(s, "Cookie対応 + Privacy 対策 (2026年現在)",
             Inches(0.85), Inches(4.4), Inches(11), Inches(0.4),
             size=13, bold=True, color=ORANGE)
    items = [
        "Google Cookie廃止撤回 (2024/07) でYahoo!広告のCookie計測も継続可",
        "ATT等のシグナル減対策 : サーバーサイド計測 (相当機能) は限定的、Tag Manager経由が標準",
        "ITP (Safari) の影響 : Yahoo!広告でも First-Party Cookie へ移行が進行",
        "Consent Mode 相当 : Yahoo!独自の同意管理は限定的、CMP導入で日本市場対応が現実解",
        "🔥 2026春LINEヤフー統合 : ID統合 + データ統合で計測精度改善が期待される",
    ]
    for i, item in enumerate(items):
        y = Inches(4.85) + Inches(0.4) * i
        add_text(s, "▸", Inches(0.85), y,
                 Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, item, Inches(1.15), y + Inches(0.03),
                 Inches(11.5), Inches(0.4),
                 size=11, color=WHITE, line_spacing=1.45)
    footer(s, prs)


def p97_yahoo_use_cases(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo!広告 業界別ユースケース",
               "Google より Yahoo!が強い業種", pagenum(20))
    cases = [
        ("不動産",
         "Yahoo!不動産連動",
         "高年齢層 + Yahoo!不動産閲覧者へのリマケで効果大"),
        ("金融 / 保険",
         "Yahoo!ファイナンス連動",
         "比較検討層・高所得層へのリーチが Google比優位"),
        ("自動車",
         "Yahoo!カー / オークション",
         "中古車・新車検討者の購買サイクルに合致"),
        ("BtoB士業",
         "Yahoo!知恵袋 + 検索",
         "弁護士・税理士・社労士の問合せCV安定"),
        ("通販 / D2C",
         "Yahoo!ショッピング連携",
         "リテールメディアと組み合わせて広域認知"),
        ("教育 / 資格",
         "Yahoo!ニュース閲覧層",
         "資格取得・スクール案件で高CV"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.65)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (industry, sig, body) in enumerate(cases):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, industry, x + Inches(0.25), y + Inches(0.15),
                 w - Inches(0.4), Inches(0.35),
                 size=13, bold=True, color=NAVY)
        add_text(s, sig, x + Inches(0.25), y + Inches(0.55),
                 w - Inches(0.4), Inches(0.35),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), y + Inches(0.95),
                 w - Inches(0.4), Inches(0.65),
                 size=10, color=TEXT, line_spacing=1.45)

    # Note
    add_rect(s, Inches(0.6), Inches(5.5), Inches(12.15), Inches(1.45),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行の Yahoo! 提案ライン",
             Inches(0.85), Inches(5.65), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 上記6業界では『Google + Yahoo!』のセット提案がデフォルト\n"
             "• EC案件は『Yahoo!ショッピング広告』 (Part 3-E Amazon Adsと並ぶ位置づけ) も検討\n"
             "• 名義方針 : ofmeton としての発信ではYahoo!も併記OK、BSAでの提案は『AI運用代行』として包括",
             Inches(0.85), Inches(6.0), Inches(12), Inches(0.95),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p98_yahoo_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo!広告 : 鉄板運用メソッド 2026年版",
               "Google Adsと並行運用する前提",
               pagenum(21))
    steps = [
        ("Day 0-2 : 計測 + クライアント情報",
         [
             "サイトジェネラルタグ確認/設置",
             "コンバージョン測定タグ設置",
             "Google Ads との重複CV確認",
             "予算配分 (Google : Yahoo! = 7:3 が定番)",
         ]),
        ("Day 3-7 : キャンペーン構造",
         [
             "検索広告 : 完全一致 + フレーズ + 部分一致",
             "YDA : オーディエンス × 興味関心",
             "リマケ : サイトジェネラルタグ連動",
             "LINE広告 (該当時) : 友だち追加配信",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "自動入札の学習を観察",
             "AIアシストでクリエイティブ生成",
             "予算 ±20% 以内で安定運用",
             "オーディエンス追加は週1ペース",
         ]),
        ("Day 22-30 : 最適化 + レポート",
         [
             "検索クエリで Negative追加",
             "クリエイティブ Best/Low 入替",
             "Google Ads との配分見直し",
             "月次レポート + 次月提案",
         ]),
    ]
    top = Inches(1.5)
    h = Inches(1.3)
    gap = Inches(0.1)
    for i, (title, items) in enumerate(steps):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, title, Inches(0.95), y + Inches(0.15),
                 Inches(11.5), Inches(0.35),
                 size=14, bold=True, color=NAVY)
        for j, item in enumerate(items):
            r, c = divmod(j, 2)
            x = Inches(0.95) + Inches(5.95) * c
            yy = y + Inches(0.5) + Inches(0.35) * r
            add_text(s, "▸", x, yy, Inches(0.25), Inches(0.3),
                     size=10, bold=True, color=ORANGE)
            add_text(s, item, x + Inches(0.25), yy + Inches(0.03),
                     Inches(5.6), Inches(0.35),
                     size=10, color=TEXT, line_spacing=1.3)
    footer(s, prs)


def p99_yahoo_pitfalls_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "Yahoo! pitfalls + Part 3-C まとめ",
               "副業代行で『Yahoo! あるある』 + 次章へ", pagenum(22))
    # 4 pitfalls (compact)
    pitfalls = [
        ("Google複製で運用",
         "Yahoo!固有のオーディエンス未活用 → Yahoo!興味関心 + ライフイベントを活用"),
        ("LINE広告との連携無視",
         "LINEオーディエンスをYDAで活用できる (現在) → 2026春の統合に備えて連携準備"),
        ("Cookie対応放置",
         "ITP / 規制でCV計測ロス → サイトジェネラルタグ + CMP導入"),
        ("予算配分の固定化",
         "Google一辺倒ではYahoo!得意業種を逃す → 業種別に配分を見直し"),
    ]
    top = Inches(1.45)
    w = Inches(5.95)
    h = Inches(1.2)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (mistake, fix) in enumerate(pitfalls):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=WARN)
        add_text(s, "✗", x + Inches(0.25), y + Inches(0.15),
                 Inches(0.5), Inches(0.35),
                 size=16, bold=True, color=WARN)
        add_text(s, mistake, x + Inches(0.7), y + Inches(0.15),
                 w - Inches(0.85), Inches(0.4),
                 size=12, bold=True, color=NAVY)
        add_text(s, fix, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(0.55),
                 size=10, color=TEXT, line_spacing=1.45)

    # Next chapter
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=NAVY, radius=True)
    add_text(s, "NEXT →  Part 3-D  TikTok + LINE  (25p, P100-P124)",
             Inches(0.85), Inches(4.55), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 3-D で扱うトピック :\n"
             "• TikTok (15p) : Smart+ / Symphony AI Suite / Spark Ads / TikTok Shop / Creative Center / 縦型クリエイティブ鉄則\n"
             "• LINE (10p) : LINE広告 / 配信面 / 友だち追加・公式アカウント連携 / 2026春統合の準備\n\n"
             "B2C系の重要媒体ペア。日本市場の Z世代-30代 リーチで Google/Meta と並ぶ第3の柱",
             Inches(0.85), Inches(5.05), Inches(12), Inches(1.85),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p78_divider(prs)
    p79_yt_landscape(prs)
    p80_yt_campaign_types(prs)
    p81_demand_gen_shorts(prs)
    p82_vrc_nonskip(prs)
    p83_abcd(prs)
    p84_ctv(prs)
    p85_shoppable(prs)
    p86_brandconnect(prs)
    p87_yt_measurement(prs)
    p88_yt_playbook(prs)
    p89_yt_pitfalls(prs)
    p90_yahoo_divider(prs)
    p91_ly_integration(prs)
    p92_yahoo_search(prs)
    p93_yda(prs)
    p94_line_yahoo_link(prs)
    p95_yahoo_targeting(prs)
    p96_yahoo_measurement(prs)
    p97_yahoo_use_cases(prs)
    p98_yahoo_playbook(prs)
    p99_yahoo_pitfalls_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
