---
name: x-scheduled-publish
description: X発信システム(apps/x-account-system)の承認済みストック(xad.post_drafts: human_approval_status='approved' かつ scheduled_for IS NULL)を、ログイン済みChromeをchrome-devtools MCPで操作してX公式の予約投稿UIに登録する半自動投稿フロー。X API直投はしない(source=本人クライアント維持)。ユーザーが「翌日分を予約して」「approvedを予約投稿して」「ストックをXに予約登録して」等と自然文で依頼したとき起動する。
---

# x-scheduled-publish — 承認済みストックの半自動予約投稿

チャエン×Kくん理想設計の **投稿レイヤー(D)**。発信前工程(収集→生成→承認)は自動化済みで、
**最終投稿だけ人が握る**。承認済みストックを Claude が chrome-devtools でX公式の予約投稿UIへ
登録し、`source=本人クライアント` を保つ。**X API での直接投稿はしない**（誤報リスクに人の確認を挟む）。

## いつ起動するか
ユーザーが PC 起動時に「翌日分を予約して」「approved を X に予約登録して」等と依頼したとき。

## 前提（接続）
chrome-devtools MCP は automation 制御では X/Google のログイン認証を突破できない（`navigator.webdriver` 検知）。
→ **人間がログイン済みの個人Chrome に後からアタッチ**する方式を使う（memory `reference_chrome_devtools_mcp.md`）。

着手前チェック:
1. 個人Chrome(stable) が起動し、**x.com にログイン済み**であること
2. `chrome://inspect/#remote-debugging` で remote debugging server が有効化されていること
3. `~/.claude.json` の chrome-devtools args に `--auto-connect` があり、MCP が個人Chromeにアタッチ済み（無ければ Claude Code 再起動）
4. 作業後に remote debugging を**無効化**するよう最後に促す（cookie 露出を残さない）

接続不可なら、ユーザーに上記1-3を依頼して中断する（勝手に専用インスタンスで login しない）。

## 手順

### 1. ストック取得＋スロット自動提案（ワンコマンド・read-only）
承認済みストック取得とピーク帯スロット割当を **1 コマンド**で行う（DB へは書かない＝提案のみ）:

```bash
cd apps/x-account-system
npx tsx scripts/plan-scheduled-publish.ts            # 翌日分
npx tsx scripts/plan-scheduled-publish.ts --days 2   # 翌々日まで
```

- `human_approval_status='approved' AND scheduled_for IS NULL` を承認順(FIFO)で取得し、`lib/publishing/slot-planner.ts` が **翌日以降のピーク帯（平日5枠 [7,8,12,15,17] / 週末3枠 [8,12,17]、`lib/publishing/schedule-config.ts`）** へ割当。過去スロット skip・既予約と衝突回避・枠超過分は次回据置。
- **スレッド draft（`thread_bodies IS NOT NULL`・🧵）は予約対象外**: X 公式の予約投稿UIはスレッド（連続ツイート）を未サポートのため、`plan-scheduled-publish.ts` / worker plan-slots は `thread_bodies IS NULL` のみを引く（スレッドは候補に出ない）。**スレッドを公開したいときは `x-immediate-publish`（今すぐ投稿）スキルへ**回す（「ポストを追加」で連続ツイートを組んで一括即時投稿）。
- 出力: **人向け要約**（各 draft の JST 時刻＋本文プレビュー＋risk）/ `JSON_PLAN` / `RECORD_ARG`（後で record に渡す形）。
- スロット時間・枠数を変えたいときは `schedule-config.ts` を編集（散在禁止のレバー）。

### 2. 一括バッチ確認（人間ゲート）
出力の**人向け要約をそのまま人に提示**し、「翌日◯件、この内容・このスロットで予約します」で**一度 OK をもらう**（投稿は外部反映＝必ず人が見る）。誤報・規約リスクのある draft は外す。OK 後に登録へ進む。

### 3. chrome-devtools でX予約投稿を作成（プラン順に1件ずつ）

