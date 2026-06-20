---
name: thinking
description: 陸さんが「考えなきゃ」と思いつつ考えられないテーマに、Claude が対話で伴走して結論／次の一手まで押し込む。ユーザーが「考えたい」「思考タイム」「頭の棚卸し」「思考する」「これ考えなきゃ」「一緒に考えて」等、思考テーマに向き合いたい時に起動する。感情・内省の記録（journaling）、仕事の振り返り（session-retrospective）とは別物。
---

# 思考パートナー伴走

陸さんの「考えるべきテーマ」に対話で伴走する。結論まで押し込むのが journaling との違い。

## 置き場（Phase2〜）
- **思考テーマの見出し＝Notion「思考インボックス」DB が唯一の SSOT**（Telegram 捕捉とセッション捕捉を一本化）。
  - data_source_id: `1497ea25-e889-4fc7-9ab2-9b44e21e0359` / database_id: `b7660e027ef4408a94e0222bcfd79082`
  - プロパティ: Title / Status(未着手·思考中·完結) / Source(Telegram·Claude·manual) / 捕捉日 / メモ(一言のみ)
- **対話の中身・結論＝`~/journal/think/entries/` に private 保存**（git管理外・Notion には出さない）。
- ローカル `~/journal/think/inbox.md` は **退役**（Phase1 の名残・読まない）。

## 起動時に必ず
1. `~/journal/think/CARTE.md` を読む（役割・型・方針の SSOT。git管理外）
2. Notion 思考インボックスを読む：`notion-search` を `data_source_url: collection://1497ea25-e889-4fc7-9ab2-9b44e21e0359` で実行（広めのクエリでよい・小規模インボックス）。各テーマの Status は検索結果 or `notion-fetch` で確認し、「未着手」「思考中」を把握
   - ※ `query-data-sources` / `query-database-view`（SQL/view 一括取得）は Notion プラン制限で不可。読み取りは `notion-search`＋`notion-fetch` を使う

## 進め方
1. インボックスから今日向き合うテーマを1つ提示（複数あれば本人に選ばせる。捕捉だけしたいなら下記「捕捉だけ」で終了）
2. 白紙を渡さない。テーマ種別を見極め、最初の問いをこちらから置く（CARTE のテーマ種別ガイド準拠）
3. grill-me 式に前提・抜け・反例・機会費用を突きながら一緒に考える。決めるのは本人
4. 内省・感情の話に逸れたら journaling へ送る（越境しない）

## 完結（必ず）
一区切りで **結論 / 次の一手 / 次に考える問い** のどれかを言語化する。
- `~/journal/think/entries/YYYY-MM-DD-<slug>.md` に作成/追記（きっかけ・見えたこと・落とした結論/次の一手）
- Notion 該当ページの Status を更新（継続=「思考中」／完結=「完結」）。メモに一言サマリ＋entry パスを残してよい（詳細は書かない）
- CARTE 末尾の entry 索引を1行更新

## 捕捉だけのとき
「考えたい：〇〇」と放られたら、対話に入らず **Notion 思考インボックスに1ページ作成**して終わる（Source=Claude / Status=未着手 / Title=テーマ）。着手はしない。
（Telegram からの「考えたい：〇〇」相当は hermes gateway が Haiku 判定で同じ DB に起票する＝同一インボックスに合流）

## プライバシー（厳守）
- 思考の**中身**（対話・結論）は `~/journal/think/`（git管理外・リポジトリ外）のみ。Notion には見出しと一言メモだけ（低機微）。git push 対象（raw/facts・outputs・wiki）に中身を書かない
- 完結内容が契約・案件の**事実決定**の時のみ「raw に記録する？」と確認して raw/facts へ昇格（自動ではしない）
- 詳細は memory `project_thinking_partner` / `project_journaling_system` のプライバシー規約に準ずる
