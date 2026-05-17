# 自己改善提案 2026-05-17 (Iteration 6)

> ※ ファイル名は self-improve.sh の命名規則に従い it6 を継続使用しているが、本サイクルは Iteration 6 の翌週分（前回 2026-05-16 適用済み）。前回提案 proposal-20260516-it6.md と区別するため日付プレフィックスで識別する。

## 診断サマリー

### 前サイクル（2026-05-16 Iteration 6）の結果
3 提案すべて適用済み（improvement-log iteration_6_full_apply）:
1. `quality-scores.json` 整合性修正（削除 10 / 追加 8 / `pending_scoring` 列挙）→ 適用済み
2. `monthly-audit.sh` の `check_scores_integrity()` → 適用済み
3. `session-retrospective.md` の「反映先チェックリスト」セクション → 適用済み

→ 構造的不整合（前回最大の問題）は解消。本サイクルは「学びを実際に流す」段階。

### 直後の retrospective から発見された新規問題（2026-05-16 〜 2026-05-17）

**(A) 5/16 retrospective `escalated_prefill_detection`**
- secretary の改善提案審査モードが escalated.md の「人間への質問事項」に自分の回答を pre-fill した
- → `secretary.md` 該当節に 1 行追記済み（improvement-log line 54）

**(B) 5/17 retrospective `minpaku_vercel_deploy_stuck`**（実害 90 分以上の手戻り）
- Vercel deploy が走らない問題で Reconnect → Deploy Hook → CLI deploy と迂回。根本原因（Hobby plan の cron 1 日 1 回制限違反による build 即 reject）に気づくのが遅れた
- CLI deploy 路線で `.env.local` 破壊・機密キー空文字列復旧不能・Next.js 16 build エラー連鎖
- 新規 memory 4 件追加（`feedback_vercel_deploy_stuck_diagnostic.md` / `feedback_vercel_hobby_cron_constraint.md` / `feedback_vercel_cli_env_pull_pitfall.md` / `feedback_root_cause_pivot_discipline.md`）
- → **しかし `system-engineer.md` / `rapid-hp-operator.md` の定義本体には未反映**

→ 前回 Iteration 6 で追加した「反映先チェックリスト」が運用に乗っていない最初の証左。memory のみで完結している。

### 使用パターンの異常（前回未対応の継続課題）
- `data/usage-log.jsonl` は依然として自己改善ループ 6 件のみ（最終 2026-04-09）。1 ヶ月以上更新なし
- 実運用ログは `improvement-log.jsonl`（57 行、直近 2026-05-17）に流れている
- 前回サイクル診断でも「運用基盤改修は別サイクル」として保留。今回も保留すると 6 週連続放置になる

### monetize-os スポーク
- `agent-harness-eval.md` 最終更新 2026-04-21 → 26 日経過（2 週間ルール超過）
- → **本サイクルでは monetize-os 側の提案は出さない**（未計測）
- 構造的対応として、all-good-ops 側で「外部スポーク評価の鮮度判定」を入れる余地あり（提案 3 候補）

### スコアギャップ分析
- agent-ranks.json は全 28 件が N（新規）のまま。pending_scoring 8 件が baseline 採点未完了
- accuracy/safety 軸の baseline は 2026-04-10 時点で固定。coverage/efficiency/collaboration/improvement 軸は 1 件も採点なし
- → スコアベースの優先付けは依然不能。本サイクルは「実害（5/17 の 90 分手戻り）」を起点に優先付けする

## 根本原因分析

1. **memory→定義反映のループが人間ターン経由でないと発火しない**: Iteration 6 で `session-retrospective.md` に「反映先チェックリスト」を追加したが、retrospective を実行する都度ユーザーが「まとめて OK」と判断する流れになっており、エージェント定義への反映は「該当 agent.md L120 追記」のような明示行動として組み込まれていない。結果として 5/17 のように高インパクトな学びが memory に滞留する。

