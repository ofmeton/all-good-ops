# 引き継ぎメモ — BEAT ICE アジア越境EC化（山口智史ツアーグッズ）

最終更新: 2026-06-05 / このファイルだけ読めば別セッションで再開可能。

## 0. 再開のしかた（最初にやること）
1. worktree: `/Users/rikukudo/Projects/all-good-ops-beatice-asia`（branch `task/260603-beatice-asia-expansion`、main派生）
2. このフォルダ `outputs/shopify/beatice-asia-expansion/` のドラフト群を参照
3. Shopify CLI 認証済（`shopify store auth` 済）。操作は:
   `shopify store execute --store beatice.myshopify.com --query '...' [--allow-mutations]`
   - 分析attribution: 先頭に `SHOPIFY_CLI_AGENT_INFO="n:claude-code|v:1|p:anthropic"`
   - 認証切れたら同scopesで再auth（下記）
4. 次の一手 = **アクキーの翻訳サンプル3言語を作る**（§5参照）

## 1. 案件概要
- 対象: beatice.jp（`beatice.myshopify.com` / 株式会社BEAT ICE）の山口智史グッズコレクション「The Past Can Be Changed（TPCBC）」
- ゴール: 台湾・韓国・中国向け越境EC化（翻訳・決済・ポリシー・配送・販売準備完了）
- 商品4種: アクキー¥1,500 / 波形ステッカー¥1,500 / 波形Tシャツ¥4,000(白黒×M/L/XL) / ジップアップパーカー¥6,000(黒×M/L/XL)
- コンセプト: ドラム担当(山口智史)の「声の波形」を商品化。キーワード=波形/Wave

## 2. 確定した意思決定
- 中国も対応（方針A=越境発送＋カード/Alipay割り切り、ICP等は追わない）
- 市場は分割せず1市場のまま（localCurrencies自動換算が機能）
- **海外発行カード受付=会社承認済**（特商法の「海外カード不可」記述は削除して掲載可）
- 翻訳: ファン向け丁寧仕上げ。コンセプト語（例「棚田」）は日本語＋現地語注釈で残す。1商品ずつ擦り合わせ
- 配送: TPCBCグッズ4種を1プロフィールに統合（海外EMS合算1回）。国内はゆうパック地域別
- 決済ローカルウォレット(KakaoPay/LINE Pay/WeChat)は日本事業者では不可。現実解=海外カード＋Alipay+/PayPal検討

## 3. 役割分担（重要）
APIスコープ制約により:
- **私(Claude)がAPIで実行可**: 商品重量・翻訳(translationsRegister)・市場(markets)
- **ユーザーがUIで実施**（API不可）: 配送ゾーン/送料・ポリシー4種掲載・決済プロバイダ有効化
  - 理由: `write_legal_policies`/`read_shipping`/`write_shipping` はこのストアauthで invalid scope

## 4. 進捗サマリ
| 作業 | 担当 | 状態 |
|---|---|---|
| Phase0 現状把握(GraphQL) | 私 | ✅ 完了 |
| 商品重量登録(推定値) | 私API | ✅ 完了・検証済 |
| 特商法 改訂ドラフト | 私 | ✅ 確定（draft-tokushoho-ja.md） |
| 返金ポリシー ドラフト | 私 | ✅ 確定（draft-refund-policy-ja.md） |
| 配送ポリシー ドラフト | 私 | ✅ 確定（draft-shipping-policy-ja.md） |
| 利用規約 ドラフト | 私 | ✅ 確定（draft-terms-of-service-ja.md） |
| 配送設定UIガイド | 私 | ✅ 作成（shipping-setup-ui-guide.md）→ **UI入力はユーザー未実施** |
| ポリシー4種の掲載 | ユーザーUI | ⏳ 未（ドラフトを管理画面ポリシーに貼る＋4言語化） |
| 翻訳仕上げ | 私API | ⏳ 未着手（§5） |
| 決済テスト(海外カード) | ユーザー | ⏳ 未 |
| 各国テスト注文(販売準備) | 両方 | ⏳ 未 |

