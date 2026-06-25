# PalmierPro デモ動画リメイク — 引き継ぎ

最終更新: 2026-06-24 / 編集エンジン: PalmierPro（macOS AI動画エディタ・MCP連携）

## 背景・目的
既存4本のアプリ操作デモ動画（Remotion製）を、新導入の **PalmierPro** でリッチに作り直す。
きっかけ = ①テロップと実操作内容のズレ ②リッチさ不足。縦型 1080×1920・X / Reels / Shorts 向け。

## 成果物の状態
| 動画 | アプリ | 状態 | 置き場所 |
|---|---|---|---|
| demo1 | xad-dashboard（X投稿自動化） | **完成（Lv3）** | PalmierPro プロジェクトA |
| demo2 | web-ui-bridge（クリック直接編集） | **完成（Lv3）** | PalmierPro プロジェクトB（別プロジェクト） |
| demo3 | hidamari-cms | 未着手 | — |
| demo4 | mf-finance（家計） | 未着手 | — |

> ⚠️ **MP4 書き出しは未実施**。PalmierPro MCP に書き出しツールが無いため、最終 MP4 はアプリ上で手動 `File > Export`（各プロジェクトを開いて書き出す）。demo1/demo2 は別プロジェクトなので個別に書き出す。

## 素材（生録画・テロップ無し）
- `~/Desktop/1.mov`〜`4.mov`（1=xad / 2=web-ui-bridge / 3=hidamari-cms / 4=mf-finance）
- ⚠️ **正本は Desktop のみ**。以前 worktree `demo-videos-apps` が並列ジョブに転用され `outputs/app-demos/` 配下の素材（生録画・レンダリング済み・Remotionソース）が消失。git 未追跡だったため git / Trash / Time Machine いずれからも復元不可だった。**外部バックアップ推奨**。
- テロップ原文（レシピの土台）= Remotion 版 `outputs/app-demos/_compose/src/remotion/demo-config.ts`（intro / 各セグメント文言）。※消失している場合は git 履歴や PalmierPro 内テロップから復元。

## 制作仕様（Lv3 リッチ・確定）
- 縦型 **1080×1920・30fps**
- **ブラウザヘッダ（タブ/URL/ブックマーク）をクロップ除去**: `crop = [top 0.15, right 0, bottom 0.02, left 0]`（静的・単一キーフレーム）
- 映像は中央配置・**上下に黒帯（テロップ帯）を作る**: `transform height ≈ 0.66`（demo2 のように録画が縦長な場合に縮小して帯を確保）
- **ビート間クロスフェード**: 動画を2トラックに交互配置（①③⑤…=トラックA / ②④…=トラックB）、隣接を ~12フレーム重ね、opacity キーフレームで in/out ランプ
- **テロップ**: タイトル=白（ヒラギノ角ゴ W6/W7）上 centerY 0.075〜0.10 ／ サブ=金 `#FFD479`（W3）下 centerY 0.865〜0.90。タイトル=フェードイン、サブ=時間差リビール（opacity keyframes）
- **仕上げ**: `apply_effect` で `stylize.vignette`(amount0.35/feather0.6/midpoint0.55) + `detail.clarity`(0.12)
- **ズームイン無し**（ユーザー指示で廃止）。**孤児改行禁止**（長いタイトルは fontSize を下げて1行に収める）

## 精度プロセス（テロップ↔操作のズレ防止・最重要）
1. `inspect_media`（overview→windowed maxFrames）で素材を時系列サンプリングし、**画面切替の秒**を特定
2. 各ビートを「画面切替をまたがない窓」に切る
3. **必ず実レンダリング `inspect_timeline` で照合**する。source frame だけ見ると、画面録画は窓の途中で別画面に切り替わっていることがある（実例: demo1 ②=Runs一覧→詳細クリックが src 29.7s で発生／demo2 ⑤=右上の幅タブ切替＝レスポンシブ編集機能を最初見落とし）
4. **ビート表（時間 / 画面内容 / テロップ案）をユーザー承認 → 組む**（手戻りゼロ化）

## PalmierPro MCP 運用メモ（ハマりどころ）
- **プロジェクト新規作成・最終書き出しのツールは無い** → 人間がアプリ操作。新規プロジェクトは既定で横 1920×1080 → **縦 1080×1920 に手動設定が必要**
- **crop は scale-to-fill**（切った領域が枠いっぱいに拡大）→ ヘッダ除去にもズームにも使える
- セッション再起動 / resume 直後は MCP ツールが deferred 状態 → `ToolSearch` で `select:mcp__palmier-pro__...` して読込。**アプリ起動中のみ MCP 生存**（`http://127.0.0.1:19789/mcp`）。ツール未読込時は curl 直叩きも可
- 2動画トラックのクロスフェード: `add_clips` を trackIndex 省略で2回呼ぶと別トラックが生成される。交互配置で重ね opacity ランプ
- テロップは同一トラックで時間重複すると自動トリム → 同時表示（タイトル＋サブ）は別 trackIndex。crop/opacity/scale 等のキーフレームは **clip-relative frame**
- ユーザーが手でタイミング変更すると、duration 短縮で末尾フェードアウトの keyframe が消える → 現配置を `get_timeline` で読んで貼り直す

## 残作業（demo3 / demo4）
- 新規プロジェクト 1080×1920 を1つ開く →（demo前のプロジェクトは温存され個別書き出し可）
- demo3 = `3.mov`（hidamari-cms・**180秒と長い**）／ demo4 = `4.mov`（mf-finance・137秒）
- 各: `inspect_media` で窓特定 → ビート表承認 → Lv3 で組む → `inspect_timeline` で照合 → ユーザー確認 → 書き出し
- demo3/4 のテロップ原文は `demo-config.ts` の Demo3/Demo4 を土台に、実映像へ合わせて調整

## ユーザーへの「依頼の仕方」テンプレ（精度・リッチさを安定させる）
```
【動画】demoX（対象アプリ・縦型1080×1920）
【精度】各ビートは“見せたい操作”基準。作る前にビート割り表(時間/画面内容/テロップ案)を出して、承認してから組む
【リッチさ】Lv3：クロスフェード＋クロップでヘッダ除去＋文字アニメ＋ビネット（ズーム無し）
【テロップ】タイトル=操作の要点／サブ=補足。実画面に合わせ調整OK
【尺】1本40〜70秒目安
```

## demo1 / demo2 最終ビート構成（参考）
### demo1（xad-dashboard・約58秒）
intro → ①工程図(全工程の自動化) → ②Runs(実行を記録) → ③Run詳細(各工程の中身/tokens) → ④承認(公開前に人間が承認) → ⑤修正依頼モーダル(AIへ修正依頼) → ⑥提案レビュー(投稿戦略を改善提案) → ⑦今すぐ投稿(ワンクリック投稿) → outro

### demo2（web-ui-bridge・約37秒）
intro → ①要素をクリックして選択 → ②インスペクタで微調整(文字/サイズ/行間/字間) → ③自然文でClaudeに依頼(キューに追加) → ④レイアウト・外観・位置(ボックスタブ) → ⑤ページ幅ごとに編集(全/sm/md/lg/xl) → outro(選んで指示→実コードへ自動反映)

関連: memory `reference_palmier_pro_mcp.md` / `project_web_ui_bridge.md` / Remotion版パイプライン skill `demo-video-pipeline`
