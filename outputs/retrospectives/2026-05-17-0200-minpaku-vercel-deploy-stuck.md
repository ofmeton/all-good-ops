# 振り返り: 民泊清掃 Plan 4 Phase B Vercel デプロイ詰まり

**日時:** 2026-05-17 02:00
**セッション:** 民泊清掃管理アプリ Plan 4（本番デプロイ・納品準備）の Vercel 初回デプロイ後の連鎖トラブル
**トリガー:** ユーザー「ちょっといい加減にしてほしい。cron が原因なんだったら local からデプロイ諦めて元のやり方に戻った方がいいんじゃない？反省してほしい」

---

## 対象セッションの要約

民泊清掃管理アプリの本番デプロイ。Plan 4 Phase B Task 7-10 を進行中、Vercel 初回デプロイ (`2b64817`) は成功したが、以降の git push に対して Vercel が deploy をトリガしない問題に遭遇。Reconnect → Deploy Hook → CLI deploy と迂回を試みた結果、CLI deploy で初めて Hobby plan の cron 制約違反エラーが顕在化。根本原因判明後も CLI deploy 路線を続け、`.env.local` 破壊・機密キー復旧不能・build エラー連鎖を引き起こした。

---

## 1. 良かった点

- `TZ` が Vercel 予約変数と判明した時、コード側を `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' })` で JST 固定化（テスト回帰なし、ヘルパー dateStr も整合化）まで一気通貫
- `vercel.json` cron 制約発覚直後に `unassigned-alerts` を `0 9 * * *` に下げて OPS_GUIDE に「Pro 移行で戻す」注記を残した
- Task 12 検収シナリオ 5,500字を deploy 待ち時間に並行完了
- 振り返り要求に対して `.claude/skills/session-retrospective.md` を先に Read してから標準テンプレに沿った

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | webhook 詰まりの切り分けで Reconnect → Deploy Hook → CLI と迂回し続けた | 「deploy 履歴に出てこない＝ webhook 問題」と早合点。実は build 失敗で履歴に出ていなかった可能性 | 最初に **Vercel Dashboard → Deployments の Failed フィルタ** か **Build Logs** を確認すれば cron エラーが見えたはず | webhook 切り分けの第一手は「Failed deploy が無いか」確認 |
| 2 | cron 問題発見後も CLI deploy 路線を継続 | 「ここまで CLI 進めたから完走したい」サンクコスト的判断 | 修正 commit `abebbd8` push 直後に「webhook が修正で発火するか」だけ確認すべきだった | 根本原因が変わったら、それ以前の調査路線を**白紙に戻す**判断を即座にする |
| 3 | `vercel link` で `.env.local` が development env（空）で上書き | env pull プロンプトに対する確認不足。development env を pull するとローカル env が空に潰される仕様を知らなかった | プロンプト「Would you like to pull environment variables?」に **no 推奨**と即時案内すべきだった | 既存 `.env.local` 保護のため、env pull は無条件で no、必要なら `--environment=production` で明示 |
| 4 | `vercel env pull --environment=production` 直後に機密キー4本が空で build 失敗 | Vercel sensitive env vars は CLI pull で値が空になる仕様を見落とし | pull 直後に `head .env.local` で空チェック案内すべきだった | env pull コマンドの後ろに sanity check を必ず併記 |
| 5 | Next.js 16 page data collection が API handler を invoke することを失念し、関数遅延化で解決と判断 | Next.js 13/14 時代の挙動を前提にしていた | コード修正案の前に、まず `.env.local` 復旧で build が通るか試すべき | 設計改修と env 復旧の2路線を並列ではなく、まず env 復旧で build を通す順序にすべき |
| 6 | push 時に Vercel が「commit email could not be matched to a GitHub account」で deploy blocked | `off.me.ton@gmail.com` が GitHub アカウント (`ofmeton`) の Verified Emails に登録されていなかった | 過去の `feedback_vercel_git_author_authorization` 既知罠の派生バリエーション。明示エラーパターンを既存 memory に追加していなかった | 初回 push 前に GitHub Settings → Emails で git config user.email が Verified になっているか確認 |

## 3. 自動化・効率化の余地

- **Vercel deploy 詰まり時の切り分けフローテンプレ:** ①Vercel Dashboard で Failed deploy 確認 → ②`vercel.json` 制約と plan 整合性確認 → ③webhook 切り分け → ④CLI（最終手段）
- **Vercel CLI 使用時の `.env.local` 保護:** `vercel link` の env pull プロンプトは no 固定、`vercel env pull` 後の sanity check を必ず併記
- **`vercel.json` cron 編集時の Hobby plan lint:** 全 cron schedule の頻度を見て「毎時/毎分」があれば即警告
- **git author email の事前検証:** push 前に `git config user.email` と GitHub Verified Emails の整合確認をルーチン化

## 4. 次回への改善提案

- Vercel deploy が始まらない時、**第一手は CLI でも Reconnect でもなく Failed deploy フィルタ・Build Logs 確認**
- `vercel.json` 編集時に **cron schedule の 1 日 1 回制限**を毎回チェックする（Hobby plan 前提）
- `vercel link` を案内するなら、続く env pull プロンプトに対して **「no が安全」を必ず明記**
- 根本原因が判明したら、それ以前の調査・対応路線は **明示的に白紙に戻す宣言**を入れる（サンクコスト判断を排除）
- 新規 Vercel project への初回 push 前に **`git config user.email` ↔ GitHub Verified Emails の整合確認**を必須手順化

## 5. 反映先（実施済み）

### SAFE（まとめ承認・反映完了）

| 種別 | パス | 状態 |
|---|---|---|
| memory | `feedback_vercel_deploy_stuck_diagnostic.md` | 新規作成 |
| memory | `feedback_vercel_hobby_cron_constraint.md` | 新規作成 |
| memory | `feedback_vercel_cli_env_pull_pitfall.md` | 新規作成 |
| memory | `feedback_root_cause_pivot_discipline.md` | 新規作成 |
| memory | `feedback_vercel_git_author_authorization.md` | email mismatch 明示エラーパターンを追記 |
| index | `MEMORY.md` | 新4件のリンク追加 |
| improvement-log | `data/improvement-log.jsonl` | 本振り返りエントリ追加 |
| retrospective | `outputs/retrospectives/2026-05-17-0200-minpaku-vercel-deploy-stuck.md` | 本ファイル |
