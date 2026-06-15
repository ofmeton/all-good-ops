# 「あとでやる」自走パートナー設計（hermes × Notion × Claude Code）

- 作成日: 2026-06-16
- ステータス: 設計確定（実装計画前）
- 目的: 散在する「あとでやる」を後回しにせず、AI が捕捉・逆質問・自走で一緒に進めるパートナーと場をつくる

## 1. 背景・課題

「あとでやる」系タスクが iPhone メモ・Telegram・カレンダー等に散らばり、全部後回しになっている。欲しいのは:

1. 散らばったタスクを 1 か所に集め、AI も人間も見れる「場」
2. AI がタスク詳細を**自発的に逆質問**して埋めてくれる
3. 情報が揃ったら**進められるところまで勝手に進めて**くれる
4. 後回しを防ぐ**催促**

既存資産（all-good-ops の secretary 群 / Codex / リポ文脈 / 各種 MCP）を活かしつつ、常駐・モバイル・自走の足りない部分を hermes-agent で補う。

## 2. 役割分担（採用案 = 完全自動ブリッジ）

| 層 | 担当 | 役割 |
|---|---|---|
| 捕捉層 | **hermes-agent**（Mac・起動時のみ常駐・GLM/Kimi 安モデル） | Telegram / Apple Notes / カレンダーから捕捉し、逆質問でタスクを成形して Notion に書く。催促もする |
| 場 | **Notion タスク DB** | 単一ソース。人間はカンバンビュー、AI は Notion MCP で読み書き |
| 実行層 | **headless claude**（Mac・launchd 起動） | Notion キューを 30 分ごとに poll し、secretary + Codex + リポ文脈で自走実行。硬ゲートで停止 |

**設計判断の核**: hermes はリポ/Codex/エージェント群の文脈を持たない。よって「捕捉・トリアージ・催促・軽作業」は hermes、「深い実行」は既存 Claude Code 体制に寄せ、Notion を介して受け渡す。

## 3. アーキテクチャ図

```
捕捉層（hermes / Mac・起動時のみ常駐・GLM/Kimi 安モデル）
  Telegram(主・捕捉＋通知 双方向) / Apple Notes(Mac 直近 N 日更新) / Google Calendar(要準備を hermes 判別)
        │ Notion MCP で書込
        ▼
場: Notion タスク DB（単一ソース・カンバン）
        │ launchd 1 本・30 分 poll・最大 2〜3 並列(worktree 隔離)
        ▼
実行層（headless claude / Mac・secretary＋Codex＋リポ文脈）
  硬ゲート(merge/送信/金銭/migration) ＋ 低リスクは自動 merge
        │ 結果を Notion に書戻し
        ▼
Telegram へ通知（着手前＋完了後）
```

## 4. データモデル（Notion タスク DB）

### プロパティ

| プロパティ | 型 | 説明 |
|---|---|---|
| Title | title | タスク名 |
| Source | select | `Telegram` / `AppleNotes` / `Calendar` / `manual` |
| Status | select | 状態（下記ステートマシン） |
| Autonomy | select | 自律度ラベル（下記） |
| Priority | select | `High` / `Mid` / `Low` |
| Project | relation or select | all-good-ops の既存案件/プロジェクトへの紐づけ |
| Details | rich text | 逆質問で埋まる本文・前提・参照 |
| NextAction | rich text | 次の一手 |
| Due | date | 期日 |
| Owner | select | `AI` / `human` |
| Links | url/rich text | PR URL・成果物パス |
| LastNudge | date | 最終催促日（催促頻度制御用） |
| RawSourceId | rich text | 取り込み元の一意 ID（Apple Notes note id 等・dedup 用） |

### Status ステートマシン

```
Inbox → NeedInfo → Ready → InProgress → Blocked → Review → Done
```

- **Inbox**: 捕捉直後の生カード
- **NeedInfo**: 逆質問中（情報待ち）
- **Ready**: 着手可能（Details 充足・Autonomy 確定）
- **InProgress**: 実行層が処理中
- **Blocked**: 硬ゲート到達 or 詰まり（人間待ち）
- **Review**: 成果物（PR・下書き）が人間レビュー待ち
- **Done**: 完了

### Autonomy ラベル（自律度）

| ラベル | 意味 | 実行者 |
|---|---|---|
| `light-auto` | 軽作業を hermes 自身が即実行 | hermes |
| `cc-auto` | Claude Code が硬ゲート手前まで自走 | 実行層 |
| `draft-only` | 調査・下書きまで仕上げて承認待ち | 実行層 |
| `ask-first` | 着手前に人間確認 | — |
| `reminder` | 実行せず催促のみ（生活・雑用・手続き系） | hermes（催促ループ） |

ラベルは **hermes が提案 → 人間が Telegram で確認**して確定する。

## 5. 4 つのループ

### A. 捕捉（hermes・イベント＋ポーリング）
- **Telegram**: メッセージを即受信。hermes が「タスク / 雑談 / メモ」を判別し、タスク候補は確認のうえ Inbox カード化
- **Apple Notes**: Mac の `NoteStore.sqlite`（iCloud 同期済み）を読む。**直近 N 日（既定 30 日）に更新されたメモのみ**対象。`note id + 更新時刻` で dedup、`RawSourceId` に記録して処理済みを判定
- **Google Calendar**（MCP）: hermes が「要準備な予定」（会議・納品・面談等）を判別し、準備タスクを自動生成
- いずれも生テキスト＋ Source を付けて Inbox に積む

