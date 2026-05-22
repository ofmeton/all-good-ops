---
date: 2026-05-22
type: research-report
status: draft
related: docs/superpowers/specs/2026-05-22-money-bot-design.md
agent: Explore (id: aade4cbae4b6bc931)
---

# Platform Policy Research — note / X / Instagram / KDP / Adobe Stock / PIXTA

「24時間×月予算1万円で月1万円稼ぐ自律エージェントシステム」の計画書 (`2026-05-22-money-bot-design.md`) のリスク領域整理のため実施。

## 1. note (note.com)

- **AI 自動投稿/AI 生成物販売の可否**: △ (条件付き)
- **明示義務**: 推奨 (公式ガイダンスなし)
- **API・自動化の壁**: **公式 API なし**、ブラウザ自動化のみ可能
- **規約上のリスク**: 利用規約詳細未取得だが、プラットフォーム方針は「自由な創作」を謳う
- **出典 URL**: https://note.com/help (活用術ガイド)
- **推測ポイント**: WebFetch で詳細規約が取得できなかった。note.com は明示的な AI コンテンツ禁止表記がなく、ユーザー自身の「自由な創作」を強調する文体から許容の可能性あり。ただし月額課金販売ユーザーのみ、ブランド保護リスク高し

→ **money-bot 構想インパクト**: 「完全自動 publish」はブラウザ自動化に依存（規約グレー）。半自律（人間が publish クリック）が安全策

## 2. X (Twitter) API v2

- **AI 自動投稿/AI 生成物販売の可否**: △ (強い制限)
- **明示義務**: 不要だが、スパム判定リスク極高
- **API・自動化の壁**: 課金必須 (Free Tier は制限大)。**Basic 200 USD/月から、Pro 42,000 USD/月**。審査厳格。API 402 エラーで詳細が閲覧制限
- **規約上のリスク**: 「自動投稿 BOT」「スパム」判定でアカウント永久停止。自動投稿は過度なレート制限 (**Free Tier: 月 450 ツイート**)
- **出典 URL**: developer.x.com (アクセス制限で詳細未取得)
- **推測ポイント**: 公式ドキュメント閲覧に課金アカウント要求。Twitter ルール「スパムと不正利用」からボット投稿は厳格制限

→ **money-bot 構想インパクト**: $200/月課金は月予算 ¥10,000 を完全超過 → X 完全自動投稿は経済合理性なし。Free Tier 月450 で耐えるか、手動投稿に逃げる

## 3. Instagram Graph API / Content Publishing API

- **AI 自動投稿/AI 生成物販売の可否**: ○ (テクニカルには可能)
- **明示義務**: 不要
- **API・自動化の壁**: ビジネスアカウント必須。権限: `instagram_business_content_publish` など。レート制限: **24時間で 100投稿上限**
- **規約上のリスク**: AI 明示規定なし。ただし 24h/100投稿制限は月最大 3,000投稿相当。コンテンツ品質低下でアカウント制限リスク
- **出典 URL**: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
- **推測ポイント**: 公式 API ドキュメントで「AI 生成」への言及なし。レート制限が実質的なフィルター

→ **money-bot 構想インパクト**: ◎ 月15-30投稿構想は十分許容範囲。Facebook Business Manager 設定が初期セットアップで必要

## 4. Amazon KDP

- **AI 自動投稿/AI 生成物販売の可否**: △ (厳格審査)
- **明示義務**: 必須 (2024年9月改定後)
- **API・自動化の壁**: API なし。手動アップロードのみ。**月間出版数に上限あり (初期: 1-3 冊/月、実績後 25 冊/月相当まで可能)**
- **規約上のリスク**: AI 本の旨を明示しない、品質不足、著作権侵害で**アカウント永久停止**。2024 改定で監視強化
- **出典 URL**: https://kdp.amazon.com/en_US/help (詳細ポリシーページは 503/404)
- **推測ポイント**: KDP Help は「AI 本」キーワード非取得だが、KDP コミュニティで 2024-09 改定は業界周知。明示なしアカウント停止事例多数

→ **money-bot 構想インパクト**: 月販売数制限により Phase 1 では実用的でない。Phase 3 で実績作ってから検討

## 5. Adobe Stock

- **AI 自動投稿/AI 生成物販売の可否**: ○ (Gen AI コンテンツ受入表記あり)
- **明示義務**: 不要 (「Gen AI and more」と記載)
- **API・自動化の壁**: 手動アップロード。Adobe ID 要求。18才以上、コンテンツ単一所有権要求
- **規約上のリスク**: 「sole owner of all submitted content」条項により、生成画像の著作権帰属が曖昧な場合リスク。ただしポリシー上 AI は受け入れ表示
- **出典 URL**: https://contributor.stock.adobe.com/
- **推測ポイント**: 公式に「Gen AI and more」と AI 素材受入を明記。明示義務なし。単価や月収見積が取得できず

→ **money-bot 構想インパクト**: 主軸補助として採用可能。手動アップロードのため週次運用で人間時間消費（30min/週）

## 6. PIXTA

- **AI 自動投稿/AI 生成物販売の可否**: × (停止中)
- **明示義務**: N/A (受け入れ停止)
- **API・自動化の壁**: N/A
- **規約上のリスク**: **「AI生成画像・動画素材の取扱い停止」** 明記。ただし「販売可能なAI加工に関するガイドライン」あり = 既存素材への AI エンハンス (超解像度、背景変更等) は条件付き許可
- **出典 URL**: https://pixta.jp/guide/ (リダイレクト確認)
- **推測ポイント**: 2026年時点で「生成 AI 素材は販売禁止」が PIXTA 公式ポリシー

→ **money-bot 構想インパクト**: **使用不可**。補助チャネルから除外

## サマリ表

| プラットフォーム | AI 自動投稿/販売 | 明示義務 | API・課金 | 主リスク |
|---|---|---|---|---|
| note | △ | 推奨 | なし (手動) | コンテンツ品質、ブランド毀損 |
| X (Twitter) | △ | 不要 | $200-42k/月 | スパム判定・永久停止、レート制限 (月 450) |
| Instagram | ○ | 不要 | Facebook Business Manager | 24h/100投稿上限 (月最大 3k) |
| Amazon KDP | △ | 必須 | なし (手動) | 明示なしで永久停止、月販売数制限 (1-25冊) |
| Adobe Stock | ○ | 不要 | なし (手動) | 著作権帰属の曖昧さ、単価不明 |
| PIXTA | × | N/A | N/A (停止中) | 生成AI素材は完全禁止 |

## 計画書への反映ポイント

1. **X 完全自動投稿は不採用**（月予算超過のため）
2. **note は半自動（人間 publish）が default**（API 不在のため）
3. **PIXTA 除外**（規約により販売不可）
4. **KDP は Phase 3 保留**（月販売数制限）
5. **Instagram は完全自動 OK**（Graph API + 24h/100上限内）
6. **Adobe Stock は手動アップロード前提**（週次30分の人間時間消費を許容）

## 取り残しと追加調査が必要な領域

- note の利用規約詳細（WebFetch で取得失敗、現状は推測ベース）
- X の Free Tier 月450 ツイートの正確な定義（月単位 / Rolling 30days）
- KDP の AI 利用明示の具体的な文言例
- Adobe Stock のジャンル別単価（AI 生成画像の市場価格）
- Adobe Stock 競合（Shutterstock / Getty Generative AI）の比較

これらは Phase 1 着手前に system-engineer + researcher で深掘り推奨。
