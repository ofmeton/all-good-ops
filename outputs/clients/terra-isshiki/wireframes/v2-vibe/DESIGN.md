# TERRA HAYAMA — DESIGN.md

葉山・一色の一棟貸し民泊「TERRA HAYAMA」の Web デザイン仕様。Claude / AI に渡して、**同じ世界観で別ページ・別案件を生成する種**として使う。実装の参照は同階層 `terra-hayama-vibe.standalone.html`。

---

## 1. 世界観 / デザイン原則

**静謐・余白・和モダン・手作り感・ゆとり。**

- スクロール演出が主役。ただし動きは「気づくか気づかないか」の繊細さ。派手・跳ね・回転は禁。
- **和文主体（明朝）**。英字は最小限の補助に留め、目立たせない。
- **余白で語る**。引き算の美。間（ま）を恐れない。
- 量産テンプレ感（＝大きい見出し＋派手な可変スケール＋アクセント英字）を徹底排除する。

参考の系統: 和モダン静謐ラグジュアリー旅館（kikka / shuku / oga）。

---

## 2. カラー

| トークン | 値 | 用途 |
|---|---|---|
| `--paper` | `#F5F1EA` | 漆喰白・背景・暗所の文字 |
| `--ink` | `#1A1410` | 墨・本文 |
| `--ink70` | `rgba(26,20,16,.72)` | 補足テキスト・**英字/番号** |
| `--ink45` | `rgba(26,20,16,.46)` | 最も淡い注記 |
| `--tsuchi` | `#8B5A3C` | 土。**罫線/境界/ボタン枠のみ**。テキストアクセントには使わない |
| `--mist` | `#6B7484` | 朝霧（補助） |
| `--matsu` | `#2F4538` | 松葉（補助） |
| `--suna` | `#D4C4A8` | 砂（補助・原則不使用） |

**重要ルール（気取り回避）**: 補足英字・番号は墨 `--ink70`。暗い写真の上に乗る文字は `--paper`（白）。**土色・砂色をテキストの色に使わない**（アクセント色の英字は「気取って」見える）。

---

## 3. タイポグラフィ

- 明朝（見出し・本文）: `"A1 Mincho","Zen Old Mincho",游明朝,"Hiragino Mincho ProN",serif`
- 欧文（英字・番号、控えめ・イタリック）: `"EB Garamond",serif`
- Google Fonts: Noto Serif JP / Zen Old Mincho / EB Garamond

**控えめスケール（手作り感）** — vw 係数を抑え、上限を低く。大きい見出しを避ける:

| 役割 | size |
|---|---|
| body | `clamp(14px,0.95vw,15.5px)` |
| セクション見出し `.htitle` | `clamp(18px,1.8vw,24px)` |
| 大見出し（予約/ページヒーロー） | `clamp(22px,2.8vw,31px)` |
| リード | `clamp(15px,1.3vw,17.5px)` |
| メニュー特大リンク | `clamp(22px,3.2vw,30px)` |

- line-height: body 2.0、本文 2.2 前後（ゆったり）。letter-spacing .04–.1em。
- 補足英字ラベル（Concept / The House / capacity 等の「文字の上の英字」）は**置かない**（和文主体）。英字を使うのはメニュー・リンク文（More about）・番号（01）のみ、色は墨。

---

## 4. スペーシング（ゆとり）

ゆとりを感じる世界観のため、**縦の余白は広め**に取る。

- セクション縦 padding: `clamp(96px,16vh,200px)`
- ヒーロー級（info / reserve）`.pad`: `clamp(116px,19vh,236px)`
- セクション間の区切り `.rule` の高さ: `clamp(100px,15vh,188px)`
- 左右 gutter: `clamp(24px,5.5vw,100px)`
- max-width: 1360px（本文系）/ 1100px（FAQ 等）

---

## 5. モーション

宣言的ハイブリッド（JS で class 付替 → CSS transition）。`opacity`/`transform`/`filter` のみ。

