# raw/publishing/inspirations/

ユーザーが見つけたバズ投稿・参考にしたい投稿の置き場（5 秒で投げ込める設計）。

## ファイル名規約

`<media>-<YYYY-MM-DD>-<slug>.md`

例:
- `x-20260520-chaen-bazz-prompt-thread.md`
- `note-20260520-keito-claude-tips.md`
- `instagram-20260521-abe-carousel-fontwork.md`
- `meta-20260522-fladdict-fukuya-comment.md`（媒体不問の知見メモは media=meta）

## 中身の自由度

以下のいずれでも OK（フォーマット縛りは弱く、ingest 側で吸収する）:
- URL 1 行だけ
- 本文の貼り付け
- スクショ + 自分の気づきメモ
- 「これ参考にして」の一言

## ingest フロー

セッション開始時に brand-publisher / secretary が自動スキャン → 未取り込みあれば一括確認 → ユーザー Y で wiki/publishing/ に整理して反映。

詳細: `.claude/skills/publishing-wiki-ingest.md`
SCHEMA 例外規定: `wiki/SCHEMA.md` §ingest プロトコル
