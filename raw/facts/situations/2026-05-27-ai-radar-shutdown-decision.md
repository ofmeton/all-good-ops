---
date: 2026-05-27
category: situations
source: session
---

# ai-radar 停止 & 撤廃決定

ユーザー判断で ai-radar プロジェクトを完全停止 & 撤廃する方針が確定。理由は明示されていないが、Supabase Free tier 枠 (2 project 上限) を空けたいという付随ニーズあり。

対象範囲（要決定）:
- all-good-ops 内の ai-radar 参照（agent / CLAUDE.md / wiki / outputs / raw / data / scripts）の削除
- 外部リポ `/Users/rikukudo/Projects/ai-radar/` 本体の停止 (削除 or アーカイブは別途判断)
- Supabase project (ai-radar) → 削除 or pause（アーカイブ）の選択
- Vercel team project (ai-radar) の取扱
- ~/Library/LaunchAgents の ai-radar 関連 job 停止（あれば）

ユーザー指示: worktree を切って作業する（`task/260527-ai-radar-shutdown`、worktree path `/Users/rikukudo/Projects/all-good-ops-ai-radar-shutdown`）。
