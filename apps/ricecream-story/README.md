# ricecream-story

RICE CREAM の Instagram ストーリー「OPEN!」告知画像を作る。1080x1920。

Instagram への投稿は**自動化しない**。Graph API の content publishing はストーリーの
ステッカー（リンク・投票・位置）を一切サポートせず、実物にある `Maps.app.goo.gl` の
タップできるリンクステッカーが再現できないため、投稿操作は陸さんがアプリで行う
（2026-08-15 決定）。このリポは画像を作るところまでを担い、Telegram への承認カードは
`claude-gateway` 側（`gateway/ricecream_open.py`）が持つ。

## セットアップ

```bash
scripts/install.sh              # .venv を作る（Pillow==11.3.0 だけ）
.venv/bin/python -m ricecream_story.cli doctor
```

親インタプリタは `claude-gateway/.venv/bin/python` を第一候補にする。両機とも
Python 3.11.15 / arm64 で一致していることを確認済みで、mini には uv も brew も
PATH に無く python3.11 の場所が両機で違うため。

## 使い方

```bash
# 営業日判定と時間だけ（画像は作らない = dry-run）
.venv/bin/python -m ricecream_story.cli plan --date 2026-08-16 --json

# 1枚作る（PNG=無劣化配布用 と JPEG=Telegram プレビュー用 を同時に出す）
.venv/bin/python -m ricecream_story.cli render \
  --date 2026-08-16 --photo vanilla-cone-front --hours 13:00-20:30 --json

# 環境と config の健康診断
.venv/bin/python -m ricecream_story.cli doctor

# 生成分と実物サンプルを並べた目視回帰用の1枚
.venv/bin/python -m ricecream_story.cli contact-sheet

# テスト
.venv/bin/python -m unittest discover -s tests
```

`--json` は stdout に1行だけ出る（ログは stderr）。gateway が subprocess で叩いて
パースするので、機械可読を人間向けログと混ぜない。

## config

`config/store.json`

営業日・営業時間の単一ソース。**曜日は Python 規約（月=0 … 日=6）**で、
`weekday_convention` にそれを宣言させ読み込み時に検証している。
`ricecream-attendance` の TypeScript 側は日=0（`src/lib/businessDays.ts`）なので、
値をそのまま持ち込むと2日ずれる。

現在の設定（2026-08-15 陸さん申告）: 木 14:00-20:30 / 金土 13:00-20:30 / 日 13:00-20:00。
月火水は定休。

解決の優先順:

1. 引数の時間指定（Telegram の時間ボタン）
2. `date_overrides[date].closed`
3. `closed_dates`
4. `date_overrides[date].hours` ← 定休曜日でも営業扱いにできる
5. `business_weekdays` に含まれるか → `default_hours[weekday]`

`config/photos.json`

写真ごとのレイアウト指示。写真を追加する時はここに1件足すだけ。

| キー | 意味 |
|---|---|
| `accent` | フレーム内枠の色。商品の色に合わせる（輝度が低すぎる場合は自動で白に切り替わる。後述） |
| `crop_focus` | cover で切り落とす時に残す焦点。3:4 の素材はここで調整する |
| `enabled` | ローテーション対象から外す |

`config/store.json` の `brand_text`（既定 `"RICE CREAM"`）は店名ヘッダーの文字列。

## デザインの根拠

レイアウト定数は `assets/samples/` の実物（1179x2096・全11枚）をピクセル計測して
1080 換算した値（係数 0.9160）。実測の代表値:

| 要素 | 実測（1080換算） | 実装 |
|---|---|---|
| `OPEN!` cap height | 125 | 120 |
| `OPEN!` baseline | 278 | 275 |
| 日付 cap height | 41 / 49（2枚でばらつく） | 42 |
| 日付 baseline | 379〜392 | 374 |
| 時間 cap height | 38 / 49 | 46 |
| 時間 baseline | 456〜460 | 454 |

