---
name: hermes-task-intake
description: hermes に振られたタスクを「6要素の共通認識(目的/ゴール/制約/裁量/リソース/報告)」で受け止め、自己調査で埋め、低確信だけ逆質問し、粗ければ分解案を出し、Autonomy を提案する intake/breakdown プロトコルの SSOT。ユーザーが「タスクを整える」「intake回して」「このタスク詰めて」「分解して」等と言ったとき、または intake_enrich / nudge_loop の動作規範として参照する。実行(自走)の収束は別(executor)・学びの昇華は hermes-learn-review。
---

# hermes-task-intake — 6要素ブリーフで受け止める自走パートナーの intake

陸さんは Telegram で最小限だけ振る。hermes/Claude は**文脈を自分で取りに来て**共通認識を埋め、放置に厳しく、できる準備は先にやる。本 skill はその受け止め方の SSOT。

- **対象 DB**: 「あとでやるタスク」database_id `2159405e11a84e7f90a8b6252bb43d38` / data_source_id `782773d8-4cc4-445e-978d-42e48d892717`。読みは `notion-search`+`notion-fetch`、post/patch=database_id・query=data_source_id（[[reference_notion_mcp_id_and_sharing]]）。
- **関連**: 投影による文脈注入=[[project_hermes_todo_partner]] Phase B(`USER_PROFILE.md`)。学びの昇華=`hermes-learn-review`。実行=ccauto/autorun executor。

## 6要素ブリーフ（Notion フィールド）
| 要素 | フィールド | 中身 |
|---|---|---|
| ①目的・背景 | `Purpose` | なぜ・誰のどんな課題。指示外でも目的に照らして判断する核 |
| ②完成イメージ | `Goal` | どうなったら完了か。良い例/悪い例/参考成果物 |
| ③制約条件 | `Constraints` | 納期/予算/品質、そして**地雷(やってはいけない事)**を明文化 |
| ④裁量の範囲 | `Discretion` | 自分で決めていい/相談/絶対勝手に進めない の線引き |
| ⑤リソース | `Resources` | 参考資料・ツール・アクセス権・詰まったら誰に聞くか |
| ⑥報告 | `Reporting` | 報告タイミング・チェックポイント・エスカレーション経路 |
- 充足度は `BriefStatus`(draft / enriching / ready)。6要素が実用十分に埋まったら `ready`。
- `Discretion`(散文) を基に `Autonomy`(実行ラベル) を**提案**する（後述）。

## intake プロトコル（捕捉→エンリッチ）
1. **最小捕捉(OSS agent)**: Telegram→Inbox 起票。重い逆質問はしない（「受け取った」だけ）。`BriefStatus=draft`。
2. **自己調査(Claude側) を先に**: 質問する前に必ず手元の文脈を当たる:
   - `USER_PROFILE.md`(投影) / memory `user_*`・`project_*` / `~/brain/self/*` / `~/brain/0-raw/facts/*` / 過去の類似カード(Notion検索) / 関連 repo。
3. **埋められるだけ埋める**: 確信のある要素を該当フィールドへ書く。**確信のないものは書かない**（捏造しない）。
4. **低確信だけ逆質問**: 埋まらない穴を **1〜3問に絞って** Telegram で聞く（`BriefStatus=enriching`・`Status=NeedInfo`）。穴が無ければ質問せず `BriefStatus=ready`。
   - **即できる軽量カードは登録時その場で**逆質問。重い/時間がかかるものは黙って起票→非同期でエンリッチ。
5. **追加情報は黙って整理して追記**: 後から陸さんが補足したら、通知最小で該当フィールド/コメントへ整理して反映。
6. **できる準備は先に(承認不要)**: 調査・下書き・リソース収集・分解案は read-only/draft の範囲で先行してよい。**committal な実行(コードmerge/送信/金銭)は Autonomy 承認後**。

## breakdown プロトコル（粗いタスクの自動分解・承認制廃止）
- 検知: 本文に複数動詞 / 束リスト / スコープ過大。
- **承認不要で自動分割**(2026-06-24〜): intake が `BreakdownProposal` に分解案を書く → `breakdown_apply` が次サイクルで**そのまま子カード化**(陸さんの承認待ちは挟まない)。`ApproveBreakdown` ゲートは廃止。粗ければ勝手に小分けして進める方針。
  - 子カードに `Parent` リレーション(値=親カードURL)を設定。親には `Subtasks` が自動同期。
  - 各子に親の `Purpose` を継承 ＋ 個別 `Goal` を付ける。
  - 親カードは原則 executor で直接実行せず、子の進捗集約に使う。

## 裁量→Autonomy（提案→承認・既定の進み方）
- `Discretion` と task 種別から `Autonomy` を**提案**（陸さんの既定方針=提案→承認待ち）:
  - code 実装 → `cc-auto`候補（要 `repo: <Projects相対パス>` を Details に）/ 調査・文面・構成案 → `draft-only` / 軽作業 → `light-auto` / 現実の用事 → `reminder` / 外部送信・金銭・返品等 → `ask-first`
- 陸さんが承認 → `Status=Ready` ＋ 確定 `Autonomy` → executor(ccauto/autorun) が拾って自走。
- **硬ゲート据え置き**: migration の本番適用 / 外部送信 / 金銭 は自走せず人間へ。

## 停滞検知（nudge_loop が即催促する状態別しきい値）
- `Inbox`×`BriefStatus≠ready` > 半日 / `NeedInfo`(回答待ち) > 1日 / `Ready` 未着手 > 1日 / 粗いまま未分解 > 1日。
- ただ催促せず、**具体アクション付き**で投げる: ①分解案を出す ②埋まってない6要素を質問で埋めにいく ③このまま進めていいか確認。
- `LastNudge` で1日1回スロットル・静時間帯 22-8 JST 抑制。

## 報告の既定（`Reporting` 未指定時）
- executor は **着手時・中間チェックポイント(下書き完成/方針転換)・完了時・Blocked時** に Telegram 通知＋カードコメント。`Reporting` 指定があればそれに従う。

## やらないこと
- 確信のない6要素を埋めない（捏造より逆質問 or 空のまま enriching）。
- 私的領域(journaling/内省/感情・思考テーマの中身)は intake 対象外。
- 親カードを勝手に実行しない（子に割ってから）。
