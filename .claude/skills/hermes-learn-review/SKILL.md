---
name: hermes-learn-review
description: hermes が貯めた「学び候補」(Notion 学習インボックス)を同意ゲート経由で Claude Code memory に昇華し、USER_PROFILE 投影を再生成する。ユーザーが「hermes の学びを反映して」「学習インボックス見て」「hermes-learn-review」等と言ったとき、または session-retrospective の最終フェーズから起動する。Phase A(書き戻し学習ループ)の収束工程。
---

# hermes-learn-review — hermes の学びを memory に昇華する同意ゲート

## 役割
hermes（捕捉/分類/実行）が運用中に検出した**訂正・好み・Project 紐付けの「学び候補」**を、Claude Code の memory（単一真実源）へ反映し、その投影 `USER_PROFILE.md` を再生成する。これにより hermes が「使うほど育つ」ループ（Phase B=読み の逆向き）が閉じる。

**設計原則**: hermes に独立した学習 store を持たせない。学びは必ず **Claude Code memory に一本化**し、hermes はそれを Phase B 投影経由で読むだけ。本 skill が両者の唯一の書き戻し接点。

**前提**: [[project_hermes_todo_partner]] の Phase A。読み側=Phase B（`hermes_context.py` / `USER_PROFILE.md`）。本家 OSS hermes-agent の `write_approval`（同意付き学習）を、既存の **SAFE/RISKY 振り返りゲート**に写像したもの。

## 入力: Notion 学習インボックス
- DB「hermes 学習インボックス」: **database_id `519dbba8d360481f91c981dda9ffa958`** / **data_source_id `56ef9df9-1dc3-48bc-bacb-f4ce42c8a448`**。
- プロパティ: `Observation`(title) / `Kind`(select: preference/correction/project-mapping) / `Status`(select: pending/approved/rejected) / `Evidence`(url) / `ProposedEdit`(rich text) / `Created`(created_time)。
- 読みは `notion-search` + `notion-fetch`（query 系はプラン制限・[[reference_notion_mcp_id_and_sharing]] 参照。post/patch=database_id・query=data_source_id）。
- **投入経路(A2)**: hermes の OSS Telegram agent が、ユーザーが分類/Autonomy を訂正した時に config.yaml の environment_hint 指示に従い自前 Notion MCP で本 DB に `Status=pending` のページを作る（我々の Python enqueue は不要）。手動投入(Claude/本人)も可。

## 手順（チェックリスト）
1. **取得**: 学習インボックスを `Status=pending` で取得。0 件なら「pending なし」と報告して終了。
2. **分類（SAFE / RISKY）**: 各候補を判定。
   - **SAFE**（即適用可）= 好みの傾向・分類の癖・Project 紐付けの追記など、名義境界や戦略に触れないもの。
   - **RISKY**（人間承認必須）= 名義境界（ofmeton/本名）・硬ゲート・戦略/KGI・私的領域の扱いに関わる変更。
3. **memory へ昇華**:
   - SAFE は該当 memory ファイル（`user_*` / `feedback_*` / `project_hermes_todo_partner`）へ追記・更新。重複は既存行に統合（atomic・肥大させない）。
   - RISKY は要点を提示し**人間承認を取ってから**反映。
   - 私的内省・感情・機密が混じる候補は **reject**（投影・memory に入れない）。
4. **投影再生成（Phase B へ還流）**: memory 反映後、`python3 data/hermes/gen_user_profile.py` を実行 → `data/hermes/context/USER_PROFILE.md` を再生成 → `git diff` で目視 → commit。
   - **配備**: 再生成した `USER_PROFILE.md` を Mac `~/.hermes/context/` と VM(35.222.76.101) `~/.hermes/context/` へ配備（VM は scp、要承認）。配備しないと hermes 側に反映されない（[[project_hermes_todo_partner]] 配備モデル参照）。
5. **Notion 更新**: 処理済み候補を `approved` / `rejected` に更新（**外部書込＝人間確認**の原則に従い、まとめて 1 回）。
6. **記録**: 反映件数・SAFE/RISKY 内訳を 1 行報告。必要なら `data/improvement-log.jsonl` に追記。

## ガード
- memory への直接書き込みは本 skill（Claude Code・Mac ローカル）でのみ行う。hermes(VM/Mac poller) は memory を直接書かない。
- 投影 `USER_PROFILE.md` は memory からの**読み取り生成物**。手編集せず gen_user_profile.py で再生成する（手編集すると次回再生成で消える）。
- 私的領域（journaling・内省・感情・思考テーマの中身）は学びとして取り込まない。