2. **観測データ（usage-log）と学習データ（improvement-log）の分離が放置されている**: usage-log.jsonl は self-improve.sh の `record_usage` で append される設計だが、実セッションの自動 append フックが存在しない。一方 improvement-log には retrospective が積まれている。usage-log を SSOT として使う前提のスクリプト（monthly-audit など）はあるが、データが空のため判断材料にならない。

3. **外部スポーク（monetize-os, portfolio, ai-radar）の評価データ鮮度を all-good-ops 側で監視する仕組みがない**: 委譲ルール（CLAUDE.md）はあるが、データが古くなった時のフェイルセーフがない。monetize-os の 26 日経過は人間が気付くまで放置される構造。

## 改善提案（優先度順）

### all-good-ops 改善

---

#### 提案1: 5/17 retrospective の根本原因 pivot 規律を system-engineer.md と rapid-hp-operator.md に反映

- **対象ファイル（絶対パス）**:
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/dev-automation/system-engineer.md`
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/.claude/agents/business-ops/rapid-hp-operator.md`
- **変更種別**: agent 定義修正（「よくある失敗」セクション拡張）
- **現状の問題**: 5/17 の Vercel deploy stuck 事例で 90 分以上の手戻り + 機密キー復旧不能の二次被害。memory に `feedback_root_cause_pivot_discipline.md` / `feedback_vercel_hobby_cron_constraint.md` 等 4 件を追加したが、新規セッションの system-engineer / rapid-hp-operator は memory を起点には起動しないため、同じ罠を踏み続ける。
- **具体的な変更内容（差分レベル）**:

  **(1-a) system-engineer.md L98-101 の「よくある失敗」セクションを拡張**:
  ```diff
   ## よくある失敗
   - エラーハンドリングの不足
   - 環境依存のハードコード
   - テスト不足のまま本番適用
  +- **迂回ルートに固執して根本原因を見逃す**: 1 つの手段が失敗した時に同じ手段の variant を 3 つ試す前に、「なぜ失敗したか」の仮説を 1 つは立てる。Reconnect → Deploy Hook → CLI deploy のような同階層の迂回連鎖は、根本原因が判明した瞬間に撤退する（参考: feedback_root_cause_pivot_discipline.md / feedback_vercel_deploy_stuck_diagnostic.md）
  +- **デプロイ系で `.env.local` を CLI コマンドで上書きする**: `vercel env pull` の挙動は環境によって既存ファイルを破壊する。実行前に `.env.local` のバックアップ必須（参考: feedback_vercel_cli_env_pull_pitfall.md）
  +- **プラットフォーム制約（cron 頻度・関数実行時間等）の事前確認を省略**: Hobby/Pro 等プラン別制約は build 失敗の silent な原因になる。新規 Vercel プロジェクト着手時は Hobby cron 制限を最初に確認（参考: feedback_vercel_hobby_cron_constraint.md）
  ```

  **(1-b) rapid-hp-operator.md にも同種ガードを追記**（受注案件の Vercel デプロイで再発する想定）:
  - rapid-hp-operator.md の既存「失敗パターン」「Vercel team デプロイ前チェック」相当節に 1 行追記（具体行は人間レビュー時にエージェント側で位置確定。最大 3 行追加）

- **期待するスコア影響**:
  - improvement 軸（15 点満点）: +3〜+4。memory→定義反映ループの最初の実証
  - accuracy 軸: +1。同じ罠の再発防止で問題診断の精度向上
  - 実害ベース: 90 分相当の手戻り防止が次回類似ケースで期待できる

- **リスク**: 低。追記のみで既存挙動を破壊しない。memory への参照を残すので詳細はそちらに委ねる構造。

- **コスト**: 0（編集のみ）。次回エージェント起動時のトークン増は数十〜100 程度。

---

#### 提案2: usage-log.jsonl の運用方針確定（廃止 + improvement-log を SSOT に統合）

