---
date: 2026-06-05
category: situations
source: session
---

# money-bot 廃止・解体を決定

発信ピボットの自動化エンジンとして 2026-05-22 に設計した money-bot を廃止・解体することを決定。

## 理由
- 設計・型・DBスキーマは100%完成だが、SDK/API/route/テスト/deploy は実装0%（全 mock）。cron 稼働まで残工数 約10-15h + 外部API設定（Supabase/LINE/Instagram Graph/OpenAI）が必要。
- 設計後に apps/x-account-system が本番化し、X投稿/LINE承認の仕組みが重複。
- 投資対効果が見合わないとユーザー判断。

## 解体内容
- `money-bot/` ディレクトリを削除（tracked 12ファイル）。
- 共有 credential 金庫だった `money-bot/.env.local`（TWITTERAPI_IO_KEY / ANTHROPIC_API_KEY / LINE_* / SUPABASE_* 等を他システムが参照）を **repo-root `/Users/rikukudo/Projects/private-agents/all-good-ops/.env.local` へ集約**（gitignored・値はそのまま移動）。
- `.claude/scripts/twitterapi_io.py` の DEFAULT_ENV を新パスへ repoint（X データ収集 wrapper のライブ依存だったため）。
- design spec `docs/superpowers/specs/2026-05-22-money-bot-design.md` は status: abandoned で設計記録として保全。

## 同時実施
- 運用ハイジーンの安全網を cron 復活でなく hook 化で再建（`scripts/hooks/worktree-hygiene-scan.sh` / `stop-hygiene-reminder.sh`）。

## 残課題
- 発信ピボットの note有料記事 / Instagram / Adobe Stock 自動化は空白に。役割を別系統で持つか x-account 拡張で吸収するかは未決。
