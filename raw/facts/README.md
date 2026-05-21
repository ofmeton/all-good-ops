# raw/facts/

ユーザーがセッション中に発話した「事実情報」を機械的に積み上げる場所。
**Claude が発話を検知 → ここに保存 → 1 行通知** を全セッション共通ルールで実行する。

詳細ルール: `CLAUDE.md` §事実情報の自動 raw 保存ルール

## 配下のカテゴリ

| ディレクトリ | 用途 | 例 |
|---|---|---|
| `people/` | 人物の事実（クライアント・関係者・取引相手） | 「田中さんは元会計士で◯◯に詳しい」 |
| `contracts/` | 契約・案件・取引の条件 | 「XYZ 案件は税抜 30 万、納期 2026-07 末」 |
| `situations/` | 自分の状況・出来事・環境変化 | 「失業手当は 2026-07-16 で給付満了」 |
| `misc/` | 上記に明確に当てはまらない事実 | （判断ゆれ時の退避先） |

## ファイル名規約

`YYYY-MM-DD-<slug>.md`

例:
- `people/2026-05-21-tanaka-san-accountant.md`
- `contracts/2026-05-21-xyz-deal-terms.md`
- `situations/2026-05-21-shitsugyo-end-date.md`

slug は人名・契約名・状況キーワードの kebab-case。日付が重複したら slug 末尾に `-2` 等を付けて衝突回避。

## 中身フォーマット（最小）

```markdown
---
date: 2026-05-21
category: people  # people | contracts | situations | misc
source: session
---

# {タイトル}

{ユーザーが発話した事実をそのまま、または最小限の整形で記録}
```

## ingest

raw は immutable。wiki への整理 ingest は別途、必要時に手動・半自動で実施する（publishing/inspirations と同じ運用）。raw/facts/ 自体を直接 grep して参照することも多い想定。

## immutability

- raw/ 配下は CLAUDE.md §人間確認ルール で「削除・修正は人間承認必須」
- 事実が古くなっても**ファイルを上書きせず**、新しい日付で別ファイルを作成（履歴を残す）
