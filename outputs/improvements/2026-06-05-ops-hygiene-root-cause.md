# 運用ハイジーン根本原因分析と対策（2026-06-05）

> 契機: メイン作業ディレクトリに **149件** の未コミットが沈殿し、VSCode のソース管理バッジが **194**（複数リポ合算）に膨張。全リポ整理を実施した後の振り返り。
> 担当ルーティング: `org-designer`（自己改善・体制）／ メインセッション直接実行（cleanup 文脈に密結合のため `deliberation` フレーム）。

## 1. 事象
- all-good-ops 本体に 149 件（staged 7 / 変更 10 / 未追跡 167相当）が 2026-05-22〜06-05 の約2週間分、未コミットで堆積
- メイン本体が 12 日前の task ブランチ `task/260524-self-improve-it6` に居座ったまま
- ローカル task ブランチ18本・worktree 7個・origin の旧ブランチ多数が散乱
- VSCodeバッジ194 ＝ all-good-ops(0) + portfolio(172) + 各worktree(計22) の**全リポ合算**だった

## 2. 決定的証拠
- 沈殿149件は今回の `chore(raw)` `chore(outputs)` `docs(wiki)` が**初コミット**
- 機能開発は健全：直近30コミット中12がPRマージ（#63/#29/#89/#90…）。worktree→commit→PR→main は回っていた
- cron 自動コミットの痕跡は**ゼロ**（履歴 grep でヒットなし）＝日次の掃除役は一度も機能せず

## 3. 根本原因：作業が2クラスあり、片方にしか着地レールが無かった

| | クラスA：開発仕事 | クラスB：秘書・運用の副産物 |
|---|---|---|
| 例 | x-account / demo-video / UIリデザイン | raw/facts・outputs文書・wiki更新・振り返り・新スキル |
| 生成場所 | 専用 worktree | **メイン作業ディレクトリ** |
| 着地レール | worktree→commit→PR→main ✅ | **無し**（誰のタスクでもない・コミット儀式が無い） |
| 結果 | 健全 | 沈殿 |

worktree 規律はクラスA隔離のために導入されたが、副作用で**メイン本体をクラスBの無主地**にした。

### 5 Whys
1. 未コミット149件 → クラスBが一度もコミットされなかった
2. なぜ → メイン本体に「終了儀式（wt-done 相当）」が無い。セッションは副産物を残して終わる
3. なぜレールが無い → コミット規律（1session1branch / wt-done）は**開発タスク前提**設計で運用副産物が対象外
4. なぜ長期化 → 安全網の cron（毎朝 daily-scan→commit）が **PATHバグ＋6/3全停止で死亡**。代替検知なし
5. なぜ無自覚 → 未コミット数に**閾値アラート無し**で漸増。さらに**VSCodeバッジが複数リポ合算**で所在が霧

**要約：「運用副産物の着地レール欠如」×「安全網(cron)の沈黙死」×「検知シグナルの不在」の三重不全。**

## 4. 対策（多層防御）

| # | 対策 | 層 | 本PRでの実施 |
|---|---|---|---|
| 1 | メイン本体の終了儀式を明文化（終了時 main上・未コミット0／ops成果物はセッション内コミット） | 予防 | ✅ CLAUDE.md 追記 |
| 2 | SessionStart 沈殿アラート（repo family を -uall 合算、閾値20超で🧹警告） | 検知 | ✅ `scripts/session-start-banner.sh` 強化 |
| 3 | cron 安全網を hook へ寄せる（silently死ぬcronに依存しない） | 自動化修復 | ◻ 方針記載（cron復活 or hook化は別途） |
| 4 | .gitignore 恒久強化（session-report/動画/画像/node_modules） | 予防 | ✅ 一部実施（cleanup時） |
| 5 | 全リポ -uall 走査を cleanup スキル初動に追加 | 予防 | ✅ memory 化（[[feedback_vscode_badge_multi_repo_diagnosis]]） |
| 6 | 月次ハイジーン（stale ブランチ/worktree/origin 棚卸し） | 衛生 | ◻ monthly-audit へ組込（別途） |

## 5. 残課題（フォロー）
- 対策3：morning-routine の PATHバグ修正 or 「ops成果物コミット」を SessionEnd/Stop hook 化のどちらかを決定（[[project_cron_automation_disabled]]）
- 対策6：`scripts/monthly-audit.sh` に branch/worktree/origin 棚卸しステップを追加
- x-buzz-radar の認証/SSRF（取込WIPの既知課題、`x-buzz-radar/SECURITY-TODO.md`）

## 6. 関連
- memory: [[feedback_vscode_badge_multi_repo_diagnosis]] / [[feedback_one_session_one_branch]] / [[project_cron_automation_disabled]]
- skill: `.claude/skills/git-repo-cleanup-protocol.md`
