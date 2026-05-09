#!/usr/bin/env python3
"""Build Part 3-B Meta (22p, P56-P77)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part3b.pptx"
PNUM_BASE = 55  # P56-P77


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


# ---------- helpers ----------
def sub_divider_slide(prs, sub_label, title, subtitle, pages, summary, topics):
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
    add_text(s, "▸ 章内の主要トピック",
             Inches(1.2), Inches(5.5), Inches(8), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    half = (len(topics) + 1) // 2
    for i, t in enumerate(topics):
        c = i // half
        r = i % half
        x = Inches(1.2) + Inches(5.7) * c
        y = Inches(5.85) + Inches(0.32) * r
        add_text(s, f"• {t}", x, y, Inches(5.5), Inches(0.32),
                 size=11, color=WHITE)


# ---------- slide builders ----------
def p56_divider(prs):
    sub_divider_slide(
        prs,
        "3-B   |   Facebook / Instagram / Threads",
        "Meta",
        "AI配信の最先端。Advantage+ 全盛 + Andromeda 配信エンジン世代交代",
        "22p",
        "Advantage+ Sales (旧ASC) リブランド (2025/02)、Andromeda 配信MLの世代交代 (2024末)、\n"
        "Threads広告グローバル展開 (2025/04)、CAPI/AEM標準化、Conversion Lift民主化。\n"
        "EC / D2C / リード獲得で最重要の媒体",
        [
            "Meta 地殻変動 TL;DR",
            "Advantage+ ランドスケープ",
            "Advantage+ Sales (旧ASC)",
            "Advantage+ App / Leads",
            "Advantage+ Creative",
            "Andromeda (2024末)",
            "GEM と配信ML",
            "Lattice 統合",
            "CAPI / CAPI Gateway",
            "AEM / SKAN",
            "Audience Manager",
            "Reels / Stories / Feed",
            "Threads Ads (2025/04)",
            "Click-to-Message",
            "Conversion Lift",
            "Brand Lift Studies",
            "Meta Verified for Biz",
            "Brand Safety",
            "Pixel + CAPI ハイブリッド",
            "鉄板運用メソッド",
            "よくある失敗・回避策",
        ],
    )


def p57_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta : 地殻変動 TL;DR",
               "2023年9月 → 2026年4月 / 5つの大きな変化",
               pagenum(2))

    points = [
        ("01", "Advantage+ が全プロダクトで Default に",
         "ASC → Advantage+ Sales に名称変更 (2025/02)。Sales/App/Leads/Catalog で\n"
         "Advantage+ がデフォルトON。複数広告セット併存が可能に"),
        ("02", "配信MLが Andromeda 世代へ (2024末)",
         "MTIA + NVIDIA Grace Hopper による新ハードウェア。\n"
         "Ads retrieval モデルの複雑度 10,000倍化、Quality +8%, CV +6%"),
        ("03", "クリエイティブ生成が標準装備",
         "Advantage+ Creative : 画像バリエーション/音楽追加/トリミング/テキスト変換。\n"
         "Imagine / Emu モデルが背後で動く。広告セット上で AI が選別"),
        ("04", "計測は CAPI + AEM が前提",
         "iOS/ATTシグナル減への対応として CAPI Gateway 導入が普及。\n"
         "Conversion Lift Test が民主化、Incrementality 設計が標準スキルに"),
        ("05", "Threads が新しい配信面に追加 (2025/04)",
         "2025/04 全エリギブル広告主にグローバル開放。\n"
         "段階的ロールアウト、当面は補助配信面の位置づけ"),
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


def p58_objectives_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "キャンペーン目標と Advantage+ ランドスケープ",
               "2026年現在: 6目標 × Advantage+ オプション",
               pagenum(3))

    # Header note
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.85),
             fill=NAVY, radius=True)
    add_text(s,
             "Sales / App / Leads / Awareness / Traffic / Engagement の 6 目標は ODAX (Outcome-Driven Ad Experiences) として 2022 から定着。\n"
             "Sales / App / Leads には『Advantage+』オプション、CV系3目標がメインの戦場",
             Inches(0.85), Inches(1.6), Inches(12), Inches(0.7),
             size=11, color=WHITE, line_spacing=1.45)

    objectives = [
        ("Sales", "売上獲得",
         "EC / D2C / 高単価商材", "Advantage+ Sales (旧ASC)", True),
        ("App", "アプリインストール",
         "モバイルアプリ", "Advantage+ App", True),
        ("Leads", "リード獲得",
         "B2B / 不動産 / 教育", "Advantage+ Leads", True),
        ("Awareness", "認知拡大",
         "新ブランド / 新商品", "Reach / Brand Awareness", False),
        ("Traffic", "トラフィック",
         "情報サイト / メディア", "クリック数最適化", False),
        ("Engagement", "エンゲージメント",
         "動画再生 / メッセージ / イベント", "目的別細分", False),
    ]
    top = Inches(2.55)
    w = Inches(3.95)
    h = Inches(2.1)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (name, role, fit, adv, has_advantage) in enumerate(objectives):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        bg = ACCENT_BG if has_advantage else LIGHT
        add_rect(s, x, y, w, h, fill=bg, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h,
                 fill=ORANGE if has_advantage else MID_GRAY)
        add_text(s, name, x + Inches(0.25), y + Inches(0.15),
                 w - Inches(0.4), Inches(0.4),
                 size=18, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, role, x + Inches(0.25), y + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=11, bold=True,
                 color=ORANGE_DARK if has_advantage else MID_GRAY)
        add_text(s, fit, x + Inches(0.25), y + Inches(0.85),
                 w - Inches(0.4), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.4)
        add_rect(s, x + Inches(0.25), y + Inches(1.3),
                 w - Inches(0.5), Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, "AI/Auto:", x + Inches(0.25), y + Inches(1.45),
                 Inches(1.5), Inches(0.3),
                 size=9, bold=True, color=MID_GRAY)
        add_text(s, adv, x + Inches(1.4), y + Inches(1.45),
                 w - Inches(1.5), Inches(0.5),
                 size=10, bold=True,
                 color=ORANGE_DARK if has_advantage else MID_GRAY,
                 line_spacing=1.4)

    footer(s, prs)


def p59_advantage_sales(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Advantage+ Sales (旧 ASC) — 2025/02 リブランド",
               "EC / D2C で Meta 配信の鉄板", pagenum(4))

    # Big rebrand callout
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "📢", Inches(0.85), Inches(1.75),
             Inches(0.8), Inches(0.8), size=30)
    add_text(s, "Advantage+ Shopping Campaigns (ASC) → Advantage+ Sales",
             Inches(1.7), Inches(1.65), Inches(11), Inches(0.5),
             size=15, bold=True, color=ORANGE)
    add_text(s,
             "2025/02/10 ベータ開始 → Q2/2025 全面ロールアウト。\n"
             "EC専用→『販売目的すべて対応』へ拡張。\n"
             "Sales/App/Leads では Advantage+ がデフォルトON、複数広告セット併存可能に",
             Inches(1.7), Inches(2.0), Inches(11), Inches(0.75),
             size=11, color=WHITE, line_spacing=1.45)

    # Before / After
    add_text(s, "ASC との差分",
             Inches(0.6), Inches(2.95), Inches(6), Inches(0.35),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.3), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    diffs = [
        ("配信目的", "EC/D2C 限定", "Sales目的 全般 (リード/アプリ含む)"),
        ("広告セット", "1 ad set のみ", "複数 ad set 併存可 (Advantage+ Budget ON 必須)"),
        ("オーディエンス", "新規寄り 70/30 強制",
         "Audience Suggestions + Custom Audience 除外"),
        ("自動化レベル", "高 (制御少ない)", "高 + 制御レバー追加"),
        ("Default", "手動で選択", "Sales/App/Leads目的では Default ON"),
    ]
    col_x = [Inches(0.6), Inches(3.6), Inches(8.0)]
    col_w = [Inches(3), Inches(4.4), Inches(4.75)]
    add_rect(s, Inches(0.6), Inches(3.5), Inches(12.15), Inches(0.45),
             fill=NAVY)
    headers = ["観点", "ASC (旧)", "Advantage+ Sales (新)"]
    for i, h in enumerate(headers):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(3.6),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)
    for i, row in enumerate(diffs):
        y = Inches(3.95) + Inches(0.5) * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.45),
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            add_text(s, cell, col_x[j] + Inches(0.15),
                     y + Inches(0.12),
                     col_w[j] - Inches(0.2), Inches(0.3),
                     size=10, bold=(j == 0),
                     color=NAVY if j == 0 else TEXT)

    # Tip
    add_rect(s, Inches(0.6), Inches(6.45), Inches(12.15), Inches(0.5),
             fill=ACCENT_BG, radius=True)
    add_text(s,
             "💡 EC案件の鉄板 : 1キャンペーン + Advantage+ Sales + Audience Suggestions + 既存顧客除外 → New Customer Acquisition",
             Inches(0.85), Inches(6.55), Inches(12), Inches(0.4),
             size=10, bold=True, color=ORANGE_DARK)

    footer(s, prs)


def p60_advantage_others(prs):
    s = blank(prs)
    page_frame(s, prs, "Advantage+ App / Leads / Catalog",
               "Sales 以外の Advantage+ プロダクト群", pagenum(5))

    products = [
        ("Advantage+ App",
         "App Install / Re-engagement",
         "iOSは SKAN 連携、AndroidはGoogle Play Install Referrer 連携。\n"
         "Audience は Advantage+ Targeting でAI推定。Lookalike不要"),
        ("Advantage+ Leads",
         "リード獲得",
         "Lead Ads + 即時フォーム + CAPI for Leads。\n"
         "Conversion Lift Test との組合せで Incrementality も測れる"),
        ("Advantage+ Catalog",
         "EC商品データ連携配信",
         "Commerce Manager + Product Catalog → Advantage+ Sales 内で\n"
         "DPA (Dynamic Product Ads) として配信。Pixel/CAPI で購買行動連動"),
    ]
    top = Inches(1.5)
    h = Inches(1.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(products):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, name, Inches(0.95), y + Inches(0.25),
                 Inches(6), Inches(0.5),
                 size=20, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, sub, Inches(0.95), y + Inches(0.75),
                 Inches(6), Inches(0.35),
                 size=12, bold=True, color=ORANGE_DARK)
        # Right body
        add_text(s, body, Inches(7.0), y + Inches(0.35),
                 Inches(5.7), h - Inches(0.5),
                 size=11, color=TEXT, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(7.0), Inches(12.15), Inches(0.0),
             fill=LIGHT_GRAY)
    footer(s, prs)


def p61_advantage_creative(prs):
    s = blank(prs)
    page_frame(s, prs, "Advantage+ Creative の機能群",
               "AI が広告セット内でクリエイティブを自動最適化",
               pagenum(6))

    features = [
        ("Image Variations",
         "1枚の画像から複数バリエーションを\n自動生成 (色・コントラスト調整)"),
        ("Music",
         "Reels向けに音楽トラックを\n自動付与 (ライブラリ内から AI選択)"),
        ("Cropping",
         "プレースメント別に自動トリミング\n(縦9:16 / 横16:9 / 1:1)"),
        ("Text Variations",
         "Primary Text を AI が複数生成\n(Llama / Imagine 系モデル)"),
        ("Image Expansion",
         "画像の余白を AI拡張\n配置面のアスペクト比に合わせて拡張"),
        ("Image Touch-ups",
         "明るさ・色彩・ノイズ補正を自動適用\nクリエイティブ品質均一化"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.55)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    for i, (name, body) in enumerate(features):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), y + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, body, x + Inches(0.25), y + Inches(0.7),
                 w - Inches(0.4), Inches(0.8),
                 size=11, color=TEXT, line_spacing=1.45)

    # Tip box
    add_rect(s, Inches(0.6), Inches(5.0), Inches(12.15), Inches(1.95),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Advantage+ Creative の使いこなし",
             Inches(0.85), Inches(5.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 各機能は ad set レベルで個別ON/OFF可。ブランド毀損リスクのある機能 (色変更/テキスト変換) は慎重に\n"
             "• Image Touch-ups と Cropping は基本ON、ブランド統制が必要な業界 (高級・医療) は OFF推奨\n"
             "• Music は Reels で効果大、Stories/Feed は控えめが無難\n"
             "• Text Variations は法令遵守業界 (薬機法対応など) では必ず審査フロー組み込み",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=TEXT, line_spacing=1.6)

    footer(s, prs)


def p62_andromeda(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Andromeda ─ 配信ML世代交代 (2024末)",
               "Meta Ads Ranking の根幹が刷新された", pagenum(7))

    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "🚀", Inches(0.85), Inches(1.75),
             Inches(0.8), Inches(0.8), size=30)
    add_text(s, "Meta Engineering Blog (2024/12/02)",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "MTIA (Meta Training & Inference Accelerator) + NVIDIA Grace Hopper による\n"
             "新ハードウェア + 共同設計ソフトウェア。Ads Retrieval (候補絞り込み) 段階を刷新",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.7),
             size=12, bold=True, color=WHITE, line_spacing=1.45)

    # 3 key metrics
    add_text(s, "Andromeda が達成した数値",
             Inches(0.6), Inches(2.95), Inches(8), Inches(0.4),
             size=13, bold=True, color=NAVY)

    metrics = [
        ("10,000x", "Ads Retrieval モデルの複雑度向上"),
        ("+8%", "Ads Quality 改善 (Meta公式測定)"),
        ("UP", "Advantage+ × GenAI クリエイティブ効果増幅"),
    ]
    top = Inches(3.5)
    w = Inches(3.95)
    h = Inches(1.85)
    gap = Inches(0.15)
    for i, (val, desc) in enumerate(metrics):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=ACCENT_BG, radius=True)
        add_rect(s, x, top, Inches(0.1), h, fill=ORANGE)
        add_text(s, val, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.75),
                 size=42, bold=True, color=ORANGE,
                 font=EN_FONT, line_spacing=1.0,
                 align=PP_ALIGN.CENTER)
        add_text(s, desc, x + Inches(0.25), top + Inches(1.15),
                 w - Inches(0.4), Inches(0.65),
                 size=11, color=TEXT, line_spacing=1.45,
                 align=PP_ALIGN.CENTER)

    # What it means
    add_rect(s, Inches(0.6), Inches(5.55), Inches(12.15), Inches(1.4),
             fill=NAVY, radius=True)
    add_text(s, "💡 運用者にとっての含意",
             Inches(0.85), Inches(5.7), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 運用者ができる工夫の余地は減少 — 配信ML自体が桁違いに賢くなった\n"
             "• クリエイティブの多様性が一段と効く — AIがより細かくマッチングするため『多様な素材』が前提\n"
             "• Audience Signal / Custom Audience の質が以前にも増して効く\n"
             "• Andromeda は段階展開 — 全アカウントで完全適用は 2025-2026 にかけて段階",
             Inches(0.85), Inches(6.05), Inches(12), Inches(0.85),
             size=11, color=WHITE, line_spacing=1.55)

    footer(s, prs)


def p63_gem(prs):
    s = blank(prs)
    page_frame(s, prs, "GEM (Generative Engagement Model) と Andromeda",
               "クリエイティブ理解＋ユーザー意図予測の生成モデル",
               pagenum(8))

    # 2 layer architecture
    add_text(s, "Andromeda × GEM の2層構造",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    # Layer 1: Andromeda (retrieval)
    add_rect(s, Inches(0.6), Inches(2.05), Inches(12.15), Inches(1.6),
             fill=NAVY, radius=True)
    add_text(s, "LAYER 1 — Andromeda (Retrieval)",
             Inches(0.85), Inches(2.2), Inches(11), Inches(0.4),
             size=14, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "数千万件の広告候補プールから、ユーザーに見せる数千件の候補を絞り込む。\n"
             "MTIA + Grace Hopper で 10,000x モデル複雑化。前段の効率化が後段の精度を上げる",
             Inches(0.85), Inches(2.65), Inches(12), Inches(0.85),
             size=11, color=WHITE, line_spacing=1.5)

    # Arrow
    add_shape(s, MSO_SHAPE.DOWN_ARROW,
              Inches(6.4), Inches(3.7), Inches(0.5), Inches(0.4),
              fill=ORANGE)

    # Layer 2: GEM (Generative)
    add_rect(s, Inches(0.6), Inches(4.15), Inches(12.15), Inches(1.6),
             fill=ORANGE, radius=True)
    add_text(s, "LAYER 2 — GEM (Generative Engagement Model)",
             Inches(0.85), Inches(4.3), Inches(11), Inches(0.4),
             size=14, bold=True, color=WHITE, font=EN_FONT)
    add_text(s,
             "クリエイティブの内容理解 + ユーザーの意図予測を統合。\n"
             "『この画像 + このテキスト + このユーザー → 何%エンゲージするか』の予測精度が向上",
             Inches(0.85), Inches(4.75), Inches(12), Inches(0.85),
             size=11, color=WHITE, line_spacing=1.5)

    # Why this matters
    add_rect(s, Inches(0.6), Inches(5.95), Inches(12.15), Inches(1.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえるポイント",
             Inches(0.85), Inches(6.05), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• クリエイティブの本数 + 多様性が AI 学習を加速 — 同じ訴求を画像・動画で量産\n"
             "• Audience Signal の質 + Custom Audience が予測精度向上に直結",
             Inches(0.85), Inches(6.4), Inches(12), Inches(0.5),
             size=11, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p64_lattice(prs):
    s = blank(prs)
    page_frame(s, prs, "Lattice — ML スタック統合 (2024)",
               "ランキングモデルの統合で Quality +12%, CV +6%",
               pagenum(9))

    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Lattice : Meta内の複数のランキングモデルを統合した ML スタック。\n"
             "従来は配信目的別に別モデルだったものを、共通基盤上で訓練・推論する設計に",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Before / After
    add_text(s, "Lattice 導入前 vs 後",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    add_rect(s, Inches(0.6), Inches(3.1), Inches(5.95), Inches(2.5),
             fill=LIGHT, line=LIGHT_GRAY, radius=True)
    add_text(s, "Before (〜2023)",
             Inches(0.85), Inches(3.25), Inches(5.5), Inches(0.35),
             size=13, bold=True, color=MID_GRAY)
    add_text(s,
             "• 配信目的ごとに個別MLモデル\n"
             "• 学習データのサイロ化\n"
             "• クロスチャネル学習が困難\n"
             "• 新機能追加に時間がかかる",
             Inches(0.85), Inches(3.65), Inches(5.5), Inches(1.85),
             size=11, color=TEXT, line_spacing=1.65)

    add_rect(s, Inches(6.8), Inches(3.1), Inches(5.95), Inches(2.5),
             fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
    add_text(s, "After (Lattice 2024〜)",
             Inches(7.05), Inches(3.25), Inches(5.5), Inches(0.35),
             size=13, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 統合MLスタックで全目的をカバー\n"
             "• データ・特徴量の共有\n"
             "• 配信全体の最適化が可能\n"
             "• 新機能 (Advantage+/Andromeda) 即連携",
             Inches(7.05), Inches(3.65), Inches(5.5), Inches(1.85),
             size=11, color=TEXT, line_spacing=1.65)

    # Stats
    add_rect(s, Inches(0.6), Inches(5.85), Inches(12.15), Inches(1.1),
             fill=ORANGE, radius=True)
    add_text(s, "Meta 公式の Lattice 効果",
             Inches(0.85), Inches(5.95), Inches(8), Inches(0.35),
             size=12, bold=True, color=WHITE)
    add_text(s,
             "Ad Quality : +12%   |   Conversions : +6%   (Meta 公式測定 / 平均値)",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.55),
             size=15, bold=True, color=WHITE, font=EN_FONT)

    footer(s, prs)


def p65_capi(prs):
    s = blank(prs)
    page_frame(s, prs, "CAPI と CAPI Gateway",
               "Conversion API は Meta 計測の業界標準",
               pagenum(10))

    # CAPI overview
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "CAPI = Conversion API : ブラウザ依存の Meta Pixel をサーバーサイドで補強する仕組み。\n"
             "iOS/ATTシグナル減対策 + 計測精度復元の業界標準",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 implementation paths
    add_text(s, "3 つの実装パス",
             Inches(0.6), Inches(2.65), Inches(8), Inches(0.4),
             size=13, bold=True, color=NAVY)

    paths = [
        ("Direct Integration",
         "サーバーから直接APIを呼ぶ",
         "実装難度: 高\n柔軟性: 最大\nLP・CMS開発者必須"),
        ("CAPI Gateway",
         "AWS / Cloudflare 経由でホスティング",
         "実装難度: 中\nDevOps知識要\nメンテナンス少"),
        ("Partner Integration",
         "Shopify / WooCommerce / WordPress\n等のプラグイン",
         "実装難度: 低\n機能制限あり\n中小ECで人気"),
    ]
    top = Inches(3.15)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, detail) in enumerate(paths):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.6),
                 fill=NAVY if i == 0 else (ORANGE if i == 1 else NAVY_SOFT))
        add_text(s, name, x + Inches(0.25), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE, font=EN_FONT)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.75),
                 w - Inches(0.4), Inches(0.7),
                 size=11, bold=True, color=NAVY, line_spacing=1.4)
        add_text(s, detail, x + Inches(0.25), top + Inches(1.5),
                 w - Inches(0.4), Inches(0.95),
                 size=10, color=TEXT, line_spacing=1.55)

    # CAPI Gateway highlight
    add_rect(s, Inches(0.6), Inches(5.85), Inches(12.15), Inches(1.1),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のおすすめ",
             Inches(0.85), Inches(5.95), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 中小EC : Partner Integration (Shopify/WooCommerce プラグイン) で十分\n"
             "• 中規模以上 / カスタムLP : CAPI Gateway がコスパ最強。Cloudflare Workers で月100円〜",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.6),
             size=11, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p66_aem_skan(prs):
    s = blank(prs)
    page_frame(s, prs, "AEM (Aggregated Event Measurement) と SKAN",
               "iOS環境での計測フレームワーク", pagenum(11))

    # 2 frameworks
    frameworks = [
        ("AEM",
         "Aggregated Event Measurement (Meta独自)",
         "iOS 14.5以降のATTオプトアウトユーザーに対して\n"
         "差分プライバシー計測でCV情報を集約。\n\n"
         "8つの優先イベントを設定し、上位優先度のCVのみが計測される。\n"
         "EC: Purchase / Add To Cart / View Content の優先順位設計が肝"),
        ("SKAN",
         "SKAdNetwork (Apple公式)",
         "Apple が提供するiOSアプリ計測API。\n"
         "ポストバック (3つのウィンドウ : 0-2/3-7/8-35日) で\n"
         "アプリ内CVがプライバシー保護下で集約。\n\n"
         "App Campaign で必須。SKAN 4.0 (2023~) でクラッシュ・離脱予測"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(4.4)
    gap = Inches(0.15)
    for i, (acro, full, body) in enumerate(frameworks):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.95), fill=NAVY)
        add_text(s, acro, x + Inches(0.3), top + Inches(0.15),
                 w - Inches(0.6), Inches(0.5),
                 size=24, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, full, x + Inches(0.3), top + Inches(0.62),
                 w - Inches(0.6), Inches(0.3),
                 size=10, color=WHITE, font=EN_FONT)
        add_text(s, body, x + Inches(0.3), top + Inches(1.15),
                 w - Inches(0.6), h - Inches(1.3),
                 size=11, color=TEXT, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(6.05), Inches(12.15), Inches(0.9),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で覚えること",
             Inches(0.85), Inches(6.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Web案件: AEM の優先イベント (8つ) を業種別に最適化。Purchase 最優先が基本\n"
             "• アプリ案件: SKAN 4.0 のクラッシュ予測を活用、Conversion Value Schema を業種別に設計",
             Inches(0.85), Inches(6.5), Inches(12), Inches(0.4),
             size=10, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p67_audience_manager(prs):
    s = blank(prs)
    page_frame(s, prs, "Audience Manager : 3つの基本オーディエンス",
               "Custom / Lookalike / Saved の使い分け",
               pagenum(12))

    audiences = [
        ("Custom Audience",
         "1PD / 行動データから生成",
         [
             "Customer List (CRM)",
             "Website Visitors (Pixel)",
             "App Activity",
             "Engagement (Reels/Page/Video)",
             "Lead Form 提出済",
         ]),
        ("Lookalike Audience",
         "シード集合に類似したユーザー",
         [
             "1%-10% で類似度を制御",
             "Value-based LAL (LTV重み付け)",
             "Multi-country LAL (国跨ぎ)",
             "Customer Match base が最強",
             "ソースサイズ 1,000人〜",
         ]),
        ("Saved Audience",
         "属性 + 興味関心ベース",
         [
             "年齢・性別・地域・言語",
             "興味関心カテゴリ",
             "行動履歴 (購買/旅行)",
             "教育・職業 (※減少傾向)",
             "Advantage+ Audience が代替に",
         ]),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(4.8)
    gap = Inches(0.15)
    for i, (name, sub, items) in enumerate(audiences):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=15, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        for j, item in enumerate(items):
            y = top + Inches(1.1) + Inches(0.7) * j
            add_rect(s, x + Inches(0.25), y, w - Inches(0.5),
                     Inches(0.015), fill=LIGHT_GRAY)
            add_text(s, "▸", x + Inches(0.25), y + Inches(0.18),
                     Inches(0.3), Inches(0.3),
                     size=11, bold=True, color=ORANGE)
            add_text(s, item, x + Inches(0.55), y + Inches(0.2),
                     w - Inches(0.7), Inches(0.4),
                     size=11, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p68_placements(prs):
    s = blank(prs)
    page_frame(s, prs, "Reels / Stories / Feed — 配置面の現在",
             "縦型優位、Reels が最大の伸び", pagenum(13))

    placements = [
        ("Reels",
         "縦型 9:16 動画",
         "急成長中、最重要面",
         "Reels Ads / Music / Branded Content\n"
         "Advantage+ Creative の縦型最適化前提",
         ORANGE),
        ("Stories",
         "縦型 9:16 短尺",
         "Reels への流出傾向",
         "Stories Ads / Interactive Stickers\n"
         "ブランド認知 + 即時CTAに有効",
         NAVY),
        ("Feed",
         "正方形 1:1 / 4:5",
         "依然主力、CV系で強い",
         "Single Image / Carousel / Video\n"
         "Sales / Lead Gen の主戦場",
         NAVY_SOFT),
        ("Search Results",
         "検索結果面",
         "新興 (2024-)",
         "Instagram検索結果に広告枠\n"
         "意図顕在ユーザーへの接触",
         NAVY_SOFT),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(4.5)
    gap = Inches(0.1)
    for i, (name, fmt, status, body, color) in enumerate(placements):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=color)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=18, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER)
        add_text(s, fmt, x + Inches(0.2), top + Inches(0.58),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        # Status pill
        add_rect(s, x + Inches(0.5), top + Inches(1.05),
                 w - Inches(1.0), Inches(0.4),
                 fill=ACCENT_BG, radius=True)
        add_text(s, status, x + Inches(0.5), top + Inches(1.13),
                 w - Inches(1.0), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.25), top + Inches(1.65),
                 w - Inches(0.4), h - Inches(1.8),
                 size=10, color=TEXT, line_spacing=1.5)

    # Tip
    add_text(s,
             "💡 Advantage+ Placements を使えば AI が自動で配信面を最適化。手動指定は特殊用途のみ",
             Inches(0.6), Inches(6.7), Inches(12), Inches(0.3),
             size=10, bold=True, color=NAVY)

    footer(s, prs)


def p69_threads_ads(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Threads Ads — 2025/04 グローバル展開",
               "新しい配信面、当面は補助配信",
               pagenum(14))

    # Timeline
    add_text(s, "Threads Ads ローンチタイムライン",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    timeline_events = [
        ("2023/07/06", "Threads ローンチ (米国)",
         "Instagram連携でユーザー獲得"),
        ("2025/01", "Ads テスト開始",
         "米国・日本の選定ブランドのみ"),
        ("2025/04/23", "🔥 グローバル展開",
         "全世界の eligible 広告主に開放"),
        ("2026", "段階的拡大",
         "対応国・配信オプション拡張中"),
    ]
    top = Inches(2.05)
    for i, (date, name, desc) in enumerate(timeline_events):
        y = top + Inches(0.7) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.6),
                 fill=ACCENT_BG if "🔥" in name else (LIGHT if i % 2 == 0 else WHITE),
                 line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(1.8), Inches(0.6),
                 fill=ORANGE if "🔥" in name else NAVY)
        add_text(s, date, Inches(0.6), y + Inches(0.18),
                 Inches(1.8), Inches(0.3),
                 size=11, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, Inches(2.5), y + Inches(0.1),
                 Inches(5.5), Inches(0.3),
                 size=12, bold=True, color=NAVY)
        add_text(s, desc, Inches(2.5), y + Inches(0.35),
                 Inches(10), Inches(0.3),
                 size=10, color=TEXT)

    # Note for ad ops
    add_rect(s, Inches(0.6), Inches(5.05), Inches(12.15), Inches(1.9),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で押さえるポイント",
             Inches(0.85), Inches(5.2), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• Meta CFO 公式 : 『2025年中の収益貢献は限定的』 — 主力は Reels / Feed のまま\n"
             "• Threads は『オーディエンス層が異なる』 — テキスト中心、知的好奇心強めの層が多い\n"
             "• Sales キャンペーンに自動的に追加配信される (Advantage+ Placements ON時)\n"
             "• 単独最適化したい場合: 手動 Placement で Threads のみ選択 + 専用クリエイティブ\n"
             "• 当面は『追加配信面 + データ蓄積期間』として位置づけ、本格運用は2026後半以降の判断",
             Inches(0.85), Inches(5.55), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)

    footer(s, prs)


def p70_click_to_message(prs):
    s = blank(prs)
    page_frame(s, prs, "Click-to-Message / Click-to-WhatsApp",
               "チャット起点の獲得、日本ではLINE文化と差", pagenum(15))

    products = [
        ("Click-to-Messenger",
         "Facebook Messenger 起動",
         "B2C 問い合わせ・予約\n"
         "ボット連携で 24/7 対応"),
        ("Click-to-WhatsApp",
         "WhatsApp チャット起動",
         "海外 EC / B2B 主流\n"
         "日本では限定的、越境ECで活用"),
        ("Click-to-Instagram DM",
         "Instagram DM 起動",
         "DXロでの問い合わせ\n"
         "若年層 D2C で増加"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(products):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.3),
                 w - Inches(0.4), Inches(0.6),
                 size=14, bold=True, color=NAVY, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.95),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), top + Inches(1.35),
                 w - Inches(0.4), Inches(1.05),
                 size=11, color=TEXT, line_spacing=1.5)

    # Use cases
    add_text(s, "業種別ユースケース",
             Inches(0.6), Inches(4.3), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)

    cases = [
        ("BtoC EC",
         "Click-to-IG DM が新規。LINE併用で日本適応"),
        ("不動産 / 金融",
         "Click-to-Messenger でリード獲得 + AIチャットボット連携"),
        ("飲食 / 美容",
         "DM予約フロー。クーポン配布 → 予約完了で計測"),
        ("B2B SaaS",
         "Click-to-WhatsApp は海外、日本はLINE併用が現実解"),
    ]
    for i, (cat, desc) in enumerate(cases):
        y = Inches(4.9) + Inches(0.45) * i
        add_text(s, cat, Inches(0.7), y, Inches(3.5), Inches(0.35),
                 size=11, bold=True, color=NAVY)
        add_text(s, desc, Inches(4.3), y + Inches(0.02),
                 Inches(8.3), Inches(0.4),
                 size=11, color=TEXT, line_spacing=1.4)

    footer(s, prs)


def p71_conversion_lift(prs):
    s = blank(prs)
    page_frame(s, prs, "Conversion Lift Test ─ Incrementality",
             "『広告がなければ起きなかった CV』を測る",
             pagenum(16))

    # Definition
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "ユーザーをランダムに Test (広告配信) と Control (配信なし) に分け、CV発生率の差を計測。\n"
             "ラストクリック計測の限界 (Display経由のCVが過小評価) を補正する手法",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 setup steps
    add_text(s, "実施手順 (3ステップ)",
             Inches(0.6), Inches(2.65), Inches(8), Inches(0.4),
             size=13, bold=True, color=NAVY)

    steps = [
        ("STEP 1",
         "Test/Control 分割",
         "Meta が自動で\nランダム化\n通常は90/10"),
        ("STEP 2",
         "配信期間設定",
         "最低2週間、\n推奨4-6週間\nCV数100件以上目標"),
        ("STEP 3",
         "Lift分析",
         "Test群とControl群の\nCV発生率を比較\n統計的有意性を確認"),
    ]
    top = Inches(3.15)
    w = Inches(3.95)
    h = Inches(2.0)
    gap = Inches(0.15)
    for i, (no, title, body) in enumerate(steps):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, no, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, title, x + Inches(0.25), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.25), top + Inches(1.2),
                 w - Inches(0.4), Inches(0.75),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Key insight
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行での価値",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 中規模以上クライアント (月100万円以上の予算) では Lift Test の月次実施が標準\n"
             "• クライアントへの提案資料に『Incremental ROAS = X%』を載せると差別化\n"
             "• Meta内の Conversion Lift は無料、Robyn等での MMM と組合せて運用全体の最適化",
             Inches(0.85), Inches(5.95), Inches(12), Inches(0.95),
             size=11, color=TEXT, line_spacing=1.55)

    footer(s, prs)


def p72_brand_lift(prs):
    s = blank(prs)
    page_frame(s, prs, "Brand Lift Studies",
               "認知・好意・購入意向の変化を計測",
               pagenum(17))

    # What it measures
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=LIGHT, radius=True)
    add_text(s,
             "Test/Control 群にアンケート (Meta内ポーリング) を配信、ブランド指標の差を計測。\n"
             "ブランド認知系キャンペーンの真の効果測定 — CTR/CV だけでは見えない領域",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=TEXT, line_spacing=1.5)

    # 4 metrics measured
    add_text(s, "計測される 4 つのブランド指標",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    metrics = [
        ("Ad Recall", "広告想起",
         "『最近この広告を\n見ましたか？』"),
        ("Brand Awareness", "ブランド認知",
         "『〇〇というブランドを\n知っていますか？』"),
        ("Message Association", "メッセージ連想",
         "『〇〇は××の特徴を\n持っていますか？』"),
        ("Purchase Intent", "購入意向",
         "『次回購入時、〇〇を\n選びますか？』"),
    ]
    top = Inches(3.15)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (en, jp, q) in enumerate(metrics):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.15), fill=ORANGE)
        add_text(s, en, x + Inches(0.2), top + Inches(0.3),
                 w - Inches(0.4), Inches(0.5),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, jp, x + Inches(0.2), top + Inches(0.85),
                 w - Inches(0.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER)
        add_text(s, q, x + Inches(0.2), top + Inches(1.3),
                 w - Inches(0.4), Inches(1.1),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(5.85), Inches(12.15), Inches(1.1),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行での実用性",
             Inches(0.85), Inches(5.95), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月額 100万円以上の Awareness / Reach キャンペーンで活用が現実的\n"
             "• 中小予算の場合: GA4 の指名検索数や直接流入の動きを代替指標に",
             Inches(0.85), Inches(6.3), Inches(12), Inches(0.6),
             size=11, color=WHITE, line_spacing=1.5)

    footer(s, prs)


def p73_meta_verified(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta Verified for Business",
             "事業者向けの本人確認 + 認証マーク (2024~)",
             pagenum(18))

    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Facebook Page / Instagram Business Account に対する公式認証バッジ。\n"
             "本人確認書類提出 + 月額サブスク (USD 14.99/月、ビジネスは USD 21.99/月程度) ※要確認",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 benefits
    add_text(s, "Verified の主なメリット",
             Inches(0.6), Inches(2.65), Inches(8), Inches(0.4),
             size=13, bold=True, color=NAVY)

    benefits = [
        ("公式バッジ表示",
         "✓マーク表示で信頼性アップ",
         "なりすまし対策、ブランド保護"),
        ("優先サポート",
         "サポート問い合わせの優先窓口",
         "アカウント停止対応も早い"),
        ("リーチ強化",
         "公式アカウント露出増加",
         "オーガニック投稿の到達増 ※要確認"),
        ("AI機能優先アクセス",
         "新機能の早期試用",
         "Verified 限定の Beta機能"),
    ]
    top = Inches(3.15)
    w = Inches(5.95)
    h = Inches(1.65)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (head, sub, body) in enumerate(benefits):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, head, x + Inches(0.25), y + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, sub, x + Inches(0.25), y + Inches(0.6),
                 w - Inches(0.4), Inches(0.4),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), y + Inches(1.05),
                 w - Inches(0.4), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.4)

    # Note
    add_text(s,
             "💡 副業代行 : クライアントへの『信頼度上げる』提案として基本パッケージに組み込み可",
             Inches(0.6), Inches(6.65), Inches(12), Inches(0.3),
             size=11, bold=True, color=NAVY)

    footer(s, prs)


def p74_brand_safety(prs):
    s = blank(prs)
    page_frame(s, prs, "Brand Safety / Inventory Filter",
             "配信面の安全性をコントロールする",
             pagenum(19))

    # 3 levels
    levels = [
        ("Expanded Inventory",
         "最大配信",
         "成熟度問わず全コンテンツ\n(暴力・成人向けは除く)",
         "リーチ最大化、CPM最安",
         WARN),
        ("Moderate Inventory",
         "標準 (デフォルト)",
         "敏感な内容を一部除外\n業界標準のフィルタ",
         "バランス型、汎用的",
         NAVY),
        ("Limited Inventory",
         "厳しい",
         "敏感な内容を厳格に除外\n金融・医療・教育向け",
         "高単価ブランド、規制厳しい業界",
         ORANGE),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.7)
    gap = Inches(0.15)
    for i, (name, label, body, fit, color) in enumerate(levels):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=color)
        add_text(s, name, x + Inches(0.25), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE)
        add_text(s, label, x + Inches(0.25), top + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.4),
                 size=11, color=TEXT, line_spacing=1.55)
        add_rect(s, x + Inches(0.25), top + Inches(2.5),
                 w - Inches(0.5), Inches(0.015), fill=LIGHT_GRAY)
        add_text(s, "適合する用途",
                 x + Inches(0.25), top + Inches(2.7),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, fit, x + Inches(0.25), top + Inches(3.0),
                 w - Inches(0.4), Inches(0.6),
                 size=10, color=TEXT, line_spacing=1.4)

    # Note
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行での選び方",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• EC / D2C : Moderate (デフォルト) で問題なし\n"
             "• 金融 / 医療 / 教育 / 子ども関連 : Limited を選択 (CPM上昇するが安全)\n"
             "• ニュース系 / 大型ブランド : Limited が無難 (炎上リスク回避)\n"
             "• Block List / Allow List : URL単位の細かい制御も可、必要時のみ追加",
             Inches(0.85), Inches(5.95), Inches(12), Inches(1.0),
             size=11, color=TEXT, line_spacing=1.5)

    footer(s, prs)


def p75_pixel_capi_hybrid(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta Pixel + CAPI のハイブリッド構成",
             "Web計測の現代的ベストプラクティス", pagenum(20))

    # Architecture
    add_text(s, "標準アーキテクチャ (2026)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    # Pixel side (left)
    add_rect(s, Inches(0.6), Inches(2.05), Inches(5.95), Inches(2.4),
             fill=NAVY, radius=True)
    add_text(s, "BROWSER SIDE",
             Inches(0.85), Inches(2.2), Inches(5.5), Inches(0.3),
             size=11, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, "Meta Pixel",
             Inches(0.85), Inches(2.5), Inches(5.5), Inches(0.4),
             size=18, bold=True, color=WHITE, font=EN_FONT)
    add_text(s,
             "JavaScript で発火\nブラウザイベントを送信\n(PageView, AddToCart, Purchase等)",
             Inches(0.85), Inches(3.0), Inches(5.5), Inches(1.3),
             size=11, color=WHITE, line_spacing=1.5)

    # Plus
    add_text(s, "+", Inches(6.4), Inches(2.95),
             Inches(0.5), Inches(0.6),
             size=36, bold=True, color=ORANGE,
             align=PP_ALIGN.CENTER, font=EN_FONT)

    # CAPI side (right)
    add_rect(s, Inches(6.8), Inches(2.05), Inches(5.95), Inches(2.4),
             fill=ORANGE, radius=True)
    add_text(s, "SERVER SIDE",
             Inches(7.05), Inches(2.2), Inches(5.5), Inches(0.3),
             size=11, bold=True, color=NAVY, font=EN_FONT)
    add_text(s, "Conversion API (CAPI)",
             Inches(7.05), Inches(2.5), Inches(5.5), Inches(0.4),
             size=18, bold=True, color=WHITE, font=EN_FONT)
    add_text(s,
             "サーバーから直接送信\nブラウザブロックの影響を受けない\n計測精度が大幅向上",
             Inches(7.05), Inches(3.0), Inches(5.5), Inches(1.3),
             size=11, color=WHITE, line_spacing=1.5)

    # Deduplication
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(1.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "📌 重複排除 (Deduplication)",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "Pixel + CAPI 両方で同じイベントを送るため、event_id を一致させる必要あり\n"
             "GTM テンプレートや CAPI Gateway は標準で event_id を生成 → Meta側で自動重複排除",
             Inches(0.85), Inches(5.18), Inches(12), Inches(0.55),
             size=11, color=TEXT, line_spacing=1.45)

    # Implementation tip
    add_rect(s, Inches(0.6), Inches(5.95), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行の進め方",
             Inches(0.85), Inches(6.05), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "1. Pixel が正しく動作しているか Tag Assistant で確認\n"
             "2. CAPI を Partner Integration / Gateway で追加\n"
             "3. Event Match Quality (EMQ) スコアを Events Manager で確認 (8/10以上目標)",
             Inches(0.85), Inches(6.4), Inches(12), Inches(0.55),
             size=11, color=WHITE, line_spacing=1.55)

    footer(s, prs)


def p76_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta : 鉄板運用メソッド 2026年版",
             "新規Meta案件で最初の30日にやること", pagenum(21))

    steps = [
        ("Day 0-2 : 計測基盤の整備",
         [
             "Pixel 動作確認 (Tag Assistant)",
             "CAPI 実装 (Partner / Gateway / Direct)",
             "Event Match Quality 8/10 以上",
             "AEM の優先イベント設定",
         ]),
        ("Day 3-7 : キャンペーン構造の設計",
         [
             "Sales目的 + Advantage+ Sales (旧ASC)",
             "Custom Audience アップロード (CRM)",
             "Lookalike 1-3% を新規獲得用に",
             "Creative 5-10種を Asset Group に",
         ]),
        ("Day 8-21 : 学習期間",
         [
             "予算 ±20% 以内で安定運用",
             "Advantage+ Creative ON (Touch-ups, Cropping)",
             "アセット追加は週1回程度に抑える",
             "Andromeda 適用は段階的、効果確認",
         ]),
        ("Day 22-30 : 最適化+レポート",
         [
             "Conversion Lift Test の設計検討",
             "アセット Best/Low の入替",
             "EMQ / Pixel/CAPI 重複率の監査",
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


def p77_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta : よくある失敗と回避策",
             "副業代行で『Meta あるある』を防ぐ", pagenum(22))

    pitfalls = [
        ("広告セットを細かく分けすぎる",
         "Andromeda 学習が分散 → CPA高騰",
         "Sales目的なら 2-3 ad set + Advantage+ で十分"),
        ("Pixel のみで CAPI 未実装",
         "iOS計測ロス + Andromeda の精度低下",
         "初回ヒアリングで CAPI 状況確認、未実装なら Gateway 提案"),
        ("Custom Audience サイズ不足",
         "Lookalike が機能しない、配信開始もできない",
         "最低 1,000人 (推奨 10,000人) のソースを準備"),
        ("Advantage+ Creative を全機能ON",
         "ブランド毀損リスク (色変更/テキスト変換)",
         "Touch-ups + Cropping は基本ON、それ以外は業種で判断"),
        ("Lift Test 抜きでROAS報告",
         "ラストクリック過大評価 → クライアント期待ズレ",
         "中規模以上は Conversion Lift で Incremental ROAS を提示"),
        ("AEM の優先順位設定が雑",
         "重要なCVが計測されない (8つ枠の使い方)",
         "Purchase 最優先、業種別に上位 4-5 を設計"),
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
    p56_divider(prs)
    p57_tldr(prs)
    p58_objectives_landscape(prs)
    p59_advantage_sales(prs)
    p60_advantage_others(prs)
    p61_advantage_creative(prs)
    p62_andromeda(prs)
    p63_gem(prs)
    p64_lattice(prs)
    p65_capi(prs)
    p66_aem_skan(prs)
    p67_audience_manager(prs)
    p68_placements(prs)
    p69_threads_ads(prs)
    p70_click_to_message(prs)
    p71_conversion_lift(prs)
    p72_brand_lift(prs)
    p73_meta_verified(prs)
    p74_brand_safety(prs)
    p75_pixel_capi_hybrid(prs)
    p76_playbook(prs)
    p77_pitfalls(prs)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
