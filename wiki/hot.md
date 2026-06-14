---
type: meta
title: "Hot Cache"
updated: 2026-06-14
---
# Recent Context

> セッション間で保持される ~500 words のコンテキストキャッシュ。セッション開始時に最優先で読む。詳細: [[SCHEMA]] §ホットキャッシュ。

## Last Updated
2026-06-14 — **web-ui-bridge 機能大幅拡張＋堅牢化(PR#208-213)**: ①**複数選択**(⌘/Shift クリック+まとめてプロンプト/D&D group移動/スタイル一括/複製削除)=案Bアトミックバッチ(daemon純関数が範囲降順splice=1操作1undo・同一class dedup・skip理由warn・別親はClaude経路) ②ドック被りガター修正(html margin+body transform) ③UX微修正(画面幅ラベル/「マウスホバー」/選択枠とホバー枠分離) ④**装飾の連続射影リアーキ**=アクティブ中だけ回る単一rAFループ`reproject()`が毎フレーム全装飾をライブrectから再配置→スクロール/リサイズ/HMR/オートスクロールの**位置ズレ系を構造的根絶**(.hl/.hl2 transition除去・idle 0フレーム・`__webUiBridgeAssert`チェック口) ⑤スクロール二重青枠修正 ⑥**dynamic workflow(40エージェント)でユーザー操作バグ一掃**=多レンズ仮説→敵対反証→実機確定で本物4件修正(複数選択className/Apply/Reset一括化・入力中テキスト/フォーカス保持・launcher再描画・undo後sourceClass再同期)+**操作プローブパック**(`smoke/probes/*.mjs`+`run.mjs`・17緑5skip)。実装=Codex委任+Claude設計/レビュー/実機検証。retro [[../outputs/retrospectives/2026-06-14-1900-web-ui-bridge-multiselect-reproject-bughunt]]。
- 学び: 多エージェント仮説はreasoning反証でなく**実システムで経験的確定**(workflowが26件realも実機で4件・primaryIdx偽陽性=到達不能をreasonerが見落とし→wiki原則新設)/Codex sandboxはChrome不可=ブラウザ駆動テストは盲目実装で脆い(構造セレクタ+自分で実走+skip許容→codex-implement追記)/daemonはoverlay.jsホット配信but server.mjsは起動時ロード=コード変更後は再起動/worktree-file-reread 5連続。
- 前: X発信大刷新(PR#185-205)・web-ui-bridge Phase0-STUDIO(PR#195-206)。

## Current Focus
- **X発信 新運用**: 自動収集OFF・**手動ブックマークURLを `scripts/ingest-bookmarks.ts`/`/admin/ingest-bookmarks` で投入**→curation→writer(知見+段取り+新ターゲット)→check→LINE承認。writer は MAv4(再焼成済)。テンプレ patch は runtime 注入(re-bake不要・deployのみ)。collector復活は `collector_enabled` 行削除/=1。
- **X発信 残**: ①article compose軽量化(240sでも長文重い→入力trim/段取り簡略)未実装 ②Phase2画像 次スライス=publish側ブロック挿入(X Articleインライン/thread各ツイート)=**保留(手動画像gen運用)** ③writer品質~88 plateau・自己推敲2pass(compose費2倍)は要承認レバー。eval資産=`scripts/pdca-eval.ts`。
- **web-ui-bridge**: 複数選択/連続射影/操作プローブまで出荷済(PR#195-213)。起動=`node apps/web-ui-bridge/daemon/server.mjs --target <site>`+対象`npm run dev`。回帰=`cd apps/web-ui-bridge/smoke && npm run probe`(daemon/terra稼働前提)。**server.mjs変更後はdaemon再起動**(overlay.jsはホット)。残=bug-hunt 2ラウンド目の中位候補(ユーザー保留)・STUDIO残パリティ。
- **X collector 最適化＝自走化完了**: shadow データ蓄積中(現1/7)。**enforce 自動flip**(直近7run retention=100%∧pruned_fine_max<70)で削減発動(¥53→¥25-35・即revert=`collector_prerank_enforce`=0)。launchd 夜間apply(03:00JST)は real-mode だが brownout中は defer。MA live: collector v2(PR#169 keyword/trend主軸)・analyst v2(P4 collector_lever)。
- **brownout 中（¥13,800超）**: X worker は daily-digest+line-event のみ。`!resume`か月初リセットで復帰。**enforce自動flip は collect 継続が前提**＝brownout で collect halt なら shadow 蓄積停止 → 要 `!resume`/監視。[[project-cron-automation-disabled]]
- **mf-finance（別ブランチ進行中）**: Plan1+後続モジュール完了。worktree `task/260606-mf-finance` 未merge・[[../apps/mf-finance/HANDOFF.md]]。PostgREST公開反映の稼働確認が残。
- 🔴 **ミナト広告設定（再開待ち）**: chrome-devtools MCP接続待ち。[[project-minato-ad-settings]]
- 🔴 **はぐりん persona**: 名義境界の戦略再判断 未着手。

## Recently Touched
- `apps/web-ui-bridge/overlay/overlay.js`(複数選択/連続射影/各UX修正)・`daemon/{server,apply,reorder}.mjs`(batch endpoint/moveGroupInSource)・`smoke/{lib,run}.mjs`+`smoke/probes/*.mjs`(操作プローブパック)・`HANDOFF.md`/`STUDIO-PARITY.md`・`docs/superpowers/{specs,plans}/2026-06-14-web-ui-bridge-multi-select*.md`
- wiki [[self/engineering-principles]](多エージェント仮説は実システムで確定・原則新設)・`.claude/skills/codex-implement/SKILL.md`(Codex sandboxはブラウザ不可)・memory [[project-web-ui-bridge]]
- 前(X発信): `apps/x-account-system/lib/{ingest,curation,visualizer,params}/*.ts`・`scripts/{ingest-bookmarks,pdca-eval}.ts`・worker `v91d6666e`・x-writer MA `v4`・`runtime_params.collector_enabled=0`

## Open Questions / Frontiers
- **enforce 自動flip 依存**: collect が回り続け shadow が7run貯まるか（brownout halt 注意）。基準到達で自動切替＋LINE通知。
- **bootstrap-core `--tool` バグ残置**: 次回 MA update は `scripts/update-ma-agents-sdk.ts`(SDK直) 再利用 or 恒久修正。
- **MA prompt drift 検知なし**: merge+worker deploy ≠ MA反映（ma:bootstrap 必須）で PR#169 が3日 un-live だった。system_hash drift の CI 警告が欲しい。
- **cwd-regression**: 全Bash `cd <abs> &&` 前置（[[bash-cwd-persistence]]）。
- `listApprovedStock`相当フィルタ3箇所複製の SSOT 化（未着手）。

## Conventions
- 500 words 以内 / declarative present tense / 全置換更新（古い項目は間引く）
- 更新タイミング: ingest 後 / 大きな query 合成後 / 戦略変更 commit 後 / 振り返り完了時
