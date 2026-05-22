---
type: source
created: 2026-05-09
updated: 2026-05-10
sources: [raw/deals/2026-04-terra-isshiki/01-confirmation-items.md, raw/deals/2026-04-terra-isshiki/02-confirmation-items-v0.2.md, raw/deals/2026-04-terra-isshiki/03-photo-mapping-v0.2.md, raw/deals/2026-04-terra-isshiki/04-design-direction-v0.1.md]
related: [[terra-hayama]]
tags: [deal, hayama, personal, hp-production]
status: active
---

# 案件: TERRA HAYAMA HP 制作（2026-04 開始）

クライアント: [[terra-hayama]]
案件 ID: `2026-04-terra-isshiki`
位置づけ: BSA 枠外の個人案件（実績公開あり）

## タイムライン

| 日付 | 事象 |
|---|---|
| 2026-05-01 | 案件キックオフ、初期ブレスト |
| 2026-05-01 | v0.1 確認事項ドキュメント作成（依頼者へ送付） |
| 2026-05-07 | v0.2 確認事項ドキュメント（依頼者回答を反映） |
| 2026-05-09 | photo-mapping v0.2 / design-direction v0.1 作成 |
| 2026-06 (予定) | OPEN |

## 確定要件（v0.2 時点）

### サイト構成（マルチページ構成、原﹅居参考）

| ページ | 主なコンテンツ |
|---|---|
| Home | ファーストビュー（写真 + キャッチコピー + Airbnb CTA） |
| About | コンセプト文章 + 運営者紹介（BEAT ICE / 小休思さん） |
| Rooms | 部屋の紹介・間取り・写真ギャラリー |
| Stay | 葉山で体験して欲しいこと 4 つ（棚田と葉山アイス / 富士山夕陽 / 海山の幸 / 抹茶マシーン） |
| Access | 地図（一色海岸まで徒歩 8 分等） |
| Reservation | 空室カレンダー + Airbnb リンク |

### 機能要件

- 多言語: 日本語 + 英語（機械翻訳・EN 切替ボタン）
- 空室カレンダー: iCal 連携（予約導線は Airbnb へ）
- HP 上に決済機能なし
- CMS 不要（基本更新なし）
- GA / SEO / 保守: いずれも不要（依頼者意向）

### 技術スタック

- Next.js + TypeScript + Tailwind + Vercel（静的）
- 作業ディレクトリ: `outputs/clients/terra-isshiki/site/`

## 追加確認・未論点

### A. 追加素材リクエスト（v0.2 時点）

| # | 素材 | 必須度 |
|---|---|---|
| A-1 | ロゴデータ | 必須 |
| A-2 | 間取り図 | 推奨 |
| A-3 | 動画素材 | あれば |
| A-4 | 地図イラスト | あれば |
| A-5 | 追加写真（棚田・海岸・運営者顔写真等） | 推奨 |

### B. 設計の細部確認

- B-6. ページ構造の実装方式（完全マルチページ vs シングルページ + アンカー）

## 進行ルール（ユーザー指示 2026-05-01）

- ユーザーは依頼者の代理として仮意思決定を実行中
- 設計フェーズの節目で「依頼者確認用ドキュメント」を更新し、依頼者投げ前提でまとめる
- 「勝手に決められない」領域は都度ユーザーに知らせる（C セクション拡充）

## 制約

- Airbnb 規約: 外部 → Airbnb への誘導 OK / Airbnb → 外部直予約への誘導は規約違反になりがち
- 民泊新法の法定表示義務（Airbnb 経由運営のため不要との確定だが要再確認）

## raw source

- `raw/deals/2026-04-terra-isshiki/01-confirmation-items.md` (v0.1, 2026-05-01)
- `raw/deals/2026-04-terra-isshiki/02-confirmation-items-v0.2.md` (v0.2, 2026-05-07)
- `raw/deals/2026-04-terra-isshiki/03-photo-mapping-v0.2.md`
- `raw/deals/2026-04-terra-isshiki/04-design-direction-v0.1.md`
