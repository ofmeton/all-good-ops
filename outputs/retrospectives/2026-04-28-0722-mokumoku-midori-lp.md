# セッション振り返り — もくもく工房 LP 構築 → みどり工務店 リネーム → portfolio実績追加 → 軽量化

- **日時**: 2026-04-26 〜 2026-04-28
- **対象**: BSA サンプル LP 1 件のフルライフサイクル（実装・修正反復・デプロイ・実績反映・軽量化）
- **規模**: ~50 ターン超、3 リポジトリ（mokumoku-koubou-lp 新規・portfolio・all-good-ops memory/skill）
- **成果物 URL**: https://mokumoku-koubou-lp.vercel.app/ ・ https://portfolio-fawn-eight-63.vercel.app/#works

## セッション概要

1. Anthropic Design API から bundle を fetch → README とチャット履歴・全 jsx を読了 → React UMD + Babel standalone 構成のまま `outputs/lp-experiments/mokumoku-koubou/` に展開・ローカル http.server で動作確認
2. 改行・サブコピー視認性・バッジ位置・装飾配置・フィルタ bug・FAQ 開閉 bug を反復修正
3. お客様の声マーキー実装 → hover 減速試行 → 最終的に「停止しない」が最良という結論
4. スマホ FV を 100svh 拡張、雲削除、scroll-snap 撤廃、4 つのこだわりタイトル可読性向上
5. Codex MCP で 3 本柱 illustration 生成（gpt-image-1, 0.5USD 以下）→ 世界観完璧統一
6. Vercel デプロイ → 1 度 ERROR（git author email 不一致）→ 空 commit redeploy で解決
7. INDEX ボタン追加、会社名「もくもく工房」→「みどり工務店」全置換、portfolio サムネ更新
8. 軽量化「中」プラン（A1 不使用画像削除 / A2 React production / B1 WebP 化）を 3 commit 分割で適用 → assets 22MB → 3.4MB

## 1. 良かった点

- **段階的判断ゲート**: 軽量化は A/B/C プランをメリデメ表で出してユーザー判断後に実行。実行時は 3 commit 分けて revert 可能化
- **Vercel ERROR の根本特定**: ビルドログ空のまま 0 秒死を「過去成功 deploy の `creator.email` 全件目視」で構造的要因に到達
- **修正の都度ヘッドレス確認**: `feedback_visual_diff_check_after_edit.md` のルールを実運用化
- **WebP 化で想定超え**: 70% off 想定で実績 91% off（水彩イラストの圧縮特性）
- **会社名統一の漏れチェック**: `grep -rn` で全ファイル網羅、住所「もくもく町→みどり町」まで含めて整合

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | Playwright MCP が 3 回切断・再認証コスト | プロセス長期稼働で session 切れ | 切断前提でヘッドレスを最初から準備 | 長時間タスクは ヘッドレス を主、MCP を補助に |
| 2 | INDEX ボタンで padding 116px → ナビ折り返し → 戻す | ナビ available width 未計測 | アイテム数と viewport 幅から計算 | `getBoundingClientRect` 等で実測してから padding 決定 |
| 3 | Vercel 1 commit 目 ERROR → empty redeploy → 2 度目もERROR → author email で解決（3 commit 浪費） | 過去 deploy の creator.email 未確認 | push 前に list_deployments で email 確認 | team プロジェクト初 push 前に過去パターン確認 |
| 4 | ヘッドレス Chrome で SPA fade-in セクション撮れない | IntersectionObserver は実スクロール要求 | `--virtual-time-budget` だけでは発火しない | Playwright `evaluate` で `.fade-in.visible` 強制 or 実機確認を最初に明示 |
| 5 | jsx ファイルキャッシュ問題 | `?v=` を index.html だけ付与しても各 jsx 参照に伝播せず | 全 import に個別 `?v=` 仕込み | サンプル LP 構築初手で全 src に cache busting クエリを入れる |
| 6 | portfolio に他の未コミット変更が混在 | `git add -A` を避け `status` 先確認は OK だが緊張感 | 共有リポジトリでは明示的にファイル指定 | `git add <files>` 固定運用 |

## 3. 自動化・効率化の余地（→ 反映済）

- **LP 軽量化プレイブック**: A1+A2+B1 の手順を再現性高くスキル化 → `lp-optimization-playbook.md` 作成
- **Vercel team author email pre-check**: push 前確認手順をスキル化 → `vercel-team-deploy-checklist.md` 作成
- **ヘッドレス Chrome SPA 制約**: memory に明文化 → `feedback_headless_chrome_spa_limit.md`
- **Babel standalone cache busting**: memory に明文化 → `feedback_jsx_prototype_cache_busting.md`

## 4. 次回への改善提案（アクション可能粒度）

1. BSA で初めての Vercel team プロジェクト push 前に、必ず `list_deployments` で過去成功 commit の `creator.email` を確認し git config user.email を一致させる
2. ヘッドレス Chrome 撮影前に「FV のみ確実、それ以下は Playwright か実機」と最初に明示
3. React + Babel standalone の prototype デプロイ初手で `?v=YYYYMMDDx` を全 jsx/css に付与
4. レイアウト系プロパティ（padding/max-width）変更時は available width を計算してから決定
5. 軽量化のような選択肢提案では「commit 分割で実行・後戻り簡単」を最初に宣言

## 5. 反映先（実装済）

### SAFE（4 件まとめ承認）
- ✅ `memory/feedback_vercel_git_author_authorization.md` 新規
- ✅ `memory/feedback_headless_chrome_spa_limit.md` 新規
- ✅ `memory/feedback_jsx_prototype_cache_busting.md` 新規
- ✅ `memory/MEMORY.md` 索引 3 件追記
- ✅ `data/improvement-log.jsonl` 追記

### RISKY（1 件ずつ承認 → 全承認）
- ✅ `.claude/skills/lp-optimization-playbook.md` 新規（CLAUDE.md スキル一覧 #24 + ルーティング表追記）
- ✅ `.claude/skills/vercel-team-deploy-checklist.md` 新規（CLAUDE.md スキル一覧 #25 + ルーティング表追記）

## 関連リソース

- mokumoku-koubou-lp リポジトリ: https://github.com/ofmeton/mokumoku-koubou-lp
- portfolio: https://github.com/ofmeton/portfolio
- 各 commit:
  - `0437719` perf(A1): 不使用画像 66 個を削除（-6.8MB）
  - `cf37098` perf(A2): React UMD を production build に切替
  - `7fa017b` perf(B1): 大物画像 5 枚を WebP 化（-11.5MB / 91% off）
