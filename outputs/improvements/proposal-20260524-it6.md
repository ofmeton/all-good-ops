# 自己改善提案 2026-05-24 (Iteration 6)

> ファイル名は self-improve.sh 命名規則の延長で it6 を継続使用。前回 (2026-05-17) からの間に scheduled self-improve は走らず、本サイクルは手動トリガー。前提案 proposal-20260517-it6.md と区別するため日付プレフィックスで識別する。

## 診断サマリー

### 前サイクル (2026-05-17 Iteration 6) の結果

3 提案中の状態:
1. **提案1** (system-engineer.md / rapid-hp-operator.md への「よくある失敗」追記) → **SAFE 判定だが escalated のまま未適用**。harness sensitive file 制約で 3 回試行ブロックされ、人間アクション (permission 承認 or 手動 diff 反映) 待ち。proposal-20260517-it6.md の diff は明示済みだが、improvement-log.jsonl にも 5/19 以降に適用記録なし
2. **提案2** (usage-log.jsonl 廃止 + improvement-log 統合) → RISKY escalated. 未適用. 影響範囲が大きく分割推奨されたが未実施
3. **提案3** (monthly-audit.sh に外部スポーク鮮度モニタ追加) → applied (improve/iteration-6-20260517)

### 5/19 以降の差分 (本サイクルの新規シグナル)

improvement-log.jsonl への追記 (5/19 〜 5/22) を読むと、self-improve cycle は走らず、retrospective + ad-hoc feedback のみが積まれている:

- **5/19**: `self_improve_loop_staged_collision_detection` (process_added) / `symlink_target_branch_integrity_check` (process_added) / agent-ranks naming drift の fix (applied)
- **5/19 unemployment-deliberation**: context-mismatch / premise-misidentification / classification-error の memory 3 件追加
- **5/20 terra-isshiki**: browser_zoom_check / vercel_subproject_cwd / drive_mcp_base64_via_file / tailwind_vrl_padding の feedback 4 件追加
- **5/22 ai-radar-v2-pivot**: db_migration_pre_inspect / external_crawler_pre_curl / external_api_pricing_websearch / cron_perf_budget_calc / raw_save_short_status / worktree_remove_from_main の feedback 6 件追加
- **5/22 money-bot setup**: oauth detection-pattern / vendor-ui-update / env-file-handling (recurring 2 回) / supabase-tier-limit の missed-precheck 4 件追加

→ 直近 5 日間で **memory/feedback 17 件**追加。うち **system-engineer 領域の precheck 漏れが 7-8 件**集中している (db migration / external crawler / API pricing / cron perf / supabase tier / vercel subproject / env-file-handling)。前回提案1 と同種の「memory には積まれたが定義に流れていない」状態がさらに悪化。

### 使用パターンの異常 (継続課題)

- `data/usage-log.jsonl` は 2026-04-09 で停止のまま。6 週連続放置. 前回提案2 (廃止 or 統合) が escalated で空転している
- `improvement-log.jsonl` は 75 行超まで成長。実質 SSOT 化が事実上進行
- self-improve.sh の scheduled run は 5/16 以降走った形跡なし (improvement-log に cycle_applied 記録なし). cron / launchd の生存確認は本提案の範囲外だが、要観察項目

### monetize-os スポーク

- `agent-harness-eval.md` 最終更新 **2026-04-21 → 33 日経過** (前回診断時 26 日 → さらに 7 日経過)
- `agent-improvement-plan.md` 最終更新 **2026-04-13 → 41 日経過**
- 14 日 threshold を **大幅に超過**. 提案3 (前回適用) の `check_spoke_freshness()` が次回 monthly-audit (6/1) で警告を出す想定
- → **本サイクルでは monetize-os 側の提案は出さない (未計測)**

### スコアギャップ分析

- agent-ranks.json は依然全 29 件 N (採点ベースのランク確定なし)
- coverage/efficiency/collaboration/improvement 軸の baseline 採点は 0 件のまま
- → スコアベースの優先付けは依然不能. 本サイクルも「実害 + memory 集中度」起点で優先付ける

## 根本原因分析

