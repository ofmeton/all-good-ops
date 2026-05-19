# 自己改善提案 2026-05-16 (Iteration 6)

## 診断サマリー

### データ陳腐化（最重要）
- `data/quality-scores.json`（最終更新 2026-04-10）は baseline モードのまま放置。`agent-ranks.json`（2026-04-25）と現存エージェント定義の三者で整合が取れていない。
- **quality-scores.json に存在するが現存しないエージェント 10件**: knowledge-curator / safety-net-advisor / icecream-ops / schedule-coordinator / admin-handler / health-tracker / network-manager / info-organizer / mcp-architect / quality-auditor（削除・統合済み）
- **現存するが quality-scores.json に未登録のエージェント 8件**: data-analyst / presentation-reviewer / ai-radar / design-director / conversion-designer / rice-cream-ops / rapid-hp-operator / ad-ops-specialist
- 結果として、`agent-ranks.json` は 28 エージェント全てが N（新規）ランクのままで動かない。N-B(60点) を目標とした改善ループが空転している。

### 使用パターンの異常
- `data/usage-log.jsonl` は自己改善サイクル 6 件のみ（2026-04-06〜2026-04-10）。直近 1 ヶ月の通常運用ログは記録されていない。
- 一方で `improvement-log.jsonl` は活発（51件、直近は 2026-05-16）。実運用の学習は session-retrospective スキル経由で蓄積されているが、`usage-log.jsonl` への反映ルートが断絶している。
- 結論: usage-log は廃止または retrospective から自動派生させる構造が必要だが、今回は対象外（運用基盤改修は別サイクル）。

### スコアギャップ分析（参考）
2026-04-10 baseline での total_partial（accuracy+safety / 40点満点）下位:
- icecream-ops 25（削除済み）/ network-manager 25（削除済み）/ goal-tracker 26 / info-organizer 26（削除済み）/ knowledge-curator 27（削除済み）/ client-manager 27 / health-tracker 27（削除済み）
- 現存エージェントの実質ワースト: **goal-tracker 26 / client-manager 27 / writer 28 / ibasho-designer 28 / shopify-operator 29**
- ただし baseline 自体が古いため、データを更新しない限り次の打ち手の優先付けが決まらない。

### 前サイクル差分
Iteration 5 で適用された 2 件（proposal命名規則・RUN_SECRETARYガード）は仕組み改善であり、品質スコアへの直接影響は不明。Iteration 5 で人間承認の上で baseline 採点が走ったのが直近のスコア更新。

### monetize-os スポーク
ハーネス評価ファイル群（agent-harness-eval.md 等）の最終更新が 2026-04-21、`agent-improvement-plan.md` 系は 2026-04-13。今日（2026-05-16）から 25〜33 日経過しており「2 週間以上古い」条件に該当。**本サイクルでは monetize-os 側の提案は出さない**（未計測扱い）。

## 根本原因分析

1. **scoring データのライフサイクル管理が定義されていない**: エージェントの追加・削除時に `quality-scores.json` を同期する手順が `agent-onboarding.md` スキルにも CLAUDE.md にも記載がない。エージェント新設プロトコル（パイプライン Step 2）が CLAUDE.md ルーティング表更新までしか触れず、quality-scores.json / agent-ranks.json は手付かず。
2. **整合性チェックの不在**: `monthly-audit.sh` は baseline モード起動条件が「空scores検出時」のみ。「現存しないエージェントが scores に残る」「現存するエージェントが scores に欠落」ケースの検出ロジックがない。
3. **retrospective → 定義反映の標準化不足**: improvement-log.jsonl に retrospective が積まれ memory には feedback_* が量産されているが、影響を受けるエージェント定義への反映チェックが session-retrospective スキルの手順に組み込まれていない。結果として memory に学習が滞留し、新規セッションのエージェント定義に流れない。

## 改善提案（優先度順）

### all-good-ops 改善

---

#### 提案1: quality-scores.json を現組織構造に合わせて整理（採点はしない）

