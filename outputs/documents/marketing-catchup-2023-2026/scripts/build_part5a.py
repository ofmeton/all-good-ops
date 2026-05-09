#!/usr/bin/env python3
"""Build Part 5-A AI クリエイティブ生成 (20p, P166-P185)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part5a.pptx"
PNUM_BASE = 165


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p166_divider(prs):
    part_divider(
        prs, 5, "AI 活用事例集 (前半)",
        "クリエイティブ生成 ─ コピー / 画像 / 動画",
        "ChatGPT / Claude / Gemini のテキスト生成、Midjourney / DALL-E / Firefly の画像、\n"
        "Sora / Veo / Runway の動画、そして媒体ネイティブの Advantage+ Creative / Symphony まで。\n"
        "副業運用代行で月20-30本のクリエイティブを1人で量産する基盤",
        [
            "AI for Creative TL;DR",
            "コピー : ChatGPT",
            "コピー : Claude",
            "コピー : Gemini",
            "広告特化コピーツール",
            "画像 : Midjourney",
            "画像 : DALL-E / Imagen",
            "画像 : Firefly / Nano Banana",
            "動画 : Sora 2",
            "動画 : Veo 3 / Runway / Luma",
            "広告特化生成ツール",
            "媒体ネイティブ生成",
            "著作権・規制",
            "プロンプト設計の鉄則",
            "ABテスト × AI",
            "AI クリエイティブWF",
            "5-A まとめ → 5-B へ",
        ],
    )


def p167_5a_landscape(prs):
    s = blank(prs)
    page_frame(s, prs, "5-A : AI クリエイティブ生成 ランドスケープ",
               "コピー / 画像 / 動画 の3レイヤー", pagenum(2))
    layers = [
        ("コピー (テキスト)",
         "1秒で生成 / 即時改善",
         "ChatGPT / Claude / Gemini\n+ 広告特化 (Jasper / Copy.ai / Anyword)\n"
         "副業代行 : 全クライアントで利用、最初のAIワークフロー"),
        ("画像",
         "30秒〜数分 / 1枚数円〜数十円",
         "Midjourney / DALL-E 4 / Imagen 4 /\nAdobe Firefly / Nano Banana\n"
         "副業代行 : 訴求軸ごとに10-20本量産が基本"),
        ("動画",
         "1-3分 / 1動画数百円〜数千円",
         "Sora 2 (OpenAI) / Veo 3 (Google) / Runway /\nLuma / Pika\n"
         "副業代行 : 縦型動画 (TikTok/Reels/Shorts) で広告素材化"),
    ]
    top = Inches(1.55)
    h = Inches(1.55)
    gap = Inches(0.15)
    for i, (cat, sub, body) in enumerate(layers):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, cat, Inches(0.95), y + Inches(0.18),
                 Inches(3.5), Inches(0.4),
                 size=18, bold=True, color=NAVY)
        add_text(s, sub, Inches(0.95), y + Inches(0.65),
                 Inches(11), Inches(0.35),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, Inches(0.95), y + Inches(1.0),
                 Inches(11), Inches(0.55),
                 size=11, color=TEXT, line_spacing=1.5)

    # Note
    add_rect(s, Inches(0.6), Inches(6.5), Inches(12.15), Inches(0.45),
             fill=NAVY, radius=True)
    add_text(s,
             "💡 共通原則 : AI生成は『ヒント発掘 + 量産』、最終調整 = 人間。完全自動化は信頼性に欠ける",
             Inches(0.85), Inches(6.6), Inches(12), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    footer(s, prs)


def p168_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "AI クリエイティブ 5つのインパクト (TL;DR)",
               "現場の仕事がどう変わったか", pagenum(3))
    points = [
        ("01", "コピー生成は1分の作業に",
         "ChatGPT/Claude/Gemini 経由で広告コピーを 5-10案を1分以内に生成。\n"
         "従来の半日工数が 10分 (人間の最終選定+調整) に圧縮"),
        ("02", "画像生成で訴求軸の量産が現実的に",
         "1案件あたり 訴求軸ごとに 10-20本の画像クリエイティブ → 学習データ量が桁違い。\n"
         "Smart+ / Advantage+ がより精度高く配信できるように"),
        ("03", "動画生成 (Sora 2 / Veo 3) で短尺動画が量産可",
         "テキスト → 5-10秒動画が数百円〜数千円。\n"
         "TikTok / Shorts / Reels の縦型素材を1日で20本作成可能に"),
        ("04", "媒体ネイティブAI生成が標準装備",
         "Advantage+ Creative (Meta) / Symphony (TikTok) / Gemini in Ads (Google)。\n"
         "広告管理画面内で生成完結 → 外部ツールが不要なケースも"),
        ("05", "副業代行の利益率が劇的改善",
         "クリエイティブ制作の外注費が大幅削減 (デザイナー外注 数万円 → AI 数百円)。\n"
         "1人で月10-20クライアント対応も実現可能に"),
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


def p169_chatgpt(prs):
    s = blank(prs)
    page_frame(s, prs, "コピー生成 : ChatGPT (OpenAI)",
               "デファクト標準・幅広いユースケース",
               pagenum(4))
    # Models
    add_text(s, "主要モデル (2026年現在)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    models = [
        ("GPT-5", "最高性能", "推論・コード・長文"),
        ("GPT-5 mini", "高速・コスパ", "大量処理向け"),
        ("o4", "深い推論", "戦略立案・分析"),
        ("GPT-Image", "画像生成統合", "DALL-E後継"),
    ]
    top = Inches(2.0)
    w = Inches(2.95)
    h = Inches(1.5)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(models):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.05),
                 w - Inches(0.4), Inches(0.4),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Use cases for ad ops
    add_text(s, "広告運用代行でのユースケース",
             Inches(0.6), Inches(3.7), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.1), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    cases = [
        ("広告コピー量産",
         "見出し10案 + 説明文5案を1分で。RSA / Smart+ 投入用"),
        ("LP原稿作成",
         "ヒアリングメモから LP の見出し+本文+CTAを生成"),
        ("検索クエリ分析",
         "Search Terms Reportを貼って『無駄クエリ + 追加すべきクエリ』提案"),
        ("月次レポート要約",
         "GA4 / Google Ads データを貼ってクライアント向け要約"),
    ]
    for i, (cat, body) in enumerate(cases):
        y = Inches(4.3) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(3), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(4.0), y + Inches(0.02),
                 Inches(8.5), Inches(0.3),
                 size=11, color=TEXT)

    # Pricing
    add_text(s,
             "💡 ChatGPT Plus US$20/月で大半の機能利用可。API は別途従量",
             Inches(0.6), Inches(6.65), Inches(12), Inches(0.3),
             size=11, color=NAVY)
    footer(s, prs)


def p170_claude(prs):
    s = blank(prs)
    page_frame(s, prs, "コピー生成 : Claude (Anthropic)",
               "長文・分析・整理に強い 推論型LLM",
               pagenum(5))
    # Models
    add_text(s, "主要モデル (2026年現在)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    models = [
        ("Claude Opus 4.7", "最高性能",
         "戦略立案 / 長文分析\nコード生成も最強クラス"),
        ("Claude Sonnet 4.6", "バランス",
         "日常使い / 高速生成\nコスパ最強"),
        ("Claude Haiku 4.5", "超高速・低コスト",
         "大量処理 / API活用\nチャットボット向け"),
    ]
    top = Inches(2.0)
    w = Inches(3.95)
    h = Inches(1.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(models):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), top + Inches(1.05),
                 w - Inches(0.4), Inches(0.6),
                 size=10, color=TEXT, line_spacing=1.55)

    # Strengths for ad ops
    add_text(s, "広告運用代行で Claude が強い領域",
             Inches(0.6), Inches(3.95), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.35), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    cases = [
        ("競合LP分析",
         "競合LP 5サイトの構成を貼って共通要素+差別化要素を抽出"),
        ("ヒアリング要約",
         "クライアント MTG音声書き起こしを構造化、ToDoリスト+提案"),
        ("レポート骨子作成",
         "数字データ + 過去レポを貼って今月の骨子を構造化"),
        ("Computer Use (Agent)",
         "管理画面操作も可能 → 広告運用の自動化に活用 (Part 5-B 参照)"),
    ]
    for i, (cat, body) in enumerate(cases):
        y = Inches(4.55) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(3.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(4.5), y + Inches(0.02),
                 Inches(8), Inches(0.3),
                 size=11, color=TEXT)

    # Pricing
    add_text(s,
             "💡 Claude Pro US$20/月。Sonnet / Opus / Haiku 切替可。Claude Code は開発者必須",
             Inches(0.6), Inches(6.65), Inches(12), Inches(0.3),
             size=11, color=NAVY)
    footer(s, prs)


def p171_gemini(prs):
    s = blank(prs)
    page_frame(s, prs, "コピー生成 : Gemini (Google)",
               "Google Workspace + Google Ads 連携が強み",
               pagenum(6))
    # Models
    models = [
        ("Gemini 2.5 Ultra", "最高性能",
         "マルチモーダル / 長文\n100万トークン対応"),
        ("Gemini 2.5 Pro", "バランス",
         "標準利用 / API\nGoogle Workspace内"),
        ("Gemini Nano", "オンデバイス",
         "Pixel / Android搭載\nローカル処理"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(1.7)
    gap = Inches(0.15)
    add_text(s, "主要モデル (2026年現在)",
             Inches(0.6), Inches(1.15), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    for i, (name, sub, body) in enumerate(models):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.3),
                 size=11, bold=True, color=ORANGE_DARK)
        add_text(s, body, x + Inches(0.25), top + Inches(1.05),
                 w - Inches(0.4), Inches(0.6),
                 size=10, color=TEXT, line_spacing=1.55)

    # Integrations
    add_text(s, "Gemini × Google エコシステム",
             Inches(0.6), Inches(3.5), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(3.9), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    integrations = [
        ("Gemini in Google Ads",
         "Conversational Builder / アセット生成 / Optiscore提案"),
        ("Gemini in GA4",
         "Conversational Analytics でデータ質問"),
        ("Gemini in Workspace",
         "Gmail / Docs / Sheets / Slides に統合 (Premium プラン)"),
        ("Gemini in Search (AI Overview)",
         "検索結果上部のAI要約 → SEO/GEO対象"),
    ]
    for i, (cat, body) in enumerate(integrations):
        y = Inches(4.1) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(4), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(5.0), y + Inches(0.02),
                 Inches(7.5), Inches(0.3),
                 size=11, color=TEXT)

    # Pricing
    add_text(s,
             "💡 Gemini Advanced US$20/月 + Google One AI Premium。Workspace 連携で工数削減",
             Inches(0.6), Inches(6.0), Inches(12), Inches(0.95),
             size=11, color=NAVY)
    footer(s, prs)


def p172_ad_copy_tools(prs):
    s = blank(prs)
    page_frame(s, prs, "広告特化コピーツール",
               "Jasper / Copy.ai / Anyword ─ 業務特化の選択肢",
               pagenum(7))
    tools = [
        ("Jasper",
         "$49/月〜",
         "広告コピー特化\nブランドボイス保持\nテンプレート豊富"),
        ("Copy.ai",
         "Free / $36/月〜",
         "Workflow自動化\nセールス連携\nワークフロー型"),
        ("Anyword",
         "$49/月〜",
         "予測スコア表示\nA/Bテスト用量産\n媒体別最適化"),
        ("Persado",
         "Enterprise",
         "感情分析+自動生成\n大手ブランド向け\n専門高単価"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (name, price, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=15, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, price, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Decision tip
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行の判断基準",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月10案件以下 = ChatGPT / Claude のシンプル利用で十分 (US$20/月)\n"
             "• 月10案件以上で『同じブランドボイス保持』が課題 = Jasper (Brand Voice機能)\n"
             "• A/Bテスト用に大量量産したい = Anyword (予測スコア付き)\n"
             "• Workflow自動化したい = Copy.ai (Zapier / Webhook連携豊富)\n"
             "• 大手代理店で複数人運用 = Jasper Team / Persado",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p173_midjourney(prs):
    s = blank(prs)
    page_frame(s, prs, "画像生成 : Midjourney v7",
               "クリエイティブのデファクト・最高品質",
               pagenum(8))
    # Pricing tiers
    add_text(s, "プラン (2026)",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    plans = [
        ("Basic", "$10/月",
         "200画像/月 程度\nスタンダード品質"),
        ("Standard", "$30/月",
         "Fast 15時間/月\nUnlimited Relax"),
        ("Pro", "$60/月",
         "Fast 30時間/月\nStealth Mode"),
        ("Mega", "$120/月",
         "Fast 60時間/月\n商用利用フル"),
    ]
    top = Inches(2.0)
    w = Inches(2.95)
    h = Inches(1.7)
    gap = Inches(0.1)
    for i, (name, price, body) in enumerate(plans):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, name, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, price, x + Inches(0.2), top + Inches(0.65),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), top + Inches(0.95),
                 w - Inches(0.4), Inches(0.7),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Use case for ad ops
    add_rect(s, Inches(0.6), Inches(4.0), Inches(12.15), Inches(2.95),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 広告運用代行での使い方",
             Inches(0.85), Inches(4.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 訴求軸ごとに 5-10案を量産 → クライアント承認後に Smart+ / Advantage+ に投入\n"
             "• Style References (--sref) で同一ブランドトーン維持 (2024年導入)\n"
             "• 商用利用 : Standard以上で OK (Basic も可)\n"
             "• Discord UI に加え 公式Web UI も完成済 (2025-2026)\n"
             "• 副業代行 : Standard $30/月で 月20-30案件のクリエイティブ量産可能\n"
             "• 著作権 : Stealth Mode (Pro以上) で他人の Public生成画像から自分のが見られない\n"
             "• 注意 : 人物の顔・既存ブランド・キャラクターの再現は使用禁止",
             Inches(0.85), Inches(4.5), Inches(12), Inches(2.4),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p174_dalle_imagen(prs):
    s = blank(prs)
    page_frame(s, prs, "画像生成 : DALL-E / Imagen",
               "ChatGPT / Gemini 内で使える画像生成",
               pagenum(9))
    tools = [
        ("DALL-E 4 / GPT-Image",
         "ChatGPT統合",
         "ChatGPT Plus / API\nテキスト→画像\nプロンプトに会話的に\n"
         "強み : 自然言語で細かい指示\n弱み : 細かい構図制御は苦手"),
        ("Imagen 4",
         "Google統合",
         "Gemini / Vertex AI\nGoogle Cloudで利用\n"
         "強み : 写実的な画像\n強み : 日本語プロンプト精度高\n"
         "弱み : 商用利用は要規約確認"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tools):
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
                 w - Inches(0.6), Inches(2.3),
                 size=11, color=TEXT, line_spacing=1.7)

    # Comparison
    add_rect(s, Inches(0.6), Inches(5.25), Inches(12.15), Inches(1.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のおすすめ",
             Inches(0.85), Inches(5.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• ChatGPT Plus / Claude Pro を契約済 = DALL-E / GPT-Image を追加コストなしで利用\n"
             "• 写実 + 日本語プロンプト精度求める = Imagen 4 (Vertex AI 経由)\n"
             "• ブランド統一感重視 = Midjourney (Style Reference 強い)\n"
             "• 高品質+商用利用安心 = Adobe Firefly (次ページ)",
             Inches(0.85), Inches(5.75), Inches(12), Inches(1.15),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p175_firefly_nanobanana(prs):
    s = blank(prs)
    page_frame(s, prs, "画像生成 : Adobe Firefly / Nano Banana",
               "商用利用安心 + 多彩なスタイル",
               pagenum(10))
    tools = [
        ("Adobe Firefly",
         "Creative Cloud統合",
         "Adobe Stockのライセンス済画像で訓練\n商用利用が安心\n"
         "Photoshop / Illustrator に直接統合\n"
         "Generative Fill / Generative Remove\n"
         "副業代行 : Adobe CC ユーザーに最適"),
        ("Nano Banana (Gemini Image)",
         "Google実験的モデル",
         "Gemini 経由で利用可\n"
         "プロンプト追従性が高い\n"
         "コスト : Gemini API 経由で従量\n"
         "副業代行 : 試験利用に向く"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.7)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(2.5),
                 size=11, color=TEXT, line_spacing=1.7)

    # Note
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 商用利用の安心度ランキング (副業代行で重要)",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "1. Adobe Firefly = 最高 (Adobe Stockライセンス済画像で訓練、企業向けの保証もあり)\n"
             "2. Midjourney (Standard以上) = 高 (商用利用OK、ただし規約遵守必要)\n"
             "3. DALL-E / GPT-Image = 中 (利用規約で商用OK、ただしモデル訓練データの透明性低)\n"
             "4. Stable Diffusion (オープンソース) = 中-低 (利用は自由だが法的リスク自己責任)",
             Inches(0.85), Inches(5.95), Inches(12), Inches(1.0),
             size=10, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p176_sora(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 動画生成 : Sora 2 (OpenAI)",
               "テキスト → 高品質動画 / 2025-2026 で実用化",
               pagenum(11))
    # Top stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "Sora 2 (2025/12 リリース)",
             Inches(0.85), Inches(1.65), Inches(11), Inches(0.4),
             size=14, bold=True, color=ORANGE)
    add_text(s,
             "テキスト+画像から最大60秒の動画を生成。物理シミュレーション精度が劇的向上。\n"
             "ChatGPT Pro / Sora単体プラン (US$20-200/月) で利用可",
             Inches(0.85), Inches(2.05), Inches(12), Inches(0.7),
             size=12, color=WHITE, line_spacing=1.5)

    # Capabilities
    add_text(s, "Sora 2 の主な機能",
             Inches(0.6), Inches(3.0), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    capabilities = [
        ("Text → Video",
         "プロンプトから動画\n5-60秒対応"),
        ("Image → Video",
         "静止画を動かす\n商品写真の動画化"),
        ("Video → Video",
         "既存動画を編集\nスタイル変換"),
        ("Storyboard",
         "複数カットを\n連続再生で生成"),
    ]
    top = Inches(3.5)
    w = Inches(2.95)
    h = Inches(1.85)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(capabilities):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.05),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(5.5), Inches(12.15), Inches(1.45),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行での Sora 2 活用",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.3),
             size=11, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 縦型動画素材を1日10-20本量産 (TikTok / Reels / Shorts投入用)\n"
             "• 商品写真 + プロンプトで簡易動画化 / Storyboard で15-30秒認知動画\n"
             "• 価格 : ChatGPT Pro $200/月でフル活用 (素材コスト 月10万円以上削減)",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=10, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p177_veo_runway(prs):
    s = blank(prs)
    page_frame(s, prs, "動画生成 : Veo 3 / Runway / Luma",
               "Sora 以外の主要オプション",
               pagenum(12))
    tools = [
        ("Veo 3 (Google)",
         "Vertex AI / Workspace",
         "テキスト→動画 (最大2分)\n"
         "音声生成も対応\n"
         "Google エコシステム連携"),
        ("Runway Gen-4",
         "Web UI",
         "Image to Video / Text to Video\n"
         "Director Mode (細かい制御)\n"
         "$15-95/月"),
        ("Luma Dream Machine",
         "Web / API",
         "高速生成 (10秒以内)\n"
         "コスパ最強\n"
         "$10-100/月"),
        ("Pika 2.0",
         "Web / Discord",
         "Camera Movement制御\n"
         "ループ動画特化\n"
         "$10-70/月"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=13, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.05),
                 w - Inches(0.4), Inches(1.4),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Comparison
    add_rect(s, Inches(0.6), Inches(4.3), Inches(12.15), Inches(2.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のおすすめ",
             Inches(0.85), Inches(4.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 高品質 + ストーリー性 = Sora 2 (ChatGPT Pro)\n"
             "• Google エコシステム + 音声 = Veo 3 (Vertex AI)\n"
             "• 細かい制御 (カメラワーク) = Runway Gen-4 ($15-95/月)\n"
             "• 大量生成 + コスパ = Luma Dream Machine ($10-100/月)\n"
             "• ループ動画 (バナー用) = Pika 2.0 ($10-70/月)\n"
             "• 副業代行 : 最初は Luma で実験、慣れたら Sora 2 / Veo 3 にステップアップ",
             Inches(0.85), Inches(4.8), Inches(12), Inches(2.1),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p178_ad_creative_tools(prs):
    s = blank(prs)
    page_frame(s, prs, "広告特化生成ツール",
               "Pencil / Omneky / AdCreative.ai",
               pagenum(13))
    tools = [
        ("Pencil",
         "WPP系 / 広告特化",
         "ブランド学習型クリエイティブ生成\n"
         "媒体ごとに最適化されたバリエーション\n"
         "エンタープライズ価格"),
        ("Omneky",
         "$199/月〜",
         "クリエイティブ自動生成 + 配信\n"
         "Meta / TikTok / Google 統合\n"
         "ABテスト自動化"),
        ("AdCreative.ai",
         "$29-249/月",
         "中小向け SaaS\n"
         "10秒で広告クリエイティブ生成\n"
         "テンプレート豊富"),
        ("Smartly.io",
         "Enterprise",
         "ECブランド向け統合プラットフォーム\n"
         "クリエイティブ + 配信 + 計測\n"
         "Meta公式パートナー"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (name, price, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, price, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で『広告特化ツール』を使う判断",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月予算 100万円以下のクライアント = 一般AI (ChatGPT/Midjourney等) で十分\n"
             "• 月予算 300万円以上 + クリエイティブ量重視 = AdCreative.ai でAB大量生成\n"
             "• 月予算 1,000万円以上 + 統合運用 = Omneky / Smartly.io で配信統合\n"
             "• 高単価 / 広告会社統合 = Pencil / Persado (エンタープライズ)\n"
             "• 副業代行スイートスポット : 一般AI で十分、特化ツールは月予算1,000万から",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p179_native_ai(prs):
    s = blank(prs)
    page_frame(s, prs, "媒体ネイティブ AI生成",
               "管理画面内で完結する AI クリエイティブ",
               pagenum(14))
    natives = [
        ("Advantage+ Creative (Meta)",
         "管理画面内",
         "Image Variations / Music /\nCropping / Text Variations /\nImage Expansion\n→ 6機能を ad set でON/OFF"),
        ("Symphony (TikTok)",
         "Creative Studio",
         "Image to Video / Text to Video\nDigital Avatars (30+言語)\nAI Dubbing / Daily Generations"),
        ("Gemini in Google Ads",
         "Conversational Builder",
         "URL → 広告セット自動生成\nAsset Generation (画像/動画)\nAds Studio (β)"),
        ("AI Max Asset Optimization",
         "Search広告のAI拡張",
         "ACA (Auto-Created Assets) 後継\nLPから新アセット自動生成"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (name, sub, body) in enumerate(natives):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=12, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 媒体ネイティブ vs 外部AI生成の使い分け",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 媒体ネイティブ = 配信に直結する『枠組みベース調整』 (Cropping / Music / 拡張)\n"
             "• 外部AI生成 = 『ゼロから新規』 のクリエイティブ作成 (Midjourney / Sora 等)\n"
             "• 副業代行ベストプラクティス :\n"
             "  ① 外部AI で訴求軸ごとに 5-10案生成\n"
             "  ② 媒体ネイティブの拡張 (Cropping/Music/Variations) でバリエーション量産\n"
             "  ③ Smart+ / Advantage+ に大量投入で AI最適化",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p180_copyright(prs):
    s = blank(prs)
    page_frame(s, prs, "AI クリエイティブの著作権・規制",
               "副業代行でのリスク管理", pagenum(15))
    # 4 issues
    issues = [
        ("商用利用の可否",
         "各ツールの規約確認必須",
         "Midjourney : Standard以上 OK\nDALL-E / Sora : 規約準拠\nFirefly : 商用利用安心"),
        ("既存ブランド・人物",
         "再現は使用禁止",
         "実在人物 / キャラクター /\nブランドロゴ の再現は\n媒体審査で落ちる + 法的リスク"),
        ("AI生成表記",
         "媒体・規制で必須化進行",
         "EU DSA でAI生成広告は\n表示義務化検討中。\nTikTok Symphony は自動付与"),
        ("学習データの著作権",
         "進行中の論争",
         "Stable Diffusion / OpenAI が\n訴訟中。商用利用は\n保証付きツール (Firefly等) を推奨"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(issues):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=WARN)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Tip
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行のリスク管理チェックリスト",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "✓ 利用ツールの『商用利用OK』確認 (規約読込)\n"
             "✓ 商用利用安心ツール (Adobe Firefly等) を高単価案件で活用\n"
             "✓ クライアント契約書に『AI生成素材使用』を明記\n"
             "✓ 実在人物・既存IP の再現は禁止\n"
             "✓ 媒体審査で落ちた場合の代替素材を別ツールで準備\n"
             "✓ AI生成表記は将来的に必須になる前提で設計 (TikTok等は既に自動)",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p181_prompt_design(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプト設計の鉄則",
               "AI生成の品質はプロンプトで決まる",
               pagenum(16))
    rules = [
        ("①", "目的を最初に明示",
         "『この広告コピーは…』『商品紹介画像で…』\n用途を冒頭で示す"),
        ("②", "ターゲットを具体的に",
         "『30代女性 / 仕事疲れ / 美容意識高め』\n属性 + 状況 + 関心"),
        ("③", "トーンを指定",
         "『カジュアル』『信頼感あり』『ユーモア』\nブランドボイスを言語化"),
        ("④", "出力形式を指定",
         "『見出し10案 + 説明文5案』\n『カルーセル5枚分のセット』"),
        ("⑤", "制約条件を伝える",
         "『漢字は40%以下』『PR表記必須』\n『LP URLは含めない』"),
        ("⑥", "参照例 (Few-shot) を入れる",
         "『以下の過去の成功例と同じトーンで』\n3-5案を例示"),
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
                 size=32, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, head, x + Inches(0.95), y + Inches(0.25),
                 w - Inches(1.1), Inches(0.4),
                 size=13, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.2), y + Inches(0.95),
                 w - Inches(0.4), Inches(0.7),
                 size=10, color=TEXT, line_spacing=1.45)

    # Note
    add_text(s,
             "💡 プロンプトテンプレ集は Part 5-B P199-203 で詳細",
             Inches(0.6), Inches(5.5), Inches(12), Inches(1.45),
             size=11, color=NAVY)
    footer(s, prs)


def p182_ab_test(prs):
    s = blank(prs)
    page_frame(s, prs, "AB テスト × AI 生成",
               "量産 → 配信 → 学習 → 改善 のサイクル",
               pagenum(17))
    # 4 step cycle
    steps = [
        ("STEP 1",
         "量産",
         "AI で 訴求軸ごとに 5-10案\n→ 50-100本/週も現実的"),
        ("STEP 2",
         "配信",
         "Smart+ / Advantage+ に投入\nAI が組合せ最適化"),
        ("STEP 3",
         "学習",
         "1-2週間で勝ちパターン抽出\nクリエイティブ別の学習"),
        ("STEP 4",
         "改善",
         "勝ちパターンの要素を\n次の AI生成プロンプトに"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.4)
    gap = Inches(0.1)
    for i, (no, name, body) in enumerate(steps):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, no, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.2),
                 w - Inches(0.4), Inches(1.15),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Best practices
    add_rect(s, Inches(0.6), Inches(4.15), Inches(12.15), Inches(2.8),
             fill=NAVY, radius=True)
    add_text(s, "💡 AI生成 + ABテストの鉄則",
             Inches(0.85), Inches(4.3), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 1回で完璧なクリエイティブを目指さない、量で勝つ (Smart+/Advantage+ が最適化)\n"
             "• 訴求軸ごとに別個生成 (例: 価格訴求 / 機能訴求 / 体験訴求 / 信頼訴求)\n"
             "• 勝ちパターン分析 = 共通要素 (色・キャプション形式・人物有無等) を抽出\n"
             "• 次回プロンプト = 勝ちパターン要素を Few-shot として例示\n"
             "• 季節性 = 月次で大きく訴求軸を更新 (春・夏・秋・冬・年末)\n"
             "• 副業代行 : 月20-30本のクリエイティブを月初に大量量産 → 月末に勝ちパターン抽出",
             Inches(0.85), Inches(4.65), Inches(12), Inches(2.25),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p183_workflow(prs):
    s = blank(prs)
    page_frame(s, prs, "AI クリエイティブのワークフロー",
               "副業代行の標準的な制作フロー (1案件)",
               pagenum(18))
    flow = [
        ("Day 1",
         "ブリーフィング",
         "クライアントヒアリング\nターゲット / 訴求軸 / NG事項\nプロンプトテンプレ準備"),
        ("Day 2-3",
         "コピー量産",
         "ChatGPT / Claude で\n見出し50案 + 説明文30案\nクライアント承認"),
        ("Day 4-5",
         "画像量産",
         "Midjourney / Firefly で\n画像 20-30案\n媒体別アスペクト比対応"),
        ("Day 6-7",
         "動画量産",
         "Sora 2 / Veo 3 / Luma で\n縦型動画 10-15本\nABC原則準拠"),
        ("Day 8",
         "配信投入",
         "Smart+ / Advantage+ に\n大量投入\n学習開始"),
    ]
    top = Inches(1.55)
    w = Inches(2.43)
    h = Inches(2.4)
    gap = Inches(0.05)
    for i, (day, name, body) in enumerate(flow):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=NAVY)
        add_text(s, day, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=12, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.15), top + Inches(0.7),
                 w - Inches(0.3), Inches(0.4),
                 size=12, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.15), top + Inches(1.15),
                 w - Inches(0.3), Inches(1.2),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Cost breakdown
    add_rect(s, Inches(0.6), Inches(4.15), Inches(12.15), Inches(2.8),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 月次コスト試算 (1案件あたり)",
             Inches(0.85), Inches(4.3), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• ChatGPT Plus or Claude Pro : US$20/月 (全案件で共通)\n"
             "• Midjourney Standard : US$30/月 (全案件で共通)\n"
             "• Sora 2 (ChatGPT Pro) : US$200/月 (動画量産が必要な月のみ)\n"
             "• Adobe Creative Cloud + Firefly : US$60/月 (高単価案件用)\n"
             "= 1案件あたり追加コスト : 数千円〜1万円程度 (中規模案件)\n"
             "→ デザイナー外注の数十万円から大幅コスト削減、副業代行の利益率改善",
             Inches(0.85), Inches(4.65), Inches(12), Inches(2.25),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p184_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "AI クリエイティブ pitfalls",
               "副業代行で『AIあるある』を防ぐ",
               pagenum(19))
    pitfalls = [
        ("AI生成丸投げで品質チェック放置",
         "ブランド毀損リスク + 規制違反",
         "必ず人間が最終確認、生成5件中1件は使えない前提"),
        ("プロンプトの使い回し",
         "同じトーン・同じ訴求の量産 → 学習効果低い",
         "訴求軸 / ターゲット / トーン 別にプロンプト設計"),
        ("商用利用規約を確認せず使用",
         "著作権侵害・賠償リスク",
         "ツール毎に規約読込、不安なら Firefly等の保証付きを使用"),
        ("実在人物・既存IPの再現",
         "媒体審査で落ちる + 法的リスク",
         "プロンプトに『一般的・抽象的な人物像』を指定"),
        ("Sora / Veo 過剰使用",
         "コスト爆発 (動画は高単価)",
         "静止画で十分な場合は静止画で、動画は『縦型必須』案件に限定"),
        ("AI生成表記漏れ",
         "規制 + 信頼性低下",
         "AI生成と明示する文化が浸透中、躊躇せず明記"),
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


def p185_5a_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "5-A まとめ → 5-B 予告",
               "AIクリエイティブ章のまとめ + 次は運用AI", pagenum(20))
    # 3 takeaways
    takeaways = [
        ("01",
         "コピー / 画像 / 動画 の3レイヤーが揃った",
         "ChatGPT/Claude/Gemini + Midjourney/Firefly + Sora 2/Veo 3 で\n"
         "副業代行が1人で月20-30本のクリエイティブを量産可能に"),
        ("02",
         "媒体ネイティブ AI が標準装備",
         "Advantage+ Creative / Symphony / Gemini in Ads が完備\n"
         "外部AI生成 + 媒体ネイティブ の2段構成が現代の鉄板"),
        ("03",
         "副業代行の利益率が劇的改善",
         "デザイナー外注の数十万円 → AI 数千円 の置き換えで\n"
         "1案件あたりの収益性が大きく改善"),
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
    add_text(s, "NEXT →  Part 5-B AI 運用・予測・Agent (20p, P186-P205)",
             Inches(0.85), Inches(5.0), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 5-B で扱うトピック :\n"
             "• 運用自動化 (Smart Bidding / Advantage+ / Smart+)\n"
             "• 外部運用ツール (Skai / Marin / Optmyzr)\n"
             "• 予測・分析 (LTV / Predictive Audiences / Vidmob)\n"
             "• 🔥 Agent型広告運用 (Claude Computer Use / OpenAI Operator / Copilot)\n"
             "• 副業運用者向けプロンプトテンプレ集 (5本)",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p166_divider(prs)
    p167_5a_landscape(prs)
    p168_tldr(prs)
    p169_chatgpt(prs)
    p170_claude(prs)
    p171_gemini(prs)
    p172_ad_copy_tools(prs)
    p173_midjourney(prs)
    p174_dalle_imagen(prs)
    p175_firefly_nanobanana(prs)
    p176_sora(prs)
    p177_veo_runway(prs)
    p178_ad_creative_tools(prs)
    p179_native_ai(prs)
    p180_copyright(prs)
    p181_prompt_design(prs)
    p182_ab_test(prs)
    p183_workflow(prs)
    p184_pitfalls(prs)
    p185_5a_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
