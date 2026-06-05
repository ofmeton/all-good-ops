# x-buzz-radar

海外 X バズツイート収集 + 媒体別発信ネタ化システム

詳細: `../docs/superpowers/specs/2026-05-23-x-buzz-radar-design.md`
実装計画: `../docs/superpowers/plans/2026-05-23-x-buzz-radar.md`

## Architecture

- **取得**: twitterapi.io advanced search (主) / X API v2 公式 search/recent (fallback)
- **判定**: Claude Haiku 4.5 で relevance + 型抽出
- **生成**: Claude Sonnet 4.6 で媒体別ドラフト 1 本生成 (variant 期待値推定)
- **self-watch**: X API v2 owned reads + Instagram Graph API + note Playwright scraping
- **自己改善**: Track A (検索→採用) + Track B (生成→反応) の閉ループ

## Setup

```bash
cp .env.example .env.local
# .env.local の各キーを埋める (Supabase / twitterapi.io / X API / IG / LINE / Anthropic)
npm install
```

Supabase migration apply は MCP 経由 (人間承認必須):
```
mcp__plugin_supabase_supabase__apply_migration
```

開発:
```bash
npm run dev    # http://localhost:3000
npm run test
```

## Cron schedule

| path | schedule | 用途 |
|---|---|---|
| `/api/cron/fetch` | `0 */6 * * *` | 6h ごと検索取得 |
| `/api/cron/self-watch` | `0 1 * * *` | 毎日 1:00 JST self-watch |
| `/api/cron/weekly-improve` | `0 1 * * 0` | 毎週日曜 1:00 Track A/B 改善 |

## Cost target

ai-radar 全体で 1 万円以内 / 月 (x-buzz-radar 単独で 約 $40 / 月 ≈ 6,000 円)