1. **memory→定義反映ループが「人間 permission」で詰まっている**: 前回提案1 が SAFE 判定でも harness 制約で escalated → 1 週間経過しても適用されていない。同時期に system-engineer 関連の memory が 7-8 件追加されており、放置するほど反映時の差分が肥大化する。閾値超過で「持ち越しコスト」が指数的に増えるパターン。

2. **precheck 漏れが構造的に多発している**: 5/22 の ai-radar / money-bot で `db_migration_pre_inspect` `external_crawler_pre_curl` `external_api_pricing_websearch` `cron_perf_budget_calc` `supabase-tier-limit` の 5 件が同種パターン (実装着手前の 1 サンプル / 1 list 確認を省略して後で巻き戻し)。session-retrospective.md には「反映先チェックリスト」(Iteration 6 で追加) はあるが「事前確認の標準項目」がない。

3. **前回提案2 の usage-log 統合が「全か無か」で進めず空転**: 影響範囲が大きく RISKY で escalated → 1 週間経過しても何も動いていない。前回 escalation でも「Step A: deprecated 行追記のみ」「Step B: 参照書き換え」の 2 サイクル分割案が提示されていたが未実施。最小 Step A だけでも踏むと運用が一歩進む。

## 改善提案 (優先度順、最大3件)

### all-good-ops 改善

---

#### 提案1: 前回 escalated 提案1 を再提案 + 5/19〜5/22 の新規 memory を統合して system-engineer.md / rapid-hp-operator.md に反映

- **対象ファイル (絶対パス)**:
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/dev-automation/system-engineer.md`
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/business-ops/rapid-hp-operator.md`
- **変更種別**: agent 定義修正 (「よくある失敗」セクション拡張) + permission 設定の併用提案
- **現状の問題**:
  - 前回 (5/17) 提案1 は SAFE 判定だが harness sensitive file 制約で 1 週間放置. その間に同一エージェント領域で precheck 漏れ memory が 7-8 件追加. 1 件ずつ反映していくとセッションあたり permission prompt が重く運用に乗らない. **「まとめて反映 + 適用方法を恒久化」**で詰まりを解消する
  - 反映が進まない構造的理由は memory 増加と permission 摩擦の両方
- **具体的な変更内容**:
  - **(A) 提案文に統合する memory 一覧** (system-engineer.md の「よくある失敗」末尾に追記する候補行):
    - 迂回ルート固執 / `.env.local` バックアップ / Vercel プラン制約事前確認 (前回 5/17 分・diff 既存)
    - **DDL migration を書く前に list_tables + 分布クエリで実スキーマ確認** (5/22 db_migration_pre_inspect)
    - **外部 API crawler 実装前に curl 1 サンプル + content-type 確認** (5/22 external_crawler_pre_curl)
    - **変動激しい API 料金は WebSearch で最新取得 (training 時点と価格乖離リスク)** (5/22 external_api_pricing_websearch)
    - **cron 性能試算は実測ベースで perSourceLimit を逆算** (5/22 cron_perf_budget_calc)
    - **Supabase Free tier 2 project/org 制限を `list_projects` で先出し確認** (5/22 supabase-tier-limit)
    - **vercel CLI 前に cwd と `.vercel/project.json` を必ず verify** (5/20 vercel_subproject_cwd)
    - 上記を「**実装前の precheck 4 行 (DB / 外部 API / 料金 / プラン制約)**」として 1 ブロックに集約し、詳細は各 memory への参照を残す形にする (定義の肥大化を避ける)
  - **(B) rapid-hp-operator.md** には Vercel 文脈の 2 行 (cwd verify / `.env.local` バックアップ) を追記
  - **(C) 適用方法の恒久化 (人間判断項目)**: `.claude/settings.json` (project local) の permissions に `Edit:.claude/agents/**/*.md` を追加するか、self-improve loop の応答で permission を一括承認してもらう運用に切り替えるかをユーザーに選択してもらう. **本提案の Edit 実行は (C) の判断後**
- **期待するスコア影響**:
  - improvement 軸 (15 点満点): +4. memory→定義反映ループの完走 + 今後の precheck 標準化
  - accuracy 軸: +2. 同種 precheck 漏れの再発防止
  - 実害ベース: 5/17 の 90 分手戻り + 5/22 の cron 11 時間試算誤り + supabase tier エラー等の再発防止
