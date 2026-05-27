# Attribution (UTM tracker) — PR-E

ofmeton 3 媒体 (X / Instagram / note) 投稿の URL に UTM パラメータを付与して、着地後の流入元を追跡するモジュール。

## SSoT

- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` E-48 (cross-platform 推定)
- `outputs/improvements/x-account-design-consolidated/main-design-all-versions.md` §2.8 集客導線 3 パターン

## API

| 関数 | 役割 |
|---|---|
| `addUtm(url, params)` | URL に `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` を付与 |
| `parseUtmFromIncomingUrl(url)` | 着地 URL から UTM 4 種を取り出す (必須 3 種揃わなければ null) |
| `buildTrackedUrl(url, params)` | `TrackedUrl` 構造体で返す (addUtm の wrapper) |
| `logAttribution(event)` | Phase 0.5 では console.log。Phase 1+ で Supabase `attribution_events` に投入 |
| `inferSourceFromReferer(referer)` | referer から source を推測 (cross-platform 推定 E-48 のフォールバック) |

## Source / Medium 区分

| source | medium 候補 | 用途 |
|---|---|---|
| x | post / pinned | X 単発 / pinned tweet |
| instagram | carousel / reel / story / bio | IG カルーセル / リール / ストーリーズ / プロフ |
| note | post | note 記事内リンク |
| line | post | LINE 公式 |
| direct | post | 直接訪問 (UTM なし) |

## Phase 0.5 制約

- `IN_MEMORY_FALLBACK=true` または `SUPABASE_URL` 未設定 → `logAttribution` は console.log のみ
- Phase 1+ では Supabase `attribution_events` table に insert

## test

```
npm run attribution:test
```
