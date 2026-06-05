# StayClean デモ動画 生成パイプライン

操作画面キャプチャ＋テロップ型のSNS縦型デモ動画を、**無料・半自動**で再生成する手順。
本番DBは一切触らず、ローカル Supabase の架空データで撮影する。

## スタック（すべて無料）
- ローカル Supabase（Docker）= 本番から隔離した撮影用DB
- Playwright = 操作録画（webm）
- ffmpeg = webm→mp4 変換 / フレーム確認
- Remotion = テロップ・intro/outro・縦型化（個人/3名以下は商用無料・透かしなし）
- 日本語フォント = @remotion/google-fonts/NotoSansJP（ローカル無料）

## 再生成手順

### 1. 録画（操作映像を撮る）
```bash
cd ../app
supabase start                 # ローカルSupabase起動（初回はimage DL）
supabase db reset              # migrations適用・クリーン化
# ローカルJWTキーは `supabase status -o env` で確認（.env.demo に設定済み）
npx playwright test --config playwright.demo.config.ts
#  → app/demo-output/.../video.webm が生成
supabase stop                  # 撮影後に停止（ローカルデータ破棄）
```
- 録画スクリプト: `../app/e2e/demo-record.spec.ts`（架空データseed + 6ステップ + slowMo/beat）
- 設定: `../app/playwright.demo.config.ts`（baseURL:3200, video:on, .env.demo注入）

### 2. 仕上げ（テロップ・縦型化）
```bash
# webm→mp4（このプロジェクトの public/screen.mp4 へ）
ffmpeg -i ../app/demo-output/*/video.webm -c:v libx264 -pix_fmt yuv420p -an public/screen.mp4 -y
npm install                    # 初回のみ（cp由来のnode_modulesは使わずクリーンinstall）
npx remotion render src/index.ts StayCleanDemo out/stayclean-demo.mp4
```
- 構成: `src/StayCleanDemo.tsx`（1080×1920 / 1.5倍速 / STEP1-7テロップ）
- テロップ文言・配色・タイミングは `TELOPS` 配列と定数を編集

## 注意・教訓
- **本番DBに実データあり** → 録画は必ずローカルで（admin画面に顧客名が映るため）
- 既存 `e2e/request-flow.spec.ts` のセレクタは旧UI。StayCleanリデザイン後は使えない
- `cp -r` で node_modules をコピーすると `.bin` symlink が壊れる → クリーン `npm install`
- 通知系env（RESEND/LINE）はローカルではダミー（外部送信させない）

## 横型・別フォーマット
- 横型(16:9)が必要なら Composition の width/height を 1920×1080 に、レイアウトを調整
- 営業デモ用は `TELOPS` を機能淡々紹介トーンに差し替え
