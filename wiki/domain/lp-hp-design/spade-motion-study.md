---
type: source
created: 2026-04-26
updated: 2026-05-10
sources: [raw/notes/2026-04-26-spade-motion-absorption.md]
related: [[motion-techniques]]
tags: [lp-design, motion, source, spade]
status: active
identity: n/a
---

# spade-co.jp モーション技法吸収 — 出所記録

[[motion-techniques]] に収録された技法 1〜7 の出所。
spade-co.jp の VFX サイトを Playwright で観測駆動で分解し、技法を抜き出して再実装した。

## セッション概要

- 日時: 2026-04-26 22:30 JST
- 解析対象: spade-co.jp（VFX 制作会社、暗黒系トーン）
- 成果物（参考実装）: `outputs/lp-experiments/spade-study/`（index.html / styles.css / app.js）— 7 技法全部入り

## 解析アプローチ

**観測駆動**:
- 推測で語らず Playwright で `data-attr` 集計・computed style・transform 値・SVG clip-path 値を直接読み出し
- `data-engine="three.js r144"` という決定的シグナルから設計図を再構築
- 完了報告前に内部状態まで実機検証

**美学の置換**:
- 本家（VFX 暗黒）と**真逆の美学**を選んで「クローンではなく吸収」にした
- bone × ink × vermillion の編集系トーンに置換、Fraunces 可変フォントの opsz/SOFT/WONK 軸切替まで踏み込み
- 技法は同じでも別物に見える成果物

## 抽出した 7 技法

[[motion-techniques]] §技法 1〜7 を参照。

1. 文字単位ランダム delay フェード（split + scattered delay）
2. 仮想スムーズスクロール（lerp + 固定 wrap）
3. clip-path polygon カーテンリビール
4. 長距離 translateX スライドイン（slide）
5. scroll-tied パララックス（速度別 transform）
6. SVG clip-path 矢印モーフ hover（描き出し / 二段ロール / ラベル roll-up）
7. Three.js wave-field WebGL 背景（sum-of-sines displace）

## 関連ハマりどころ（運用メモ）

詳細は memory `feedback_local_static_serve.md` / `feedback_playwright_raf_observe.md` 参照。

- python http.server: `--directory <abs>` 指定で 1 ショット起動が安全（CWD 依存を作らない）
- Playwright で rAF 駆動の状態観測: 短い `evaluate` × 複数回に分割（`setTimeout` Promise 内蔵は browser closed を誘発）
- screenshot 階層付きパス指定時は事前 `mkdir` が必要

## raw source

- `raw/notes/2026-04-26-spade-motion-absorption.md` — セッション振り返り全文（62 行）
