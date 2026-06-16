---
type: source
created: 2026-06-16
updated: 2026-06-16
sources: [raw/notes/2026-06-16-ryokan-3site-motion-observation.md]
related: [[motion-techniques]], [[design-principles]], [[spade-motion-study]]
tags: [lp-design, motion, technique-catalog, ryokan, hotel, scroll, quiet-luxury]
status: active
---

# 旅館・ホテル系サイトのスクロール動きカタログ — 観測3サイトの引き出し

新規サイト（特に**和モダン／静謐ラグジュアリー／旅館・ホテル・リトリート**系）を作るとき、「どこにどんな動きを付けるか」を引くための実装カタログ。スマホ画面録画3本を**全編フレーム観測**して抽出した。[[motion-techniques]]（spade / madoguchi 由来のVFX寄り語彙）と対になる、**「静けさ・余白・上品さ」方向**の引き出し集。

## 観測元（出所）

| 略称 | サイト | 性格 | この観測での核 |
|---|---|---|---|
| **kikka** | kikka-hirado.com（Kikka Hirado / 長崎・平戸の5室の宿） | 和モダン・海ビュー | レイヤー被せ＋ピン留め横ギャラリー |
| **shuku** | shuku-kokon.com（宿 古今 / 愛知・犬山 400年の酒蔵の宿） | 和・蔵リノベ | 全画面クロスフェード＋ずらし配置パララックス |
| **oga** | oga.yamado.co.jp（山人 oga / 秋田・男鹿半島のリトリート） | 編集的・自然 | ビッグセリフ＋ナンバリング＋コラージュ/帯リビール |

- 観測条件: iOS Safari・縦持ち実機・約60–65fps の画面録画。ユーザーが上から一定の**超低速**で手スクロール。30/60fps でフレーム抽出し、動きの最中は全フレーム精査、完全静止区間のみ早送りで観測。
- 共通の文脈: 3本とも**画面下に「宿泊予約」常駐CTA**、和文＝縦書き／英文＝小さく添えるタイポ作法、超低速スクロール前提の「間（ま）」演出。

---

## 基本原則（3サイト共通のDNA）

新規制作でこの系統を狙うなら、まず以下を土台に敷く。

- **スクロール連動フェードイン（opacity 0→1 ＋ ごく僅かな translateY）が全サイトの基礎**。派手な動きは足さず、「要素が静かに現れる」だけで世界観の8割が出る。
- **見出しは「ゴースト→solid」**（薄く出てから濃くなる）で立ち上げる。瞬間表示しない。
- duration は**長め（0.8–1.6s）**、easing は**終わりにスッと止まる sharp-out**（`cubic-bezier(0.4, 0.12, 0.08, 1)` 等）。短い・跳ねる easing は品が落ちる。
- **JS で連続トゥイーンせず、`IntersectionObserver` で class を付け替え → CSS transition で発火**させる「宣言的ハイブリッド」が軽くて崩れにくい（[[motion-techniques]] と同じ設計姿勢）。スクロールジャック系だけ例外的に scrub を使う。
- **和文は縦書き＋1文字単位 or 列単位**、英文は**小さく添える or ビッグセリフのセクションタイトル**。タイポの和洋コントラストが質感の要。
- **超低速スクロール前提**で設計する（演出は「速く流すと気づかない」くらい繊細でよい）。
- `prefers-reduced-motion: reduce` で transform/parallax を切る分岐は必ず用意（アクセシビリティ）。

---

## 技法カタログ

各技法 = **いつ使うか / 体感 / どう書くか / 観測元 / 注意**。

### 技法A: スクロール連動フェードアップ（基礎リビール）

**いつ使うか**: 全セクションの要素登場の標準形。まず全部これで足りる。

**体感**: 要素が下から少し上がりつつ、すっと濃くなる。

```css
.reveal { opacity:0; transform:translateY(16px);
  transition: opacity 1s var(--ease-sharp), transform 1s var(--ease-sharp); }
.reveal.is-in { opacity:1; transform:none; }
```
```js
const io = new IntersectionObserver((es)=>es.forEach(e=>{
  if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold:0.15, rootMargin:'0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
```
**観測元**: 全3サイト（kikka/shuku/oga すべての見出し・本文・画像）。
**注意**: 一度出したら `unobserve`（再フェードで安っぽくならない）。移動量は 12–24px に抑える。

### 技法B: 行ごとスタッガー・フェード（本文・リスト）

**いつ使うか**: 本文段落、Newsリスト、説明テキスト。1行ずつ時間差で出す。

**体感**: 文章が「読み下す速度」で順に灯っていく。

