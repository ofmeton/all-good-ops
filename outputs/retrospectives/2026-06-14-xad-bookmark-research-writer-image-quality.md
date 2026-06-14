# Retrospective — 2026-06-14 X発信 大刷新（bookmark取込/研究/writer改修/画像/品質PDCA）

対象: 1セッションで X発信システムを大刷新（PR#185-205）。collector停止→手動ブックマークURL取込／競合バズ・スレッド・チャエン・記事研究→テンプレ拡充／writer改修（fmat別知見＋段取りoutline＋visual_hint）／ターゲット再定義（メイン=Claude Code中級者・ブランド全体）／stop-slop導入／Phase2画像slice1（gpt-image-2・記事ブロック）／article品質PDCA（ローカルreplica評価で62→88・本番反映）。実装は codex(gpt-5.5) 多用＋Opus main。

## §0 raw保存チェック
新規 people/contracts/situations/misc 事実なし（ターゲット再定義は CLAUDE.md/spec に反映済）。漏れなし。

## §0.5 前回フォローアップ（再計測）
- codex委任: open→**applied**（codex多用で実践）
- askuserquestion-fuuin: **verified**（go即実行／genuine forkのみ確認）
- worktree-file-reread: **再発(4連続)**（新worktree Edit前Read漏れ・都度吸収・実害小）。1 worktree使い回し未適用
- over-worktree（同一feature）: **再発**（writer系4 worktree/PR分割）

## §1 良かった点
- ローカル replica 評価ハーネス（ユーザー案）を即実装し品質PDCAを 62→88・6反復・¥190 で回した（MA round-trip回避）
- 外部仕様の都度ファクトチェック（bookmarks_v2/login_v2/get_tweet_by_ids/gpt-image-2/get_article）→codexのguessを公式仕様に修正・proxy必須を発見
- 根本原因追跡（compose timeout→trim収束／skew 409→version fetch恒久修正）
- ノイズ帯で微調整を止め few-shot 大レバーへ切替

## §2 詰まった/二度手間
| # | 事象 | 原因 | 本来 |
|---|---|---|---|
| 1 | codex bookmarks GET誤実装→公式POST/bookmarks_v2(proxy必須) | 外部API仕様をguessさせた | ブリーフにllms-full grep必須行 |
| 2 | compose 240sでも長文article失敗→trim収束 | article長文×v4段取りopusが重い | article fmatは入力trim/段取り簡略 |
| 3 | few-shotバッククォートでtemplate literal破壊 | 文字列内にコード片を生記述 | escape/除去 |
| 4 | 画像gen max_tokens 2000でarticle切れ | 短文想定既定 | fmat別max_tokens(→16000) |
| 5 | Edit前Read漏れ4連続 | 新worktree別path都度Read要 | 同一feature1 worktree使い回し |

## §3 自動化・効率化
- `scripts/pdca-eval.ts` = 再利用可能な writer品質eval資産（他テンプレ/fmat流用可）。スキル化は1回のみ→保留
- 外部API実装の事前 llms-full grep を codex ブリーフ既定に

## §4 次回への改善提案（actionable）
1. codex に外部API実装委任時、ブリーフ冒頭に「該当endpointを docs llms-full.txt で grep→method/path/必須param確定後に実装」を必須行で入れる
2. article fmat compose は素材 ~3-4k字トリム or article時段取り簡略（timeout/コスト）
3. 同一feature領域の連続改善は1 worktree使い回し（merge後pull同期）

## §5 レンズ
- ⚡ Claude機能: 並列Explore/Agent(sonnet)・codex並列・Monitor(bg poll)・AskUserQuestion・plan mode 活用。Workflowツールは opt-in無しでAgent並列代替（妥当）
- 🪙 コスパ: ローカルreplicaでround-trip回避・ノイズ帯で大レバー切替・STATE/ITERATIONSにオフロードしcompact耐性
- 💬 プロンプト改善: ロールモデルのフォーマット(記事/短文)を最初に指定いただけると初手選定が1往復減（チャエン記事→書かない→他アカの往復）

## §6 反映
- SAFE① `feedback_factcheck_external_specs` 追記（codex委任時のllms-full grep必須行）— 適用済
- SAFE② improvement-log エントリ — 追記済
- セッション中に作成/更新済 memory: feedback_codex_permission_defaults(新)・feedback_deploy_no_confirm(MA再焼成も自走追記)・project_x_block_images(新)・project_x_writer_quality_pdca(新)・project_x_collector_cost_optimization(pivot追記)・CLAUDE.md(ターゲット改定)
- RISKY: なし
