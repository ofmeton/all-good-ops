# Plan: X発信 キュレ/承認/投稿 7機能追加 (2026-06-11)

設計: architect(Fable 5)。実装: system-engineer 並列チーム。worktree `task/260611-xad-curation-approval`。
SSOT規約: `wiki/dev/standards.md`。三層原則(agent=判断 / code=道具+配管 / 人間=最終ゲート)を全要件で不変。

## 確定した仕様判断(人間CP済)

1. **スレッド**: 即時投稿のみ・予約は非対応(X予約UIがスレッド未サポート)。schedule経路は`thread_bodies IS NOT NULL`を除外し画面に notice。
2. **修正依頼の再生成**: 確定と同時に即時 enqueueCompose(select経路と同UX)。
3. **破棄**: 論理破棄 `human_approval_status='discarded'`(復元可)。**元素材(core_ideas)は再利用可 = `status='draft'` に戻し再キュレ/再執筆の対象として残す**(archiveしない)。
4. **手動「投稿済み」**: draft.published_at と同時に `core_ideas.status='published'` も連動。
5. (確定済小項目) 旧draftの終端status = 新設 `'revision_requested'`(rejectと学習上区別) / スレッド最大8本・1ツイート全角140字目安(超過はwarnのみ・人間ゲート委譲) / DDL前は実スキーマ Inspect 必須。

## 要件(原文)
1. キュレで複数選択→「執筆へ送る」時、各素材におすすめ format/template が自動デフォルト選択
2. 承認済みを手動で「投稿済み」にする
3. 承認済みを棄却/破棄するボタン
4. 承認UIで指示文つき修正依頼
5. 修正依頼で format/template も選び直せる(推薦も使える・キュレUI使い回し)。未指定なら現状維持
6. 「今すぐ投稿」タブの本文を全文表示
7. スレッドの自動投稿対応

## 現状把握(file:line)
- `xad.post_drafts`: `body text`(単一)・`fmat` CHECKに`'thread'`既存・`human_approval_status` CHECK`('pending','approved','rejected','auto_approved')`(0002:87-89)・`scheduled_for`(0014)・`attachments`(0019)・`approval_reason`(0023)。**`published_at`の定義migrationは要Inspect**。
- RPC `xad.set_approval_status`(0023:83-126), `set_selection_status`(0017・全件同一fmat/template), `markPublished`(dashboard `lib/publish-queries.ts:121-132`・approved&published_at IS NULL冪等)。
- check差し戻し(`lib/check/run-check.ts:459-468`): 素材meta `composed_at=null/compose_attempts++/last_check_flags` で再queue → 要件4の人間版テンプレ。
- 推薦: `lib/curation/recommend.ts`(validateRecommendations=境界検証手本)・worker `POST /admin/recommend`(`src/worker.ts:229-316`)・dashboard `api/curation/recommend`・UI `CurationClient.tsx:121-172`(手動・`modeOf`で最頻1組に潰す `curation-formats.ts:122-139`)・消費 `run-compose.ts:127-143`(素材ごとmeta読みは**既対応**)。
- 要件6: `PublishNowClient.tsx:9-12 preview()`が60字切り。
- 要件7前提: draftは単一ツイート前提。`SUBMIT_DRAFT_TOOL.body`単一string(`compose-prompts.ts:24-45`)。スレッド表現なし。

---

## Phase 0: 共有基盤(先行・1名・他Phaseのブロッカー)

### DB migrations(SQLのみ。**apply は Phase 2 人間ゲート**。各ファイル冒頭に実スキーマInspect手順をコメント)
- **0025_selection_per_material.sql**: `xad.set_selection_status_items(p_items jsonb, p_status text) returns integer`。`p_items=[{id,desired_fmat,template_id}]`を`jsonb_array_elements`展開し素材ごとmeta `jsonb_set`。fmat検証は0017と同一whitelist。既存4引数版は残置(後方互換)。
- **0026_draft_lifecycle.sql**:
  - `human_approval_status` CHECK拡張 `+ 'discarded','revision_requested'`(⚠️制約名はInspectで確認しDROP/ADD)。
  - `xad.discard_approved_drafts(p_ids uuid[], p_reason text default null) returns integer`: CAS `status='approved' AND published_at IS NULL AND scheduled_for IS NULL` → `'discarded'` + approval_reason coalesce + **`core_ideas.status='draft'`(再利用可・決定3)**。
  - `xad.request_draft_revision(p_draft_id uuid, p_instruction text, p_desired_fmat text default null, p_template_id text default null) returns integer`: CAS pending&未公開&未予約 → `'revision_requested'` + approval_reason `'[修正依頼] '||p_instruction`。core_ideas.source_material_ids素材meta一括: `composed_at=null/compose_claimed_at=null/compose_attempts++/human_revision_note=instruction/previous_draft_body=draft.body/selection_status='queued'`、desired_fmat・template_idは非NULL時のみ上書き。