- **リスク**: 低. 文言追記のみ. 既存挙動破壊なし. memory 参照を残すので本文は最小限に保つ
- **コスト**: 0 (編集のみ). 起動時 +100〜150 トークン (precheck 4 行ブロック分)

---

#### 提案2: session-retrospective.md / または skill のチェックリストに「事前確認 (precheck) 標準項目」セクションを追加

- **対象ファイル (絶対パス)**:
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/skills/session-retrospective.md`
- **変更種別**: skill 追記 (新規セクション 1 つ追加. 既存「反映先チェックリスト」と並列)
- **現状の問題**:
  - 5/22 の retrospective で precheck 漏れ 5 件が同種パターンとして集中. 前回 Iteration 6 で追加した「反映先チェックリスト」は **事後 (memory→定義反映)** の規律で、**事前 (実装着手前の標準確認)** が未整備
  - 単発 feedback が memory に積まれるだけでは再発防止できない. 「次回類似タスクの最初に何を確認するか」を skill のチェックリスト化することで、新規セッションの system-engineer / ai-radar が起動時に参照できる
- **具体的な変更内容**:
  - `session-retrospective.md` 末尾近く (反映先チェックリストの直後) に下記セクションを追加:
    ```markdown
    ## 事前確認 (precheck) 標準項目

    retrospective で「実装前の確認を省略して巻き戻しが発生」が 2 回以上検出されたら、本セクションに 1 行追記する。新規セッションの該当領域エージェント (system-engineer / ai-radar 等) が起動時に参照し、該当タスクで該当項目を 1 つでも踏まずに進めようとしたら自分で警告を出す.

    | 領域 | 着手前に必ず確認 | 根拠 memory |
    |---|---|---|
    | DDL migration | `list_tables` + 該当カラムの分布クエリで実スキーマ確認 | feedback_db_migration_pre_inspect.md (2026-05-22) |
    | 外部 API crawler | curl 1 サンプル + content-type 確認 | feedback_external_crawler_pre_curl.md (2026-05-22) |
    | 外部 API 料金参照 | WebSearch で最新料金を取得 (training 時点と乖離前提) | feedback_external_api_pricing_websearch.md (2026-05-22) |
    | cron / バッチ性能試算 | 1 件あたり実測秒数を取って perSourceLimit を逆算 | feedback_cron_perf_budget_calc.md (2026-05-22) |
    | Supabase project 新設 | `list_projects` で Free tier 2/2 確認 → 残枠なしなら A〜E 代替案を先出し | feedback_supabase_project_precheck.md (2026-05-22) |
    | Vercel CLI 実行 | cwd と `.vercel/project.json` を verify | feedback_vercel_subproject_cwd.md (2026-05-20) |
    ```
  - 各 memory ファイル名は既存命名規約に合わせる. 存在確認は本提案適用時に grep で
- **期待するスコア影響**:
  - coverage 軸 (15 点満点): +3. 同領域の precheck が標準化される
  - improvement 軸: +2. 単発 feedback が「次の retrospective で 1 行増える」だけで終わらず、運用に組み込まれる
- **リスク**: 低. skill 追記のみ. 既存「反映先チェックリスト」セクションと並列の構造
- **コスト**: 0 (編集のみ). session-retrospective skill 起動時のみ追加トークン

---

#### 提案3: 前回 escalated 提案2 の Step A のみ先行実行 (usage-log.jsonl 末尾に deprecated 行追記)

- **対象ファイル (絶対パス)**:
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/data/usage-log.jsonl`
- **変更種別**: data ファイル 1 行追記のみ
- **現状の問題**:
  - 前回提案2 は全 5 ファイル横断で RISKY 判定 → escalated → 1 週間進展なし
  - escalation 文書で提示された「Step A (deprecated 行追記のみ) / Step B (参照書き換え)」の 2 段階分割案のうち、Step A は完全に独立で SAFE. これだけでも踏めば「廃止予定の意思表示」が記録に残り、今後参照する側 (self-improve.sh / monthly-audit.sh / secretary) が気付く起点になる
