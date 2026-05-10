# LP/HP 実装 設計学習ノート

> 出典: Claude auto-memory（feedback_* LP・UI実装系）より合成
> 作成: 2026-05-10
> 適用範囲: BSA L1/L2/L3 案件の LP/HP 実装全般

---

## 1. スマホファースト（大前提）

BSA の LP/HP は**モバイル縦長を主、デスクトップを従**として設計する。

### 理由
BSA 主要クライアント（整体院・美容室・工務店・飲食等の地域事業者）のトラフィックはモバイル比率が圧倒的。デスクトップ全景モックを最初に作ると、モバイル UX の肝（下部固定CTA・1カラム縦積み・タップサイズ）が後付けになりがち。

### 適用ルール
- **画像生成プロンプト**: 縦長モバイル寸法（目安 1080×3600px）を指定
- **実装**: 375px 基準で書き、768px 以上をメディアクエリで追加調整
- **DESIGN.md**: `Responsive Behavior` 節の順序は「モバイル → PC」
- **CTA配置**: 画面下部固定バー（LINE予約・Web予約・電話）を全画面共通の第一設計
- デスクトップモック生成は原則しない。必要な時のみ派生で作る

---

## 2. 日本語ヒーローコピーの改行制御（3段構え）

日本語（CJK）テキストは任意文字間で改行可能なため、大見出しを幅変化に晒すと意図しない位置で改行される（例: 「最短72時間で納品。」が「納」の後で折れる）。

**3層を同時に設計すること**:

### 層 1: 論理行を `span.line` で分ける（desktop の表示単位）
```jsx
<h1>
  <span className="line">...</span>
  <span className="line">...</span>
</h1>
```
```css
.line { display: block; white-space: nowrap; }
```

### 層 2: 各 line 内を意味単位で `chunk` に分ける（狭幅で折れる境界を制御）
```jsx
<span className="line">
  <span className="chunk">最短72時間</span><span className="chunk">で納品。</span>
</span>
```
```css
.chunk { white-space: nowrap; }
```

### 層 3: モバイル breakpoint で line を normal に戻す（chunk 境界で自然改行）
```css
@media (max-width: 640px) {
  .line { white-space: normal; }
}
```

**チェック条件**: 「desktop で 1 行に収まる」「中幅で chunk 境界以外で折れない」「モバイルで chunk 境界で改行される」の 3 条件を満たすか確認してから出す。

---

## 3. 孤児改行の禁止（意味のかたまりで改行）

LP/HP のすべての見出し・コピー・リード文において、**意味のかたまりが分断される改行（孤児改行）は許容しない**。

### チェック項目（実装後必須）
- すべての見出し（h1/h2/h3/h4）の改行位置を実機で確認
- すべてのリード文の改行位置を実機で確認
- **desktop / tablet / mobile の 3 breakpoint** で確認

### 修正手段の優先順位
1. データ側（コピー文字列）に `<br>` を埋め、`dangerouslySetInnerHTML` または React Fragment + `<br>` で展開
2. `text-wrap: balance` を併用（モダンブラウザ対応）
3. `<span class="row">フレーズ</span>` + `white-space: nowrap`（**`width: ◯px` 固定幅指定は禁止**）

### やってはいけないこと
- 「とりあえず動いた」状態で実機確認スキップ
- フレーズ途中での `<br>`（句読点・意味の区切りでのみ改行）
- `span` に `width: 数値px` の固定幅（文字サイズ変動に追従できない）

---

## 4. absolute 配置コラージュの段階 scale 設計

Hero 周辺のコラージュ風コンポーネント（複数パネルが `position: absolute; left/top/width: 固定px` で配置）を作る時、内部座標系がビューポートに追従しないため、中幅〜モバイルで「端が切れる」「完全に消える」が発生する。

### 4 breakpoint の scale を同時に設計する
| ビューポート | scale | 備考 |
|---|---|---|
| 1280px 以下 | 0.9 | やや余裕 |
| 1100px 以下 | 0.8 | 1カラム直前 |
| 960px 以下 | 0.78 + `transform-origin: top center` | 1カラム化 |
| 640px 以下 | 0.5前後 + `transform-origin: top center` | **display:none 禁止。縮小して残す** |

