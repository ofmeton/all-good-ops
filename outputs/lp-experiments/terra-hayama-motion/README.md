# TERRA HAYAMA — 動き満載（静謐）版 HP

葉山・一色の一棟貸しの宿 TERRA HAYAMA の、**スクロール演出を主役にした1ページ通しサイト**。
動きカタログ `wiki/domain/lp-hp-design/ryokan-scroll-motion-catalog.md`（kikka/shuku/oga 3サイト観測）の技法を、静謐・余白のブランドの範囲で「ふんだんに」適用した習作。

- **位置づけ**: 既存の本番クライアントサイト（`outputs/clients/terra-isshiki/site/`・Next.js）は別物。これは動き主役の新デザイン版（提案/ポートフォリオ候補）。
- **スタック**: Vanilla HTML / CSS / JS の3点構成 + GSAP ScrollTrigger（ローカル vendoring `assets/vendor/`）。

## ローカル確認
```bash
python3 -m http.server 8770 --directory .
# → http://localhost:8770/
```

## 採用した技法（カタログ対応）
| セクション | 技法 |
|---|---|
| Hero | Ken Burns 緩ズーム(H) + 4枚クロスフェード(F) + 墨グラデscrim + 右辺 縦書きCTA + 山影SVG + スクロールでヘッダー ゴースト→solid(O) |
| Concept | 固定ヒーローに漆喰白パネルが被さる オーバーラップ(E) + 縦書き見出しの1文字フェードアップ(C) + 本文 行スタッガー(B) + 押し花アートの ずらし配置パララックス(J) |
| Rooms | ビッグセリフ見出し ゴースト→solid(D) + **ピン留め横スクロール・ギャラリー(G)**（PC=GSAP pin、モバイル/reduced-motion=スクロールスナップ carousel にフォールバック） |
| Stay | 雑誌的 ずらし配置レイアウト + 速度差パララックス(J)。写真2 + テキスト装飾2 の混在カード |
| Nature | コラージュ/モザイクの スタッガーリビール(K)（非対称グリッド） |
| Access | 見出しフェード(D) + 本文/POI 行スタッガー(B) + 写真パララックス + Google Maps 埋め込み |
| Reserve/Footer | テクスチャ暗パネル + 縦書き「ご予約」 + 白アウトラインのピルボタン + mailto + 山影SVG |
| 常駐 | モバイル下部固定の「Airbnbで予約」ドックCTA |

## 設計原則
- 動きは `opacity` / `transform` のみ。**宣言的ハイブリッド**（JSはclass付替・座標計算のみ、見た目はCSS transition）。
- `prefers-reduced-motion: reduce` で全リビール/パララックス/Ken Burns/横ピンを無効化し、素直なレイアウトに。
- 前景テキストと背景画像はレイヤー分離。easing は終わりに止まる `--ease`。

## 差し替えが必要な箇所（公開前）
- 予約リンク `https://www.airbnb.jp/` → 実際の Airbnb リスティングURL（`index.html` の `.reserve__btn` / `.hero__vcta` / `.dock`）。
- 問い合わせ `info@terra-hayama.example` → 実メールアドレス。
- 画像は `assets/`（既存 `outputs/clients/terra-isshiki/site/public/images/` から複製）。必要に応じ WebP 化。

## 既知の注意
- ロゴはテキストロゴ恒久運用（Noto Serif JP）。
- 外部送客は Airbnb のみ（Airbnb規約準拠）。問い合わせは mailto のみ（フォーム不採用）。
