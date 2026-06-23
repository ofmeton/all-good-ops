# セッション振り返り — 自作4アプリ デモ動画（隔離→台本→ユーザー録画→合成）＋palmier-pro導入

- 日時: 2026-06-24 00:40 JST
- 対象: xad-dashboard / web-ui-bridge / hidamari-cms / mf-finance のポートフォリオ用デモ動画一式 ＋ demo-video-pipeline スキル再ブラッシュアップ ＋ palmier-pro(MCP動画エディタ)導入

## §0 raw
当日 raw は 2026-06-23-kokuho-r8.md（別件）のみ。本セッションは作業スタイル発話=feedback領域で people/contracts/situations の新規事実なし＝漏れなし。

## §0.5 前回フォローアップ（再計測）
- codex-delegation = verified（seed/record.ts/hidamari/mf-financeフェイク生成を danger-full-access 半委任。Claudeは設計・目視・テロップcraft保持）
- worktree-bg-isolation = applied（冒頭EnterWorktree）
- askuserquestion-fuuin = applied（向き/着手順/hidamari中身の genuine fork のみ）
- empirical-verify = verified（全レンダーをffmpegフレーム抽出で目視・mf dbPathで実DB非接触確認）

## §1 良かった点
- プライバシー隔離徹底（4アプリ全デモDB・mf-financeはMF_FINANCE_DATA_DIRガードで実家計DB非接触を実証・全口座(デモ)）
- Codex半委任を実infraに活用しトークン節約、Claudeは設計/目視/craftに集中
- ユーザー録画を実フレーム確認しテロップを台本でなく実内容から再構築（①6セクション化/②Claude依頼キュー中心）
- スキルを実地学び6点で即再ブラッシュアップ（書きっぱなしにしない）

## §2 詰まった瞬間
1. Codex合成が「rejected」表示でも実は生成済→気づかず重複ファイル作成・collision（macOS大小無視で Root.tsx≡root.tsx も）。原因=中断/拒否後の生成物未確認。本来=find/git statusで確認し既存採用。
2. 向きの手戻り（横16:9で①完成→「縦がいい」転換）。原因=デスクトップUIの向きは見せないと確定しない。先回り=着手前に1サンプルで握る。
3. hidamari画像エラー（録画中）: next/image が127.0.0.1未許可＋Next16 private-IPブロック。原因=本番Supabaseホスト前提のnext.config。対処=remotePatterns http+port追加＋dev限定unoptimized。
4. 7331競合（別worktreeのweb-ui-bridge実作業）。対処=デモ専用7332へ分離。

## §3 効率化
- 合成パイプライン outputs/app-demos/_compose は config駆動（demo-config.tsで区間秒/cropTop/テロップ微調整）＝再利用資産
- 「隔離+台本=Claude / 録画=ユーザー(実カーソル) / 合成=Claude」分担確立

## §4 改善提案
1. Codex呼び出しが中断/拒否されたら再実行前に find/git status で生成物確認
2. デスクトップアプリのデモは着手前に向き(縦/横)を1サンプルで握る
3. ローカルSupabase隔離でNext.jsを動かす時は next.config の images.remotePatterns/unoptimized も隔離チェックに含める

## §5 レンズ
- ⚡ worktree: 冒頭隔離は良。セッション跨ぎでdevサーバ消失→起動コマンドのガイド化で吸収
- 🪙 トークン: 実infra/フェイク生成/探索をCodexへ寄せClaudeは設計/目視/craft集中＝コスパ良
- 💬 プロンプト改善（ユーザーへ）: 「縦型で・録画は自分がやる(DB隔離して)」を最初にもらえると向き手戻り＆録画方式の往復が無かった

## §6 反映（SAFE即反映）
- memory project_demo_video_pipeline.md 追記（縦横両対応/compose pipeline/user-records分担/next/image gotcha/palmier-pro）
- memory 新規 feedback_codex_interrupted_verify_artifacts / reference_palmier_pro_mcp ＋ MEMORY.md 索引2行
- ~/.claude/skills/demo-video-pipeline/SKILL.md はセッション中に実地学び6点を統合済（applied）
- data/improvement-log.jsonl 追記 / 本retro doc / wiki/hot.md
RISKY: なし（スキル改修はユーザー依頼で実施済・palmier-pro MCP追加もユーザー依頼）
