# BSA-PA 提案自動送信 設計

- 日付: 2026-05-15
- 対象: `outputs/bsa/proposal-automation/`
- 依頼: 「BSA の案件収集を、応募・提案まで自動化。ユーザーがやるのは起動だけ。確認なし」

## 背景と現状

現在の BSA-PA パイプライン（`scripts/run.command`）:

```
Stage 1 collector  案件収集 + fit_score 採点
Stage 2 generator  提案文生成（Claude Code CLI）
Stage 3 notifier   macOS 通知 + Gmail
Stage 4 dashboard  起動してブラウザで開く  ← ここで止まる
```

送信は人間がダッシュボードで各案件をレビューし、`fill-form` をクリックして実行していた。
フォーム自動入力＋送信の機能自体は既に存在する:

- `scripts/lib/_crowdworks_form_fill.py` — `auto_submit=True` で「応募する」を即クリック（確認画面なし）
- `scripts/lib/_lancers_form_fill.py` — 確認画面の「提案する/送信する」までクリック
- `scripts/lib/_coconala_form_fill.py` — Coconala（確認画面あり、LAN 型2段階）

各 form-fill は `run()` が終了コードを返す（0=成功, 1=cookie/プロファイル無し, 2=ログイン切れ,
3=フォーム無し, 4=確認ボタン不検出[LAN/CN], 5=送信失敗）。成功時のみ自身で
`jobs.status=submitted` に更新する。**失敗時のステータス更新は行わない**（呼び出し側の責務）。
また失敗時は `keep_browser_open` でブラウザを最大10分開いたまま待つ実装になっている
（無人バッチでは詰まるため、バッチ用フラグで無効化が必要）。

不足しているのは「**生成後に対象案件を自動で選び、送信し、結果をステータスに反映するステージ**」。

## ゴール

`~/Desktop/📥 BSA 案件収集.command` のダブルクリックだけで、収集→生成→**自動送信**→通知→ダッシュボード起動まで一気通貫。送信前の人間確認なし。

## 決定事項（ユーザー確認済み）

| 論点 | 決定 |
|---|---|
| 自動送信ゲート | `fit_score >= 60`（🔥+🎯） |
| 1回の送信上限 | 上限なし（ただしスパム回避の pacing は入れる） |
| 事後報告 | Gmail で結果サマリ ＋ 失敗時は別途「要対応」アラート |
| 採用アプローチ | A案: `run.command` に Stage 2.5 を追加 + Python ドライバ |

## アーキテクチャ

### 新規: `scripts/auto_submit.py`

DB から対象案件を選び、既存 form-fill スクリプトを subprocess として順に起動するドライバ。

**対象案件の抽出クエリ条件:**
- `proposals` 行が存在（生成済み）
- `jobs.status IN ('collected','proposing')`（未送信のみ）
- `fit_score >= 60`
- 提案が `decline_recommended` でない（生成側の辞退判定を尊重）。これは実装上
  別カラムではなく、辞退済みジョブが `status='declined'` を持つため上記の
  status フィルタで自動的に除外される
- 並び順: `fit_score DESC`
- 件数上限なし

**送信ループ:**
- job_id の prefix（LAN / CW / CN）で既存 form-fill スクリプトを subprocess 起動
  （ダッシュボードの fill-form route と同じ subprocess パターン）
- バッチ用に各 form-fill へ `--no-keep-open` フラグを追加し、失敗時の10分ハングを無効化。
  subprocess 自体にもタイムアウト（240秒/件）を backstop として設定
- 送信間に **30〜90秒のランダム pacing**（件数制限ではなく、媒体のスパム判定・アカウント凍結回避のための人間的ペーシング）
- 1案件の失敗は catch してログ＋次へ継続（1件のコケで全停止しない）
- 結果を `{job_id, platform, result, reason}` で集約して返す

**終了コード → ステータス（ドライバが書く）:**
- `0` → 成功。form-fill が `status=submitted` を記録済み
- `1` / `2`（cookie/プロファイル無し・ログイン切れ）→ ジョブは `proposing` のまま据え置き
  （relogin 後の次回起動で再試行）。さらに**その媒体の残り案件をスキップ**し要対応フラグを立てる