| 名称 | 内容 |
|---|---|
| **reveal** | `opacity 0→1` + `translateY 26px` + `blur 6px`、1.1s。IntersectionObserver で `.in` 付与、一度きり |
| **easing** | `--ease: cubic-bezier(.4,.12,.08,1)`（終わりに止まる sharp-out）/ `--easo: cubic-bezier(.16,1,.3,1)` |
| **emerge（滲み出る）** | 写真が `blur(22px) brightness(.55)` → クリアへ。全ページの画像登場で統一（GSAP） |
| **Ken Burns** | `scale 1→1.12`、16–22s。前景は別レイヤー固定 |
| **技法E（FV被せ）** | 固定写真の上に paper レイヤーが `margin-top:-100svh` でせり上がり覆う。境界は**水平の直線**（土色の細線1本）。`.intro` の高さ `325svh` で間（コンセプトの流れる長さ）を調整 |
| **区切り `.rule`** | 中央の細罫が `scaleX 0→1`（中央から左右へ静かに引かれる）、1.3s |
| **ROOMS pin** | 横スクロールギャラリー（GSAP ScrollTrigger、`min-width:781px` のみ。モバイルは scroll-snap） |
| **parallax** | `[data-para]`（縦ドリフト）/ `[data-paraimg]`（画像を1.16倍にして枠内パン） |
| **opening幕** | 白幕の上に黒ロゴ→幕が溶暗しつつロゴが `filter:invert()` で白へ。ナビは FV 通過後に出現（`has-fv`/`fv-passed`） |

`prefers-reduced-motion: reduce` で全演出を無効化しフォールバック表示（必須）。

---

## 6. レイアウト / コンポーネント（TOP）

`intro(FV)` → `info(The House)` → `rule` → `ROOMS(横スクロール)` → `rule` → `STAY(体験4)` → `rule` → `ACCESS` → `rule` → `OWNER` → `rule` → `FAQ` → `rule` → `RESERVE` → `footer` ＋ モバイル `dock(Airbnb)`。

- **nav**: ロゴ画像＋「JP / EN」＋ハンバーガー（全幅メニュー集約）。`mix-blend-mode:difference`。FV中は非表示。
- **info（The House）**: `info__intro`(見出し+リード) / `info__photo` / `info__facts`(数値)。**モバイルは intro→写真→facts の順**（リードを写真の上に、数値は写真の下に）。
- **ROOMS**: 横スクロールギャラリー＋画像クリックで lightbox。
- **STAY**: セクション名 sticky＋体験を縦に。`.wait` バッジで素材待ちを明示。
- **rule**: セクション区切り＝中央の細い一本罫（土色 `opacity .42`・1px・幅 clamp(60,8.5vw,116)）。

下層ページ（rooms/stay/access/owner）は `.pghero`（Ken Burns ヒーロー）＋ `.gal`/`.xp`/`.work` 等。`.intro` を持たないので nav は常時表示。

---

## 7. 世界観チューニングの記録（このプロジェクトで効いた調整）

「AI感・気取り」を抜き「手作り感・ゆとり」へ寄せた一連の判断。新規ページでも踏襲する:

1. **フォント**: 大きい見出し＋派手な vw → 控えめスケール（量産感の除去）
2. **区切り**: 波線（畔モチーフ）→ 中央の細罫（kikka「—」の発展）
3. **技法E 境界**: 波形 → 水平の直線（区切りと統一）
4. **補足英字**: tag / 見出しの en / fact ラベルを撤去 → 和文主体
5. **英字の色**: 土/砂アクセント → 墨 `--ink70`（暗背景の上は `--paper` 白）に統一
6. **余白**: 全体に拡大（ゆとり）
7. **コンセプト間隔**: intro 350→325svh（本文後の暗い間延びを解消、余韻は1/4残す）

---

## 8. Do / Don't

**Do**: 余白で語る／動きは繊細・長め・終わりに止まる easing／明朝の和文主体／英字は最小限・墨／前景テキストと背景画像はレイヤー分離／reduced-motion 対応。

**Don't**: 大きすぎる見出し／土・砂のテキストアクセント（気取り）／波形などの装飾過多／英字ラベルの多用／跳ねる・速い・回転する動き／和文の横書き1文字割れ。