```css
.line { opacity:0; transform:translateY(10px);
  transition: opacity .8s var(--ease-sharp), transform .8s var(--ease-sharp);
  transition-delay: calc(var(--i) * .08s); }
.is-in .line { opacity:1; transform:none; }
```
**観測元**: kikka 本文「古くから日本と異国が交差し…」、shuku「忍冬〈スイカズラ〉…」、oga「七千万年にわたる歴史…」、各 News リスト。
**注意**: stagger は 60–100ms/行。長文は行数×delay が伸びすぎないよう上限（例: 8行以降は delay 据え置き）。

### 技法C: 縦書きコピーの1文字フェードアップ（墨にじみ）

**いつ使うか**: 和の情緒を出したいキーコピー（セクションの縦書き大見出し）。

**体感**: 縦組みの文字が**上→下へ1字ずつ、薄→濃で滲み出る**。筆・墨のような所作。

```css
.tate { writing-mode: vertical-rl; }
.tate .char { opacity:0; transform:translateY(-0.15em);
  transition: opacity 1.1s var(--ease-sharp), transform 1.1s var(--ease-sharp);
  transition-delay: calc(var(--i) * .06s); }
.tate.is-in .char { opacity:1; transform:none; }
```
**観測元**: kikka「西洋を迎えた海が広げてくれる／余暇」、shuku/oga の縦書き見出し。
**注意**: 縦書きは**1文字 span 化しても折返しが破綻しにくい**（横書き日本語の1文字割れ問題が起きない＝縦組みと相性が良い）。delay は 50–70ms/字。

### 技法D: 見出しのゴースト→solid ＋ ビッグセリフ/ナンバリング

**いつ使うか**: セクションタイトル。英字大見出し＋和小見出し、または番号付き。

**体感**: タイトルが薄い状態から濃く定着。oga は「01 NATURE」「CUISINE」など**特大セリフ英字＋小さな連番**で編集感を出す。

```html
<h2 class="sec-title reveal"><span class="num">01</span> NATURE</h2>
<p class="sec-sub reveal">男鹿半島が生み出す荘厳な自然</p>
```
**観測元**: kikka「Room/Facility/Journal/News」＋「—」divider、shuku「ご宿泊 Rooms」（和大字＋英小字）、oga「01 NATURE / CUISINE / NEWS / RESERVE」。
**注意**: 3サイトで作法が違う＝**ブランドの方向で選ぶ**。和静寂寄り→kikka型（和＋小英字）、編集マガジン寄り→oga型（特大セリフ＋連番）。

### 技法E: 固定背景＋オーバーラップ被せ（sticky hero / panel overlap）

**いつ使うか**: ヒーロー→次セクションの移行を「めくれ」でなく「被せ」で見せたいとき。

**体感**: スクロールしても**ヒーローが画面に張り付いたまま、下から次パネルがせり上がって覆う**。奥行きが出る。

```css
.hero { position: sticky; top:0; height:100vh; z-index:0; }
.after-hero { position: relative; z-index:1; background:#1e3a3a; } /* 上に重なる */
```
**観測元**: kikka（固定ヒーロー＋ティール面が被さる）。
**注意**: `position:sticky` の親に `overflow:hidden` があると効かない。被せ側に背景色/不透明を必ず付ける（下が透けると破綻）。

### 技法F: 全画面クロスフェード／ディゾルブ（image-to-image）

**いつ使うか**: シーンの切替を映画的に見せたいとき（外観→内観など）。shuku の核。

**体感**: **全画面の写真Aが写真Bへ二重写しになりながら溶けて切替**。「めくり」より没入感が高い。

```css
.x-stack { position:relative; }
.x-stack img { position:absolute; inset:0; object-fit:cover; opacity:0;
  transition: opacity 1.2s ease; }
.x-stack img.is-active { opacity:1; }
```
スクロール量で active を切替（IntersectionObserver の連続セクション、または scrub）。
**観測元**: shuku（酒蔵外観 → 障子＋坪庭の内観へディゾルブ）。
**注意**: 2枚を**正確に重ねる**（object-fit/position 一致）。クロスフェード中に下地が見えないよう背景同色を敷く。

### 技法G: ピン留め横スクロール・ギャラリー（scroll-jacked horizontal）

**いつ使うか**: 客室・施設など複数カットを「1枚ずつ送って見せる」ギャラリー。kikka の核。

**体感**: セクションが画面に**ピン留めされ、縦スクロールに連動して写真列が横方向へ流れる**。

