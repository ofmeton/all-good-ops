# multi-platform-publishing — 3 媒体役割分担・連動運用手順

## 用途

`brand-publisher` agent が X / Instagram / note の 3 媒体を統括運用する際の連動手順 SSOT。

## 3 媒体の役割分担

| 媒体 | 役割 | 主要フォーマット |
|---|---|---|
| **X** | 拡散・認知 → note 送客 | 単発投稿 + Before-After 画像 + 数値見出し |
| **Instagram** | ブランド構築・保存型認知 → note + プロフ送客 | カルーセル 9 枚 / リール補助 |
| **note** | 収益化・深掘り → 上位事業へのリード | 無料 3-5 本/月 + 有料 1 本/月（500-980 円） |

## 1 トピックの 3 媒体展開フロー

```
[トピック決定]
   業務名 + ツール名（例: 行政書士の見積書 × Claude）
        ↓
[note 本記事執筆]
   SCQA 構造、3000-5000 字、画像 5-8 枚、コードブロック 3-5 個
   writer agent + scqa-writing-framework
        ↓
[Instagram カルーセル化]
   note 本記事 → 9 枚カルーセルに圧縮
   visual-designer + visual-design-system
        ↓
[X 単発化 + スレッド化]
   - 単発: カルーセル 1 枚目を 1200×675 に変換
   - スレッド: note の節を 4-7 投稿に圧縮、最終投稿で note リンク
        ↓
[投稿スケジューリング]
   X 即日 → Instagram 翌日 → note 翌々日 の順、もしくは note 公開後に X / IG で告知
        ↓
[content-reviewer レビュー]
   3 媒体全てで rubric 通過
        ↓
[公開]
   人間確認必須（spec §4.2）
```

## 媒体間のリンク設計

- X → note: スレッド最終投稿でリンク（短縮 URL NG、生 URL）
- Instagram → note: プロフィール固定リンク or リンクツリー
- note 本記事 → 別 note: 関連記事リンク（読者の回遊）

## 投稿頻度（Phase 別目標）

| Phase | X | Instagram | note 無料 | note 有料 |
|---|---|---|---|---|
| Phase 1 | 週 5 投稿 | 週 2 カルーセル | 月 3 本 | 月 1 本 |
| Phase 2 | 週 7 投稿 | 週 3 カルーセル | 月 4 本 | 月 1 本 |
| Phase 3 | 週 10 投稿 | 週 4 カルーセル | 月 5 本 | 月 1-2 本 |

## 名義の徹底

- 全媒体で **ofmeton** 名義固定
- 本名（工藤陸）・ペルソナ（はぐりん）は本媒体に登場させない
- 「BSA 工藤陸」名義は archived

## エスカレーション条件

- KPI が Phase 計画の 50% を下回って 2 ヶ月連続 → strategic-advisor に相談
- 媒体間の整合性破綻（同じトピックで矛盾発言）→ 即修正

## 参照する wiki

- `wiki/publishing/by-media/*` — 媒体別の勝ちパターン
- `wiki/publishing/by-theme/*` — テーマ別の構造
- `wiki/publishing/buzz-patterns.md` — 横断パターン

## 参照する他スキル

- `.claude/skills/publishing-playbook.md` — 既存の発信プレイブック
- `.claude/skills/content-quality-rubric.md` — 公開前レビュー
- `.claude/skills/visual-design-system.md` — ビジュアル設計
- `.claude/skills/note-revenue-playbook.md` — note 収益化