- **対象ファイル（絶対パス）**:
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/CLAUDE.md`（パイプライン Step 4 の記述修正）
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/scripts/self-improve.sh`（usage-log 読み取り箇所を improvement-log に切り替え）
  - `/Users/rikukudo/Projects/private-agents/all-good-ops/scripts/monthly-audit.sh`（同上）
- **変更種別**: 運用基盤の方針確定（usage-log 廃止）
- **現状の問題**: 前回サイクルでも指摘済み。usage-log.jsonl は 2026-04-09 で更新停止。実運用ログは improvement-log.jsonl に流れている。「データなし」状態を 6 週連続で観測している以上、自動 append フックを後付けで実装するより、SSOT を移し替えるほうが現実的。
- **具体的な変更内容（差分レベル）**:
  - **方針確定**: usage-log.jsonl を非推奨化（既存ファイルは履歴として保持、追記停止）
  - CLAUDE.md パイプライン Step 4 の記述を「improvement-log.jsonl にセッション学習ログを記録（session-retrospective 経由）」に変更
  - self-improve.sh / monthly-audit.sh の「直近 N 件の usage-log を読む」ロジックを「直近 N 件の improvement-log を読む」に変更
  - secretary.md の「セッション開始時の動作」内の `data/usage-log.jsonl` 参照行を `data/improvement-log.jsonl` に置換
  - data/usage-log.jsonl 末尾に `{"deprecated_after":"2026-05-17","successor":"improvement-log.jsonl"}` を 1 行追記
- **期待するスコア影響**:
  - collaboration 軸（15 点満点）: +2。エージェント間のコンテキスト共有が「断絶した usage-log」ではなく「鮮度ある improvement-log」を参照するようになる
  - efficiency 軸: +1。空ファイル読み取りの無駄が消える
- **リスク**: 中（→ SAFE 寄り）。SSOT 切替で参照箇所の取りこぼしがあると monthly-audit が静かに壊れる可能性。緩和策として「変更前に `grep -rn 'usage-log' scripts/ .claude/` で参照箇所を網羅し、提案 2 適用 PR の checklist に列挙」を提案文に含める。
- **コスト**: 0（編集のみ）。

---

#### 提案3: 外部スポーク評価データの鮮度モニタを monthly-audit.sh に追加

- **対象ファイル（絶対パス）**: `/Users/rikukudo/Projects/private-agents/all-good-ops/scripts/monthly-audit.sh`
- **変更種別**: スクリプト追加（観測機能のみ・採点や書き込みなし）
- **現状の問題**: monetize-os の harness-eval は 2026-04-21 最終更新で 26 日経過。CLAUDE.md の委譲ルール（外部スポーク）にはデータ鮮度の責任分担が明記されておらず、人間が気付くまで陳腐化が放置される。前回サイクルでも今回も同じ理由で「monetize-os 提案なし」となり 6 週連続スキップになっている。
- **具体的な変更内容（差分レベル）**:
  - monthly-audit.sh に bash 関数 `check_spoke_freshness()` を追加:
    ```bash
    check_spoke_freshness() {
      local spokes=(
        "/Users/rikukudo/Projects/monetize-os/ops/agent-harness-eval.md"
        "/Users/rikukudo/Projects/monetize-os/ops/organization-harness-eval.md"
        "/Users/rikukudo/Projects/ai-radar/ops/dashboard-health.md"   # 存在しなければ skip
      )
      local threshold_days=14
      local stale=()
      for f in "${spokes[@]}"; do
        [ ! -f "$f" ] && continue
        local age=$(( ( $(date +%s) - $(stat -f %m "$f") ) / 86400 ))
        if [ "$age" -gt "$threshold_days" ]; then
          stale+=("$(basename $f): ${age}日")
        fi
      done
      if [ ${#stale[@]} -gt 0 ]; then
        echo "[WARN] 外部スポーク評価データが ${threshold_days}日 以上古い:"
        printf '  - %s\n' "${stale[@]}"
        echo "[ACTION] 該当スポークのハーネス評価バッチを人間トリガーで再実行してください。"
      fi
    }
    ```
  - 既存 audit フローの末尾で呼び出し
  - cycle ログ JSON に `spoke_freshness: {stale: [...], threshold_days: 14}` フィールドを追加
