# raw/ INBOX — スマホからの素材投入ガイド

スマホの Claude アプリから raw/ に素材を追加するときのルール。
このブランチ `raw-inbox` は素材の受け皿。Mac 側で wiki に ingest する。

## 置き場所

| 内容 | ディレクトリ |
|---|---|
| 気づき・メモ | `raw/notes/` |
| 読んだ記事（URL+コメント） | `raw/articles/` |
| 案件ヒアリング | `raw/deals/<案件名>/` |
| 本のメモ | `raw/books/` |
| 人脈メモ | `raw/self/relationships/` |
| 日次ログ | `raw/self/daily/` |

## ファイル名

`YYYY-MM-DD-タイトル.md`（例: `2026-05-15-ランサーズ提案の気づき.md`）

## 形式

- Markdown。中身は荒くてOK、断片でOK
- 既存ファイルは編集しない（追加のみ）
- `wiki/` やコードには触れない
- コミット先は `raw-inbox` ブランチのみ

## 中身の最低ライン

```markdown
# タイトル（なくてもOK）

- 気づきの箇条書き
- 断片でOK・「なんとなく」「要確認」でもOK
```

## Mac 側の取り込み

```
git fetch && git merge origin/raw-inbox
```

その後、秘書に「ingest して」と依頼すると wiki に統合・整形される。