```js
// GSAP ScrollTrigger 例
gsap.to('.gallery-row', {
  x: () => -(row.scrollWidth - innerWidth),
  ease:'none',
  scrollTrigger:{ trigger:'.gallery', pin:true, scrub:1,
    end:()=>'+='+(row.scrollWidth) }
});
```
**観測元**: kikka「Room」（バスルーム→ダイニング→ツインベッド→海ビューと横送り）。
**注意**: モバイルで**縦スクロールを奪う**ので区間は短く（2〜4カット）。`scrub` は 0.5–1。reduced-motion 時は普通の横スワイプ carousel にフォールバック。

### 技法H: Ken Burns 緩速ズーム（ヒーローの呼吸）

**いつ使うか**: 静止ヒーロー写真を「生かす」。全3サイトのヒーローで使用。

**体感**: 1枚絵がごく緩やかに拡大し続け、止まって見えるのに生きている。

```css
@keyframes kenburns { from{ transform:scale(1);} to{ transform:scale(1.08);} }
.hero-img { animation: kenburns 18s ease-out forwards; } /* 前景テキストは別レイヤーで固定 */
```
**観測元**: kikka/shuku/oga ヒーロー。
**注意**: **前景コピーは別レイヤーで固定**し背景だけスケール（背景レイヤー分離）。scale は 1.05–1.10、duration 15–20s。

### 技法I: 告知マーキー（横流れ ticker）

**いつ使うか**: ヘッダー直下や hero 帯で News/告知を流す。

**体感**: 「2026.03.02 …のお知らせ」が右→左に連続横スクロール。

```css
@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.ticker__track { display:inline-flex; animation: marquee 18s linear infinite; }
```
**観測元**: kikka（上部告知、News と内容連動）、oga（NEWSティッカー帯のスライドイン）。
**注意**: テキストを**2回複製**して途切れなくループ。hover/タップで一時停止できると親切。

### 技法J: ずらし配置パララックス（雑誌/マガジンレイアウト）

**いつ使うか**: 「お食事」「体験」など、整列グリッドを崩して編集感を出すとき。shuku の核。

**体感**: 複数画像を**高さ違いにオフセット配置**し、スクロールで**画像ごとに速度差ドリフト**。

```css
.mag-img { will-change: transform; } /* JS で data-speed に応じ translateY */
```
```js
const els=[...document.querySelectorAll('[data-speed]')];
addEventListener('scroll',()=>els.forEach(el=>{
  const r=el.getBoundingClientRect();
  el.style.transform=`translateY(${(r.top-innerHeight/2)*el.dataset.speed*-0.05}px)`;
}),{passive:true});
```
**観測元**: shuku「お食事」（料理＋建物を右にずらし）「体験・散策」（犬山焼/忍冬酒を高さ違い）。
**注意**: speed 差は控えめ（0.02–0.08）。整列を崩しすぎると安っぽい＝**2〜3点だけ**ずらす。

### 技法K: コラージュ/モザイク・スタッガーリビール

**いつ使うか**: 自然・世界観カットをまとめて見せる印象セクション。oga の核。

**体感**: 大小の写真が**位置とタイミングをずらしてフェード/スケールイン**し、非対称コラージュを形成。

```css
.collage figure{ opacity:0; transform:scale(.96);
  transition:opacity 1s var(--ease-sharp), transform 1s var(--ease-sharp);
  transition-delay:calc(var(--i)*.12s); }
.collage.is-in figure{ opacity:1; transform:none; }
```
**観測元**: oga（崖・波の空撮・水面・夕景・回廊が散らし配置で出現、中央の波が拡大）。
**注意**: グリッドは CSS Grid で**意図的に不揃い**に（`grid-row/column` span をバラす）。中心1点を主役に大きく。

### 技法L: 横帯（バンド）パララックス

**いつ使うか**: full-bleed の風景を帯状に分割して奥行きを出す。

**体感**: リス／空／夕景などが**横ストリップで分割表示され、帯ごとに異なる速度**で流れる。

**観測元**: oga（NATURE 配下の横帯画像群）。
**注意**: 技法J の縦版。帯の境界をあえて見せて「層」を演出。

### 技法M: ミニ画像カルーセル（セクション内スライダー）

**いつ使うか**: 1施設・1部屋に複数写真をまとめるとき。

**体感**: 右上に「‹ ○○○ ›」前後矢印＋ドット。写真がクロスフェードで切替。

**観測元**: kikka Facility（Restaurant/Sauna/Gallery Lounge 各ブロック）。
**注意**: 自動送り＋手動操作両対応。切替はスライドよりクロスフェードの方が静けさに合う。

### 技法N: ボタンの所作

**いつ使うか**: 「More」「くわしく見る」「予約」等のリンク/CTA。

