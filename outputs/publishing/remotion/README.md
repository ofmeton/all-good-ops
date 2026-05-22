# Remotion — ofmeton 発信用動画ジェネレーター

Claude にコードを書かせて、React で動画を出す環境。
- アニメ・構成・タイミングを **TypeScript + React** で定義
- `npx remotion render` で MP4 を吐く
- 想定ユース: X 投稿用 Before-After 動画 / Instagram リール / note 図解の動画化

## 起動

```bash
cd outputs/publishing/remotion
npm run dev          # http://localhost:3000 でプレビュー (Remotion Studio)
```

## レンダー

```bash
npx remotion compositions                       # 一覧
npx remotion render MyComp out/hello.mp4        # 単発
npx remotion render MyComp out/hello.mp4 --props='{"title":"X"}'  # props 渡し
```

出力先 `out/` は `.gitignore` 済み。

## ディレクトリ

```
src/
├── Root.tsx          # Composition の宣言（id / fps / size / duration）
├── Composition.tsx   # 実際の動画コンポーネント
├── index.ts          # registerRoot のエントリ
└── index.css         # Tailwind のエントリ（v4）
remotion.config.ts    # CLI 設定（output format 等）
```

## Claude にコード生成させる時のプロンプト雛形

```
outputs/publishing/remotion/src/Composition.tsx を以下の動画に書き換えてください。

- 用途: <X 投稿 / Instagram リール / note 図解 動画版> 等
- 尺: <N 秒> @ <30 or 60> fps
- サイズ: <1280x720 / 1080x1920 / 1080x1350>
- 内容:
  1. <0-1s> ___
  2. <1-3s> ___
  3. <3-N秒> ___
- スタイル: Tailwind v4 で配色は <neutral-950 / amber-400 等>
- アニメ: spring / interpolate を使う。easing は damping=12 ベース

Root.tsx の durationInFrames / fps / width / height も併せて更新。
```

## よく使う API（早見表）

| 用途 | API |
|---|---|
| 現フレーム取得 | `const frame = useCurrentFrame()` |
| video config | `const { fps, durationInFrames, width, height } = useVideoConfig()` |
| 線形補間 | `interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })` |
| バネアニメ | `spring({ frame, fps, config: { damping: 12 } })` |
| シーケンス | `<Sequence from={30} durationInFrames={60}>...</Sequence>` |
| フルスクリーン背景 | `<AbsoluteFill className="bg-neutral-950">` |
| 画像 | `<Img src={staticFile('foo.png')} />` |
| 音声 | `<Audio src={staticFile('foo.mp3')} />` |

`public/` に置いた素材は `staticFile('name.ext')` で参照。

## サイズ別プリセット（Root.tsx で width/height を切替）

| 用途 | size | fps |
|---|---|---|
| X 投稿 / 横動画 | 1280x720 | 30 |
| Instagram リール / Stories / YouTube Shorts | 1080x1920 | 30 |
| Instagram フィード（縦） | 1080x1350 | 30 |
| Instagram フィード（正方） | 1080x1080 | 30 |

## サンプルレシピ（Claude へのプロンプト例）

### A. X 投稿用 Before-After（5 秒 / 1280×720 / 30fps）

> 5 シーン構成の Before-After 動画を作って。
> 0-1.0s: 「動画を作るって、どうやる？」(問い、Q. プレフィクス、太字 72px)
> 1.0-2.7s: 編集ソフトのタイムライン風 (4 トラック、再生ヘッドが左→右へ移動)
> 2.7-3.0s: フラッシュ cut (白フェード)
> 3.0-4.3s: コードエディタ風 + プロンプトをタイプライター効果で表示
> 4.3-5.3s: 「Claude × Remotion」+ "text → code → video" 締め
> 配色: bg-neutral-950 / text-white / accent text-amber-400
> spring/interpolate/Sequence で時系列実装、Tailwind v4 class 使用

### B. Instagram リール用 縦動画（10 秒 / 1080×1920）

> Root.tsx を width=1080 height=1920 durationInFrames=300 fps=30 に変更。
> Composition.tsx を縦長レイアウトに再構築。
> 内容: <題材>、構成: <3-5 シーン>、配色は visual-design-system.md のカラー 4 色遵守。

### C. note 記事冒頭の埋め込み動画（3 秒 / 1280×720）

> 短い「フック動画」を作って。3 秒 = 90frames。1 メッセージのみ。
> 0-30: タイトル fade-in
> 30-70: 数値 or 結論 (大きく)
> 70-90: 「続きは記事で →」

## ライセンス注意

Remotion は **3 人以下のチーム / 個人は無料**。法人で 4 人以上のチームが使う場合は会社ライセンスが必要。
個人運用 (ofmeton) では現状クリア。詳細: https://remotion.pro/license

## 関連メモリ

- `reference_claude_remotion_video_gen.md` — Remotion 構造的意義のメモ