- **対象ファイル（絶対パス）**: `/Users/rikukudo/Projects/private-agents/all-good-ops/data/quality-scores.json`
- **変更種別**: データ整備（quality-scores.json の構造修正、採点は実施しない）
- **現状の問題**: 削除済み 10 件・新規 8 件で計 18 エージェントが整合していない。`agent-ranks.json`（28件）との突合も失敗する。これを放置すると次回 monthly-audit でも「空scoresは無いが内容が不整合」のまま baseline 採点トリガーが発火しない。
- **具体的な変更内容（差分レベル）**:
  - `scores` から削除済み 10 件を除去: knowledge-curator / safety-net-advisor / icecream-ops / schedule-coordinator / admin-handler / health-tracker / network-manager / info-organizer / mcp-architect / quality-auditor
  - 現存する未登録 8 件を `scores` に追加（全軸 `null`、`_baseline: true` のみ、notes に「2026-04-10 baseline 採点後に新設されたため未採点」）:
    - data-analyst / presentation-reviewer / ai-radar / design-director / conversion-designer / rice-cream-ops / rapid-hp-operator / ad-ops-specialist
  - トップレベルに `last_updated: "2026-05-16"`、`baseline_status: "partial"`、`pending_scoring: [...]`（未採点 8 件のリスト）を追加。
  - **採点自体は実施しない**（コスト発生回避）。次回 `monthly-audit.sh` が `pending_scoring` を見て差分採点を実施できるよう、構造を整えるだけ。
- **期待するスコア影響**: 直接のスコア向上は無し。ただし agent-ranks.json と quality-scores.json と現存エージェント定義の三者整合が取れ、N-B 到達判定が正しく動くようになる（現状は壊れている）。
- **リスク**: 低。削除エントリは既に該当エージェント自体が存在しないので参照リスクなし。データの後方互換も問題なし（読み手は `_baseline: true` で「採点中」を識別済）。
- **コスト**: 0（編集のみ）。

---

#### 提案2: monthly-audit.sh に整合性チェックを追加（差分検出のみ・採点は走らせない）

- **対象ファイル（絶対パス）**: `/Users/rikukudo/Projects/private-agents/all-good-ops/scripts/monthly-audit.sh`
- **変更種別**: スクリプトのバグ修正 / 観測可能性向上
- **現状の問題**: monthly-audit.sh は scores が空の時のみ baseline 起動するため、提案1のような「部分的不整合」状態を検出できない。一度 baseline が埋まると永久にチェックが走らない。
- **具体的な変更内容（差分レベル）**:
  - スクリプト先頭に bash 関数 `check_scores_integrity()` を追加:
    1. `find .claude/agents -name '*.md' | xargs basename -s .md | sort` で現存エージェント一覧を取得
    2. `jq -r '.scores | keys[]' data/quality-scores.json | sort` で採点済み一覧を取得
    3. `diff` で差分を取り、`logs/audit-integrity-YYYYMMDD.log` に「missing_in_scores」「extra_in_scores」を書き出し
    4. 差分があれば標準出力に WARN（exit code は変えない、後段処理を止めない）
  - 既存の baseline 起動条件は変えない（人間承認済みの 240k トークン採点ロジックを温存）。
  - cycle_complete ログに `integrity_check: {missing: N, extra: M}` フィールドを追加。
- **期待するスコア影響**: 直接のスコア向上は無し。健全性向上で、今後 quality-scores.json と現存エージェントが乖離するたびに月次で気付ける（提案1 のような状態の再発防止）。
- **リスク**: 低。読み取り専用 + ログ出力のみ。既存挙動を変更しない。jq が前提だが既に使用済（self-improve.sh で使用実績あり）。
- **コスト**: 0（既存実行内の数秒の追加処理）。

---

#### 提案3: session-retrospective.md スキルに「エージェント定義反映チェック」セクションを追加

- **対象ファイル（絶対パス）**: `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/skills/session-retrospective.md`
- **変更種別**: skill 追記
- **現状の問題**: improvement-log.jsonl の直近 retrospective を見ると、学び（feedback_*.md）は memory に積まれるが、対応する**エージェント定義 / CLAUDE.md ルーティング表**への反映チェックは個別判断に委ねられている。結果として agent 定義は古い知識のままになり、新規セッションで同じ間違いが再発しやすい。
  - 例: 2026-05-15 の `surface_conflicts_no_average` / `multistep_task_checkpoints` 等の追加 process は memory には入ったが、system-engineer.md / rapid-hp-operator.md には反映されていない。
