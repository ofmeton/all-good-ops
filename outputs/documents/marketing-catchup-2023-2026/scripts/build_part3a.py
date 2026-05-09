#!/usr/bin/env python3
"""Build Part 3-A Google Ads (25p, P31-P55)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part3a.pptx"
PNUM_BASE = 30  # Part 3-A starts at P31


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


# ---------- Helpers specific to Part 3 ----------
def sub_divider(prs, media_label, title, subtitle, pages, summary, topics):
    """Sub-part divider slide. Like part_divider but with media icon."""
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    # Colored strip on left
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 3 / 媒体別キャッチアップ",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, media_label, Inches(1.2), Inches(1.4),
             Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, title, Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=54, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, subtitle, Inches(1.2), Inches(3.3),
             Inches(11), Inches(0.4),
             size=16, color=LIGHT_GRAY)
    # pages badge
    add_rect(s, Inches(10.8), Inches(1.0), Inches(2.0), Inches(0.7),
             fill=ORANGE, radius=True)
    add_text(s, pages, Inches(10.8), Inches(1.18),
             Inches(2.0), Inches(0.5),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
             font=EN_FONT)
    # rule
    add_rect(s, Inches(1.2), Inches(4.0), Inches(10), Inches(0.015),
             fill=ORANGE)
    add_text(s, summary, Inches(1.2), Inches(4.2),
             Inches(11), Inches(1.0),
             size=13, color=LIGHT_GRAY, line_spacing=1.5)
    # Topics
    add_text(s, "▸ 章内の主要トピック",
             Inches(1.2), Inches(5.5), Inches(8), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    # 2-col topic list
    half = (len(topics) + 1) // 2
    for i, t in enumerate(topics):
        c = i // half
        r = i % half
        x = Inches(1.2) + Inches(5.7) * c
        y = Inches(5.85) + Inches(0.32) * r
        add_text(s, f"• {t}", x, y, Inches(5.5), Inches(0.32),
                 size=11, color=WHITE)
    return s


def key_header(slide, prs, title, subtitle, pagenum_str):
    """Topic page header (for major topics)."""
    page_frame(slide, prs, title, subtitle, pagenum_str)


# ---------- Slide builders ----------
def p31_divider(prs):
    sub_divider(
        prs,
        "3-A",
        "Google Ads",
        "2.5年で最も大きく変わった媒体。運用者の仕事そのものが書き換わった",
        "25p",
        "PMaxの成熟、AI Max for Search、Gemini in Ads、Demand Gen、Enhanced Conversions、\n"
        "Consent Mode v2 連携、Broad Match + Smart Bidding の思想、Attribution の進化。\n"
        "この章を読めば『今Google Adsを再開できる』状態になる",
        [
            "Google Ads 地殻変動 TL;DR",
            "キャンペーンタイプ現在地",
            "Performance Max の全貌",
            "PMax 統制術",
            "検索: Broad Match 復権",
            "AI Max for Search (2025/05)",
            "Gemini in Google Ads",
            "Demand Gen (Discovery統合)",
            "Enhanced Conversions",
            "Consent Mode v2 連携",
            "Offline / Customer Match",
            "Value-based Bidding",
            "Predictive Audiences",
            "DDA / Attribution",
            "Optiscore 活用と罠",
            "鉄板運用メソッド 2026",
            "よくある失敗・回避策",
        ],
    )


def p32_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "Google Ads : 地殻変動 TL;DR",
               "2023年9月 → 2026年4月 で何が変わったか 5行で",
               pagenum(2))

    points = [
        ("01", "検索広告の思想逆転",
         "キーワード選定 + Phrase/Exact 細かく制御 → Broad Match + Smart Bidding 推奨へ。\n"
         "『AIにマッチさせ、ネガで絞る』が基本"),
        ("02", "キャンペーンタイプの整理",
         "Smart Shopping / Local Campaigns は廃止・PMax 統合。\n"
         "Discovery Ads は Demand Gen に統合 (2023/10)。Video Action Campaign も Demand Gen へ"),
        ("03", "PMax が成熟化 + 統制機能が拡充",
         "Search Terms 開示 / Asset Insights / 50検索テーマ / ブランド除外 / デバイス指定 /\n"
         "キャンペーンレベル除外キーワード 10,000件 / 動画 15本/asset group (2025)"),
        ("04", "Gemini + AI Max の登場",
         "Gemini in Ads : 会話型で広告文・アセット生成。\n"
         "AI Max for Search (2025/05/06) : DSA置換の検索AI拡張層、14-27% CV向上の事例"),
        ("05", "計測が 1stPD / SGTM / CAPI 前提に",
         "Enhanced Conversions / Consent Mode v2 / Offline Conversion Import /\n"
         "Customer Match が実装必須。DDA (Data-Driven Attribution) が標準"),
    ]
    top = Inches(1.45)
    h = Inches(1.05)
    for i, (n, title, body) in enumerate(points):
        y = top + Inches(1.08) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.12), h, fill=ORANGE)
        add_text(s, n, Inches(0.9), y + Inches(0.2),
                 Inches(0.8), Inches(0.7),
                 size=32, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, Inches(1.9), y + Inches(0.18),
                 Inches(10.5), Inches(0.4),
                 size=15, bold=True, color=NAVY)
        add_text(s, body, Inches(1.9), y + Inches(0.55),
                 Inches(10.6), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p33_campaign_types(prs):
    s = blank(prs)
    page_frame(s, prs, "キャンペーンタイプの現在地マップ",
               "2026年: 5タイプに整理 + PMax中心の Hub & Spoke 構造",
               pagenum(3))

    # Hub and spokes diagram
    # Center: PMax
    cx = Inches(6.66)
    cy = Inches(4.1)
    cr = Inches(1.6)
    # Center box
    add_rect(s, cx - cr, cy - cr / 2,
             cr * 2, cr, fill=ORANGE, radius=True)
    add_text(s, "Performance Max",
             cx - cr, cy - cr / 2 + Inches(0.2),
             cr * 2, Inches(0.5),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, "フル自動 / 全面配信",
             cx - cr, cy - cr / 2 + Inches(0.6),
             cr * 2, Inches(0.35),
             size=11, color=WHITE, align=PP_ALIGN.CENTER)

    # Spokes (4 campaigns around)
    spokes = [
        ("Search", "検索広告\nBroad Match + AI Max",
         Inches(1.6), Inches(2.0)),
        ("Demand Gen", "YouTube+Discover+Gmail\n縦型/InFeed/Shorts",
         Inches(10.6), Inches(2.0)),
        ("App", "アプリインストール\n事前学習型自動配信",
         Inches(1.6), Inches(5.0)),
        ("Video Reach", "YouTubeブランディング\nTrueView/Bumper",
         Inches(10.6), Inches(5.0)),
    ]
    for name, body, x, y in spokes:
        add_rect(s, x, y, Inches(1.6), Inches(1.2),
                 fill=NAVY, radius=True)
        add_text(s, name, x, y + Inches(0.15), Inches(1.6), Inches(0.4),
                 size=13, bold=True, color=ORANGE, align=PP_ALIGN.CENTER)
        add_text(s, body, x, y + Inches(0.55), Inches(1.6), Inches(0.65),
                 size=9, color=WHITE, align=PP_ALIGN.CENTER,
                 line_spacing=1.35)

    # Removed/deprecated list (bottom)
    add_rect(s, Inches(0.6), Inches(6.5), Inches(12.15), Inches(0.45),
             fill=LIGHT, radius=True)
    add_text(s, "✗ 消えたタイプ:",
             Inches(0.85), Inches(6.6), Inches(2.6), Inches(0.3),
             size=10, bold=True, color=WARN)
    add_text(s,
             "Smart Shopping → PMax / Local → PMax / Discovery → Demand Gen / Video Action → Demand Gen / ETA → RSA",
             Inches(3.5), Inches(6.62), Inches(9.2), Inches(0.3),
             size=9, color=TEXT)

    footer(s, prs)


def p34_pmax_overview(prs):
    s = blank(prs)
    page_frame(s, prs, "Performance Max の全貌",
               "Googleの全面統合AIキャンペーン (2021発表 → 2026成熟)",
               pagenum(4))

    # What it does
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s, "PMax とは",
             Inches(0.85), Inches(1.65), Inches(3), Inches(0.3),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "Google広告在庫 (検索 / ショッピング / YouTube / Discover / Gmail / ディスプレイ / Maps) を\n"
             "一つのキャンペーンで自動配信。クリエイティブ・入札・配信面を Google AI が最適化",
             Inches(0.85), Inches(2.0), Inches(12), Inches(0.45),
             size=12, color=WHITE, line_spacing=1.4)

    # Inputs / Outputs
    add_text(s, "入力 (運用者が提供)", Inches(0.6), Inches(2.8),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.15), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    inputs_items = [
        ("Asset Group", "テキスト/画像/動画/ロゴ/URL"),
        ("Audience Signal", "AIへのヒント (1PD / 興味関心)"),
        ("Conversion Goal", "CV定義 + Value-based Bidding"),
        ("Negative Keywords", "キャンペーン単位 10,000件 (2025~)"),
        ("Brand Exclusions", "除外ブランドリスト"),
        ("Search Themes", "検索テーマ 50件 (2025~)"),
    ]
    for i, (k, v) in enumerate(inputs_items):
        y = Inches(3.35) + Inches(0.48) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.42),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, k, Inches(0.8), y + Inches(0.1),
                 Inches(2.4), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, v, Inches(3.25), y + Inches(0.11),
                 Inches(2.7), Inches(0.3),
                 size=10, color=TEXT)

    # Output side
    add_text(s, "Google AI が自動決定", Inches(7.0),
             Inches(2.8), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(7.0), Inches(3.15), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    outputs_items = [
        ("配信面の選択", "検索/ショッピング/YT/Discover他"),
        ("ビッド単価", "Target CPA / ROAS で自動入札"),
        ("クリエイティブ組み合わせ", "アセットの組み合わせ最適化"),
        ("ターゲティング",
         "Audience Signal を出発点に拡張"),
        ("頻度 / タイミング",
         "ユーザー単位で最適な頻度"),
        ("検索マッチタイプ",
         "Broad Match 相当で広く意図マッチ"),
    ]
    for i, (k, v) in enumerate(outputs_items):
        y = Inches(3.35) + Inches(0.48) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.42),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, k, Inches(7.2), y + Inches(0.1),
                 Inches(2.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, v, Inches(9.6), y + Inches(0.11),
                 Inches(3.1), Inches(0.3),
                 size=10, color=TEXT)

    footer(s, prs)


def p35_pmax_structure(prs):
    s = blank(prs)
    page_frame(s, prs, "PMax アカウント構造ベストプラクティス",
               "2026年版 : 成熟後に定着した5つの原則",
               pagenum(5))

    principles = [
        ("01", "商品/サービスの粒度でキャンペーン分割",
         "LTV / ROAS 目標が異なるクラスタを混ぜない。\n"
         "例: 新規獲得 vs 既存顧客 / 高単価 vs 低単価"),
        ("02", "Asset Group は 5-10 個が上限",
         "AI最適化が効くため分割しすぎ NG。\n"
         "テーマ別 (例: 訴求軸 / 顧客層) で分ける"),
        ("03", "Search Themes を積極活用 (2025~)",
         "AIへの 『このカテゴリを狙え』 ヒント。\n"
         "Asset Group あたり 50件まで"),
        ("04", "Audience Signal は『AIへのヒント』",
         "ターゲティングではない。1PD (Customer Match) +\n"
         "Intent Segments を入れるのが効く"),
        ("05", "Negative Keywords と Brand Exclusions 必須",
         "ブランド KW の自己競合排除。\n"
         "キャンペーン単位 10,000件活用"),
    ]
    # 2+3 layout
    top = Inches(1.45)
    w = Inches(3.95)
    h = Inches(2.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (n, title, body) in enumerate(principles):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        if i == 4:  # center 5th in last row
            x = Inches(0.6) + (w + gap_x) * 1
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.12), fill=ORANGE)
        add_text(s, n, x + Inches(0.25), y + Inches(0.3),
                 Inches(1), Inches(0.6),
                 size=32, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, x + Inches(0.25), y + Inches(1.05),
                 w - Inches(0.5), Inches(0.75),
                 size=13, bold=True, color=NAVY, line_spacing=1.3)
        add_text(s, body, x + Inches(0.25), y + Inches(1.8),
                 w - Inches(0.5), Inches(0.75),
                 size=10, color=TEXT, line_spacing=1.45)

    footer(s, prs)


def p36_pmax_data(prs):
    s = blank(prs)
    page_frame(s, prs, "PMax データアクセスの改善",
               "2023-2025 で透明性が段階的に開示された",
               pagenum(6))

    # Timeline of improvements
    add_text(s, "透明性改善のタイムライン",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    improvements = [
        ("2023", "Search Terms Insights",
         "検索クエリの一部開示。カテゴリ別集約表示"),
        ("2024", "Asset Performance Reports",
         "アセット別の Best / Good / Low 評価と実数値"),
        ("2024", "Attribution 表示",
         "Cross-channel アトリビューションの可視化"),
        ("2025", "Campaign-level Negative Keywords (10,000件)",
         "検索 / ショッピング在庫に対して除外可"),
        ("2025", "Search Themes 50件 / Video 15本",
         "Asset Group の制限緩和"),
        ("2025", "Device / Demographic Targeting",
         "デバイス指定 + 年齢性別指定が可能に"),
        ("2026/03", "Google Ads Editor 2.12: Brand Guidelines",
         "用語除外 25件 + メッセージ制限 40件 が指定可 ※要確認"),
    ]
    top = Inches(2.0)
    for i, (yr, name, desc) in enumerate(improvements):
        y = top + Inches(0.65) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.55),
                 fill=LIGHT if i % 2 == 0 else WHITE,
                 line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(1.2), Inches(0.55),
                 fill=NAVY)
        add_text(s, yr, Inches(0.6), y + Inches(0.15),
                 Inches(1.2), Inches(0.3),
                 size=12, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, Inches(1.95), y + Inches(0.15),
                 Inches(5), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, desc, Inches(6.95), y + Inches(0.17),
                 Inches(6), Inches(0.3),
                 size=10, color=TEXT)

    footer(s, prs)


def p37_pmax_control(prs):
    s = blank(prs)
    page_frame(s, prs, "PMax の統制術",
               "AIを導くための 3レバー : Signal / Exclusions / Budget",
               pagenum(7))

    levers = [
        ("Audience Signal",
         "AIへのヒント",
         [
             "1PD (Customer Match / Similar)",
             "Intent Segments / In-market",
             "カスタムセグメント (URLベース)",
             "Lookalike / Predictive Audiences",
         ],
         NAVY),
        ("Exclusions",
         "無駄配信の除去",
         [
             "Negative Keywords 10,000件",
             "Brand Exclusions リスト",
             "Placement Exclusions",
             "Account-level 除外アプリ/URL",
         ],
         WARN),
        ("Budget Allocation",
         "予算による意思表示",
         [
             "キャンペーン単位の日予算",
             "tCPA / tROAS の目標値",
             "Bid Strategy : MaxConv vs MaxValue",
             "Seasonality Adjustment (短期)",
         ],
         ORANGE),
    ]
    top = Inches(1.45)
    w = Inches(3.95)
    h = Inches(5.25)
    gap = Inches(0.15)
    for i, (title, subtitle, items, color) in enumerate(levers):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.95), fill=color)
        add_text(s, title, x + Inches(0.3), top + Inches(0.2),
                 w - Inches(0.6), Inches(0.45),
                 size=18, bold=True, color=WHITE)
        add_text(s, subtitle, x + Inches(0.3), top + Inches(0.62),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        # items
        for j, item in enumerate(items):
            y = top + Inches(1.3) + Inches(0.85) * j
            add_rect(s, x + Inches(0.3), y, w - Inches(0.6),
                     Inches(0.015), fill=LIGHT_GRAY)
            add_text(s, f"▸  {item}",
                     x + Inches(0.3), y + Inches(0.18),
                     w - Inches(0.6), Inches(0.5),
                     size=11, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p38_broad_match(prs):
    s = blank(prs)
    page_frame(s, prs, "検索広告 : Broad Match の復権",
               "Smart Bidding 前提で BMM廃止後の混乱が終息した",
               pagenum(8))

    # Before / After thinking
    add_text(s, "思想の逆転",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    add_rect(s, Inches(0.6), Inches(1.95), Inches(12.15), Inches(2.2),
             fill=LIGHT, radius=True)
    # Left
    add_text(s, "旧 (〜2023)",
             Inches(0.85), Inches(2.1), Inches(5), Inches(0.35),
             size=13, bold=True, color=MID_GRAY)
    add_text(s,
             "キーワード粒度で細かく制御。\n"
             "Phrase / Exact 中心。\n"
             "Broad は無駄クリックが多いと忌避。\n"
             "マッチタイプの細分化 → 管理コスト増",
             Inches(0.85), Inches(2.5), Inches(5.5), Inches(1.6),
             size=11, color=TEXT, line_spacing=1.65)
    # Arrow
    add_shape(s, MSO_SHAPE.RIGHT_ARROW,
              Inches(6.5), Inches(2.85), Inches(0.6), Inches(0.5),
              fill=ORANGE)
    # Right
    add_text(s, "新 (2024〜)",
             Inches(7.4), Inches(2.1), Inches(5), Inches(0.35),
             size=13, bold=True, color=ORANGE)
    add_text(s,
             "Broad Match + Smart Bidding 推奨。\n"
             "ネガティブキーワードで絞る思想に反転。\n"
             "Google 公式: Broad の CV 貢献度が高い。\n"
             "『AIにマッチさせ、ネガで絞る』",
             Inches(7.4), Inches(2.5), Inches(5.3), Inches(1.6),
             size=11, color=TEXT, line_spacing=1.65)

    # Why & How
    add_text(s, "なぜ逆転したか", Inches(0.6), Inches(4.35),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.7), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    reasons = [
        "Smart Bidding (tCPA/tROAS) の精度向上で、雑なクリックもCV見込みでフィルタ",
        "BERT / MUM / Gemini の言語理解で意図マッチが飛躍的に向上",
        "Exact マッチのシェアが縮小 → 機会損失が増加",
        "Audience Signal + 1PD の活用で AI 判断の補強可能",
    ]
    for i, r in enumerate(reasons):
        y = Inches(4.9) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, r, Inches(1.0), y + Inches(0.03),
                 Inches(5.4), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.4)

    # Practical setup
    add_text(s, "副業運用の実務 (鉄板設定)",
             Inches(7.0), Inches(4.35), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(7.0), Inches(4.7), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    setup = [
        ("①", "Core KW は Exact / Phrase を土台に"),
        ("②", "Broad Match を同じ広告グループに入れる"),
        ("③", "Target CPA / Target ROAS を設定"),
        ("④", "Negative KW を 500件 程度で初期投入"),
        ("⑤", "Asset Group + RSA で複数訴求をAIが選ぶ"),
    ]
    for i, (n, t) in enumerate(setup):
        y = Inches(4.9) + Inches(0.42) * i
        add_text(s, n, Inches(7.1), y, Inches(0.4), Inches(0.3),
                 size=13, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, t, Inches(7.55), y + Inches(0.03),
                 Inches(5.2), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p39_rsa(prs):
    s = blank(prs)
    page_frame(s, prs, "RSA と広告アセット設計",
               "Expanded Text Ads (ETA) 廃止後 (2022/06) の基本形",
               pagenum(9))

    # RSA basics
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s, "RSA = Responsive Search Ads",
             Inches(0.85), Inches(1.65), Inches(6), Inches(0.3),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "見出し最大15個 + 説明文最大4個 を登録し、Google AI が組み合わせを最適化。\n"
             "ETA は 2022/06 で新規作成終了、現在も既存は配信されるが非推奨",
             Inches(0.85), Inches(2.0), Inches(12), Inches(0.5),
             size=11, color=WHITE, line_spacing=1.4)

    # Best practice cards
    add_text(s, "RSA 設計のベストプラクティス",
             Inches(0.6), Inches(2.8), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)

    practices = [
        ("見出し 15個 上限で登録",
         "AIの組み合わせ自由度を確保する"),
        ("訴求軸の多様化 (価格/信頼/機能)",
         "ABテスト対象を AIが自動選別してくれる"),
        ("Pinning は最小限に",
         "AI最適化を阻害するため、ブランド必須箇所のみ"),
        ("Ad Strength: Excellent を目指す",
         "Optiscore 上昇 + CVR改善効果あり"),
        ("Assets (sitelink / callout / structured)",
         "広告フォーマット拡大で表示面積とCTR UP"),
        ("動的アセット (Location / Price / Promotion)",
         "在庫連携で商品単位の訴求を自動生成"),
    ]
    px = Inches(0.6)
    py = Inches(3.3)
    pw = Inches(5.95)
    ph = Inches(1.1)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (head, body) in enumerate(practices):
        r, c = divmod(i, 2)
        x = px + (pw + gap_x) * c
        y = py + (ph + gap_y) * r
        add_rect(s, x, y, pw, ph, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.08), ph, fill=ORANGE)
        add_text(s, head, x + Inches(0.25), y + Inches(0.15),
                 pw - Inches(0.4), Inches(0.4),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.55),
                 pw - Inches(0.4), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p40_ai_max(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 AI Max for Search (2025/05/06 発表)",
               "検索広告のAI拡張レイヤー、DSA置換が確定",
               pagenum(10))

    # Big announcement
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.2),
             fill=NAVY, radius=True)
    add_text(s, "📢",
             Inches(0.85), Inches(1.75), Inches(0.8), Inches(0.8),
             size=30)
    add_text(s, "Google Marketing Live 2025 (2025/05/21)",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "検索広告の入札・マッチング・クリエイティブに Google AI を統合する\n"
             "『オプション機能群』として正式ローンチ。Q3 2025 全面ロールアウト",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.55),
             size=13, bold=True, color=WHITE, line_spacing=1.4)

    # 3 features
    add_text(s, "3 つの主要機能",
             Inches(0.6), Inches(2.9), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)

    features = [
        ("① Search Term Matching",
         "Broad Match を拡張。\n"
         "LLM ベースでユーザーの\n意図に近いクエリにマッチ"),
        ("② Asset Optimization",
         "ランディングページや\n既存アセットから新アセットを\n自動生成 (旧 ACA 後継)"),
        ("③ Text Customization",
         "クエリ単位で見出し・説明文を\nカスタマイズ。\n個別最適化されたコピー"),
    ]
    top = Inches(3.4)
    w = Inches(3.95)
    h = Inches(2.3)
    gap = Inches(0.15)
    for i, (title, body) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=ACCENT_BG, radius=True)
        add_rect(s, x, top, Inches(0.1), h, fill=ORANGE)
        add_text(s, title, x + Inches(0.25), top + Inches(0.2),
                 w - Inches(0.4), Inches(0.5),
                 size=14, bold=True, color=NAVY, line_spacing=1.3)
        add_text(s, body, x + Inches(0.25), top + Inches(0.8),
                 w - Inches(0.4), Inches(1.4),
                 size=11, color=TEXT, line_spacing=1.5)

    # Performance
    add_rect(s, Inches(0.6), Inches(5.9), Inches(12.15), Inches(1.05),
             fill=ORANGE, radius=True)
    add_text(s, "📊 Google 公式のパフォーマンス",
             Inches(0.85), Inches(6.0), Inches(6), Inches(0.35),
             size=12, bold=True, color=WHITE)
    add_text(s,
             "+14% のコンバージョン or CV値 (同 CPA / ROAS ベース)   |   "
             "Exact/Phrase 中心の検索キャンペーンでは +27%\n"
             "Dynamic Search Ads (DSA) は AI Max に置換される方針 ※要確認 (2026時点)",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.6),
             size=11, color=WHITE, line_spacing=1.5)

    footer(s, prs)


def p41_gemini(prs):
    s = blank(prs)
    page_frame(s, prs, "Gemini in Google Ads",
               "会話型で広告文・キャンペーン構築を補助",
               pagenum(11))

    # Two features: Conversational Campaign Builder & Asset Generation
    add_text(s, "Gemini が Google Ads 管理画面に統合 (2024~)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    features = [
        ("Conversational\nCampaign Builder",
         "2024",
         "LPのURLを入力 → Gemini が\nキーワード・広告文・画像・\n除外設定を自動提案",
         [
             "LPコンテンツを解析",
             "競合リサーチ結果を反映",
             "訴求軸を複数生成",
             "人間は確認・調整のみ",
         ]),
        ("Asset Generation",
         "2024-2025",
         "画像・動画・テキストの\n生成を Google 内で実行。\n外部ツール不要",
         [
             "画像: Imagen モデル活用",
             "動画: 静止画を動画化",
             "テキスト: 複数パターン量産",
             "ブランドガイド準拠も2026で",
         ]),
        ("Ads Studio\n(Labs)",
         "2024 Beta",
         "クリエイティブ制作のための\n統合スタジオUI",
         [
             "複数フォーマット一括生成",
             "AIプロンプトインターフェース",
             "2026時点で一部Beta ※要確認",
             "GA4 / CMS との連携拡張中",
         ]),
    ]
    top = Inches(2.1)
    w = Inches(3.95)
    h = Inches(4.65)
    gap = Inches(0.15)
    for i, (title, year, summary, bullets) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, title, x + Inches(0.25), top + Inches(0.35),
                 w - Inches(0.4), Inches(0.95),
                 size=16, bold=True, color=NAVY, line_spacing=1.2)
        add_text(s, year, x + Inches(0.25), top + Inches(1.35),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_rect(s, x + Inches(0.25), top + Inches(1.7),
                 w - Inches(0.5), Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, summary, x + Inches(0.25), top + Inches(1.85),
                 w - Inches(0.4), Inches(1.2),
                 size=11, color=TEXT, line_spacing=1.5)
        for j, b in enumerate(bullets):
            y = top + Inches(3.15) + Inches(0.35) * j
            add_text(s, "▸", x + Inches(0.25), y,
                     Inches(0.3), Inches(0.3),
                     size=10, bold=True, color=ORANGE)
            add_text(s, b, x + Inches(0.5), y + Inches(0.02),
                     w - Inches(0.7), Inches(0.3),
                     size=10, color=TEXT)

    footer(s, prs)


def p42_demand_gen(prs):
    s = blank(prs)
    page_frame(s, prs, "Demand Gen (旧Discovery Ads 統合, 2023/10)",
               "YouTube + Discover + Gmail を横断する需要喚起型",
               pagenum(12))

    # Definition + Migration
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "Demand Gen は 2023/10 に Discovery Ads を統合して登場。\n"
             "2024-2025 で Video Action Campaign (VAC) も Demand Gen に段階アップグレード",
             Inches(0.85), Inches(1.7), Inches(12), Inches(0.75),
             size=12, color=TEXT, line_spacing=1.5)

    # Channels covered
    add_text(s, "配信面 (2025~ チャネル別制御可)",
             Inches(0.6), Inches(2.75), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    channels = [
        ("YouTube\nIn-Stream",
         "従来の動画広告枠", NAVY),
        ("YouTube\nIn-Feed",
         "ホーム / 検索結果", NAVY),
        ("YouTube\nShorts",
         "縦型9:16 専用 2025~", ORANGE),
        ("Discover",
         "Androidホームのフィード", NAVY_SOFT),
        ("Gmail\nPromotions",
         "Gmailプロモーションタブ", NAVY_SOFT),
    ]
    cx = Inches(0.6)
    cy = Inches(3.2)
    cw = Inches(2.42)
    ch = Inches(1.5)
    gap = Inches(0.05)
    for i, (name, desc, color) in enumerate(channels):
        x = cx + (cw + gap) * i
        add_rect(s, x, cy, cw, ch, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, cy, cw, Inches(0.12), fill=color)
        add_text(s, name, x + Inches(0.15), cy + Inches(0.3),
                 cw - Inches(0.3), Inches(0.75),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, desc, x + Inches(0.15), cy + Inches(1.1),
                 cw - Inches(0.3), Inches(0.35),
                 size=9, color=MID_GRAY,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)

    # Key 2025 updates
    add_text(s, "2025年の主要アップデート",
             Inches(0.6), Inches(5.0), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    updates = [
        "Channel Controls: 配信面別の除外設定が可能に",
        "9:16 縦型画像アセットで YouTube Shorts 向け配信",
        "動画拡張: 1本の動画から複数アスペクト比を自動生成",
        "Shorts 単独パフォーマンス指標が表示される",
    ]
    for i, u in enumerate(updates):
        y = Inches(5.6) + Inches(0.38) * i
        add_text(s, "✓", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=12, bold=True, color=SUCCESS)
        add_text(s, u, Inches(1.1), y + Inches(0.03),
                 Inches(11), Inches(0.4),
                 size=11, color=TEXT)

    footer(s, prs)


def p43_enhanced_conv(prs):
    s = blank(prs)
    page_frame(s, prs, "Enhanced Conversions (Web / Leads)",
               "ハッシュ化1PDで計測を補強する業界標準",
               pagenum(13))

    # Two types
    types_ = [
        ("Enhanced Conversions for Web",
         "購入CVを補強",
         "CV発生時に入力された\nEmail/電話番号をハッシュ化し\nGoogleへ送信。Cookieでの\n計測漏れを補完する",
         [
             "GTM経由 / gtag.js 直接設定",
             "SHA-256 ハッシュ化 (端末側)",
             "Google側でマッチング拡張",
             "典型: +5% 〜 +15% のCV復元",
         ],
         NAVY),
        ("Enhanced Conversions for Leads",
         "B2Bリード計測",
         "リード獲得時のEmail/電話を\nアップロードし、後でCRM側の\nクロージングを Google Ads に\n戻してオフラインCV化",
         [
             "広告 → Lead 獲得を認識",
             "後日 CRM でクローズ → 送信",
             "Value-based Bidding の\n核になる設計",
             "2024-2026 で普及拡大",
         ],
         ORANGE),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(5.3)
    gap = Inches(0.15)
    for i, (title, subtitle, body, bullets, color) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.9), fill=color)
        add_text(s, title, x + Inches(0.3), top + Inches(0.15),
                 w - Inches(0.6), Inches(0.45),
                 size=17, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, subtitle, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.15),
                 w - Inches(0.6), Inches(1.5),
                 size=12, color=TEXT, line_spacing=1.5)
        add_rect(s, x + Inches(0.3), top + Inches(2.7),
                 w - Inches(0.6), Inches(0.015),
                 fill=LIGHT_GRAY)
        add_text(s, "実装ポイント",
                 x + Inches(0.3), top + Inches(2.85),
                 w - Inches(0.6), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        for j, b in enumerate(bullets):
            y = top + Inches(3.25) + Inches(0.45) * j
            add_text(s, "▸", x + Inches(0.3), y,
                     Inches(0.3), Inches(0.3),
                     size=11, bold=True, color=color)
            add_text(s, b, x + Inches(0.6), y + Inches(0.02),
                     w - Inches(0.9), Inches(0.65),
                     size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p44_consent_mode(prs):
    s = blank(prs)
    page_frame(s, prs, "Google Ads と Consent Mode v2",
               "同意信号の送信が計測精度を分ける",
               pagenum(14))

    # Context
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.85),
             fill=LIGHT, radius=True)
    add_text(s,
             "Consent Mode v2 : ユーザー同意の状態を Google に送信する仕組み。\n"
             "2024/03/06 EEA 義務化、グローバル企業は実装が事実上標準",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.7),
             size=12, color=TEXT, line_spacing=1.5)

    # Two modes
    modes = [
        ("Basic Consent Mode",
         "同意なし = タグ発火なし",
         "✗ モデル推計が限定的\n"
         "✗ Remarketing 対象不可\n"
         "✗ コンバージョンロス大"),
        ("Advanced Consent Mode (推奨)",
         "同意有無に関わらずCookieless pingを送信",
         "✓ モデル推計でCVを復元 (+20〜65%)\n"
         "✓ Bid Strategy の精度維持\n"
         "✓ Optiscore 上昇"),
    ]
    top = Inches(2.55)
    w = Inches(6.0)
    h = Inches(2.4)
    gap = Inches(0.15)
    for i, (name, sub, bullets) in enumerate(modes):
        x = Inches(0.6) + (w + gap) * i
        fill_color = LIGHT if i == 0 else ACCENT_BG
        add_rect(s, x, top, w, h, fill=fill_color, line=LIGHT_GRAY, radius=True)
        add_text(s, name, x + Inches(0.3), top + Inches(0.2),
                 w - Inches(0.6), Inches(0.4),
                 size=14, bold=True,
                 color=MID_GRAY if i == 0 else ORANGE_DARK)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=TEXT)
        add_rect(s, x + Inches(0.3), top + Inches(0.95),
                 w - Inches(0.6), Inches(0.015),
                 fill=LIGHT_GRAY)
        add_text(s, bullets, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.25),
                 size=11, color=TEXT, line_spacing=1.5)

    # Implementation
    add_text(s, "実装のポイント (2026年)",
             Inches(0.6), Inches(5.15), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.55), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    impl = [
        "CMP (Cookiebot / OneTrust / usercentrics) を先に導入",
        "Google Tag で Consent Mode v2 を Advanced に設定",
        "4つの consent パラメータを正しく送信 (ad_storage / ad_user_data / ad_personalization / analytics_storage)",
        "Tag Assistant で動作確認 → GA4 / Google Ads 両方でチェック",
    ]
    for i, u in enumerate(impl):
        y = Inches(5.75) + Inches(0.32) * i
        add_text(s, f"{i+1}.", Inches(0.7), y,
                 Inches(0.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, u, Inches(1.15), y + Inches(0.03),
                 Inches(11), Inches(0.35),
                 size=11, color=TEXT, line_spacing=1.3)

    footer(s, prs)


def p45_offline_conv(prs):
    s = blank(prs)
    page_frame(s, prs, "Offline Conversions / Customer Match",
               "1PD (ファーストパーティデータ) で Google Ads を武装する",
               pagenum(15))

    # 2 concepts
    concepts = [
        ("Offline Conversion Import (OCI)",
         "広告クリック → CRM上でクロージング\n"
         "発生した売上・LTV を GCLID 紐付けで戻す",
         [
             "Lead Gen / B2B で必須",
             "Enhanced Conversions for Leads と並行実装",
             "tROAS Bidding の基盤データ",
             "週次 or 日次でアップロード",
         ]),
        ("Customer Match",
         "既存顧客リスト (Email/電話) を Google にアップ\n"
         "既存ユーザーへのターゲティング / 除外 / Lookalike",
         [
             "ハッシュ化して送信 (SHA-256)",
             "最低 100マッチ 必要 (媒体条件による)",
             "CRM → API 直接連携が現代的",
             "PMax の Audience Signal でも活用",
         ]),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(5.0)
    gap = Inches(0.15)
    for i, (name, body, bullets) in enumerate(concepts):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.2),
                 w - Inches(0.6), Inches(0.55),
                 size=16, bold=True, color=ORANGE, line_spacing=1.2)
        add_text(s, body, x + Inches(0.3), top + Inches(1.0),
                 w - Inches(0.6), Inches(1.1),
                 size=12, color=TEXT, line_spacing=1.5)
        add_rect(s, x + Inches(0.3), top + Inches(2.15),
                 w - Inches(0.6), Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, "実装ポイント",
                 x + Inches(0.3), top + Inches(2.3),
                 w - Inches(0.6), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        for j, b in enumerate(bullets):
            y = top + Inches(2.65) + Inches(0.5) * j
            add_text(s, "▸", x + Inches(0.3), y,
                     Inches(0.3), Inches(0.3),
                     size=11, bold=True, color=ORANGE)
            add_text(s, b, x + Inches(0.6), y + Inches(0.02),
                     w - Inches(0.9), Inches(0.5),
                     size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p46_vbb(prs):
    s = blank(prs)
    page_frame(s, prs, "Value-based Bidding (VBB)",
               "売上金額・LTV で入札する現代の標準",
               pagenum(16))

    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.9),
             fill=NAVY, radius=True)
    add_text(s,
             "コンバージョン 1件ごとに『価値』を送信し、tROAS (Target ROAS) で入札。\n"
             "同じCVでも高LTV顧客・高利益商品を重視して配信できる",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.7),
             size=12, color=WHITE, line_spacing=1.5)

    # Comparison table
    add_text(s, "従来の CV ベース vs Value ベース",
             Inches(0.6), Inches(2.6), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    rows = [
        ("評価軸", "CV件数 (tCPA / MaxConv)",
         "CV値 / 売上 (tROAS / MaxValue)"),
        ("最適化対象", "低単価CVの大量獲得",
         "高LTV・高利益のCVに偏重"),
        ("データ要件", "CV発生のみ",
         "CV + 値 (購入金額 / LTV推定値)"),
        ("おすすめ業種", "リード獲得 / 新規",
         "EC / SaaS / 高単価商材"),
        ("導入難易度", "低 (基本構成)",
         "中 (値の設計が必要)"),
    ]
    col_x = [Inches(0.6), Inches(3.6), Inches(8.2)]
    col_w = [Inches(3), Inches(4.6), Inches(4.55)]
    add_rect(s, Inches(0.6), Inches(3.05), Inches(12.15), Inches(0.5),
             fill=NAVY)
    headers = ["観点", "CV件数ベース", "Value ベース (VBB)"]
    for i, h in enumerate(headers):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(3.15),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)

    for i, row in enumerate(rows):
        y = Inches(3.55) + Inches(0.55) * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.5),
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            add_text(s, cell, col_x[j] + Inches(0.15),
                     y + Inches(0.13),
                     col_w[j] - Inches(0.2), Inches(0.3),
                     size=11, bold=(j == 0),
                     color=NAVY if j == 0 else TEXT,
                     line_spacing=1.3)

    # Tips
    add_rect(s, Inches(0.6), Inches(6.5), Inches(12.15), Inches(0.45),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 LTV推定が難しい場合は『初回購入金額 × 係数』や『商品カテゴリ別固定値』から始める",
             Inches(0.85), Inches(6.58), Inches(12), Inches(0.35),
             size=11, bold=True, color=ORANGE_DARK)

    footer(s, prs)


def p47_audiences(prs):
    s = blank(prs)
    page_frame(s, prs, "Audience / Predictive Audiences (2026)",
               "1PD + AI予測で攻めるオーディエンス設計",
               pagenum(17))

    # 4 audience types
    types_ = [
        ("1PD\nAudience",
         "Customer Match\nSimilar Audience",
         "既存顧客リスト・LAL\nハッシュ化 → API連携"),
        ("Intent\n(Google)",
         "In-market\nCustom Intent",
         "検索意図・\nWebサイト履歴ベース"),
        ("GA4\nベース",
         "Remarketing\nPredictive Audiences",
         "購入予測 / 離脱予測\n有料ユーザー予測"),
        ("YouTube\nAudience",
         "Affinity\n視聴履歴ベース",
         "興味関心カテゴリ\n視聴行動からの推定"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.3)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.3),
                 w - Inches(0.4), Inches(0.75),
                 size=15, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(1.05),
                 w - Inches(0.4), Inches(0.55),
                 size=11, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), top + Inches(1.6),
                 w - Inches(0.4), Inches(0.65),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.4)

    # GA4 Predictive highlight
    add_text(s, "🔥 GA4 Predictive Audiences (副業代行で差別化できる)",
             Inches(0.6), Inches(4.1), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.5), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    pred = [
        ("Likely 7-day Purchasers",
         "7日以内に購入見込みのユーザー"),
        ("Likely 7-day Churners",
         "7日以内に離脱見込みのユーザー"),
        ("Predicted Revenue",
         "予測される30日売上で重み付け"),
        ("Top Spenders",
         "累計支出上位ユーザーの LAL"),
    ]
    px = Inches(0.6)
    py = Inches(4.7)
    pw = Inches(2.95)
    ph = Inches(1.1)
    gap_x = Inches(0.1)
    for i, (name, desc) in enumerate(pred):
        x = px + (pw + gap_x) * i
        add_rect(s, x, py, pw, ph, fill=ACCENT_BG, radius=True)
        add_rect(s, x, py, Inches(0.08), ph, fill=ORANGE)
        add_text(s, name, x + Inches(0.2), py + Inches(0.15),
                 pw - Inches(0.3), Inches(0.4),
                 size=11, bold=True, color=NAVY, font=EN_FONT,
                 line_spacing=1.3)
        add_text(s, desc, x + Inches(0.2), py + Inches(0.55),
                 pw - Inches(0.3), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.4)

    # Note
    add_text(s,
             "💡 これらは GA4 の機械学習で自動生成される。Ecサイト / サブスクで強力",
             Inches(0.6), Inches(6.1), Inches(12), Inches(0.3),
             size=10, color=MID_GRAY)

    footer(s, prs)


def p48_attribution(prs):
    s = blank(prs)
    page_frame(s, prs, "Attribution : DDA と Cross-channel",
               "ラストクリック時代は終わり、DDA が標準に",
               pagenum(18))

    # Model history
    add_text(s, "アトリビューションモデルの歴史",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    models = [
        ("Last Click", "従来主流", "最後のクリックに100%配分",
         MID_GRAY),
        ("Position-Based", "2019~", "First + Last を重視", MID_GRAY),
        ("Linear", "2019~", "全タッチポイント均等", MID_GRAY),
        ("Time Decay", "2019~", "直近のクリックほど重い",
         MID_GRAY),
        ("Data-Driven (DDA)", "2022~デフォルト",
         "ML で実データから配分", ORANGE),
    ]
    top = Inches(2.0)
    for i, (name, year, desc, color) in enumerate(models):
        y = top + Inches(0.6) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.5),
                 fill=LIGHT if i % 2 == 0 else WHITE,
                 line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(2.5), Inches(0.5),
                 fill=color)
        add_text(s, name, Inches(0.6), y + Inches(0.13),
                 Inches(2.5), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER)
        add_text(s, year, Inches(3.3), y + Inches(0.13),
                 Inches(2), Inches(0.3),
                 size=11, bold=True, color=color, font=EN_FONT)
        add_text(s, desc, Inches(5.5), y + Inches(0.15),
                 Inches(7), Inches(0.3),
                 size=11, color=TEXT)

    # DDA deep dive
    add_rect(s, Inches(0.6), Inches(5.15), Inches(12.15), Inches(1.8),
             fill=NAVY, radius=True)
    add_text(s, "Data-Driven Attribution (DDA) の中身",
             Inches(0.85), Inches(5.3), Inches(10), Inches(0.35),
             size=13, bold=True, color=ORANGE)
    add_text(s,
             "• 機械学習が実際の購入経路からタッチポイントの貢献度を算出\n"
             "• 2022年に Google Ads / GA4 のデフォルトに昇格\n"
             "• Cross-channel : Search / Display / YouTube / Shopping を横断評価\n"
             "• 副業代行のポイント : レポートで必ず『DDA設定済』を確認、Last Click は非推奨",
             Inches(0.85), Inches(5.7), Inches(12), Inches(1.2),
             size=11, color=WHITE, line_spacing=1.55)

    footer(s, prs)


def p49_optiscore(prs):
    s = blank(prs)
    page_frame(s, prs, "Optiscore の活用と罠",
               "100点満点を盲信しない、使いどころを選ぶ",
               pagenum(19))

    # Two columns: 活用 vs 罠
    add_text(s, "活用するべき提案", Inches(0.6), Inches(1.55),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=SUCCESS)
    add_rect(s, Inches(0.6), Inches(1.9), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    good = [
        ("Enhanced Conversions 有効化",
         "シグナル補強 = 無料で効く"),
        ("Consent Mode v2 実装",
         "モデリング精度向上"),
        ("DDA への切り替え", "ラストクリック依存を脱する"),
        ("Audience Signal 追加",
         "PMax の学習加速"),
        ("Ad Strength 改善",
         "アセット多様化で CVR 改善"),
    ]
    for i, (head, body) in enumerate(good):
        y = Inches(2.1) + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.5),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "✓", Inches(0.8), y + Inches(0.13),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=SUCCESS)
        add_text(s, head, Inches(1.2), y + Inches(0.08),
                 Inches(4.7), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(1.2), y + Inches(0.3),
                 Inches(4.7), Inches(0.3),
                 size=9, color=MID_GRAY)

    # Traps
    add_text(s, "鵜呑みにしない提案 (罠)",
             Inches(7.0), Inches(1.55),
             Inches(6), Inches(0.35),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(7.0), Inches(1.9), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    bad = [
        ("予算増額", "CPA悪化のリスク, 目標と別基準"),
        ("tCPA/tROAS の緩和",
         "AIの『学習しやすい』提案、収益性劣化"),
        ("マッチタイプを全 Broad に",
         "同業種 KW侵食や無関係 Broad"),
        ("全自動入札への切替",
         "業種・商材で効かないケースあり"),
        ("キーワード追加 (意図不一致)",
         "競合・類語の関連KW混入"),
    ]
    for i, (head, body) in enumerate(bad):
        y = Inches(2.1) + Inches(0.55) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.5),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "✗", Inches(7.2), y + Inches(0.13),
                 Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=WARN)
        add_text(s, head, Inches(7.6), y + Inches(0.08),
                 Inches(4.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(7.6), y + Inches(0.3),
                 Inches(4.5), Inches(0.3),
                 size=9, color=MID_GRAY)

    # Bottom
    add_rect(s, Inches(0.6), Inches(5.15), Inches(12.15), Inches(1.75),
             fill=NAVY, radius=True)
    add_text(s, "💡 Optiscore との付き合い方",
             Inches(0.85), Inches(5.3), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 80%以上は目指す価値あり / 95%以上を追求すると過剰最適化 (予算爆増・CPA崩壊) のリスク\n"
             "• 提案は『計測・学習補助系』を優先。『予算・入札緩和』は慎重\n"
             "• 提案を適用しても月次レビューで必ずパフォーマンスを確認\n"
             "• 副業代行 : クライアントには『適用した提案リストと理由』を月次レポートで明示",
             Inches(0.85), Inches(5.65), Inches(12), Inches(1.2),
             size=11, color=WHITE, line_spacing=1.55)

    footer(s, prs)


def p50_new_customer(prs):
    s = blank(prs)
    page_frame(s, prs, "New Customer Acquisition (NCA) Goal",
               "新規顧客獲得を明示的に最適化する",
               pagenum(20))

    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "PMax / Demand Gen / Search に搭載された『新規顧客優先』設定。\n"
             "過去の購入履歴を参照し、既存顧客 vs 新規顧客を識別して最適化",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=TEXT, line_spacing=1.5)

    # Two modes
    modes = [
        ("New Customer Only",
         "新規顧客にのみ配信\n既存顧客には一切配信しない",
         "コスト : 短期CPA高騰\n"
         "ポテンシャル : 顧客ベース拡大\n"
         "適合 : D2C / SaaS の CAC 管理"),
        ("New Customer Value",
         "新規のCVに『プレミアム価値』を上乗せ\n既存も配信 + AIへ新規志向を伝える",
         "コスト : 短期CPA は既存比で高め\n"
         "ポテンシャル : LTV想定と整合\n"
         "適合 : バランス重視の EC"),
    ]
    top = Inches(2.75)
    w = Inches(6.0)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, body, effect) in enumerate(modes):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.75), fill=ORANGE if i == 1 else NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.0),
                 w - Inches(0.6), Inches(0.9),
                 size=11, color=TEXT, line_spacing=1.5)
        add_rect(s, x + Inches(0.3), top + Inches(1.95),
                 w - Inches(0.6), Inches(0.015),
                 fill=LIGHT_GRAY)
        add_text(s, "効果とフィット",
                 x + Inches(0.3), top + Inches(2.1),
                 w - Inches(0.6), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, effect, x + Inches(0.3), top + Inches(2.35),
                 w - Inches(0.6), Inches(0.65),
                 size=10, color=TEXT, line_spacing=1.5)

    # Implementation
    add_rect(s, Inches(0.6), Inches(5.95), Inches(12.15), Inches(0.95),
             fill=ACCENT_BG, radius=True)
    add_text(s, "実装に必要なもの",
             Inches(0.85), Inches(6.05), Inches(11), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Customer Match リスト (既存顧客) のアップロード or GA4 の Purchaser Audience 接続\n"
             "→ Google が識別し、新規 vs 既存でフラグを付けて最適化。副業代行の初回ヒアリングで必ず確認",
             Inches(0.85), Inches(6.35), Inches(12), Inches(0.5),
             size=10, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p51_store_local(prs):
    s = blank(prs)
    page_frame(s, prs, "Store Goals / Local キャンペーン",
               "実店舗系の施策は PMax に吸収された",
               pagenum(21))

    # Before / After
    add_text(s, "2023年以前 vs 2026年",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    comparison = [
        ("キャンペーンタイプ",
         "Local Campaigns (単独)",
         "PMax with Store Goals (統合)"),
        ("最適化対象",
         "店舗訪問 / 電話 / ルート",
         "Store Visit + Online CV 同時最適化"),
        ("配信面",
         "Maps / Search / YouTube",
         "PMax全面 (Maps / 検索 / YT / Discover / Display)"),
        ("アセット",
         "個別入稿",
         "Asset Group で一元管理"),
        ("計測",
         "Store Visit 独立",
         "Store Sales Direct + Store Visit 統合"),
    ]
    top = Inches(2.05)
    row_h = Inches(0.65)
    add_rect(s, Inches(0.6), top, Inches(12.15), Inches(0.5),
             fill=NAVY)
    headers_ = ["項目", "旧 (〜2023)", "新 (2026)"]
    col_x = [Inches(0.6), Inches(3.8), Inches(8.5)]
    col_w = [Inches(3.2), Inches(4.7), Inches(4.25)]
    for i, h in enumerate(headers_):
        add_text(s, h, col_x[i] + Inches(0.2), top + Inches(0.12),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)

    for i, row in enumerate(comparison):
        y = top + Inches(0.5) + row_h * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), row_h,
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            color = NAVY if j == 0 else (MID_GRAY if j == 1 else TEXT)
            add_text(s, cell, col_x[j] + Inches(0.2),
                     y + Inches(0.19),
                     col_w[j] - Inches(0.2), Inches(0.35),
                     size=11, bold=(j == 0),
                     color=color, line_spacing=1.3)

    # Usage note
    add_rect(s, Inches(0.6), Inches(6.25), Inches(12.15), Inches(0.7),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 実店舗 (飲食/小売/美容) の副業代行では Store Goals 付き PMax が基本構成",
             Inches(0.85), Inches(6.38), Inches(12), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Maps / Google ビジネスプロフィール の連携が前提。Local Inventory Ads (LIA) も補助的に",
             Inches(0.85), Inches(6.65), Inches(12), Inches(0.3),
             size=10, color=TEXT)

    footer(s, prs)


def p52_app_campaigns(prs):
    s = blank(prs)
    page_frame(s, prs, "App Campaigns (参考)",
               "アプリインストール・エンゲージメント専用",
               pagenum(22))

    # App campaign types
    types_ = [
        ("App Install",
         "Ads for Install",
         "新規ダウンロード獲得。\n"
         "目標CPIで自動入札"),
        ("App Engagement",
         "App Campaigns for Engagement",
         "既存ユーザーの復帰・\nディープリンクで特定画面へ"),
        ("App Pre-registration",
         "リリース前の事前登録",
         "Google Play の\n事前登録リスト獲得"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.3)
    gap = Inches(0.15)
    for i, (cat, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), top + Inches(0.3),
                 w - Inches(0.5), Inches(0.45),
                 size=16, bold=True, color=NAVY)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.8),
                 w - Inches(0.5), Inches(0.3),
                 size=10, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), top + Inches(1.2),
                 w - Inches(0.5), Inches(1.05),
                 size=11, color=TEXT, line_spacing=1.5)

    # Key points for 2026
    add_text(s, "2026年の主な変化",
             Inches(0.6), Inches(4.2), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.6), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    changes = [
        "Advantage+ App (Meta) との比較でUAC vs Advantage+ の使い分けが定着",
        "SKAN (iOS) と Consented Install Referrer (Android) でシグナル再設計",
        "Engagement 型では GA4 4 の Audience 連携が強化",
        "Install の価値差 (高LTV vs 低LTV) 向け Value-based Bidding 推奨",
    ]
    for i, c in enumerate(changes):
        y = Inches(4.8) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y,
                 Inches(0.3), Inches(0.3),
                 size=12, bold=True, color=ORANGE)
        add_text(s, c, Inches(1.0), y + Inches(0.03),
                 Inches(11), Inches(0.4),
                 size=11, color=TEXT, line_spacing=1.4)

    # Note
    add_rect(s, Inches(0.6), Inches(6.65), Inches(12.15), Inches(0.3),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 Webクライアント中心の副業代行では低頻度。アプリ案件はUA / Firebase / App Campaigns 基本形を再学習",
             Inches(0.85), Inches(6.72), Inches(12), Inches(0.25),
             size=10, bold=True, color=ORANGE_DARK)

    footer(s, prs)


def p53_youtube_in_ads(prs):
    s = blank(prs)
    page_frame(s, prs, "YouTube 面の Google Ads 側まとめ",
               "Video Reach / Demand Gen / PMax で分担",
               pagenum(23))

    # 3 approaches
    approaches = [
        ("Video Reach Campaign",
         "ブランド認知",
         "TrueView / Bumper /\nSkippable / Non-skippable を\n統合配信。CPM 最適化",
         NAVY),
        ("Demand Gen",
         "需要喚起・中間CV",
         "YT In-Stream / In-Feed / Shorts +\nDiscover + Gmail\n縦型対応, VAC 後継",
         ORANGE),
        ("Performance Max",
         "コンバージョン獲得",
         "YT枠を含む全在庫で\n自動配信。tROAS / tCPA",
         NAVY_SOFT),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, obj, body, color) in enumerate(approaches):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=color)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.5), Inches(0.45),
                 size=15, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, obj, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.5), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.5), Inches(1.8),
                 size=11, color=TEXT, line_spacing=1.55)

    # ABCD principles
    add_text(s, "YouTube広告クリエイティブの ABCD原則 (2026版)",
             Inches(0.6), Inches(4.85), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(5.25), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    abcd = [
        ("A", "Attract",
         "最初の3秒で掴む。人物/音/テロップで意表を突く"),
        ("B", "Brand",
         "5秒以内にブランド露出。ロゴ/商品/色を前面に"),
        ("C", "Connect",
         "ベネフィットを具体的に。数字/事例を入れる"),
        ("D", "Direct",
         "CTA明確化 : 『今すぐ』『LINE友達追加』等"),
    ]
    ax = Inches(0.6)
    ay = Inches(5.45)
    aw = Inches(2.95)
    ah = Inches(1.5)
    gap_x = Inches(0.1)
    for i, (letter, word, body) in enumerate(abcd):
        x = ax + (aw + gap_x) * i
        add_rect(s, x, ay, aw, ah, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, letter, x + Inches(0.25), ay + Inches(0.15),
                 Inches(0.8), Inches(0.8),
                 size=48, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, word, x + Inches(1.2), ay + Inches(0.25),
                 aw - Inches(1.3), Inches(0.35),
                 size=14, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), ay + Inches(0.95),
                 aw - Inches(0.4), Inches(0.5),
                 size=9, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p54_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "鉄板運用メソッド 2026年版",
               "新規案件で最初の30日にやること",
               pagenum(24))

    # 5 steps checklist
    steps = [
        ("Day 0-2 : 計測基盤の整備",
         [
             "GA4 + GTM (or SGTM) + Consent Mode v2 導入状況の確認",
             "Enhanced Conversions 有効化",
             "Customer Match リストのアップロード (Customer Match)",
             "Offline Conversion Import の設定 (リード案件のみ)",
         ]),
        ("Day 3-7 : キャンペーン構造の設計",
         [
             "検索 (Broad Match + Smart Bidding) + PMax の2軸構成",
             "Asset Group を 3-5 個で start (訴求軸ごと)",
             "Audience Signal に 1PD を投入",
             "Negative Keywords 500件 を初期投入",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "Bid Strategy は tCPA / tROAS で固定",
             "予算変動 ±20% 以内に抑える",
             "アセット追加は慎重 (学習リセットのリスク)",
             "Optiscore の『計測・学習補助系』提案のみ適用",
         ]),
        ("Day 22-30 : 最適化+レポート",
         [
             "Search Terms で無駄クエリ特定 → Negative 追加",
             "アセット Best / Low を入れ替え",
             "DDA での Cross-channel 貢献度確認",
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
        # items in 2 cols
        for j, item in enumerate(items):
            r, c = divmod(j, 2)
            x = Inches(0.95) + Inches(5.95) * c
            yy = y + Inches(0.5) + Inches(0.35) * r
            add_text(s, "▸", x, yy, Inches(0.25), Inches(0.3),
                     size=10, bold=True, color=ORANGE)
            add_text(s, item, x + Inches(0.25),
                     yy + Inches(0.03),
                     Inches(5.6), Inches(0.35),
                     size=10, color=TEXT, line_spacing=1.3)

    footer(s, prs)


def p55_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "よくある失敗と回避策",
               "副業代行で『あ、やっちゃった』を防ぐチェック",
               pagenum(25))

    pitfalls = [
        ("学習期間中に予算を大きく動かす",
         "Bid Strategy が不安定化 → CPA/ROAS 崩壊",
         "最初2週間は ±20% 以内に制限"),
        ("Asset Group を分けすぎる",
         "各 Asset Group のデータ量が不足 → AI学習弱体",
         "3-5 個 を上限に、訴求軸で分ける"),
        ("Exact / Phrase だけで固める",
         "機会損失大 + Broad にすべきクエリを逃す",
         "Broad + Smart Bidding を併用、ネガで絞る"),
        ("Consent Mode 未実装で配信",
         "計測ロス + モデリング不可",
         "初回ヒアリングで必ず実装状況確認"),
        ("Optiscore 100%を追求",
         "予算爆増・CPA 高騰 → クライアント激怒",
         "80-90% 前後で運用、提案は選別適用"),
        ("Last Click モデルで評価",
         "AI キャンペーンの貢献を正しく計れない",
         "DDA に即切り替え、レポートも DDA 基準"),
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


# ---------- Main ----------
def main():
    prs = new_presentation()
    p31_divider(prs)
    p32_tldr(prs)
    p33_campaign_types(prs)
    p34_pmax_overview(prs)
    p35_pmax_structure(prs)
    p36_pmax_data(prs)
    p37_pmax_control(prs)
    p38_broad_match(prs)
    p39_rsa(prs)
    p40_ai_max(prs)
    p41_gemini(prs)
    p42_demand_gen(prs)
    p43_enhanced_conv(prs)
    p44_consent_mode(prs)
    p45_offline_conv(prs)
    p46_vbb(prs)
    p47_audiences(prs)
    p48_attribution(prs)
    p49_optiscore(prs)
    p50_new_customer(prs)
    p51_store_local(prs)
    p52_app_campaigns(prs)
    p53_youtube_in_ads(prs)
    p54_playbook(prs)
    p55_pitfalls(prs)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
