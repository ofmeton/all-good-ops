# Part 1. エグゼクティブサマリー（10p）

## P01: 表紙
- タイトル: **Digital Marketing Catch-Up 2023→2026**
- サブ: 2.5年のブランクを一気に埋める / 広告運用実務・媒体・AI活用の現在地
- 作成日: 2026-04-25
- 作成: 工藤陸（内部資料）

## P02: 本書の使い方
- 対象: 2023年9月まで現場で広告運用に従事していた自分
- 期間: 2023年10月〜2026年4月（約2.5年）
- 構成: 8 Part / 約250p
- 読み方:
  - 通読: Part 1→8 順で3〜4時間
  - 辞書的: 目次から媒体別 Part 3 へダイレクト
  - 副業復帰特化: P1 → Part 6 → Part 7 の順
- 推奨マーク:
  - 🔥 最重要アップデート
  - ⚠️ 間違えやすいポイント
  - 💡 副業で差がつくTips

## P03: 2年間で何が変わったか — TL;DR
この2.5年で起きた「広告運用の地殻変動」は4つ。
1. **生成AIが"ツール"から"運用レイヤー"へ**  
   → クリエイティブ生成・入札最適化・アカウント構造提案まで AI が触る時代
2. **Cookie廃止は"撤回"されたが、シグナル減はもう戻らない**（Google公式: 2024/07/22 announcement）  
   → CAPI / Enhanced Conversions / SGTM / Consent Mode v2 は依然として必須
3. **アカウント運用が"ブラックボックス化"**  
   → PMax / Advantage+ / Smart+ に収束。人間の仕事は「AI を導く」へ
4. **MMM が復活した**  
   → ラストクリック計測崩壊の反動として、Bayesian MMM・Incrementality Test が標準装備化

## P04-05: 差分マップ（2023-09 と 2026-04）
左右 2 カラム比較表。

| 領域 | 2023-09 | 2026-04 | 変化の度合い |
|---|---|---|---|
| Google 検索広告 | BMM排除後、Phrase/Exactで細かく制御 | **Broad Match + Smart Bidding** が推奨構成。AI Max for Search 登場 | ★★★ |
| Google 配信キャンペーン | Smart Shopping / Local Campaigns 残存 | **Performance Max に収束**。Demand Gen(Discovery統合) | ★★★ |
| Meta 配信 | ASC初期、CBO主流、広告セット分割運用 | **Advantage+ 全盛**。Lattice・Andromeda で配信ML統合 | ★★★ |
| TikTok | 日本でB2C限定、手動運用中心 | **Smart+ / Symphony** で自動化、Shop Ads 本格化 | ★★★ |
| Yahoo! | Yahoo!単独、YDA手動中心 | **LINEヤフー統合後**、LINE広告との連携前提 | ★★ |
| 計測 | UA→GA4移行中、タグ直接配置中心 | **GA4完全移行済**、SGTM・CAPI標準、Consent Mode v2 必須 | ★★★ |
| クリエイティブ | デザイナー制作・手動ABテスト | **生成AI + Advantage+ Creative / Asset** の組合せ | ★★★ |
| 計測思想 | ラストクリック・CV重視 | **Incrementality / MMM / LTV** へ回帰 | ★★ |
| 運用職の役割 | 配信設定・入札調整・クリエイティブ指示 | **AIを導く・検証設計・ビジネス翻訳**へシフト | ★★★ |

## P06: 業界3大潮流
3 カラム図解（アイコン + 見出し + 3-4行説明）。

**① AI レイヤー化**
- 広告プラットフォーム各社が ML を配信面の中核に
- 人間は "キャンペーン構造を作って放牧する" 仕事に
- 代理店の内製化・省人化が急速に進行

**② プライバシー・シグナル永続減少**
- Cookie 廃止は撤回されたが業界はもう戻らない
- ファーストパーティデータ / 同意管理 / サーバーサイド計測が前提
- Consent Mode v2 (EEA) / Privacy Sandbox 継続

**③ 購買導線の断片化**
- 検索→SNS→動画→AI検索(AI Overview / Perplexity) へ分散
- "One funnel" ではなく Omnichannel 前提の設計
- LLM検索を意識した **GEO (Generative Engine Optimization)** が新潮流

## P07: 媒体シェア推移（日本市場）
縦棒グラフ: 2023 vs 2024 年 日本の広告費（電通「日本の広告費」2025年2月27日発表）

**2024年 総広告費: 7兆6,730億円（前年比+4.9%、3年連続過去最高）**

- インターネット広告費: **3兆6,517億円（+9.6%）** … 全体の47.6%
  - うちインターネット広告媒体費: 2兆9,611億円（+10.2%）
- テレビメディア広告費: 1兆7,034億円（テレビ関連+ラジオ）
- 新聞+雑誌+ラジオ: 前年並み〜微減

主な変化:
- **運用型広告がマスの総和を超える構造が定着**
- **ビデオ広告・縦型動画が急伸**（TikTok / YouTube Shorts / Meta Reels）
- **リテールメディア広告**（Amazon Ads / 楽天Ads）が新勢力
- **LINEヤフー統合後**、LINEとYahoo!合算シェアが再評価

出典: 電通「2024年 日本の広告費」2025年2月27日

## P08: 2年で覚える10キーワード
2×5グリッドで各キーワード1行説明付き。

1. **Performance Max (PMax)** — Google の全面統合型AI配信キャンペーン。検索以外はほぼこれに寄せる
2. **Advantage+ Shopping (ASC)** — Meta版の統合AI配信。EC/D2Cでは鉄板
3. **TikTok Smart+** — TikTok 完全自動化キャンペーン。2024/10リリース（Web/Catalog/App/Lead）
4. **AI Max for Search** — Google 検索広告のAI拡張層（2025/05発表）。Dynamic Search Adsを置換予定
5. **CAPI (Conversion API)** — サーバーサイド計測の業界標準。Meta/TikTok/LINE/X 各社対応
6. **Consent Mode v2** — EU同意必須化（2024/03）。日本実務でも実装が定着
7. **SGTM (Server-side GTM)** — 計測タグをサーバー経由で発火させる標準構成
8. **MMM (Media Mix Modeling)** — 統計モデルで媒体貢献を推定。Meta Robyn / Google Meridian で民主化
9. **AI Overview / GEO** — Google検索結果上部にAI要約（2024/05）。GEO=LLMに引用されるSEO
10. **Agent型広告運用** — Claude Computer Use / OpenAI Operator 等で管理画面を直接操作する次世代運用

## P09: 副業復帰の最短ルート
フローチャート図（5ステップ）。

1. **Part 6 鉄板運用メソッド 2026年版** を先に読む（15p / 30分）
2. **Part 3 の Google + Meta** を重点読み（47p / 60分）
3. **Part 4 計測・データ基盤** で SGTM/CAPI を押さえる（25p / 40分）
4. **Part 5 AI活用事例** でクリエイティブ生成ツール3つ決める（40p / 60分）
5. **Part 7 BSA L3 実装ガイド** で30日プラン確認（10p / 20分）

合計約3.5時間で最低限の復帰ラインに到達。

## P10: 目次
Part 1〜8 の見出し一覧。
