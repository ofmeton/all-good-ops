# セッション振り返り — hermes go-live → JSON hardening → claude -p 課金調査 → OAuthピン留め/key revoke (2026-06-23)

対象: 前回 retro の最大 open「hermes go-live 未実施」を完遂し、LIVE 観測由来の hardening を出荷。その後「claude -p が知らぬ間にクレジット課金される」疑いを devtools で調査し、出血源（廃止APIキー）を特定・停止、headless をサブスクにピン留め。

## §0 raw 保存漏れ
本セッション新規 raw/facts 事実なし。技術調査・デプロイ・課金調査が主。課金関連事実（Max 5x / 月$65上限 / money-bot 等）は reference memory に捕捉済＝raw（life-fact）対象外。本日の `situations/2026-06-23-kokuho-r8.md` は別ターン由来。

## §0.5 前回フォローアップ
直近 retro（2026-06-23 hermes-task-flow-redesign）の最大 open「**go-live 未実施＝次セッションで腰据えて**」→ **本セッションで VERIFIED**（Mac intake/breakdown 配備+launchd+点火+実 Notion 書込/Telegram/分解まで LIVE 検証、VM gateway hint+nudge S4 更新）。配備時に REPO_ROOT bug を発見・修正（#260）。前回 5 件 applied 維持・open 再発なし。

## §1 良かった点
- **REPO_ROOT 配備バグを本番点火前に構造検証で捕捉**。dry-run は repo 内実行で `parents[2]` が一致し露見しなかったが、配備先からの実パス解決（`/Users`）を実測して発見→修正してから点火。品質劣化 go-live を回避。
- **LIVE 実行の観測 → JSON hardening 出荷（#262）→ transient-error で精緻化（#263）**。claude -p が散文を返す/使用上限エラーを返す両方に対応。特に quota 障害で全 heavy カードを恒久パークする副作用に気づき、「一時エラーは断念せず draft 維持→自動再開」へ設計修正。
- **最終的に devtools で課金の ground-truth（コスト group-by-APIキー・Claude Code 使用表）を取り、混乱を実証で決着**。出血源＝廃止案件 API キー money-bot($48) と特定→無効化。
- 誤るたびに**ごまかさず明言して訂正**した。

## §2 詰まった / 二度手間

| # | 事象 | 原因（構造） | 本来すべき |
|---|---|---|---|
| 1 | **claude -p 課金結論を2回誤断定→再訂正**（サブスク→クレジット→サブスク） | 課金機構を間接signal（設定に API key 無/エラー文言/ダッシュボード概観）から推論。権威ソースの内訳を最後まで見なかった | ユーザーが「コンソールにコスト出てる」と言った時点で devtools の cost group-by-APIキーへ直行して実証してから結論 |
| 2 | 誤結論を memory に2回書込→2回訂正（再作業・トークン浪費） | verify 前に確信して SAFE 反映 | 機構説明で確信が割れ得る間は「未確認」で保留し verify まで反映しない |
| 3 | `claude setup-token` が `!` bg でハング（0出力） | 対話CLI（TTY/ブラウザcallback要）を bg 実行 | 既存 memory どおり対話CLIは Terminal.app。打鍵時に即明示 |
| 4 | REPO_ROOT bug（配備先で /Users 解決） | dry-run を repo 内から実行＝parents[2] 一致で隠れた | 配備系は着手時に配備先からの実パス解決を測る |

## §3 自動化・効率化の余地
「課金が合わない/想定外コスト」→ devtools で コスト（group-by APIキー）＋範囲=今日＋Claude Code 使用表 を開いて内訳を実証する型。再現性あり（忘れ去られた API キー / サブスク混線は今後も起き得る）。30日2回の確証は弱くスキル化は improvement-log で保留。

## §5 レンズ
- 🔧 **未活用資産**: `feedback_interactive_cli_terminal_default`（setup-token の bg ハングを事前回避できた）。
- ⚡ **Claude 機能**: devtools を最初に使えば中間の誤結論arcを丸ごと省けた。billing 仮説に grill-me 的自己反証を当てるべきだった。
- 🪙 **トークンコスパ**: 巨大セッション。flip-flop による再作業（誤 memory 2回＋再訂正）が純粋な無駄。devtools 先行で中間 arc を削減できた。subagent 2回（claude-code-guide）＋WebSearch は妥当。

## §6 反映（SAFE 即反映済）
- `memory/reference_claude_code_subscription_vs_credit_billing.md`（新規）— claude -p 課金実体・出血源 money-bot・OAuth ピン留めの顛末。MEMORY.md 索引にも追加
- `memory/feedback_user_perception_vs_data_check.md` += 「課金/帰属/機構は権威ソースで実証してから断定・verify まで未確認保留」
- `wiki/self/engineering-principles.md` += 新原則「帰属・機構は権威ソースの内訳で実証してから断定する（2026-06-23）」
- `memory/MEMORY.md` — hermes 行を最終事実に訂正＋索引 162→138 圧縮（完了 project 12+utility reference 10 を降格・本文残置）
- `memory/project_hermes_todo_partner.md` — go-live 完了 + 課金顛末 + hardening を最終版に更新
- `data/improvement-log.jsonl` += 本 retro（status=applied・remeasure 付き）

RISKY 該当なし（新規スキル確定追加・ルーティング/permissions 変更・エージェント増減なし）。billing 調査スキル化は open で保留。

## 出荷物（main）
PR #260（REPO_ROOT 修正）/ #262（JSON strict-retry+断念ガード）/ #263（一時APIエラーは断念せず自動再開）/ #264（headless サブスク・ピン留め）。go-live 配備・VM 更新・key revoke は devtools/CLI。