- **期待するスコア影響**:
  - safety 軸（20 点満点）: +2。古いデータに基づく改善提案を出してしまうリスクを下げる
  - collaboration 軸: +1。外部スポークとの連携健全性が定期的に可視化される
- **リスク**: 低。読み取り + ログのみ。stat の `-f %m` は macOS 専用だが all-good-ops は macOS 環境前提。
- **コスト**: 0（既存実行内の数秒）。
- **persona character.md 禁則の尊重**: 本提案は monetize-os 配下のファイルを **読み取り専用** で参照するだけで、persona 固有ファイル（hagurin/.claude/agents/*.md や character.md）には一切触れない。閾値超過時の警告は all-good-ops 側のログにのみ書く。

---

### monetize-os 改善

データが 2026-04-21（26 日経過）で未計測扱い。**本サイクルでは提案なし**。

提案 3 が承認・適用されれば、次回月次監査で「monetize-os のハーネス評価が 14 日超過」が自動検出され、人間トリガーで再実行する判断材料が手に入る。それを踏まえた monetize-os 側提案は次々回サイクル以降で出す。

## コスト見積もり

| 提案 | 適用コスト | 運用コスト増 |
|---|---|---|
| 1. system-engineer/rapid-hp-operator への根本原因 pivot 規律追記 | 0（編集のみ） | 各エージェント起動時 +50〜100 トークン |
| 2. usage-log.jsonl 廃止 + improvement-log 統合 | 0（編集のみ） | むしろ削減（空ファイル読み取り消滅） |
| 3. monthly-audit.sh に外部スポーク鮮度チェック追加 | 0（編集のみ） | 月次数秒 |

合計: ほぼ 0。3 件とも「コスト増加を伴う提案は避ける」要件を満たす。

## 前回サイクルの振り返り

### Iteration 6（2026-05-16）で適用された 3 件
- **quality-scores.json 整合性修正** → 構造的不整合は解消。pending_scoring 8 件は次回 baseline 採点待ち
- **monthly-audit.sh の `check_scores_integrity()`** → 次回月次監査（6 月 1 日）まで動作実証なし
- **session-retrospective.md「反映先チェックリスト」追加** → 5/16 / 5/17 の retrospective では一部活用（secretary.md に 1 行追記）されたが、5/17 の高インパクト学び（feedback_root_cause_pivot_discipline 等 4 件）は memory のみで完結。本サイクル提案 1 で補完

### 学び
- **チェックリスト形式の規律は人間ターンを介さないと発火しにくい**。Iteration 6 の追加だけでは memory→定義反映のループは閉じなかった。本サイクル提案 1 で「最初の実証」をやり、Iteration 7 以降は「自動的に発火する仕組み」を検討
- **数値スコアより実害ベースの優先付けが効く現実**。agent-ranks は全 N のままだが、5/17 の 90 分手戻りという実害は提案 1 の優先度を一意に決められた。スコア整備（提案 2 の派生で baseline 採点を月次で消化）は中長期目線、実害駆動は今サイクル目線で並走させる
- **前回診断「運用基盤改修は別サイクル」が 2 サイクル連続放置になりかけた**。提案 2 で usage-log を廃止することで放置を解消。次回以降「別サイクル」と書いた項目は最大 2 サイクル以内に処理するルールを memory に追加すべき（本提案には含めず、retrospective で扱う）

---

**自己改善ループ運用ルール（再掲）**:
- 提案は人間が承認してから適用される（自動適用禁止）
- 本提案 3 件の SAFE/RISKY 判定:
  - 提案 1: SAFE（agent.md 追記のみ・既存挙動破壊なし）
  - 提案 2: SAFE 寄り（運用方針変更を伴うが後方互換あり。grep による参照網羅チェックを適用 PR で必須化）
  - 提案 3: SAFE（読み取り + ログ出力のみ）
