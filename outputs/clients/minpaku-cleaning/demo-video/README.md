# StayClean 営業デモ動画パイプライン

Playwright で実 UI 操作を録画し、Remotion で字幕・タイトル・transition をオーバーレイして 1080p / 30fps の mp4 を生成する。

最終出力: `output/demo.mp4`（~80-90 秒、横 16:9）

---

## 構成

| ファイル | 役割 |
|---|---|
| `src/scenes.ts` | 脚本 SSOT。scene の id / 字幕 / 尺 / 録画有無 |
| `src/seed.ts` | local Supabase に「見せても問題ない」ダミーデータを投入 |
| `src/record.ts` | Playwright で実 UI を再演・録画。scene 境界の timing を JSON で出力 |
| `src/remotion/` | Demo / Intro / Outro / LineNotifyMock / OwnerViewMock / SceneCard |

---

## 前提

- Node 22+（リポ全体と同じ）
- `app/` 配下が `npm run dev` で立ち上がる（http://localhost:3100）
- local Supabase が起動済み（`cd ../app && npx supabase start`）
- `app/.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` がある

---

## 初回セットアップ

```bash
cd outputs/clients/minpaku-cleaning/demo-video
npm install
npx playwright install chromium
```

---

## 撮影 → 合成 → 出力

ターミナル 2 つ使う:

**Terminal A** — app dev server を立ち上げ続ける:
```bash
cd outputs/clients/minpaku-cleaning/app
npm run dev -- --port 3100
```

**Terminal B** — seed → record → render を 1 発で:
```bash
cd outputs/clients/minpaku-cleaning/demo-video
npm run demo
```

順番に走るもの:
1. `npm run seed`: DB を wipe して「渋谷ベイサイドハウス 301 / 佐藤 美咲」等を seed
2. `npm run record`: Playwright で UI 操作を録画 → `output/recordings/full.webm` + `timings.json`
3. `npm run render`: Remotion が `full.webm` + `timings.json` を合成 → `output/demo.mp4`

---

## プレビュー（編集ループ）

Remotion Studio で字幕やタイトルを iterate:
```bash
npm run preview
```
ブラウザ (http://localhost:3000) で各 scene のフレームを scrub できる。録画 webm が無くてもプレースホルダ表示で進められる。

---

## 脚本変更

`src/scenes.ts` の `SCENES` 配列を編集:
- 字幕: `title` / `subtitle`
- 録画 scene の尺: `record.ts` の挙動で実測される（`scenes.ts` の `durationSec` は非録画 scene のみ使用）
- 録画 scene の追加: `scenes.ts` に entry → `record.ts` の `captureScene("new-id", ...)` を追加 → Remotion `Demo.tsx` の `SceneBody` switch に case を増やす（カスタム UI が要るなら）

---

## 営業資料への組み込み

- Vimeo / YouTube に unlisted で upload → 提案書 / LP に埋め込み
- 直接 mp4 を pptx に貼る場合は出力サイズに注意（ファイル 50MB 超なら Vimeo 経由推奨）

---

## トラブルシュート

| 症状 | 対処 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY が未設定` | `cd ../app && cat .env.local` で key を確認。無ければ `npx supabase start` の出力からコピー |
| Playwright が dev server に接続不可 | Terminal A で `npm run dev` が `http://localhost:3100` で起動しているか確認 |
| Remotion が `recordings/full.webm not found` | 先に `npm run record` を走らせる。または Studio プレビューならプレースホルダ表示で OK |
| 録画クリップが scene と尺合わず微妙にずれる | Playwright recordVideo は ~25fps。`src/remotion/Demo.tsx` の `SOURCE_FPS` を実 fps に合わせる（`ffprobe output/recordings/full.webm` で確認） |