## 5. 翻訳タスクの現状（次の主作業）
locale: ja(主)/ko/zh-CN/zh-TW。URL: ja=/ , ko=/ko/ , zh-CN=/zh-hans/ , zh-TW=/zh-hant/
- 🚨 **簡体字(zh-CN/中国)が全4商品で翻訳ゼロ（空）** ← 最優先で埋める
- ko・zh-TW は存在するが品質問題:
  - 誤字: 繁体字Tシャツ「T卹」→「T恤」
  - 英語残存: 「Wave貼紙」「Wave T恤」
  - 言語間不整合: 繁体字パーカーのみ「*XL碼目前缺貨,預計2月8日到貨」残存
  - 不自然MT: 「지퍼 업 파커」等
  - 汚いHTML: `<meta charset>`・インラインstyle大量混入
- テーマ文字列の英語残存（"OUR BEST SELLER"/"Show filters"）は別途 ONLINE_STORE_THEME リソースで対応
- 進め方: 1商品ずつ「日本語整形→韓/簡/繁ドラフト→ユーザーレビュー→translationsRegister登録」。
  **次アクション=アクキーをサンプルで3言語そろえて提示**し、トーン確定後に残りへ展開。

### 翻訳登録の技術
`translationsRegister(resourceId, translations:[{locale, key, value, translatableContentDigest, marketId?}])`
- digest は対象locale元の `translatableResource(resourceId){ translatableContent{ key digest } }` から取得必須

## 6. 主要ID（再クエリ不要用）
Products(TPCBC):
- アクキー: gid://shopify/Product/8815068315805 / InventoryItem 49650284036253 (50g)
- 波形ステッカー: Product/8815068283037 / InventoryItem 49650282791069 (30g)
- ジップアップパーカー: Product/8815067234461 / InvItem M:49650278760605 L:49650278793373 XL:49650278826141 (各700g)
- 波形Tシャツ: Product/8815067103389 / InvItem 黒M49650277777565 黒L49650277810333 黒XL49650277843101 白M49650277908637 白L49650277941405 白XL49650277974173 (各250g)

配送プロフィール現状（統合前）:
- 一般プロフィール(default): アイス2種(冷凍便)
- バルク商品: 甘酒業務用3種
- クリックポスト: ステッカー・アクキー
- レターパック: Tシャツ
- TPCBCパーカーゆうパック: パーカー
→ 統合先「TPCBCグッズ（国内＋海外EMS）」を新規作成し4種を移動、旧3プロフィール削除（ガイド参照）

## 7. 再認証コマンド（有効scopesのみ）
```
shopify store auth --store beatice.myshopify.com \
  --scopes read_products,write_products,read_inventory,write_inventory,read_translations,write_translations,read_locales,read_markets,write_markets,read_content,write_content,read_legal_policies
```
※ write_legal_policies / read_shipping / write_shipping は invalid（このストアでは付与不可）

## 8. 関連ファイル
- 計画書: `plan-20260603.md`
- EMS第1地帯料金: `ems-zone1-rates.md`
- 配送UIガイド: `shipping-setup-ui-guide.md`
- ポリシー: `draft-tokushoho-ja.md` / `draft-refund-policy-ja.md` / `draft-shipping-policy-ja.md` / `draft-terms-of-service-ja.md`
- raw記録: `raw/facts/contracts/2026-06-03-*.md`（3件）
- memory: `project_beatice_asia_expansion.md`

## 9. 未確定/要確認
- 商品重量は推定値（実測登録後、配送の重量境界450/1300/2000gを要再確認）
- 海外カードが実際に通るか→決済テスト注文で確認（特商法掲載は実態確認後が安全）
- ポリシー4種は会社最終確認のうえ掲載
- Alipay+/PayPal を実際に入れるかは未決（任意）
