#!/usr/bin/env python3
"""Build Part 3-D TikTok + LINE (25p, P100-P124)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part3d.pptx"
PNUM_BASE = 99


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def divider_with_subs(prs, sub_label, title, subtitle, pages, summary,
                      subsections):
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


# ---------- TikTok ----------
def p100_divider(prs):
    divider_with_subs(
        prs,
        "3-D   |   B2C縦型ペア",
        "TikTok + LINE",
        "Z世代-30代の必修媒体ペア。Smart+ AI と LINEヤフー統合直前",
        "25p",
        "TikTok は Smart+ + Symphony AI で完全自動化が成熟、TikTok Shop が日本上陸 (2025/06/30)。\n"
        "LINEは LINEヤフー広告統合 (2026春) を控え、現在は LINE広告単独運用の最終期",
        [
            ("TikTok", "15p (P100-P114)",
             "Smart+ / Symphony Creative Studio /\nSpark Ads / TikTok Shop /\nPangle / Brand Lift"),
            ("LINE", "10p (P115-P124)",
             "LAP / Talk Head View / 配信面 /\n友だち追加 / 公式アカウント連携 /\n2026春統合の準備"),
        ],
    )


def p101_tiktok_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok Ads ランドスケープ 2026",
               "Smart+ AI 中心 + Shop Ads + Symphony 補助",
               pagenum(2))
    # Stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "TikTok 日本MAU",
             Inches(0.85), Inches(1.65), Inches(4), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    add_text(s, "33M+", Inches(0.85), Inches(1.95),
             Inches(3.5), Inches(0.85),
             size=44, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "TikTok Shop ローンチ後 6ヶ月",
             Inches(5.5), Inches(1.7), Inches(7), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "50,000+ sellers / 200,000+ creators / GMVの 70% が\n"
             "コンテンツ起点購買 (動画→購入)",
             Inches(5.5), Inches(2.0), Inches(7), Inches(0.75),
             size=11, color=WHITE, line_spacing=1.5)

    # Product map
    add_text(s, "TikTok 広告プロダクト 2026",
             Inches(0.6), Inches(3.0), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    products = [
        ("Smart+", "Web/Catalog/App/Lead",
         "完全自動化キャンペーン\n2024/10ローンチ"),
        ("Spark Ads", "Organic Boost",
         "既存投稿を広告化\nUGCの原型を保つ"),
        ("Shop Ads", "TikTok Shop連動",
         "EC購入特化\n2025/07~ 日本"),
        ("Brand Takeover", "起動時表示",
         "1日1ブランド\n認知最大化"),
        ("Top View", "起動5秒動画",
         "認知獲得型\nCPM最高単価"),
    ]
    top = Inches(3.45)
    w = Inches(2.43)
    h = Inches(2.0)
    gap = Inches(0.05)
    for i, (name, sub, body) in enumerate(products):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55),
                 fill=ORANGE if i < 3 else NAVY)
        add_text(s, name, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, sub, x + Inches(0.15), top + Inches(0.7),
                 w - Inches(0.3), Inches(0.4),
                 size=10, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER, line_spacing=1.3)
        add_text(s, body, x + Inches(0.15), top + Inches(1.15),
                 w - Inches(0.3), Inches(0.8),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.45)

    # Note
    add_rect(s, Inches(0.6), Inches(5.7), Inches(12.15), Inches(1.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえる戦略",
             Inches(0.85), Inches(5.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• B2C案件のメイン構成 = Smart+ Web (CV) + Spark Ads (UGC補強)\n"
             "• EC案件 = Shop Ads (2025/07~ 日本) + Smart+ Catalog\n"
             "• ブランディング案件 = Top View / Brand Takeover を月単位で組込",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p102_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok : 地殻変動 TL;DR",
               "2023年9月 → 2026年4月 / 5つの大変化",
               pagenum(3))
    points = [
        ("01", "Smart+ で完全自動化が成熟 (2024/10)",
         "Web/Catalog/App/Lead で『1キャンペーンで全自動』。\n"
         "Ray-Ban で +50% CVR / +42% ROAS の事例"),
        ("02", "Symphony AI でクリエイティブ生成が標準",
         "Image to Video / Text to Video / Digital Avatars (30+言語)。\n"
         "AI Dubbing でグローバル展開も同時実行"),
        ("03", "TikTok Shop 日本上陸 (2025/06/30)",
         "EC購買が TikTok 内で完結。GMVの 70% が動画起点購入。\n"
         "Shop Ads (2025/07~) で運用代行案件が新ジャンル化"),
        ("04", "Spark Ads が UGC 主流化",
         "オーガニック投稿を広告化、ステマ規制下でも適切な PR表記で運用可。\n"
         "Creator collab + Spark Ads が D2C鉄板"),
        ("05", "計測 : Events API + Pixel + 1PD 統合",
         "iOS/ATTシグナル減対応で Events API (CAPI相当) が必須。\n"
         "Conversion Lift (Brand Lift も) が Brand案件で標準化"),
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


def p103_smart_plus(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 TikTok Smart+ Campaigns (2024/10)",
               "完全自動化キャンペーン 4タイプ",
               pagenum(4))
    types_ = [
        ("Smart+ Web",
         "Webサイト誘導・CV",
         "サイトCVを最適化\nLP / フォーム / 購入"),
        ("Smart+ Catalog",
         "EC商品データ連携",
         "Product Feed → 動的広告\n商品ページに直接遷移"),
        ("Smart+ App",
         "アプリインストール",
         "iOS SKAN対応\n初回起動 + 24h CV"),
        ("Smart+ Lead",
         "リード獲得",
         "TikTok内フォーム\nB2B / 不動産 / 教育"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.4)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.4),
                 size=15, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.0),
                 w - Inches(0.4), Inches(1.3),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Performance highlight
    add_rect(s, Inches(0.6), Inches(4.2), Inches(12.15), Inches(1.4),
             fill=NAVY, radius=True)
    add_text(s, "📊 Smart+ 効果 (TikTok 公式事例)",
             Inches(0.85), Inches(4.35), Inches(11), Inches(0.35),
             size=13, bold=True, color=ORANGE)
    add_text(s,
             "Ray-Ban (Smart+ ローンチ時 ベータ参加) :\n"
             "    +50% コンバージョン率 / +42% ROAS",
             Inches(0.85), Inches(4.7), Inches(12), Inches(0.85),
             size=14, bold=True, color=WHITE, line_spacing=1.55,
             font=EN_FONT)

    # 3 benefits
    add_text(s, "Smart+ の3つの自動化レイヤー",
             Inches(0.6), Inches(5.85), Inches(12), Inches(0.4),
             size=12, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(6.25), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    layers = [
        ("Targeting", "オーディエンスを AI が自動拡張"),
        ("Creative", "Asset 組合せを AI 最適化"),
        ("Bidding", "Target CPA / ROAS 自動入札"),
    ]
    for i, (cat, desc) in enumerate(layers):
        y = Inches(6.4) + Inches(0.18) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, f"{cat} :", Inches(1.0), y + Inches(0.02),
                 Inches(2.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, desc, Inches(3.5), y + Inches(0.02),
                 Inches(8.5), Inches(0.3),
                 size=11, color=TEXT)
    footer(s, prs)


def p104_symphony(prs):
    s = blank(prs)
    page_frame(s, prs, "Symphony Creative Studio (GA)",
               "TikTok公式の生成AIクリエイティブ・スイート",
               pagenum(5))
    # Top callout
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Symphony Creative Studio : 全 TikTok for Business ユーザー向けに GA。\n"
             "AI生成動画は『AI-generated』ラベルが自動付与 (透明性確保)",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 6 key features
    features = [
        ("Image to Video",
         "静止画→5秒動画",
         "商品写真・モードボード→\nTikTok型 5秒クリップ"),
        ("Text to Video",
         "テキスト→5秒動画",
         "プロンプトから直接\n動画生成"),
        ("Showcase Products",
         "商品+Avatar 動画",
         "商品画像 + Avatar 選択 →\n紹介動画 自動生成"),
        ("Digital Avatars",
         "30+言語 (Stock + Custom)",
         "ライセンス済 Stock Avatar +\n自社特注 Custom Avatar"),
        ("Daily Generations",
         "毎日新動画提案",
         "ブランド + 商品 + 過去履歴から\n自動生成提案"),
        ("AI Dubbing",
         "多言語 + Lip-sync",
         "音声クローン + リップシンク\nグローバル展開で活用"),
    ]
    top = Inches(2.65)
    w = Inches(3.95)
    h = Inches(1.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (name, sub, body) in enumerate(features):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), y + Inches(0.22),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, sub, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), y + Inches(0.95),
                 w - Inches(0.4), Inches(0.55),
                 size=10, color=TEXT, line_spacing=1.4)

    # Note
    add_rect(s, Inches(0.6), Inches(6.05), Inches(12.15), Inches(0.9),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 副業代行 : 月20万以下のSMBクライアントでも生成AIクリエイティブで月10-30本量産が可能 (人件費圧縮)",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.6),
             size=11, bold=True, color=ORANGE_DARK, line_spacing=1.45)
    footer(s, prs)


def p105_spark_ads(prs):
    s = blank(prs)
    page_frame(s, prs, "Spark Ads — UGCの原型を保つ広告",
               "オーガニック投稿を広告化する仕組み",
               pagenum(6))
    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "Spark Ads : 既存のオーガニック TikTok 投稿 (自社 or クリエイター) を広告として配信。\n"
             "UGC感のある動画を広告として活用、CTR・エンゲージメントが Manual広告より高い傾向",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=TEXT, line_spacing=1.5)

    # 2 modes
    modes = [
        ("自社アカウント Spark Ads",
         "ブランド公式投稿を広告化",
         "自社アカウントの過去・新規投稿を\n広告として配信。\n"
         "コメント・いいね・フォロー がそのまま積算\n"
         "UGC感のあるブランド広告として効く"),
        ("クリエイター Spark Ads",
         "クリエイター投稿を広告化",
         "Creator Marketplace で発掘した\nクリエイター投稿を広告化。\n"
         "クリエイター承認 → 広告主が配信\n"
         "PR表記必須 (ステマ規制対応)"),
    ]
    top = Inches(2.65)
    w = Inches(6.0)
    h = Inches(2.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(modes):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=14, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.55)

    # Why this matters
    add_rect(s, Inches(0.6), Inches(5.55), Inches(12.15), Inches(1.4),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で活用するシナリオ",
             Inches(0.85), Inches(5.7), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• D2C / コスメ / アパレル : クリエイター Spark Ads が CVR / ROAS で最強 (UGC効果)\n"
             "• 中小ブランド : 自社オーガニック投稿の中から伸びてる動画を Spark Ads で広告化\n"
             "• ステマ規制対応 : クリエイター案件は必ず PR / 提供 などの明示を契約条件に",
             Inches(0.85), Inches(6.05), Inches(12), Inches(0.85),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p106_shop_ads(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 TikTok Shop Ads (2025/07 日本)",
               "TikTok Shop 公式ローンチ後の運用代行新ジャンル",
               pagenum(7))
    # Stats
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.7),
             fill=NAVY, radius=True)
    add_text(s, "TikTok Shop Japan 6ヶ月後の状況",
             Inches(0.85), Inches(1.65), Inches(11), Inches(0.4),
             size=13, bold=True, color=ORANGE)
    stats_row = [
        ("33M+", "MAU"),
        ("50,000+", "Active Sellers"),
        ("200,000+", "Creators"),
        ("70%", "GMV from Content"),
    ]
    for i, (val, label) in enumerate(stats_row):
        x = Inches(0.85) + Inches(3.0) * i
        add_text(s, val, x, Inches(2.05),
                 Inches(2.8), Inches(0.6),
                 size=28, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, label, x, Inches(2.7),
                 Inches(2.8), Inches(0.4),
                 size=11, color=LIGHT_GRAY,
                 align=PP_ALIGN.CENTER)

    # Shop Ads ad types
    add_text(s, "Shop Ads の広告タイプ",
             Inches(0.6), Inches(3.4), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    types_ = [
        ("Video Shopping Ads",
         "動画広告内に商品ショーケース表示。\nクリック→商品ページへ"),
        ("Product Shopping Ads",
         "商品単独画像広告。\nFor Youフィードに表示"),
        ("LIVE Shopping Ads",
         "ライブ配信を広告化。\nリアルタイム購買を促進"),
    ]
    top = Inches(3.85)
    w = Inches(3.95)
    h = Inches(2.0)
    gap = Inches(0.15)
    for i, (name, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.25),
                 size=11, color=TEXT, line_spacing=1.55)

    # Note
    add_text(s,
             "💡 早期参入ブランド : Unilever Japan / Nissin Foods / WEGO / YA-MAN — 大手主導で SMBは2026以降が主戦場",
             Inches(0.6), Inches(6.0), Inches(12), Inches(0.95),
             size=11, color=MID_GRAY, line_spacing=1.5)
    footer(s, prs)


def p107_creative_center(prs):
    s = blank(prs)
    page_frame(s, prs, "Creative Center — TikTok公式リサーチツール",
               "競合分析・トレンド発掘の必須ツール",
               pagenum(8))
    # 4 features
    features = [
        ("Top Ads Dashboard",
         "業種・地域別の高パフォーマンス広告\n実績ベースの広告ライブラリ"),
        ("Trend Discovery",
         "トレンドハッシュタグ・楽曲\n7/30日トレンドを可視化"),
        ("Creative Insights",
         "広告ベンチマーク\nCVR / CTR / VTR の業界平均"),
        ("Symphony Tools 連携",
         "リサーチ → AI生成までシームレス\nTikTok内で完結"),
    ]
    top = Inches(1.55)
    w = Inches(5.95)
    h = Inches(1.85)
    gap_x = Inches(0.2)
    gap_y = Inches(0.2)
    for i, (name, body) in enumerate(features):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, name, x + Inches(0.25), y + Inches(0.15),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(1.2),
                 size=11, color=TEXT, line_spacing=1.55)

    # Tip
    add_rect(s, Inches(0.6), Inches(5.65), Inches(12.15), Inches(1.3),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行ワークフロー",
             Inches(0.85), Inches(5.8), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. Creative Center で クライアント業種の Top Ads を分析 (週次)\n"
             "2. トレンド楽曲・ハッシュタグをリサーチ → 制作チームに展開\n"
             "3. Symphony Creative Studio で AI生成 → クリエイター撮影と並行\n"
             "4. Smart+ + Spark Ads で配信 → CVR/VTR を業界ベンチマークと比較",
             Inches(0.85), Inches(6.15), Inches(12), Inches(0.8),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p108_targeting(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok ターゲティング・オーディエンス",
               "属性 + 興味関心 + Custom + Lookalike",
               pagenum(9))
    audiences = [
        ("Demographics",
         "属性ベース",
         "・年齢 / 性別 / 地域\n・言語 / OS / デバイス\n・キャリア / 接続環境"),
        ("Interests & Behaviors",
         "興味関心 + 行動",
         "・トピック (美容/フィットネス等)\n・ハッシュタグエンゲージ\n・クリエイターフォロー"),
        ("Custom Audience",
         "1PD / 行動",
         "・Customer File (CRM)\n・Engagement (動画視聴)\n・Lead Form 提出済"),
        ("Lookalike",
         "類似拡張",
         "・1%-10% 類似度制御\n・Customer File をシードに\n・国別 LAL 可"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.8)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(audiences):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.65),
                 size=11, color=TEXT, line_spacing=1.7)

    # Note
    add_rect(s, Inches(0.6), Inches(4.5), Inches(12.15), Inches(2.45),
             fill=NAVY, radius=True)
    add_text(s, "💡 Smart+ 活用時のオーディエンス設計",
             Inches(0.85), Inches(4.65), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• Smart+ では AI が自動拡張 — 細かいセグメント指定は不要、Audience Signal として渡す\n"
             "• Custom Audience (Customer File) を Audience Signal に投入で AI学習加速\n"
             "• Lookalike 1-3% を新規獲得用、5-10% は規模拡大用に使い分け\n"
             "• Engagement Audience (動画70%以上視聴) で Re-marketing → CVR大幅改善\n"
             "• 興味関心セグメントは Smart+ 不使用時の Manual キャンペーンで活用",
             Inches(0.85), Inches(5.0), Inches(12), Inches(1.85),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p109_measurement(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok 計測 — Pixel + Events API",
               "iOS/ATT 後のシグナル復元",
               pagenum(10))
    # 2 frameworks
    fw = [
        ("TikTok Pixel",
         "ブラウザイベント計測",
         "JavaScript で発火\n"
         "PageView / AddToCart / Purchase 等\n"
         "iOS で Cookie制限の影響あり"),
        ("Events API (CAPI相当)",
         "サーバーサイド計測",
         "サーバーから直接送信\n"
         "ブラウザブロックの影響なし\n"
         "Pixel と event_id で重複排除"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(2.6)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(fw):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE, font=EN_FONT)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.05),
                 w - Inches(0.6), Inches(1.5),
                 size=11, color=TEXT, line_spacing=1.6)

    # Recommended setup
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行の標準実装 (2026年)",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. TikTok Pixel + Events API のハイブリッド構成 (Meta CAPIと同パターン)\n"
             "2. event_id で重複排除を確実に (GTM テンプレートを活用)\n"
             "3. EMQ (Event Match Quality) スコアを Events Manager で 8/10以上目標\n"
             "4. iOS SKAN (App案件のみ) : Smart+ App で自動マッピング\n"
             "5. Cookie同意管理 : Consent Mode 相当を CMP経由で設計\n"
             "6. レポート : Pixel単独より Events API追加で +20-40% のCV復元事例多数",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p110_creative_rules(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok 縦型クリエイティブ鉄則 2026",
               "Smart+ + Symphony 時代の制作指針",
               pagenum(11))
    rules = [
        ("①", "1秒で掴む",
         "最初の1秒で視覚インパクト\n人物/動き/テロップで意表を突く"),
        ("②", "9:16縦型必須",
         "上下に余白を残す (UI隠れ対策)\n中央60%にメインコンテンツ"),
        ("③", "音声OFF前提",
         "字幕・テロップ常時表示\n音楽・効果音は補助的に"),
        ("④", "15-30秒推奨",
         "10秒未満も増加傾向\n冗長な前置きは削る"),
        ("⑤", "UGC感維持",
         "整いすぎたCM感は嫌われる\nクリエイターの自然なトーン"),
        ("⑥", "CTAは最後3秒",
         "『今すぐLINE友達追加』等\nオーバーレイCTAも併用"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.7)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (no, head, body) in enumerate(rules):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, no, x + Inches(0.2), y + Inches(0.2),
                 Inches(0.6), Inches(0.7),
                 size=32, bold=True, color=ORANGE,
                 font=EN_FONT)
        add_text(s, head, x + Inches(0.95), y + Inches(0.25),
                 w - Inches(1.1), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.2), y + Inches(0.95),
                 w - Inches(0.4), Inches(0.7),
                 size=10, color=TEXT, line_spacing=1.45)

    # Tip
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 AI生成 vs 撮影 の使い分け",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• Symphony AI生成 : 商品紹介・説明動画・多言語展開 → コスト圧縮\n"
             "• 撮影 (クリエイター) : ストーリー・体験・UGC感 → 高エンゲージメント\n"
             "• 最強構成 : 撮影 80% + AI 20% の素材プールで Smart+ に投入",
             Inches(0.85), Inches(5.95), Inches(12), Inches(0.95),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p111_lift(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok Brand Lift / Conversion Lift",
               "ブランド・購入の真の効果測定",
               pagenum(12))
    lifts = [
        ("Brand Lift Study",
         "認知・好意・購入意向",
         "TestとControl群へポーリング配信。\n"
         "Ad Recall / Brand Awareness /\n"
         "Familiarity / Favorability / Intent\n\n"
         "ブランディング案件で必須"),
        ("Conversion Lift Test",
         "Incremental CV測定",
         "Test と Control 群でCV発生率比較。\n"
         "ラストクリック計測の限界を補正。\n\n"
         "CV系キャンペーンで\n月100万円以上の案件で標準化"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(lifts):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(2.5),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_text(s,
             "💡 Meta / YouTube と並んで TikTok の Lift Test が標準的に使えるようになった (2024-2026)。提案資料に組込必須",
             Inches(0.6), Inches(5.4), Inches(12), Inches(1.55),
             size=11, color=NAVY, line_spacing=1.55)
    footer(s, prs)


def p112_pangle(prs):
    s = blank(prs)
    page_frame(s, prs, "Pangle / オーディエンスネットワーク",
               "TikTok外への配信拡張",
               pagenum(13))
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Pangle : ByteDance のグローバル広告ネットワーク。\n"
             "TikTok外のサードパーティアプリ・パブリッシャー在庫に配信",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    add_text(s, "Pangle 在庫の特徴",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    items = [
        ("Reward Video",
         "アプリ内リワード型動画\nゲーム/エンタメ系で多い"),
        ("Native Display",
         "ネイティブ広告\n記事/フィード型"),
        ("Interstitial",
         "全画面表示\n画面遷移時に表示"),
        ("Rich Media",
         "インタラクティブ広告\nブランド体験型"),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(2.0)
    gap = Inches(0.1)
    for i, (name, body) in enumerate(items):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.2),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(5.3), Inches(12.15), Inches(1.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Pangle の使いどころ",
             Inches(0.85), Inches(5.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• App案件 (特にゲーム・エンタメ) でリワード動画として強い\n"
             "• ブランディング: TikTok本体 + Pangle 統合配信でリーチ最大化\n"
             "• EC/CV系では効果限定的、TikTok本体配信を優先",
             Inches(0.85), Inches(5.8), Inches(12), Inches(1.0),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p113_tiktok_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok : 鉄板運用メソッド 2026年版",
               "新規TikTok案件で最初の30日にやること",
               pagenum(14))
    steps = [
        ("Day 0-2 : 計測 + クリエイティブ準備",
         [
             "TikTok Pixel + Events API 実装",
             "EMQ 8/10 以上に",
             "Symphony Creative Studio セットアップ",
             "Creative Center で業種リサーチ",
         ]),
        ("Day 3-7 : キャンペーン構造",
         [
             "Smart+ Web (CV) + Spark Ads (UGC)",
             "Custom Audience アップロード",
             "Audience Signal に 1PD投入",
             "クリエイティブ 5-10本を Asset Group に",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "予算 ±20% 以内で安定運用",
             "Symphony で週20-30本量産",
             "Creator Spark Ads を週次追加",
             "Brand Lift / Lift Test 申請 (該当時)",
         ]),
        ("Day 22-30 : 最適化",
         [
             "Top Ads の傾向を分析",
             "Best/Low クリエイティブ入替",
             "オーディエンス拡張テスト",
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


def p114_tiktok_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok : よくある失敗と回避策",
               "副業代行で『TikTok あるある』を防ぐ",
               pagenum(15))
    pitfalls = [
        ("Meta /YouTube クリエイティブ流用",
         "TikTok特有のUGC感が出ず CTR/VTR 低迷",
         "Symphony AI生成 + Creator Spark Ads で TikTok感を出す"),
        ("Smart+ を細かく分割",
         "AI 学習が分散 → CPA高騰",
         "1キャンペーン 1-2 ad set + Smart+ で十分"),
        ("Pixel のみで Events API 未実装",
         "iOS計測ロス + Smart+ AI精度低下",
         "Pixel + Events API ハイブリッド構成 (Meta同様)"),
        ("ステマ規制違反 (PR表記漏れ)",
         "措置命令・課徴金・ブランド毀損",
         "Spark Ads (Creator) は契約条件に PR表記必須"),
        ("音声前提のクリエイティブ",
         "ミュート視聴で訴求伝わらず VTR低下",
         "テロップ常時表示、字幕焼き付け"),
        ("Lift Test 未活用",
         "ラストクリック過大評価 → ROAS過小報告",
         "月100万以上は Conversion / Brand Lift 必須"),
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


# ---------- LINE ----------
def p115_line_divider(prs):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 3 / 媒体別キャッチアップ — 3-D 後半",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, "日本のメッセージング軸ポータル",
             Inches(1.2), Inches(1.4), Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, "LINE広告", Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=54, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, "LAP単独運用の最終期。2026春LINEヤフー広告に統合",
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
             "LINEは日本人の 9割超が利用するメッセージングアプリ。\n"
             "LAP (LINE Ads Platform) 経由で広告配信、LINE公式アカウントと連携で友だち獲得・販促に強い。\n"
             "2026春に Yahoo!ディスプレイ広告と統合予定 (LINEヤフー広告)",
             Inches(1.2), Inches(4.2), Inches(11), Inches(1.2),
             size=13, color=LIGHT_GRAY, line_spacing=1.5)
    add_text(s, "▸ 章内の主要トピック",
             Inches(1.2), Inches(5.6), Inches(8), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    topics = [
        "LINE広告ランドスケープ",
        "配信面詳細 (4面)",
        "Talk Head View (予約型)",
        "公式アカウント連携",
        "ターゲティング・LINEデモグラ",
        "LINE Tag / 計測",
        "鉄板運用メソッド",
        "2026春統合準備 + pitfalls",
    ]
    for i, t in enumerate(topics):
        c = i // 4
        r = i % 4
        x = Inches(1.2) + Inches(5.7) * c
        y = Inches(5.95) + Inches(0.32) * r
        add_text(s, f"• {t}", x, y, Inches(5.5), Inches(0.32),
                 size=11, color=WHITE)


def p116_line_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告 ランドスケープ 2026",
               "運用型 (LAP) + 予約型 (Talk Head View)",
               pagenum(17))
    # Stats
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "LINE 日本MAU",
             Inches(0.85), Inches(1.65), Inches(4), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    add_text(s, "9,800万", Inches(0.85), Inches(1.95),
             Inches(4), Inches(0.85),
             size=44, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "LINEヤフー統合後リーチ (合算)",
             Inches(6.0), Inches(1.65), Inches(7), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    add_text(s, "94%",
             Inches(6.0), Inches(1.95), Inches(3), Inches(0.85),
             size=44, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "国内スマートフォンユーザー (重複除く)",
             Inches(8.5), Inches(2.2), Inches(4.5), Inches(0.45),
             size=11, color=LIGHT_GRAY)

    # Two product lines
    add_text(s, "LINE広告 2大プロダクトライン",
             Inches(0.6), Inches(2.95), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    products = [
        ("LAP (LINE Ads Platform)",
         "運用型",
         "オークション型・自動最適化\n"
         "中小予算でも運用可\n"
         "2026春に LINEヤフー広告 ディスプレイ広告に統合",
         ORANGE),
        ("Talk Head View",
         "予約型",
         "LINEホーム最上部の予約型動画広告\n"
         "1日1ブランド・1,000-3,000万円規模\n"
         "認知獲得型のフラッグシップ",
         NAVY),
    ]
    top = Inches(3.4)
    w = Inches(6.0)
    h = Inches(3.5)
    gap = Inches(0.15)
    for i, (name, kind, body, color) in enumerate(products):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=color)
        add_text(s, name, x + Inches(0.3), top + Inches(0.15),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, kind, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(2.3),
                 size=12, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p117_placements(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告 配信面詳細 (4面)",
               "LINEアプリ内の主要広告枠",
               pagenum(18))
    placements = [
        ("トークリスト",
         "最上部 (※2024~)",
         "トークリストの最上部に\n表示される予約型枠"),
        ("LINE NEWS",
         "ニュース面 (運用型)",
         "ニュース記事間に\nバナー / 動画広告"),
        ("LINE VOOM",
         "ショート動画面",
         "縦型動画フィード\nReels / TikTok 相当"),
        ("ウォレット",
         "決済画面下部",
         "LINE Pay利用者向け\nクーポン・販促"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.4)
    gap = Inches(0.1)
    for i, (name, kind, body) in enumerate(placements):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER)
        add_text(s, kind, x + Inches(0.2), top + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.0),
                 w - Inches(0.4), Inches(1.3),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(4.2), Inches(12.15), Inches(2.75),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行での配信面選択ガイド",
             Inches(0.85), Inches(4.35), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• ブランド認知 = トークリスト 最上部 (高単価) or LINE NEWS\n"
             "• リード/CV系 = LINE NEWS + VOOM の運用型ミックス\n"
             "• ECブランド = VOOM (TikTok相当の縦型) で UGC感のある動画配信\n"
             "• LINE Pay 連動キャンペーン = ウォレット枠で販促・クーポン配布\n"
             "• 中小予算 (月20万以下) は LINE NEWS の運用型に集中\n"
             "• 2026春以降 = LINEヤフー広告ディスプレイ広告に統合、Yahoo!面と横断配信",
             Inches(0.85), Inches(4.7), Inches(12), Inches(2.15),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p118_official_account(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE公式アカウント連携",
               "友だち獲得 + メッセージ配信で CRM化",
               pagenum(19))
    # 2 features
    features = [
        ("友だち追加広告",
         "LINE広告から公式アカウント友だち獲得",
         "LAP / YDAから配信。\n"
         "1友達 = 100-500円程度 (業種で変動)\n"
         "獲得後はメッセージ配信で関係構築"),
        ("メッセージ配信",
         "獲得済 友だちへの広告メッセージ",
         "Step配信 / セグメント配信 / リッチメッセージ\n"
         "オープン率 平均 40-60% (メールの3-5倍)\n"
         "クーポン・限定販促で CV直結"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(2.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.15),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.6)

    # Connect One context
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Connect One 構想 — 公式アカウントを起点に",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. 広告 (LINE広告 + Yahoo!広告) → 公式アカウント友だち獲得\n"
             "2. メッセージ配信 → 来店・購入・リピート促進\n"
             "3. LINE ミニアプリ / LINE Pay 連携 → 予約・決済もLINE内で完結\n"
             "4. 顧客分析 (CRMダッシュボード) → セグメント別配信に活用\n\n"
             "副業代行 : LINE広告だけで売上を作ろうとせず、公式アカウント連携での『顧客資産化』提案がROI最大化",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p119_targeting(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告 ターゲティング・オーディエンス",
               "LINEデモグラ + 行動 + Custom",
               pagenum(20))
    audiences = [
        ("LINEデモグラ",
         "LINE登録情報ベース",
         "・年齢 / 性別 / 地域\n・推定属性 (年収/職業)\n・ライフイベント"),
        ("みなし属性",
         "AI推定",
         "・興味関心カテゴリ\n・購買予測\n・コンテンツ接触履歴"),
        ("Custom Audience",
         "1PD アップロード",
         "・Customer File (CRM)\n・Webサイト訪問\n・LINE公式 友だち"),
        ("類似拡張",
         "Lookalike相当",
         "・1%-15% 類似度\n・Customer File をシード\n・既存友だちの類似"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(audiences):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.7)

    # Note
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=NAVY, radius=True)
    add_text(s, "💡 LINEデモグラの強み (他媒体との差別化)",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• LINE登録時の基本属性 + 利用データから推定された詳細属性\n"
             "• 高年齢層 (60代以上) のリーチが Meta より広い\n"
             "• B2B (経営者/管理職) のリーチ網も意外に強い\n"
             "• 2026春LINEヤフー統合でYahoo!検索データとの結合が予定 → さらに精度向上",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p120_line_tag(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE Tag / 計測",
               "LINE固有のサーバーサイド計測",
               pagenum(21))
    # 2 tags
    tags = [
        ("LINE Tag (ベース)",
         "全ページに設置",
         "JavaScript で発火\n"
         "PageView / AddToCart / Conversion を計測\n"
         "LINE広告のコンバージョン測定基盤"),
        ("Conversion API",
         "サーバーサイド計測",
         "サーバーから直接送信 (CAPI 相当)\n"
         "iOS / ITP の影響を回避\n"
         "2024〜 標準実装が増加"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(2.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tags):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行での実装手順",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. LINE Tag を全ページのhead内に設置 (GTM経由でも可)\n"
             "2. Conversion (Purchase / Lead / SignUp等) を発火させたいページで設定\n"
             "3. Conversion API : Shopify / WooCommerce プラグインで簡易実装も可\n"
             "4. EMQ 相当のチェック : LINE for Business の管理画面で計測精度確認\n"
             "5. 2026春以降 LINEヤフー統合で Yahoo!サイトジェネラルタグと統合検討",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p121_2026_prep(prs):
    s = blank(prs)
    page_frame(s, prs, "2026春 LINEヤフー広告統合の準備",
               "LINE広告ユーザーは『移行ツール』対応が必要",
               pagenum(22))
    # Migration timeline
    add_text(s, "移行ステップ (2025/09 公式発表)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    steps = [
        ("STEP 1",
         "現状確認",
         "LINE広告アカウントと\nLINE for Business 管理画面の\n権限確認"),
        ("STEP 2",
         "移行ツール利用",
         "LINEヤフー公式の\n移行ツール提供 (2026年早期)\n手動移行も可"),
        ("STEP 3",
         "統合後 確認",
         "新管理画面 (LINEヤフー広告)\nで配信状況確認\nビジネスIDで一元管理"),
    ]
    top = Inches(2.05)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (no, name, body) in enumerate(steps):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, no, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.25), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.25), top + Inches(1.2),
                 w - Inches(0.4), Inches(1.25),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note for ad ops
    add_rect(s, Inches(0.6), Inches(4.85), Inches(12.15), Inches(2.1),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で2026春に向けた行動",
             Inches(0.85), Inches(5.0), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• LINE広告クライアントには 2025年内に移行スケジュール案内\n"
             "• Yahoo!広告クライアントは自動移行 — 運用継続のみ\n"
             "• 両方使うクライアント = 統合後にキャンペーン構造を再設計 (在庫横断最適化)\n"
             "• 提案資料 : 『2026春以降は LINEヤフー広告 = 国内94%リーチ』を訴求の中心に\n"
             "• 統合後初の Test キャンペーン 設計準備 (CTR/CV測定の基準値を取得)",
             Inches(0.85), Inches(5.35), Inches(12), Inches(1.55),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p122_line_use_cases(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告 業界別ユースケース",
               "LINE広告が他媒体より強い業種",
               pagenum(23))
    cases = [
        ("飲食 / 美容",
         "公式アカウント友だち追加→クーポン配布"),
        ("金融 / 保険",
         "高単価商材の比較検討層へ広範リーチ"),
        ("教育 / 資格",
         "学習サービスの初回トライアル獲得"),
        ("不動産 / 引越",
         "ライフイベント連動配信"),
        ("EC / D2C",
         "新商品告知 + 友だち向けクーポン"),
        ("BtoB / 士業",
         "経営者層の認知獲得 + 公式アカウント"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (industry, body) in enumerate(cases):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, industry, x + Inches(0.25), y + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.65),
                 w - Inches(0.4), Inches(0.85),
                 size=11, color=TEXT, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(5.05), Inches(12.15), Inches(1.9),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 LINE広告 + 公式アカウント の組合せが最強",
             Inches(0.85), Inches(5.2), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 上記6業種 + 飲食店 / 美容室 のローカル業種ではLINE広告が必須\n"
             "• LINE広告で『友だち追加』→ メッセージ配信で『再来店促進』 = LTV最大化\n"
             "• 副業代行 : 単発の広告運用だけでなく『公式アカウント運用込み』の月額提案で粘着\n"
             "• 提案単価 : 広告運用 5万 + 公式アカウント運用 5万 = 月額10万円前後",
             Inches(0.85), Inches(5.55), Inches(12), Inches(1.4),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p123_line_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE広告 : 鉄板運用メソッド 2026年版",
               "新規LINE案件で最初の30日にやること",
               pagenum(24))
    steps = [
        ("Day 0-3 : 公式アカウント + 計測",
         [
             "LINE公式アカウント開設/権限取得",
             "LINE Tag 設置 (全ページ)",
             "Conversion API 設定 (該当時)",
             "友だち追加URL/QR 設計",
         ]),
        ("Day 4-7 : キャンペーン構造",
         [
             "友だち追加広告 (LAP)",
             "Webサイト誘導 (LAP / 計測込み)",
             "LINE NEWS + VOOM 配信",
             "Custom Audience アップロード",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "目標CPA / CPF 自動入札",
             "クリエイティブ多様化 (静止画+動画)",
             "メッセージ配信は週1回でテスト",
             "リターゲティングセグメント拡張",
         ]),
        ("Day 22-30 : 最適化 + レポート",
         [
             "クリエイティブ Best/Low 入替",
             "公式アカウント友だち数 + 配信効果分析",
             "セグメント別メッセージ配信戦略",
             "月次レポート + 2026春統合準備",
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


def p124_line_pitfalls_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "LINE pitfalls + Part 3-D まとめ",
               "副業代行で『LINE あるある』 + 次章へ",
               pagenum(25))
    pitfalls = [
        ("公式アカウント連携無視",
         "広告の費用対効果が低くなる → 友だち追加+メッセージ配信で資産化"),
        ("Yahoo!広告と分断運用",
         "リーチに重複・無駄発生 → 2026春統合に向けて連携設計"),
        ("ターゲティングを細かく",
         "AI最適化が効きづらい → みなし属性 + Custom + 自動入札"),
        ("Conversion API 未実装",
         "iOS計測ロス + 入札精度低下 → CAPI実装 (Shopifyプラグイン等)"),
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
    add_text(s, "NEXT →  Part 3-E  X / LinkedIn / Amazon Ads (16p, P125-P140)",
             Inches(0.85), Inches(4.55), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 3-E で扱うトピック :\n"
             "• X (旧Twitter) (6p) : Grok連携 / X Ads / 規制対応 / 復活と凋落\n"
             "• LinkedIn (5p) : B2B 必修媒体 / Sponsored Content / ABM (Account-Based Marketing)\n"
             "• Amazon Ads (5p) : Sponsored Products/Brands/Display / DSP / AMC入門\n\n"
             "Part 3 (媒体別 110p) の最終章。専門特化媒体を効率的にカバー",
             Inches(0.85), Inches(5.05), Inches(12), Inches(1.85),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p100_divider(prs)
    p101_tiktok_landscape(prs)
    p102_tldr(prs)
    p103_smart_plus(prs)
    p104_symphony(prs)
    p105_spark_ads(prs)
    p106_shop_ads(prs)
    p107_creative_center(prs)
    p108_targeting(prs)
    p109_measurement(prs)
    p110_creative_rules(prs)
    p111_lift(prs)
    p112_pangle(prs)
    p113_tiktok_playbook(prs)
    p114_tiktok_pitfalls(prs)
    p115_line_divider(prs)
    p116_line_landscape(prs)
    p117_placements(prs)
    p118_official_account(prs)
    p119_targeting(prs)
    p120_line_tag(prs)
    p121_2026_prep(prs)
    p122_line_use_cases(prs)
    p123_line_playbook(prs)
    p124_line_pitfalls_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