### B. トリアージ／逆質問（hermes・即リアルタイム・安モデル）
- Inbox カードを走査し、着手に足りない情報があれば **Telegram で具体的に逆質問**
- 回答で Details を充填、**Autonomy ラベルを提案 → 人間が確認**
- 揃えば `Ready`、待ちは `NeedInfo`
- **プライバシー**: 全候補をいったん提示し、private/感情的（ジャーナル等）なものは**確認時に人間が弾く**。弾いたものはタスク化も raw 保存もしない（journaling は `~/journal`（git 外）原則を維持）

### C. 自走実行（launchd → headless claude＝深い実行）
- launchd が **30 分ごと**に起動し、`Status=Ready` かつ `Autonomy ∈ {cc-auto, draft-only}` のカードを poll
- **最大 2〜3 並列**、各タスクは `wt-new` で worktree 隔離（1 タスク 1 ブランチ）
- `Status` を `InProgress` に更新して着手を Telegram 通知
- **cc-auto**: secretary + Codex + リポ文脈で実装 → PR/硬ゲート手前まで
  - 低リスク（test 追加・docs・設定系）は**自動 merge**
  - それ以外は `Review` にして **Telegram で承認依頼**（`PR できたよ:リンク / merge していい？` → ボタン/返信で OK → 自動 merge）
- **draft-only**: 調査・下書きを仕上げて `Review`
- **硬ゲート**（merge・送信・金銭・migration）到達は必ず停止 → `Blocked` ＋ Telegram 通知
- 完了/詰まりを Notion に書き戻し、`Review`/`Blocked`/`Done` を Telegram 通知

### D. 催促（hermes・日次）
- `reminder` カードと停滞カード（`Ready`/`Blocked`/`NeedInfo` で `LastNudge` から一定経過）を Telegram でまとめて催促
- **静時間帯 22:00–8:00 は通知抑制**、夜に発生したものは朝にまとめて届ける（journaling routine 22:00 とぶつからない）

## 6. ガードレール

- **モデル/コスト**: hermes 常駐ループは GLM/Kimi 等の安モデル固定。**月 1,500 円上限**、日次トークン天井を設け、usage-analyst で追跡。超過時はキルスイッチで停止
- **キルスイッチ**: Telegram コマンド `/pause` `/resume`。裏で env フラグファイル（`collector_enabled` 式）を書き換え、launchd ランナーが起動時に参照して可逆停止
- **硬ゲート維持**: merge・送信・金銭・migration は人間確認必須（CLAUDE.md 準拠）
- **allowlist**: 自動実行対象は `{cc-auto, draft-only} × Ready` のみ。他は必ず待つ
- **透明性**: 自動実行は着手前・完了後を Telegram 通知
- **ブランチ規律**: 1 タスク 1 ブランチ・worktree 隔離・push 前 verify を維持
- **launchd の扱い**: 自動化は全停止中（`project_cron_automation_disabled`）。本件は**スコープ限定の例外として専用 launchd 1 本だけ再開**する

## 7. 常駐の現実

- hermes は Mac 起動時のみ稼働。ラップトップが寝たら処理は止まり、起きたら再開する運用で許容
- launchd 実行ランナーも同様（Mac 起動時のみ）。静時間帯 22:00–8:00 とも整合

## 8. 構築フェーズ

| Phase | 内容 | 完了条件 |
|---|---|---|
| 0 | Notion DB（プロパティ＋ Status × Autonomy）＋カンバンビュー作成 | 手動でカードを作り、カンバンで運用できる |
| 1 | hermes を Mac に隔離インストール → Telegram ＋ Notion MCP 配線 → 捕捉＋トリアージ＋逆質問ループ | Telegram で投げたメモが逆質問を経て Notion の Ready に乗る |
| 2 | Apple Notes ローカル読み skill（直近 N 日・dedup）＋カレンダー準備タスク生成 | メモ・予定が自動で Inbox に乗る |
| 3 | launchd 自走実行ランナー（30 分 poll・2〜3 並列 worktree・硬ゲート・低リスク自動 merge・Telegram 承認/通知）＋キルスイッチ＋コスト上限 | Ready の cc-auto/draft-only が自走し、Review/Blocked/Done が通知される |
| 4 | 催促ループ＋ Priority/Project 紐づけ運用チューニング | 停滞カードが朝に催促され、優先度順に並ぶ |

## 9. スコープ外（YAGNI）

- メール捕捉（Phase 後回し。まず Telegram/メモ/カレンダーで運用を固める）
- LINE 連携（個人チャットは公式 API で読めず、push 無料枠も薄いため不採用）
- 完全ハンズオフの硬ゲート自動化（merge/送信/金銭/migration は人間のまま）
- hermes をクラウド/VPS に常駐させる構成（起動時のみ運用で足りる）

## 10. 主要リスクと対処

| リスク | 対処 |
|---|---|
| 常駐＋自走でトークン課金が膨らむ | 安モデル固定・月 1,500 円上限・日次天井・キルスイッチ |
| Apple Notes 全読みのノイズ・プライバシー流出 | 直近 N 日更新のみ・dedup・確認時に private 弾き・raw 非保存 |
| 自動 merge による事故 | 低リスク種別に限定・硬ゲート維持・着手前後通知で可視化 |
| hermes の成熟度（ネイティブ Windows/Termux 等は荒削り） | Mac 運用に限定・隔離インストール |
| launchd 再開がなし崩しに自動化全体へ波及 | スコープ限定の 1 本のみ・env フラグで可逆停止・記録を残す |
