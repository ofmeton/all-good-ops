---
date: 2026-05-22
time: 20:30
session: money-bot Phase 1 セットアップ (規約調査 → Plan-B 採用 → Supabase / Vercel / LINE / 環境変数投入)
duration_approx: 大型セッション (Instagram + Supabase + Vercel + LINE まで一気通貫)
---

# セッション振り返り 2026-05-22-2030 money-bot Phase 1

## §0 raw 保存漏れチェック

| 項目 | 状態 |
|---|---|
| ai-radar 改修・money-bot 連携方針 | ✅ 既存 (`2026-05-22-ai-radar-money-bot-integration.md`) |
| money-bot Phase 1 セットアップ進捗 (Instagram / Supabase / Vercel / LINE / 環境変数 / PR) | ⏳ → ✅ 振り返り時補完 (`2026-05-22-money-bot-phase1-setup-progress.md`) |

漏れた理由は §2-#11 に記録。

## §1 良かった点

1. **規約調査を Explore agent で並列実行** — 6 プラットフォームを 84 秒で調査、X API $200/月の致命的制約と PIXTA 完全禁止を早期発見
2. **Plan-A/B/C 3 プラン併記でユーザー判断を構造化** — 「完全自律不可」を正直に告げつつ半自律 (Plan-B) を推奨
3. **`vercel env add` を stdin 経由で実行** — シェル履歴にトークン値が残らない安全な投入
4. **「貼った」と言われた後のファイル存在確認** — LINE 値未投入 + 別ディレクトリ誤作成を即検出
5. **Supabase Free tier 2 制限の発見後 A 案で柔軟対応** — spec §6.4 と整合的に再設計、upgrade 回避で月予算維持

## §2 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | Meta Developers UI が「製品」→「ユースケース」に変わっているのに旧表記で案内 | 知識が古い | UI 系手順は知識を断言せず画面確認入れる | 「製品 or ユースケース、画面を見て」と最初に確認 |
| 2 | Facebook Cookie 干渉で Meta Developers TOP アクセス不可 | Cookie / 拡張機能干渉 | OAuth エラーは三段構えがほぼ常套 | 最初の応答で三段全部提示 |
| 3 | ユーザー「貼った」と言ったが `.env.local` に LINE 値が無かった | 指示が「貼って」止まり、確認手順未提示 | テンプレ + 貼った後の grep 確認コマンド併記 | テンプレと確認コマンドを同ターンで |
| 4 | `.env.local` が `Projects/money-bot/` 別ディレクトリに作られた (前回) | `cd money-bot` の曖昧さ | 絶対パス指定強制 | 必ず `cd /Users/.../money-bot` |
| 5 | Supabase Free tier 2 制限を事前確認せず `create_project` でエラー | `list_projects` はしたが「2 = limit」を意識せず | tier 制限チェックを cost と同時に | `list_projects` 結果を「N/2 (Free tier)」形式で先出し |
| 6 | `vercel link` を `~/Projects` で実行されかけた | `cd money-bot` 曖昧 | 絶対パス強制 | 必ず `cd /Users/.../money-bot` |
| 7 | `.env.local` のテンプレ貼り付けで行頭空白が入った (2 回繰り返し) | Markdown コードブロックそのままコピー | 「行頭空白なし」明示 + sed 修正コマンドを最初から同梱 | テンプレ提示時に注意併記 |
| 8 | Vercel MCP に `create_project` が無い (確認なしに「MCP 代行可」と回答) | ToolSearch せず断言 | MCP 経由タスクは ToolSearch で能力先確認 | 最初に ToolSearch → 「Supabase は MCP / Vercel は CLI」と区別 |
| 9 | `gh pr merge --delete-branch` が untracked file 競合で abort | 別セッションの untracked が同パスで衝突 | 並列セッション時は worktree 必須 | 並列検出時は worktree 強制 |
| 10 | local main pull が abort | 別セッションが raw/ai-radar/ を untracked 放置 + 同パスが main に merge | 同上 | 並列検出時は worktree |
| 11 | **raw 保存が一連完了後の振り返り時まで補完されなかった** | step-by-step 実行に集中 | 大きい決定の都度 raw 即追記 | 決定タイミングで自問 |

## §3 自動化・効率化の余地

1. **`.env.local` から Vercel env への一括 stdin 投入** — `vercel-env-bulk-add` スキル化済 ✅
2. **Supabase project 作成の前提チェック** — `supabase-project-precheck` スキル化済 ✅
3. **OAuth トラブルシューティング三段** — `oauth-troubleshooting` スキル化済 ✅
4. **対話的 CLI 操作の絶対パス強制** — memory `feedback_absolute_path_for_cd` で追加済 ✅

## §4 次回への改善提案

1. OAuth エラーを聞いたら、最初の応答で「シークレット試行 / Cookie 削除 / 拡張機能 OFF」を 3 セットで提案
2. Supabase `create_project` 依頼を受けたら、`list_projects` 結果を「現在 N/2 (Free tier)」形式で先出し
3. 「貼ってください」依頼の同じターン内に「貼った後の確認コマンド `grep "^KEY=" file | head`」を必ず併記
4. Vercel CLI 等の対話的 CLI を案内する時、`cd` は必ず絶対パスで指定し、`cd money-bot` は禁止
5. MCP 経由タスクを受けたら、最初に `ToolSearch` で利用可能ツール一覧を確認してから断言
6. 複数セッション並列が検出された時は、新 task ブランチ着手前に worktree 化を強制
7. 大きい決定の直後で `raw/facts/situations/` 追記を即実行 (まとめて後回しにしない)

## §5 反映済み

### SAFE (まとめ承認 → 反映済)
- memory: `feedback_oauth_browser_isolation.md` 新規 ✅
- memory: `feedback_env_paste_verification.md` 新規 ✅
- memory: `feedback_supabase_project_limit_check.md` 新規 ✅
- memory: `feedback_absolute_path_for_cd.md` 新規 ✅
- memory: `feedback_mcp_capability_precheck.md` 新規 ✅
- memory: `feedback_raw_save_after_decision.md` 新規 ✅
- MEMORY.md index: 6 行追加 ✅
- improvement-log.jsonl: 4 件追加 ✅

### RISKY (個別承認 → 反映済)
1. 新規スキル `oauth-troubleshooting.md` ✅
2. 新規スキル `vercel-env-bulk-add.md` ✅
3. 新規スキル `supabase-project-precheck.md` ✅
4. CLAUDE.md スキル一覧 37→40 + 3 行追加 ✅

## 関連

- raw: `raw/facts/situations/2026-05-22-money-bot-phase1-setup-progress.md`
- raw: `raw/facts/situations/2026-05-22-ai-radar-money-bot-integration.md`
- spec: `docs/superpowers/specs/2026-05-22-money-bot-design.md`
- PR: #6 (mergeCommit `5bc834a`) Supabase migration を ai-radar 同居 schema に修正
- PR: #2 (mergeCommit `ecd9dee`) money-bot 計画書 + Phase 1 scaffold
