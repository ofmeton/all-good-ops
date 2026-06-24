# 振り返り 2026-06-24 — hermes Telegram→Notion 通知改善 / Notion UI 再設計 / 分解自動化と過剰分割の収拾

対象: 本セッション全体。hermes 通知2層化＋Notion双方向(Phase5)→Notion UI 再設計(7ビュー+formula+ガイド)→分解の承認制廃止→一括自動分割の暴走と収拾(リセット+#3ガード)→NeedInfo滞留の全解消。

## §0 raw 保存
- 7/8 Claude×事業計画書 講座: 既保存(PR#276)。
- 開業日8/14仮確定: 本振り返りで `raw/facts/situations/2026-06-24-kaigyo-timing.md` に補完。

## §0.5 前回フォローアップ(再計測)
- 直近 improvement-log は全 applied。
- 「bg=EnterWorktree初手」= applied(編集は全て worktree 内)。
- 「hermes 分解承認hint の実挙動確認」open item = 本セッションで**承認制ごと撤去 → obsolete化**。
- 「squash worktree 継続」= **再発**(memory に手順があるのに想起できず PR#272 衝突→cherry-pick回避)。

## §1 良かった点
- Phase 5 を Codex 委任→Codex セルフレビューで実バグ5件を自己修正→Claude最終確認の二段で品質維持+トークン節約。
- Notion query/view MCP が Business 必須でブロック→hermes REST 直叩きへ即切替して診断継続。
- 過剰分割の暴走に気づいた後、原因(recursive 一括分割)を隠さず明示し #3ガード+リセットで根治。
- Notion UI は plan mode で設計合意→実装。formula グルーピング不可も即 Status グループに代替。

## §2 詰まった/二度手間
| # | 事象 | 原因(構造) | 本来 |
|---|---|---|---|
| 1 | 一括自動分割で盤面爆発(X32断片・Inbox80子) | 承認撤去と同時に brief 未確定カードまで `--max50` で recursive 一括分割 | 不可逆/増殖系は①ガード先行(#3)②小バッチ→確認→全量 |
| 2 | PR merge 衝突×3(cherry-pick回避) | squash-merge 済 worktree で follow-up commit を継続 | 継続作業は毎回 origin/main から fresh branch |
| 3 | 回答を子に書いた直後リセットで子ごと消失→親に付け直し | 掃除と回答の順序が逆/回答を子粒度に記入 | 破壊的整理の前に残す対象を確定・回答は親(root)粒度 |
| 4 | formula 値を機械検証できず | query/view MCP が Business 必須 | 構造化クエリ/値検証は REST 直叩き(hermes token) |
| 5 | ID typo(389/386)で404 | 手打ちID | dump 出力からコピペ |

## §3 自動化・効率化
- 「不可逆/増殖系の一括操作=ガード先行+小バッチ試行」を engineering-principles 原則7 に連結。
- Notion 構造化クエリの REST 直叩きパターンを reference に追記。

## §4 改善提案(アクション可能)
1. 破壊的/増殖的な一括操作は、実行前に①ガード条件をコード化②`--max`小で1バッチ試す③確認→全量、の順。
2. squash-merge worktree で続ける時は最初に `git checkout -b <new> origin/main`。
3. Notion の構造化クエリ/値検証は MCP query でなく hermes REST 直叩きを既定。
4. 破壊的整理の前に残す対象を確定し、回答・メモは親(root)粒度に書く。

## §5 観点レンズ
- 🔧 未活用資産: feedback_squash_merge が既存なのに再発→「継続作業=fresh branch」を再発スタンプで salient 化。
- ⚡ Claude機能: plan mode/worktree/Codex/parallel Explore は活用。#3ガードを「後」に入れた=プロセス順序の問題。
- 🪙 トークンコスパ: NeedInfo 診断で DB 全件 fetch を複数回。必要列だけ集約する1スクリプトで圧縮可能だった。

## §6 反映(全 SAFE・RISKY なし)
- wiki/self/engineering-principles 原則7: 増殖系 bulk op の規律を追記。
- memory reference_notion_mcp_id_and_sharing §3: REST 直叩きは非 gate を追記。
- memory feedback_squash_merge: 再発(2026-06-24)スタンプ。
- memory project_hermes_todo_partner: 過剰分割→リセット+#3 の教訓を追記。
- raw: 開業日8/14仮確定。
- improvement-log: 本エントリ。
