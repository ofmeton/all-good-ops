# X予約投稿スキルの chrome-devtools 実機疎通を確認

- 日付: 2026-06-05
- カテゴリ: situations

## 事実
chrome-devtools MCP がユーザーの実 Chrome（個人プロファイル）に接続済みで、X にログイン済み（はぐりん｜ALL GOOD STUDIO 名義）であることを確認。`https://x.com/compose/post` を新規タブで開き `take_snapshot` で a11y ツリーを取得した結果、以下が到達可能と裏取りできた:

- textbox「ポスト本文」（本文入力）
- button「ポストを予約」（= スケジュール投稿。`x-scheduled-publish` スキルの肝）
- button「画像や動画を追加」/「ファイル選択」（メディア添付 = upload_file）
- button「絵文字を追加」

automation 検知（[[reference_chrome_devtools_mcp]] の Google ログイン弾かれ事例）は、**ログイン済みセッション内の compose 操作には及ばず**、要素をフル取得できた。

→ チャエン×Kくん理想設計 Phase 2 の「chrome-devtools で X 予約UIを叩く」前提が実機で成立。実際の予約・投稿は未実施（外部反映のため人間確認が前提）。

## 補足
- xad-dashboard は Vercel 本番稼働（`xad-dashboard-ofmetons-projects.vercel.app`）も確認。
- 関連: スキル `.claude/skills/x-scheduled-publish/SKILL.md` / plan `~/.claude/plans/k-x-drifting-lark.md`
