# X optimizer 提案の実行 Stage 4-B2（apply-code runner：config/prompt の自動コード適用）設計

## Context（なぜ）

Stage 4-B1（PR#153）で tier-T（DB数値）の自動適用と可逆ループは完成した。残るは tier-config / tier-prompt：**optimizer の提案どおりに TS SSOT（プロンプト・config 定数）を coding agent が直編集し、test/review ゲートを通して merge → deploy/ma:bootstrap まで自動で行う**最終ピース。これで「optimizer が安全にコードを書いて自己改善する」ループが完成する。[[project_x_optimizer_redesign]] の最終段。

**前提制約（調査で確定）**:
- git / npm test / wrangler / ant CLI / gh はローカルマシンにしか存在しない。**Cloudflare Worker 内では file編集+CI+deploy は物理的に不可能**。
- この repo に PR CI は無い（github-trending.yml のみ）。deploy は手動 wrangler。
- cron/launchd 自動化は 2026-06-03 から全停止中（手動運用方針）。
- 4B-1 の apply-engine は config/prompt 提案を `meta.apply_status="skipped_manual"` でマークする。

## 確定方針（2026-06-11 ユーザー決定）

1. **実行系 = ローカル1コマンド runner**（スクリプト＋skill）。GH Actions 化・daemon 常駐はしない（secret 移設・自動化停止方針との矛盾を回避）。
2. **全自動 merge**：自動ゲート（test/tsc/allowlist/🔒再検証/review-agent）全緑なら merge→deploy まで完走。accept が唯一の人間ゲート。不合格時のみ PR 保留＋LINE で人間送り。
3. **allowlist = 7ファイル**（下記）。editor 閾値・AGENT_MANIFESTS は v1 除外（手動送りのまま）。

## ゴール / 非ゴール

- **ゴール**: `npm run apply-code` 1コマンド（or skill「提案を適用して」）で、accepted な config/prompt 提案を直列に：🔒再検証 → worktree → coding agent 編集 → 決定的ゲート → review agent → PR → squash merge → deploy/ma:bootstrap → DB 記録 → LINE 通知。全 apply 可逆（git revert + 再 bootstrap/deploy）。
- **非ゴール**: 🔒（guards.ts / FORBIDDEN_PHRASES / SAFETY_GUARDRAILS / editor X2X3X5）の変更。accept を経ない autonomous 実行。editor 閾値・AGENT_MANIFESTS（model/tool）・compose テンプレ本体の自動編集（v1 は手動送り）。常駐/cron 化。

## 全体アーキテクチャ

```
$ npm run apply-code（apps/x-account-system。skill 経由でも同じ）
 ├─ 0. worker /admin/enqueue?job=optimizer-apply 発火（tier-T/noop は worker 側で処理）
 └─ 対象 = accepted=true ∧ implemented≠true ∧ rollback≠true
        ∧ meta.apply_status ∈ (null,'skipped_manual') ∧ classifyTier ∈ {config,prompt}
    を 1 件ずつ直列処理（各件 origin/main 起点・並列 conflict なし）:
      ① 🔒再検証   validateProposalSafe（lib/optimizer-apply/validation.ts 再利用）
                    → NG: apply_status="blocked" ＋ LINE、implemented にしない
      ② worktree    origin/main から task/auto-apply-<id8> を作成
      ③ implement   claude -p（headless・cwd=worktree・サブスク内）
                    プロンプト = 提案(hypothesis/evidence/scope) + allowlist + 制約 +
                    「挙動が変わるならテストも更新」。git commit まで agent が行う
      ④ 決定的ゲート（runner 内・コード強制）
         - diff ファイル集合 ⊆ allowlist（+ 同モジュールの *.test.ts）
         - 死守トークン regex（FORBIDDEN_PHRASES/SAFETY_GUARDRAILS/GUARD_RULES 等が diff に現れたら fail）
         - jest（apps/x-account-system 全体）緑
         - tsc --noEmit 緑
      ⑤ review agent claude -p 別コンテキスト（敵対的・APPROVE/REJECT を JSON で返す）
                    REJECT → 同 agent 系で修正 1 回 → 再ゲート④ → 再レビュー⑤
                    → なお REJECT: PR を draft で残し apply_status="pr_pending" ＋ LINE 人間送り
      ⑥ merge       gh pr create → gh pr merge --squash（全緑時のみ）
      ⑦ deploy      diff の対象で決定的に分岐:
                    prompts 変更 → npm run ma:render → ma:bootstrap（MA version-up・worker再deploy不要）
                    config 変更  → npm ci → npm run worker:deploy（wrangler）
                    両方 → 両方実行
      ⑧ DB 記録     implemented=true / implemented_at / meta: apply_status="applied_code",
                    rollback_handle={git_sha(squash), ma_versions?, deployed:[...]}, pr_url
      ⑨ LINE 通知   PR リンク＋変更ファイル＋ゲート結果サマリ
 └─ 最後に worktree/branch を掃除し、集計を LINE＋stdout
```

**rollback**（`npm run apply-code -- --rollback <proposalId>`）: rollback_handle の git_sha を `git revert` → 同じ PR レール（ゲート④のみ・agent 不要）→ merge → 対象に応じ ma:bootstrap / wrangler 再実行 → `rollback=true, rollback_at`。

## allowlist（安全境界の実体・コード強制）

