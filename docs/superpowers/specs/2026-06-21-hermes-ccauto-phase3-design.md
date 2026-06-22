# Phase 3拡張（cc-auto 自走コード実行）設計

> hermes「あとでやる」パートナーの Phase 3 を、read-only の下書き生成（draft-only）から**コードを書いて自走実装する cc-auto** へ拡張する設計。
> 親設計=`docs/superpowers/specs/2026-06-16-hermes-todo-partner-design.md` / DB・稼働控え=`data/hermes/notion-task-db.md` / 現行 Phase3 保守版=`data/hermes/autorun_executor.py`

## 1. 目的とスコープ

「あとでやる」のうち**コード作業（実装・修正・docs 更新）**を、人間承認の上で AI が worktree 隔離＋Codex で自走実装し、安全なものは main へ自動反映、そうでなければ PR で人間に渡す。

- **やること**: Notion `Status=Ready × Autonomy=cc-auto` のカードを拾い、対象リポの worktree でコードを実装→検証→Codexレビュー→（安全なら）squash merge、（そうでなければ）PR/Blocked。全停止点を Telegram 通知。
- **やらないこと（v1 スコープ外・YAGNI）**: VM 24/7 での自走（Mac launchd のみ）。並列実行（1回1件逐次）。硬ゲート（migration/送信/金銭/secret/deploy）の自動実行。

## 2. 前提・制約（決定事項）

| 論点 | 決定 |
|---|---|
| 自律上限 | 低リスクのみ自動 merge、それ以外は PR で停止 |
| 低リスク判定 | Codex セルフレビュー OK を merge ゲートにする。**ただし手前に機械ガード（硬ゲート denylist／diff 上限／test 全緑／author 検証）を必ず噛ませる二段構え**。Codex の判断ミスが破壊変更へ直結しないようにする |
| 発火トリガー | AI が cc-auto を提案 → Telegram で人間承認 → hermes が Notion を Ready×cc-auto に更新 → ランナーが pickup（opt-in） |
| 実行環境 | **Mac launchd のみ**（リポ本体＋Codex CLI＋git/gh 認証が必要・VM 不可）。Mac 起動時のみ |
| 能力範囲 | **PC 内の任意 git リポ（`~/Projects/**`）**。対象リポはカードに人間明示 or AI 推論で解決 |
| 自動 merge 範囲 | **全リポで自動 merge 可**（リポ allowlist で絞らない）。安全は機械ガードで担保 |
| 件数上限 | 日次キャップなし。起動ごとに Ready×cc-auto キューを全さばき（drain）。1回1件の**逐次**のみ維持（git/merge 競合回避） |
| poll 間隔 | 10〜15 分 |

## 3. アーキテクチャ

```
launchd(10-15分)
  └─ ccauto_executor.py（Mac専用・現 autorun_executor とは別ランナー）
       1. kill-switch / 連続失敗バックストップ確認
       2. Notion query: Status=Ready × Autonomy=cc-auto（全件）
       3. 各カード逐次:
            a. pre-flight 硬ゲート(機械・カード本文)        ── 当たれば Blocked
            b. 対象リポ解決（カード明示 or 推論）＋ worktree 隔離
            c. Codex 実装（sandbox=workspace-write・worktree内に限定）
            d. test/build 実行                              ── 落ちれば PR/Blocked
            e. Codex セルフレビュー（diff の安全/正しさ）
            f. 機械ガード再チェック（差分パス・diff規模・author）
            g. 出口判定（自動merge / PR / Blocked）
            h. Notion 反映（Status＋コメント）＋ Telegram 通知
```

新規ファイル: `data/hermes/ccauto_executor.py`（＋ `~/.hermes/ccauto_executor.py` へ配置）、launchd plist `com.hermes.ccauto.plist`。

## 4. コンポーネント（単一責務）

- **queue 取得**: Notion API で Ready×cc-auto を取得（既存 autorun の query パターン流用）。
- **リポ解決 `resolve_repo(card)`**: カードの Details に明示されたリポ名/パスを優先。無ければ AI（Haiku）にタスク文から `~/Projects/**` のどれかを推論させる。解決不能なら NeedInfo にして「どのリポ？」と Telegram で逆質問。
- **worktree 隔離 `make_worktree(repo)`**: 汎用 `git worktree add`（origin/<default> 派生）。all-good-ops 専用 wt-new.sh には依存しない。1 タスク 1 ブランチ。
- **実装 `run_codex(worktree, task)`**: Codex CLI を `approval-policy=never sandbox=workspace-write`（CLAUDE.md 既定権限）で worktree を cwd に実行。書き込みは worktree 内に物理限定。
- **検証 `verify(worktree)`**: リポの test/build を実行（package.json scripts / pytest 等を検出）。結果を真偽で返す。
- **レビュー `codex_review(diff)`**: 別 Codex パスで diff の安全性/正しさを判定 → verdict（safe/unsafe＋理由）。
- **機械ガード `hard_guard(card, diff, repo)`**: 下記§5の絶対則を機械判定。veto なら自動 merge 不可。
- **出口 `finalize(...)`**: squash merge / PR 作成 / Blocked を実行し Notion＋Telegram に記録。

