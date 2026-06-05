# セッション振り返り：hidamari-cms（自前CMS実装デモ）

- 日時: 2026-06-05 16:04
- 対象: 業務委託先コーポレートサイト案件の実力証明として、サンプルサイト「Hidamari Lab.」に CMS を後付けし Next.js 16 + Supabase でフルスタック実装→本番デプロイ→実機フィードバック反映→P0/P1/P2→UI Tier1+2 まで（複数日・1リポ `/Users/rikukudo/Projects/hidamari-cms`）。
- ライブ: https://hidamari-cms.vercel.app

## 0. raw 保存漏れチェック
- 案件の事実（業務委託先コーポレートサイト案件）は `raw/facts/contracts/2026-06-01-webmarketing-corporate-site-opportunity.md` に保存済み。本セッション分の漏れなし。

## 1. 良かった点
- brainstorming→writing-plans→subagent-driven の規律で大型機能を破綻なく積み上げ、要件定義から本番稼働まで一気通貫。
- 実機フィードバック（白紙・カーソル・フィルタ・予約）を毎回 systematic-debugging で**根本原因**まで掘った（GSAP reveal×SPA再描画 / Storage RLS / TZ誤解釈）。
- 各タスクで build/test/tsc/eslint を verify→デプロイ→Playwright で実挙動確認（テスト緑で止めない）。
- 公開予約の粒度ズレを正直に頭出しし B+C で期待値調整まで設計。

## 2. 詰まった瞬間・二度手間
| # | 事象 | 原因（構造） | 先回り | 本来すべき動き |
|---|---|---|---|---|
| 1 | ソフト遷移/フィルタで一覧が白紙 | reveal演出がレイアウト常駐SiteMotionで1回しか初期化されず、SPA再描画/遷移の新要素がopacity:0のまま | 移植時点で予見可 | reveal依存はルート変更で再init or CSS非依存に |
| 2 | メディアライブラリが常に空 | Storage RLS SELECTが`to anon`のみ。authenticatedに読取無し | RLS設計時に両ロール要と確認可 | バケットRLSはanon/authenticated両SELECTをペアで |
| 3 | 予約投稿が公開されない | datetime-local(JST)をUTCサーバでUTC解釈→+9hズレ | UTCサーバ×TZなし日時は典型 | 固定TZのparse/format utilを先に作る |
| 4 | ダッシュボード最近更新が404 | hrefを`/admin/news/[id]`にしたが実ルートは`/[id]/edit` | href生成時ルート突合で防げた | hrefは実在ルートと突合 |
| 5 | Playwrightスクショ非永続で探索往復 | MCPスクショ保存先が掴めず | DOM評価主体にすれば回避 | 検証はevaluate主体、スクショは保存先確定後 |
| 6 | サブエージェントbranch逸脱 | 実装者が勝手にfeatureブランチ作成 | 初回プロンプトにmain厳守明示すべき | 実装者プロンプトに固定制約 |

## 3. 自動化・効率化の余地
- サブエージェント実装者プロンプトの共通制約をテンプレ化（→ feedback_subagent_dispatch_verify に追記済み）。
- Next+Supabase 定番ハマりをチェックリスト/スキル化（→ skill `nextjs-supabase-site-gotchas` 新設）。
- Vercelデプロイ＋Playwrightスモークの定型を1コマンド化（未対応・候補）。

## 4. 次回への改善提案
- 静的サイトのNext/SPA化は着手時にreveal演出の再描画耐性を設計チェック。
- Supabase Storageバケット作成時、RLSはanon/authenticated両SELECTをペアで書く。
- datetime入力実装は固定TZ utilを先に作ってからUIを組む。
- 管理画面のリンクhrefはapp/ルート構成と突合してから生成。

## 5. 反映実施
- memory feedback 新規: `feedback_spa_reveal_reinit` / `feedback_supabase_storage_rls_both_roles`（+ セッション中に `feedback_datetime_local_fixed_tz`）。
- memory feedback 追記: `feedback_subagent_dispatch_verify`（実装者プロンプト固定制約）。
- improvement-log: 管理UI href突合 / デプロイ検証はDOM評価主体。
- 新規スキル: `nextjs-supabase-site-gotchas`（CLAUDE.md 開発行に登録）。
- 整理: `.playwright-mcp/` の一時ファイル削除。

## 次フェーズ
テーマ一元化＝他クライアントへ嵌め込むラッピング（site.config化・CSS変数config駆動・seedテンプレ・複製手順）。CMS機能はfeature-complete扱い。上記スキルをラッピング工程に統合する。
