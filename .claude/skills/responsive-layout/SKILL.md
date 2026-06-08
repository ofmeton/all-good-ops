---
name: responsive-layout
description: LP/HP 制作におけるレスポンシブ崩れ対策の規約 + 検証スクリプト（responsive-snap / responsive-audit）案内。実装着手時 / 全 viewport 確認時 / レイアウト崩れ報告時に必ず参照。ui-ux-pro-max スキルとペアで使う
---

# Responsive Layout — 規約 + 検証

## 起動条件

- LP / HP / クライアントサイトの新規実装に入る前
- 「レイアウト崩れた」「viewport」「レスポンシブ」「サイズ合わない」報告
- 既存サイトを別 viewport で確認する直前
- v1 リリース前のチェックリストとして

## ワークフロー（10 分目標）

```
変更 → snap（全viewport 1分）
     → 横スクロール検出箇所のみ目視
     → fix
     → 再 snap
     → commit
```

audit は大改修前 / 新規プロジェクトレビュー時のみ。日常は snap で回す。

## 検証スクリプト

### responsive-snap.sh — 全 viewport スクショ + 横スクロール検出
```bash
./scripts/responsive-snap.sh [URL] [PAGES] [PRESET]

# 例:
./scripts/responsive-snap.sh http://localhost:3000 "/,/about,/rooms,/stay,/access"
./scripts/responsive-snap.sh http://localhost:3001 "/" lp
```

- URL=`http://localhost:3000` PAGES=`/` PRESET=`default` がデフォルト
- PRESET: `default`(320/390/768/1024/1440/1920) / `lp`(390/768/1280/1440) / `mobile`(320/375/390/430)
- 出力: `tmp/responsive/<timestamp>/{manifest.json,report.json,*.png}`
- Exit code: `0` clean / `1` console error / `2` overflow / nav error
- fade-up は強制可視化、fonts.ready + 1s 待機

stdout サマリ例:
```
page | 320 | 390 | 768 | 1024 | 1440 | 1920
home | OF+257 | OF+187 | OF+235 | ok | ok | ok
...
```
`OF+N` = 横スクロール N px 発生 → そのページ・viewport だけ目視で原因特定。

### responsive-audit.sh — 静的ホットスポット解析
```bash
./scripts/responsive-audit.sh [DIR]

# 例:
./scripts/responsive-audit.sh outputs/clients/terra-isshiki/site/app
```

検出項目:
- **Fixed widths**: `width:Npx` / `w-[Npx]` / `min-w-[Npx]`（max-/min- 除外）
- **whitespace-nowrap**: 数 + 多用ファイル top 10
- **overflow-x: hidden**: 崩れ隠しの疑い場所
- **clamp() 採用率**: テキストサイズ宣言のうち clamp() を使っている率
- **text-[Npx] ハードコード**: responsive 化候補 top 10

## 規約（実装時に必ず守る）

### 1. Mobile-first 大前提（最重要）
- BSA / クライアント案件の LP/HP はモバイル縦長を主、デスクトップを従
- 画像モックも 1080×3600px で生成
- Tailwind の `md:`/`lg:` プレフィックスで上書きしていく形

出典: `memory/feedback_lp_mobile_first.md`

### 2. clamp(min, vw, max) で大画面対応
- desktop のテキスト・余白は `clamp(<min>, <vw>, <max>)` で連続スケール
- 例: `text-[15px] md:text-[clamp(16px,0.94vw,24px)]`
- 固定 px hardcode は responsive 化候補（audit でカウント）

### 3. グリッドは auto-fit + minmax を default に
- Anthropic blog 推奨パターン: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
- Tailwind: `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]`
- カード並び・ロゴ並びは media query なしでも自然に折り返す

### 4. 絶対配置コラージュは段階 scale 設計
- 固定 px 絶対配置の装飾は 1280 / 1100 / 960 / 640 px の 4 breakpoint で `transform: scale()`
- 初回提示時から 4 breakpoint 案を出す

出典: `memory/feedback_responsive_collage_design.md`

### 5. 日本語コピー改行は 3 層構え
```tsx
<h1>
  <span className="line">葉山の風景に、</span>
  <span className="line">ゆっくり溶ける。</span>
</h1>
```
```css
.line { display: inline-block; }
@media (min-width: 768px) { .line { white-space: nowrap; } }
.chunk { white-space: nowrap; }  /* 常時 nowrap したいサブ要素 */
@media (max-width: 480px) { .line { white-space: normal; } }
```
- 中途半端な改行（孤児改行）は NG。意味のかたまり単位で
- span に `width: <固定px>` は禁止（折り返し制御は white-space で）

出典: `memory/feedback_jp_hero_copy_linebreak.md` + `memory/feedback_no_orphan_linebreaks.md`

### 6. 修正の都度、修正前後で目視差分
- レイアウトプロパティを「ついで」で変えない
- 修正対象 + 上下セクションを desktop / mobile 双方でスクショ比較してから完了報告
- snap スクリプトで before/after フォルダを分けて diff

出典: `memory/feedback_visual_diff_check_after_edit.md`

## アンチパターン

| パターン | なぜ NG | 代替 |
|---|---|---|
| `overflow-x: hidden` | 崩れを隠すだけで原因が残る。後で別 viewport で再発 | overflow の発生源を snap の `offenders` 配列で特定し fix |
| 固定 `width: Npx` | viewport 縮小で必ず溢れる | `max-width` / `flex-basis` / `grid auto-fit minmax()` |
| `whitespace-nowrap` を長文に | mobile で確実に overflow | 改行 3 層構え |
| `text-[Npx]` だけ（clamp なし） | 大画面でスカスカ / 小画面でデカすぎ | `text-[Npx] md:text-[clamp(...)]` |
| `min-width: <大きい値>` | mobile で破綻 | `max-width` か flexbox/grid |

## viewport プリセット

| プリセット | 想定用途 | viewports |
|---|---|---|
| default | 一般 LP/HP | 320 / 390 / 768 / 1024 / 1440 / 1920 |
| lp | BSA L1 LP（mobile + 大画面） | 390 / 768 / 1280 / 1440 |
| mobile | mobile-only 詳細チェック | 320 / 375 / 390 / 430 |

## チェックリスト（v1 リリース前）

- [ ] responsive-audit が overflow-x:hidden 0 件を確認
- [ ] responsive-snap default preset で全ページ overflow なし
- [ ] console errors なし
- [ ] mobile (390) で長文コピーが孤児改行していない
- [ ] desktop 1920 で「スカスカ」感がない（clamp 上限が効いている）
- [ ] 修正前後の snap を desktop/mobile 双方で比較

## 関連 skill / memory

- `ui-ux-pro-max:ui-ux-pro-max`（必ずペア起動）
- `memory/feedback_lp_mobile_first.md` モバイル前提
- `memory/feedback_responsive_collage_design.md` 4 breakpoint scale
- `memory/feedback_jp_hero_copy_linebreak.md` 改行 3 層
- `memory/feedback_no_orphan_linebreaks.md` 孤児改行禁止
- `memory/feedback_visual_diff_check_after_edit.md` 修正前後の目視
- `memory/feedback_playwright_animation_screenshot.md` fade-up 強制可視化
