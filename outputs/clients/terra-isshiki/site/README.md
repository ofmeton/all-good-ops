# TERRA HAYAMA — 葉山一棟貸しの宿 HP

葉山町一色の一棟貸し民泊「TERRA HAYAMA」のブランドサイト + Airbnb 誘導 HP。

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS v4** (`@theme` ベースの token 管理)
- **TypeScript 5**
- **next/font/google** — Noto Serif JP / Zen Old Mincho / EB Garamond
- **next/image** — WebP 自動変換 + lazy load

## Pages

| Path | 内容 |
|---|---|
| `/` | Hero スライドショー (Ken Burns × cross-fade) + Concept + Explore + Footer |
| `/about` | 物件コンセプト + 運営者 BEAT ICE 紹介 |
| `/rooms` | LDK / Bedroom / Bath & Laundry / Kitchen の写真ギャラリー |
| `/stay` | 葉山で過ごす 4 つの体験（写真 2 + テキスト 2） |
| `/access` | 立地・周辺 POI・地図・空室カレンダー・予約 CTA |

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Environment variables

`.env.local` を作成してください（`.env.example` 参照）。

| Key | Required | Description |
|---|---|---|
| `AIRBNB_ICAL_URL` | optional | Airbnb 公式 iCal URL。設定すると Access ページの空室カレンダーが本物の予約状況に同期します（1 時間キャッシュ）。未設定でもサイトは動作し、カレンダーは「Coming soon」表示になります。 |

## Deploy on Vercel

```bash
# 初回（プロジェクト作成）
npx vercel

# 以後の preview デプロイ
npx vercel

# production デプロイ
npx vercel --prod
```

`.env.local` の `AIRBNB_ICAL_URL` は Vercel ダッシュボードの「Environment Variables」にも同名で登録してください。

## Design Direction

`outputs/clients/terra-isshiki/04-design-direction-v0.1.md` 参照。

- カラー: 漆喰白 `#F5F1EA` / 墨黒 `#1A1410` / 朝霧 `#6B7484` / 棚田 `#8B5A3C` / 松緑 `#2F4538`
- タイポ: Noto Serif JP（display）/ Zen Old Mincho（body 和文）/ EB Garamond（英文）
- 演出: Ken Burns、cross-fade、fade-up + blur、縦書き要素、和紙 noise overlay、葉山風の山影 SVG

## Image assets

`/public/images/` 配下に配置済み（撮影 2026-04-22）。詳しくは `../03-photo-mapping-v0.2.md`。

## License

Private — TERRA HAYAMA / 株式会社 BEAT ICE
