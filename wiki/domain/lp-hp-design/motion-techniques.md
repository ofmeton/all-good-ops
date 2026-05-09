---
type: concept
created: 2026-04-26
updated: 2026-05-10
sources: [[[spade-motion-study]]]
related: [[spade-motion-study]]
tags: [lp-design, motion, technique-catalog]
status: active
identity: n/a
---

# Motion Techniques Catalog — LP/HP 制作の引き出し

LP/HP 実装で「動きをつけたい」と思った時の標準語彙。spade-co.jp 解析（2026-04-26、出所詳細は [[spade-motion-study]]）と madoguchi.inc 解析（2026-04-27）で吸収した技法を、**いつ使うか・どう書くか・参考実装のどこを見るか**をセットで記録する。次回以降、design-director / conversion-designer / rapid-hp-operator / system-engineer はここから引き出して使う。

参考実装:
- spade-co.jp ベース: `outputs/lp-experiments/spade-study/`（index.html / styles.css / app.js）
- madoguchi.inc ベース: `outputs/lp-experiments/madoguchi-study/`（index.html / styles.css / app.js）

## 基本原則（spade から学んだ設計姿勢）

- **JS で連続トゥイーンせず、CSS transition + class 付替で発火**させる「宣言的ハイブリッド」が軽くて崩れにくい
- 共通 easing は `cubic-bezier(0.4, 0.12, 0.08, 1)`（sharp-out: 最初ほぼ動かず、最後にスッと止まる）。これを CSS 変数 `--ease-sharp` に集約すると全体の質感が揃う
- ベース duration は `1.0–1.6s` の長め（短いと上品さが出ない）
- 状態クラスは `_in` / `is-v` のような短いものに統一、JS フックは `js-*` プレフィックスで責務を分離

---

## 技法 1: 文字単位ランダム delay フェード（split + scattered delay）

**いつ使うか**: ヒーロー見出し、CTA 見出し、セクション切替の display 文字。**順次タイプライターより高級感が出る**ので、編集系・スタジオ系・ラグジュアリー系の LP に向く。

**核**: 各文字を `<span class="char">` に分解し、`transition-delay` を 0.05–0.6s でランダムに散らす。順序が単調増加じゃないのがポイント。

```html
<h1 class="js-split"><span class="line">Identities in motion.</span></h1>
```

```css
.js-split .char { display:inline-block; opacity:0; transform:translateY(0.1em);
  transition: opacity 1.2s var(--ease-sharp), transform 1.2s var(--ease-sharp); }
.js-split._in .char { opacity:1; transform:translateY(0); }
.js-split .word { display:inline-block; }  /* 折返しで単語が割れない */
```

```js
// 各 .char に個別の transition-delay
c.style.transitionDelay = (Math.random()*0.55 + 0.05).toFixed(2) + 's';
```

**参考実装**: `app.js: splitChars()`、`styles.css: .js-split`

**注意**: word を `inline-block` で固める（孤児改行禁止ルール準拠）。日本語は文字単位だと折返し制御が破綻するので、**英字フレーズ専用**または**日本語は単語/句節単位**で分ける。

---

## 技法 2: 仮想スムーズスクロール（lerp + 固定 wrap）

**いつ使うか**: スクロール連動の演出を多用するサイト全般。これがあるからパララックスが滑らかになる。**重い canvas や多数の rAF 駆動要素がある時は必須**、シンプルな静的 LP では過剰。

**核**: `body` の高さを wrap の content height に合わせ、wrap を `position:fixed` で `translate3d(0, -current, 0)`。`current` は `window.scrollY` を target にして lerp（0.085 程度）。

```css
body { overflow-x:hidden; }
.wrap { position:fixed; inset:0 0 auto 0; width:100%; will-change:transform; }
```

```js
let target = 0, current = 0;
window.addEventListener('scroll', () => target = window.scrollY);
function loop() {
  current += (target - current) * 0.085;
  wrap.style.transform = `translate3d(0, ${-current}px, 0)`;
  requestAnimationFrame(loop);
}
document.body.style.height = wrap.scrollHeight + 'px';  // ネイティブスクロールバー保持
```

