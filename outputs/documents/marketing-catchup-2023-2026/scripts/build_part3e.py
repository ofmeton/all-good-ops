#!/usr/bin/env python3
"""Build Part 3-E X + LinkedIn + Amazon Ads (16p, P125-P140)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part3e.pptx"
PNUM_BASE = 124


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def divider_3way(prs, sub_label, title, subtitle, pages, summary,
                 subsections):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 3 / 媒体別キャッチアップ — 最終章",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, sub_label, Inches(1.2), Inches(1.4),
             Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, title, Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=46, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, subtitle, Inches(1.2), Inches(3.3),
             Inches(11), Inches(0.4),
             size=15, color=LIGHT_GRAY)
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
    sy = Inches(5.4)
    sw = Inches(3.65)
    sh = Inches(1.6)
    gap = Inches(0.15)
    for i, (name, pages_str, items) in enumerate(subsections):
        x = sx + (sw + gap) * i
        add_rect(s, x, sy, sw, sh, fill=NAVY_DARK, radius=True)
        add_rect(s, x, sy, Inches(0.1), sh, fill=ORANGE)
        add_text(s, name, x + Inches(0.25), sy + Inches(0.1),
                 sw - Inches(0.4), Inches(0.4),
                 size=16, bold=True, color=ORANGE)
        add_text(s, pages_str, x + Inches(0.25), sy + Inches(0.5),
                 sw - Inches(0.4), Inches(0.3),
                 size=10, color=LIGHT_GRAY)
        add_text(s, items, x + Inches(0.25), sy + Inches(0.85),
                 sw - Inches(0.4), Inches(0.7),
                 size=9, color=WHITE, line_spacing=1.45)


# ---------- X (旧Twitter) — 6p ----------
def p125_divider(prs):
    divider_3way(
        prs,
        "3-E   |   専門特化媒体3つ",
        "X / LinkedIn / Amazon Ads",
        "Part 3 (媒体別110p) の最終章。専門特化媒体を効率的にカバー",
        "16p",
        "X (旧Twitter) は Grok AI連携と縦型動画で再起動。\n"
        "LinkedIn は ABM (Account-Based Marketing) で B2B 必修媒体に。\n"
        "Amazon Ads は AMC (Marketing Cloud) でプライバシー安全なリテールメディア標準",
        [
            ("X", "6p (P125-P130)",
             "Grok / Vertical Video /\nTakeover / 規制対応"),
            ("LinkedIn", "5p (P131-P135)",
             "ABM / Sponsored Content /\nThought Leader / Insight Tag"),
            ("Amazon Ads", "5p (P136-P140)",
             "Sponsored Products/Brands/Display /\nDSP / AMC Clean Room"),
        ],
    )


def p126_x_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "X (旧Twitter) 広告 ランドスケープ 2026",
               "Grok AI ＋ 縦型動画で再起動", pagenum(2))
    # Stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "縦型動画の比率",
             Inches(0.85), Inches(1.65), Inches(4), Inches(0.35),
             size=11, bold=True, color=ORANGE)
    add_text(s, "20%",
             Inches(0.85), Inches(1.95), Inches(3), Inches(0.85),
             size=44, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "of daily user time = 最も成長中フォーマット",
             Inches(4.5), Inches(2.15), Inches(8), Inches(0.55),
             size=13, color=WHITE, line_spacing=1.4)

    # 2 key 2025-2026 changes
    changes = [
        ("Grok AI 統合",
         "アルゴリズムが Grok 推論ベースに移行 (2025-2026)\n"
         "『Prefill with Grok』 = URLから自動広告作成\n"
         "AI Campaign Analyzer = 配信効果を AI が改善提案"),
        ("Vertical Video + 新フォーマット",
         "4:5 + 2:3 ratio が in-stream で利用可\n"
         "他SNSのクリエイティブ流用が容易に\n"
         "縦型動画が CPM最安 + エンゲージ最高"),
    ]
    top = Inches(3.0)
    w = Inches(6.0)
    h = Inches(2.4)
    gap = Inches(0.15)
    for i, (title, body) in enumerate(changes):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7), fill=ORANGE)
        add_text(s, title, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(0.95),
                 w - Inches(0.6), Inches(1.4),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(5.7), Inches(12.15), Inches(1.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえるポイント",
             Inches(0.85), Inches(5.85), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• X はB2C/B2B両方OK、ニュース性のあるブランドで強い\n"
             "• ステマ規制 + DSA罰則 (X は EUR 4,500万 罰金事例) → 表記徹底\n"
             "• 日本ではTwitterから X リブランド後もアクティブ層あり、低単価で実験しやすい",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p127_x_campaigns(prs):
    s = blank(prs)
    page_frame(s, prs, "X Ads キャンペーンタイプ + 配信面",
               "Promoted / Vertical Video / Takeover", pagenum(3))
    types_ = [
        ("Promoted Ads",
         "通常タイムライン",
         "テキスト/画像/動画/カルーセル\n標準的な配信"),
        ("Vertical Video",
         "縦型 9:16 動画",
         "For You / Trending内に表示\n2025-2026最重要フォーマット"),
        ("X Takeover",
         "Timeline+Explore Tab",
         "プレミアム枠でリーチ最大化\n大型ブランディング向け"),
        ("Trend Takeover",
         "トレンド欄プロモ",
         "Explore タブのトレンド一覧\nハッシュタグ訴求"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7),
                 fill=ORANGE if i == 1 else NAVY)
        add_text(s, name, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.0),
                 w - Inches(0.4), Inches(1.3),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Targeting
    add_text(s, "ターゲティング (X固有)",
             Inches(0.6), Inches(4.3), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    targets = [
        ("Followers Look-alike",
         "他アカウントのフォロワーに類似した層"),
        ("Conversation",
         "特定キーワードの会話に参加するユーザー"),
        ("Keyword",
         "ツイート内キーワードベース (リアルタイム性)"),
        ("Event",
         "スポーツ / エンタメ / ニュースイベント連動"),
    ]
    for i, (cat, desc) in enumerate(targets):
        y = Inches(4.9) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(3.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, desc, Inches(4.5), y + Inches(0.02),
                 Inches(8), Inches(0.3),
                 size=11, color=TEXT)
    footer(s, prs)


def p128_x_grok(prs):
    s = blank(prs)
    page_frame(s, prs, "Grok AI連携 (2025-2026)",
               "X が AI ファースト広告プラットフォームへ",
               pagenum(4))
    # 3 features
    features = [
        ("Prefill with Grok",
         "URL → 自動広告生成",
         "ランディングページURLを入力\nGrok が広告文・画像を自動生成\n人間が修正・配信"),
        ("AI Campaign Analyzer",
         "配信効果を AI 改善",
         "現状のキャンペーンを Grok が分析\n弱点とアクションを提案\nAdvantage+ / Smart+ 相当の機能"),
        ("Algorithm = Grok",
         "配信ランキングが AI ベース",
         "X のフィード表示アルゴリズム自体が\nGrok 推論ベースに移行 (段階的)\n→ クリエイティブの『内容』理解が向上"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行 : X Ads再開時の注意",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• Twitter時代 (2023年9月以前) と管理画面 / プロダクト名 が大幅変更\n"
             "• Grok生成広告は『ステマ規制』の対象外だが、AI生成が露見した場合の信頼性懸念あり\n"
             "• 縦型動画 + Promoted Ads の組合せが現代の鉄板\n"
             "• ニュース性業種 (新商品告知 / スポーツ / エンタメ) では他媒体より低単価でリーチ可\n"
             "• 政治・センシティブ広告は依然として厳しい審査 → 該当業種は事前確認必須",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p129_x_measure_regulation(prs):
    s = blank(prs)
    page_frame(s, prs, "X 計測 + 規制対応",
               "Pixel + EU DSA罰則例", pagenum(5))
    # Left: measurement
    add_text(s, "計測",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(1.95), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)

    measure_items = [
        ("X Pixel",
         "Webコンバージョン計測の基盤"),
        ("Conversion API",
         "サーバーサイド計測 (CAPI相当)"),
        ("Web Conversion Optimization",
         "AI入札のCV最適化"),
        ("App Conversion Tracking",
         "iOS / Android アプリCV"),
    ]
    for i, (cat, desc) in enumerate(measure_items):
        y = Inches(2.15) + Inches(0.7) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.6),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, cat, Inches(0.85), y + Inches(0.1),
                 Inches(5.5), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, desc, Inches(0.85), y + Inches(0.4),
                 Inches(5.5), Inches(0.25),
                 size=10, color=MID_GRAY)

    # Right: regulation
    add_text(s, "規制対応 (重要)",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(7.0), Inches(1.95), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)

    add_rect(s, Inches(7.0), Inches(2.15), Inches(5.75), Inches(1.0),
             fill=WARN, radius=True)
    add_text(s, "🔥 EU DSA 罰金事例",
             Inches(7.2), Inches(2.25), Inches(5), Inches(0.3),
             size=11, bold=True, color=WHITE)
    add_text(s,
             "X (Twitter) に EUR 4,500万 罰金\n"
             "(2024年・広告レポジトリ違反)",
             Inches(7.2), Inches(2.55), Inches(5.4), Inches(0.6),
             size=12, bold=True, color=WHITE, line_spacing=1.45)

    add_rect(s, Inches(7.0), Inches(3.3), Inches(5.75), Inches(0.6),
             fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
    add_text(s, "ステマ規制 (景表法)",
             Inches(7.2), Inches(3.4), Inches(5), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s, "PR表記必須 (Promoted は自動付与)",
             Inches(7.2), Inches(3.65), Inches(5.4), Inches(0.25),
             size=10, color=TEXT)

    add_rect(s, Inches(7.0), Inches(4.0), Inches(5.75), Inches(0.6),
             fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
    add_text(s, "ブランドセーフティ",
             Inches(7.2), Inches(4.1), Inches(5), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s, "Inventory Filter で配信面を厳格化",
             Inches(7.2), Inches(4.35), Inches(5.4), Inches(0.25),
             size=10, color=TEXT)

    # Bottom
    add_rect(s, Inches(0.6), Inches(5.85), Inches(12.15), Inches(1.1),
             fill=NAVY, radius=True)
    add_text(s,
             "💡 副業代行 : X案件は『リスク説明 + 実装精度』で差別化。\n  EU向け / センシティブ業種は事前審査必須",
             Inches(0.85), Inches(6.05), Inches(12), Inches(0.8),
             size=11, bold=True, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p130_x_playbook_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "X : 鉄板運用 + よくある失敗",
               "30日プラン + pitfalls", pagenum(6))
    # Left: 30-day plan compact
    add_text(s, "30日鉄板プラン",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(1.95), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    plan = [
        ("Day 0-3", "Pixel + Conversion API + 計測確認"),
        ("Day 4-7", "Promoted + 縦型動画 でテスト"),
        ("Day 8-21", "Grok Prefill 活用 + クリエイティブ多様化"),
        ("Day 22-30", "Best/Low 入替 + 月次レポート"),
    ]
    for i, (day, body) in enumerate(plan):
        y = Inches(2.15) + Inches(0.7) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.6),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(1.3), Inches(0.6),
                 fill=NAVY)
        add_text(s, day, Inches(0.6), y + Inches(0.18),
                 Inches(1.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, Inches(2.05), y + Inches(0.18),
                 Inches(4.4), Inches(0.3),
                 size=10, color=TEXT)

    # Right: pitfalls compact
    add_text(s, "よくある失敗",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(7.0), Inches(1.95), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    pitfalls = [
        ("Twitter時代の感覚で運用",
         "管理画面・プロダクト名が大幅変更"),
        ("PR表記漏れ",
         "ステマ規制違反 + EU DSA罰則"),
        ("AI生成広告の品質管理放置",
         "Grok生成は人間レビュー必須"),
        ("縦型動画を準備せず",
         "20% of user time の縦型を逃す"),
    ]
    for i, (mistake, fix) in enumerate(pitfalls):
        y = Inches(2.15) + Inches(0.7) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.6),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(7.0), y, Inches(0.1), Inches(0.6),
                 fill=WARN)
        add_text(s, mistake, Inches(7.2), y + Inches(0.08),
                 Inches(5.4), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, fix, Inches(7.2), y + Inches(0.32),
                 Inches(5.4), Inches(0.25),
                 size=9, color=MID_GRAY)

    # Bottom note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=NAVY, radius=True)
    add_text(s, "📊 X案件の予算設計の目安",
             Inches(0.85), Inches(5.55), Inches(12), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 試験運用 : 月10-30万円 (CV系) / 月50-100万円 (認知系)\n"
             "• Takeover系 : 1日数百万円〜数千万円 (大手主導、SMBには現実的でない)\n"
             "• 副業代行のスイートスポット : 月20-100万円のCV系ブランド + 縦型動画+Promoted",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.05),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


# ---------- LinkedIn — 5p ----------
def p131_linkedin_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "LinkedIn Ads ─ B2B 必修媒体 (2026)",
               "ABM (Account-Based Marketing) で再評価",
               pagenum(7))
    # Stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.5),
             fill=NAVY, radius=True)
    stats = [
        ("+31.7%", "B2B広告費 YoY (2025)"),
        ("+200%", "ABM のROI改善"),
        ("30%", "B2B社会広告予算 (2026予測)"),
    ]
    for i, (val, label) in enumerate(stats):
        x = Inches(0.85) + Inches(4.0) * i
        add_text(s, val, x, Inches(1.7),
                 Inches(3.7), Inches(0.7),
                 size=32, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, label, x, Inches(2.45),
                 Inches(3.7), Inches(0.4),
                 size=11, color=LIGHT_GRAY,
                 align=PP_ALIGN.CENTER)

    # Why LinkedIn
    add_text(s, "なぜLinkedInか",
             Inches(0.6), Inches(3.2), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    reasons = [
        ("職業データの精度",
         "役職・業界・会社規模・経験で精緻ターゲ"),
        ("B2B意思決定者リーチ",
         "経営層・購買担当層への直接配信"),
        ("ABM 連携",
         "Account-Based Marketing で重要顧客攻略"),
        ("Thought Leader Ads",
         "個人プロフからの広告 → コーポレートより 30-50% 高効果"),
    ]
    top = Inches(3.65)
    w = Inches(5.95)
    h = Inches(1.55)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (head, body) in enumerate(reasons):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, head, x + Inches(0.25), y + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.65),
                 w - Inches(0.4), Inches(0.85),
                 size=11, color=TEXT, line_spacing=1.5)
    footer(s, prs)


def p132_linkedin_formats(prs):
    s = blank(prs)
    page_frame(s, prs, "LinkedIn 広告フォーマット",
               "Sponsored Content + Thought Leader が主流",
               pagenum(8))
    # 4 formats
    formats = [
        ("Sponsored Content",
         "$4-8 CPC",
         "フィード型 静止画/動画/カルーセル\nB2B鉄板フォーマット"),
        ("Thought Leader Ads",
         "$1-3 CPC",
         "個人プロフ投稿の広告化\n2026プッシュ機能、コーポレート比+30-50%"),
        ("Message Ads (旧InMail)",
         "受信箱配信",
         "DMボックスへ広告\n精度高い分単価高め"),
        ("Document Ads",
         "PDF/Slideダウンロード",
         "ホワイトペーパー配布\nリードジェネレーション"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (name, price, body) in enumerate(formats):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7),
                 fill=ORANGE if i < 2 else NAVY)
        add_text(s, name, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.4),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, price, x + Inches(0.15), top + Inches(0.55),
                 w - Inches(0.3), Inches(0.3),
                 size=10, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), top + Inches(1.0),
                 w - Inches(0.4), Inches(1.4),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(4.3), Inches(12.15), Inches(2.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえるフォーマット選択",
             Inches(0.85), Inches(4.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 認知獲得 : Sponsored Content (静止画 + 動画)\n"
             "• ABM (重要顧客攻略) : Thought Leader Ads (経営者投稿の広告化)\n"
             "• リード獲得 : Document Ads (ホワイトペーパー) + LinkedIn Lead Gen Form\n"
             "• 個別アプローチ : Message Ads (DM枠 / 既存接点ある相手向け)\n"
             "• 2026年押し : Thought Leader Ads が 30-50% 高効果なため最優先で提案",
             Inches(0.85), Inches(4.8), Inches(12), Inches(2.05),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p133_abm(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 ABM (Account-Based Marketing)",
               "B2B戦略の主戦場 + Buying Group Targeting (2026/02)",
               pagenum(9))
    # Definition
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "ABM : 特定の企業 (Account) を狙い撃ちで攻略するB2B手法。\n"
             "LinkedIn は企業データの粒度で他媒体を凌駕、ABM で200%のROI改善",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 ABM strategies
    add_text(s, "ABM 3つのアプローチ",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    strategies = [
        ("企業リスト ターゲ",
         "ABMリスト (CSV) アップロード",
         "10-100社の重要顧客リストを\n企業名でターゲ。\n大型案件向け"),
        ("Buying Group",
         "🔥 2026/02 新機能",
         "事前定義された意思決定者クラスター\n(役職+権限) を一括選択。\n手動組合せの代替"),
        ("Industry + Job Title",
         "業界 + 役職組合せ",
         "業界 (例: SaaS) × 役職 (CTO/VPE)\nを組合せて配信。\n中堅向け"),
    ]
    top = Inches(3.1)
    w = Inches(3.95)
    h = Inches(2.4)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(strategies):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=ORANGE if i == 1 else NAVY)
        add_text(s, name, x + Inches(0.25), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.25),
                 size=11, color=TEXT, line_spacing=1.6)

    # CRM integration
    add_rect(s, Inches(0.6), Inches(5.65), Inches(12.15), Inches(1.3),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 CRM連携 (2025/06~) — Closed-Loop Reporting",
             Inches(0.85), Inches(5.75), Inches(11), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Salesforce / HubSpot と Campaign Manager がリアルタイム連携。"
             "ABM 配信 → CRMで Closed-won → LinkedIn にROAS が戻る。\n"
             "副業代行 : B2B案件では ABM + CRM連携 で『商談まで』を可視化、ROIで圧倒",
             Inches(0.85), Inches(6.05), Inches(12), Inches(0.85),
             size=10, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p134_linkedin_measurement(prs):
    s = blank(prs)
    page_frame(s, prs, "LinkedIn 計測 + Lead Gen Form",
               "Insight Tag + LeadGen Form で B2B計測完結",
               pagenum(10))
    # 3 tools
    tools = [
        ("Insight Tag",
         "Webコンバージョン計測",
         "全ページに JavaScript設置\n"
         "Webサイト訪問・CV計測の基盤\n"
         "Custom Audience の元データ"),
        ("LeadGen Form",
         "リード獲得フォーム",
         "LinkedIn内で完結する\n事前入力済フォーム\n"
         "プロフィール情報が自動入力 → CV率高"),
        ("Conversion API",
         "サーバーサイド計測",
         "iOS / ITP対策\n"
         "CRM側のクロージング情報も統合\n"
         "Closed-Loop の前提"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.25), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=ORANGE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=NAVY, radius=True)
    add_text(s, "💡 LinkedIn 計測実装の優先順位",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "1. Insight Tag を全ページに設置 (GTM経由可)\n"
             "2. CV発生ページで Conversion設定\n"
             "3. LeadGen Form を Lead Gen キャンペーンで活用 (CV率 +30-50%)\n"
             "4. Conversion API で CRM データ統合 (B2B案件は商談 → 受注まで追う)\n"
             "5. Campaign Manager で ROAS / CPL を継続レビュー",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p135_linkedin_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "LinkedIn : 鉄板運用 + よくある失敗",
               "B2B案件の30日プラン + pitfalls",
               pagenum(11))
    # Left: 30-day plan
    add_text(s, "30日鉄板プラン",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(1.95), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    plan = [
        ("Day 0-3", "Insight Tag + LeadGen Form 設定"),
        ("Day 4-7", "Sponsored + Thought Leader でテスト"),
        ("Day 8-21", "ABM (Buying Group) + CRM 連携"),
        ("Day 22-30", "ROAS分析 + 月次レポート"),
    ]
    for i, (day, body) in enumerate(plan):
        y = Inches(2.15) + Inches(0.7) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.6),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(1.3), Inches(0.6),
                 fill=NAVY)
        add_text(s, day, Inches(0.6), y + Inches(0.18),
                 Inches(1.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, Inches(2.05), y + Inches(0.18),
                 Inches(4.4), Inches(0.3),
                 size=10, color=TEXT)

    # Right: pitfalls
    add_text(s, "よくある失敗",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(7.0), Inches(1.95), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    pitfalls = [
        ("低単価CPCで運用",
         "B2Bは高単価が前提 ($4-8 CPC)"),
        ("Thought Leader Ads 未活用",
         "コーポレート比+30-50%効果を逃す"),
        ("CRM連携を後回し",
         "Closed-Loop なしで ROIが見えない"),
        ("広告セットを細かく分割",
         "B2Bはサンプルサイズが小さく学習困難"),
    ]
    for i, (mistake, fix) in enumerate(pitfalls):
        y = Inches(2.15) + Inches(0.7) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.6),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(7.0), y, Inches(0.1), Inches(0.6),
                 fill=WARN)
        add_text(s, mistake, Inches(7.2), y + Inches(0.08),
                 Inches(5.4), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, fix, Inches(7.2), y + Inches(0.32),
                 Inches(5.4), Inches(0.25),
                 size=9, color=MID_GRAY)

    # Bottom note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "📊 LinkedIn 案件の予算設計",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• B2B認知獲得 : 月50-200万円 (Sponsored + Thought Leader)\n"
             "• ABM案件 : 月100-500万円 (Account-list + Buying Group)\n"
             "• 副業代行スイートスポット : 月50-100万円 ABMライト案件 (10-30社のターゲ)",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.05),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


# ---------- Amazon Ads — 5p ----------
def p136_amazon_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "Amazon Ads ─ リテールメディア標準",
               "EC事業者の必修媒体 + AMC で1PD活用",
               pagenum(12))
    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "Amazon Ads 世界広告売上 (2024)",
             Inches(0.85), Inches(1.65), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s, "$56.9B",
             Inches(0.85), Inches(2.0), Inches(4), Inches(0.85),
             size=44, bold=True, color=WHITE, font=EN_FONT)
    add_text(s, "Google・Meta に次ぐ世界3位 ※要確認",
             Inches(5.5), Inches(2.2), Inches(7), Inches(0.5),
             size=12, color=LIGHT_GRAY)

    # 3 product lines
    add_text(s, "Amazon Ads プロダクトライン",
             Inches(0.6), Inches(2.95), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    products = [
        ("Sponsored Ads",
         "Amazon内検索・商品ページ",
         "Sponsored Products / Brands /\nDisplay の3タイプ\n出店者向け基本"),
        ("Amazon DSP",
         "Amazon外サイトもリーチ",
         "Amazon内 + 提携サイト\n動画・ディスプレイ広告\n大型予算向け"),
        ("AMC",
         "Marketing Cloud (Clean Room)",
         "1PD + Amazon 1PDの統合分析\n12.5ヶ月のevent-level data\n2026 No-code 化"),
    ]
    top = Inches(3.4)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(products):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_text(s,
             "💡 副業代行 : Amazon出店者クライアント = Sponsored Ads必須、中規模以上はAMCで1PD活用",
             Inches(0.6), Inches(6.05), Inches(12), Inches(0.3),
             size=11, bold=True, color=NAVY)
    footer(s, prs)


def p137_sponsored(prs):
    s = blank(prs)
    page_frame(s, prs, "Sponsored Products / Brands / Display",
               "Amazon内3つの広告タイプ", pagenum(13))
    types_ = [
        ("Sponsored Products",
         "検索結果 + 商品ページ",
         "個別商品プロモーション\n"
         "キーワードベース or 自動\n"
         "ASIN単位で配信"),
        ("Sponsored Brands",
         "ブランドストア誘導",
         "ブランドロゴ + 複数商品\n"
         "ヘッドライン広告\n"
         "ストアページへ誘導"),
        ("Sponsored Display",
         "Amazon内+外への配信",
         "閲覧履歴 / 購入履歴ベース\n"
         "リマケ + 類似商品配信\n"
         "Amazon DSP の入口"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(types_):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=ORANGE, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえる順番",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. Sponsored Products = 全 Amazon出店者で必須、最初に始めるべき\n"
             "2. Sponsored Brands = ブランドストア持ちブランドで活用、ブランディング+CV\n"
             "3. Sponsored Display = リマケ用、Amazon外も拡張可能\n"
             "4. 自動キャンペーン (オートターゲ) からスタート → 7日後にマニュアル拡張\n"
             "5. ACOS (Advertising Cost of Sales) を業界平均と比較してKPI管理",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p138_dsp(prs):
    s = blank(prs)
    page_frame(s, prs, "Amazon DSP — Amazon外も含むDSP",
               "Programmatic広告のリテールメディア統合版",
               pagenum(14))
    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Amazon DSP : Amazon内+外 (提携サイト・アプリ・FireTV・Twitch・IMDb等) への\n"
             "Programmatic 広告。Amazon の購買データを活用したターゲティングが強み",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Inventory
    add_text(s, "DSP在庫・配信面",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    inventory = [
        ("Amazon Owned",
         "Amazon.com / Fire TV / IMDb /\nTwitch / Audible"),
        ("Amazon Publisher",
         "Amazon Publisher Services 経由\n3rd party publishers"),
        ("Connected TV",
         "FireTV広告 / Smart TV配信\nCTV市場急成長中"),
        ("Mobile / Web",
         "デスクトップ / モバイル\nApp内広告"),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(1.85)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(inventory):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.05),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(5.15), Inches(12.15), Inches(1.8),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 DSP の使いどころ",
             Inches(0.85), Inches(5.3), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月予算 200万円以上 のブランド向け (DSPは管理工数が高い)\n"
             "• Amazon内Sponsored で限界に達したらDSP拡張で外面リーチ\n"
             "• CTV (FireTV) 配信は 認知獲得型ブランドで効果大\n"
             "• Audible / Twitch は エンタメ系ブランドで親和性高い\n"
             "• 副業代行スイートスポット : Sponsored Ads が中心、DSPは大手出店者向け",
             Inches(0.85), Inches(5.65), Inches(12), Inches(1.25),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p139_amc(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 AMC (Amazon Marketing Cloud)",
               "プライバシー安全なクリーンルーム + 2026 No-code化",
               pagenum(15))
    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "AMC : 広告主の 1PD + Amazon の 擬似化シグナル を SQL で分析できるクリーンルーム。\n"
             "Amazon Ads 全チャネルの impression / click / conversion を統合分析",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Key features
    add_text(s, "AMC 主要機能 (2025-2026)",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    features = [
        ("Event-Level Data",
         "12.5ヶ月の詳細データ\n25ヶ月の広告トラフィック"),
        ("No-code Hub (2026)",
         "SQL不要、テンプレート活用\nAds Agent (AI) で分析支援"),
        ("AWS Clean Rooms",
         "AWSのクリーンルームと統合\nデータ移動なしで分析"),
        ("Custom Models",
         "ML モデルを AMC内で訓練\nプライバシー保持しつつ予測"),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(2.0)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(features):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.25),
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
    add_text(s, "💡 副業代行で AMC を活用するシナリオ",
             Inches(0.85), Inches(5.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 中規模以上 (月予算300万円以上) のAmazon出店者で標準活用\n"
             "• 1PD (CRM顧客リスト) を Amazon 1PDと組合せて分析 → 高LTV顧客発掘\n"
             "• 2026 No-code化で SMB (中小事業者) でも利用可能に → 副業代行の差別化要素",
             Inches(0.85), Inches(5.8), Inches(12), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p140_amazon_playbook_part3_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "Amazon鉄板 + Part 3 (110p) 完了 → Part 4 へ",
               "媒体別キャッチアップ章のまとめ",
               pagenum(16))
    # Compact playbook
    add_text(s, "Amazon Ads 30日鉄板",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(1.95), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    plan = [
        ("Day 0-3", "出店者アカウント連携 + Sponsored Products"),
        ("Day 4-7", "Auto + Manual キャンペーン併存"),
        ("Day 8-21", "Sponsored Brands + Display 拡張"),
        ("Day 22-30", "ACOS 分析 + DSP/AMC 検討"),
    ]
    for i, (day, body) in enumerate(plan):
        y = Inches(2.15) + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.45),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(1.3), Inches(0.45),
                 fill=NAVY)
        add_text(s, day, Inches(0.6), y + Inches(0.1),
                 Inches(1.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, Inches(2.05), y + Inches(0.1),
                 Inches(4.4), Inches(0.3),
                 size=10, color=TEXT)

    # Pitfalls compact
    add_text(s, "Amazon よくある失敗",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=WARN)
    add_rect(s, Inches(7.0), Inches(1.95), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    pitfalls = [
        ("ACOS 一律目標", "業種・商品で差大、商材別に設定"),
        ("Sponsored Products のみ", "Brand/Display で機会損失"),
        ("自動入札を放置", "週次で入札調整必要"),
        ("AMC を SMB で諦め", "2026 No-code化で活用可"),
    ]
    for i, (mistake, fix) in enumerate(pitfalls):
        y = Inches(2.15) + Inches(0.55) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.45),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(7.0), y, Inches(0.1), Inches(0.45),
                 fill=WARN)
        add_text(s, mistake, Inches(7.2), y + Inches(0.05),
                 Inches(2.3), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, fix, Inches(9.6), y + Inches(0.07),
                 Inches(3.1), Inches(0.3),
                 size=9, color=MID_GRAY)

    # Part 3 完了 + Part 4 予告
    add_rect(s, Inches(0.6), Inches(4.6), Inches(12.15), Inches(2.35),
             fill=NAVY, radius=True)
    add_text(s, "🎉 Part 3 (媒体別キャッチアップ 110p) 完了",
             Inches(0.85), Inches(4.75), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Google Ads 25p / Meta 22p / YouTube 12p / Yahoo! 10p / TikTok 15p / LINE 10p / X 6p / LinkedIn 5p / Amazon 5p\n\n"
             "NEXT →  Part 4  計測・データ基盤の激変 (25p, P141-P165)\n"
             "  Cookie なき計測の現代 / SGTM / CAPI / Enhanced Conversions / MMM / Incrementality /\n"
             "  GA4 2024-2026アップデート / Looker Studio 進化 / AMC型クリーンルーム",
             Inches(0.85), Inches(5.25), Inches(12), Inches(1.7),
             size=12, color=WHITE, line_spacing=1.6)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p125_divider(prs)
    p126_x_landscape(prs)
    p127_x_campaigns(prs)
    p128_x_grok(prs)
    p129_x_measure_regulation(prs)
    p130_x_playbook_pitfalls(prs)
    p131_linkedin_landscape(prs)
    p132_linkedin_formats(prs)
    p133_abm(prs)
    p134_linkedin_measurement(prs)
    p135_linkedin_playbook(prs)
    p136_amazon_landscape(prs)
    p137_sponsored(prs)
    p138_dsp(prs)
    p139_amc(prs)
    p140_amazon_playbook_part3_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
