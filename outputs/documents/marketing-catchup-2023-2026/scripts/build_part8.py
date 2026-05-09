#!/usr/bin/env python3
"""Build Part 8 付録 (15p, P231-P245)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part8.pptx"
PNUM_BASE = 230


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p231_divider(prs):
    part_divider(
        prs, 8, "付録",
        "リファレンス + チェックリスト + 全体まとめ",
        "用語集 / 主要ツール比較表 / 情報源リスト / プロンプト集 /\n"
        "クライアント FAQ / 副業復帰チェックリスト / AI ツール月額一覧 /\n"
        "Part 1-7 を即引きできるリファレンス章",
        [
            "用語集 ×3p",
            "ツール比較 (AI/運用/計測)",
            "情報源リスト (英/日)",
            "プロンプト集",
            "クライアント FAQ ×2p",
            "副業復帰チェックリスト",
            "AI ツール月額一覧",
            "全体まとめ + 出典",
        ],
    )


def _glossary_page(prs, title, items, page_local):
    """Generic glossary page renderer."""
    s = blank(prs)
    page_frame(s, prs, title, "2024-2026 業界用語集 (副業代行で頻出)",
               pagenum(page_local))
    # 8 items in 4x2 grid
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(1.3)
    gap_x = Inches(0.1)
    gap_y = Inches(0.1)
    for i, (term, body) in enumerate(items):
        r, c = divmod(i, 4)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.08), h, fill=ORANGE)
        add_text(s, term, x + Inches(0.2), y + Inches(0.12),
                 w - Inches(0.3), Inches(0.4),
                 size=12, bold=True, color=NAVY, font=EN_FONT,
                 line_spacing=1.2)
        add_text(s, body, x + Inches(0.2), y + Inches(0.55),
                 w - Inches(0.3), Inches(0.7),
                 size=9, color=TEXT, line_spacing=1.45)
    footer(s, prs)


def p232_glossary_a(prs):
    items = [
        ("Advantage+\nShopping (ASC)",
         "Meta統合AI配信 (旧). 2025/02 から Advantage+ Sales にリブランド"),
        ("Advantage+ Sales",
         "Meta Sales目的の統合AI配信. 2025/02 リブランド + 多用途化"),
        ("Andromeda",
         "Meta配信ML世代 (2024末). 10,000x モデル複雑度, Quality +8%"),
        ("AEM",
         "Aggregated Event Measurement. iOSの差分プライバシー計測 (Meta)"),
        ("AI Max for Search",
         "Google検索広告のAI拡張層 (2025/05). DSA置換予定"),
        ("ATT",
         "App Tracking Transparency (Apple). 2021/04~ iOS計測シグナル減"),
        ("Bid Strategy",
         "入札戦略. tCPA/tROAS/MaxConv等"),
        ("BrandConnect",
         "YouTube公式クリエイター連携プログラム"),
    ]
    _glossary_page(prs, "用語集 (1/3) : A - B", items, 2)


def p233_glossary_b(prs):
    items = [
        ("CAPI",
         "Conversion API. サーバーサイド計測の業界標準"),
        ("Consent Mode v2",
         "Google同意管理. EEA 2024/03 義務化"),
        ("CDP",
         "Customer Data Platform. 1PD統合配信プラットフォーム"),
        ("Customer Match",
         "顧客リスト広告連携. 全媒体で標準機能"),
        ("DDA",
         "Data-Driven Attribution. ML基盤のCV配分. GA4/GAds標準"),
        ("Demand Gen",
         "Google需要喚起型 (2023/10 Discovery統合)"),
        ("EMQ",
         "Event Match Quality. CAPI送信品質スコア (Meta)"),
        ("Enhanced\nConversions",
         "Google拡張CV. ハッシュ化1PDで計測補強"),
    ]
    _glossary_page(prs, "用語集 (2/3) : C - E", items, 3)


def p234_glossary_c(prs):
    items = [
        ("GEO",
         "Generative Engine Optimization. LLM検索向け最適化"),
        ("Lift Test",
         "Conversion / Brand / Search Lift. Incremental効果測定"),
        ("Meridian",
         "Google MMM (2024 OSS). Python/Bayesian"),
        ("MMM",
         "Media Mix Modeling. 統計モデルで媒体貢献推定"),
        ("PMax",
         "Performance Max. Google統合AI配信"),
        ("Privacy Sandbox",
         "Google Cookie代替案. 2025/10/17 大半廃止"),
        ("Robyn",
         "Meta MMM (2023 OSS). R/Ridge回帰"),
        ("SGTM",
         "Server-side GTM. 計測タグをサーバーで処理"),
        ("Smart+",
         "TikTok完全自動化キャンペーン (2024/10)"),
        ("Symphony",
         "TikTok生成AIスイート (Creative Studio)"),
        ("Spark Ads",
         "TikTok UGC型広告. オーガニック投稿を広告化"),
        ("Talk Head View",
         "LINE予約型動画広告. ホーム最上部"),
    ]
    s = blank(prs)
    page_frame(s, prs, "用語集 (3/3) : G - T", "2024-2026 業界用語集",
               pagenum(4))
    # 12 items in 4x3 grid
    top = Inches(1.45)
    w = Inches(2.95)
    h = Inches(1.05)
    gap_x = Inches(0.1)
    gap_y = Inches(0.1)
    for i, (term, body) in enumerate(items):
        r, c = divmod(i, 4)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.08), h, fill=ORANGE)
        add_text(s, term, x + Inches(0.2), y + Inches(0.1),
                 w - Inches(0.3), Inches(0.35),
                 size=11, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), y + Inches(0.45),
                 w - Inches(0.3), Inches(0.55),
                 size=9, color=TEXT, line_spacing=1.4)
    footer(s, prs)


def p235_tools_ai(prs):
    s = blank(prs)
    page_frame(s, prs, "主要ツール比較 : AI生成系",
               "コピー / 画像 / 動画 のおすすめ", pagenum(5))
    # Table
    headers = ["カテゴリ", "ツール", "月額(目安)", "用途"]
    col_x = [Inches(0.6), Inches(2.5), Inches(7.0), Inches(9.5)]
    col_w = [Inches(1.85), Inches(4.45), Inches(2.45), Inches(3.3)]
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.5),
             fill=NAVY)
    for i, h in enumerate(headers):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(1.62),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)

    rows = [
        ("コピー", "ChatGPT (GPT-5/o4)", "$20", "汎用 / 広告コピー"),
        ("コピー", "Claude (Opus 4.7/Sonnet 4.6)", "$20",
         "長文/分析/Computer Use"),
        ("コピー", "Gemini (2.5 Ultra/Pro)", "$20",
         "Workspace連携 / Google Ads連携"),
        ("コピー", "Jasper", "$49〜", "ブランドボイス保持"),
        ("コピー", "Anyword", "$49〜", "予測スコア+量産"),
        ("画像", "Midjourney v7", "$10〜120", "高品質汎用"),
        ("画像", "DALL-E (ChatGPT内)", "$20", "ChatGPTで会話的"),
        ("画像", "Adobe Firefly", "$10〜", "商用利用安心"),
        ("動画", "Sora 2 (ChatGPT Pro)", "$200", "高品質60秒対応"),
        ("動画", "Veo 3 (Vertex AI)", "従量課金", "Google連携"),
        ("動画", "Runway Gen-4", "$15〜95", "細かい制御"),
        ("動画", "Luma Dream Machine", "$10〜100", "コスパ高速"),
    ]
    row_h = Inches(0.4)
    for i, row in enumerate(rows):
        y = Inches(2.0) + row_h * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), row_h,
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            color = NAVY if j == 0 else (ORANGE if j == 2 else TEXT)
            add_text(s, cell, col_x[j] + Inches(0.15),
                     y + Inches(0.1),
                     col_w[j] - Inches(0.2), Inches(0.3),
                     size=10, bold=(j == 0),
                     color=color,
                     font=EN_FONT if j == 1 or j == 2 else JP_FONT)
    footer(s, prs)


def p236_tools_ops(prs):
    s = blank(prs)
    page_frame(s, prs, "主要ツール比較 : 運用系",
               "媒体運用支援ツール", pagenum(6))
    headers = ["カテゴリ", "ツール", "月額(目安)", "用途"]
    col_x = [Inches(0.6), Inches(2.5), Inches(7.0), Inches(9.5)]
    col_w = [Inches(1.85), Inches(4.45), Inches(2.45), Inches(3.3)]
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.5),
             fill=NAVY)
    for i, h in enumerate(headers):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(1.62),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)

    rows = [
        ("運用統合", "Skai (旧Kenshoo)", "Enterprise",
         "全媒体一元管理 / 大型代理店"),
        ("運用統合", "Marin Software", "中堅", "Search特化"),
        ("運用統合", "Optmyzr", "$208〜", "PMax深いインサイト"),
        ("Google Ads", "Adalysis", "$99〜", "Negative KW提案"),
        ("広告生成", "AdCreative.ai", "$29〜249", "10秒で広告生成"),
        ("広告生成", "Omneky", "$199〜",
         "クリエイティブ自動生成+配信"),
        ("広告生成", "Smartly.io", "Enterprise", "Meta統合"),
        ("計測予測", "Vidmob", "Enterprise", "動画スコアリング"),
        ("Agent", "Claude Computer Use", "Pro $20", "管理画面操作"),
        ("Agent", "OpenAI Operator", "Pro $200", "Webタスク完遂"),
        ("Agent", "Microsoft 365 Copilot", "$30", "Office内AI"),
    ]
    row_h = Inches(0.4)
    for i, row in enumerate(rows):
        y = Inches(2.0) + row_h * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), row_h,
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            color = NAVY if j == 0 else (ORANGE if j == 2 else TEXT)
            add_text(s, cell, col_x[j] + Inches(0.15),
                     y + Inches(0.1),
                     col_w[j] - Inches(0.2), Inches(0.3),
                     size=10, bold=(j == 0),
                     color=color,
                     font=EN_FONT if j == 1 or j == 2 else JP_FONT)
    footer(s, prs)


def p237_tools_measure(prs):
    s = blank(prs)
    page_frame(s, prs, "主要ツール比較 : 計測系",
               "計測・分析・MMM ツール", pagenum(7))
    headers = ["カテゴリ", "ツール", "月額(目安)", "用途"]
    col_x = [Inches(0.6), Inches(2.5), Inches(7.0), Inches(9.5)]
    col_w = [Inches(1.85), Inches(4.45), Inches(2.45), Inches(3.3)]
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(0.5),
             fill=NAVY)
    for i, h in enumerate(headers):
        add_text(s, h, col_x[i] + Inches(0.15), Inches(1.62),
                 col_w[i] - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE)

    rows = [
        ("分析", "GA4", "無料", "標準アクセス解析"),
        ("分析", "Looker Studio", "無料", "BIダッシュボード"),
        ("分析", "BigQuery", "従量課金", "GA4データ深掘り"),
        ("分析", "Adobe Analytics", "Enterprise",
         "エンタープライズ向け"),
        ("CMP", "Cookiebot", "€9〜", "中小〜中堅向けCMP"),
        ("CMP", "OneTrust", "Enterprise", "エンタープライズCMP"),
        ("CMP", "usercentrics", "€39〜", "ドイツ系GDPR完全準拠"),
        ("SGTM", "Cloudflare Workers", "数百円〜", "コスパ最強"),
        ("SGTM", "Google Cloud Run", "$120〜", "公式推奨"),
        ("SGTM", "Stape.io", "$20〜200", "マネージドSGTM"),
        ("MMM", "Meta Robyn (OSS)", "無料", "R/Ridge回帰"),
        ("MMM", "Google Meridian (OSS)", "無料",
         "Python/Bayesian"),
    ]
    row_h = Inches(0.4)
    for i, row in enumerate(rows):
        y = Inches(2.0) + row_h * i
        bg = LIGHT if i % 2 == 0 else WHITE
        add_rect(s, Inches(0.6), y, Inches(12.15), row_h,
                 fill=bg, line=LIGHT_GRAY)
        for j, cell in enumerate(row):
            color = NAVY if j == 0 else (ORANGE if j == 2 else TEXT)
            add_text(s, cell, col_x[j] + Inches(0.15),
                     y + Inches(0.1),
                     col_w[j] - Inches(0.2), Inches(0.3),
                     size=10, bold=(j == 0),
                     color=color,
                     font=EN_FONT if j == 1 or j == 2 else JP_FONT)
    footer(s, prs)


def p238_sources_en(prs):
    s = blank(prs)
    page_frame(s, prs, "情報源リスト : 英語サイト",
               "週次でチェックすべき媒体", pagenum(8))
    sources = [
        ("Search Engine Land",
         "searchengineland.com",
         "Google Ads / SEO の総合ニュース\nDDA / AI Max / PMax 詳細解説"),
        ("Marketing Land",
         "martech.org",
         "Marketing Tech 全般\n大手媒体ニュース統合"),
        ("AdAge",
         "adage.com",
         "広告業界ビジネスニュース\n代理店動向 / マーケット情報"),
        ("Adweek",
         "adweek.com",
         "広告クリエイティブ + 業界\nブランディングニュース中心"),
        ("Digiday",
         "digiday.com",
         "DSP / Programmatic / リテールメディア\n業界深掘り記事多い"),
        ("Social Media Today",
         "socialmediatoday.com",
         "Meta / TikTok / X / LinkedIn\n媒体アップデート速報"),
        ("Think with Google",
         "thinkwithgoogle.com",
         "Google公式マーケティングブログ\nデータ + ベストプラクティス"),
        ("Meta for Business",
         "facebook.com/business",
         "Meta公式アップデート\nAdvantage+ / Andromeda 等"),
    ]
    top = Inches(1.55)
    w = Inches(5.95)
    h = Inches(1.25)
    gap_x = Inches(0.2)
    gap_y = Inches(0.1)
    for i, (name, url, desc) in enumerate(sources):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, name, x + Inches(0.25), y + Inches(0.1),
                 w - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, url, x + Inches(0.25), y + Inches(0.4),
                 w - Inches(0.4), Inches(0.3),
                 size=9, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, desc, x + Inches(0.25), y + Inches(0.7),
                 w - Inches(0.4), Inches(0.5),
                 size=9, color=TEXT, line_spacing=1.5)
    footer(s, prs)


def p239_sources_jp(prs):
    s = blank(prs)
    page_frame(s, prs, "情報源リスト : 日本語サイト",
               "日本市場特化のキャッチアップ媒体",
               pagenum(9))
    sources = [
        ("日経XTREND",
         "xtrend.nikkei.com",
         "日本マーケティング総合\nLINEヤフー統合等の深掘り解説"),
        ("MarkeZine",
         "markezine.jp",
         "業界ニュース + 事例\n副業・代理店動向"),
        ("Web担当者Forum",
         "webtan.impress.co.jp",
         "Web マーケティング全般\n初心者向け解説豊富"),
        ("ITmedia マーケティング",
         "marketing.itmedia.co.jp",
         "B2B + Tech系マーケ\nDX / SaaS 領域強い"),
        ("AdverTimes",
         "advertimes.com",
         "宣伝会議系媒体\nブランディング + 代理店"),
        ("MERCI", "marketingnative.jp",
         "クリエイター視点の業界記事\n若手向け"),
        ("CARTA HOLDINGS",
         "cartaholdings.co.jp",
         "デジタル広告統計\n業界調査レポート"),
        ("電通報",
         "dentsu-ho.com",
         "電通公式メディア\n年次広告費レポート"),
    ]
    top = Inches(1.55)
    w = Inches(5.95)
    h = Inches(1.25)
    gap_x = Inches(0.2)
    gap_y = Inches(0.1)
    for i, (name, url, desc) in enumerate(sources):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, name, x + Inches(0.25), y + Inches(0.1),
                 w - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, url, x + Inches(0.25), y + Inches(0.4),
                 w - Inches(0.4), Inches(0.3),
                 size=9, bold=True, color=ORANGE_DARK, font=EN_FONT)
        add_text(s, desc, x + Inches(0.25), y + Inches(0.7),
                 w - Inches(0.4), Inches(0.5),
                 size=9, color=TEXT, line_spacing=1.5)
    footer(s, prs)


def p240_prompts(prs):
    s = blank(prs)
    page_frame(s, prs, "プロンプト集 : 即利用可能な5本",
               "Part 5-B のテンプレ + 短縮版", pagenum(10))
    prompts = [
        ("戦略立案",
         "新規案件の戦略を AI と作る (Part 5-B P199)"),
        ("クリエイティブブリーフ",
         "Midjourney / Sora 用ブリーフ生成 (Part 5-B P200)"),
        ("月次レポート要約",
         "数字データから自然言語要約 (Part 5-B P201)"),
        ("Negative KW 提案",
         "Search Terms 分析 (Part 5-B P202)"),
        ("競合LP分析",
         "競合5サイトを Claude に貼って共通要素+差別化要素抽出"),
    ]
    top = Inches(1.55)
    h = Inches(1.0)
    gap = Inches(0.15)
    for i, (name, body) in enumerate(prompts):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.15), h, fill=ORANGE)
        add_text(s, f"#{i+1}", Inches(0.95), y + Inches(0.15),
                 Inches(0.6), Inches(0.6),
                 size=24, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, name, Inches(1.7), y + Inches(0.15),
                 Inches(11), Inches(0.4),
                 size=14, bold=True, color=NAVY)
        add_text(s, body, Inches(1.7), y + Inches(0.55),
                 Inches(11), Inches(0.4),
                 size=11, color=TEXT, line_spacing=1.5)
    footer(s, prs)


def p241_faq_a(prs):
    s = blank(prs)
    page_frame(s, prs, "クライアント FAQ (1/2)",
               "副業代行で頻出される質問+回答",
               pagenum(11))
    faqs = [
        ("Q. なぜ Last Click ROI ではダメ?",
         "A. AI配信の貢献を過小評価するため。DDA + Incremental ROAS で見るのが2026標準"),
        ("Q. PMax は何が良いのか?",
         "A. 全在庫横断のAI最適化。手動運用より配信効率が高く、運用工数も削減"),
        ("Q. Cookie廃止になったのでは?",
         "A. 2024/07撤回 + 2025/10 Privacy Sandbox 終了で Chromeに無期限残存"),
        ("Q. AI生成した広告は問題ない?",
         "A. 商用利用OKツール (Firefly等) なら安心。実在人物・既存IPは禁止"),
        ("Q. 月予算 30万円でも代行依頼できる?",
         "A. はい。SMB Tier (代行料3-5万円固定) で対応可能"),
    ]
    top = Inches(1.5)
    h = Inches(1.05)
    gap = Inches(0.05)
    for i, (q, a) in enumerate(faqs):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.1), h, fill=ORANGE)
        add_text(s, q, Inches(0.85), y + Inches(0.13),
                 Inches(11.5), Inches(0.4),
                 size=12, bold=True, color=NAVY)
        add_text(s, a, Inches(0.85), y + Inches(0.55),
                 Inches(11.5), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p242_faq_b(prs):
    s = blank(prs)
    page_frame(s, prs, "クライアント FAQ (2/2)",
               "応用編", pagenum(12))
    faqs = [
        ("Q. ステマ規制って何?",
         "A. 2023/10/01施行. 事業者の表示で広告判別困難なものが規制対象. PR表記必須"),
        ("Q. Lift Test と A/Bテスト の違いは?",
         "A. A/Bテスト=配信内バリエーション比較. Lift Test=広告接触vs非接触のCV率比較"),
        ("Q. LINEヤフー広告 = いつから?",
         "A. 2026年春から統合スタート. 既存Yahoo!広告ユーザーは自動移行"),
        ("Q. TikTok Shop ってどう活用?",
         "A. 2025/06 日本ローンチ. EC案件は Shop Ads で動画→購入直結が可能"),
        ("Q. AIエージェント運用は安全?",
         "A. L1観察 + L2提案は実用段階. L3実行 (予算変更等) は人間承認必須"),
    ]
    top = Inches(1.5)
    h = Inches(1.05)
    gap = Inches(0.05)
    for i, (q, a) in enumerate(faqs):
        y = top + (h + gap) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(0.1), h, fill=ORANGE)
        add_text(s, q, Inches(0.85), y + Inches(0.13),
                 Inches(11.5), Inches(0.4),
                 size=12, bold=True, color=NAVY)
        add_text(s, a, Inches(0.85), y + Inches(0.55),
                 Inches(11.5), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p243_checklist(prs):
    s = blank(prs)
    page_frame(s, prs, "副業復帰チェックリスト",
               "学んだことの自分用 30項目チェック",
               pagenum(13))
    items = [
        "Cookie 廃止撤回 (2024/07) + Privacy Sandbox 終了 (2025/10) を理解",
        "GA4 イベントベース計測の思想 を理解",
        "SGTM + CAPI のハイブリッド構成 を実装可能",
        "Enhanced Conversions 設定 + Customer Match 連携",
        "Consent Mode v2 + CMP 導入手順 を把握",
        "PMax の統制術 (Audience Signal / Negative / Brand Exclusions) を理解",
        "Advantage+ Sales (旧ASC) リブランドを把握",
        "Andromeda 配信ML世代を理解",
        "TikTok Smart+ + Symphony Creative Studio の活用法",
        "AI Max for Search (2025/05) の機能と DSA置換予定",
        "DDA (Data-Driven Attribution) を全媒体で標準採用",
        "Conversion Lift Test を月次で提案可能",
        "Brand Lift Study の4指標を説明可能",
        "MMM (Robyn / Meridian) の概要を説明可能",
        "ChatGPT/Claude/Gemini の使い分け を理解",
        "Midjourney + Sora 2 で 1案件分のクリエイティブ量産可",
        "Symphony Creative Studio で TikTok 動画自動生成",
        "Agent型運用 (Claude Computer Use等) の3レイヤー理解",
        "AI Analytics (GA4 Insights / Conversational) を活用可",
        "プロンプトテンプレ (戦略/ブリーフ/レポート/Neg KW) を保有",
        "ステマ規制 (2023/10/01) の事業者責任を理解",
        "EU DSA (2024/02/17) と日本配信時の影響を把握",
        "LINEヤフー広告統合 (2026春) のクライアント説明可",
        "Tier 1 (SMB) で月3-5万円の代行料設定可能",
        "30日プラン (Day0-3 / 3-5 / 5-7 / Wk2-4) で進行可能",
        "L3 (HP制作+広告運用初月10万円) を96時間納品可能",
        "BigQuery + Looker Studio でレポート効率化",
        "業界情報源 (英語/日本語) を週次でチェック",
        "Lift Test 結果から Incremental ROAS を提示可能",
        "1人で月10-15案件並行 が可能なワークフロー確立",
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(0.5)
    gap_x = Inches(0.1)
    gap_y = Inches(0.05)
    for i, item in enumerate(items):
        r, c = divmod(i, 3)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, "☐", x + Inches(0.15), y + Inches(0.1),
                 Inches(0.3), Inches(0.3),
                 size=14, color=ORANGE)
        add_text(s, item, x + Inches(0.45), y + Inches(0.15),
                 w - Inches(0.55), Inches(0.3),
                 size=8, color=TEXT, line_spacing=1.4)
    footer(s, prs)


def p244_subscription_costs(prs):
    s = blank(prs)
    page_frame(s, prs, "AI ツール / サブスク 月額一覧",
               "副業代行で必須 + 任意のサブスク",
               pagenum(14))
    # Two columns: Essential / Optional
    add_text(s, "✓ 必須サブスク (推定月額 US$70)",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=ORANGE)
    add_rect(s, Inches(0.6), Inches(1.95), Inches(6), Inches(0.015),
             fill=LIGHT_GRAY)
    essential = [
        ("ChatGPT Plus", "$20/月", "コピー / 分析 / DALL-E"),
        ("Claude Pro", "$20/月", "Computer Use / 長文"),
        ("Midjourney Standard", "$30/月", "画像量産"),
        ("Cookiebot 等 CMP", "€9〜/月",
         "Consent Mode v2 (クライアント側)"),
    ]
    for i, (name, cost, body) in enumerate(essential):
        y = Inches(2.15) + Inches(0.6) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.55),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, name, Inches(0.8), y + Inches(0.08),
                 Inches(2.8), Inches(0.3),
                 size=11, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, cost, Inches(3.7), y + Inches(0.1),
                 Inches(1.5), Inches(0.3),
                 size=11, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, body, Inches(0.8), y + Inches(0.32),
                 Inches(5.5), Inches(0.25),
                 size=9, color=MID_GRAY)

    # Optional
    add_text(s, "⊙ 任意サブスク (案件規模で判断)",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(7.0), Inches(1.95), Inches(5.75), Inches(0.015),
             fill=LIGHT_GRAY)
    optional = [
        ("ChatGPT Pro (Sora 2)", "$200/月", "動画量産月のみ"),
        ("Adobe CC + Firefly", "$60/月", "高単価案件用"),
        ("Optmyzr", "$208/月", "月20案件以上"),
        ("Adalysis", "$99/月", "Google Ads 中心"),
        ("AdCreative.ai", "$29〜", "中規模以上"),
    ]
    for i, (name, cost, body) in enumerate(optional):
        y = Inches(2.15) + Inches(0.6) * i
        add_rect(s, Inches(7.0), y, Inches(5.75), Inches(0.55),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, name, Inches(7.2), y + Inches(0.08),
                 Inches(2.8), Inches(0.3),
                 size=11, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, cost, Inches(10.2), y + Inches(0.1),
                 Inches(1.5), Inches(0.3),
                 size=11, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, body, Inches(7.2), y + Inches(0.32),
                 Inches(5.3), Inches(0.25),
                 size=9, color=MID_GRAY)

    # Cost summary
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=NAVY, radius=True)
    add_text(s, "💰 副業代行のサブスク総額目安",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• ミニマム (月3-5案件) : 必須のみ = 月 US$70 程度 (約11,000円)\n"
             "• 中規模 (月10-15案件) : 必須 + Optmyzr/Adalysis = 月 US$170-300 (約26,000-46,000円)\n"
             "• フル装備 (月15案件以上 + 動画) : 月 US$400-500 (約60,000-75,000円)\n"
             "• 1案件あたりサブスクコスト = ミニマムで2,000-3,000円程度。代行料3-5万円で十分ペイ",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p245_complete(prs):
    s = blank(prs)
    # Full background
    add_rect(s, 0, 0, prs.slide_width, prs.slide_height, fill=NAVY)
    add_rect(s, 0, 0, prs.slide_width, Inches(0.08), fill=ORANGE)

    # Title
    add_text(s, "🎉 完成", Inches(1.0), Inches(0.8), Inches(11), Inches(1.0),
             size=48, bold=True, color=ORANGE,
             align=PP_ALIGN.CENTER, font=EN_FONT)
    add_text(s, "Digital Marketing Catch-Up 2023 → 2026",
             Inches(1.0), Inches(1.85), Inches(11), Inches(0.7),
             size=28, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER)
    add_rect(s, Inches(2.0), Inches(2.7), Inches(9.3), Inches(0.015),
             fill=ORANGE)

    # Stats
    stats = [
        ("245p", "総ページ数"),
        ("8 Part", "章構成"),
        ("9媒体", "媒体別カバー"),
        ("2.5年", "ブランク埋め"),
    ]
    top = Inches(3.05)
    w = Inches(2.95)
    h = Inches(1.55)
    gap = Inches(0.1)
    for i, (val, label) in enumerate(stats):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=NAVY_DARK, radius=True)
        add_rect(s, x, top, Inches(0.1), h, fill=ORANGE)
        add_text(s, val, x, top + Inches(0.25),
                 w, Inches(0.7),
                 size=36, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, label, x, top + Inches(1.0),
                 w, Inches(0.4),
                 size=12, color=LIGHT_GRAY,
                 align=PP_ALIGN.CENTER)

    # Closing message
    add_rect(s, Inches(1.0), Inches(5.0), Inches(11.33), Inches(1.5),
             fill=ORANGE, radius=True)
    add_text(s, "副業復帰の準備が整いました",
             Inches(1.0), Inches(5.2), Inches(11.33), Inches(0.45),
             size=20, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER)
    add_text(s,
             "Part 6 鉄板運用メソッド + Part 7 BSA L3 実装ガイドで\n"
             "新規案件を即受注 → 30日完遂可能",
             Inches(1.0), Inches(5.65), Inches(11.33), Inches(0.85),
             size=12, color=WHITE,
             align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Footer
    add_text(s, "Created : 2026-04-25  /  工藤陸 (内部資料)",
             Inches(1.0), Inches(6.7), Inches(11.33), Inches(0.3),
             size=10, color=LIGHT_GRAY,
             align=PP_ALIGN.CENTER)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p231_divider(prs)
    p232_glossary_a(prs)
    p233_glossary_b(prs)
    p234_glossary_c(prs)
    p235_tools_ai(prs)
    p236_tools_ops(prs)
    p237_tools_measure(prs)
    p238_sources_en(prs)
    p239_sources_jp(prs)
    p240_prompts(prs)
    p241_faq_a(prs)
    p242_faq_b(prs)
    p243_checklist(prs)
    p244_subscription_costs(prs)
    p245_complete(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