**参考実装**: `app.js: rafStep() + setBodyHeight()`、`styles.css: .wrap`

**注意**: `IntersectionObserver` は `position:fixed` 配下では正しく動かないので、`getBoundingClientRect().top` を rAF 内で監視して `_in` 付与する方式に切替える。アクセシビリティ的にネイティブスクロールバーは残す（キーボードナビ・スクロールバー UX 維持）。

---

## 技法 3: clip-path polygon カーテンリビール

**いつ使うか**: セクション・カード・帯状要素が**下から立ち上がる演出**。マスクや height アニメより**軽くて崩れない**。複数枚をずらす演出にも適する。

**核**: `clip-path: polygon(...)` の polygon 値を初期＝高さ 0 の線、`_in`＝フル表示に切替。

```css
.js-curtain {
  clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
  transition: clip-path 1.6s var(--ease-sharp);
  transition-delay: var(--curtain-delay, 0s);
}
.js-curtain._in {
  clip-path: polygon(0 0%, 100% 0%, 100% 100%, 0 100%);
}
```

```html
<article class="js-curtain" style="--curtain-delay:0.08s">…</article>
<article class="js-curtain" style="--curtain-delay:0.16s">…</article>
```

**参考実装**: `styles.css: .cap__card`（§02 Capabilities グリッド）

**バリエーション**:
- 上から下: `polygon(0 0%, 100% 0%, 100% 0%, 0 0%)` → `polygon(0 0%, 100% 0%, 100% 100%, 0 100%)`
- 左から右: `inset(0 100% 0 0)` → `inset(0 0% 0 0)`（後述の技法 6 と同型）

---

## 技法 4: 長距離 translateX スライドイン（slide）

**いつ使うか**: 大型タイトル・帯・横長要素の登場。**短距離（20px とか）より迫力が出る**ので display 見出しに向く。複数行のタイトルを 1 行ずつ遅延差で滑り込ませる用途に最適。

**核**: 初期 `translateX(-110%)`（要素の外側に置く）→ `_in` で `0`。`overflow:hidden` で親をクリップ。

```css
.js-slide { overflow: hidden; }
.js-slide .line {
  display: block;
  transform: translateX(-110%);
  transition: transform 1.6s var(--ease-sharp);
}
.js-slide .line:nth-child(2) { transition-delay: 0.1s; }
.js-slide._in .line { transform: translateX(0); }
```

**参考実装**: `styles.css: .js-slide`、§01/§02/§03 の見出し

---

## 技法 5: scroll-tied パララックス（速度別 transform）

**いつ使うか**: セクション番号・キャプション・装飾要素を**他要素と違う速度で動かして**奥行きを出す。微妙に使う（speed 0.05–0.2）のが上品で、強く使うと酔う。

**核**: `data-pos-speed` で要素ごとの速度係数を持ち、rAF ループで `current * speed` を transform に書き込む。

```html
<div class="js-pos" data-pos-speed="0.12">…</div>
<div class="js-pos" data-pos-speed="-0.08">…</div>  <!-- 逆方向 -->
```

```js
for (const el of parallaxEls) {
  const speed = parseFloat(el.dataset.posSpeed);
  el.style.transform = `translate3d(0, ${-current * speed}px, 0)`;
}
```

**参考実装**: `app.js: rafStep()` 内のパララックスブロック

**注意**: 仮想スクロール（技法 2）の wrap 配下に置くと、wrap の transform に**追加で**この transform が乗る。過剰なネガティブ speed は親の transform を打ち消して止まって見えるので注意。

---

## 技法 6: SVG clip-path 矢印モーフ hover

**いつ使うか**: ボタン・行リンク・カードの hover 微演出。**ふわっと色が変わる**だけのよくある hover より**意図が伝わる**ので、CTA や Selected Work リストに向く。

**核 A（描き出し型）**: SVG 矢印を `clip-path: inset(0 90% 0 0)`（右から 10% だけ見せる）で初期化し、hover で `inset(0 0% 0 0)` に。**矢印が左から伸びるように描かれる**。

