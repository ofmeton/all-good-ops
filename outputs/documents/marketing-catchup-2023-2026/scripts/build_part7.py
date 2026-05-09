#!/usr/bin/env python3
"""Build Part 7 BSA L3 実装ガイド (10p, P221-P230)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _deck_lib import (ACCENT_BG, EN_FONT, JP_FONT, LIGHT, LIGHT_GRAY,
                       MID_GRAY, NAVY, NAVY_DARK, NAVY_SOFT, ORANGE, ORANGE_DARK,
                       SOFT_GRAY, SUCCESS, TEXT, WARN, WHITE, MSO_SHAPE, PP_ALIGN,
                       Emu, Inches, Pt, add_rect, add_shape, add_text,
                       blank, footer, new_presentation, page_frame,
                       part_divider)

OUTPUT = Path(__file__).resolve().parent.parent / "deck_part7.pptx"
PNUM_BASE = 220


def pagenum(local):
    return f"P{PNUM_BASE + local:02d} / 250"


def p221_divider(prs):
    part_divider(
        prs, 7, "BSA L3 実装ガイド",
        "Rapid LP + 広告運用初月セット / 100,000円 / 96時間",
        "BSA戦略 L3 商品 (HP制作 + 広告運用初月) を最初の30日で完遂するための実装ガイド。\n"
        "Part 1-6 の知識を BSA案件に直接落とし込んだ手順書。\n"
        "受注 → 96時間でLP納品 → 広告運用 30日 → レポート + 継続提案 まで",
        [
            "L3 商品定義 + 価値提案",
            "30日プラン 全体俯瞰",
            "Day 0-3 : ヒアリング+計測",
            "Day 3-5 : アカウント構築",
            "Day 5-7 : クリエイティブ制作",
            "Week 2 : Learning Phase",
            "Week 3 : 検証 + 最適化",
            "Week 4 : レポート + 継続提案",
            "価格・工数 + 詰まりポイント",
        ],
    )


def p222_l3_product(prs):
    s = blank(prs)
    page_frame(s, prs, "L3 商品定義 + 価値提案",
               "Rapid LP + 広告運用初月 = 10万円 / 96時間",
               pagenum(2))
    # Big stat
    add_rect(s, Inches(0.6), Inches(1.5), Inches(12.15), Inches(1.3),
             fill=NAVY, radius=True)
    add_text(s, "L3 商品概要 (BSA戦略)",
             Inches(0.85), Inches(1.65), Inches(11), Inches(0.4),
             size=14, bold=True, color=ORANGE)
    add_text(s,
             "Rapid Single LP 制作 + Google広告運用初月セット\n"
             "100,000円 / 96時間納品 (LP) + 30日運用 / SLA : 納期超過時 20%返金 or 翌日無料修正",
             Inches(0.85), Inches(2.0), Inches(12), Inches(0.75),
             size=12, color=WHITE, line_spacing=1.5)

    # 3 components
    components = [
        ("LP 制作",
         "96時間納品",
         "ヒアリング → デザイン →\n実装 → 公開まで\n96時間以内"),
        ("広告アカウント構築",
         "Google中心 + 必要時Meta",
         "計測タグ実装 +\nキャンペーン構造設計 +\nクリエイティブ初期投入"),
        ("運用30日",
         "Day 1-30",
         "Learning Phase + 最適化\n月次レポート +\n継続提案 (L3 → L1/L2へ)"),
    ]
    top = Inches(2.95)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (name, sub, body) in enumerate(components):
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
                 w - Inches(0.4), Inches(1.35),
                 size=11, color=TEXT, line_spacing=1.6)

    # Value prop
    add_rect(s, Inches(0.6), Inches(5.7), Inches(12.15), Inches(1.25),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 L3 の差別化価値",
             Inches(0.85), Inches(5.85), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• LP制作だけ ≠ 売上に直結しない / 広告だけ ≠ LP不適合で効率悪い\n"
             "• 『LP + 広告 + 運用』をワンストップで提供 → クライアントの実質ROI最大化\n"
             "• 96時間納品 + 30日運用 = 工務店等の中小企業オーナーには『驚きの早さ』",
             Inches(0.85), Inches(6.2), Inches(12), Inches(0.7),
             size=11, color=TEXT, line_spacing=1.55)
    footer(s, prs)


def p223_30day_overview(prs):
    s = blank(prs)
    page_frame(s, prs, "L3 30日プラン全体俯瞰",
               "受注 → 96h LP → 30日運用 → 継続提案",
               pagenum(3))
    phases = [
        ("Day 0-3",
         "ヒアリング+計測設計",
         "クライアントMTG\nLPワイヤー作成\nGA4/Tag設置"),
        ("Day 3-5",
         "LP実装+アカウント構築",
         "LP公開\nGoogle Ads構造設計\nCAPI/EC実装"),
        ("Day 5-7",
         "クリエイティブ制作",
         "AI生成 (Midjourney等)\n広告コピー生成\n配信開始"),
        ("Week 2",
         "Learning Phase",
         "予算 ±20% 安定運用\n素材週1追加\n中間チェック"),
        ("Week 3",
         "検証+最適化",
         "Lift Test 申請\nNeg KW 追加\nクリエイティブ入替"),
        ("Week 4",
         "レポート+継続提案",
         "月次レポート (AI活用)\n継続契約提案\n来月予算配分"),
    ]
    top = Inches(1.55)
    w = Inches(2.0)
    h = Inches(2.55)
    gap = Inches(0.05)
    for i, (day, name, body) in enumerate(phases):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55),
                 fill=ORANGE if i < 3 else NAVY)
        add_text(s, day, x + Inches(0.1), top + Inches(0.13),
                 w - Inches(0.2), Inches(0.3),
                 size=11, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.1), top + Inches(0.7),
                 w - Inches(0.2), Inches(0.5),
                 size=11, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.2)
        add_text(s, body, x + Inches(0.1), top + Inches(1.3),
                 w - Inches(0.2), Inches(1.2),
                 size=9, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.5)

    # Key milestones
    add_rect(s, Inches(0.6), Inches(4.3), Inches(12.15), Inches(2.65),
             fill=NAVY, radius=True)
    add_text(s, "📌 主要マイルストーン",
             Inches(0.85), Inches(4.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "Day 4 : LP公開 (96時間SLA厳守)\n"
             "Day 7 : 広告配信開始 (Google Ads)\n"
             "Day 14 : Learning Phase 突破 (CV30件以上目標)\n"
             "Day 21 : Lift Test 結果 + Optiscore 80%以上\n"
             "Day 30 : 月次レポート提出 + 継続契約提案 (L1 / L2 アップセル含む)\n\n"
             "💡 SLA違反時 = 料金20%返金 or 翌日以内無料修正 — 実務的には事前準備で防ぐ",
             Inches(0.85), Inches(4.8), Inches(12), Inches(2.1),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


def p224_day_0_3(prs):
    s = blank(prs)
    page_frame(s, prs, "Day 0-3 : ヒアリング + 計測設計",
               "クライアントMTG → ワイヤー → 計測準備",
               pagenum(4))
    tasks = [
        ("Day 0",
         "受注確定 + 初回MTG",
         "・契約書 + 入金確認\n・ヒアリングシート送付\n・キックオフMTG (1.5h)"),
        ("Day 1",
         "ヒアリング深掘り",
         "・商材詳細 / USP\n・ターゲット / 競合\n・KGI/KPI 合意"),
        ("Day 2",
         "LP ワイヤー + 設計",
         "・FV / セクション設計\n・コピーライティング\n・デザインカンプ"),
        ("Day 3",
         "計測基盤準備",
         "・GA4 アカウント\n・GTM コンテナ\n・ドメイン/サーバー"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.55)
    gap = Inches(0.1)
    for i, (day, name, body) in enumerate(tasks):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, day, x + Inches(0.15), top + Inches(0.13),
                 w - Inches(0.3), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.15), top + Inches(0.7),
                 w - Inches(0.3), Inches(0.45),
                 size=13, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER, line_spacing=1.25)
        add_text(s, body, x + Inches(0.15), top + Inches(1.25),
                 w - Inches(0.3), Inches(1.25),
                 size=10, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.7)

    # Hearing checklist
    add_rect(s, Inches(0.6), Inches(4.3), Inches(12.15), Inches(2.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "📋 ヒアリング必須項目 (Day 0-1)",
             Inches(0.85), Inches(4.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. 商材 : 何を売る? USP 3つ\n"
             "2. ターゲット : 年齢/性別/状況/関心\n"
             "3. KGI : 月間売上 / リード件数 目標\n"
             "4. 競合 : 主要競合 3社 (LP URL)\n"
             "5. 既存LP/Webサイト : URL + GA / 旧運用データ\n"
             "6. 既存顧客リスト : 件数 + 形式 (Customer Match 用)\n"
             "7. クリエイティブ素材 : 商品写真 / 動画 / ロゴ\n"
             "8. 予算 : 初月広告予算 + 想定継続予算",
             Inches(0.85), Inches(4.8), Inches(12), Inches(2.1),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p225_day_3_5(prs):
    s = blank(prs)
    page_frame(s, prs, "Day 3-5 : LP実装 + アカウント構築",
               "96h SLA を守りつつ広告基盤を整える",
               pagenum(5))
    # Two columns: LP実装 / アカウント構築
    add_text(s, "LP実装 (Day 3-4)",
             Inches(0.6), Inches(1.55), Inches(6), Inches(0.4),
             size=14, bold=True, color=ORANGE)
    add_text(s, "アカウント構築 (Day 4-5)",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=14, bold=True, color=NAVY)

    lp_tasks = [
        "デザインカンプ → 実装 (HTML/CSS/JS)",
        "レスポンシブ対応 (モバイル90%以上)",
        "フォーム / CTAボタン (Form to GA4)",
        "GA4 + GTM タグ実装",
        "公開 (Vercel等) + ドメイン設定",
        "テスト (CV / Tag / Pixel発火確認)",
    ]
    ad_tasks = [
        "Google Ads アカウント作成 / 招待",
        "Google Tag Manager + GA4 連携",
        "Conversion設定 (Purchase / Lead等)",
        "Enhanced Conversions 有効化",
        "Customer Match リストアップロード",
        "PMax + Search キャンペーン構造設計",
    ]
    for i, item in enumerate(lp_tasks):
        y = Inches(2.05) + Inches(0.45) * i
        add_rect(s, Inches(0.6), y, Inches(6), Inches(0.4),
                 fill=ACCENT_BG, line=LIGHT_GRAY, radius=True)
        add_text(s, "▸", Inches(0.8), y + Inches(0.08),
                 Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=ORANGE)
        add_text(s, item, Inches(1.1), y + Inches(0.1),
                 Inches(4.8), Inches(0.3),
                 size=10, color=TEXT)

    for i, item in enumerate(ad_tasks):
        y = Inches(2.05) + Inches(0.45) * i
        add_rect(s, Inches(7.0), y, Inches(5.85), Inches(0.4),
                 fill=LIGHT, line=LIGHT_GRAY, radius=True)
        add_text(s, "▸", Inches(7.2), y + Inches(0.08),
                 Inches(0.3), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, item, Inches(7.55), y + Inches(0.1),
                 Inches(5), Inches(0.3),
                 size=10, color=TEXT)

    # Note
    add_rect(s, Inches(0.6), Inches(5.0), Inches(12.15), Inches(1.95),
             fill=NAVY, radius=True)
    add_text(s, "💡 96h SLA 厳守のコツ",
             Inches(0.85), Inches(5.15), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "• LPテンプレート化 : Tailwind + Shadcn 等で骨組みを再利用、毎回ゼロから作らない\n"
             "• AI活用 : Claude/ChatGPT でコピー量産、Midjourney/Firefly で画像\n"
             "• Vercel デプロイ : git push → 自動公開で工数最小\n"
             "• Day 4 : LP仮公開 → クライアント確認 → Day 4 終わりまでに本公開\n"
             "• Day 5 : 広告アカウント構築 + テスト配信 (少額)、Day 7 で本格配信開始",
             Inches(0.85), Inches(5.5), Inches(12), Inches(1.4),
             size=11, color=WHITE, line_spacing=1.55)
    footer(s, prs)


def p226_day_5_7(prs):
    s = blank(prs)
    page_frame(s, prs, "Day 5-7 : クリエイティブ制作 (AI活用)",
               "AI で量産 + 媒体ネイティブ機能で拡張",
               pagenum(6))
    # Tasks
    tasks = [
        ("Day 5",
         "コピー量産",
         "ChatGPT/Claude で\n見出し30案 + 説明文10案\nクライアント承認"),
        ("Day 6",
         "画像量産",
         "Midjourney / Firefly で\n10-15本 (バナー/正方形)\nアスペクト比対応"),
        ("Day 7",
         "RSA / アセット投入",
         "Google Ads RSA で\n見出し15+説明4 完備\nアセット6種以上"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.5)
    gap = Inches(0.15)
    for i, (day, name, body) in enumerate(tasks):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.55), fill=ORANGE)
        add_text(s, day, x + Inches(0.2), top + Inches(0.13),
                 w - Inches(0.4), Inches(0.3),
                 size=12, bold=True, color=WHITE,
                 align=PP_ALIGN.CENTER, font=EN_FONT)
        add_text(s, name, x + Inches(0.2), top + Inches(0.7),
                 w - Inches(0.4), Inches(0.45),
                 size=14, bold=True, color=NAVY,
                 align=PP_ALIGN.CENTER)
        add_text(s, body, x + Inches(0.2), top + Inches(1.2),
                 w - Inches(0.4), Inches(1.25),
                 size=11, color=TEXT,
                 align=PP_ALIGN.CENTER, line_spacing=1.6)

    # AI utilization
    add_rect(s, Inches(0.6), Inches(4.3), Inches(12.15), Inches(2.65),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 L3 でのAI活用 鉄板パターン",
             Inches(0.85), Inches(4.45), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• ChatGPT/Claude (US$20/月) でコピー : 1案件あたり 10分で30案\n"
             "• Midjourney Standard ($30/月) で画像 : 1案件あたり 30分で15本\n"
             "• 全L3案件で共通利用 → AI ツール費 = 案件あたり数百円程度に\n"
             "• 上記で素材コスト削減分が利益率に直結 (デザイナー外注 5-10万円 → AI 数百円)\n"
             "• Day 7 配信開始時 = 初期素材としては十分、Week 2-3 で追加投入",
             Inches(0.85), Inches(4.8), Inches(12), Inches(2.1),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p227_week_2(prs):
    s = blank(prs)
    page_frame(s, prs, "Week 2 : Learning Phase",
               "AIを育てる8-14日 / 触らない強さ",
               pagenum(7))
    # 5 rules
    rules = [
        ("①", "予算は ±20% 以内", "学習リセット回避"),
        ("②", "目標CPA も ±20% 以内", "極端な値変更NG"),
        ("③", "アセット追加は週1回",
         "頻繁な変更で学習弱体"),
        ("④", "Negative KW は週末に",
         "Search Termsで判断"),
        ("⑤", "クライアント連絡は週次",
         "日次の数字反応はNG"),
    ]
    top = Inches(1.55)
    w = Inches(2.43)
    h = Inches(2.0)
    gap = Inches(0.05)
    for i, (no, head, body) in enumerate(rules):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_text(s, no, x + Inches(0.2), top + Inches(0.18),
                 Inches(0.5), Inches(0.6),
                 size=24, bold=True, color=ORANGE, font=EN_FONT)
        add_text(s, head, x + Inches(0.2), top + Inches(0.85),
                 w - Inches(0.4), Inches(0.55),
                 size=11, bold=True, color=NAVY, line_spacing=1.3)
        add_text(s, body, x + Inches(0.2), top + Inches(1.45),
                 w - Inches(0.4), Inches(0.5),
                 size=10, color=TEXT, line_spacing=1.45)

    # Daily check items
    add_rect(s, Inches(0.6), Inches(3.85), Inches(12.15), Inches(3.1),
             fill=NAVY, radius=True)
    add_text(s, "📋 Week 2 の日次チェック項目 (5分以内)",
             Inches(0.85), Inches(4.0), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE)
    add_text(s,
             "✓ 予算消化率 (適正範囲か / 異常な急減・急増ないか)\n"
             "✓ CV発生数 (週末に30件以上の見込みか)\n"
             "✓ Optiscore (大きく下がっていないか)\n"
             "✓ Search Terms (明らかに無駄な大量クエリないか)\n"
             "✓ Pixel/Tag 発火 (突然停止していないか)\n"
             "✓ 配信制限/エラー (Disapprovedな広告ないか)\n\n"
             "💡 異常がなければ何もしない (=正解)。Week 3で本格的な最適化を行う",
             Inches(0.85), Inches(4.4), Inches(12), Inches(2.45),
             size=11, color=WHITE, line_spacing=1.65)
    footer(s, prs)


def p228_week_3(prs):
    s = blank(prs)
    page_frame(s, prs, "Week 3 : 検証 + 最適化",
               "Lift Test + Negative KW + クリエイティブ入替",
               pagenum(8))
    actions = [
        ("Lift Test 申請",
         "媒体内 (Google/Meta)",
         "Conversion Lift で\nIncremental ROAS 測定\n申請後2週間で結果"),
        ("Search Terms 分析",
         "AI で無駄クエリ抽出",
         "Claude/ChatGPT に\nReportを貼って分析\nNegative KW 10-30件追加"),
        ("クリエイティブ Best/Low",
         "アセット入替",
         "Best 5本 → 強化版\nLow 5本 → 削除\n新規 3-5本 追加"),
        ("Optiscore 適用",
         "計測系から優先",
         "Enhanced Conv / DDA等\nの提案を適用\n予算系は慎重"),
    ]
    top = Inches(1.55)
    w = Inches(2.95)
    h = Inches(2.7)
    gap = Inches(0.1)
    for i, (cat, sub, body) in enumerate(actions):
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
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 Week 3 の優先順位",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "1. 計測精度向上 = Enhanced Conversions / Consent Mode v2 が未実装なら即適用\n"
             "2. 無駄削減 = Negative KW 一気に追加 (CV0クエリ + 関連性低クエリ)\n"
             "3. クリエイティブ強化 = Best パターンの強化版 + 新規訴求軸\n"
             "4. Lift Test 申請 = Week 4 の月次レポートに『Incremental ROAS』を載せるため\n"
             "5. 予算配分見直し = 媒体別ROIで微調整 (大きな変更は来月)",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p229_week_4(prs):
    s = blank(prs)
    page_frame(s, prs, "Week 4 : レポート + 継続提案",
               "L3 → L1/L2 へのアップセル", pagenum(9))
    # Sections
    sections = [
        ("月次レポート",
         "標準フォーマット",
         "・KGI/KPI ダッシュボード\n・媒体別パフォーマンス\n・Lift Test 結果\n・来月予算配分提案"),
        ("継続契約提案",
         "L3 → 継続運用へ",
         "・初月実績の数字根拠\n・3ヶ月運用での見込み数字\n・継続料金 (例: 月5万円〜)\n・契約条件 (3ヶ月ミニマム)"),
        ("アップセル提案",
         "L1 / L2 / 追加サービス",
         "・追加LP制作 (L1)\n・複数ページサイト (L2)\n・SNS運用 / SEO対策\n・MMM等の高単価サービス"),
    ]
    top = Inches(1.55)
    w = Inches(3.95)
    h = Inches(2.7)
    gap = Inches(0.15)
    for i, (cat, sub, body) in enumerate(sections):
        x = Inches(0.6) + (w + gap) * i
        add_rect(s, x, top, w, h, fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, x, top, w, Inches(0.85), fill=NAVY)
        add_text(s, cat, x + Inches(0.25), top + Inches(0.18),
                 w - Inches(0.4), Inches(0.45),
                 size=15, bold=True, color=ORANGE)
        add_text(s, sub, x + Inches(0.25), top + Inches(0.6),
                 w - Inches(0.4), Inches(0.3),
                 size=10, color=WHITE)
        add_text(s, body, x + Inches(0.25), top + Inches(1.1),
                 w - Inches(0.4), Inches(1.55),
                 size=11, color=TEXT, line_spacing=1.65)

    # Note
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=ACCENT_BG, radius=True)
    add_text(s, "💡 L3 受注 → 継続率を上げる工夫",
             Inches(0.85), Inches(4.6), Inches(11), Inches(0.35),
             size=12, bold=True, color=ORANGE_DARK)
    add_text(s,
             "• 月次レポートで『Incremental ROAS』を必ず提示 (Lift Test結果)\n"
             "• 来月の具体アクション3つ + 期待数字を明示 (継続したくなる動機)\n"
             "• L3 (10万) → 継続 (月5-7万) で ARPU 確保 + 安定収益化\n"
             "• 高単価アップセル = MMM / Brand Lift / 専門ツール導入 等の差別化要素\n"
             "• 副業代行で月10案件継続 = 月50-70万円の安定収益基盤",
             Inches(0.85), Inches(4.95), Inches(12), Inches(1.95),
             size=11, color=TEXT, line_spacing=1.6)
    footer(s, prs)


def p230_pitfalls(prs):
    s = blank(prs)
    page_frame(s, prs, "L3 価格・工数のリアル + 詰まりポイント集",
               "副業代行で『L3 あるある』を防ぐ + Part 8 へ",
               pagenum(10))
    # Cost reality
    add_rect(s, Inches(0.6), Inches(1.5), Inches(5.95), Inches(2.6),
             fill=NAVY, radius=True)
    add_text(s, "💰 L3 1案件のコスト+利益試算",
             Inches(0.85), Inches(1.6), Inches(5.5), Inches(0.3),
             size=11, bold=True, color=ORANGE)
    add_text(s,
             "■ 売上 : 10万円 (L3 商品)\n"
             "■ コスト :\n"
             "  ・AIツール : 約1,000円\n"
             "  ・サーバー (Vercel等) : 0円\n"
             "  ・自分の人件費 (20h × 5,000円) : 10万円\n"
             "■ 初月粗利 : 約マイナス1,000円〜0円\n"
             "■ 継続契約 : 月5万円 = 安定収益基盤\n"
             "→ L3 単発は薄利、継続化が事業の肝",
             Inches(0.85), Inches(1.95), Inches(5.5), Inches(2.1),
             size=10, color=WHITE, line_spacing=1.4)

    # Pitfalls
    add_text(s, "⚠ 詰まりポイント TOP5",
             Inches(7.0), Inches(1.55), Inches(6), Inches(0.4),
             size=13, bold=True, color=WARN)
    pitfalls = [
        ("96h SLA超過", "テンプレ化+AI活用で工数圧縮"),
        ("計測未実装で配信", "Day 3で必ずテスト発火確認"),
        ("Learning Phase妨害", "Week 2は触らない徹底"),
        ("継続提案を Week 4最終日に",
         "Week 3から準備、Day 28-30で提案"),
        ("素材不足で停滞",
         "Day 5-7に多めに量産、Week 3用も"),
    ]
    top = Inches(2.0)
    h = Inches(0.42)
    gap = Inches(0.05)
    for i, (mistake, fix) in enumerate(pitfalls):
        y = top + (h + gap) * i
        add_rect(s, Inches(7.0), y, Inches(5.85), h,
                 fill=WHITE, line=LIGHT_GRAY, radius=True)
        add_rect(s, Inches(7.0), y, Inches(0.08), h, fill=WARN)
        add_text(s, mistake, Inches(7.2), y + Inches(0.06),
                 Inches(2.5), Inches(0.3),
                 size=11, bold=True, color=NAVY)
        add_text(s, fix, Inches(9.8), y + Inches(0.08),
                 Inches(3.0), Inches(0.3),
                 size=9, color=MID_GRAY)

    # Next chapter
    add_rect(s, Inches(0.6), Inches(4.45), Inches(12.15), Inches(2.5),
             fill=NAVY, radius=True)
    add_text(s, "NEXT →  Part 8 付録 (15p, P231-P245)",
             Inches(0.85), Inches(4.6), Inches(12), Inches(0.45),
             size=18, bold=True, color=ORANGE, font=EN_FONT)
    add_text(s,
             "Part 8 で扱うトピック (15p) :\n"
             "• 用語集 (2024-2026 新語中心)\n"
             "• 主要ツール比較表 (AI広告 / 計測 / 運用)\n"
             "• 情報源リスト (Search Engine Land / 日経XTREND等)\n"
             "• プロンプト集 (運用者向け)\n"
             "• クライアント FAQ 10選\n"
             "• 副業復帰チェックリスト",
             Inches(0.85), Inches(5.1), Inches(12), Inches(1.85),
             size=11, color=WHITE, line_spacing=1.6)
    footer(s, prs)


# ---------- Main ----------
def main():
    prs = new_presentation()
    p221_divider(prs)
    p222_l3_product(prs)
    p223_30day_overview(prs)
    p224_day_0_3(prs)
    p225_day_3_5(prs)
    p226_day_5_7(prs)
    p227_week_2(prs)
    p228_week_3(prs)
    p229_week_4(prs)
    p230_pitfalls(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT))
    print(f"Saved: {OUTPUT}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