- `3` / `4` / `5` / タイムアウト / その他 → `unable_to_submit` に更新（人間レビュー対象）

### 変更: `scripts/run.command`

`Stage 2 generator` と `Stage 3 notifier` の間に `Stage 2.5 auto-submit` を追加:

```
Stage 1 collector
Stage 2 generator
Stage 2.5 auto-submit   ← 新規
Stage 3 notifier        ← 結果サマリを反映するよう拡張
Stage 4 dashboard
```

- 環境変数 `BSA_PA_NO_AUTO_SUBMIT=1` が設定されていれば Stage 2.5 をスキップ（旧来「ダッシュボードで止まる」挙動 = kill-switch）
- 自動送信の結果（成功/失敗件数・送信先リスト・要対応フラグ）を一時ファイル or DB クエリで Stage 3 に引き継ぐ

### 変更: `src/notifier/`（Stage 3）

- Gmail サマリに自動送信結果を追加:「N件送信 / 成功M / 失敗K」＋送信先案件リスト
- 失敗 or cookie 切れがある場合、件名に `❌ 要対応` を付けた別アラートを送る

### 変更: `CLAUDE.md`

人間確認ルールの表に BSA-PA の例外を明記:

> BSA-PA の提案送信は自動ゲート（`fit_score >= 60` ＋ `decline_recommended` 除外）を経るため、個別の人間確認は不要。kill-switch は `BSA_PA_NO_AUTO_SUBMIT=1`。

これは戦略ルールの変更にあたるため本設計ドキュメントに含め、実装時に反映する。

### 変更なし

- ダッシュボードは従来どおり Stage 4 で起動（事後レビュー用。履歴ページに `submitted` / `unable_to_submit` が並ぶ）
- form-fill スクリプト本体のロジック（LAN date picker 修正を除く・下記参照）
- generator / collector

## 実装前に潰すべきリスク

### LAN「計画」日付ピッカー（最優先ブロッカー）

`scripts/lib/_lancers_form_fill.py:200-209` は React 製 date picker への `fill()` が失敗すると warn を出すだけで継続する。これまでは人間が手動補正していた前提。無人化すると **日付欠落のまま確認画面に進む恐れ**がある。

対策:
- 実装計画の Phase 1 を「LAN date picker の動作検証・修正」とする
- ここが通らない場合、**LAN だけ手動フォールバック**（Stage 2.5 で LAN をスキップし dashboard レビューに回す）、CW / Coconala は自動送信、という構成で一旦リリース可能にする

### その他

- CW は確認画面なし＝即送信。誤送信時の取り消し不可。ゲート条件（fit_score / decline_recommended）の厳密さが唯一の防波堤
- 提案は工藤陸の本名で送られ取り消せない。ゲートのクエリ条件にバグがないことを実装時に実 DB で検証する

## テスト方針

- `auto_submit.py` の抽出クエリ: 実 DB（または fixture DB）に対して、ゲート条件を満たす/満たさない案件を仕込み、抽出結果を検証
- 送信ループの prefix 振り分け: LAN/CW/CC 各 prefix が正しいモジュールにルーティングされること
- cookie 切れスキップ: form-fill がログイン切れを返した時に同媒体の残りがスキップされること
- LAN date picker: Phase 1 で実機 fixture に対し日付投入が成功することを確認
- pacing: ループが pacing を挟むこと（時間モックで検証）

## ロールアウト

1. Phase 1: LAN date picker 検証・修正（通らなければ LAN フォールバック構成を確定）
2. Phase 2: `auto_submit.py` 実装（抽出クエリ・送信ループ・pacing・cookie 切れハンドリング）
3. Phase 3: `run.command` に Stage 2.5 追加 ＋ kill-switch
4. Phase 4: notifier 拡張（結果サマリ ＋ 要対応アラート）
5. Phase 5: CLAUDE.md 改定
6. 初回は `BSA_PA_NO_AUTO_SUBMIT=1` を外した状態で 1 回手動起動し、実送信を観測

## 担当

実装は dev-automation/system-engineer（BSA 案件のため rapid-hp-operator と連携）。本設計の writing-plans 以降で実装計画に落とす。
