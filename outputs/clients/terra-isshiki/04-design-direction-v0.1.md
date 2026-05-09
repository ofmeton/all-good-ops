# TERRA HAYAMA — Design Direction v0.1

作成日: 2026-05-09
作成者: 工藤陸
参考サイト: 原ヽ居（gentenkyo.jp）/ 真鶴出版 / マスヤゲストハウス / Chabudai

---

## 🎯 ビジョン（One-line）

**「葉山の風景に、ゆっくり溶ける宿。」**
時間の流れを緩めて、訪れる人の呼吸を整える、和モダンの一棟貸し。

---

## 🎨 Aesthetic Direction

**Editorial Japanese × 葉山の自然オマージュ**

落ち着き・静寂・上品・余白多。明朝体を主役に、写真を余白で活かす編集レイアウト。
原ヽ居のトーン（ティールオーバーレイ・山影シルエット）を継承しつつ、葉山仕様（海岸線・松緑・棚田）に翻案する。

---

## 🌈 Color System

| 用途 | 色名 | HEX | 出典 |
|---|---|---|---|
| Base Light | 漆喰白 | `#F5F1EA` | 物件の漆喰壁 |
| Base Dark | 墨黒 | `#1A1410` | 染料・佇まい |
| Accent 1 | 朝霧グレー | `#6B7484` | 海越しの富士・夕霧 |
| Accent 2 | 棚田の土 | `#8B5A3C` | BEAT ICE 棚田 |
| Accent 3 | 松緑 | `#2F4538` | 葉山の松林 |
| Accent 4 | 砂浜ベージュ | `#D4C4A8` | 一色海岸の砂 |
| Overlay | 墨グラデ | `linear-gradient(135deg, rgba(26,20,16,0.45), rgba(26,20,16,0.15))` | テキスト可読性 |

---

## ✒️ Typography

| 用途 | フォント | 備考 |
|---|---|---|
| Display（大見出し） | **Noto Serif JP** Bold/Black | 太く・大判で印象づけ |
| Body 和文 | **Zen Old Mincho** Regular | 本文・段落 |
| Body 英文 | **EB Garamond** | 副題・キャプション |
| 数字 | **EB Garamond Tabular** | 価格・住所等 |

**サイズ階層（desktop / mobile）**:
- H1: 64px / 36px
- H2: 40px / 28px
- H3: 24px / 20px
- Body: 17px / 15px (line-height 1.85)
- Caption: 13px / 12px (letter-spacing 0.08em)

---

## 🌀 Motion Principles

| 場面 | 動き | 時間 |
|---|---|---|
| **Hero Ken Burns** | `scale(1.0) → scale(1.08)` cubic-bezier(0.4, 0, 0.2, 1) | 8s ループ |
| **Hero Cross-fade** | 隣接画像 opacity 重ね | 1.5s |
| **スクロール fade-up** | `translateY(24px) blur(4px) opacity(0)` → 元位置 | 0.6s |
| **Hover (link)** | underline が左→右に伸びる | 0.3s |
| **Page transition** | 上下 fade-out + fade-in | 0.4s |

**禁止事項**:
- バウンス・ジャンプ系（過剰演出）
- 派手なパーティクル
- 全部の要素に動きを付ける

**原則**: motion は「見せたいもの」の補助。視線を奪わない。

---

## 🏗️ Spatial / Layout

### グリッド
- Desktop: 12-col grid, gutter 24px, max-width 1280px
- Mobile: 1-col, padding-x 24px

### 余白（Vertical Rhythm）
- セクション間: 160px / 80px (desktop / mobile)
- 段落間: 32px / 24px

### 編集レイアウト原則
- **左寄せ書類風**（中央揃えは控えめ）
- **アシメトリック**な見出し配置
- **縦書き要素** を CTA・サブタイトルに使う（和の佇まい）
- **写真フルブリード** + 横にテキストが食い込む構成

---

## 🎭 Differentiation（記憶に残る一点）

1. **Hero 右辺の縦書き CTA**「予約は Airbnb から →」
2. **Hero 下端の山影 SVG**（葉山の二子山 + 一色海岸の波線 → gentenkyo の山影オマージュ・葉山版）
3. **和紙テクスチャの noise overlay**（subtle、写真に重ねる）

---

## 📐 ページ別テンプレート

### Home（FV メイン）
```
┌─────────────────────────────────────────┐
│ [logo]                  [nav: Home...]  │ 左上ロゴ・右上ナビ
│                                          │
│   ┌──────────────────┐                  │
│   │  KEN BURNS        │  予            │
│   │  4枚 8s/枚         │  約             │
│   │  cross-fade 1.5s   │  は             │
│   │                    │  Air            │
│   └──────────────────┘  bnb             │
│                                          │
│  TERRA HAYAMA                            │
│  葉山の風景に、ゆっくり溶ける。           │
│  一色海岸まで徒歩 8 分の宿               │
│  ──────── 山影 SVG ────────              │
└─────────────────────────────────────────┘
```

### About / Rooms / Stay / Access
- 各ページ Hero（フルブリード写真）+ Editorial 本文
- 1 セクション 1 主題、写真とテキストを左右交互に
- 縦書き引用（コンセプト文の一節を装飾的に配置）

---

## 🚫 Don'ts

- 紫系グラデ（AI slop の典型）
- Inter / Roboto / system-ui font（個性が出ない）
- 中央揃え一辺倒のレイアウト
- パララックス過剰
- ホバーエフェクトを全要素に付ける
- カードに丸い角を多用（モダン Saas 風になる）
- アイコン多用（葉山の世界観に合わない）

---

## ⏭️ 実装メモ

- Next.js 16 + TypeScript + Tailwind + App Router
- next/font で Noto Serif JP / Zen Old Mincho / EB Garamond を ローカル配信
- next/image で WebP 自動変換 + lazy load
- Ken Burns は CSS keyframes（無理に Motion ライブラリ使わず軽量）
- 多言語: next-intl で /ja /en パス分け
- Vercel hobby 無料枠でデプロイ
