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

## ライセンス注意

Remotion は **3 人以下のチーム / 個人は無料**。法人で 4 人以上のチームが使う場合は会社ライセンスが必要。
個人運用 (ofmeton) では現状クリア。詳細: https://remotion.pro/license

## 関連メモリ

- `reference_claude_remotion_video_gen.md` — Remotion 構造的意義のメモ