- **具体的な変更内容（差分レベル）**: スキル末尾に以下のセクションを追加:
  ```
  ## 反映先チェックリスト（学びをどこに置くか）

  retrospective の findings ごとに、以下の問いを順に判定してから「反映先」を 1 つ以上選ぶ。memory への保存だけで完結させない。

  1. その学びは**特定エージェントの振る舞い**に閉じるか？ → 該当 agent.md の「よくある失敗」「参照スキル」セクションに 1 行追記
  2. その学びは**横断ルール**か？ → CLAUDE.md（ルーティング表 / 人間確認ルール / 禁止事項のいずれか）に追記
  3. その学びは**スキル化可能な手順**か？ → 新規 skill .md（手順 5 ステップ以上 / 再利用 3 回以上見込み）
  4. 1〜3 に該当しないなら memory のみ保存で OK

  反映決定後、improvement-log.jsonl の reflections_applied 配列に **必ず反映先のファイルパスを含める**（例: ".claude/agents/dev-automation/system-engineer.md L120 追記"）。memory 名だけでは追跡不能。
  ```
- **期待するスコア影響**: improvement 軸（15点満点）への波及。現状未採点だが、retrospective→定義反映のループが回ることで、新規セッション時点の agent 定義が常に最新の学びを反映した状態になり、coverage / accuracy 軸の点数も中長期で底上げされる見込み。
- **リスク**: 低。スキル追記のみで既存フローを破壊しない。
- **コスト**: 0（次回 retrospective 実行時の数百トークン増）。

---

### monetize-os 改善

データが 2026-04-21 で 25 日経過のため「未計測」扱い。**本サイクルでは提案なし**。

次回サイクル開始前に `monetize-os/scripts/` のハーネス評価バッチを再実行してデータをリフレッシュすることを推奨（人間トリガーで）。

## コスト見積もり

| 提案 | 適用コスト | 運用コスト増 |
|---|---|---|
| 1. quality-scores.json 整理 | 0（編集のみ） | 0 |
| 2. monthly-audit 整合性チェック | 0（編集のみ） | 月次数秒 |
| 3. session-retrospective スキル追記 | 0（編集のみ） | 各 retrospective 数百トークン |

合計: ほぼ 0。3 件とも「コスト増加を伴う提案は避ける」要件を満たす。

## 前回サイクルの振り返り

### Iteration 5 で適用された 2 件
- `scripts/self-improve.sh` の proposal 命名規則修正（iteration 番号付与） → 衝突回避は機能、本サイクルでも `proposal-20260516-it6.md` 命名で活用
- `scripts/self-improve.sh` の RUN_SECRETARY 環境変数ガード → 観測可能性は向上。ただし `secretary_invoked` フィールドの利用例はまだ無い

### Iteration 5 で escalated → 人間承認後に適用された 1 件
- `scripts/monthly-audit.sh` の baseline 採点起動 → 2026-04-10 に実行され、accuracy/safety 軸の 30 エージェント採点完了。**ただし本サイクルで判明したように、その後の組織変更（10件削除/8件新設）で陳腐化済**。提案2 はこの陳腐化に対する後続フォロー。

### 学び
- baseline 採点は「一度走らせて終わり」ではなく、組織構造変更に追従する整合性チェックがセットで必要。Iteration 5 では採点まで進めたが、メンテ機構の不在を発見できなかった。本サイクルで補完する。
- 自己改善ループが空転すると（agent-ranks.json が全 N のまま動かない）、改善方向の優先付けに使えるシグナルが消える。データの鮮度維持は他のどの提案より先に来る。

---

**自己改善ループ運用ルール（再掲）**:
- 提案は人間が承認してから適用される（自動適用禁止）
- 本提案 3 件は全て SAFE 判定可能（コスト発生なし / ロジック変更なし or 後方互換）として `secretary.md` の改善提案審査モードでの自動適用候補