**観測した3型**:
- **点線下線＋矢印**（kikka/shuku の「More ＞」「くわしく見る ＞」）: hover で下線が伸びる/矢印が右に滑る。
- **角丸ピル＋矢印**（oga「→」をカプセルで囲む）: hover で塗り反転。
- **白アウトラインのピルボタン**（shuku「宿泊予約 ＞」「お食事予約 ＞」: 暗い写真上）。

```css
.btn-line{ border-bottom:1px dotted currentColor; }
.btn-line .arrow{ transition:transform .4s var(--ease-sharp); }
.btn-line:hover .arrow{ transform:translateX(6px); }
```
**注意**: 矢印の横滑りは 4–8px。ピルは塗り反転 or 枠→塗りで。

### 技法O: スティッキーヘッダーのフェードイン

**いつ使うか**: ヒーロー通過後にグローバルナビを出す。

**体感**: スクロールが一定量を超えると、白帯ヘッダー（ロゴ／予約ボタン／ハンバーガー）が**ゴースト→不透明**で出て固定。

**観測元**: kikka（Reserve/予約ピル＋ロゴのヘッダー）、shuku/oga も固定ロゴ＋ハンバーガー。
**注意**: 出現は scrollY 閾値 or hero の IntersectionObserver out で。`backdrop-filter` 半透明より、この系統は**不透明白帯**が清潔。

### 補助: 大型日付タイポ / テクスチャ背景 / 常駐CTA

- **大型日付タイポ（News）**: oga「Apr.14」= 月略＋日 superscript の特大セリフ。リスト行に強い視覚リズム。
- **テクスチャ背景パネル**: oga の RESERVE/footer は岩肌・布のテクスチャ上に白文字。質感で締める。
- **常駐CTA（固定下部）**: 3サイト共通で「宿泊予約」を画面下に常時表示。スクロール位置を問わず予約導線を確保。

---

## サイト別シグネチャ・レシピ（丸ごと寄せたいとき）

### kikka（和モダン・構造的）
ヒーロー＝Ken Burns＋上部告知マーキー → **固定ヒーローに次パネルが被さる**（技法E） → 縦書き1文字フェードアップ（C）＋本文行スタッガー（B） → スティッキーヘッダー出現（O） → **Room はピン留め横ギャラリー**（G） → Facility はミニカルーセル（M） → News 行フェード → フッター。
→ **「レイヤーの重なり」で奥行きを出す**設計。

### shuku（和・蔵・シネマティック）
ヒーロー＝緩ズーム＋中央ロゴ拡大 → **全画面クロスフェードで外観→内観**（技法F） → ピン留め内観＋本文行フェード → 和英見出し（D） → **ずらし配置パララックスの画像**（J） → 白アウトラインのピルボタン（N） → Googleマップ → JA/ENトグル付きフッター。
→ **「画像の溶暗と余白」で没入を作る**設計。

### oga（編集・自然・マガジン）
横分割パネルのヒーロー＋NEWSティッカー → 詩的本文の行フェード（B） → **コラージュ/モザイク・リビール**（K） → **ビッグセリフ＋連番セクション**（D: 01 NATURE / CUISINE…）＋横帯パララックス（L） → 番号付きリンクリスト（01–05・サムネ＋ピル矢印） → 大型日付の News → テクスチャ背景の RESERVE → 筆文字ロゴのフッター。
→ **「特大タイポ＋散らし画像」で雑誌感を出す**設計。

---

## Do / Don't（この系統の勘所）

- **Do**: 動きは「気づくか気づかないか」の繊細さ。duration 長め・easing は終わりに止まる系。前景テキストと背景画像は**必ずレイヤー分離**。reduced-motion 分岐を用意。
- **Don't**: 跳ねる/速い easing、派手な回転・バウンド、要素の二度フェード、スクロールジャックの多用（モバイルで縦スクロールを奪いすぎない）。和文の横書き1文字割れ。

## パフォーマンス注意

- アニメーションは `opacity` / `transform` のみ（layout/paint を起こす top/height/margin を動かさない）。
- パララックス・横ギャラリーは `will-change:transform` ＋ `passive` スクロールリスナ、または scrub。
- ヒーロー画像は十分圧縮（Ken Burns で拡大される＝粗が目立つ）。

## 観測元メタ

- 抽出フレーム（30/60fps・観測作業用）: `/Users/rikukudo/.claude/jobs/<job>/tmp/{s1,s2,s3}`（一時領域・揮発）。
- 観測ログ原文: `raw/notes/2026-06-16-ryokan-3site-motion-observation.md`（要作成時）。
- 既存の対になるカタログ: [[motion-techniques]]（spade/madoguchi 由来のVFX寄り語彙）。本ドキュメントは静謐ラグジュアリー方向の補完。
