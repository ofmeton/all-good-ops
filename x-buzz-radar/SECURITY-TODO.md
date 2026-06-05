# x-buzz-radar セキュリティ既知課題（再開・デプロイ前に必須対応）

> このプロジェクトは 2026-05-23 時点の WIP を 2026-06-05 に all-good-ops へ取り込んだもの。
> **現在未デプロイ**のため即時の実害はないが、**再開・デプロイする前に下記を必ず修正すること**。
> （2026-06-05 自動セキュリティレビューで検出）

## HIGH-1: API ルートが全て無認証

対象: `src/app/api/generate/route.ts` / `post-record/route.ts` / `adopt/route.ts` / `manual-engagement/route.ts`

`requireAdmin()`（service role）で DB に書くのに、リクエスト元の認証チェックが無い。誰でも叩ける。

**修正方針**: 各ハンドラ先頭で共有シークレットを検証（cron ルートと同方式）:
```ts
if (req.headers.get('authorization') !== `Bearer ${process.env.APP_SECRET}`)
  return new NextResponse('Unauthorized', { status: 401 });
```
または Supabase セッション（`createServerClient` → `getUser()`）でゲートする。

## HIGH-2: post-record の SSRF（post_url 未検証）

対象: `src/app/api/post-record/route.ts`

`body.post_url` を検証せず DB 保存・Playwright に渡している。内部リソースへのリクエスト誘導（SSRF）リスク。

**修正方針**: 保存・利用前に検証する:
- `new URL()` でパース、`https:` スキームを必須化
- DNS 解決して loopback / RFC1918 / `169.254.0.0/16` を拒否
- ホスト名を許可リスト（例: `note.com`）で制限

## 対応状況
- [ ] HIGH-1 認証ゲート追加
- [ ] HIGH-2 post_url 検証追加