```css
.work__arrow {
  clip-path: inset(0 90% 0 0);
  transition: clip-path 1.2s var(--ease-sharp);
}
.work__link:hover .work__arrow {
  clip-path: inset(0 0% 0 0);
}
```

**核 B（二段ロール型）**: 同じ位置に矢印 2 つ（本体・ghost）を重ね、hover で本体は `translateX(110%)` で右に退避、ghost は `translateX(-110%)` から `0` に滑り込む。**色も同時に変わる**ので印象が強い。

```css
.cta__btn-arrow { position: relative; overflow: hidden; }
.cta__btn-arrow svg { position: absolute; transition: transform 1.2s var(--ease-sharp); }
.cta__btn-arrow svg.ghost { transform: translateX(-110%); color: var(--vermillion); }
.cta__btn:hover .cta__btn-arrow svg:not(.ghost) { transform: translateX(110%); }
.cta__btn:hover .cta__btn-arrow svg.ghost { transform: translateX(0); }
```

**核 C（ラベル roll-up 型）**: ラベル文字を 2 つ縦に重ね、hover で `translateY(-100%)` してロール。spade のヘッダーリンクで使われる「色違いラベルが上に出る」演出。

```css
.hd__a { overflow: hidden; height: 1em; }
.hd__a-lab { transition: transform 1s var(--ease-sharp); }
.hd__a::after { content: attr(data-label); position: absolute; top: 100%; color: var(--accent); }
.hd__a:hover .hd__a-lab,
.hd__a:hover::after { transform: translateY(-100%); }
```

**参考実装**: `styles.css: .work__arrow / .cta__btn-arrow / .hd__a`

---

## 技法 7: Three.js wave-field WebGL 背景

**いつ使うか**: ヒーローを「何かが動いている」状態にしたい時。**動画背景より軽量・解像度フリー・ブランドカラー連動**できる。VFX/スタジオ/サイエンス系のトンマナに合う。L1（30,000 円）には過剰、L2/L3 で「フルカスタム感」を出すのに最適。

**核**: 平面状に配置した LineSegments を sum-of-sines で displace。シェーダー不要、three の素の API のみで書ける。

```js
import * as THREE from "https://unpkg.com/three@0.144.0/build/three.module.js";

const lineCount = 56, segCount = 96;
const lines = [];
for (let i = 0; i < lineCount; i++) {
  const positions = new Float32Array(segCount * 3);
  const z = (i/(lineCount-1) - 0.5) * 12;
  for (let j = 0; j < segCount; j++) {
    positions[j*3]   = (j/(segCount-1) - 0.5) * 14;
    positions[j*3+2] = z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xC8412B, transparent:true, opacity:0.5 })));
  lines.push({ line, positions, z });
}

function frame() {
  const t = performance.now() * 0.0006;
  for (const {positions, z} of lines) {
    for (let j = 0; j < segCount; j++) {
      const x = (j/(segCount-1) - 0.5) * 14;
      positions[j*3+1] =
        Math.sin(x*0.55 + t*1.4) * 0.42 +
        Math.sin(z*0.85 + t*0.9) * 0.32 +
        Math.cos(x*0.32 + z*0.42 + t*0.7) * 0.22;
    }
  }
  // ...
}
```

**参考実装**: `app.js: initThree()`

**注意**:
- `prefers-reduced-motion: reduce` で必ず無効化（動きが苦手な人への配慮 + バッテリー）
- `document.hidden` で背景タブ時は描画停止
- 単色だと安っぽいので、**1 本だけ違う色**を 9 本おきに混ぜると深みが出る（spade も同じ手）

---

## 補助技法

### grain overlay（粒子ノイズ）
全画面 `position:fixed` で SVG turbulence の background-image を `mix-blend-mode: multiply` + `opacity: 0.18` 程度。**1.2s steps(4) でじわっとずらすと「フィルム感」が出る**。
参考: `styles.css: .grain` / `@keyframes grain-shift`

### difference-blend ヘッダー（自動コントラスト）
`mix-blend-mode: difference; filter: invert(1);` でヘッダー文字が**背景色に応じて自動で白/黒に切替**。spade と同じ手。Safari で稀にチラつくのでモバイルでは無効化。
参考: `styles.css: .hd`