> **⚠️ X コンポーザーは Draft.js。操作順を間違えると詰む（2026-06-06 実機検証で確定）:**
> - **本文は `fill` ではなく `type_text`**。`fill` は DOM 値はセットされるが React の onChange が
>   発火せず「予約設定/ポストする」ボタンが**有効化されない**。実キーストロークの `type_text` を使う。
> - **予約を先に設定 → 戻ってから本文を入力**。「ポストを予約」で `/compose/post/schedule` に
>   遷移し戻ると**本文がクリアされる**ため。先に本文を入れると消える。
> - `type_text` は**空エディタに対して**使う。既存テキストがあると打鍵が混ざって文字化けする
>   （`Meta+A` 全選択も Draft.js では効きにくい）。やり直すときは「閉じる→破棄」して開き直す。

各 draft について（順序厳守）:
1. `mcp__chrome-devtools__new_page` で `https://x.com/compose/post` を開く（作業中タブを奪わない）。
   - SPA なので navigation timeout が出ても **タブは開いている**。`list_pages` → `take_snapshot` で続行。
2. `take_snapshot` で UI 取得。ログイン済みか（自分のプロフィール画像が出るか）を確認。
3. **先に** **button「ポストを予約」** を押す → 予約設定ダイアログで 月/日/時/分 の combobox を
   `fill` で設定（TZ は「日本標準時」）→ **button「確認する」** でコンポーザーに戻る。
   - **🪙 トークン注意**: 予約設定ダイアログの a11y snapshot は時/分/日の全 option を列挙し**巨大**（1回150行超）。
     各 `fill` で `includeSnapshot:true` を多用すると激しく嵩む。**最後の `fill`（分）でだけ snapshot を取り、
     確認テキスト「○年○月○日(曜)の午前/午後○:○○に送信されます」で時刻を検証**すれば十分。途中の fill は snapshot 不要。
4. 戻った**空の** textbox「ポスト本文」に **`type_text`** で本文を入力（プレーンテキスト、Markdown不可）。
   - **動画/GIF は本文に deep-link `{tweet_url}/video/1` が直書きされている**（承認UIで追記済）。
     そのまま投稿すれば X が本文中で動画を展開する。動画は upload 不要。
5. **写真添付（upload）がある draft のみ**: 投稿直前に写真を DL してネイティブ添付する。
   - DL: `cd apps/x-account-system && npx tsx scripts/fetch-draft-media.ts <draftId>`
     → stdout の JSON `{ localPaths[], uploaded, skipped, resolved[] }` を受ける。
     `post_drafts.attachments`（承認時に書かれた写真 upload intent）を pbs.twimg.com から
     原寸 DL し `os.tmpdir()/xad-media/<draftId>-<idx>.<ext>` に保存する。
   - 添付: **「画像や動画を追加」/「ファイル選択」** に `upload_file` で `localPaths` を**順次**添付。
   - **DL 失敗（`skipped`）は本文のみで投稿を継続**（サイレント失敗禁止）。CLI は `skipped>0` のとき
     **stderr に警告を出す**。`skipped>0` のときは**必ず人へ surface**し（何枚・理由）、`attachmentsResolved`
     に記録する。`uploaded`=0 でも本文（＋動画 deep-link）はそのまま投稿できる。
   - **著作権/規約ガード**: 他者メディア再アップは引用RT基本＋出典明記＋拡散歓迎系限定（compliance 確認）。
6. **button「予約設定」**（有効化されている）を押す → 予約確定。
7. **投稿確定後、一時ファイルを cleanup**: 出力された `localPaths` を削除（例: `rm -f <localPaths>`）。
   - cleanup は best-effort。**rm を忘れた/失敗しても、次回 `fetch-draft-media` 開始時に
     `xad-media/` の 24h 超ファイルを自動 sweep する**ので他者写真は無期限残留しない（安全網）。
8. 確認＆控え: `下書き` → タブ「予約済み」で予約が並ぶ。`scheduled_post_id` 相当を控える
   （削除は「編集」→ checkbox 選択 → 「削除」→「削除」確定）。写真添付があった draft は
   `uploaded`/`skipped` 件数も控え、Step 4 の record で `attachmentsResolved` に渡す。

> 実機検証済 (2026-06-06): 上記順序で 2026-06-07 07:00 JST の予約を作成→「予約済み」で確認→削除まで通った。
> X の web UI は変わりうるので `take_snapshot` で都度ラベルを確認し決め打ちしない。

