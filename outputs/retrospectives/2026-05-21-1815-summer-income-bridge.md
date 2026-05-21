# 2026-05-21 セッション振り返り: 夏のキャッシュブリッジ戦略

- **日時**: 2026-05-21 18:15 JST
- **対象セッション**: 「俺は今何に時間を使うべき？」から始まる戦略相談（〜 spec 化 → Asana 投入）
- **主な成果物**:
  - spec: `docs/superpowers/specs/2026-05-21-summer-income-bridge-design.md`
  - raw facts 4 件: `raw/facts/situations/2026-05-21-income-streams-update.md`, `2026-05-21-x-strategy-confirmed.md`, `2026-05-21-kodomo-ibasho-roadmap.md`, `raw/facts/people/2026-05-21-saki-san.md`
  - Asana タスク 11 件（「生活基盤💰」プロジェクト）
  - commit: `0957dd3` on `task/260521-summer-bridge-design`

---

## 0. 事実情報の raw 保存漏れチェック

セッション中のユーザー発話を走査し、4 件の事実情報を `raw/facts/` に保存済み。漏れなし。

| カテゴリ | ファイル | 内容 |
|---|---|---|
| situations | 2026-05-21-income-streams-update.md | Gx 終了 / minpaku 単発 / 社団法人立ち上げ単発 / RICE CREAM 請求サイクル + 労働条件 |
| situations | 2026-05-21-x-strategy-confirmed.md | X 案採用と具体化方針（4 ステップ案件取り組み・発信方針・居場所ロードマップ） |
| situations | 2026-05-21-kodomo-ibasho-roadmap.md | DIY → 勉強場所 → さきさんコラボの 3 段ロードマップ |
| people | 2026-05-21-saki-san.md | 料理教室運営者、子供の居場所コラボ目標 |

---

## 1. 良かった点

1. **「見るのが怖い」という感情の発言から数字直視へ繋いだ** — 不安を「見ない時間が長いほど膨らむ」と構造化し、4 つの数字を即答で引き出して「8 月の崖」を明文化できた
2. **3 パターン（X/Y/Z）を比較表で提示** — 単一案を押し付けず、選択理由を後追跡可能にした
3. **撤退ラインを spec §7 に明文化** — 「6 月末で 0 件受注なら週 3 に戻す」など賭けが外れた時の脱出口を予め書いた
4. **raw facts 4 件をその場で記録** — CLAUDE.md 新ルール（事実情報自動 raw 保存）に従い通知 1 行も省略せず実施
5. **task ブランチを正しく切り替えた** — 主題が違うことを認識して `task/260521-summer-bridge-design` を新規切り

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | Asana タスク名「【節目】10 月末」が「【節目、10 月末」に化けた | Unicode escape `、`（、）と `】`（】）の打ち間違い | JSON 送信前に escape を視認 | 日本語は escape せず生 UTF-8 で送る |
| 2 | Asana マイルストーン 2 件が `payment_required` で失敗 → 通常タスクで再投入 | 無料プランのマイルストーン非対応を事前確認せず | spec の「節目」項目を Asana 化する前に制約確認 | 最初から「【節目】」プレフィックスの通常タスクで設計 |
| 3 | 感情深掘りを 3 ターン続けた → ユーザーが手動で軌道修正 | 「もやもや吐き出し」モードを引っ張りすぎ。冒頭で「どうしたら」が出ていたのに感情に向かった | 2 ターン目で「次は行動に行く？」を能動的に問えた | 感情深掘りは最大 2 ターン、3 ターン目に行動側 pivot 提案 |
| 4 | TaskCreate / TaskUpdate を ToolSearch で 2 度 fetch | 戦略相談・多段タスク級と判定したのに deferred tool 取得が遅れた | セッション初期で TaskCreate を先 fetch | 戦略相談セッションは導入時に TaskCreate を取得 |
| 5 | 別セッションが並行で rebase → 振り返り時に commit/ブランチ状態が変化していた | 並行セッション存在を前提化していなかった | 振り返り時に `git log --all --oneline -10` で早期検出 | 重大編集 / ブランチ操作前に並行作業検出を常態化 |

## 3. 自動化・効率化の余地

1. **JSON ペイロードの日本語 escape 不要を機械化** — `【` 系の手書き escape は打ち間違いの温床。生 UTF-8 を default に
2. **Asana 無料プラン制約の事前チェックリスト** — `asana-management.md` に追記済み
3. **戦略相談セッションのフロー型化** — 「感情吐き出し → 数字直視 → 選択肢提示 → 意思決定 → spec 化 → Asana 投入」は再利用可能パターン。`brainstorming` skill の戦略相談バリアントとして発展余地

## 4. 次回への改善提案

1. 戦略相談セッションで感情深掘りは**最大 2 ターン**、3 ターン目には能動的に行動側へ pivot 提案
2. JSON ツール呼び出しで日本語含む時は Unicode escape せず生で書く
3. 重大ファイル編集 / ブランチ操作の前に `git log --all --oneline -10` で並行作業を検出
4. Asana タスク一括投入時、create 結果のタスク名を 1 件ずつ視認して文字化けチェック
5. 戦略相談級セッションは最初の 3 ターン以内に TaskCreate / TaskUpdate を ToolSearch fetch

## 5. 反映実装結果（人間承認後実施済み）

### SAFE
- ✅ `memory/feedback_strategy_session_emotion_pacing.md` 新規作成
- ✅ `memory/feedback_json_payload_jp_no_escape.md` 新規作成
- ✅ `memory/feedback_parallel_session_branch_check.md` 新規作成
- ✅ `memory/MEMORY.md` index に 3 行追記
- ✅ `data/improvement-log.jsonl` に 3 エントリ append

### RISKY（1 件ずつ承認 → 承認済み）
- ✅ `.claude/skills/asana-management.md` に「無料プラン制限事前チェック」セクション追加

---

## 関連リンク

- 親 spec: `docs/superpowers/specs/2026-05-21-summer-income-bridge-design.md`
- raw facts: `raw/facts/situations/2026-05-21-*.md`, `raw/facts/people/2026-05-21-saki-san.md`
- commit: `0957dd3` on `task/260521-summer-bridge-design`
