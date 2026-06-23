# hermes 通知リデザイン — Telegram縮小＋Notion双方向 設計仕様

作成: 2026-06-24 / 状態: 実装仕様（Codex 実装の SSOT）

## 背景・目的

hermes は今、4系統（nudge 毎時 / autorun 15分・完成毎 / ccauto 15分・PR/merge毎 / intake 逆質問毎）から
Telegram にメッセージを投げており「物量が多すぎ」。一方、**同じ内容はすでに Notion コメントに書かれている**
（全スクリプトに `POST comments` 実装済み）。

ユーザー要望（2026-06-24 承認済み）:
1. **やり取りの本体を Notion に移す**（Notion 上で読み、**Notion コメントで返信**する）。
2. **Telegram は「重要な即時アラート＋更新ダイジェスト」だけ**にする（重要だけ即時＋他はダイジェスト）。
3. 設計を固めてから実装。

致命的な現状: hermes は **Notion コメントを読んでいない**（`GET /v1/comments` 実装ゼロ）。
回答処理は OSS gateway（Telegram返信）にしか無い。→ **Notion双方向は完全新規実装**。

## 全体方針（2フェーズ）

- **Phase 1（通知2層化）**: Telegram 送信を「即時(terse+link)」と「ダイジェスト」に分類。Notion権限変更不要。体感がすぐ変わる。
- **Phase 2（Notion双方向）**: `comment_ingest.py` 新規。Notionコメントの本人返信を検知→intake/breakdown へ橋渡し。

---

## 共通: Notion ページURLの取得

Notion の `databases/{id}/query` が返す各ページ（card）には `card["url"]` がある。
即時通知・ダイジェスト行に `card.get("url", "")` を末尾リンクとして付ける。
ヘルパ（各ファイルの telegram() の近くに追加 or 既存に inline）:

```python
def card_url(card) -> str:
    return card.get("url", "")
```

---

## Phase 1: 通知2層化

### 分類ルール（SSOT）

| イベント | 現状送信箇所 | 新分類 | 備考 |
|---|---|---|---|
| 着手通知 `🤖 着手` | autorun L175 / ccauto L428 | **drop（log のみ）** | 価値低・ノイズ源。Telegram送信を削除し log() に置換 |
| 下書き完成→Review | autorun L180 | **digest** | Telegram送信を削除。Notionコメント＋Status=Review は残す |
| PR上げた→確認 | ccauto L365 | **digest** | Telegram削除。Notionコメント＋Status=Review残す |
| 完了→main反映 | ccauto L345 | **digest** | Telegram削除。Notionコメント＋Status=Done残す |
| 分解適用通知 | breakdown_apply L195付近 | **digest** | Telegram削除。Notionコメント残す |
| 逆質問（回答待ち） | intake L413-423 | **即時 terse+link** | `❓回答待ち: {title}\nNotionで答えて → {url}` |
| 詰まった→Blocked | autorun L186 | **即時 terse+link** | `🚧詰まった: {title} — {reason短}\n→ {url}` |
| merge/PR作成失敗 | ccauto L349/355/361 | **即時 terse+link** | `⚠️ merge/PR失敗・要対応: {title}\n→ {url}` |
| 止まった→Blocked | ccauto L372 | **即時 terse+link** | `🚧止まった: {title} — {reason短}\n→ {url}` |
| 硬ゲート停止 | ccauto L417 | **即時 terse+link** | `⚠️硬ゲート停止: {title} — {reason}\n→ {url}` |
| リポ不明 | ccauto L424 | **即時 terse+link** | `❓リポ不明: {title} — 'repo: <name>' を教えて\n→ {url}` |
| cc-auto 中断 | ccauto L449 | **即時 terse+link** | `🚧中断: {title} — {reason短}\n→ {url}` |
| 連続失敗で一時停止 | ccauto L494 | **即時（システム警告）** | 現状維持（リンク不要のシステムアラート） |

**即時 terse の原則**: 1〜2行＋Notionリンク。詳細本文（成果物全文・summary 600字等）は Telegram に**出さない**
（Notionコメントにある）。現状 `telegram(env, f"...\n\n{out[:600]}")` の本文添付は削除。

**digest 化の実装**: 「digest」に分類したイベントは **executor 側で Telegram を送らない**。
Notion の Status 更新＋コメントだけ行い、nudge_loop が後でまとめて拾う（下記）。

### nudge_loop をダイジェストエンジン化

`data/hermes/nudge_loop.py` の変更:

