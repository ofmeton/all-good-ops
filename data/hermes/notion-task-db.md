# Notion「あとでやるタスク」DB 控え（hermes 自走パートナー）

> 単一ソースの場。秘密情報（トークン）はここに書かない。設計=`docs/superpowers/specs/2026-06-16-hermes-todo-partner-design.md` / 計画=`docs/superpowers/plans/2026-06-16-hermes-todo-partner-phase0-1.md`

## 識別子

- Database URL: https://app.notion.com/p/2159405e11a84e7f90a8b6252bb43d38
- Database ID: `2159405e11a84e7f90a8b6252bb43d38`
- Data Source ID（collection）: `782773d8-4cc4-445e-978d-42e48d892717`
- カンバンビュー: 「カンバン」（Board・Group by `Status`・Sort `Priority` ASC）

## プロパティ（spec §4 準拠）

| プロパティ | 型 | 選択肢 / 備考 |
|---|---|---|
| Title | title | タスク名 |
| Source | select | Telegram / AppleNotes / Calendar / manual |
| Status | select | Inbox → NeedInfo → Ready → InProgress → Blocked → Review → Done |
| Autonomy | select | light-auto / cc-auto / draft-only / ask-first / reminder（hermes 提案→人間確認） |
| Priority | select | High / Mid / Low |
| Project | select | all-good-ops（運用で追加） |
| Details | text | 逆質問で充填 |
| NextAction | text | 次の一手 |
| Due | date | 期日 |
| Owner | select | AI / human |
| Links | url | PR・成果物 |
| LastNudge | date | 最終催促日 |
| RawSourceId | text | 取り込み元の一意 ID（dedup 用） |
| ThreadKey | text | Telegram 会話 ↔ カード対応キー |
| ConversationLog | text | Telegram 会話の転記先（コメント不可時のフォールバック） |

## 運用メモ

- 会話の経緯は原則 Notion コメントスレッドに集約（`notion-create-comment`）。`ConversationLog` は補助。
- DB は工藤陸の claude.ai Notion 接続で作成済み。**hermes 側から読むには Task 1 の内部インテグレーション `hermes-todo-partner` に本 DB を Connections 追加で共有が必要**。
- サンプルカード（RawSourceId=`sample-0001`）は動作確認用。検収後に削除可。

## hermes 稼働設定の要点（`~/.hermes/config.yaml`・2026-06-17 検証済み）

捕捉が動くまでに踏んだハマりどころと、効いた設定：

1. **database_id ≠ data_source_id**（最大の罠）: Notion MCP `mcp_notion_API_post_page` の `parent` には **database_id=`2159405e11a84e7f90a8b6252bb43d38`** を渡す。data_source_id(`782773d8…`)を渡すと `404 object_not_found`。
2. **Status は select 型**: `{"Status":{"select":{"name":"Inbox"}}}`。`{"status":{...}}` は不可（プロパティ名が Status でも型は select）。
3. **ツール激減で notion を露出**: `tools.exclude` で notion ツールを 22→6 に絞り（残す: post_search/query_data_source/post_page/patch_page/create_a_comment/retrieve_a_data_source）、`agent.disabled_toolsets` で browser/terminal/code_execution/computer_use/image_gen/moa/delegation/cronjob/context_engine/todo を無効化。これで `tool_search` 閾値を下回り、agent が notion を直接呼べる（絞らないと tool_search の裏に隠れて curl を書く）。
4. **enforcement = `agent.environment_hint`**（YAML リテラルブロック `|`）に、post_page の**正確な引数 JSON**（database_id＋完全プロパティ形式）を明示。これが無いと Haiku は会話に流れてカードを作らない。headless `-z` には hint が載らない/ MCP が不安定 → **検証は必ず Telegram(gateway)経路で**。
5. **古いセッションに旧 hint が焼き付く**: 設定変更後は Telegram で **`/new`** を送って新セッションにしないと反映されない（`hermes sessions delete` ＋ gateway 再起動でも在席セッションは復活する）。
6. モデル = `anthropic/claude-haiku-4.5`（OpenRouter・要残高チャージ。無料枠は実質不可）。常駐ループ用。
7. キル/再起動: `hermes gateway restart` / 停止は launchd。バックアップは `config.yaml.bak*`。

8. **auxiliary は openrouter/haiku に固定**（既定の `provider: auto` は Nous 未ログインで死ぬ→compression/要約/curator/title が `no provider` 警告）。`auxiliary.*` 全サブタスクを provider=openrouter / model=anthropic/claude-haiku-4.5 / base_url=https://openrouter.ai/api/v1 に。
9. **full flow の enforcement も environment_hint**: カード作成後に逆質問→`patch_page`でDetails/Due/NextAction→Autonomy提案→Ready化→`create_a_comment`で会話集約、まで hint に明記すると Haiku が一連を自走する（2026-06-17 実証）。

## クラウド常駐化（GCP・2026-06-19 稼働）

PC を閉じても 24/7 で捕捉するため、hermes を Mac から **GCP 無料 VM へ移設**。Telegram 捕捉はクラウド常駐、Apple Notes 捕捉のみ将来 Mac 側（Mac 依存のため）。

