---
date: 2026-05-24
time: 1358
session_topic: 日本のClaude/AI業務自動化発信者 上位10アカウント調査
branch: task/260524-jp-ai-publishers-research
---

# セッション振り返り — 日本のClaude/AI業務自動化発信者 上位10アカウント調査

## 対象セッションの要約

ユーザー依頼「日本の Claude / AI 業務自動化発信者 上位 10 アカウントを twitterapi.io で洗い、書かれていない領域を明文化する」を実行。新規ブランチ `task/260524-jp-ai-publishers-research` を main 派生で切り、twitterapi.io advanced_search で 22 候補を抽出 → フォロワー数 × 直近 90 日エンゲージメントでスコアリング → 上位 10 確定 → 各人 100 tweets 取得 → 上位 15 件/人 を精読 → REPORT.md 出力まで完走。twitterapi.io 消費約 ¥45。

## §0. 事実情報 raw 保存漏れチェック

`raw/facts/misc/2026-05-24-twitterapi-io-key-location.md` を補完保存（twitterapi.io key の所在）。他に対象なし。

## §1. 良かった点

1. twitterapi.io の curl 動作確認を最初に 1 リクエストで実施 → 仕様ズレで全件失敗する事故を予防
2. 私案＋実バズ拾い (advanced_search) のハイブリッドで候補抽出 → 私案漏れの @ClaudeCode_love / @ClaudeCode_UT を補強
3. 上位10名提示時に「外した候補と理由」も併記 → ユーザーが判断する材料を一発で渡せた
4. @kosuke_agos と @ai_jitan が選定軸からズレている事実を REPORT に明記 → スコア順位に流されない透明性確保

## §2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできた点 | 本来すべき動き |
|---|---|---|---|---|
| 1 | twitterapi.io key を ai-radar→all-good-ops で探して空振り、ユーザーに聞いた | サブプロジェクト命名から推測したが、実体は money-bot 配下 | `[cs:s1-8]` 既存 + 全 .env を 1 コマンドで横断 grep | 最初に find+grep 1 発 → ヒットなしなら user に確認 |
| 2 | 22アカウントを 0.1 秒間隔で叩いて全件 429 | `[cs:s3-9]` 既存ラーニング無視、pacing 後付け | 既存ラーニングを wrapper 化 | pacing 内蔵 wrapper を本ループ前に 1 ファイル化 |
| 3 | `sleep 45 && python3` がフックでブロック | Bash 長 sleep 制約見落とし | python embedded sleep に最初から統合 | 長 sleep 必要処理は最初から python script + run_in_background |
| 4 | コスト試算を「言われてから」出した | プラン提示と分離した | feedback_external_api_cost_check.md の精神 | プラン提示と同ターンに円/回コスト併記 |
| 5 | TaskCreate の起動が遅れた（reminder で気づき） | 「軽量・標準は秘書直接」で TaskCreate 後回し | Phase 数/ファイル数の事前概算 | 5 Phase 跨ぎなら冒頭で TaskCreate 即起動 |

## §3. 自動化・効率化の余地

- twitterapi.io 操作 wrapper の常設化 (→ R1 実装)
- 外部 API コスト試算の標準化 (→ R2 実装)
- monorepo の env key 探し手順の標準化 (→ S3 memory)

## §4. 次回への改善提案

1. rate-limited API バルク呼び出しは「curl test → pacing 内蔵 wrapper を 1 ファイル化」を本ループ前に必ず実施
2. monorepo の API key 探しは `find . -name ".env*" | xargs grep -l <KEY>` を 1 発目に
3. 外部 API を叩く新スクリプトのプラン提示時、円/回コスト表を同ターンに併記
4. 2-Phase 以上の調査タスクは冒頭で TaskCreate 即起動

## §5. 反映（適用済み）

### SAFE（全件適用）

| 反映先 | 内容 | パス |
|---|---|---|
| memory feedback (新規) | rate-limited API は wrapper 1 ファイル化が原則 | `feedback_external_api_wrapper_first.md` |
| memory feedback (新規) | monorepo の env key 探しは find+grep 1 発目に | `feedback_monorepo_env_key_search.md` |
| memory feedback (追記) | 既存 cost-check に「同ターン円併記」「サブスク除外」追記 | `feedback_external_api_cost_check.md` |
| improvement-log | 2 件 append | `data/improvement-log.jsonl` |
| MEMORY.md | feedback 2 件をインデックスに追記 | |

### RISKY（個別承認 → 適用）

| 反映先 | 内容 |
|---|---|
| 新規 wrapper script | `.claude/scripts/twitterapi_io.py`（retry/pacing/cursor 内蔵） |
| 新規 skill | `.claude/skills/external-api-cost-disclosure.md` + CLAUDE.md スキル一覧 #41 登録 |

## 成果物

- `outputs/publishing/research/2026-05-24-jp-ai-publishers/REPORT.md` — 本体レポート
- `outputs/publishing/research/2026-05-24-jp-ai-publishers/raw/` — twitterapi.io 元データ
- `outputs/publishing/research/2026-05-24-jp-ai-publishers/analysis/top-tweets-per-handle.json` — 精読対象
- `raw/facts/misc/2026-05-24-twitterapi-io-key-location.md` — 事実情報

## 残作業

- `task/260524-jp-ai-publishers-research` ブランチの commit / push / PR
- wiki/publishing/ への ingest（buzz-patterns / by-media/x など）