- **具体的な変更内容**:
  - `data/usage-log.jsonl` 末尾に以下 1 行を append:
    ```json
    {"timestamp":"2026-05-24T00:00:00+09:00","deprecated_after":"2026-05-24","successor":"data/improvement-log.jsonl","note":"actual session logs flow to improvement-log.jsonl since 2026-05. usage-log.jsonl is retained for history only. Reference rewrite (Step B) deferred to a later cycle."}
    ```
  - 参照側 (self-improve.sh / monthly-audit.sh / secretary.md / CLAUDE.md) は **本提案では変更しない**. Step B は将来サイクル
- **期待するスコア影響**:
  - efficiency 軸: +0.5 (実質的なファイル参照効率改善は Step B まで保留. 本 Step A は意思表示のみ)
  - improvement 軸: +1. 「escalated 提案が分割で部分前進できる」運用パターンの最初の事例
- **リスク**: 極低. 単一ファイルの末尾 1 行追記. 既存 reader (jq/grep ベース) を壊さない JSON 形式
- **コスト**: 0

---

### monetize-os 改善

- 評価データ最終更新 2026-04-21 → 33 日経過 / improvement-plan は 41 日経過. **本サイクルでは未計測扱いで提案なし**
- 前回 (5/17) 適用の `check_spoke_freshness()` が 6/1 monthly-audit で警告を出す想定. 警告が確認されたら次々サイクル以降で monetize-os ハーネス再実行を人間トリガーで起動 → そのデータを踏まえた提案を出す
- persona 配下ファイル (hagurin/.claude/agents/*.md, character.md) には本提案で一切触れない. character.md 禁則の尊重を維持

## コスト見積もり

| 提案 | 適用コスト | 運用コスト増 |
|---|---|---|
| 1. system-engineer.md / rapid-hp-operator.md 追記 (前回持ち越し + 5/19〜5/22 新規統合) | 0 (編集のみ. permission 設定の判断は人間 1 ターン) | 各エージェント起動時 +100〜150 トークン |
| 2. session-retrospective.md に「事前確認標準項目」セクション追加 | 0 (編集のみ) | session-retrospective skill 起動時のみ |
| 3. usage-log.jsonl に deprecated 行 1 行追記 | 0 (編集のみ) | 0 |

合計: ほぼ 0. 「コスト増加を伴う提案は避ける」要件を満たす.

## 前回サイクルの振り返り

### 前回 (2026-05-17 Iteration 6) からの教訓

- **SAFE 判定でも harness 制約で escalated になる事例の継続**: 提案1 は 1 週間放置. 本サイクル提案1 で「permission の恒久化」を併せて提案することで構造的に解消する
- **RISKY 提案を「全か無か」で扱うと空転する**: 提案2 が典型. 本サイクル提案3 で「Step A のみ先行実行」の最小前進パターンを実証する
- **applied 提案 (前回提案3 の spoke_freshness) は次回 monthly-audit (6/1) まで動作実証なし**. 効果検証は次サイクル以降

### 直近 5 日の memory 集中度から見えるパターン

- **system-engineer 領域に precheck 漏れが集中** (5/22 で 5-6 件). 提案1 と提案2 の組み合わせで定義側 + skill 側の両方から強化する
- **persona / 外部スポークには触れていない**: monetize-os データの古さは認識しつつ、今サイクルでは all-good-ops 側の構造改善に集中する

---

## ルール再掲

- 提案は最大 3 件 (本提案: 3 件)
- コスト増加を伴う提案なし
- 汎用的な改善のみ (特定タスク専用ハックなし)
- 提案 1〜3 の SAFE/RISKY 判定:
  - **提案1**: SAFE (agent 定義追記のみ・既存挙動破壊なし) / **ただし harness sensitive file 制約で escalated 確実**. permission 恒久化方針の選択は人間判断
  - **提案2**: SAFE (skill 追記のみ. `.claude/skills/` 配下は sensitive file 対象外の想定だが、適用時に harness 挙動を確認)
  - **提案3**: SAFE (data ファイル末尾 1 行追記. `data/usage-log.jsonl への追記` は CLAUDE.md「確認不要の操作」に明記済み)
- monetize-os は未計測扱いのため提案なし. persona 固有ファイルには一切触れない
- 提案は人間が承認してから適用される (自動適用禁止)