- **ホスト**: GCP Compute Engine **e2-micro（Always Free・x86_64・Ubuntu 24.04・RAM 955MB）**。無料条件＝リージョン us-west1/us-central1/us-east1＋標準ディスク30GB。料金見積もりは Always Free 割引を反映せず$6表示でも実請求$0。
- **接続**: Mac→VM は SSH 鍵（`~/.ssh/hermes_oracle`）。IP `35.222.76.101`、user `off_me_ton_gmail_com`（OS Login）。
- **常駐**: `hermes gateway install`（systemd user service）＋`loginctl enable-linger`＝ログオフ/再起動でも自動復帰。
- **移設手順**: Mac の `~/.hermes/{config.yaml,.env,skills}` を scp（.env は WhatsApp 無効化・Mac browser パス除外）。状態(state.db)は持ち込まず VM 新規（新セッションで hint 即適用）。cutover は **Mac `hermes gateway stop`→VM `hermes gateway start`**（bot は同時1ヶ所のみ poll 可）。

**クラウド移設のハマりどころ**:
10. **GCP OS Login**: 既定で OS Login 強制。metadata SSH 鍵は無視される→`gcloud compute os-login ssh-keys add` で鍵登録し、username は `gcloud compute os-login describe-profile` で取得（`off_me_ton_gmail_com`）。`enable-oslogin=FALSE` を入れると逆に詰まる（OS Login 鍵が無効化される）→ON のままにする。
11. **小RAM対策**: 2GB swap 必須（`fallocate`）。hermes 初回起動は plugin 読込で重い。WhatsApp 無効化（RAM 節約）。installer のブラウザ Node 依存(npm)は不要・停止可。
12. **python-telegram-bot 別途導入**: install では入らない→`~/.hermes/bin/uv pip install --python <venv> python-telegram-bot`。
13. **IPv6 罠（致命）**: GCP VM は IPv6 egress 無し。api.telegram.org が AAAA 解決され Telegram 接続が **30秒タイムアウト**。`/etc/gai.conf` に `precedence ::ffff:0:0/96 100`＋`sysctl net.ipv6.conf.all.disable_ipv6=1`（/etc/sysctl.d 永続化）で IPv4 強制→接続成功。
14. **wrapper**: installer 未完時は `~/.local/bin/hermes` が無い→venv 実体 `~/.hermes/hermes-agent/venv/bin/hermes` を指す3行 wrapper を手動作成。
- 将来 Oracle へ再移設する場合も同手順（`~/.hermes` を rsync＋install＋IPv4 強制＋gateway install）。ARM でも installer 自動対応。

## ステータス

- [x] Phase 0 / Task 2: DB＋カンバン＋サンプルカード作成（2026-06-16・Claude の Notion MCP で実施）
- [x] Phase 0 / Task 1: hermes 内部インテグレーション作成＋本 DB を共有（2026-06-17）
- [x] **Phase 1 完了**（2026-06-17）: Telegram メモ→カード作成→逆質問→Details/Due/NextAction 充填→Autonomy 提案・確定→Ready 化→**§5-E 会話のカードコメント集約**まで full flow を実証（実例「つかさママに返信」でコメント2件＋Ready＋reminder 確認）
- [x] **クラウド常駐化完了**（2026-06-19）: GCP e2-micro へ移設・systemd常駐・Telegram→Notion を VM から実証（カード「充電コード返品交換」）。Mac 閉じても 24/7 稼働。
- [x] **Phase 2a 完了**（2026-06-19）: Apple Notes 捕捉 poller（`data/hermes/applenotes_capture.py`）。osascript で直近N日更新メモ取得→note_id+更新時刻で dedup→Haiku で task/private 分類→タスクのみ Notion Inbox 作成（Source=AppleNotes・private/非taskはskip・本文非保存）。launchd `com.hermes.applenotes`（30分・--days 2）。**launchd でも TCC(Notes自動化) 通った**。実証=「複数プロジェクトのタスク一覧確認・実行」。
- [x] **Phase 3 保守版 完了**（2026-06-19）: 自走実行ランナー（`data/hermes/autorun_executor.py`）。Notion Ready×**draft-only** を拾い headless `claude -p`（Claude サブスク内・Web可・scratch dir・秘密env非渡し）で成果テキスト生成→Notion コメント＋Status=Review＋Telegram 通知。**編集/コミット/merge/送信/金銭は一切しない**。キルスイッチ=`~/.hermes/autorun_enabled`（"0"で停止）。launchd `com.hermes.autorun`（30分・--max 2）。**claude は launchd でも認証OK**。実証=サンプル draft 生成→Review。
- [ ] Phase 3 拡張（escalation・要人間判断）: cc-auto のコード実行（worktree隔離＋Codex＋硬ゲート＋低リスク自動merge）。挙動を見て信頼できたら draft-only から段階的に拡大。
- [ ] Phase 2b: Google カレンダー捕捉（要準備を判別→準備タスク生成）。Google Calendar API OAuth 整備が要るため後回し。
- [ ] Phase 4: 催促ループ（reminder/停滞カードを朝に Telegram・静時間帯22-8）＋Priority/Project 運用
- [ ] Oracle Always Free 解決後に GCP→Oracle 再移設（任意・`~/.hermes` rsync で簡単）

> Mac 側 launchd（scoped 例外）: `com.hermes.applenotes`(捕捉) / `com.hermes.autorun`(自走実行)。Mac 起動時のみ稼働。VM 側は Telegram 捕捉のみ常時。