```css
.collage { transform-origin: top right; } /* PC幅では右端基準で縮小 */
```

**自己チェック**: 1440/1200/960/640px の 4 点で破綻していないか頭の中で走査してから出す。

---

## 5. 繰り返しコンテンツは横マーキーを標準採用

お客様の声・導入企業ロゴ・実績バッジ・施工事例ハイライトなど「数の多さ＝信頼感」が効く繰り返しコンテンツは、**横方向の無限マーキーで連続スクロール表示**を第一選択肢とする。

### 採用判断基準
- **5件以上のアイテムが並ぶ繰り返しコンテンツ** → マーキー採用
- 3件以下、または1件1件をしっかり読ませたいコンテンツ → 通常グリッド or アコーディオン

### 実装パターン（コピペ可）
```css
.marquee-wrap{
  overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
          mask-image:linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
}
.marquee-track{
  display:flex; gap:20px; width:max-content;
  animation: marquee 60s linear infinite;
  will-change:transform;
}
@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@media (prefers-reduced-motion: reduce){ .marquee-track{ animation:none } }
```

### 必須要素
- **2セット連結**（`[...items, ...items]`）して `translateX(-50%)` でループ（seamless ループの定石）
- **両端マスクフェード**（唐突な出現/消失を防ぐ）
- **prefers-reduced-motion** 対応
- **hover 停止はしない**（常時動き続けるのが最良）

### hover 停止アンチパターン（確定事項）
hover 停止を実装すると必ず「カク感」が発生する。技術的緩和（`@property` + `transition`）でも解消できない。**読みたいユーザーは目で追えばよく、止める必要はない**。

### 速度の目安
- お客様の声・5枚程度: 60秒で1ループ
- ロゴ・10〜20個: 40秒で1ループ
- 施工事例ハイライト: 80秒で1ループ

---

## 6. 日本語コピーの文体規定（具体性優先）

クライアント露出物（LP / HP / モーダル説明文）の日本語コピーは**具体性優先・抽象は最小限**で書く。

### 原則
- 各文に必ず**具体的な操作・要素・現象**を含める
  - ✕ 「触れたときの応答をミリ秒単位で設計します」
  - ◯ 「カーソルを乗せると、ボタンが沈む、文字に下線が伸びる、画像が少し動く」
- 抽象表現は1段落に1〜2個まで

### 禁止語・禁止パターン
- 禁止語: 「ちゃんと」「きちんと」「ふっと」「ばらす」「もくじ」「引き出し」（比喩）
- 直訳調NG: 英文の名詞句構造をそのまま日本語化
- 詩的・気取った表現NG: 「手触り」「体温」「一筆書き」「伝達の核」のような抽象語の連発
- 「賢そう・信頼感」を狙って抽象に振ることは**撤回済みの基準**

### OK なもの
- 専門用語（WebGL / ホバー / パララックス 等）はそのまま使ってよい。むしろ具体性に貢献する

---

## 7. SPA + fade-in サイトの Playwright スクショ

React SPA + IntersectionObserver fade-in 構成のサイトでは、ヘッドレス Chrome 単体では **FV 以外のセクションが opacity:0 のまま**になる。

### 撮影手段の優先順位
1. **第一選択（Playwright MCP）**: `browser_navigate` → `browser_evaluate('document.querySelectorAll(".fade-in").forEach(e=>e.classList.add("visible"))')` → `browser_take_screenshot`
2. **第二選択**: ローカルで一時的に CSS `.fade-in { opacity: 1 !important; transform: none !important }` → ヘッドレス撮影 → CSS 戻す
3. **第三選択**: ユーザーに実機確認を依頼（FV以外）

### 確認対象ごとの使い分け
| 確認内容 | 手段 |
|---|---|
| レイアウト確認（ロゴ位置・改行・色） | ヘッドレスで FV のみ撮影 |
| インタラクション確認（FAQ 開閉・フィルタ・マーキー） | Playwright 必須 |
| 全セクション可読性確認 | Playwright 必須 or ユーザー実機 |