```
lib/curation/compose-prompts.ts      ← tier-prompt（writer）
lib/check/check-prompts.ts           ← tier-prompt（checker）
lib/ingest/collector-prompts.ts      ← tier-prompt（collector）
lib/optimizer-analyst/prompts.ts     ← tier-prompt（analyst 自身）
lib/curation/compose-config.ts       ← tier-config（writerModel/maxComposePerRun/template既定 等）
lib/ingest/collector-config.ts       ← tier-config（watchlist/scoringWeights/maxFetch/dedup 等）
lib/check/check-config.ts            ← tier-config（checkerModel/maxCheckPerRun 等）
＋ 上記と同ディレクトリの対応 *.test.ts（テスト更新のため・追加方向のみ想定）
```

- allowlist 外への変更が diff に 1 ファイルでもあれば**無条件 fail**（部分 merge しない）。
- guards.ts / lib/editor/** / lib/ma/bootstrap-core.ts / migrations/** は構造的に到達不可（allowlist 方式なので列挙不要だが、死守トークン regex で二重ベルト）。
- prompt ファイル内の TARGET_DEFINITION は共有 import — compose-prompts.ts 内の定義変更は writer 以外にも波及するため、review agent のチェック観点に「波及範囲が提案 scope を超えないか」を明記。

## 構成（4B-1 と同型・純ロジックは DI + jest）

**x-account-system 内**:
- `lib/optimizer-apply-code/types.ts` — `CodeApplyDeps` / `GateResult` / `CodeApplyResult` 等
- `lib/optimizer-apply-code/allowlist.ts` — `ALLOWED_FILES` / `isDiffAllowed(files)` / 死守トークン regex `hasDeathGuardTokens(diffText)`。**安全回帰の要＝テスト厚く**
- `lib/optimizer-apply-code/prompts.ts` — implement 用・review 用の claude -p プロンプト組み立て（純関数）
- `lib/optimizer-apply-code/run-code-apply.ts` — オーケストレーション（全工程を deps 経由で呼ぶ・fail-open＝1件の失敗で他を止めない）
- 各 `*.test.ts`
- `scripts/optimizer-apply-code.ts` — CLI。`.env.local`（main repo 側）読込、git/gh/claude/wrangler/ant のシェルアウト実装＝`defaultCodeApplyDeps()`。`--dry-run`（ゲートまで・merge しない）/ `--rollback <id>` / `--id <id>`（単体）対応
- `package.json` — `"apply-code": "tsx scripts/optimizer-apply-code.ts"`

**repo 直下**:
- `.claude/skills/x-optimizer-apply-code/SKILL.md` — 「提案を適用して」「accepted を反映して」等で自動起動 → CLI 実行＋結果報告の手順

## claude -p の起動形（implement / review 共通の枠）

- `claude -p "<prompt>" --output-format json --allowedTools 'Read,Edit,Write,Grep,Glob,Bash(npm test*),Bash(npx tsc*),Bash(git add*),Bash(git commit*)' `（cwd=worktree）。モデルは既定（サブスク内・追加課金なし）
- implement: 提案 JSON＋制約を渡し「編集→テスト→commit」まで。**push/gh/deploy 系ツールは許可しない**（merge 権限は runner だけが持つ）
- review: diff＋提案を渡し read-only ツールのみ。出力 JSON `{verdict:"APPROVE"|"REJECT", reasons:[...]}` を runner がパース（パース不能は REJECT 扱い＝fail-closed）
- 代替: review を Codex MCP に差し替え可能な構造にしておく（deps 注入・v1 既定は claude -p）

## エラー処理・直列性

- 全体 fail-open：1件の失敗（gate fail / merge conflict / deploy 失敗）はその件を `apply_status="pr_pending"` or `"error"` にして次へ。集計を最後に LINE。
- deploy 失敗（⑦）は **merge 済みで未反映**の状態になるため最優先で LINE 異常通知（「main は更新済・deploy 失敗・手動 `npm run worker:deploy` / `ma:bootstrap` を」）。git revert はしない（コード自体はゲート通過済みのため）。
- runner 多重起動防止：開始時に lock ファイル（`/tmp/optimizer-apply-code.lock`）。
- 1 実行あたり最大処理件数 cap（既定 3 件）— 暴走・長時間化防止。

## テスト（TDD）

- `allowlist.test.ts`: 7+test ファイルの許可 / 1 ファイルでも逸脱 fail / guards.ts・bootstrap-core.ts・editor 拒否 / 死守トークン regex（FORBIDDEN_PHRASES 等を含む diff を fail）。
- `prompts.test.ts`: implement/review プロンプトに提案内容・allowlist・禁止事項が含まれる。
- `run-code-apply.test.ts`（DI）: 正常系（gate 緑→merge→deploy 分岐→DB→notify）/ 🔒 blocked / allowlist 逸脱→pr_pending / review REJECT→修正1回→再REJECT→pr_pending / deploy 失敗→異常通知＋ DB は merge 済み扱い / cap・lock。
- 本番実証: 安全な実提案（例: collector watchlist 追加 or analyst プロンプトの提案質基準微修正）を 1 件 accept → `npm run apply-code` → PR/merge/deploy/version-up/DB/LINE を確認 → `--rollback` で revert まで実証。

## コスト

claude -p ＝ Claude サブスク内（追加課金なし）。gh/wrangler/ant ＝無料操作。LINE ＝無料枠。従量 API なし。

## 後続（v2 候補・本 spec 外）

- editor 閾値の定数分離＋allowlist 追加 / AGENT_MANIFESTS（model 変更）/ compose テンプレ本体
- 最小 PR CI（GitHub Actions で jest+tsc）— runner のローカルゲートと等価なので v1 では見送り