- **0027_thread_support.sql**: `add column if not exists thread_bodies jsonb`(null=単一・後方互換)。`approval_drafts` view再作成(0023全列+`thread_bodies`)。**契約: thread_bodies が投稿時の正、body は `"\n\n---\n\n"` join 派生。insert時に必ず両方書く**。

### 共有コンポーネント/ヘルパー(dashboard)
- `app/components/FmatTemplatePicker.tsx`(新規): fmat select+template select 制御コンポーネント。Curationダイアログのselectをここへ抽出。props `allowUnset`(要件5「未指定=現状維持」option)。
- `app/components/useRecommendations.ts`(新規hook): `CurationClient.tsx:121-172`のrecommend fetch(timeout25s・fail-open・recError)を抽出。入力`{id,text,lang,hasMedia,engagement}[]`→`Recommendation[]`。
- `lib/thread-logic.ts`(新規・純関数+vitest): `THREAD_DELIM="\n\n---\n\n"`/`joinThread`/`splitThread`/`validateThreadParts`(空part禁止・最大8本・1ツイート長warn)。
- `lib/drafts-logic.ts`(拡張): `ApprovalStatus`に`'discarded'|'revision_requested'`、`canDiscard()`、`validateInstruction()`(1〜2000字)、`ApprovalDraft.thread_bodies: string[]|null`。

### x-account-system側
- `lib/curation/thread.ts`(新規): dashboard `lib/thread-logic.ts`と**同一契約**ヘルパー+同一テスト(apps間import不可。相互にdrift検知コメント)。

**Phase 0 完了条件**: 両app vitest緑 + dashboard `next build`緑(既存挙動不変)。

---

## Phase 1: 4並列ワークストリーム(ファイル排他)

### W1 キュレーション(要件1)
担当: `app/curation/CurationClient.tsx`, `app/api/curation/select/route.ts`, `lib/curation-queries.ts`, `lib/curation-formats.ts`(必要分), 各test。
- `openCompose()`でダイアログを開いた直後に`useRecommendations`を**自動発火(1回batch)**。同一idセット再発火ガード+手動再実行ボタン残置。
- ダイアログを「バッチ一律1組」→「素材ごとの行×(FmatTemplatePicker)」へ。各行初期値=その素材の推薦(無ければDEFAULT)。一括変更行は上部に残す。
- select API: body に`assignments?:{id,desiredFmat?,templateId?}[]`追加。あれば新RPC `setSelectionStatusItems`(0025)、なければ既存4引数(後方互換)。
- 境界検証は`toRecommendations`(`curation-formats.ts:91-119`)流用。on-demand課金維持・fail-open。

### W2 承認・修正依頼(要件4+5)
担当: `app/approval/{ApprovalClient,DraftCard,RevisionDialog(新規)}.tsx`, `app/api/drafts/revise/route.ts`(新規), `lib/drafts-queries.ts`, `app/api/drafts/update/route.ts`(thread保存)。
- DraftCardに「修正依頼」ボタン → `RevisionDialog`: 指示文textarea(必須)+`FmatTemplatePicker`(allowUnset・既定「現状維持」)+ `useRecommendations`推薦ボタン。推薦入力=draftの`sources[]`(`drafts-logic.ts:14-23`)を`/api/curation/recommend`へ(API変更不要)。
- `api/drafts/revise`: `{id,instruction,desiredFmat?,templateId?}`→`requestRevision()`→RPC `request_draft_revision`→成功時**即`enqueueCompose()`**(`curation-queries.ts:160-169`再利用・決定2)。enqueue失敗はwarning surface(遷移成立済)。
- thread保存(要件7 UI連動): thread draftは本文textareaに`---`区切り全文表示・編集。保存時`splitThread`で再分割し`body`と`thread_bodies`両更新。区切り検証エラーは保存ブロック。ヘッダ「🧵 スレッドN本」バッジ。