**見出しのサイズは cap height 基準**で、字面幅基準ではない。当初は幅基準にしていたが、
書体の 幅/cap 比の差がそのまま線の太さの差になり、sample との食い違い（幅ではなく太さ）を
再現できなかった。幅は canvas の 0.92 を上限にクランプするだけ。

**装飾は帯（マーカー）から幾何学装飾（D+C）へ転換した（2026-08-20）**。経緯:
帯は手描き風→直線の矩形→罫線状の掠れ→平行四辺形→払いストロークと5案を試したが
全部「変」「ダサい」「キモい」と却下された。根本原因は、筆致という有機的な質感を
アルゴリズムで模倣しようとするほど不気味の谷に落ちること。よって有機的な質感の
模倣をやめ、上端スクリム（黒グラデ）＋店名ヘッダー＋額装フレームという幾何学的な
装飾に転換した。乱数は完全に消え、両機で同じ画像が出ることが自明に成り立つ。

フレーム内枠の色は `accent` をそのまま使うが、輝度（ITU-R BT.601）が 60 未満なら
白 alpha 60% に自動で切り替える（黒ごま `#0A0A0A` が写真に沈む対策。閾値は
`render.ACCENT_LUMINANCE_THRESHOLD`）。

## 決定論（両機で同じバイト列を出す）

画像は Air と mini のどちらで作っても同一になる必要がある（承認した画像と配布する
画像が一致することの担保）。そのために:

- `Pillow==11.3.0` を厳密ピン（同梱 freetype も固定される）
- フォントは static instance を同梱し、可変軸は焼き込み時に全部固定する。可変フォントの
  実行時インスタンス化は Pillow の `set_variation_by_axes` が FreeType のビルドに依存する
- `random` のグローバル関数と組み込み `hash()` を使わない。`hash()` は `PYTHONHASHSEED`
  依存でプロセスごとに値が変わる。現在の実装は乱数を一切使っていないが、`doctor` が AST で
  検査し続けるので、あとから「ちょっと揺らぎを足す」で決定論を壊せない

両機の parity は sha256 を突き合わせて確認する:

```bash
.venv/bin/python -m ricecream_story.cli render --date 2026-08-16 --photo vanilla-cone-front --out-dir /tmp/p
shasum -a 256 /tmp/p/*.png
```

## フォント

Merriweather Black（SIL Open Font License 1.1、`assets/fonts/OFL.txt`）。見出しも日付も
時間も同じ1本で組む（sample の実物も3行とも同じ太さ）。

**なぜ Merriweather か**: sample の実物と候補8書体を並べて判定した（`out/font-candidates.png`
を生成して目視）。sample は低コントラストで骨太のセリフ、数字は幅広の lining。当初使った
Playfair Display は高コントラストの Didone で、`O` の上下がヘアラインまで細るため別物だった。
Source Serif 4 Black も近かったが Merriweather の方が太い。Zilla Slab / Arvo / Bitter /
Rokkitt は純粋なスラブでコントラストが無く、monoline に見えて外した。

upstream は可変フォント1本だけなので、`scripts/build-fonts.sh` で opsz / wdth / wght を
全部固定した static instance を切り出して commit している。一度走らせれば以後不要。

| ファイル | sha256 |
|---|---|
| upstream `Merriweather[opsz,wdth,wght].ttf` | `d0ed0e359e396af7ad05e73dffd11a3a4c326ea0d0283c56bd9361cb2cc86a96` |
| `Merriweather-Black.ttf` (opsz=144 wdth=100 wght=900) | `e731a9757c16518029fe85980d37a908a9f46e57d66ac9a7cc04e8e4bb08764d` |

取得元: `https://github.com/google/fonts/tree/main/ofl/merriweather`

`doctor` が sha256 を検証する。フォントの差し替えはレイアウト崩壊に直結するので、
黙って変わっていないかを毎回見る。

## 実装していないもの

実物サンプルの左下にある**商品名の縦積みラベル**（`Kinako` / `Latte` / `Float` の
角丸ボックス）は入れていない。2026-08-15 に陸さんが「商品名の英語表記は入れなくてOK」と
判断したため。復活させるなら `render.py` に描画関数を足すところから。
