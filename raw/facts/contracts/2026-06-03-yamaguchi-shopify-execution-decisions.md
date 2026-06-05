---
date: 2026-06-03
category: contracts
source: session
---
山口智史ツアーグッズEC（beatice.jp / 株式会社BEAT ICE Shopify, myshopifyDomain=beatice.myshopify.com）アジア展開の実行方針決定:

- 対象3カ国: 台湾・韓国・中国（中国も「割り切り並行」=越境発送＋Alipay/カードで対応、ICP等は深追いしない方針 A を選択）
- アクセス方法: Shopify CLI（`shopify store auth` 認証済 / `shopify store execute` で Admin GraphQL 操作）。Dev MCP ではなく CLI 経由
- 翻訳方針: ファン向けに丁寧仕上げ。コンセプトに深く関わるワード（例「棚田」）は**できる限り日本語のまま残し、現地語で注釈をつけて意味解釈を助ける**形。ユーザーと細かくやりとりしながら詰める
- 市場構造: 3カ国を1市場「台湾・中国・韓国」に集約済（localCurrencies=true で現地通貨自動換算が機能）。→ 市場分割はせず中身整備で進める方針
- 決済: 海外発行クレジットカードを「受付る」に変更する方針（要・株式会社BEAT ICE 承認）。現実解は海外カード受付ON＋Alipay+/PayPal検討。ローカルウォレット(KakaoPay/LINE Pay/WeChat等)は日本事業者では原則追加不可

【Phase 0 で判明した現状の実データ（2026-06-03 時点）】
- shopLocales: ja(primary,公開) / ko(公開) / zh-CN(公開) / zh-TW(公開)。URL: ja=/ , ko=/ko/ , zh-CN=/zh-hans/ , zh-TW=/zh-hant/
- 市場: Japan(JPY,primary) ＋ 台湾・中国・韓国(base=JPY, localCurrencies=true)
- ポリシー: 特商法(LEGAL_NOTICE)・プライバシー・連絡先 は存在。返金ポリシー・配送ポリシー・利用規約は未設定（フッターの返金リンクは404）
- 致命的矛盾: 特商法に「海外で発行されたクレジットカードには対応していません」「発送は火・金のみ」「客都合の返品交換不可」と国内前提の記載 → 越境販売と矛盾。最優先で是正
- 特商法記載の事業者: 株式会社BEAT ICE / 代表責任者 山口冴希 / 神奈川県三浦郡葉山町上山口2623 / 050-1721-1421 / info@beatice.jp
- 対象コレクション「The Past Can Be Changed」: アクキー¥1,500 / ステッカー¥1,500 / パーカー¥6,000 / Tシャツ¥4,000（衣類・雑貨）
- 翻訳実態: 自動翻訳ON済だが未完成（英語残存 "OUR BEST SELLER"/"Show filters"、不自然MT箇所あり）
- 決済アイコン: Amex/ApplePay/GooglePay/JCB/Mastercard/ShopPay/Visa（ローカルウォレットなし）