### 4. DB 記録＋観測トレース（record-scheduled-publish.ts に集約）
予約確定できたものだけを、Step 1 の `RECORD_ARG` に各 `scheduledPostId` を足して**1 コマンド**で記録する。
この CLI が `post_drafts.scheduled_for/scheduled_post_id` の**冪等 UPDATE**（`where id=$ and scheduled_for is null` ガード）と、`xad.run`/`xad.run_trace` への観測記録（Worker 外工程なので queue が書けない分）を**まとめて**行う:

> ⚠️ **ダッシュボードで先に「予約確定」した draft は record CLI が noop になる**（2026-06-11）。
> dashboard schedule タブの確定は `/admin/mark-scheduled` で **`scheduled_for` を先にセット**する。
> 一方この record CLI の CAS は `scheduled_for is null` ガードなので、**既に scheduled_for があると claim できず
> `applied=0`・`scheduled_post_id` も記録されない**。dashboard 確定済みの draft を X へ登録した場合は、
> record CLI ではなく **`scheduled_post_id` を直接 UPDATE**（`update xad.post_drafts set scheduled_post_id=$ where id=$`）するか、
> scheduled_post_id 控えを諦め scheduled_for（既設）で運用する（削除は X「予約済み」UI から）。
> ＝ Step1 の plan→record 経路は「dashboard で予約していない（scheduled_for NULL）」素材が前提。

```bash
cd apps/x-account-system
npx tsx scripts/record-scheduled-publish.ts \
  '[{"draftId":"<id>","scheduledFor":"2026-06-08T07:00:00+09:00","scheduledPostId":"<x識別子>","attachmentsResolved":{"uploaded":2,"skipped":0}}]'
```

- 出力 `{ runId, count, applied, noop }`: `applied`=今回確定した予約数 / `noop`=既予約で更新されなかった数。
  **`noop>0` は二重実行/再記録の兆候**なので確認する（CLI が stderr に警告も出す）。冪等 UPDATE があるので
  同じ引数で再実行しても二重予約にはならない。
- **写真添付があった draft は `attachmentsResolved`（Step 3-5 の `uploaded`/`skipped`）を必ず付ける**
  （特に `skipped>0` のとき。観測に残し dashboard で「何枚 upload / 何枚 skipped」を追えるように）。
  写真添付が無い draft は省略可。

`core_ideas.status` は `approved` のまま（公開時に別途 `published` へ）。これで dashboard の
`scheduled-publish` ノード「実行」タブに「どの draft を / いつの予約に / どの識別子で 登録したか」が出て、
**収集→投稿予約までフロー全体の実行中身が追える**ようになる。

### 5. 出典の自己リプライ（任意）
出典 URL を持つ投稿は、予約投稿への**自己リプライ**としてスレッド予約 or メモ化し、
公開後に出典を担保する（チャエンの疑似スレッド化）。

## 人間確認ルール（必須）
- 予約投稿は**外部反映**。Step 1 のプラン要約（内容＋スロット）を**登録前に人へ提示**し、
  Step 2 で**一括バッチ確認**（「翌日◯件これで予約します」で一度 OK）を取る
- 誤報・規約リスクのある内容は登録せず差し戻す（チェックAg の flag も参考にする）

## 完了報告
- 予約できた件数 / スロット、`scheduled_for` を要約
- remote debugging の**無効化**を促す
- 予約失敗（UI変更・添付失敗等）は draft id とともに報告し、再試行手順を示す

## リスク・検証
- **automation 検知**: アタッチ方式でもXが in-session 操作を制限する場合がある → 失敗時は人手登録にフォールバック
- **UI変更**: X compose/schedule UI 変更で手順が崩れる → snapshot ベースで都度確認
- **二重予約**: UPDATE は `and scheduled_for is null` ガードで冪等。識別子で重複チェック
- 投稿本体は **X API を使わない**（`apps/x-account-system/lib/publisher/publishToX` は封印済み）

## 関連
- 設計: `~/.claude/plans/k-x-drifting-lark.md`（理想設計 / Phase D）
- 承認→ストック化: `apps/x-account-system/src/jobs/line-event.ts` `handleApprove`
- 工程定義: registry `scheduled-publish` stage
- chrome-devtools 接続: memory `reference_chrome_devtools_mcp.md`