### Fraunces 可変フォントの opsz/SOFT/WONK 切替
display 用に `font-variation-settings: "opsz" 144, "SOFT" 0, "WONK" 0` をベースに、`em` だけ `"SOFT" 80, "WONK" 1` でイタリック化＋色替え。**タイトルの 1 単語だけ朱**みたいな編集系の演出が安定して作れる。
参考: `styles.css: .f-display em`

---

## 引き出しの使い分け早見表

| 案件タイプ | 必須 | 推奨 | 過剰 |
|---|---|---|---|
| L1 Single LP（30k） | 1, 4, 6 | 3 | 2, 5, 7, 8, 11, 12 |
| L2 Corporate 5P（80k） | 1, 3, 4, 6, 13, 14 | 2, 5, 10, 15, 16 | 7, 8, 11（条件付き） |
| L3 LP+広告（100k） | 1, 3, 4, 6, 13, 14 | 2, 5, 9, 15, 16 | 7, 8, 11（条件付き） |
| ハイエンド/受賞狙い | 全部 | — | — |

L1 で重い（2/5/7/8/11/12）を入れると採算が崩れるので注意。逆に L3 で 1/4/6 だけだと薄いので、最低 3 と 5 は欲しい。**madoguchi 系（ヒーローピン + 物語性）は L2/L3 のフラッグシップ案件で効く**。

---

## 技法 8: ヒーローピン + 多シーン横ストリーミング（GSAP ScrollTrigger）

**いつ使うか**: ヒーローを「1枚絵」ではなく「3〜4 シーンの物語」に拡張したい時。**訪問者を最初の数秒で世界観に引き込みたい**フラッグシップ案件向け。L1 では過剰、L2/L3 で 1 案件 1 個まで。

**核**: GSAP ScrollTrigger の `pin` で hero 区間を画面に固定し、その内側で `data-scene` を持つ複数の絶対配置レイヤーを `is-on` クラスで切替える。スクロール進捗 0–.33 / .33–.66 / .66–1 で 3 シーン。

```css
.hero { position: relative; /* 高さは pin-spacer に支配させる、固定値NG */ }
.hero__pin { position: relative; width: 100%; height: 100vh; overflow: hidden; }
.hero__scene { position: absolute; inset: 0; opacity: 0; visibility: hidden;
  transition: opacity .9s var(--ease-sharp), visibility 0s linear .9s; }
.hero__scene.is-on { opacity: 1; visibility: visible;
  transition: opacity .9s var(--ease-sharp), visibility 0s linear 0s; }
```

```js
ScrollTrigger.create({
  trigger: hero, start: 'top top', end: '+=220%', pin: heroPin, pinSpacing: true,
});
ScrollTrigger.create({
  trigger: hero, start: 'top top', end: '+=220%',
  onUpdate: (self) => {
    const idx = self.progress < 0.33 ? 1 : self.progress < 0.66 ? 2 : 3;
    scenes.forEach(s => s.classList.toggle('is-on', parseInt(s.dataset.scene,10) === idx));
  },
});
// 全 ST 登録後に refresh() を window.load + fonts.ready で呼ぶ（座標の再計算）
window.addEventListener('load', () => requestAnimationFrame(() => ScrollTrigger.refresh()));
document.fonts?.ready.then(() => ScrollTrigger.refresh());
```

**参考実装**: `madoguchi-study/app.js` のヒーロー pin ブロック / `styles.css: .hero / .hero__pin / .hero__scene`

**ハマりどころ（実装で詰まった点を記録）**:
- `.hero` に固定 height を指定すると pin-spacer が hero の中で潰れて、後続 section のレイアウト位置がズレる。**hero は高さを指定しない**、子の `.hero__pin` だけ `height: 100vh` にする
- pin 後に作る他の ScrollTrigger は古い座標で start/end を計算する。**全 ST 登録後 + フォントロード後に `ScrollTrigger.refresh()`** を必ず呼ぶ
- pin 中のシーン切替アニメーションは「opacity + visibility 切替」で覆う。visibility transition の delay を活用すると、消える側のレイヤーが完全フェード後に non-interactive になる