### W3 投稿画面(要件2+3+6 + 要件7 UI/handoff)
担当: `app/publish/PublishNowClient.tsx`, `app/api/publish/now/route.ts`(変更最小), `app/api/drafts/discard/route.ts`(新規), `lib/publish-queries.ts`, 各test。
- 要件2: 各ストック行に handoffを経由しない「投稿済みにする」ボタン。`window.confirm`→`confirmPublished(id)`。markPublishedを拡張し**`core_ideas.status='published'`連動(決定4)**。scheduled_forは触らない。
- 要件3: 各行に「破棄」ボタン(rose系・確認dialog+理由任意)→`api/drafts/discard`{ids,reason?}→`discardApprovedDrafts()`(publish-queries側)→RPC。
- 要件6: `preview()`60字切り→3行line-clamp+クリックで全文展開(`whitespace-pre-wrap`)。`expanded:Set<string>`。thread draftは番号付き全文。
- 要件7 handoff: `PublishStock`/`HandoffPayload`に`tweets:string[]|null`追加。`buildHandoffPayload`がthread_bodies搭載。HandoffPanelはツイートごと個別コピー+chrome手順をスレッド版分岐。

### W4 composeバックエンド+スキル(要件7本体 + 要件4配管)
担当: x-account-system `lib/curation/{compose-prompts,run-compose}.ts`, `scripts/publish-now.ts`, slot-planner系のthread除外, `.claude/skills/x-{immediate,scheduled}-publish/SKILL.md`。
- `SUBMIT_DRAFT_TOOL`に`tweets:string[]`(optional)。「fmat=threadのときtweetsに1ツイートずつ(1本目=フック・各140字目安・最大8本)」をdescription+`buildComposeUserBlocks`のthreadブロックに記載。`:124`「分割しない」はarticle限定に修正。
- run-compose: fmat=thread&tweets有効(境界検証:非空配列/各要素非空/本数上限)→`thread_bodies=tweets,body=joinThread(tweets)`でinsert。不正/欠落→**安全側: 単一投稿としてfmat='long'降格+warn**(`perMaterial.threadFallback=true`)。
- 要件4消費: `run-compose.ts:134-144`で`meta.human_revision_note`/`meta.previous_draft_body`を読み userMessageに追加ブロック(前回ドラフト+指示)。**解釈はwriter agentの判断**(code配管のみ)。再生成後は通常check→人間承認へ(人間ゲート不変)。
- 予約除外: `schedule-queries.listApprovedStock`/worker plan-slotsから`thread_bodies IS NOT NULL`除外。schedule画面に「スレッドは今すぐ投稿のみ」notice(決定1)。
- スキル(doc・人間確認の上): x-immediate-publishにスレッド手順(1本目type_text→「ポストを追加」(+)→空エディタに次→「すべてポストする」。Draft.js注意は既存同様)。x-scheduled-publishに「thread draftは予約対象外→即時へ」。

**依存**: 全W→Phase 0。W2⇄W4非交差(W2=UI/RPC, W4=compose消費)。W3 thread UIはPhase 0型のみ依存(W4未マージでもthread_bodies=nullで動作)。
**マージ順序**: Phase0 → W1/W2/W3任意順 → W4(run-compose専有・conflict安全のため最後にrebase推奨)。
**各W完了条件**: dashboard=vitest+`next build`緑 / x-account-system=vitest+typecheck緑。

---

## Phase 2: 統合・検証(人間CP)
- 人間ゲート: migration 0025-0027を本番xadへapply(DDL pre-inspect結果添付)。
- worker deploy(⚠️ `npm ci`→`wrangler whoami`→deploy。memory既知pitfall)。
- dashboard deploy。
- 本番E2E 1周: 素材選択→推薦自動表示→送信→(compose)→修正依頼→再生成→承認→全文表示→投稿済み確定→破棄、thread 1本を即時投稿手順まで(実投稿は人間OK後)。
- **デプロイ順序**: migration apply → worker deploy → dashboard deploy(view列を読む側が先行するとundefined参照)。

## エラーハンドリング方針
- 推薦系=全てfail-open(既存方針)。状態遷移RPC=fail-loud + CAS冪等(二重押下no-op)。enqueue失敗=warning surface。
- テスト: 純ロジック(thread-logic/drafts-logic/buildHandoffPayload tweets/toRecommendations経路)=vitest。RPCはSQLレビュー+apply後E2E。UIは受け入れシナリオ実走。