1. **送信時間を 3x/day に**: 現状 `if not force and (h < 8 or h >= 22): skip`（毎時送信）を
   `DIGEST_HOURS = {9, 13, 19}` を定義し `if not force and h not in DIGEST_HOURS: skip` に変更。
   VM cron は毎時のまま（in-code gating で 3回に絞る）。metrics は毎時書き続けてよい（`write_metrics` は gating 前）。

2. **行に Notion リンク付与**: `_line(title, action, p)` を `_line(title, action, card)` に拡張し、
   末尾に ` → {card['url']}` を付ける（または別関数で card を渡す）。`classify_cards` / `stale_keys_for_card` は
   props だけでなく card も受けるよう微修正。リンクで Telegram が長くなりすぎる場合は短縮不要（3800字上限内）。

3. **「更新（完了・進捗）」セクションを追加**: 現状 `classify_cards` 前に `Status in (Done, Review, InProgress)` を
   continue で除外している（L267）。これは「要対応」用。別途、**直近で完了/Reviewになったカードを報告**する。
   - 状態ファイル `~/.hermes/nudge_digest_state.json`: `{"last_digest_ts": "<ISO8601 JST>"}`。
   - 完了報告対象 = `Status in {Review, Done}` かつ `last_edited_time > last_digest_ts`。
   - メッセージ例: セクション見出し `🔔 更新（確認はNotion）` の下に
     `・{title} — {Done→main反映 / Review→下書き確認 など Status由来の一言} → {url}`。
   - digest を**実際に送信した時のみ** `last_digest_ts` を now(JST) に更新。送信しなければ据え置き（取りこぼし防止）。

4. **メッセージ構成**: 先頭を `📋 あとでやる｜更新と気になってるやつ` に。
   - `🔔 更新（確認はNotion）` セクション（完了/進捗）
   - 既存の要対応バケット（🧩intake未完 / ❓回答待ち / ✅承認待ち / 🪓分解承認待ち / ▶️着手待ち / 🚧詰まってる / 📅まもなく予定 / ⏰リマインド / 🗂未整理）
   - どちらも空なら送らず log。

### Phase 1 で触るファイル

- `data/hermes/autorun_executor.py`: 着手 Telegram削除、完成 Telegram削除（digest化）、Blocked を terse+link 化、本文添付削除。
- `data/hermes/ccauto_executor.py`: 着手削除、完了/PR を digest 化（Telegram削除）、各 Blocked/失敗/硬ゲート/リポ不明/中断を terse+link 化、本文添付削除。連続失敗停止は維持。
- `data/hermes/breakdown_apply.py`: 分解適用の Telegram を削除（Notionコメント残す）。
- `data/hermes/nudge_loop.py`: 3x/day gating、Notionリンク、完了報告セクション、state ファイル。

---

## Phase 2: Notion双方向（comment_ingest.py 新規）

### 目的
ユーザーが **Notion のコメント欄に書いた返信**を hermes が読み取り、対話を前進させる。

### 前提（人間 or デプロイ時の一度きり準備）
1. Notion インテグレーションに **「Read comments（コメント読み取り）」権限**を付与（現在 insert only）。無いと `GET comments` が 403。
2. **hermes bot のユーザーID**を取得し `~/.hermes/.env` に `HERMES_BOT_USER_ID=<uuid>` を追加。
   取得: `GET /v1/users/me`（NOTION_TOKEN で）→ レスポンスの `id`（bot user の id）。これで「本人コメント」と「hermes自身のコメント」を区別。

### 新規ファイル `data/hermes/comment_ingest.py`（Mac launchd 15分）
既存スクリプトのパターン（load_env / notion() / telegram() / kill-switch / flock / state / JST / log）を踏襲。

- キルスイッチ: `~/.hermes/comment_ingest_enabled == "1"`（fail-closed）。
- ロック: `~/.hermes/comment_ingest.lock`。
- 状態: `~/.hermes/comment_state.json` = `{page_id: last_seen_comment_created_time_iso}`。

**処理フロー**:
1. 対象カードを query:
   - (a) `Status == NeedInfo`（回答待ち）
   - (b) `BreakdownProposal` 非空 かつ `ApproveBreakdown == false`（分解承認待ち）
   （filter は or。`enriching` の NeedInfo も (a) に含まれる）
2. 各カードについて `GET /v1/comments?block_id={page_id}&page_size=100`（ページネーション）でコメント取得。
3. **本人コメントの抽出**: `comment["created_by"]["id"] != HERMES_BOT_USER_ID` かつ
   `comment["created_time"] > comment_state[page_id]`（未処理）。リッチテキストを plain 連結。