## 5. 機械ガード（自律でも越えられない絶対則・リポ問わず）

Codex レビューより**前と後の両方**で機械的に検査し、1つでも該当したら自動 merge しない。

1. **硬ゲート denylist**: カード本文 or 差分が以下に触れたら自動 merge せず **Blocked**:
   - DB migration（`migrations/`・`*.sql` の DDL）
   - secret/credential（`.env*`・`*secret*`・`*credential*`・鍵ファイル）
   - deploy/送信/金銭（`deploy`・`wrangler`・メール/LINE/SNS 送信・課金 API を含む差分）
   - CI/CD（`.github/workflows/**`）
2. **diff 上限**: 変更行数 > 400 → 自動 merge せず PR。
3. **test/build 全緑必須**: 落ちたら PR/Blocked。
4. **author email 検証**: team リポ（portfolio/ai-radar 等 team_* プロジェクト）は認可外 author の commit が silent reject されるため、push 前に author を検証。非認可なら PR 止まり（merge しない）。
5. **対象パス健全性**: 差分が worktree 外・リポ外を指していないこと（path traversal 防止）。

## 6. 出口判定

| 条件 | 出口 | 通知 |
|---|---|---|
| Codexレビュー OK ＋ 機械ガード全通過 | squash merge → push → `Status=Done` | ✅ 完了→main反映＋差分要約 |
| Codexレビュー OK だが 硬ゲート/diff超過/author非認可 | branch push → PR 作成 → `Status=Review` | 📝 PR上げた→確認して＋PRリンク |
| Codexレビュー NG or test/build 落ち | branch push →（可能なら PR）→ `Status=Blocked` | ⚠️ 止まった＋理由 |
| リポ解決不能 | `Status=NeedInfo` | ❓ どのリポ？と逆質問 |

## 7. 通知（全停止点で Telegram）

| 節目 | タイミング | 文面例 |
|---|---|---|
| 承認待ち | AI が cc-auto 提案時（捕捉フロー側） | 「これ cc-auto でいけそう、承認する？」 |
| 着手 | pickup 直後 | 「🤖 着手: <タスク>」 |
| 完了 | 自動 merge 済 | 「✅ 完了→main反映: <タスク>＋差分要約」 |
| 要レビュー | PR 作成時 | 「📝 PR上げた→確認して: <PRリンク>」 |
| 詰まり | Blocked 時 | 「⚠️ 止まった: <理由>」 |

全節目を Notion カードのコメントにも記録（場での監査証跡）。

## 8. 安全装置

- **キルスイッチ** `~/.hermes/ccauto_enabled`（"0" で全停止・autorun とは別ファイル）。
- **連続失敗バックストップ**: 連続 N 回（例 3）失敗で自動的に一時停止し Telegram 警告（無限ループ課金防止）。これは件数制限ではない。
- **逐次実行**: 1回1件（worktree 隔離でも push/merge 競合を避ける）。
- **秘密の非伝播**: ランナーは最小 env で Codex/claude を起動（既存 autorun と同様）。
- **監査**: 全アクションを Notion コメント＋Telegram＋ローカルログ（`~/.hermes/logs/ccauto_executor.log`）に記録。

## 9. インジェクション対策（半信頼カード本文への防御）

カード本文は Telegram/メモ由来＝半信頼。次で多層防御:
1. **硬ゲート denylist**（§5-1）でカード本文段階の危険指示を機械遮断。
2. **Codex sandbox=workspace-write** で書き込みを worktree 内に物理限定。
3. **機械ガード**（§5）が Codex レビューの後段にも入り、レビュー誤判定が merge に直結しない。
4. **逐次＋ worktree 隔離**で 1 タスクの影響を隔離。

## 10. テスト方針

- **単体**: `resolve_repo` / `hard_guard` / `verify` 検出ロジックを合成入力で検証（特に硬ゲート denylist は各カテゴリで陽性/陰性を網羅）。
- **dry-run**: `--dry-run` で「pickup→リポ解決→worktree→（Codex実行スキップ）→出口判定の机上」をログ出力。実 merge/PR はしない。
- **隔離実証**: テスト用ダミーリポで「docs 変更→自動 merge」「migration 触る→Blocked」「test 落ち→PR」を実機確認。
- **本番投入ゲート**: 最初は all-good-ops の安全なタスク（docs 更新）で 1 件実証してから対象を広げる。

## 11. 未解決・運用上の注意

- Codex CLI を headless ランナーから呼ぶ実呼び出し形態（`codex exec` 等）は実装時に確定。MCP 経由不可なら CLI 直叩き。
- `default branch` 検出（main/master）はリポごとに `git symbolic-ref` で解決。
- 自動 merge は pre-commit hook（all-good-ops の main 保護）と衝突しうる → merge は `gh pr merge --squash` 経由か、必要時のみ `ALLOW_MAIN_COMMIT=1`。実装時に各リポの保護方式を確認。
