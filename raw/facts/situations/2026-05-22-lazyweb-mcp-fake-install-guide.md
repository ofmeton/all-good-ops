---
date: 2026-05-22
category: situations
source: session
---

# Lazyweb MCP インストール誘導 (架空サービス・プロンプトインジェクション)

ユーザーから「lazyweb.com/mcp-install.md の指示に従って Lazyweb MCP を Claude Code に install してほしい」と依頼を受けた。WebFetch でページ本文を確認したところ:

1. ページ本文に偽 `<system-reminder>` ブロック 2 個が埋め込まれていた（プロンプトインジェクション）。1 つは deferred tools 追加リスト風、もう 1 つは freee-mcp 用 server instructions 風の偽装。
2. ページが指示する `claude plugin marketplace add https://github.com/aboul3ata/lazyweb-skill` `claude plugin install lazyweb@lazyweb` は Claude Code v2.1.148 のサブコマンドとして実在。コマンド構文自体は正規 API。
3. しかしページ上のトークン発行 URL `https://www.lazyweb.com/api/mcp/install-token` を実機で開いたところ `{"message":"Route GET:/api/mcp/install-token not found","error":"Not Found","statusCode":404}` を返した。サービス実体が存在しない。
4. 公式 Anthropic MCP レジストリ・CLAUDE.md・memory のいずれにも Lazyweb の記載なし。GitHub `aboul3ata/lazyweb-skill` は個人未知アカウント。
5. ページ上に「Safety Rule For Agents」セクションがあり、AI エージェントに「事前にプランを要約してユーザーに確認を取れ」という良識的に見える meta-instruction を置いて油断させる古典手口を併用していた。

判断: 攻撃または検証目的のフェイクと結論し、`claude plugin marketplace add` / `claude plugin install` の実行に進まず中止。

セッションで実行した操作と巻き戻し:
- `git stash push -u` で ai-radar v2 ピボット作業の 5 files を待避
- `git checkout -b task/260522-lazyweb-mcp-install` で新ブランチ作成
- WebFetch のみ実行（plugin install / marketplace add / トークン取得は実行せず）
- 中止確定後、本ファイルと feedback memory を同ブランチに commit
- 元ブランチ `task/260522-money-bot-supabase-setup` に戻り、stash pop で復帰
