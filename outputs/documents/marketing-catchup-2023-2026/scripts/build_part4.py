#!/usr/bin/env python3
"""Build Part 4 計測・データ基盤の激変 (25p, P141-P165)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part4.pptx"
PNUM_BASE = 140


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p141_divider(prs):
    part_divider(
        prs, 4, "計測・データ基盤の激変",
        "Cookie終焉時代の計測標準は CAPI / SGTM / 1PD",
        "GA4移行後の現代、サーバーサイドが標準。MMM の復活、Incrementality Test の民主化、\n"
        "Identity Solutions の台頭、AI Analytics への移行 — 運用代行で『計測ができる人』が価値を持つ時代",
        [
            "計測パラダイム TL;DR",
            "GA4 完全移行後",
            "GA4 2024-2026 update",
            "SGTM (Server-side GTM)",
            "CAPI 全媒体標準化",
            "Enhanced Conv / AEM",
            "Consent Mode v2 + CMP",
            "First-Party Data 戦略",
            "CDP の進化",
            "MMM の復活",
            "Robyn / Meridian",
            "Incrementality Test",
            "Conversion / Brand Lift",
            "Identity Solutions",
            "Looker / BigQuery",
            "Clean Rooms",
            "AI Analytics",
            "副業代行 計測ベスプラ",
        ],
    )


def p142_tldr(prs):
    s = blank(prs)
    page_frame(s, prs, "計測パラダイムの変化 TL;DR",
               "2023年9月 → 2026年4月 / 5つの大変化",
               pagenum(2))
    points = [
        ("01", "ブラウザ計測 → サーバーサイド計測へ",
         "iOS/ATT / ITP / Cookie制限により Pixel単独では計測ロス -30〜50%。\n"
         "SGTM + CAPI / Enhanced Conversions / Events API がハイブリッド標準"),
        ("02", "ラストクリック → DDA / Incrementality へ",
         "Data-Driven Attribution (DDA) がGoogle/GA4 デフォルト (2022~)。\n"
         "Conversion Lift Test が民主化、Incremental ROAS で意思決定"),
        ("03", "MMM が復活 (Robyn / Meridian の民主化)",
         "Meta Robyn (R/Ridge) + Google Meridian (Python/Bayesian) のオープンソース。\n"
         "中小ブランドでも MMMで Cross-channel 評価可能に"),
        ("04", "Identity Solutions の台頭",
         "Cookieless計測の柱として UID2.0 / RampID / Privacy Sandbox 等。\n"
         "ただし 2025/10 Privacy Sandbox 終了で勢力図が再編"),
        ("05", "AI Analytics への移行",
         "GA4 Insights (AI 自動分析)、Looker AI、Conversational Analytics。\n"
         "『SQLわからない人でもクリック分析』時代に"),
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


def p143_ga4_post_migration(prs):
    s = blank(prs)
    page_frame(s, prs, "GA4 完全移行後の現在地",
               "UA終了 (2023/07/01) → GA4が事実上唯一の標準",
               pagenum(3))
    # Migration timeline
    add_text(s, "GA4 移行のタイムライン",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    timeline = [
        ("2020/10", "GA4 リリース (β)"),
        ("2022/03", "UA → GA4 移行アナウンス"),
        ("2023/07/01", "UA データ収集停止"),
        ("2024/07/01", "UA 完全廃止 (データアクセス不可)"),
        ("2024-2026", "GA4 機能強化期間 (Insights / Predictive)"),
    ]
    top = Inches(2.0)
    for i, (date, body) in enumerate(timeline):
        y = top + Inches(0.55) * i
        add_rect(s, Inches(0.6), y, Inches(12.15), Inches(0.45),
                 fill=LIGHT if i % 2 == 0 else WHITE,
                 line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(0.6), y, Inches(2.0), Inches(0.45),
                 fill=NAVY)
        add_text(s, date, Inches(0.6), y + Inches(0.1),
                 Inches(2.0), Inches(0.3),
                 size=11, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, Inches(2.85), y + Inches(0.13),
                 Inches(9), Inches(0.3),
                 size=11, color=TEXT)

    # GA4 vs UA
    add_rect(s, Inches(0.6), Inches(5.0), Inches(12.15), Inches(1.95),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 GA4 と UA の根本的な違い",
             Inches(0.85), Inches(5.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 計測モデル : セッションベース → イベントベース\n"
             "• データモデル : ヒット型 → エンティティ型 (User / Session / Event)\n"
             "• クロスデバイス : Cookie前提 → User-ID + Signals (PII不要)\n"
             "• データ保持 : 14ヶ月制限 (GA4 360 は 50ヶ月) / BigQuery エクスポートで永久保存\n"
             "• レポート : 標準レポート減 / カスタムExploration が中心",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p144_ga4_updates(prs):
    s = blank(prs)
    page_frame(s, prs, "GA4 2024-2026 アップデート",
               "AI Insights + Predictive + BigQuery 統合",
               pagenum(4))
    updates = [
        ("AI Insights",
         "自動異常検知 + 解釈",
         "AIが日次でデータ異常を検知し\n"
         "『なぜ起きたか』を自然言語で解説\n"
         "GA4 ホーム画面で表示"),
        ("Predictive Audiences",
         "購入予測 / 離脱予測",
         "MLで7日購入見込みユーザー /\n"
         "離脱見込みユーザーを自動セグメント\n"
         "Google Adsへ自動連携"),
        ("Conversational Analytics",
         "自然言語でデータ分析",
         "Gemini連携で『先月の売上は?』\n"
         "等の質問に自然言語で回答\n"
         "GA4内の新UI"),
        ("Enhanced Measurement",
         "標準で多くを自動計測",
         "PageView / Scroll / Outbound Click /\n"
         "Site Search / Video等が自動取得\n"
         "実装工数を削減"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(updates):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.05),
                 w - Inches(0.4), Inches(1.6),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で GA4 を活用するシナリオ",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 初回ヒアリング : GA4 設置・Enhanced Measurement・eコマース計測の状況確認\n"
             "• Predictive Audiences を Google Ads にimport → 高LTV / Churn対策に活用\n"
             "• Conversational Analytics でクライアント向けレポート作成を効率化\n"
             "• BigQuery export を有効化 → Looker Studio で自由設計のダッシュボード\n"
             "• AI Insights で月次の異常検知を自動化、レポートに添付",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p145_event_based(prs):
    s = blank(prs)
    page_frame(s, prs, "イベントベース計測の思想",
               "GA4の根幹 : すべてが『イベント』",
               pagenum(5))
    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "GA4ではユーザー行動 (PageView / Scroll / Click / Purchase等) すべてを『イベント』として記録。\n"
             "イベント名 + パラメータ (key-value) の柔軟なスキーマで、計測したいものを定義できる",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 categories
    categories = [
        ("自動計測イベント",
         "GA4が自動で取得",
         "page_view / first_visit /\nuser_engagement / session_start"),
        ("拡張計測イベント",
         "Enhanced Measurement で取得",
         "scroll / click / video_play /\nfile_download / view_search_results"),
        ("推奨イベント",
         "業種別の名前付き",
         "EC: purchase / add_to_cart\nリード: generate_lead / signup"),
        ("カスタムイベント",
         "独自定義",
         "業種固有のCV (例: 内見申込)\nGTM/gtag で実装"),
    ]
    top = Inches(2.7)
    w = Inches(2.95)
    h = Inches(2.5)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(categories):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.7), fill=ORANGE)
        add_text(s, cat, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.4),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.15), top + Inches(0.55),
                 w - Inches(0.3), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.0),
                 w - Inches(0.4), Inches(1.4),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55, font=EN_FONT)

    # Tip
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のイベント設計",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 初期実装 : Enhanced Measurement ON で大半カバー\n"
             "• EC : 推奨イベントの eコマースセット (purchase / view_item / begin_checkout 等) を完備\n"
             "• リード/問合せ : 推奨イベント generate_lead と カスタムイベント (例: 資料DL) の組合せ",
             Inches(0.85), Inches(5.95), Inches(12), Inches(0.95),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p146_sgtm(prs):
    s = blank(prs)
    page_frame(s, prs, "SGTM (Server-side GTM) 全貌",
               "計測タグをサーバーで発火する標準構成",
               pagenum(6))
    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Server-side Google Tag Manager : ブラウザのGTMコンテナを\n"
             "クラウドサーバー (GCP / AWS / Cloudflare等) に置き、計測タグをサーバーで処理する構成",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 benefits
    benefits = [
        ("計測精度向上",
         "ITP/ATT/Cookie制限を\nバイパスし計測ロス削減"),
        ("ページパフォーマンス",
         "ブラウザのJSタグ削減で\nLCP/FID/CLS が改善"),
        ("データガバナンス",
         "サーバーで PII を除去\nプライバシー保護"),
        ("マルチタグ統合",
         "GA4 / GAds / Meta CAPI 等\nを一元管理"),
    ]
    top = Inches(2.7)
    w = Inches(2.95)
    h = Inches(2.0)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(benefits):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(1.2),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.55)

    # Note
    add_rect(s, Inches(0.6), Inches(4.95), Inches(12.15), Inches(2.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で SGTM を導入する判断基準",
             Inches(0.85), Inches(5.1), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月予算 50万円以上のクライアント = SGTM 導入検討推奨\n"
             "• Cloudflare Workers なら月100円〜で開始可能、Google Cloud Run でも月1,000円程度\n"
             "• 計測ロスが大きい (Safari割合高い) サイトでは効果絶大\n"
             "• 副業代行スイートスポット : 月予算100万以上 + iOS率 50%以上 のEC案件",
             Inches(0.85), Inches(5.45), Inches(12), Inches(1.45),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p147_sgtm_paths(prs):
    s = blank(prs)
    page_frame(s, prs, "SGTM 実装パス3つ",
               "ホスティング先の選択", pagenum(7))
    paths = [
        ("Google Cloud Run",
         "公式推奨 / GCP",
         "Google公式マニュアル完備\n"
         "1サーバー約US$120/月\n"
         "2026 Always Free 範囲拡大"),
        ("Cloudflare Workers",
         "コスパ最強",
         "月100円〜で開始可\n"
         "エッジ配信で高速\n"
         "GTM公式テンプレートあり"),
        ("Stape.io / DataLayer.io",
         "マネージドサービス",
         "セットアップ済 SGTM\n"
         "月US$20-200程度\n"
         "副業代行で利用増"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(paths):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else (ORANGE if i == 1 else NAVY_SOFT))
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Comparison
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行のおすすめ",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月予算 50万 - 200万 のクライアント = Cloudflare Workers (コスパ最強・SSL/TLS含む)\n"
             "• 月予算 200万円以上 + GCP既に利用 = Google Cloud Run (公式マニュアル充実)\n"
             "• 副業代行で工数削減したい = Stape.io 等のマネージドサービス\n"
             "• 学習目的 = Cloudflare無料枠 (1日 100,000リクエスト) で実験",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p148_capi(prs):
    s = blank(prs)
    page_frame(s, prs, "CAPI (Conversion API) 全媒体標準化",
               "サーバーサイド計測の業界デファクト",
               pagenum(8))
    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "iOS/ATT・ITP・Cookie制限で Pixel単独 -30〜50% の計測ロス。\n"
             "CAPI 実装で Event Match Quality (EMQ) 向上 → 配信精度・CV復元が劇的改善",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Media support
    add_text(s, "CAPI 対応媒体 (2026年現在)",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)

    media = [
        ("Meta", "Conversion API\n+ CAPI Gateway", ORANGE),
        ("TikTok", "Events API\n+ Server-side", ORANGE),
        ("Google", "Enhanced Conv\n+ EC for Leads", NAVY),
        ("LINE", "Conversion API\n2024〜", ORANGE),
        ("X (Twitter)", "Conversion API\nWeb + App", NAVY),
        ("Pinterest", "Conversions API\n+ Pixel", NAVY),
        ("Snap", "CAPI\n+ Pixel", NAVY),
        ("LinkedIn", "Conversions API\n2024〜", NAVY),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(1.05)
    gap_x = Inches(0.1)
    gap_y = Inches(0.1)
    for i, (name, desc, color) in enumerate(media):
        r, c = divmod(i, 4)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=color)
        add_text(s, name, x + Inches(0.25), y + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=13, bold=True, color=NAVY)
        add_text(s, desc, x + Inches(0.25), y + Inches(0.45),
                 w - Inches(0.4), Inches(0.55),
                 size=10, color=TEXT, line_spacing=1.4)

    # Note
    add_text(s,
             "💡 SGTM経由で全媒体の CAPI を一元実装 = 工数最大削減 + 重複排除も簡潔",
             Inches(0.6), Inches(5.6), Inches(12), Inches(1.35),
             size=11, bold=True, color=NAVY)
    footer(s, prs)


def p149_enhanced_aem(prs):
    s = blank(prs)
    page_frame(s, prs, "Enhanced Conversions (Google) + AEM (Meta)",
               "ハッシュ化1PDで計測補強する2大手法",
               pagenum(9))
    methods = [
        ("Google Enhanced Conversions",
         "Web / Leads",
         "CV発生時のEmail/電話を\n"
         "ハッシュ化してGoogleへ送信。\n"
         "Cookie計測ロスを補完。\n"
         "+5〜15% の CV復元事例多数"),
        ("Meta AEM",
         "Aggregated Event Measurement",
         "iOS 14.5以降のATTオプトアウトユーザー向け。\n"
         "8つの優先イベントを設定し、\n"
         "上位優先度CVを差分プライバシーで集約。\n"
         "EC: Purchase最優先が定石"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(methods):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=NAVY if i == 0 else ORANGE)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=15, bold=True, color=WHITE, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(2.3),
                 size=11, color=TEXT, line_spacing=1.6)

    # Implementation tip
    add_rect(s, Inches(0.6), Inches(5.25), Inches(12.15), Inches(1.7),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行 : 必須 + デフォルト実装",
             Inches(0.85), Inches(5.4), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Enhanced Conversions = Google Ads配信があれば必須実装 (ON にするだけで効果)\n"
             "• AEM = Meta配信 + iOS集客比率高い案件で 8イベント優先順位を業種別に設計\n"
             "• ハッシュ化処理 = SGTM経由で実装、PII処理を一元化",
             Inches(0.85), Inches(5.75), Inches(12), Inches(1.15),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p150_consent_mode_cmp(prs):
    s = blank(prs)
    page_frame(s, prs, "Consent Mode v2 + CMP の実装",
               "EEA義務化 (2024/03) → グローバル標準化",
               pagenum(10))
    # 4 consent params recap
    add_text(s, "4つの同意パラメータ",
             Inches(0.6), Inches(1.55), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    params = [
        ("ad_storage", "広告Cookie使用"),
        ("ad_user_data", "ユーザーデータの共有"),
        ("ad_personalization", "広告パーソナライズ"),
        ("analytics_storage", "分析Cookie使用"),
    ]
    top = Inches(2.0)
    w = Inches(2.95)
    h = Inches(1.0)
    gap = Inches(0.1)
    for i, (key, label) in enumerate(params):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, Inches(0.1), h, fill=ORANGE)
        add_text(s, key, x + Inches(0.25), top + Inches(0.15),
                 w - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=NAVY, font=EN_FONT)
        add_text(s, label, x + Inches(0.25), top + Inches(0.55),
                 w - Inches(0.4), Inches(0.4),
                 size=10, color=TEXT)

    # CMP comparison
    add_text(s, "主要 CMP (Consent Management Platform)",
             Inches(0.6), Inches(3.25), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    cmps = [
        ("Cookiebot",
         "中小〜中堅向け",
         "月€9〜  /  日本語UI"),
        ("OneTrust",
         "エンタープライズ",
         "高機能 / 高価格 (要見積)"),
        ("usercentrics",
         "ドイツ系統合",
         "GDPR完全準拠 / 月€39〜"),
        ("TrustArc",
         "米国エンタープライズ",
         "プライバシーガバナンス特化"),
    ]
    top2 = Inches(3.7)
    for i, (name, fit, price) in enumerate(cmps):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top2, w, Inches(1.55),
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top2, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top2 + Inches(0.25),
                 w - Inches(0.4), Inches(0.35),
                 size=13, bold=True, color=NAVY)
        add_text(s, fit, x + Inches(0.2), top2 + Inches(0.65),
                 w - Inches(0.4), Inches(0.3),
                 size=10, bold=True, color=ORANGE_DARK)
        add_text(s, price, x + Inches(0.2), top2 + Inches(1.0),
                 w - Inches(0.4), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.45)

    # Tip
    add_text(s,
             "💡 副業代行 : 中小は Cookiebot がコスパ最強。月€9〜で完備、設定30分",
             Inches(0.6), Inches(5.5), Inches(12), Inches(0.3),
             size=11, bold=True, color=NAVY)
    footer(s, prs)


def p151_first_party_data(prs):
    s = blank(prs)
    page_frame(s, prs, "First-Party Data (1PD) 戦略",
               "Cookieに頼らない自社データ資産",
               pagenum(11))
    # 4 sources
    sources = [
        ("CRM データ",
         "顧客リスト / 購買履歴",
         "Customer Match (Google/Meta)\nLookalike のシード\nLTV予測の基盤"),
        ("Web行動データ",
         "GA4 / 1st Party Cookie",
         "サイト内導線・離脱・CV\nファネル分析の素材\nリマーケティング元"),
        ("メール/LINE 行動",
         "開封・クリック・購読",
         "メルマガ / LINE公式の行動\nセグメント別配信\n友だちステータス"),
        ("オフライン行動",
         "POS / 来店 / コール",
         "オフラインCV取り込み\nOffline Conversion Import\nMMM のインプット"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(sources):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=ORANGE,
                 align=PP_ALIGN.CENTER)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行 : 1PD 整備の優先順位",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. Customer Match = 全クライアントで CRM顧客リストを月次アップロード\n"
             "2. Enhanced Conversions / AEM = ハッシュ化1PDで計測補強\n"
             "3. Lookalike = Customer Match をシードに新規獲得\n"
             "4. Offline CV Import = 来店・電話・商談クローズなど Web外の行動を取り込み\n"
             "5. CDP導入 = 月予算500万以上の中規模以上で検討 (Treasure Data / Tealium / Segment 等)",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p152_cdp(prs):
    s = blank(prs)
    page_frame(s, prs, "Customer Data Platform (CDP) の進化",
               "1PDの統合・セグメント・配信を一元化",
               pagenum(12))
    # What it is
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "CDP : 顧客の Web / アプリ / オフライン行動を統合した『顧客マスター』を作り、\n"
             "セグメント化 → 配信先 (広告 / メール / LINE等) に一元配信するプラットフォーム",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 major players
    players = [
        ("Treasure Data", "日本でシェア1位\n大手企業向け"),
        ("Segment (Twilio)", "開発者向け\nグローバル標準"),
        ("Tealium", "エンタープライズ\nグローバル展開"),
        ("HubSpot", "中堅向け\nMA/CRM一体型"),
    ]
    top = Inches(2.7)
    w = Inches(2.95)
    h = Inches(1.4)
    gap = Inches(0.1)
    for i, (name, body) in enumerate(players):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.4),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, body, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.65),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Light CDP alternative
    add_rect(s, Inches(0.6), Inches(4.4), Inches(12.15), Inches(2.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 中小予算でCDPの代替手段 (Light-CDP)",
             Inches(0.85), Inches(4.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• GA4 + BigQuery + Google Ads = 無料で 簡易CDP相当 (1PDの統合・セグメント化)\n"
             "• Shopify + Klaviyo / KARTE = ECならCDP込みのMA で運用可能\n"
             "• Notion / Airtable + Zapier = 案件規模が小さい時はノーコード組合せ\n"
             "• 副業代行 : 月予算100万円以下のクライアントでは CDP導入は不要、Light-CDPで十分\n"
             "• 月予算500万円以上 = Treasure Data / Segment 等の本格CDP導入を提案",
             Inches(0.85), Inches(4.9), Inches(12), Inches(2.0),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p153_mmm_revival(prs):
    s = blank(prs)
    page_frame(s, prs, "🔥 MMM (Media Mix Modeling) の復活",
               "ラストクリック計測崩壊の反動として民主化",
               pagenum(13))
    # Context
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "MMM : 統計モデルで広告予算と売上の関係を推定し、媒体別の貢献度・最適配分を求める。\n"
             "Cookie計測の限界 + Cross-channel計測の難しさへの対策として 2023-2026 で再評価",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # Why now
    add_text(s, "なぜ今MMMが復活したか",
             Inches(0.6), Inches(2.65), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    reasons = [
        ("計測シグナル減少",
         "ATT / Cookie制限 / 規制でラストクリック計測が信頼できない"),
        ("Cross-channel評価",
         "Google / Meta / TV / OOH を横断評価する手段が他にない"),
        ("オープンソース化",
         "Robyn (Meta) / Meridian (Google) で技術的ハードル激減"),
        ("中小ブランドにも到達",
         "数千万円予算のブランドでも MMM運用が現実的に"),
    ]
    top = Inches(3.1)
    w = Inches(5.95)
    h = Inches(0.95)
    gap_x = Inches(0.2)
    gap_y = Inches(0.1)
    for i, (head, body) in enumerate(reasons):
        r, c = divmod(i, 2)
        x = Inches(0.6) + (w + gap_x) * c
        y = top + (h + gap_y) * r
        add_rect(s, x, y, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, y, Inches(0.1), h, fill=ORANGE)
        add_text(s, head, x + Inches(0.25), y + Inches(0.12),
                 w - Inches(0.4), Inches(0.35),
                 size=12, bold=True, color=NAVY)
        add_text(s, body, x + Inches(0.25), y + Inches(0.5),
                 w - Inches(0.4), Inches(0.4),
                 size=10, color=TEXT, line_spacing=1.45)

    # Note
    add_rect(s, Inches(0.6), Inches(5.4), Inches(12.15), Inches(1.55),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で MMM を提案するシナリオ",
             Inches(0.85), Inches(5.55), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月予算 500万円以上 + 複数媒体運用 = MMMで予算配分の精度が劇的向上\n"
             "• 大型キャンペーン (TV CM併用等) = MMMで TV と デジタルの相互効果を測定\n"
             "• 単独媒体だけ = MMM不要、Conversion Lift Test で十分",
             Inches(0.85), Inches(5.9), Inches(12), Inches(1.0),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p154_robyn_meridian(prs):
    s = blank(prs)
    page_frame(s, prs, "Meta Robyn vs Google Meridian",
               "オープンソース MMM 2大プラットフォーム",
               pagenum(14))
    tools = [
        ("Meta Robyn",
         "R言語 / Ridge Regression",
         "・2023〜オープンソース化\n"
         "・R に慣れた統計家・データサイエンティスト向け\n"
         "・Ridge回帰で多重共線性に強い\n"
         "・Meta Pixelデータと相性良"),
        ("Google Meridian",
         "Python / Bayesian Regression",
         "・2024年 オープンソース化\n"
         "・Python (マーケター・開発者に親和性)\n"
         "・Bayesian で不確実性を扱える\n"
         "・Geo-level data + YouTube reach/freq対応"),
    ]
    top = Inches(1.55)
    w = Inches(6.0)
    h = Inches(3.6)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85),
                 fill=ORANGE if i == 0 else NAVY)
        add_text(s, name, x + Inches(0.3), top + Inches(0.18),
                 w - Inches(0.6), Inches(0.45),
                 size=16, bold=True, color=WHITE, font=EN_FONT)
        add_text(s, sub, x + Inches(0.3), top + Inches(0.6),
                 w - Inches(0.6), Inches(0.3),
                 size=11, color=WHITE, font=EN_FONT)
        add_text(s, body, x + Inches(0.3), top + Inches(1.1),
                 w - Inches(0.6), Inches(2.4),
                 size=11, color=TEXT, line_spacing=1.65)

    # Recommendation
    add_rect(s, Inches(0.6), Inches(5.35), Inches(12.15), Inches(1.6),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 どちらを選ぶか",
             Inches(0.85), Inches(5.5), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• Google Ads / GA4 / YouTube中心 = Meridian (統合がスムーズ)\n"
             "• Meta中心 / 既にRエンジニア在籍 = Robyn\n"
             "• 副業代行 : Pythonの方が使える人が多いので Meridian がおすすめ\n"
             "• 商用版 = Nielsen / Analytic Partners / MarketShare 等が高機能版を提供 (大型予算向け)",
             Inches(0.85), Inches(5.85), Inches(12), Inches(1.05),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p155_incrementality(prs):
    s = blank(prs)
    page_frame(s, prs, "Incrementality Testing 標準化",
               "『広告がなければ起きなかったCV』を測る",
               pagenum(15))
    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "ユーザーをランダムに Test (広告配信) と Control (非配信) 群に分け、CV発生率の差を計測。\n"
             "オーガニック / 既存顧客 / 自然流入を排除した『純増分』を見極める",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 approaches
    approaches = [
        ("媒体内 Lift Test",
         "Meta / Google / TikTok",
         "媒体公式機能\n無料で利用可\nGeoでなくUserベース"),
        ("Geo Lift Test",
         "地域別広告非配信",
         "ある地域で配信停止し売上比較\nTV CM の効果測定にも使う\n商用ツール (Geolift / Noogata) も"),
        ("Switchback Test",
         "時間帯別配信",
         "時間帯で配信ON/OFFを切替\n比較。\n短期の検証に向く"),
    ]
    top = Inches(2.7)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(approaches):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=WHITE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(5.45), Inches(12.15), Inches(1.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のアプローチ",
             Inches(0.85), Inches(5.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月予算100万円以上のクライアントは媒体内 Lift Test を月次で実施 (無料)\n"
             "• Incremental ROAS をクライアントレポートに必須記載 → 信頼性飛躍\n"
             "• Geo Test は数百万予算以上 + TVCM併用ブランドで提案",
             Inches(0.85), Inches(5.95), Inches(12), Inches(0.95),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p156_lift_studies(prs):
    s = blank(prs)
    page_frame(s, prs, "Conversion / Brand / Search Lift Studies",
               "媒体公式の3大Lift Test", pagenum(16))
    studies = [
        ("Conversion Lift",
         "Incremental CV測定",
         "配信群と非配信群でCV率比較\n下流CV (購入/リード)"),
        ("Brand Lift",
         "認知・想起・購入意向",
         "アンケートで認知系指標を測定\nMeta / Google YouTube / TikTok"),
        ("Search Lift",
         "ブランド検索の上昇",
         "広告接触群と非接触群で\nブランド検索数比較\nGoogle YouTube独自"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(studies):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=ORANGE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)

    # Use cases
    add_text(s, "目的別の使い分け",
             Inches(0.6), Inches(4.3), Inches(12), Inches(0.4),
             size=13, bold=True, color=NAVY)
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(0.015),
             fill=LIGHT_GRAY)
    cases = [
        ("CV系/EC", "Conversion Lift (Meta/Google) で Incremental ROAS"),
        ("ブランディング", "Brand Lift Study で認知系4指標"),
        ("YouTube認知", "Brand Lift + Search Lift で『認知 → 検索』導線確認"),
        ("予算最適化", "上記+ MMM で全体配分検証"),
    ]
    for i, (cat, body) in enumerate(cases):
        y = Inches(4.9) + Inches(0.42) * i
        add_text(s, "▸", Inches(0.7), y, Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, cat, Inches(1.0), y + Inches(0.02),
                 Inches(2.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, body, Inches(3.5), y + Inches(0.02),
                 Inches(9), Inches(0.3),
                 size=11, color=TEXT)
    footer(s, prs)


def p157_cookieless(prs):
    s = blank(prs)
    page_frame(s, prs, "Cookieless 計測の現代",
               "Privacy Sandbox 終了後の現実解",
               pagenum(17))
    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=WARN, radius=True)
    add_text(s, "🔥 重要な事実",
             Inches(0.85), Inches(1.65), Inches(11), Inches(0.4),
             size=14, bold=True, color=WHITE)
    add_text(s,
             "Privacy Sandbox 大半の技術は 2025/10/17 に廃止。\n"
             "3rd Party Cookie は Chrome に無期限残存 — しかし業界は『Cookieless前提』に既に移行済",
             Inches(0.85), Inches(2.05), Inches(12), Inches(0.7),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 alternatives
    alternatives = [
        ("1st Party Cookie",
         "ITP/ATTでも残る\n自社ドメインのCookie"),
        ("Hashed PII",
         "Email/電話のSHA-256\nCustomer Match / EMQ"),
        ("Probabilistic ID",
         "デバイス指紋・行動から\n推定 (UID2.0 / RampID)"),
        ("Modeling",
         "MLで配信効果推定\nConsent Mode / DDA"),
    ]
    top = Inches(3.1)
    w = Inches(2.95)
    h = Inches(1.85)
    gap = Inches(0.1)
    for i, (cat, body) in enumerate(alternatives):
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
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行で実装する優先順位",
             Inches(0.85), Inches(5.3), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "1. 1st Party Cookie前提のセットアップ (GA4 + GTM/SGTM)\n"
             "2. Hashed PII (Customer Match / Enhanced Conversions / EMQ) を全媒体で\n"
             "3. Modeling (Consent Mode v2 + DDA + 媒体ML) で計測ロスをカバー\n"
             "4. Probabilistic ID は B2B / 大型予算で検討、Privacy Sandbox 終了後は限定的",
             Inches(0.85), Inches(5.65), Inches(12), Inches(1.25),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p158_identity(prs):
    s = blank(prs)
    page_frame(s, prs, "Identity Solutions の現在",
               "UID2.0 / RampID 等のCookieless ID",
               pagenum(18))
    solutions = [
        ("UID 2.0",
         "The Trade Desk主導",
         "Email/電話 (ハッシュ化) ベース\n"
         "オープンソース / 業界標準目指す\n"
         "OpenPath / The Current で標準化"),
        ("RampID",
         "LiveRamp",
         "AbiliTec ベースの統合ID\n"
         "プライバシー安全な統合\n"
         "DSP / DMP との連携豊富"),
        ("ID5",
         "Cookieless ID 専業",
         "Privacy-first ID\nDeterministic + Probabilistic\n"
         "EU市場でシェア高い"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(solutions):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, name, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=WHITE, font=EN_FONT)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行で押さえる現実",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 中小予算では Identity Solutions 直接利用は不要 (Customer Match / Lookalikeで十分)\n"
             "• 月予算 1,000万以上の大型 Programmatic 案件で UID2.0 / RampID 導入検討\n"
             "• 日本市場ではまだ普及中、Yahoo!JAPAN の Yahoo!ID (≒ LINEヤフー ID) が事実上の主流\n"
             "• 2026年は Privacy Sandbox 終了後の再編期、注視は必要だが緊急性低",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p159_looker(prs):
    s = blank(prs)
    page_frame(s, prs, "Looker Studio (旧Data Studio) の進化",
               "BIツールから AI Analytics プラットフォームへ",
               pagenum(19))
    # 4 features
    features = [
        ("Looker Studio",
         "無料BIツール",
         "Google Ads / GA4 / BigQuery /\nSpreadsheet 等を可視化\n副業代行レポート定番"),
        ("Looker Studio Pro",
         "エンタープライズ版",
         "Looker (元エンタープライズBI) と統合\n組織管理 / カスタマイズ\nGoogle Cloud 連携強化"),
        ("Conversational Analytics",
         "Gemini連携で自然言語",
         "『今月の流入元別CV数は?』\n等の質問に自動回答\nダッシュボード自動生成"),
        ("AI Insights",
         "異常検知 + 解釈",
         "ダッシュボード上で\nMLが異常データを検知\n自然言語でなぜを解説"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(features):
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
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 副業代行のレポート構成",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月次レポートは Looker Studio (無料) で自動更新ダッシュボード\n"
             "• テンプレート化 : KGI / KPI / 媒体別パフォーマンス / クリエイティブ別 の4セクション\n"
             "• Conversational Analytics でクライアントが自分で深掘り → 副業代行の負荷削減\n"
             "• Looker Studio + AI Insights = 異常検知をスケジュール送信、メールで通知",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p160_bigquery(prs):
    s = blank(prs)
    page_frame(s, prs, "BigQuery 連携 — GA4 → BigQuery",
               "中規模以上の必須スキル", pagenum(20))
    # Why BigQuery
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "GA4 のEvent データを BigQuery に自動エクスポート (無料機能)。\n"
             "GA4 UI上の制限 (14ヶ月保持・Sampling・カスタム集計) を完全に回避できる",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 use cases
    cases = [
        ("無制限データ保持",
         "GA4 14ヶ月制限を超えた\n長期分析 (年比較等)"),
        ("カスタム集計",
         "GA4 UIで不可能な\nSQLによる自由集計"),
        ("Cross-channel統合",
         "GA4 + GAds + Meta /\nオフラインCV 統合"),
        ("MLモデル連携",
         "BigQuery ML / Vertex AI\nで予測モデル構築"),
    ]
    top = Inches(2.7)
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

    # Cost
    add_rect(s, Inches(0.6), Inches(4.95), Inches(12.15), Inches(2.0),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 BigQuery のコスト感",
             Inches(0.85), Inches(5.1), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• ストレージ : 月10GB無料、それ以上は約 US$0.02/GB/月 (中小規模なら月数百円)\n"
             "• クエリ実行 : 月1TB無料、それ以上は約 US$5/TB (適切に設計すれば負担小)\n"
             "• 副業代行 : 月予算300万円以上のクライアントで GA4 → BigQuery を有効化\n"
             "• Looker Studio から直接BigQuery参照可能 → SQL書ければ自由設計可能",
             Inches(0.85), Inches(5.45), Inches(12), Inches(1.45),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p161_clean_rooms(prs):
    s = blank(prs)
    page_frame(s, prs, "Clean Rooms — プライバシー安全なデータ協業",
               "AMC / Ads Data Hub / Habu / LiveRamp等",
               pagenum(21))
    # Concept
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.0),
             fill=NAVY, radius=True)
    add_text(s,
             "Clean Room : 複数組織のデータを統合分析できる プライバシー安全な環境。\n"
             "個人特定不可な集約データのみを出力 → GDPR/CCPA等の規制下でも合法",
             Inches(0.85), Inches(1.65), Inches(12), Inches(0.8),
             size=12, color=WHITE, line_spacing=1.5)

    # 4 major clean rooms
    rooms = [
        ("Amazon Marketing Cloud",
         "Amazon広告主向け\n12.5ヶ月のevent-level\n2026 No-code化"),
        ("Google Ads Data Hub",
         "Google広告主向け\nBigQuery基盤\nエンタープライズ"),
        ("Habu",
         "中立Clean Room\n複数Walled Garden統合\nメタCDP的"),
        ("LiveRamp Safe Haven",
         "RampID統合\nFortune 500主導\nリテールメディア対応"),
    ]
    top = Inches(2.7)
    w = Inches(2.95)
    h = Inches(2.2)
    gap = Inches(0.1)
    for i, (name, body) in enumerate(rooms):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.12), fill=ORANGE)
        add_text(s, name, x + Inches(0.2), top + Inches(0.25),
                 w - Inches(0.4), Inches(0.5),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.25)
        add_text(s, body, x + Inches(0.2), top + Inches(0.85),
                 w - Inches(0.4), Inches(1.3),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_text(s,
             "💡 中小予算 (月1,000万円未満) では Clean Room 直接利用は対象外。Amazon AMC のNo-code化が最初の入口に",
             Inches(0.6), Inches(5.15), Inches(12), Inches(1.8),
             size=11, color=NAVY, line_spacing=1.55)
    footer(s, prs)


def p162_privacy_computation(prs):
    s = blank(prs)
    page_frame(s, prs, "Privacy-Preserving Computation",
               "差分プライバシー・連邦学習・MPC",
               pagenum(22))
    techs = [
        ("Differential Privacy",
         "差分プライバシー",
         "個人特定不可なノイズを加算\n統計値は保持しつつ匿名化\nGoogle / Apple が標準採用"),
        ("Federated Learning",
         "連邦学習",
         "デバイス側でMLモデル訓練\nデータをサーバーに送らない\nGboard / Siri 等で実用"),
        ("Multi-Party Computation",
         "MPC (秘密計算)",
         "複数組織で暗号化データ計算\nClean Roomの基盤技術\nFinTech / Adtech で活用"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(3.0)
    gap = Inches(0.15)
    for i, (en, ja, body) in enumerate(techs):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, en, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.4),
                 size=14, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, ja, x + Inches(0.25), top + Inches(0.58),
                 w - Inches(0.4), Inches(0.3),
                 size=11, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.85),
                 size=11, color=TEXT, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.7), Inches(12.15), Inches(2.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 知識として持っておく程度でOK",
             Inches(0.85), Inches(4.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 副業代行レベルでは直接実装することは少ない (大手の専門領域)\n"
             "• 媒体プラットフォームの中で透過的に動作 (Meta AEM・Google Privacy Sandbox 等)\n"
             "• クライアントへの説明 : 『プライバシー安全な集約データで広告効果を測定可能』と知っておけば十分\n"
             "• 規制対応・大型クライアント向け説明資料に簡潔記載があると差別化",
             Inches(0.85), Inches(5.2), Inches(12), Inches(1.7),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p163_ai_analytics(prs):
    s = blank(prs)
    page_frame(s, prs, "AI in Analytics",
               "Conversational Analytics と Auto-Insights の時代",
               pagenum(23))
    tools = [
        ("GA4 Insights",
         "自動異常検知",
         "MLが日次データ異常を検知\n『なぜ』を自然言語で解説\nGA4ホーム画面で表示"),
        ("Looker Studio AI",
         "ダッシュボード上のAI",
         "Geminiでクエリ自動生成\nグラフ作成も自動化\n2025-2026 段階展開"),
        ("Conversational Analytics",
         "自然言語データ分析",
         "『先月の売上は?』等を\n自然言語で質問→回答\nSQLわからなくてもOK"),
        ("Adobe Analytics AI",
         "Marketo Engage統合",
         "顧客ジャーニー予測\nマルチチャネル統合分析\nエンタープライズ向け"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(tools):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=ORANGE)
        add_text(s, cat, x + Inches(0.2), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=13, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, sub, x + Inches(0.2), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "💡 副業代行のワークフロー革新",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• 月次レポート作成 = Conversational Analytics で要約 → Looker Studio で可視化\n"
             "• 異常検知 = GA4 Insights を月次レポートに添付 → 数字の意味づけまで自動\n"
             "• クライアントの『なぜ?』対応 = ダッシュボード上で自然言語質問可能に → 工数削減\n"
             "• 副業代行の差別化 : AI Analytics を駆使する人は1人でクライアント月10社以上対応可能に",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p164_playbook(prs):
    s = blank(prs)
    page_frame(s, prs, "副業代行 計測ベスプラ 30日プラン",
               "新規案件で計測基盤を整える",
               pagenum(24))
    steps = [
        ("Day 0-3 : 現状診断",
         [
             "GA4 / GTM / Pixel / CAPI 状況確認",
             "Consent Mode v2 / CMP 状況確認",
             "GA4 → BigQuery エクスポート確認",
             "重要CVイベントの定義リスト化",
         ]),
        ("Day 4-10 : 計測基盤整備",
         [
             "GA4 + Enhanced Measurement ON",
             "GTM経由で Pixel/CAPI 統合実装",
             "Customer Match リスト連携",
             "CMP導入 (Cookiebot等)",
         ]),
        ("Day 11-21 : 検証・最適化",
         [
             "EMQ 8/10 以上を確認",
             "DDA設定 + Last Click比較",
             "Looker Studio でレポート構築",
             "AI Insights / Conversational Analytics 設定",
         ]),
        ("Day 22-30 : 報告 + 提案",
         [
             "月次レポート (KGI/KPI/媒体別)",
             "Conversion Lift Test 提案",
             "MMM導入の判断 (月予算で)",
             "次月の検証計画",
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


def p165_pitfalls_summary(prs):
    s = blank(prs)
    page_frame(s, prs, "計測 pitfalls + Part 5 へ",
               "副業代行で計測ミスを防ぐ + 次章予告",
               pagenum(25))
    pitfalls = [
        ("Pixel 単独で運用",
         "iOS計測ロス -30〜50% → CAPI併用が現代の必須"),
        ("Last Click でレポート",
         "AI配信の貢献を過小評価 → DDA + Incremental ROAS"),
        ("Consent Mode 未実装",
         "EEA配信時に違法 + モデリング不可 → CMP導入即"),
        ("BigQuery未連携",
         "GA4 14ヶ月制限で長期分析不可 → GA4→BigQuery必ず有効化"),
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
    add_text(s, "NEXT →  Part 5  AI活用事例集 (40p, P166-P205)",
             Inches(0.85), Inches(4.55), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 5 で扱うトピック (40p) :\n"
             "• AIレイヤーマップ (生成 / 運用 / 予測 / 分析 / Agent)\n"
             "• クリエイティブ生成 (コピー / 画像 / 動画 / 広告特化ツール)\n"
             "• 運用自動化 (媒体ML / 外部運用ツール)\n"
             "• 予測・分析・Agent型広告運用\n"
             "• 副業運用者向けプロンプトテンプレ集\n\n"
             "Part 4 (計測 25p) で計測の土台ができた → Part 5 で AIで運用を加速する",
             Inches(0.85), Inches(5.05), Inches(12), Inches(1.85),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p141_divider(prs)
    p142_tldr(prs)
    p143_ga4_post_migration(prs)
    p144_ga4_updates(prs)
    p145_event_based(prs)
    p146_sgtm(prs)
    p147_sgtm_paths(prs)
    p148_capi(prs)
    p149_enhanced_aem(prs)
    p150_consent_mode_cmp(prs)
    p151_first_party_data(prs)
    p152_cdp(prs)
    p153_mmm_revival(prs)
    p154_robyn_meridian(prs)
    p155_incrementality(prs)
    p156_lift_studies(prs)
    p157_cookieless(prs)
    p158_identity(prs)
    p159_looker(prs)
    p160_bigquery(prs)
    p161_clean_rooms(prs)
    p162_privacy_computation(prs)
    p163_ai_analytics(prs)
    p164_playbook(prs)
    p165_pitfalls_summary(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