---

## 技法 9: 流れる擬似コード文字背景

**いつ使うか**: ハイテク感・知的さを演出したい LP のヒーロー〜セクションの装飾レイヤー。**動画背景より軽量で、文字情報が「読み取れそうで読めない」絶妙な情報密度**を作れる。L1 で 2 行、L2/L3 で 6〜10 行が目安。

**核**: 擬似コードの英文を `position: absolute; pointer-events: none` で 1 セクションあたり 6〜10 行配置。透明度 0.18〜0.28、等幅フォント、`white-space: nowrap`。

```html
<p class="codeStream is-left" aria-hidden="true">
  <span>const morning = await sun.rise();</span>
  <span class="is-indent">if (room.warmth &lt; 0.4) curtain.open();</span>
  <span>const visible = lives.filter(l =&gt; l.glow &gt; 0.5);</span>
</p>
```

```css
.codeStream { position: absolute; z-index: 3; pointer-events: none;
  font-family: ui-monospace, "JetBrains Mono", Menlo, monospace;
  font-size: 11px; color: rgba(255,255,255,.18); line-height: 1.7;
  white-space: nowrap; letter-spacing: 0; }
.codeStream span { display: block; }
.codeStream span.is-indent { padding-left: 1.5em; }
.codeStream.is-left { left: 2vw; bottom: 6vh; max-width: 36vw; }
.codeStream.is-right { right: 2vw; top: 12vh; max-width: 36vw; }
```

**参考実装**: `madoguchi-study/index.html: .hero__codeStream`

**注意**: 文章の意味は LP のテーマと**ゆるく**関連づける（暮らし系なら `room.warmth`、coffee 系なら `bean.roast()` 等）。完全ランダム英文だと冷たく見える。

---

## 技法 10: 粒子 + 接続線 canvas（network particles）

**いつ使うか**: セクションの**左右絶対配置の装飾レイヤー**として、 「動いている」感を控えめに加える。テクノロジー・データ系の文脈で説得力が出る。 L2/L3 のキー section に 1 個まで。

**核**: requestAnimationFrame で粒子座標を更新、距離が閾値以下のペアに線を描く。粒子数は `Math.round((w * h) / 7000)` 程度（広いほど多い）。

```js
const ctx = canvas.getContext('2d');
const dpr = Math.min(2, devicePixelRatio || 1);
function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  particles = Array.from({length: Math.round((rect.width*rect.height)/7000)}, () => ({
    x: Math.random()*rect.width, y: Math.random()*rect.height,
    vx: (Math.random()-0.5)*0.18, vy: (Math.random()-0.5)*0.18,
  }));
}
function step() {
  if (document.hidden) return requestAnimationFrame(step);
  ctx.clearRect(0,0,w,h);
  for (const p of particles) { p.x+=p.vx; p.y+=p.vy;
    if (p.x<0||p.x>w) p.vx*=-1; if (p.y<0||p.y>h) p.vy*=-1; }
  for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
    const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
    const d2=dx*dx+dy*dy;
    if (d2 < 110*110) {
      ctx.strokeStyle = `rgba(216,200,164,${(1-d2/(110*110))*0.5})`;
      ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y);
      ctx.lineTo(particles[j].x,particles[j].y); ctx.stroke();
    }
  }
}
```

**参考実装**: `madoguchi-study/app.js: 粒子＋接続線 canvas` / `styles.css: .st__particle`

**注意**: `prefers-reduced-motion: reduce` で停止、`document.hidden` で背景タブ時に描画スキップ。色はサイトのアクセント色に揃えると統一感が出る。

---

## 技法 11: マウスストーカー（ラベル付きカーソル）

**いつ使うか**: クリッカブル領域に対する**期待値ブースト**。「ここをクリックすると何が起きるか」を hover 時にカーソル自体に出す。L2/L3 の Selected Work / Member セクションで効く。L1 では過剰、モバイルでは無効化必須。

**核**: 通常時はネイティブカーソルを `cursor: none` で消し、`position: fixed` の独自要素を mousemove に lerp 追従。`.js-stalker` 領域に enter/leave で拡大＋ラベルを出す。