4. 新規の本人コメントがあれば **Haiku で意図分類**（`OPENROUTER_API_KEY`・intake と同じ `anthropic/claude-haiku-4.5`）:
   JSON `{"intent":"answer|approve_breakdown|reject|unclear","note":"短い要約"}`。
   - intent 判定材料: カードの種別((a)/(b))、直近の hermes コメント（質問 or 分解提案）、本人コメント本文。
   - キーワードフォールバック（Haiku失敗時）: 承認語（OK/おk/承認/いいよ/お願い/yes/番号のみ）→ approve_breakdown（(b)のとき）、それ以外 → answer。
5. **反映**:
   - `answer`（(a)）: 本人コメント本文を `ConversationLog`（rich_text）に追記（既存値＋改行＋`[YYYY-MM-DD HH:MM 本人] {本文}`、1900字 trim）。
     `Status=Inbox` ・ `BriefStatus=draft` に戻す → 次の intake サイクルが**回答込み**で再エンリッチ。
     hermes 確認コメント `↩️ 回答を受け取りました。intake が反映します。` を追加。
   - `approve_breakdown`（(b)）: `ApproveBreakdown=true` をセット → breakdown_apply が子展開。確認コメント `✅ 承認を受け取りました。分解します。`。
   - `reject`: `BreakdownProposal` をクリア＋`ApproveBreakdown=false` 維持（分解見送り）、または NeedInfo のまま。確認コメント。
   - `unclear`: hermes 確認コメント `🤔 すみません、OK か回答か判別できませんでした。もう一度教えてください。`。即時 Telegram は出さない（次の digest で拾われる）。
6. `comment_state[page_id]` を**処理した最新コメントの created_time** に更新（保存）。

**重要な冪等性**: comment_state により同じコメントを二度処理しない。intake への橋渡し（Inbox/draft 戻し）は
intake 側の既存ロジック（BriefStatus で再質問防止）に委ねる。

### intake_enrich.py の小改修（ConversationLog をプロンプトへ）
- `process_card` で `conversation = rich_text_of(props, "ConversationLog")` を取得。
- `build_prompt(title, details, profile, conversation=...)` に追加し、プロンプトの「# Notionカード」直後に
  `## ユーザーからの追記/回答（最優先で反映）\n{conversation}` を差し込む。空なら省略。
- これにより comment_ingest が ConversationLog に積んだ本人回答が再エンリッチで消費される。

### Telegram 返信のフォールバック
OSS gateway 経由の Telegram 返信パスは**そのまま残す**（変更しない）。Notion コメント経路は additive。

---

## デプロイ（Claude が自走 / Codex 対象外）

1. Phase 2 前提: `GET /v1/users/me` で bot user id 取得→`~/.hermes/.env` に `HERMES_BOT_USER_ID`。Notion「Read comments」権限はユーザーが Notion 設定で付与。
2. 変更 `.py` を Mac `~/.hermes/` と VM(`35.222.76.101`, user `off_me_ton_gmail_com`, key `~/.ssh/hermes_oracle`)の `~/.hermes/` へ scp。
3. launchd `com.hermes.comment-ingest.plist` 追加（15分・`comment_ingest_enabled` で fail-closed）。雛形は既存 `com.hermes.intake.plist` を流用。
4. nudge は cron 毎時のまま（in-code 3x/day gating）。VM crontab 変更不要。
5. 検証: 各スクリプト `--dry-run`、comment_ingest はテストカードに本人コメント→検知→反映を確認。Phase 1 は autorun/ccauto/nudge の dry-run でメッセージ整形を目視。

## テスト
- `data/hermes/tests/` に既存 pytest あり。Phase 1 の整形関数（terse 文面・digest 構成）・Phase 2 の意図分類フォールバック/コメント抽出（bot除外・created_time フィルタ）に**純粋関数の単体テスト**を追加。Notion/Telegram/LLM はモック or 純粋関数分離。
- `python3 -m pytest data/hermes/tests/ -q` が緑。

## 非ゴール / 据え置き
- OSS gateway（Telegram受信→Notion）の改変はしない。
- Notion DB スキーマへの新規プロパティ追加はしない（ConversationLog は既存）。`NotifyPending` 等は導入せず last_edited_time + state で代替。
- 硬ゲート（migration/送信/金銭）の自走範囲は不変。
