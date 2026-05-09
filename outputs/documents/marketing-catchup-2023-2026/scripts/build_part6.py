#!/usr/bin/env python3
"""Build Part 6 鉄板運用メソッド 2026年版 (15p, P206-P220)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part6.pptx"
PNUM_BASE = 205


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p206_divider(prs):
    part_divider(
        prs, 6, "鉄板運用メソッド 2026年版",
        "副業代行で『これだけ押さえれば成果が出る』運用設計",
        "2026年現在のAI運用時代に合わせた鉄板メソッド。\n"
        "アカウント構造・入札・クリエイティブ・Learning Phase・検証設計・レポート まで一気通貫。\n"
        "Part 1-5 を踏まえた『総まとめ』として、新規案件で即活用可能",
        [
            "全体俯瞰",
            "アカウント構造 Hub&Spoke",
            "入札戦略選定フロー",
            "クリエイティブ設計",
            "Learning Phase 突破",
            "予算配分フレーム",
            "検証設計",
            "月次レポート標準",
            "クライアント説明スクリプト",
            "案件タイプ別構成",
            "月次運用サイクル",
            "KPI / KGI 設計",
            "料金設計",
            "Part 7 へ橋渡し",
        ],
    )


def p207_overview(prs):
    s = blank(prs)
    page_frame(s, prs, "2026 鉄板運用メソッド 全体俯瞰",
               "5つの柱 + 1つのサイクル", pagenum(2))
    pillars = [
        ("構造", "Hub & Spoke + AIに任せる",
         "PMax / Advantage+ / Smart+ 中心\n2-3 ad set + AIで完全自動化"),
        ("計測", "1PD + CAPI + DDA",
         "Customer Match / Enhanced Conv\nSGTM + Conversion API"),
        ("素材", "AI生成 + 媒体ネイティブ",
         "Midjourney/Sora で量産 +\nAdvantage+ Creative で拡張"),
        ("検証", "Lift Test + DDA",
         "Conversion/Brand Lift で\nIncremental ROAS 測定"),
        ("オペレーション", "AI Agent + プロンプト",
         "Claude/Operator で工数削減\nレポートも AI 自動化"),
    ]
    top = Inches(1.55)
    w = Inches(2.43)
    h = Inches(2.65)
    gap = Inches(0.05)
    for i, (cat, sub, body) in enumerate(pillars):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, cat, x + Inches(0.15), top + Inches(0.18),
                 w - Inches(0.3), Inches(0.4),
                 size=15, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER)
        add_text(s, sub, x + Inches(0.15), top + Inches(0.6),
                 w - Inches(0.3), Inches(0.3),
                 size=9, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.05),
                 w - Inches(0.3), Inches(1.5),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Cycle
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "🔄 1ヶ月の運用サイクル",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Day 0-7  : 計測整備 + キャンペーン構造設計 + Audience Signal投入\n"
             "Day 8-21 : Learning Phase 突破 (予算 ±20% 安定運用 + 素材追加)\n"
             "Day 22-30: Lift Test 検証 + Optiscore適用 + 月次レポート + 次月提案\n\n"
             "翌月以降 : 月次サイクル継続。Lift結果 × Negative KW × クリエイティブ更新\n"
             "副業代行 : 1サイクル = 1案件あたり1人月で、AI駆使すれば月10-20案件並行可能",
             Inches(0.85), Inches(4.95), Inches(12), Inches(2.0),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p208_account_structure(prs):
    s = blank(prs)
    page_frame(s, prs, "アカウント構造 : Hub & Spoke",
               "PMax/Advantage+/Smart+ 中心の現代型",
               pagenum(3))
    # Hub diagram
    cx = Inches(6.66)
    cy = Inches(3.5)
    cr = Inches(1.5)
    add_rect(s, cx - cr, cy - cr / 2,
             cr * 2, cr, fill=ORANGE, radius=True)
    add_text(s, "AI配信",
             cx - cr, cy - cr / 2 + Inches(0.15),
             cr * 2, Inches(0.4),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, "(Hub)",
             cx - cr, cy - cr / 2 + Inches(0.55),
             cr * 2, Inches(0.3),
             size=11, color=WHITE, align=PP_ALIGN.CENTER)

    # Spokes
    spokes = [
        ("検索広告", "Broad Match\n+ AI Max",
         Inches(1.6), Inches(1.5)),
        ("PMax / Advantage+",
         "全媒体在庫\n統合配信",
         Inches(10.6), Inches(1.5)),
        ("Demand Gen", "YouTube/Discover\nGmail",
         Inches(1.6), Inches(5.0)),
        ("Smart+ (TikTok)",
         "縦型動画\nWeb/Catalog",
         Inches(10.6), Inches(5.0)),
    ]
    for name, body, x, y in spokes:
        add_rect(s, x, y, Inches(1.7), Inches(1.2),
                 fill=NAVY, radius=True)
        add_text(s, name, x, y + Inches(0.15),
                 Inches(1.7), Inches(0.4),
                 size=12, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x, y + Inches(0.6),
                 Inches(1.7), Inches(0.55),
                 size=9, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.4)

    # Bottom note
    add_rect(s, Inches(0.6), Inches(6.6), Inches(12.15), Inches(0.35),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 1キャンペーン + 2-3 ad set + AI完全自動化 が現代の鉄板。広告セット細分化はNG",
             Inches(0.85), Inches(6.65), Inches(12), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    footer(s, prs)


def p209_bidding_flow(prs):
    s = blank(prs)
    page_frame(s, prs, "入札戦略 選定フロー",
               "目的別フローチャート", pagenum(4))
    # 3 paths
    paths = [
        ("CV系 (リード/購入)",
         "Maximize Conversions → Target CPA",
         "1-2週間でCV30件以上\n→ Target CPA に切替\nCPAは現状の ±20%以内で設定"),
        ("売上重視 (EC/D2C)",
         "Maximize Conv. Value → Target ROAS",
         "VBB前提 (CV値送信必須)\nCV30件以上で安定後\nROASは現状の +20%目安"),
        ("認知 (ブランディング)",
         "Maximize Reach / Bumper",
         "リーチ最大化\nFrequency Cap で頻度制御\nBrand Lift Study で測定"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.7)
    gap = Inches(0.15)
    for i, (cat, strategy, body) in enumerate(paths):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, strategy, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.6)

    # Common rules
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 全戦略共通の鉄則",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 学習開始 = まず Maximize系 で『AIに学習させる』 (1-2週間)\n"
             "• 安定後 = Target CPA/ROAS で予算効率を追求\n"
             "• 設定値 = 現状実績の ±20% 以内 (極端な値は学習リセット)\n"
             "• 学習中の予算変動 = ±20% 以内 (大きく動かすと学習リセット)\n"
             "• Manual CPC は使わない (特殊用途のみ)\n"
             "• Smart Bidding = 全媒体共通の前提、手動入札の時代は終わり",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p210_creative_design(prs):
    s = blank(prs)
    page_frame(s, prs, "クリエイティブ本数・バリエーション設計",
               "AI生成時代の量産フレーム", pagenum(5))
    # Matrix
    add_text(s, "本数の目安 (媒体別 / 月間)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    matrix = [
        ("Google Ads",
         "RSA: 5-10 ad group\n見出し15+説明文4 完備\n+ アセット 6-10種"),
        ("Meta",
         "10-30 クリエイティブ/月\nAdvantage+ Creative ON\n動画+静止画+カルーセル"),
        ("TikTok",
         "20-30 動画/月\nSpark Ads (Creator) +\nSymphony (AI生成) ミックス"),
        ("YouTube",
         "5-15 動画/月\n6/15/30秒 + 縦型 9:16\nABCD原則準拠"),
    ]
    top = Inches(2.0)
    w = Inches(2.95)
    h = Inches(2.0)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(matrix):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, cat, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(0.7),
                 w - Inches(0.3), Inches(1.25),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Variation strategy
    add_rect(s, Inches(0.6), Inches(4.25), Inches(12.15), Inches(2.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 バリエーション設計の鉄則",
             Inches(0.85), Inches(4.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 訴求軸 = 5案 (価格 / 機能 / 体験 / 信頼 / 感情)\n"
             "• 訴求軸 × 訴求要素 (人物有 / 商品単体 / Before-After / 数字 / トレンド) でマトリクス\n"
             "• 月初に大量量産 → 月中で勝ちパターン抽出 → 月末に勝ちパターン強化版を量産\n"
             "• 媒体ネイティブ生成 (Advantage+ Creative / Symphony) で更にバリエーション拡張\n"
             "• AI 生成の品質チェック : 全部ではなく『勝ちそう20%』のみ人間レビュー",
             Inches(0.85), Inches(4.75), Inches(12), Inches(2.15),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p211_learning_phase(prs):
    s = blank(prs)
    page_frame(s, prs, "Learning Phase 突破手順",
               "学習期間で失敗しないための7ルール",
               pagenum(6))
    rules = [
        ("①", "予算 ±20% 以内に固定",
         "学習中の予算変動はリセット要因"),
        ("②", "目標値も ±20% 以内に",
         "tCPA/tROAS の極端な値変更NG"),
        ("③", "週単位でCVを30件以上目標",
         "下回るキャンペーンは構造見直し"),
        ("④", "アセット追加は週1回程度",
         "頻繁な変更で学習がリセット"),
        ("⑤", "ad set 統合 (細分化NG)",
         "1キャンペーン 2-3 ad set 推奨"),
        ("⑥", "Audience Signal を充実",
         "1PD投入 + Intent Segments"),
        ("⑦", "Optiscore は計測系から適用",
         "Enhanced Conv / DDA等 学習補助系"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(1.55)
    gap_x = Inches(0.1)
    gap_y = Inches(0.15)
    for i, (no, head, body) in enumerate(rules):
        if i >= 6:
            r, c = 2, 0  # last one centered or skip layout
            x = Inches(0.6) + (w + gap_x) * 1
            y = Inches(1.55) + (h + gap_y) * 2
        else:
            r, c = divmod(i, 4)
            if r == 0:
                x = Inches(0.6) + (w + gap_x) * c
                y = top + (h + gap_y) * r
            else:
                # 2nd row also 4 cols
                x = Inches(0.6) + (w + gap_x) * c
                y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, no, x + Inches(0.2), y + Inches(0.2),
                 Inches(0.5), Inches(0.5),
                 size=24, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, head, x + Inches(0.85), y + Inches(0.2),
                 w - Inches(1.0), Inches(0.45),
                 size=12, bold=True, color=NAVY, line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), y + Inches(0.95),
                 w - Inches(0.4), Inches(0.55),
                 size=10, color=TEXT, line_spacing=1.45)

    # Tip
    add_text(s,
             "💡 Learning Phaseは『AIを育てる時間』。我慢して触らないのが最大のベストプラクティス",
             Inches(0.6), Inches(6.65), Inches(12), Inches(0.3),
             size=11, bold=True, color=NAVY)
    footer(s, prs)


def p212_budget(prs):
    s = blank(prs)
    page_frame(s, prs, "予算配分フレーム",
               "媒体別配分の目安と動的調整",
               pagenum(7))
    # Default allocations
    add_text(s, "業種別の標準配分 (Google : Meta : 他媒体)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    allocations = [
        ("EC / D2C",
         "Google 40 / Meta 40 / TikTok 20",
         "PMax + Advantage+ Sales + Smart+\nの3軸構成が鉄板"),
        ("BtoBリード",
         "Google 50 / Meta 20 / LinkedIn 30",
         "Search広告 + Lead Form 中心\nLinkedIn ABM で深掘り"),
        ("飲食/美容/ローカル",
         "Google 50 / Meta 30 / LINE 20",
         "Google Maps + Local + Meta Reels +\nLINE公式アカウント連携"),
        ("認知獲得型",
         "YouTube 40 / Meta 30 / TikTok 30",
         "VRC + Reels + Smart+ で\n縦型/横型動画ミックス"),
    ]
    top = Inches(2.0)
    w = Inches(5.95)
    h = Inches(1.55)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (cat, ratio, body) in enumerate(allocations):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), y + Inches(0.13),
                 w - Inches(0.4), Inches(0.35),
                 size=13, bold=True, color=NAVY)
        add_text(s, ratio, x + Inches(0.25), y + Inches(0.5),
                 w - Inches(0.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), y + Inches(0.85),
                 w - Inches(0.4), Inches(0.65),
                 size=10, color=TEXT, line_spacing=1.5)

    # Dynamic adjustment
    add_rect(s, Inches(0.6), Inches(5.5), Inches(12.15), Inches(1.45),
             fill=NAVY, radius=True)
    add_text(s, "💡 動的調整の原則",
             Inches(0.85), Inches(5.65), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月次でROAS/CPA基準で配分見直し (媒体間で予算移動)\n"
             "• 大きな動かしは ±20% 以内 (学習リセット回避)\n"
             "• MMM結果で再配分 (中規模以上、月予算500万円〜)",
             Inches(0.85), Inches(6.0), Inches(12), Inches(0.85),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p213_validation(prs):
    s = blank(prs)
    page_frame(s, prs, "検証設計 — Incrementality + A/B + Lift",
               "ラストクリック超えの効果測定", pagenum(8))
    methods = [
        ("Conversion Lift",
         "媒体内 (Meta/Google/TikTok)",
         "Test/Control群でCV率比較\n月100万以上で月次標準化"),
        ("Brand Lift Study",
         "認知系効果測定",
         "Ad Recall/Awareness/Intent\nブランディング案件で必須"),
        ("Search Lift",
         "Google YouTube独自",
         "ブランド検索数の上昇\n認知 → 検索 導線を測定"),
        ("Geo Lift Test",
         "地域別非配信実験",
         "TVCM併用ブランド\n商用ツール (Geolift等)"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(methods):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.15), top + Inches(0.18),
                 w - Inches(0.3), Inches(0.45),
                 size=13, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.15), top + Inches(0.6),
                 w - Inches(0.3), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.05),
                 w - Inches(0.3), Inches(1.4),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(4.25), Inches(12.15), Inches(2.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で検証設計を提案するシナリオ",
             Inches(0.85), Inches(4.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月予算 100万円以上のCV系 = Conversion Lift Test を月次で実施 (無料)\n"
             "• 月予算 100万円以上の認知系 = Brand Lift Study (媒体側無料、Meta/Google/TikTok)\n"
             "• YouTube認知 = Brand Lift + Search Lift で『認知 → 検索』導線確認\n"
             "• 月予算 500万円以上 + 多媒体 = MMM (Robyn/Meridian) で全体配分検証\n"
             "• クライアントレポートに『Incremental ROAS』を必ず記載 (差別化要素)",
             Inches(0.85), Inches(4.75), Inches(12), Inches(2.15),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p214_monthly_report(prs):
    s = blank(prs)
    page_frame(s, prs, "月次レポート標準フォーマット",
               "クライアント向けの『これだけ載せれば信頼』",
               pagenum(9))
    sections = [
        ("Section 1",
         "エグゼクティブサマリー",
         "3-5行 + 主要数字\n月の総括 + 今月の論点"),
        ("Section 2",
         "KGI / KPI ダッシュボード",
         "売上 / CV / CPA / ROAS\n前月比・目標比"),
        ("Section 3",
         "媒体別パフォーマンス",
         "媒体別の数字 + コメント\n良かった点・課題"),
        ("Section 4",
         "クリエイティブ分析",
         "Best/Low クリエイティブ\n勝ちパターン抽出"),
        ("Section 5",
         "Lift Test結果",
         "Incremental ROAS\n認知系は Brand Lift"),
        ("Section 6",
         "来月の提案 + 予算配分",
         "アクション3つ + 期待効果\n予算変更の提案"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (no, name, body) in enumerate(sections):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, no, x + Inches(0.25), y + Inches(0.15),
                 Inches(2.5), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, name, x + Inches(0.25), y + Inches(0.45),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.9),
                 w - Inches(0.4), Inches(0.6),
                 size=10, color=TEXT, line_spacing=1.45)

    # Tip
    add_rect(s, Inches(0.6), Inches(5.5), Inches(12.15), Inches(1.45),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 レポート作成効率化",
             Inches(0.85), Inches(5.65), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Looker Studio でテンプレ化 → 月次自動更新\n"
             "• Conversational Analytics で要約自動生成\n"
             "• Section 1, 6 のみ人間執筆、他は AI Insights 活用 → 工数 5h → 1h 削減",
             Inches(0.85), Inches(6.0), Inches(12), Inches(0.85),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p215_client_script(prs):
    s = blank(prs)
    page_frame(s, prs, "クライアント説明スクリプト",
               "鉄板の伝え方 5パターン", pagenum(10))
    scripts = [
        ("📊 数字が悪い時",
         "『今月のCPAは目標を上回りましたが、Lift Test では Incremental ROAS が改善しています。\n"
         "これは AI学習が進み、表示頻度が最適化された結果。来月は X を試します』"),
        ("✨ 数字が良い時",
         "『今月の好調要因は A/B/C の3つです。来月は B を更に伸ばすため X を試します。\n"
         "ただし AI配信の特性上、再現性を保つには検証期間が必要です』"),
        ("⚠ 大きな変更を提案",
         "『現状はXX%で安定していますが、Y を導入することで短期的にZ%改善見込み。\n"
         "ただし学習期間1-2週間で一時的にCPA上昇のリスクあります』"),
        ("📈 予算増額提案",
         "『現在のCPAは目標内、ROASも改善傾向。予算+30%で月CV +25%を見込めます。\n"
         "Lift Test結果から Incremental ROASも維持される見込みです』"),
        ("🚨 予算削減を求められた時",
         "『削減は可能ですが、Learning Phaseリセットで一時的にCPA悪化のリスクあります。\n"
         "段階的に -20%/週 で動かす方が学習継続できる選択肢もあります』"),
    ]
    top = Inches(1.5)
    h = Inches(1.0)
    gap = Inches(0.1)
    for i, (head, body) in enumerate(scripts):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.1), h, fill=ORANGE)
        add_text(s, head, Inches(0.85), y + Inches(0.13),
                 Inches(11.5), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, Inches(0.85), y + Inches(0.45),
                 Inches(11.5), Inches(0.55),
                 size=10, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p216_case_types(prs):
    s = blank(prs)
    page_frame(s, prs, "案件タイプ別の鉄板構成",
               "業種別の標準パッケージ", pagenum(11))
    cases = [
        ("EC / D2C",
         "PMax + Advantage+ Sales + Smart+",
         "Customer Match + Lookalike\n動画+静止画 月20-30本\nBrand Lift + Conversion Lift"),
        ("リード獲得 (B2B)",
         "Google Search + Meta Lead + LinkedIn ABM",
         "LeadGen Form + EC for Leads\nSponsored + Thought Leader\nCRM連携 (Closed-Loop)"),
        ("飲食/美容/ローカル",
         "Google PMax (Store Goals) + Meta Reels + LINE",
         "Google Business Profile連携\nLINE公式アカウント連携\nクーポン配布で来店促進"),
        ("認知獲得 (ブランド)",
         "YouTube VRC + Meta Reels + TikTok Smart+",
         "Bumper + 縦型 6/15/30秒\nBrand Lift Study 必須\nReach + Frequency最適化"),
    ]
    top = Inches(1.55)
    w = Inches(5.95)
    h = Inches(2.5)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (cat, structure, body) in enumerate(cases):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.85), fill=NAVY)
        add_text(s, cat, x + Inches(0.25), y + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=ORANGE)
        add_text(s, structure, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), y + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p217_monthly_cycle(prs):
    s = blank(prs)
    page_frame(s, prs, "副業代行の月次運用サイクル",
               "週単位のタスクスケジュール", pagenum(12))
    weeks = [
        ("Week 1",
         "計測整備 + 構造設計",
         "・GA4/Tag/CAPI 確認\n・キャンペーン構造決定\n・初期クリエイティブ投入\n・Audience Signal設定"),
        ("Week 2",
         "Learning Phase",
         "・予算 ±20% 安定運用\n・週末にSearch Terms確認\n・Negative KW 5-10件追加\n・素材追加は最小限"),
        ("Week 3",
         "中間レビュー",
         "・Best/Low クリエイティブ抽出\n・Lift Test 申請 (該当時)\n・Optiscore 適用\n・クリエイティブ追加 5-10本"),
        ("Week 4",
         "レポート + 提案",
         "・月次レポート作成 (AI活用)\n・Lift Test 結果分析\n・来月予算配分提案\n・クライアントMTG"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.6)
    gap = Inches(0.1)
    for i, (week, name, body) in enumerate(weeks):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, week, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.15), top + Inches(0.7),
                 w - Inches(0.3), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.2),
                 w - Inches(0.3), Inches(1.35),
                 size=10, color=TEXT, line_spacing=1.7)

    # Tip
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 1ヶ月の工数目安 (1案件あたり)",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Week 1 (構造設計) : 8-10h (初月のみ、2ヶ月目以降は2-3h)\n"
             "• Week 2 (Learning) : 2-3h (確認 + 微調整中心)\n"
             "• Week 3 (中間レビュー) : 4-5h (素材追加 + Optiscore適用)\n"
             "• Week 4 (レポート + 提案) : 4-5h (AI活用で 2h 程度に圧縮可)\n"
             "= 月間合計 : 初月 18-23h、2ヶ月目以降 12-15h\n"
             "= 1人で月10-15案件並行 (AI 駆使前提) が現実的",
             Inches(0.85), Inches(4.95), Inches(12), Inches(2.0),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p218_kpi(prs):
    s = blank(prs)
    page_frame(s, prs, "KPI / KGI 設計",
               "クライアントと合意するべき数字",
               pagenum(13))
    levels = [
        ("KGI (最終目標)",
         "売上 / リード件数 / LTV",
         "クライアントのビジネス目標\n月次・四半期で合意\n例: 月売上1,000万円 / 月50リード"),
        ("KPI 主指標",
         "CV件数 / ROAS / CPA / CPL",
         "広告運用で直接動かせる指標\nKGIに連動する形で設定\n例: CPL 5,000円以下 / ROAS 200%以上"),
        ("KPI 副指標",
         "CTR / CVR / IS / Frequency",
         "改善の手がかりとなる指標\n月次レポートで言及\n例: CTR 2%以上 / IS 60%以上"),
        ("健全性指標",
         "Quality Score / Optiscore / EMQ",
         "アカウント健全性\nクライアントには非報告でも内部監視\n例: Optiscore 80%以上"),
    ]
    top = Inches(1.55)
    w = Inches(5.95)
    h = Inches(2.5)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (cat, indicators, body) in enumerate(levels):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), y + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, indicators, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), y + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p219_pricing(prs):
    s = blank(prs)
    page_frame(s, prs, "副業代行の料金設計",
               "案件規模別の標準料金", pagenum(14))
    tiers = [
        ("Tier 1 : SMB",
         "月予算 30-100万円",
         "代行料 月3-5万円\n固定報酬\n媒体 1-2軸"),
        ("Tier 2 : 中堅",
         "月予算 100-500万円",
         "代行料 月5-15万円\n固定 + 成果報酬\n媒体 2-3軸"),
        ("Tier 3 : 中規模",
         "月予算 500-2,000万円",
         "代行料 月20-50万円\n固定 + ROAS連動\n全媒体構成"),
        ("Tier 4 : 大手",
         "月予算 2,000万円以上",
         "代行料 月50万円〜\n業績連動契約\nMMM / 専門ツール込"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (tier, scale, body) in enumerate(tiers):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, tier, x + Inches(0.15), top + Inches(0.18),
                 w - Inches(0.3), Inches(0.45),
                 size=13, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, scale, x + Inches(0.15), top + Inches(0.6),
                 w - Inches(0.3), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.1),
                 w - Inches(0.3), Inches(1.35),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.65)

    # Tip
    add_rect(s, Inches(0.6), Inches(4.25), Inches(12.15), Inches(2.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行スタートの推奨",
             Inches(0.85), Inches(4.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 最初の3-5案件 = Tier 1 (月3-5万円固定) で実績作り\n"
             "• 6-10案件目 = Tier 2 を狙う (実績 + ROAS事例 + Lift Test 提示)\n"
             "• 月収目標 = Tier 1 × 5社 + Tier 2 × 3社 = 月30-60万円が現実的\n"
             "• AI 駆使前提なら Tier 3 (月予算500万以上) を1社受注で月40万円も可能\n"
             "• 単価上げの鍵 = Lift Test / DDA / Cross-channel 等の差別化スキル",
             Inches(0.85), Inches(4.75), Inches(12), Inches(2.15),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p220_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "Part 6 まとめ → Part 7 へ",
               "鉄板運用メソッド の総括 + 次は BSA 実装", pagenum(15))
    # 3 takeaways
    takeaways = [
        ("01",
         "AI を導く運用が現代の標準",
         "PMax / Advantage+ / Smart+ で構造設計 + AI に任せる + 検証\n"
         "手動入札 / 細分化 / 頻繁な変更は学習リセットの原因"),
        ("02",
         "計測 + 検証 が差別化要素",
         "1PD / SGTM / CAPI / DDA を全案件で標準化\n"
         "Conversion Lift / Brand Lift で『Incremental ROAS』を提示"),
        ("03",
         "AI 駆使で1人月10-20案件並行",
         "クリエイティブ生成・レポート・Negative KW を AI 自動化\n"
         "戦略・判断・クライアント窓口 が人間の主戦場"),
    ]
    top = Inches(1.5)
    for i, (n, title, body) in enumerate(takeaways):
        y = top + Inches(1.05) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.95),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), Inches(0.95),
                 fill=ORANGE)
        add_text(s, n, Inches(0.95), y + Inches(0.13),
                 Inches(1.0), Inches(0.6),
                 size=28, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, title, Inches(2.05), y + Inches(0.12),
                 Inches(10.5), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, Inches(2.05), y + Inches(0.5),
                 Inches(10.5), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.55)

    # Next chapter
    add_rect(s, Inches(0.6), Inches(4.85), Inches(12.15), Inches(2.1),
             fill=NAVY, radius=True)
    add_text(s, "NEXT →  Part 7  BSA L3 実装ガイド (10p, P221-P230)",
             Inches(0.85), Inches(5.0), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 7 で扱うトピック (10p) :\n"
             "• L3商品定義 (HP制作 + 広告運用初月セット 10万円 / 96時間)\n"
             "• 30日プラン (Day 0-3 / 3-5 / 5-7 / Wk2-4)\n"
             "• クリエイティブAI活用手順\n"
             "• 価格・工数のリアル / 詰まりポイント集\n\n"
             "Part 1-6 を BSA L3 案件で即活用するための実装ガイド",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p206_divider(prs)
    p207_overview(prs)
    p208_account_structure(prs)
    p209_bidding_flow(prs)
    p210_creative_design(prs)
    p211_learning_phase(prs)
    p212_budget(prs)
    p213_validation(prs)
    p214_monthly_report(prs)
    p215_client_script(prs)
    p216_case_types(prs)
    p217_monthly_cycle(prs)
    p218_kpi(prs)
    p219_pricing(prs)
    p220_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