```html
<div class="cursor js-cursor" aria-hidden="true">
  <div class="cursor__dot"></div>
  <div class="cursor__ring"></div>
  <div class="cursor__lab"><span class="cursor__labTxt"></span></div>
</div>
<a class="js-stalker" data-stalker-text="勝ち筋のつくり方を見る" href="#works">…</a>
```

```css
@media (hover: hover) and (pointer: fine) and (min-width: 1024px) { body, a, button { cursor: none; } }
.cursor { position: fixed; left: 0; top: 0; pointer-events: none; z-index: 95; }
.cursor__ring { width: 28px; height: 28px; border: 1px solid rgba(255,255,255,.55);
  mix-blend-mode: difference;
  transition: width .6s var(--ease-sharp), height .6s var(--ease-sharp); }
.cursor.is-stalk .cursor__ring { width: 180px; height: 180px;
  background: rgba(45,74,58,.85); mix-blend-mode: normal; }
.cursor.is-stalk .cursor__lab { opacity: 1; }
@media (max-width: 1023px) { .cursor { display: none; } }
```

```js
let tx=-100,ty=-100,cx=-100,cy=-100;
addEventListener('mousemove', e => { tx=e.clientX; ty=e.clientY; });
(function loop(){ cx+=(tx-cx)*.18; cy+=(ty-cy)*.18;
  cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
document.querySelectorAll('.js-stalker').forEach(el => {
  el.addEventListener('pointerenter', () => { cursor.classList.add('is-stalk');
    labTxt.textContent = el.dataset.stalkerText || ''; });
  el.addEventListener('pointerleave', () => { cursor.classList.remove('is-stalk');
    labTxt.textContent = ''; });
});
```

**参考実装**: `madoguchi-study/app.js: マウスストーカー` / `styles.css: .cursor`

**注意**: モバイルでは `(hover: hover) and (pointer: fine)` のメディアクエリで完全に切る。ラベル文言は section ごとに変えると「今クリックすべきもの」のヒントになる（madoguchi では 「勝ち筋のつくり方を見る」「メンバーを見る」と切替えていた）。

---

## 技法 12: セクション横断のヘッダー色トグル

**いつ使うか**: 1 ページ内で**明背景と暗背景が交互に来るレイアウト**。固定ヘッダーの文字色を、現在通過中のセクションの背景に応じて自動で flip する。 spade で使った `mix-blend-mode: difference` 方式と違い、こちらは**明示的に classMap する**ので Safari で安定。

**核**: 各セクションに `data-color="dark|light"` を付与し、 ScrollTrigger の `start: 'top 64px'` と `onEnter / onEnterBack` でヘッダーに `is-light` を付け外し。

```html
<section data-color="light" class="js-headerToggle">…</section>
<section data-color="dark" class="js-headerToggle">…</section>
```

```js
document.querySelectorAll('[data-color]').forEach(sec => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 64px', end: 'bottom 64px',
    onEnter: () => header.classList.toggle('is-light', sec.dataset.color === 'light'),
    onEnterBack: () => header.classList.toggle('is-light', sec.dataset.color === 'light'),
  });
});
```

```css
.hd { color: #fff; transition: color .6s var(--ease-sharp); }
.hd.is-light { color: var(--ink); }
```

**参考実装**: `madoguchi-study/app.js: ヘッダー色トグル` / `index.html: data-color`

**注意**: `data-color` を持たないセクションは色が切り替わらない。CTA ボタンの背景色も追従させたい時は CSS 変数で `--btn-bg` を切り替えると一括反映できる。

---

## 技法 13: 大型 display タイトルの bleed（左右はみ出し）

**いつ使うか**: セクションタイトルを「装飾」ではなく「景観」として置きたい時。**「社員紹介」「採用情報」「成果事例」のような短い日本語**を 14vw 級まで巨大化して、左右に少しはみ出すと印象が強い。 conversion-designer の引き出しに常駐させる。

**核**: タイトルに `white-space: nowrap; margin-left: -8vw` でわずかに左 bleed、IntersectionObserver で `is-active` 付与時に内部 span を `translateX(-12%) → 0` で滑り込ませる。

