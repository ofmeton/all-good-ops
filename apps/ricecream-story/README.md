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
| `accent` | マーカー帯の色。商品の色に合わせる |
| `marker` | 帯を引くか。`false` は差し色が背景に沈む写真用（黒ごまは暗い店先で黒帯が汚れに見える。実物サンプルの黒ごま回も帯を引いていない） |
| `headline_shadow` | 白文字の背後に濃い縁を置く。明るい背景の写真だけ（抹茶コーンの上部はベージュのシャッター） |
| `crop_focus` | cover で切り落とす時に残す焦点。3:4 の素材はここで調整する |
| `marker_widths` | 役割別の帯の幅（字面幅に対する比）。既定は headline 1.09 / date 0.80 / hours 1.10 |
| `enabled` | ローテーション対象から外す |

## デザインの根拠

レイアウト定数は `assets/samples/` の実物（1179x2096・全11枚）をピクセル計測して
1080 換算した値（係数 0.9160）。実測の代表値:

| 要素 | 実測（1080換算） | 実装 |
|---|---|---|
| `OPEN!` cap height | 125 | 120（字面幅から逆算した結果） |
| `OPEN!` 字面幅 | 515〜551 | 541（canvas 幅の 0.50 を目標に二分探索） |
| `OPEN!` baseline | 278 | 275 |
| 日付 baseline | 379〜392 | 374 |
| 時間 baseline | 456〜460 | 454 |
| 時間行の字面幅 | 335 | 333 |
| マーカー帯の太さ | 約46（役割で変わらない） | 46 |

フォントサイズは pt 直指定ではなく「目標の字面幅／cap height から二分探索」で決める。
フォントを差し替えても構図が崩れず、日付の桁数が変わっても（`8/9` と `12/29`）収まる。

## 決定論（両機で同じバイト列を出す）

画像は Air と mini のどちらで作っても同一になる必要がある（承認した画像と配布する
画像が一致することの担保）。そのために:

- `random` のグローバル関数と組み込み `hash()` を使わない。`hash()` は
  `PYTHONHASHSEED` 依存で、プロセスごとに値が変わる。seed は
  `sha256(f"{date}|{photo_id}|{role}")` の先頭8バイトから作る（`marker.seeded_rng`）
- `Pillow==11.3.0` を厳密ピン（同梱 freetype も固定される）
- フォントは static instance を同梱。可変フォントの実行時インスタンス化は Pillow の
  `set_variation_by_axes` が FreeType のビルドに依存するので避ける

`doctor` が上2つを AST で検査する（文字列リテラルの絶対ホームパス、`random.` の
グローバル呼び出し、`hash(` の呼び出し）。両機の parity は sha256 を突き合わせて確認する:

```bash
.venv/bin/python -m ricecream_story.cli render --date 2026-08-16 --photo vanilla-cone-front --out-dir /tmp/p
shasum -a 256 /tmp/p/*.png
```

## フォント

Playfair Display（SIL Open Font License 1.1、`assets/fonts/OFL.txt`）。
upstream は可変フォント1本だけなので、`scripts/build-fonts.sh` で static instance を
切り出して commit している。一度走らせれば以後不要。

| ファイル | sha256 |
|---|---|
| upstream `PlayfairDisplay[wght].ttf` | `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6` |
| `PlayfairDisplay-Black.ttf` (wght=900) | `14c4c9b95250301c04c960d79e1aba04874d0496cfa578d30165c50701fbf548` |
| `PlayfairDisplay-Bold.ttf` (wght=700) | `93f49f025833ed86a38ca85e62359675288cfc21812b3ec18bcda0c74cdfb134` |

取得元: `https://github.com/google/fonts/tree/main/ofl/playfairdisplay`

`doctor` が sha256 を検証する。フォントの差し替えはレイアウト崩壊に直結するので、
黙って変わっていないかを毎回見る。

## 実装していないもの

実物サンプルの左下にある**商品名の縦積みラベル**（`Kinako` / `Latte` / `Float` の
角丸ボックス）は入れていない。2026-08-15 に陸さんが「商品名の英語表記は入れなくてOK」と
判断したため。復活させるなら `render.py` に描画関数を足すところから。
