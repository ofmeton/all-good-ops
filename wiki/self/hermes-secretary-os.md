---
type: topic
created: 2026-06-26
updated: 2026-06-26
sources: []
related: [[self/goals]], [[self/streams]], [[dev/agent-teams-playbook]], [[dev/standards]]
tags: [hermes, secretary, automation, ops, ai-agent]
status: active
---

# Hermes Secretary OS

Hermesを、個人の外部秘書・司令塔・研究/開発PM・ナレッジ管理・自動化・コミュニケーション補佐として運用するためのSSOT。

## 役割分担

| 領域 | 主担当 | 役割 |
|---|---|---|
| 日常窓口 | Hermes | Telegram/通知/リマインド/予定/メール/短期タスクを受ける |
| 重い開発・設計 | Claude Code | 複雑な実装、設計、レビュー、調査を担当 |
| 実装加速 | Codex | Claude判断で実装・テスト・修正を委任される |
| 軽量/安価タスク | OpenRouter | 要約、分類、軽量調査、補助推論 |
| 長期記憶 | Obsidian wiki | 方針・事実・学び・運用SSOTを蓄積 |

「Claudeに任せる」は、ClaudeがCodexへどれだけ委任するかも含めて判断する、という意味で扱う。

## 現在の接続状態

| 連携 | 状態 | 用途 |
|---|---|---|
| Telegram | 稼働中 | 主通知、DM対話、cron配送 |
| Apple Reminders | 稼働中 | 短期リマインダー、今日/期限切れ確認 |
| Google Calendar | 稼働中 | 予定確認、日次ブリーフィング |
| Gmail | 稼働中 | メール検索/確認。送信は本人以外宛なら確認対象 |
| Google Drive/Contacts | 稼働中 | ファイル/連絡先検索 |
| Google Docs/Sheets | 認可済み | 必要時に実ファイルで追加検証 |
| Chrome DevTools MCP | 稼働中 | Google Cloud Console等のログイン済みChrome操作 |
| Obsidian vault | 稼働中 | `wiki/` をvault rootとして利用 |
| 日次朝ブリーフィングcron | 稼働中 | 毎朝08:00 JSTにTelegram DMへ予定/メール/リマインダー/wiki焦点を配送 |
| 夜ジャーナリングcron | 稼働中 | 毎日22:30 JSTにTelegram DMへ進捗/未処理/翌日焦点を配送 |
| repo/Claude作業監視cron | 稼働中 | 11/16/21時 JSTにrepo dirty状態・最近の成果物・agent processを確認 |
| Asana REST API | 稼働中 | PAT方式。読み取り検証済み。公式Asana MCP OAuthはHermes側でinvalid client_idとなるためdisabled |

## 通知・確認境界

確認不要:
- 本人のTelegram DMへの通知/返信/cron配送
- macOS通知
- 自分用リマインダー作成
- ローカル編集、調査、テスト、低/中リスク自動化

確認必要:
- 本人以外へのメッセージ送信
- メール送信
- SNS投稿
- 課金・支払い・金銭操作
- 本番DB migration
- ファイル削除、`raw/` 上書き/削除

## 日次運用の目標形

1. 朝: Calendar/Gmail/Reminders/wiki hot cacheから日次ブリーフィングをTelegramへ送る（cron稼働中）。
2. 日中: Telegramからタスク・思考・調査依頼を受け、必要に応じてClaude/軽量モデルへ委任する。
3. 夕方/夜: 未処理タスク、返信待ち、重要メール、翌日の予定、repo状態を要約する（夜ジャーナリングcron稼働中）。
4. 随時: 価値ある判断・運用変更・再利用可能な知見はwiki/skill/memoryへ適切に保存する。

## 現在のcronレーン

| レーン | schedule | script | delivery |
|---|---|---|---|
| 朝ブリーフィング | `0 8 * * *` | `daily-briefing-collect.py` | Telegram DM |
| 夜ジャーナリング | `30 22 * * *` | `night-journal-collect.py` | Telegram DM |
| repo/Claude作業監視 | `0 11,16,21 * * *` | `repo-monitor-collect.py` | Telegram DM |

## 次の整備バックログ

- Obsidian query/filing-back運用をTelegramから呼びやすくする。
- Asanaへの書き込み運用（タスク作成・更新）は、人間確認つきで別途設計する。
- X/Twitterは初期設定対象外。再開する場合は読む/下書き/分析から別途設計する。

## 運用メモ

- Obsidian `raw/` はimmutable。素材取り込みはSCHEMAに従う。
- wiki変更は `SCHEMA.md` / `hot.md` / `index.md` を起点にする。
- 認証秘密・認可情報などの機密値はwikiに書かない。
- 進捗ログでは「設定済み/未設定/検証済み」を分ける。
