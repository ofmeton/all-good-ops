# セッション振り返り — x-account-system フル実装 + 実運用入り

- **日時**: 2026-06-05（セッションは 2026-06-03 夜〜06-05 にまたがる長時間）
- **対象**: x-account-system（はぐりん名義 X 自動投稿）の W1-W5 実装 → 本番 deploy → 実運用バグ修正（PR #63〜#81、約19本）
- **反映先方針の確定**: エンジニアリング/プロセス原則は wiki `self/engineering-principles.md`（連結・高次化）、原子的リコールは memory（役割分担）

## §0 事実情報 raw 保存漏れチェック
- 技術実装主体で人物/契約系の事実発話なし。
- 状況1件を補完: `raw/facts/situations/2026-06-04-xad-operational-and-money-bot-down.md`（X実投稿4件で実運用入り + money-bot 不調）。
- deploy までは `2026-06-03-xad-worker-full-production.md`、PR単位は memory `project_x_account_phase05` が既にカバー。

## §1 良かった点
- テスト緑で満足せず本番データで end-to-end 実走し、「テスト緑だが本番で壊れる」バグ（token失効/スレッド事故/judge crash/ideation orphan）を多数捕捉。
- 各 Phase でコード/セキュリティレビューを挟み、認可ゲート欠落・公開二重化をマージ前に潰した。
- worktree 隔離 + 1PR1主題を約19 PR 通して徹底、apps 外混入ゼロを毎回 verify。
- DLP soft化/hard-soft分離/手動slot分離など安全・品質判断は都度ユーザー確認して反映。

## §2 詰まった瞬間・二度手間
| # | 事象 | 原因 | 先回り | 本来 |
|---|---|---|---|---|
| 1 | ideation orphan で昼ネタ枯渇 | W2-3 で気づいたのに修正先送り | 既知バグの deferred | improvement-log 記録+その場/次PR修正 |
| 2 | judge欠落で post-job orphan | LLM tool_use の項目欠落前提なし | 構造化出力は欠落しうる | 境界で検証+デフォルト補完 |
| 3 | スレッド事故/末尾切れ | publishToX 形式無視 / max_tokens 全形式共通 | 形式仕様を設計時に詰める | 出力形式を単一契約+テスト |
| 4 | 14:21エラーを X側で調査→money-bot | エラー発信元未確認 | 文面に[money-bot]あり | 発信元を最初に確認 |
| 5 | queue consumer ログを tail 取りこぼし | tail が queue 不安定 | 早めにローカル実行 | lib をローカル tsx で prod 実行 |
| 6 | MCP execute_sql 複数文で最後しか返らない | MCP の癖 | 既知化 | 1文ずつ or union |

## §3 自動化・効率化の余地
- 本番 env で lib を直接実行する diag/regen/push スクリプトを4回以上手書き → `prod-lib-diag` スキル化候補。
- queue consumer の観測が不安定 → 実行ログを永続先に残す改善余地。

## §4 次回への改善（アクション粒度）
1. レビューで既知判定した不具合は即 improvement-log 記録、deferred 化しない。
2. LLM tool_use/structured output は使用前に全必須フィールド検証、欠損は安全側デフォルト補完。
3. 本番エラー通知は発信システム名を最初に確認してから調査対象を決める。
4. queue/cron 等 tail 不安定経路は最初からローカル tsx で lib を prod env 実行して診断。

## §5 反映実施
- wiki: `self/engineering-principles.md` 新設（原則1-5、連結学びノート）+ index.md / log.md 更新。
- memory: feedback 5件（validate-llm-output / known-bug-no-defer / error-source-first / prod-lib-local-diag / mcp-execute-sql-single-stmt）、MEMORY.md index 反映、各々 wiki へポインタ。
- improvement-log: プロセス失敗3 + 効率化1 を追記。
- 保留: `prod-lib-diag` スキル新設（RISKY）はユーザー判断待ち。
