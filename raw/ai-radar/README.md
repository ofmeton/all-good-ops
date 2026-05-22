# raw/ai-radar/

ai-radar の articles テーブル (`pipeline != 'noise'`) を別リポからエクスポートした生データ。

## 出力構造

```
raw/ai-radar/
├── README.md                                (本ファイル)
├── log/
│   └── YYYY-MM-DD.jsonl                     (当日 detected_at の全記事、1 行 1 件)
└── highlights/
    ├── claude-tip/
    │   └── YYYY-MM-DD-<slug>.md             (claude_tip_score >= 70)
    ├── content-seed/
    │   └── YYYY-MM-DD-<slug>.md             (content_seed_score >= 70)
    └── market-signal/
        └── YYYY-MM-DD-<slug>.md             (market_signal_strength >= 60)
```

- 1 記事が複数 category にまたがる場合（both 等）は **複数 highlights md が生成される**
- highlights md は **immutable**（既存ファイルは skip）。再生成したい時は削除してから export 実行

## エクスポート元

- ai-radar Supabase project: `jzlhzfdvaculblgwlkxz`
- テーブル: `articles`（`pipeline != 'noise'`、`detected_at >= now - 7d`）
- 出力スクリプト: `/Users/rikukudo/Projects/ai-radar/scripts/export-to-raw.mjs`

## 自動化

launchd plist: `~/Library/LaunchAgents/jp.ofmeton.ai-radar-export-to-raw.plist`
（元 plist: `/Users/rikukudo/Projects/ai-radar/launchd/jp.ofmeton.ai-radar-export-to-raw.plist`）

**実行スケジュール**: 毎日 21:00 JST（夜の cron が 20:00 に完了するため、その 1 時間後）

## 手動実行

```bash
cd /Users/rikukudo/Projects/ai-radar
node --env-file=.env.local scripts/export-to-raw.mjs
```

オプション環境変数:
- `RAW_EXPORT_DIR`: 出力先ディレクトリ
- `EXPORT_WINDOW_DAYS`: 何日前まで遡るか (default 7)

## jsonl の活用例

```bash
# 当日の Claude Tips 高スコア記事を抽出
jq 'select(.pipeline == "claude_tip" or .pipeline == "both") | select(.claude_tip_score >= 70) | {title_ja, claude_tip_score, url}' log/2026-05-22.jsonl

# 1 週間分の全タイトル
cat log/*.jsonl | jq -r '.title_ja' | sort -u

# market_signal のシグナル別件数
cat log/*.jsonl | jq -s 'group_by(.business_trigger_flag) | map({signal: .[0].business_trigger_flag, count: length})'
```

## CLAUDE.md との関係

- CLAUDE.md §人間確認ルール: raw/ 配下は immutable、削除・修正は人間承認必須
- 例外: 本 export 機構は raw/ai-radar/log/ への append + raw/ai-radar/highlights/ への新規追加のみ。既存ファイル上書き・削除はしない
- LLM が wiki 化する場合は `wiki/domain/claude-usage/` 等に新規生成（raw を直接編集しない）

## 関連

- ai-radar 計画書 v2.1: `outputs/documents/ai-radar/09-pivot-plan.md` §7 wiki 連携
- ai-radar ポインタ: `wiki/domain/ai-industry/ai-radar-pointer.md`
- Claude 活用 wiki: `wiki/domain/claude-usage/index.md`
