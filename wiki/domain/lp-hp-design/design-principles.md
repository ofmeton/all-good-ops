---
type: concept
created: 2026-05-10
updated: 2026-05-10
sources: [raw/notes/lp-design-learnings.md]
related: [[motion-techniques]], [[spade-motion-study]], [[image-processing/techniques]]
tags: [lp-design, mobile-first, typography, css, playwright, bsa]
status: active
---

# LP/HP 設計原則カタログ

> BSA L1/L2/L3 案件の LP/HP 実装で繰り返し適用する設計原則。
> 実装着手前に `frontend-design` スキルと合わせて参照する。

---

## 1. スマホファースト（大前提）

BSA LP/HP は**モバイル縦長を主、デスクトップを従**として設計する。

| 設計対象 | ルール |
|---|---|
| 画像生成プロンプト | 縦長モバイル寸法（目安 1080×3600px）を指定 |
| 実装 CSS | 375px 基準で書き、768px 以上をメディアクエリで追加 |
| DESIGN.md | `Responsive Behavior` 節は「モバイル → PC」順 |
| CTA 配置 | 画面下部固定バー（LINE予約・Web予約・電話）を全画面共通の第一設計 |
| デスクトップモック | 原則生成しない（必要な時のみ派生）|

**理由**: 地域事業者（整体院・美容室・工務店・飲食）の流入はモバイル比率が圧倒的。デスクトップ先行設計だとモバイル UX の肝（下部固定CTA・1カラム・タップサイズ）が後付けになる。

---

## 2. 日本語ヒーローコピーの改行制御（3段構え）

日本語は任意文字間で改行可能なため、大見出しを幅変化に晒すと意図しない位置で折れる。**3層を最初から同時に設計する**。

### 実装パターン
```jsx
/* 層 1: 論理行を span.line で分ける */
<h1>
  <span className="line">最短72時間で</span>
  <span className="line">納品します。</span>
</h1>
```
```css
.line { display: block; white-space: nowrap; }
```

```jsx
/* 層 2: 各 line を意味単位 chunk に分ける */
<span className="line">
  <span className="chunk">最短72時間</span><span className="chunk">で納品。</span>
</span>
```
```css
.chunk { white-space: nowrap; }
```

```css
/* 層 3: モバイルで line を normal に戻す（chunk 境界で自然改行） */
@media (max-width: 640px) {
  .line { white-space: normal; }
}
```

**出す前のチェック**: desktop 1行 / 中幅 chunk 境界以外で折れない / モバイル chunk 境界で改行 の3条件を満たすか確認。

---

## 3. 孤児改行の禁止

LP/HP の見出し・コピー・リード文で意味のかたまりが分断される「孤児改行」は許容しない。

**修正手段の優先順位**:
1. コピー文字列に `<br>` を埋め、`dangerouslySetInnerHTML` or React Fragment + `<br>` で展開
2. `text-wrap: balance` を併用
3. `<span class="row">` + `white-space: nowrap`（`width: 数値px` 固定幅は禁止）

**実装後の必須確認**: desktop / tablet / mobile の 3 breakpoint で全見出し・リード文の改行位置を実機確認。

---

## 4. absolute 配置コラージュの 4 段 scale 設計

Hero 周辺のコラージュ型コンポーネント（absolute + 固定px 配置）はビューポート幅変化で崩れる。**4 breakpoint を同時に設計する**。

| ビューポート | scale | 備考 |
|---|---|---|
| ≤1280px | 0.9 | やや余裕 |
| ≤1100px | 0.8 | 1カラム直前 |
| ≤960px | 0.78 + `transform-origin: top center` | 1カラム化 |
| ≤640px | 0.5前後 + `transform-origin: top center` | **display:none 禁止** |

```css
.collage { transform-origin: top right; }
```

自己チェック: 1440/1200/960/640px の 4 点で破綻していないか走査してから出す。

---

## 5. 繰り返しコンテンツの無限マーキー（標準パターン）

5件以上の繰り返しコンテンツ（お客様の声・ロゴ・実績バッジ）は**横方向の無限マーキー**を第一選択とする。

```css
.marquee-wrap {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
}
.marquee-track {
  display: flex; gap: 20px; width: max-content;
  animation: marquee 60s linear infinite;
  will-change: transform;
}
@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@media (prefers-reduced-motion: reduce) { .marquee-track { animation: none } }
```

**実装上の必須要素**:
- アイテムを2セット連結（`[...items, ...items]`）して `translateX(-50%)` でシームレスループ
- 両端マスクフェード（上記 CSS の mask-image）
- `prefers-reduced-motion` 対応
- **hover 停止はしない**（常時動き続けるのが最良。カク感は技術的に解消できない）

**速度の目安**:
- 声・5枚程度: 60s / ロゴ・10-20個: 40s / 施工事例: 80s

---

## 6. 日本語コピーの文体規定

| 区分 | ルール |
|---|---|
| 原則 | 各文に具体的な操作・要素・現象を必ず1つ含める |
| 抽象表現 | 1段落に1〜2個まで |
| 禁止語 | 「ちゃんと」「ふっと」「ばらす」「もくじ」「引き出し」（比喩） |
| 禁止パターン | 英文直訳調・詩的気取り表現（「手触り」「体温」「一筆書き」） |
| 専門用語 | WebGL / ホバー / パララックス 等はそのまま使用 OK |

「賢そう・信頼感」を狙って抽象に振ることは**撤回済みの基準**。

---

## 7. SPA fade-in サイトの Playwright スクショ

React SPA + IntersectionObserver fade-in 構成では、ヘッドレス Chrome 単体で **FV 以外のセクションが opacity:0 のまま撮れない**。

| 確認内容 | 推奨手段 |
|---|---|
| レイアウト確認（ロゴ・改行・色） | ヘッドレス Chrome で FV のみ |
| インタラクション確認 | Playwright MCP 必須 |
| 全セクション可読性確認 | Playwright MCP or ユーザー実機 |

**Playwright での forced-visible 化**:
```js
document.querySelectorAll(".fade-in").forEach(e => e.classList.add("visible"))
```

**Playwright が切断中の時**: 「FV のみ確実。それ以外は実機確認をお願いします」と先に明示。

---

## 関連スキル・ページ

- `frontend-design` プラグインスキル（実装着手前に必ず起動）
- [[motion-techniques]] — LP/HP 演出技法カタログ（spade-co.jp 解析由来）
- `.claude/skills/chromakey-grid-split.md` — LP素材切り出し