```css
.u-bleed { white-space: nowrap; position: relative; margin-left: -8vw; }
.u-bleed > span { display: inline-block; }
.js-bleedTitle > span { transform: translateX(-12%); opacity: 0;
  transition: transform 1.4s var(--ease-sharp), opacity 1s var(--ease-sharp); }
.js-bleedTitle.is-active > span { transform: translateX(0); opacity: 1; }
```

```js
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-active'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.js-bleedTitle').forEach(el => io.observe(el));
```

**参考実装**: `madoguchi-study/styles.css: .u-bleed / .u-sectionTitle / .mb__title / .rc__title`

**注意**: モバイルでは `margin-left: -6vw` 程度に縮める。フォントは Fraunces / Noto Serif JP のような骨格のあるディスプレイ書体が映える（system serif だと弱い）。

---

## 技法 14: 写真コラージュ + 個別フェードアップ

**いつ使うか**: ヒーロー 2 シーン目のような「世界観紹介」レイヤー。**1 枚絵より情報量が増え、各要素に個性が出る**。 L2/L3 のヒーロー or About セクションの装飾。

**核**: 写真 3〜5 枚を `position: absolute` で散らし、各々に `--d` 変数で 0.0s / 0.12s / 0.24s …の遅延差。親に `is-on` が付くと `opacity: 0 → 1` + `translateY(28px) → 0`。

```css
.hero__photo { position: absolute; background-size: cover;
  opacity: 0; transform: translateY(28px);
  transition: opacity 1.4s var(--ease-sharp), transform 1.4s var(--ease-sharp);
  transition-delay: var(--d, 0s); }
.hero__scene--2.is-on .hero__photo { opacity: 1; transform: none; }
.hero__photo--a { width: 36vw; aspect-ratio: 1/1; top: 18vh; left: 50%;
  transform: translateX(-50%) translateY(28px); --d: 0.0s; }
.hero__scene--2.is-on .hero__photo--a { transform: translateX(-50%) translateY(0); }
```

**参考実装**: `madoguchi-study/styles.css: .hero__collage / .hero__photo--a / b / c`

**注意**: コラージュ全体に `opacity: .55` + 親に dark overlay (`radial-gradient`) を被せると、上に乗せるコピーが**確実に読める**。テキストとの z-index 競合は最初から overlay で解決しておく（後付けで直すのは面倒）。

---

## 技法 15: 横マーキー with 画像混在

**いつ使うか**: フッター手前の Recruit / About 帯で「動的なリズム」を作りたい時。**5 件以上の繰り返しコンテンツ + 画像**を無限ループで流す。 既存 feedback「繰り返しコンテンツは横マーキーを標準採用」の実装パターン。

**核**: 同じシーケンスを 2 回連結し、`animation: marquee 32s linear infinite; transform: translateX(-50%)` で 50% 移動 = 1 周。 `mask-image` で左右フェード。 hover で `animation-duration` を 64s に増やすと「読ませる」演出に。

```css
.marquee { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.marqueeTrack { display: flex; width: max-content; animation: marquee 32s linear infinite; }
.marquee:hover .marqueeTrack { animation-duration: 64s; }
.marqueeSeq { display: flex; align-items: center; gap: 36px; padding-right: 36px; }
.marqueeImg { width: clamp(64px, 9vw, 120px); height: clamp(64px, 9vw, 120px);
  background-size: cover; border-radius: 999px; flex-shrink: 0; }
@keyframes marquee { to { transform: translateX(-50%); } }
```

```html
<div class="marqueeTrack">
  <div class="marqueeSeq">…テキスト＋画像…</div>
  <div class="marqueeSeq" aria-hidden="true">…同じ内容を複製…</div>
</div>
```

**参考実装**: `madoguchi-study/styles.css: .rc__marquee / .rc__marqueeTrack / .rc__marqueeSeq`

**注意**: シーケンスを 2 回複製しないと末尾でジャンプが見える。 hover 減速は memory の `feedback_marquee_for_repeating_content` と整合（CSS Houdini @property も併用するとさらに洗練）。
