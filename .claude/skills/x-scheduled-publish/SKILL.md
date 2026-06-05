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

### 1. 承認済みストックを取得
Supabase `xad` schema から予約待ち（承認済み・未予約）を承認順で引く。Supabase MCP `execute_sql`
（**1文ずつ** / memory `feedback_mcp_execute_sql_single_stmt`）または prod-lib 診断で:

```sql
select id, core_idea_id, body, fmat, primary_hook, scheduled_date, slot, human_approved_at
from xad.post_drafts
where human_approval_status = 'approved'
  and scheduled_for is null
  and published_at is null
order by human_approved_at asc;
```

メディア素材がある場合は `editor_output` や関連の素材テーブルから `media[].local_path` / `source_url` を併せて取得する。

### 2. 翌日スロットへ割当（チャエン実測リズム）
- **5〜7投稿/日**を上限、平日厚め・土日薄め
- 時間帯ピーク: **朝6-8時 / 昼12時 / 夕15-17時** を主軸に分散
- 承認順（`human_approved_at`）に上から割当。割当案を**人に提示して確認**してから登録に進む

### 3. chrome-devtools でX予約投稿を作成（1件ずつ）
各 draft について:
1. `mcp__chrome-devtools__new_page` で `https://x.com/compose/post` を開く（作業中タブを奪わない）。
   - SPA なので navigation timeout が出ても **タブは開いている**。`list_pages` → `take_snapshot` で続行。
2. `take_snapshot` で compose UI の要素を取得。ログイン済みか（自分のプロフィール画像が出るか）を確認。
3. 本文を **textbox「ポスト本文」** に入力（`fill` / `type_text`）。`body` はプレーンテキスト（Markdown不可）。
4. メディアがあれば **「画像や動画を追加」/「ファイル選択」** に `upload_file` で `local_path` を添付。
   **著作権/規約ガード**: 他者メディア再アップは引用RT基本＋出典明記＋拡散歓迎系限定（compliance 確認）。
5. **button「ポストを予約」** を押し、割当した予約日時(JST)を設定 → 予約確定。
6. 確定後、画面から予約の識別子/URL を控える（`scheduled_post_id` 相当）。

> 実機疎通済 (2026-06-05): ログイン済み個人Chrome では a11y ツリーをフル取得でき、
> 「ポスト本文」textbox・「ポストを予約」button・「ファイル選択」が到達可能と確認。
> ただし X の web UI 構造は変わりうるので、`take_snapshot` で都度ラベルを確認し決め打ちしない。

### 4. DBへ予約状態を記録
予約確定できたものだけ、**1件ずつ** UPDATE（冪等）:

```sql
update xad.post_drafts
set scheduled_for = '<予約日時 JST→timestamptz>',
    scheduled_post_id = '<Xの予約識別子>'
where id = '<draftId>' and scheduled_for is null;
```

`core_ideas.status` は `approved` のまま（公開時に別途 `published` へ）。

### 5. 観測トレースを記録（フロー全体を一望可能にする）
予約確定した分を **観測ダッシュボードに残す**。Worker 外の工程なので queue は trace を
書けない → この CLI で `xad.run` / `xad.run_trace` に 1 run + 予約件数分の trace を記録する。

```bash
cd apps/x-account-system
npx tsx scripts/record-scheduled-publish.ts \
  '[{"draftId":"<id>","scheduledFor":"2026-06-07T07:00:00+09:00","scheduledPostId":"<x識別子>"}]'
```

これで dashboard の `scheduled-publish` ノード「実行」タブに「どの draft を / いつの予約に /
どの識別子で 登録したか」が出て、**収集→投稿予約までフロー全体の実行中身が追える**ようになる。

### 6. 出典の自己リプライ（任意）
出典 URL を持つ投稿は、予約投稿への**自己リプライ**としてスレッド予約 or メモ化し、
公開後に出典を担保する（チャエンの疑似スレッド化）。

## 人間確認ルール（必須）
- 予約投稿は**外部反映**。スロット割当案・各予約の本文は**登録前に人へ提示して確認**する
- 一括で良い場合も「これで翌日◯件予約します」と要約提示してから実行
- 誤報・規約リスクのある内容は登録せず差し戻す

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
