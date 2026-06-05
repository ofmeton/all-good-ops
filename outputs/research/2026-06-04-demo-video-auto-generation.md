---
date: 2026-06-04
topic: デモ動画 / アプリ紹介動画の無料・半自動生成
style: 操作画面キャプチャ＋テロップ/図解モーション主軸
uses: SNS発信(ofmeton) / AI自動化代行デモ / 自作アプリ紹介
method: deep-research (28ソース / 130主張 / 24確定)
---

# デモ動画を「無料・半自動」で作る手法リサーチ

## 結論（先に）

操作画面キャプチャ＋テロップ主軸 × 無料 × 半自動の最適解は、**既存スタック（Claude Code / Remotion / ffmpeg / Codex MCP）をそのまま使うコード生成型パイプライン**。新規の有料SaaSは不要。中核は2系統:

- **A. WebアプリのUI操作デモ** → `ndemo` または `claude-code-video-toolkit`（Claude Code がブラウザを操作→録画→テロップ＋ナレーション付き MP4）
- **B. SNS縦型短尺・テロップ動画** → Remotion 公式 **TikTok テンプレート** / `claude-video-kit` + ローカル Whisper.cpp 字幕（日本語可）

---

## 手法カテゴリ比較

| カテゴリ | 代表 | 無料枠の実態 | 半自動度 | 既存スタック適合 |
|---|---|---|---|---|
| コード生成型 | **Remotion** | 個人/3名以下企業は商用含め完全無料・透かしなし | ◎ CLI 1コマンド/SSR/Lambda/GH Actions | ◎ memory に既設 |
| Claude駆動デモ | **ndemo / claude-code-video-toolkit** | OSS無料(MIT)・透かしなし | ◎ Claude がブラウザ操作を補完 | ◎ Claude Code 前提 |
| 画面録画 | OBS等 | 無料 | × 手動 | △ |
| テンプレ型エディタ | Canva / VEED / CapCut / invideo | 透かし・書出制限あり | △ | × |
| AI動画(アバター) | Synthesia / Canva(HeyGen) | 強い制約(下記) | ○ | × 別系統 |

---

## 中核ツール詳細

### Remotion（コード型の土台）
- ライセンス: **個人 / 従業員3名以下の営利 / 非営利 / 評価**は Free。陸さんは個人事業主＝**商用も無料・透かしなし**。4名以上は最低 $100/mo。
- React コンポーネント→フレーム単位で MP4/WebM/GIF。エンコードは ffmpeg（自動DL）。
- **完全ヘッドレス自動レンダリング**: `npx remotion render [compositionId] [outputPath]` の1コマンド。加えて SSR API / AWS Lambda / GitHub Actions / Cloud Run(Alpha) の計6方式。
- **Claude にコード生成させる公式サポート**: システムプロンプト(`llms.txt`)・Skill・MCP を公開。`Math.random()` 禁止→`seeded random()` 等のルールを強制し壊れにくい。

### 日本語字幕 = ローカル Whisper.cpp（完全無料・オフライン）
- `@remotion/install-whisper-cpp` でマシン上文字起こし。**有料文字起こしAPI不要**。
- 日本語は `WHISPER_MODEL` を `.en` なしの多言語モデルに変更 + `WHISPER_LANG=ja`。
- token-level timestamp 対応でテロップを単語単位アニメ化可。`@remotion/captions` で Whisper/OpenAI/ElevenLabs を統一型に差替え可能。

### A系統: WebアプリUI操作デモ
- **ndemo**（MIT, 新興）: YAMLプレイブックにナレーション＋操作を書く→Claude Code が a11y ツリーを読み具体クリック/入力を補完→TTS+headless replay→ffmpeg で MP4。
  - 注意: TTS が **OpenAI 有料API依存**、LICENSE ファイル無し(README記載のみ)、星少なめの新興。日本語ナレーションは明文化なし（OpenAI TTS 自体は日本語可）。
- **claude-code-video-toolkit**（MIT, ~1.3k★, v0.15.0）: Remotion+ffmpeg+Playwright を束ねた Claude Code 統合ワークスペース。`/record-demo` で Playwright デモ録画→Remotion で intro/transition/caption 後処理。**Codex ブリッジ(PR#16)あり**＝Codex MCP も活用余地。商用可・透かし無し（dewatermark.py 同梱）。クラウドAIは月$1-2程度（Modal Starter は月$30無料枠）。シーンレビューの人間チェックポイントあり。

### B系統: SNS縦型短尺
- **Remotion TikTok テンプレート**: 9:16 + TikTok風テロップ。字幕は `node sub.mjs` でローカル Whisper.cpp 生成（API課金ゼロ、初回 medium モデル 1.5GB DL）。X/IG/note 短尺に直結。
- **claude-video-kit**（MIT）: JSONスクリプト→1080x1920@30fps を `render.sh` 1発で TTS+整合+Remotion。
  - 注意: 既定TTSが Fish Audio(有料)。ローカル無料は IndexTTS2(要GPU) か macOS `say`。字幕はJSON投入なので日本語可。

### Remotion Recorder（顔出し不要の高品質画面録画が要るとき）
- screen+facecam を独立同期録画(最大4ソース)・自動レイアウト・ローカルWhisper字幕(クリック修正可・JSON保存)。TS+React で完全カスタム。Free License 対象。

### AIアバター型（補助のみ・主軸不向き）
- **Synthesia**: 無料=クレカ不要・**月10分・透かし消去不可・ダウンロード/書出不可**(要 Starter $29/mo, 年$18/mo)。日本語対応(JA-PL/JA-PO)。
- **Canva AI動画**: 台本→アバター、40言語以上/300音声以上・日本語可。実体は HeyGen 連携。操作キャプチャ主軸とは別系統。

---

## 推奨構成（陸さん向け）

1. **土台を Remotion に一本化**（既に memory あり・商用無料・透かし無し・Claude生成対応）。
2. **用途で2テンプレを用意**:
   - WebアプリUIデモ → `claude-code-video-toolkit` を検証（Playwright録画＋Remotion後処理＋Codexブリッジが既存スタックに最も整合）。軽い用途なら `ndemo` も。
   - SNS縦型短尺 → Remotion TikTok テンプレを ofmeton 用にブランド化。
3. **字幕は全部ローカル Whisper.cpp**（日本語・無料・オフライン）。ナレーションが要る時だけ OpenAI TTS か macOS `say` を選択（コストは月$1-2程度）。
4. **半自動フロー**: Claude にスクリプト/プレイブック生成 → CLI 1コマンドでレンダー → 人間は台本確認とシーンレビューだけ（完全放任でなくエージェント駆動＋確認型）。

> 手間の所感: 初期テンプレ構築（A/B各1回）に少し工数がかかるが、以降は「台本を書く→1コマンド」で量産できる。陸さんの「多少OK・なるべく少なく」に最も合致。

## 注意（2026-06 時点）
- 料金/ライセンスは時点情報。Remotion 4名以上 $100/mo、Synthesia 無料月10分。
- ndemo/claude-video-kit は新興OSS。導入前に LICENSE と日本語TTS品質を実地検証。
