#!/usr/bin/env python3
"""Build Part 5-B AI 運用・予測・Agent (20p, P186-P205)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part5b.pptx"
PNUM_BASE = 185


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p186_divider(prs):
    s = blank(prs)
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, Inches(0.8), Inches(1.0), Inches(0.15), Inches(5.4), fill=ORANGE)
    add_text(s, "PART 5 / AI活用事例集 — 後半",
             Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
             size=12, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s, "運用自動化 + 予測 + Agent型",
             Inches(1.2), Inches(1.4), Inches(8), Inches(0.4),
             size=14, bold=True, color=LIGHT_GRAY)
    add_text(s, "AI で運用を加速する", Inches(1.2), Inches(1.85),
             Inches(11), Inches(1.3),
             size=46, bold=True, color=WHITE, line_spacing=1.1)
    add_text(s, "Smart Bidding 進化 + Andromeda + Smart+ + Agent型 + プロンプトテンプレ集",
             Inches(1.2), Inches(3.3), Inches(11), Inches(0.4),
             size=15, color=LIGHT_GRAY)
    add_rect(s, Inches(10.8), Inches(1.0), Inches(2.0), Inches(0.7),
             fill=ORANGE, radius=True)
    add_text(s, "20p", Inches(10.8), Inches(1.18),
             Inches(2.0), Inches(0.5),
             size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
             font=EN_FONT)
    add_rect(s, Inches(1.2), Inches(4.0), Inches(10), Inches(0.015),
             fill=ORANGE)
    add_text(s,
             "媒体内AI運用 (Smart Bidding / Advantage+ / Smart+) を理解し、外部運用ツールで補強。\n"
             "予測モデル (LTV / Audience) で意思決定を前倒し、Agent型広告運用で運用工数を圧縮。\n"
             "プロンプトテンプレで日次の業務を仕組み化",
             Inches(1.2), Inches(4.2), Inches(11), Inches(1.2),
             size=13, color=LIGHT_GRAY, line_spacing=1.5)
    add_text(s, "▸ 章内の主要トピック",
             Inches(1.2), Inches(5.6), Inches(8), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    topics = [
        "AI 運用 TL;DR",
        "Smart Bidding 進化",
        "Andromeda + Lattice",
        "Smart+ + Symphony",
        "外部運用ツール",
        "予測LTV / Audiences",
        "クリエイティブ予測",
        "AI Analytics 統合",
        "🔥 Agent型運用 概念",
        "Claude Computer Use",
        "OpenAI Operator",
        "Copilot / Gemini",
        "プロンプトテンプレ ×3",
        "AI 1日ワークフロー",
        "Part 5 まとめ",
    ]
    for i, t in enumerate(topics):
        c = i // 5
        r = i % 5
        x = Inches(1.2) + Inches(3.8) * c
        y = Inches(5.95) + Inches(0.3) * r
        add_text(s, f"• {t}", x, y, Inches(3.7), Inches(0.3),
                 size=10, color=WHITE)


def p187_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "AI 運用 5つのインパクト (TL;DR)",
               "現場の運用業務がどう変わったか", pagenum(2))
    points = [
        ("01", "媒体内AI (PMax/Advantage+/Smart+) が運用主役に",
         "アカウント構造設計 → AIに任せる → 検証 のサイクル。\n"
         "手動入札・キーワード細分化の時代は終わり、運用者の仕事は『AIを導く』へ"),
        ("02", "外部運用ツールが省人化を加速",
         "Skai / Marin / Optmyzr で複数媒体を一元管理。\n"
         "Negative Keyword 提案 / 予算最適化 / 入札戦略提案を AI が自動化"),
        ("03", "予測モデル (LTV / Predictive Audiences) で前倒し意思決定",
         "GA4 Predictive Audiences / Customer Match の LTV重み付けで\n"
         "『高LTV見込み』を予測 → 配信前から優先ターゲット指定"),
        ("04", "🔥 Agent型広告運用が登場 (2025-2026)",
         "Claude Computer Use / OpenAI Operator / Copilot が\n"
         "管理画面を直接操作 → ヒューマン承認のチェックポイントだけ残す"),
        ("05", "副業運用代行は『プロンプト+判断』に集約",
         "実装はAIに任せ、戦略・判断・クライアント説明 が人間の主戦場。\n"
         "1人で月10-20クライアント対応も現実的に"),
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


def p188_smart_bidding(prs):
    s = blank(prs)
    page_frame(s, prs, "Smart Bidding (Google) の進化",
               "tCPA/tROAS から Value-based + AI Max まで",
               pagenum(3))
    strategies = [
        ("Maximize Conversions",
         "CV件数最大化",
         "予算内でCV数最大\n初期学習に向く"),
        ("Target CPA",
         "目標CPA固定",
         "CPA基準で安定運用\n中堅キャンペーン主流"),
        ("Maximize Conv. Value",
         "CV値最大化",
         "売上 / LTV 重視\nVBB前提"),
        ("Target ROAS",
         "目標ROAS固定",
         "EC / 高単価商材\nVBB必須"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.3)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(strategies):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.15), top + Inches(0.18),
                 w - Inches(0.3), Inches(0.4),
                 size=13, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.15), top + Inches(0.6),
                 w - Inches(0.3), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.05),
                 w - Inches(0.3), Inches(1.15),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(4.05), Inches(12.15), Inches(2.9),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行の入札戦略選定フロー",
             Inches(0.85), Inches(4.2), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. 学習開始 = Maximize Conversions (1-2週間でCV30件以上目標)\n"
             "2. CPA安定後 = Target CPA に切替 (設定CPAは現状CPAの ±20%以内)\n"
             "3. 売上重視のEC = Maximize Conv. Value → Target ROAS\n"
             "4. AI Max for Search 併用 = Target ROAS + AI Max が最強構成 (2025/05~)\n"
             "5. 予算変動は 学習リセット要因 → 月内変動 ±20%以内に\n"
             "6. Bid Strategy は手動より AI に任せる前提 — 手動入札は特殊用途のみ",
             Inches(0.85), Inches(4.55), Inches(12), Inches(2.3),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p189_meta_andromeda_ops(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta Andromeda + Advantage+ (運用視点)",
               "配信MLが桁違いに賢くなった2024-2026",
               pagenum(4))
    # Recap stats
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Andromeda (2024末) : Ads Retrieval モデル複雑度 10,000x、Quality +8%。\n"
             "Lattice + Andromeda 統合で Advantage+ の効果が増幅された",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 operational implications
    add_text(s, "運用視点での影響",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    impacts = [
        ("細分化 → 統合へ",
         "広告セット細分化はNG\n2-3 ad set + Advantage+\n学習データ集約が効く"),
        ("クリエイティブ多様性が鍵",
         "AI が組合せ最適化\n素材数 = 学習材料\nMidjourney等で量産"),
        ("人間の介在減",
         "ターゲ・配信面・入札全自動\n人間は『目標設定+検証』\n運用工数50%以上削減"),
    ]
    top = Inches(3.1)
    w = Inches(3.95)
    h = Inches(2.0)
    gap = Inches(0.15)
    for i, (cat, body) in enumerate(impacts):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), top + Inches(0.75),
                 w - Inches(0.4), Inches(1.15),
                 size=11, color=TEXT, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(5.3), Inches(12.15), Inches(1.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行 : Andromeda時代のキャンペーン構造",
             Inches(0.85), Inches(5.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 1キャンペーン × 2-3 ad set + Advantage+ Sales (旧ASC) が基本構成\n"
             "• クリエイティブ : 訴求軸ごとに5-10案、合計20-30本/月の素材を投入\n"
             "• Audience Signal : Customer Match (CRM) を必ず投入、AI学習加速の核\n"
             "• 検証 : Conversion Lift Test を月次実施 (Incremental ROAS で説明)",
             Inches(0.85), Inches(5.8), Inches(12), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p190_smart_plus_symphony(prs):
    s = blank(prs)
    page_frame(s, prs, "TikTok Smart+ + Symphony (運用視点)",
               "完全自動化キャンペーン + AI生成", pagenum(5))
    # 2 key facts
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Smart+ (2024/10) : 4タイプ (Web/Catalog/App/Lead) で完全自動化。\n"
             "Symphony Creative Studio で AI クリエイティブ生成も TikTok 内で完結",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 ops implications
    add_text(s, "運用視点での影響",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    impacts = [
        ("AI で配信完全自動化",
         "Targeting / Creative / Bid を\nSmart+ がフル自動。\n運用工数大幅削減"),
        ("Symphony で素材も自動生成",
         "Image to Video / Avatars /\nAI Dubbing で動画量産。\n外部ツール代替可能"),
        ("Spark Ads + UGC 統合",
         "Creator投稿を Smart+ に投入。\nUGC感のある広告が標準。\n中小ブランドでも実現可"),
    ]
    top = Inches(3.1)
    w = Inches(3.95)
    h = Inches(2.0)
    gap = Inches(0.15)
    for i, (cat, body) in enumerate(impacts):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 line_spacing=1.2)
        add_text(s, body, x + Inches(0.25), top + Inches(0.75),
                 w - Inches(0.4), Inches(1.15),
                 size=11, color=TEXT, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(5.3), Inches(12.15), Inches(1.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行 : Smart+ 時代の TikTok 構成",
             Inches(0.85), Inches(5.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Smart+ Web (CV) + Spark Ads (Creator) のミックス\n"
             "• 素材 : Symphony Creative Studio で月20-30本量産 (撮影最小限)\n"
             "• 計測 : Pixel + Events API ハイブリッド (EMQ 8/10以上)\n"
             "• 検証 : Brand Lift / Conversion Lift で Incremental効果を測定",
             Inches(0.85), Inches(5.8), Inches(12), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p191_external_tools(prs):
    s = blank(prs)
    page_frame(s, prs, "外部運用ツール : Skai / Marin / Optmyzr",
               "複数媒体一元管理 + AI最適化提案",
               pagenum(6))
    tools = [
        ("Skai (旧Kenshoo)",
         "Enterprise / 大型代理店",
         "全媒体一元管理\n"
         "AI最適化提案\n"
         "Walmart Connect等\nリテールメディア対応"),
        ("Marin Software",
         "中堅〜大手",
         "Search特化が強み\n"
         "Bidding/Budget最適化\n"
         "API連携豊富"),
        ("Optmyzr",
         "中小〜中堅 / $208/月〜",
         "Google/Meta/Microsoft\n"
         "PMax深いインサイト\n"
         "Workout (タスク自動化)"),
        ("Adalysis",
         "中小 / $99/月〜",
         "Google Ads特化\n"
         "Negative KW提案強い\n"
         "副業代行スイートスポット"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (name, fit, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, fit, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.65)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で外部ツールを使う判断",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月10案件以下 = 媒体管理画面で十分 (外部ツール不要)\n"
             "• 月10案件以上 + Google中心 = Adalysis $99/月で工数削減開始\n"
             "• 月20案件以上 + 複数媒体 = Optmyzr $208/月でPMax+メタ統合管理\n"
             "• 月50案件以上の代理店 = Skai / Marin (エンタープライズ)\n"
             "• ROI試算 : 月5-10時間の工数削減なら月$100程度のツールは即ペイ",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p192_predictive_ltv(prs):
    s = blank(prs)
    page_frame(s, prs, "予測 LTV / Predictive Audiences",
               "高LTV顧客を『配信前』に特定する",
               pagenum(7))
    # 2 approaches
    approaches = [
        ("GA4 Predictive Audiences",
         "Google公式 / 無料",
         "Likely 7-day Purchasers\nLikely 7-day Churners\n"
         "Predicted Revenue\nTop Spenders\n"
         "Google Adsへimport可能"),
        ("Meta Lookalike (Value-based)",
         "Meta公式",
         "Customer Match を\nLTV重み付けでアップロード。\n"
         "高LTV顧客に類似した\n新規ユーザーを優先配信"),
        ("カスタムMLモデル",
         "BigQuery ML / Vertex AI",
         "1PD + GA4 + 売上データで\n独自LTV予測モデル構築。\n"
         "副業代行 : 月予算500万以上で検討"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(approaches):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else (ORANGE if i == 1 else NAVY_SOFT))
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE if i == 1 else ORANGE,
                 line_spacing=1.2)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.65)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で予測モデルを活用するシナリオ",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 全クライアント : GA4 Predictive Audiences は無料で即利用可、Google Ads import\n"
             "• EC / D2C : Meta Lookalike (Value-based) で高LTV類似に偏重配信\n"
             "• 月予算300万以上 : Customer Match に LTV重みを付けて Lookalike実装\n"
             "• 月予算1,000万以上 : BigQuery ML でカスタムLTVモデル構築",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p193_creative_prediction(prs):
    s = blank(prs)
    page_frame(s, prs, "クリエイティブ予測 (Creative Intelligence)",
               "配信前にクリエイティブの効果を予測",
               pagenum(8))
    tools = [
        ("Vidmob",
         "Meta公式パートナー",
         "動画クリエイティブ\nスコアリング + 改善提案\nMeta Advantage+ Creative補強"),
        ("Anyword",
         "コピー予測",
         "広告コピーに予測スコア\n配信前にABテスト代替\n副業代行で活用増"),
        ("Vidlytic",
         "TikTok向け",
         "TikTok動画スコアリング\nTrend連動分析\n中堅〜大手向け"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.65)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=NAVY, radius=True)
    add_text(s, "💡 クリエイティブ予測の使いどころ",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 中小予算 = 不要、媒体ML (Smart+/Advantage+) で十分\n"
             "• 月予算500万以上 + 動画中心 = Vidmob で動画スコアリング\n"
             "• コピー量産時 = Anyword でA/Bテスト代替\n"
             "• ただし配信前予測 + 配信後実績 のフィードバックループが重要 (予測≠実績)",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p194_ai_analytics_recap(prs):
    s = blank(prs)
    page_frame(s, prs, "AI Analytics 統合 (Part 4 リキャップ)",
               "GA4 / Looker / Adobe Sensei",
               pagenum(9))
    tools = [
        ("GA4 Insights",
         "自動異常検知",
         "MLが日次データ異常を検知\n『なぜ』を自然言語で解説"),
        ("Looker Studio AI",
         "Gemini連携",
         "クエリ自動生成\nダッシュボード自動作成"),
        ("Conversational Analytics",
         "自然言語分析",
         "『今月の売上は?』等\n質問→自動回答"),
        ("Adobe Sensei",
         "Marketo統合",
         "顧客ジャーニー予測\nエンタープライズ向け"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=13, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.25), Inches(12.15), Inches(2.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行 : AI Analytics の統合ワークフロー",
             Inches(0.85), Inches(4.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. 月次レポート = Conversational Analytics で要約 → Looker Studio で可視化\n"
             "2. 異常検知 = GA4 Insights を月次レポートに添付 → 自然言語の解釈付き\n"
             "3. クライアント窓口 = Looker Studio を共有 → クライアントが自分で深掘り\n"
             "4. レポート作成時間 = 従来5時間 → 1時間 (8割削減事例)\n"
             "5. AI Analytics 駆使する人 = 1人で月10-20クライアントの月次レポート対応可\n"
             "6. クライアント側の質問対応 = ダッシュボードに任せる → 人間は戦略提案のみ",
             Inches(0.85), Inches(4.75), Inches(12), Inches(2.15),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p195_agent_concept(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 Agent型広告運用 (2025-2026)",
               "AIが広告管理画面を直接操作する時代",
               pagenum(10))
    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "📢", Inches(0.85), Inches(1.75),
             Inches(0.8), Inches(0.8), size=30)
    add_text(s, "新パラダイム : AI が管理画面を見て・クリックして・タスク完遂",
             Inches(1.7), Inches(1.7), Inches(11), Inches(0.4),
             size=14, bold=True, color=ORANGE)
    add_text(s,
             "Claude Computer Use / OpenAI Operator / Microsoft Copilot for Ads / Gemini Workspace。\n"
             "従来の API連携・自動化スクリプトを超え、人間と同じUI操作が可能に",
             Inches(1.7), Inches(2.05), Inches(11), Inches(0.7),
             size=11, color=WHITE, line_spacing=1.5)

    # 3 layers
    add_text(s, "Agent型運用の3レイヤー",
             Inches(0.6), Inches(2.95), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    layers = [
        ("L1 : 観察",
         "管理画面のスクショ取得\nレポートの自動分析"),
        ("L2 : 提案",
         "改善案を自然言語で生成\n人間が判断"),
        ("L3 : 実行",
         "実際にクリック・入力で\n変更を実装 (要承認)"),
    ]
    top = Inches(3.4)
    w = Inches(3.95)
    h = Inches(1.85)
    gap = Inches(0.15)
    for i, (cat, body) in enumerate(layers):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.1),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で Agent型を活用する段階",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 2026年 = L1 (観察) + L2 (提案) は実用段階。L3 (実行) は人間承認必須\n"
             "• 月次レポート作成・ベンチマーク分析・Negative KW提案 等は AI Agent が完遂可\n"
             "• 配信変更 (予算・入札・配信停止等) は人間がボタン押す運用が当面標準",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p196_claude_computer_use(prs):
    s = blank(prs)
    page_frame(s, prs, "Agent : Claude Computer Use (Anthropic)",
               "デスクトップ・ブラウザ操作を自然言語で",
               pagenum(11))
    # Capabilities
    add_text(s, "Claude Computer Use の機能",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    capabilities = [
        ("スクリーンショット取得",
         "現在の画面状態を理解",
         "管理画面・レポートの\n読み取り・解釈"),
        ("マウス/キーボード操作",
         "クリック・入力・スクロール",
         "Google Ads / Meta Ads等の\n設定変更を実行"),
        ("マルチステップタスク",
         "複数ステップを順次実行",
         "『PMaxの予算を10%削減』\n『新しいネガKW追加』等"),
        ("CSV/データ操作",
         "ファイル読み書き対応",
         "レポートCSVを Claude に渡し\n分析→次のアクション"),
    ]
    top = Inches(2.0)
    w = Inches(5.95)
    h = Inches(1.55)
    gap_x = Inches(0.2)
    gap_y = Inches(0.15)
    for i, (cat, sub, body) in enumerate(capabilities):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, cat, x + Inches(0.25), y + Inches(0.15),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, sub, x + Inches(0.25), y + Inches(0.55),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), y + Inches(0.9),
                 w - Inches(0.4), Inches(0.6),
                 size=10, color=TEXT, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行のシナリオ",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月次レポート作成 = Claude に管理画面を見せ、レポート要約を生成\n"
             "• Negative KW提案 = Search Terms Reportを渡して『無駄クエリ』抽出\n"
             "• Optiscore 提案レビュー = 提案内容を Claude に評価させる\n"
             "• ⚠ 配信変更系は人間承認チェックポイント必須、自動実行は危険",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p197_openai_operator(prs):
    s = blank(prs)
    page_frame(s, prs, "Agent : OpenAI Operator",
               "Web ブラウザを操作する ChatGPT エージェント",
               pagenum(12))
    # Overview
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "OpenAI Operator (2025/01 リリース) : ChatGPT Pro 加入者向け、\n"
             "ブラウザを操作して Web タスクを自律的に完遂する Agent",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Use cases for ad ops
    add_text(s, "広告運用代行のユースケース",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    cases = [
        ("レポート自動取得",
         "Google Ads / Meta Ads等から\n月次レポートをCSV取得"),
        ("競合リサーチ",
         "競合LP / 広告ライブラリの\n自動巡回・スクショ"),
        ("クリエイティブベンチマーク",
         "TikTok Creative Center 等から\nTop Ads 自動収集"),
        ("簡易設定変更",
         "予算停止・キャンペーンON/OFF\n等の単純操作 (要承認)"),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(2.0)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(cases):
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
    add_text(s, "💡 OpenAI Operator vs Claude Computer Use",
             Inches(0.85), Inches(5.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Operator : Web タスク特化、UIシンプル、ChatGPT Pro $200/月で利用\n"
             "• Claude Computer Use : ローカル + Webの両方、API/SDK経由が中心\n"
             "• 副業代行 : Operator は ChatGPT既契約者の追加機能として最初の選択肢\n"
             "• 高度な自動化はクライアント案件ごとに API/SDK で構築検討",
             Inches(0.85), Inches(5.8), Inches(12), Inches(1.1),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p198_copilot_gemini(prs):
    s = blank(prs)
    page_frame(s, prs, "Agent : Microsoft Copilot / Gemini Workspace",
               "Office / Workspace 内の AI Agent",
               pagenum(13))
    agents = [
        ("Microsoft 365 Copilot",
         "$30/月/ユーザー",
         "Excel / PowerPoint / Outlook /\nTeams 内で AI Agent\n"
         "レポート作成 / 分析 /\nメール作成 を補助\n"
         "副業代行 : Office中心の人向け"),
        ("Microsoft Advertising AI",
         "Bing Ads内蔵",
         "Bing Ads (Microsoft広告) 内蔵\n"
         "Conversational Campaign Builder\n"
         "提案 + 実装の半自動化"),
        ("Gemini in Workspace",
         "Google One AI Premium",
         "Gmail / Docs / Sheets / Slides\n"
         "Conversational Analytics\n"
         "Google Adsとの連携強化"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.2)
    gap = Inches(0.15)
    for i, (name, price, body) in enumerate(agents):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, price, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(2.05),
                 size=11, color=TEXT, line_spacing=1.65)

    # Note
    add_rect(s, Inches(0.6), Inches(4.9), Inches(12.15), Inches(2.05),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で Agent ツールの選択",
             Inches(0.85), Inches(5.05), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• Office 365 環境 = Microsoft Copilot で Excel/PowerPoint レポート効率化\n"
             "• Google Workspace 環境 = Gemini in Workspace でドキュメント作成効率化\n"
             "• 媒体側 = Gemini in Google Ads / Conversational Campaign Builder を活用\n"
             "• 副業代行スイートスポット : Workspace + Gemini で月次レポート自動化\n"
             "• ROI : 月レポート工数を 5時間→1時間 削減で月Pro契約 $20-30 は即ペイ",
             Inches(0.85), Inches(5.4), Inches(12), Inches(1.5),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p199_prompt_strategy(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプトテンプレ : 戦略立案",
               "新規案件のキャンペーン戦略を AI と作る",
               pagenum(14))
    # Prompt template box
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(5.45),
             fill=LIGHT, radius=True)
    add_rect(s, Inches(0.6), Inches(1.5), Inches(0.15), Inches(5.45),
             fill=ORANGE)
    add_text(s, "📝 プロンプトテンプレ : 新規案件のキャンペーン戦略立案",
             Inches(0.95), Inches(1.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_text(s,
             "あなたは経験豊富な広告運用ストラテジストです。以下の条件で\n"
             "新規クライアントの広告運用戦略を立案してください。\n\n"
             "【クライアント情報】\n"
             "・業種 : {業種}\n"
             "・商材 : {商品/サービス概要}\n"
             "・LP : {LP URL}\n"
             "・ターゲット : {年齢/性別/属性}\n"
             "・月予算 : {予算金額}\n"
             "・KGI/目標 : {売上目標 / リード目標 等}\n"
             "・既存運用状況 : {現在の媒体・パフォーマンス}\n\n"
             "【出力フォーマット】\n"
             "1. 推奨媒体構成 (媒体名 + 配信目的 + 予算配分%)\n"
             "2. キャンペーン構造 (媒体別の キャンペーン → 広告セット 設計)\n"
             "3. オーディエンス戦略 (1PD活用 / Lookalike / ターゲティング)\n"
             "4. クリエイティブ方針 (訴求軸 3-5案 + 制作本数目安)\n"
             "5. 計測設計 (CV定義 / Tag / DDA / 検証手法)\n"
             "6. 30日プランの主要マイルストーン",
             Inches(0.95), Inches(2.1), Inches(12), Inches(4.85),
             size=10, color=TEXT, line_spacing=1.4, font="Menlo")
    footer(s, prs)


def p200_prompt_creative_brief(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプトテンプレ : クリエイティブブリーフ",
               "AI 生成用のブリーフを構造化", pagenum(15))
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(5.45),
             fill=LIGHT, radius=True)
    add_rect(s, Inches(0.6), Inches(1.5), Inches(0.15), Inches(5.45),
             fill=ORANGE)
    add_text(s, "📝 プロンプトテンプレ : 広告クリエイティブブリーフ生成",
             Inches(0.95), Inches(1.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_text(s,
             "あなたは広告クリエイティブディレクターです。\n"
             "以下の情報を元に、Midjourney / Sora 用のクリエイティブブリーフを作成してください。\n\n"
             "【商品情報】\n"
             "・商品名 : {商品名}\n"
             "・特徴/USP : {差別化ポイント 3つ}\n"
             "・ターゲット : {年齢/性別/状況/関心}\n"
             "・トーン : {カジュアル / 信頼感 / ユーモア / 高級感 等}\n\n"
             "【出力】\n"
             "1. 訴求軸 5案 (各々 1行で)\n"
             "2. 訴求軸ごとに以下を生成 :\n"
             "   - キャプション (見出し10案)\n"
             "   - 説明文 (3案)\n"
             "   - Midjourneyプロンプト (英語、--ar 9:16, --v 7)\n"
             "   - Soraプロンプト (英語、シーン構成3-5秒)\n"
             "   - 想定NG事項 (媒体審査で落ちる可能性)",
             Inches(0.95), Inches(2.1), Inches(12), Inches(4.85),
             size=10, color=TEXT, line_spacing=1.4, font="Menlo")
    footer(s, prs)


def p201_prompt_report(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプトテンプレ : 月次レポート要約",
               "数字データから自然言語の要約を生成", pagenum(16))
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(5.45),
             fill=LIGHT, radius=True)
    add_rect(s, Inches(0.6), Inches(1.5), Inches(0.15), Inches(5.45),
             fill=ORANGE)
    add_text(s, "📝 プロンプトテンプレ : 月次レポートの要約 + 提案",
             Inches(0.95), Inches(1.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_text(s,
             "あなたは広告運用代行のシニアアナリストです。\n"
             "以下の月次パフォーマンスデータを元に、クライアント向けレポートを作成してください。\n\n"
             "【データ (CSV/表を貼付)】\n"
             "{Google Ads / Meta Ads / GA4 のデータ}\n\n"
             "【前月実績】\n"
             "{前月の数値}\n\n"
             "【出力フォーマット】\n"
             "1. エグゼクティブサマリー (3行 / 数字付き)\n"
             "2. 媒体別パフォーマンス (前月比 + コメント)\n"
             "3. 良かった点 (3つ + 数字)\n"
             "4. 課題と改善ポイント (3つ + アクション)\n"
             "5. 来月の提案 (具体的アクション 3つ + 期待効果)\n\n"
             "【トーン】\n"
             "・クライアント (経営者層) 向け、専門用語は最小限\n"
             "・誇張・憶測なし、数字根拠を必ず明示\n"
             "・改善ポイントはネガティブにならないよう前向きに",
             Inches(0.95), Inches(2.1), Inches(12), Inches(4.85),
             size=10, color=TEXT, line_spacing=1.4, font="Menlo")
    footer(s, prs)


def p202_prompt_negkw(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプトテンプレ : Negative KW 提案",
               "Search Terms から無駄クエリを抽出", pagenum(17))
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(5.45),
             fill=LIGHT, radius=True)
    add_rect(s, Inches(0.6), Inches(1.5), Inches(0.15), Inches(5.45),
             fill=ORANGE)
    add_text(s, "📝 プロンプトテンプレ : Negative Keyword 提案",
             Inches(0.95), Inches(1.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_text(s,
             "あなたは広告運用のSEM専門家です。\n"
             "以下の Search Terms Report を分析し、追加すべき Negative Keyword を提案してください。\n\n"
             "【商材】\n"
             "・業種 : {業種}\n"
             "・サービス : {サービス概要}\n"
             "・ターゲット顧客 : {属性 / 状況}\n\n"
             "【Search Terms Report (CSV貼付)】\n"
             "{search_term, impressions, clicks, conversions, cost}\n\n"
             "【判断基準】\n"
             "・100クリック以上で CV=0 のクエリ\n"
             "・明らかに意図と外れたクエリ (例: 競合名・無関係用語)\n"
             "・予算消化の上位だが効率悪いクエリ\n\n"
             "【出力】\n"
             "1. 即追加すべきNegative KW (リスト 10-30件)\n"
             "2. 追加根拠 (各KWに1行 : なぜ無駄と判断したか)\n"
             "3. 検証要 (微妙なクエリ、Phrase/Exact化検討等)",
             Inches(0.95), Inches(2.1), Inches(12), Inches(4.85),
             size=10, color=TEXT, line_spacing=1.4, font="Menlo")
    footer(s, prs)


def p203_workflow(prs):
    s = blank(prs)
    page_frame(s, prs, "AI 副業代行の1日ワークフロー",
               "朝〜夜の標準的な業務フロー", pagenum(18))
    flow = [
        ("朝 8:00",
         "ダッシュボード確認",
         "GA4 / Looker Studio で\nAI Insights 異常検知\n+ 前日CV確認"),
        ("9:00",
         "Negative KW分析",
         "Claude/ChatGPT で\nSearch Terms 分析\n→ 即追加 (5-10件)"),
        ("10-12:00",
         "クリエイティブ量産",
         "Midjourney / Sora で\n2-3 案件分の素材生成\n+ Symphony 連携"),
        ("13:00",
         "媒体管理画面",
         "Optiscore提案レビュー\n+ クリエイティブ追加\n+ 入札微調整"),
        ("14-15:00",
         "クライアント対応",
         "Conversational Analytics\n質問回答 / 報告\n+ 提案準備"),
        ("16:00",
         "新規案件 戦略立案",
         "Claude で戦略テンプレ\n→ クライアント承認待ち"),
        ("17-18:00",
         "月次レポート",
         "AI Insights 要約 +\nLooker Studio 自動更新\n→ メール送付"),
        ("19:00",
         "翌日準備",
         "Asana タスク確認\n月次目標進捗確認"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(1.55)
    gap_x = Inches(0.1)
    gap_y = Inches(0.15)
    for i, (time, name, body) in enumerate(flow):
        r, c = divmod(i, 4)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, w, Inches(0.4), fill=NAVY)
        add_text(s, time, x + Inches(0.15), y + Inches(0.08),
                 w - Inches(0.3), Inches(0.25),
                 size=10, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.15), y + Inches(0.5),
                 w - Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), y + Inches(0.8),
                 w - Inches(0.3), Inches(0.7),
                 size=9, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.4)

    # Note
    add_rect(s, Inches(0.6), Inches(4.95), Inches(12.15), Inches(2.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 1日で何案件対応できるか",
             Inches(0.85), Inches(5.1), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• AI 駆使前 = 1人で 月3-5クライアント (フル業務)\n"
             "• AI 駆使後 = 1人で 月10-20クライアント (戦略 + 判断 + クライアント窓口に集中)\n"
             "• 月次レポート工数 = 5時間/案件 → 1時間/案件 (8割削減)\n"
             "• クリエイティブ制作工数 = デザイナー外注週次 → AI 即時生成 (日次量産)\n"
             "• ボトルネック = AIで完遂できない『戦略判断』『クライアント窓口』『契約管理』",
             Inches(0.85), Inches(5.45), Inches(12), Inches(1.45),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p204_part5_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "Part 5 (AI活用 40p) 完了 → Part 6 へ",
               "AI 章のまとめ + 次は鉄板運用メソッド",
               pagenum(19))
    # Summary 3 takeaways
    takeaways = [
        ("01",
         "AI クリエイティブ生成 (5-A)",
         "コピー / 画像 / 動画 / 媒体ネイティブ生成 まで完備\n"
         "副業代行のクリエイティブコスト 数十万円 → 数千円に圧縮"),
        ("02",
         "AI 運用自動化 + 予測 (5-B 前半)",
         "媒体内AI (PMax/Advantage+/Smart+) + 外部運用ツール + 予測LTV\n"
         "運用工数50%以上削減 + 意思決定の前倒し"),
        ("03",
         "Agent型広告運用 + プロンプトテンプレ (5-B 後半)",
         "Claude Computer Use / Operator / Copilot で管理画面操作も自動化\n"
         "1人で月10-20クライアント対応が現実的に"),
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

    # Next
    add_rect(s, Inches(0.6), Inches(4.85), Inches(12.15), Inches(2.1),
             fill=NAVY, radius=True)
    add_text(s, "NEXT →  Part 6  鉄板運用メソッド 2026年版 (15p)",
             Inches(0.85), Inches(5.0), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 6 で扱うトピック (15p) :\n"
             "• アカウント構造の現代版 (Hub & Spoke)\n"
             "• 入札戦略選定フロー\n"
             "• クリエイティブ本数・バリエーション設計\n"
             "• Learning Phase 突破手順\n"
             "• 予算配分フレーム / 検証設計\n"
             "• 月次レポート標準 / クライアント説明スクリプト",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p205_5b_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "AI 運用 pitfalls (補足)",
               "Agent型運用の注意点", pagenum(20))
    pitfalls = [
        ("Agent型に丸投げ",
         "予算系・配信系の自動変更は事故リスク → 人間承認チェックポイント必須"),
        ("プロンプトテンプレの使い回し",
         "業種・案件で必要な情報が違う → クライアント別にカスタマイズ"),
        ("AI生成レポートの数字未検証",
         "AIが数字を間違えるケース → 必ず管理画面と突き合わせ"),
        ("外部ツール過剰投資",
         "ツール契約の月額が嵩む → 案件規模に応じて選択"),
        ("AI Analytics 過信",
         "AI解釈は仮説、必ず人間判断 → クライアントには『仮説』として共有"),
        ("プロンプト設計を磨かない",
         "AI出力品質が低下 → 月1回はプロンプトテンプレ見直し"),
    ]
    top = Inches(1.45)
    w = Inches(5.95)
    h = Inches(1.7)
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
                 size=18, bold=True, color=WARN)
        add_text(s, mistake, x + Inches(0.7), y + Inches(0.15),
                 w - Inches(0.85), Inches(0.4),
                 size=12, bold=True, color=NAVY, line_spacing=1.3)
        add_rect(s, x + Inches(0.25), y + Inches(0.7),
                 w - Inches(0.4), Inches(0.015),
                 fill=ORANGE)
        add_text(s, fix, x + Inches(0.25), y + Inches(0.8),
                 w - Inches(0.4), Inches(0.85),
                 size=10, color=TEXT, line_spacing=1.5)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p186_divider(prs)
    p187_tldr(prs)
    p188_smart_bidding(prs)
    p189_meta_andromeda_ops(prs)
    p190_smart_plus_symphony(prs)
    p191_external_tools(prs)
    p192_predictive_ltv(prs)
    p193_creative_prediction(prs)
    p194_ai_analytics_recap(prs)
    p195_agent_concept(prs)
    p196_claude_computer_use(prs)
    p197_openai_operator(prs)
    p198_copilot_gemini(prs)
    p199_prompt_strategy(prs)
    p200_prompt_creative_brief(prs)
    p201_prompt_report(prs)
    p202_prompt_negkw(prs)
    p203_workflow(prs)
    p204_part5_summary(prs)
    p205_5b_pitfalls(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
