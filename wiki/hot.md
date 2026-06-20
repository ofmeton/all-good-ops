---
type: meta
title: "Hot Cache"
updated: 2026-06-19
---
# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-19 — **mf-finance 大改修(PR#215〜231)**: DB を main repo へ移設し worktree 非依存化(resolver・#215)/見切れ修正(#216)/**web-ui-bridge(Cue)統合+pending永続化**(#217)/**UI/IA刷新 Phase①**(左サイドバー+全幅+5系統ナビ #218)/**カード引落 Phase②**(#220)とその連鎖修正→**締め日基準の請求期間集計**(closing_day/cardBillingPeriod #230)+**引落先口座**(debit_account・口座別列からカード除外 #231)/MFデータ再取得(#222・txn 4178→4297)/optimizerに分類ルール作成承認(#226)。学び=ドメイン数値ロジックは計算モデルを先に確定(カード請求が5回反復)→wiki engineering-principles・memory feedback_user_perception_vs_data_check 追記。retro [[../outputs/retrospectives/2026-06-19-0319-mf-finance-card-billing]]。
- 前(2026-06-19): **doda 求人応募代行**で正社員2社に書類応募送信(チームラボ/セレス・訂正削除不可)。学び→`feedback_chrome_devtools_fill_limitations`(充足判定はinput.value)。retro [[../outputs/retrospectives/2026-06-19-0003-doda-job-apply-proxy]]。
- 前(2026-06-18): **TERRA HAYAMA HP 改修第1-3弾**本番反映(PR#144/#148/#207 / https://site-eosin-one-44.vercel.app)。retro [[../outputs/retrospectives/2026-06-18-terra-hp-redesign-motion]]。
- 前(2026-06-18): そうま高校選び調査→souma.md追記。クラウドワークスForm代理入力→本人送信(chrome fill制限=dropdown keyboard/date type/検証evaluate_script)。
- 前(2026-06-15): mf-finance 資金繰りPR#214・web-ui-bridge(PR#208-213)・X発信刷新(PR#185-205)。

## Current Focus
- **X発信 新運用**: 自動収集OFF・**手動ブックマークURLを `scripts/ingest-bookmarks.ts`/`/admin/ingest-bookmarks` で投入**→curation→writer(知見+段取り+新ターゲット)→check→LINE承認。writer は MAv4(再焼成済)。テンプレ patch は runtime 注入(re-bake不要・deployのみ)。collector復活は `collector_enabled` 行削除/=1。
- **X発信 残**: ①article compose軽量化(240sでも長文重い→入力trim/段取り簡略)未実装 ②Phase2画像 次スライス=publish側ブロック挿入(X Articleインライン/thread各ツイート)=**保留(手動画像gen運用)** ③writer品質~88 plateau・自己推敲2pass(compose費2倍)は要承認レバー。eval資産=`scripts/pdca-eval.ts`。
- **web-ui-bridge**: 複数選択/連続射影/操作プローブまで出荷済(PR#195-213)。起動=`node apps/web-ui-bridge/daemon/server.mjs --target <site>`+対象`npm run dev`。回帰=`cd apps/web-ui-bridge/smoke && npm run probe`(daemon/terra稼働前提)。**server.mjs変更後はdaemon再起動**(overlay.jsはホット)。残=bug-hunt 2ラウンド目の中位候補(ユーザー保留)・STUDIO残パリティ。
- **X collector 最適化＝自走化完了**: shadow データ蓄積中(現1/7)。**enforce 自動flip**(直近7run retention=100%∧pruned_fine_max<70)で削減発動(¥53→¥25-35・即revert=`collector_prerank_enforce`=0)。launchd 夜間apply(03:00JST)は real-mode だが brownout中は defer。MA live: collector v2(PR#169 keyword/trend主軸)・analyst v2(P4 collector_lever)。
- **brownout 中（¥13,800超）**: X worker は daily-digest+line-event のみ。`!resume`か月初リセットで復帰。**enforce自動flip は collect 継続が前提**＝brownout で collect halt なら shadow 蓄積停止 → 要 `!resume`/監視。[[project-cron-automation-disabled]]
- **mf-finance（PR#215〜231 反映済・UI/IA刷新+カード引落 完了）**: 完全ローカルSQLite・無料・非公開。**実DB/中間JSONは main repo `apps/mf-finance/data/`(gitignore)に集約済**=worktree非依存(共通リゾルバ`lib/data-dir`/`scripts/lib/paths.mjs`=env>git共通dir>cwd)。dev=`cd apps/mf-finance && npm run dev`(:3000)。**ALTER/migration変更後はdev再起動→カラム確認→build**(順序誤るとbuild `Failed to collect page data`)。Cue overlay は dev限定注入(daemon :7331・「キュー」一語で処理)。カード引落=締め日(closing_day)基準の請求期間集計+引落先口座(debit_account)で正しい向き。残=他カードの引落先口座をユーザーがエディタで設定(今は三井住友のみ横浜銀行)・ポケットカード締め日1日設定済。
- **求職活動 2026**: クラウドワークス/SOKUDAN/ITプロパートナーズ/レバテック登録。**doda で正社員2社に書類応募済(2026-06-18 チームラボ webアプリエンジニア/セレス 自社開発・申込訂正削除不可)**=連絡先はMacメモ。希望=専業/月60h/リモート/マーケ広告+エンジニア。⚠️本応募は正社員フルコミット＝確定方針(週3・顧問化)と不整合・次キャリアセッションで本人とすり合わせ。[[project-job-search-2026]]
- **TERRA HAYAMA HP（本番公開・反復改修中）**: https://site-eosin-one-44.vercel.app 。code=`outputs/clients/terra-isshiki/site`(Next16)。デプロイ=site dirで`vercel --prod`(人間確認)。**次の改修は1 worktree使い回し**(同一feature反復はwt-newを繰り返さずmerge後pull)。オーナー提供待ち=OWNER写真4枚/SNS URL/フルキッチンspec→届き次第差替え再デプロイ。SSOT=[[business/personal/deals/2026-04-terra-isshiki]]。
- 🔴 **ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]
- 🔴 **はぐりん persona**: 名義境界の戦略再判断 未着手。

## Recently Touched
- `apps/mf-finance/`: `lib/cashflow/rolling.mjs`(buildRolling/buildAccountRolling/buildBalanceMatrix/monthEndOffsetDays/週次・変動・override)・`lib/cashflow-queries.ts`・`lib/cashflow-actions.ts`・`lib/actions.ts`・`lib/optimizer/{types,actions}.ts`+`scripts/optimizer-{export,propose}.mjs`(suggest_transfer)・`db/{schema.sql,migrate.mjs}`(account/transfer_fees/manual_transfers)・`app/cashflow/{page,CashflowTimeline,TransferEditor,ScheduledEditor,OccurrenceActions}.tsx`+`PeriodToggle`・`app/components/{MoneyRadar,RecurringEditor}.tsx`・`app/settings/TransferFeeEditor.tsx`。data/*.json・data/mf-finance.db は gitignore。
- `.claude/skills/codex-implement/SKILL.md`(Next+next/fontはCodexでbuild不可)・memory [[project-mf-finance-dashboard]]・[[feedback-browser-test-all-user-ops]](React制御inputはsetter+event/evaluate_script優先)
- 前: web-ui-bridge(PR#208-213 overlay/daemon/smoke)・X発信(ingest/curation/pdca-eval)

## Open Questions / Frontiers
- **enforce 自動flip 依存**: collect が回り続け shadow が7run貯まるか（brownout halt 注意）。基準到達で自動切替＋LINE通知。
- **bootstrap-core `--tool` バグ残置**: 次回 MA update は `scripts/update-ma-agents-sdk.ts`(SDK直) 再利用 or 恒久修正。
- **MA prompt drift 検知なし**: merge+worker deploy ≠ MA反映（ma:bootstrap 必須）で PR#169 が3日 un-live だった。system_hash drift の CI 警告が欲しい。
- **cwd-regression**: 全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]]）。
- `listApprovedStock`相当フィルタ3箇所複製の SSOT 化（未着手）。

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
