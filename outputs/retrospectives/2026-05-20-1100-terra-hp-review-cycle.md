# セッション振り返り — terra-isshiki HP クライアントレビューサイクル

- **日時**: 2026-05-20 (前後数日にまたがる長期セッション集約)
- **対象**: テラ一色 民泊HP v0.2 → v0.3 + 多段クライアントレビュー反映 + Vercel 本番デプロイ
- **commit 数**: 30+ commits (terra-isshiki/site 配下)
- **deploy 数**: production 4 回

## 1. 良かった点

- **snap ツール先行投資の即時 ROI**: `responsive-snap.sh` を最初に作成し、Home FV の overflow バグを 1 サイクル目で自動検出 → snap→fix→snap→commit のフルサイクルを即実演できた
- **写真調達の自動化**: Drive MCP の base64 download が tokens 上限で詰まった際、jq+file 経由の fallback に即切替えて 5 枚を連続展開
- **コピー提案の 3 パターン縛り**: 装飾語彙寄せすぎ防止を意識して毎回 3 候補出し、採用率を高めに保てた
- **要求変化への小粒コミット**: bg 統一→revert、xl/2xl 二段→smooth clamp 等を 1 コミット粒度で切り出し、`git revert` 単発で戻せる状態を維持
- **Vercel team SSO の落とし穴を deploy 直後に明示**: 「クライアントに URL 渡せる？」の問いに先回り対応

## 2. 詰まった瞬間・二度手間

| # | 事象 | 原因 | 先回りできたポイント | 本来すべき動き |
|---|---|---|---|---|
| 1 | 初回 vercel deploy で別プロジェクト (minpaku-cleaning) が走った | repo root から実行、各サブプロジェクトに独立 `.vercel/project.json` がある仕様失念 | deploy 前に `pwd` と `.vercel/project.json` の verify 必須化 | `cd <site>` 明示後 project.json projectName を読み上げて実行 |
| 2 | 1440 で text size 調整を繰り返したが deploy で別サイズに見える | ユーザーローカルが 50% zoom のまま、互いの認識ズレが継続 | 視覚調整セッション開始時に zoom 100% 相互確認 | 「window.innerWidth と zoom レベル」確認を視覚タスクの最初に組み込む |
| 3 | xl:/2xl: 二段切替方式が breakpoint 跨ぎで size jump、ユーザー混乱 | breakpoint 跨ぎの discontinuity を軽視 | デスクトップ多 viewport での size 連続性を要件として最初に固める | 単一 clamp smooth スケールを default、二段方式は要件明示時のみ |
| 4 | Drive MCP `download_file_content` が tokens 上限で 5 回連続失敗 | base64 ファイル size が MCP tokens 上限超過の挙動を未把握 | 1 枚目で挙動観察 → file fallback を即 default 化 | 画像系 download は最初から jq+file decode フローを採用 |
| 5 | Stay FV photo 選定で 137 → tanada → 137 と往復 | 写真の明暗 (top half が白壁) と heroBg prop の相性チェックが選定時に抜けた | 明色 hero 採用時 `heroBg="light"` 連動を写真選定段階で確認 | 写真選定時に「ヘッダー coverage 領域の明暗」を最初に評価 |
| 6 | Bash の `cd outputs/...` が後続コマンドで効かない | bash tool の cwd 維持仕様（絶対パス推奨）失念 | 全 Bash で絶対パスを default | 既存 memory `feedback_bash_cwd_persistence` 強化 |
| 7 | Tailwind v4 vrl writing-mode で px/py が logical → 想定逆 | vrl + Tailwind logical padding の関係が未知 | 初回 SideReserve 幅調整時に「実測サイズ」確認を入れる | 新規 feedback memory として残す |

## 3. 自動化・効率化の余地

- **deploy ラッパースクリプト**: `scripts/deploy-terra-isshiki.sh` で `cd <site> && npx vercel --prod --yes` を 1 ショット化
- **bulk text resize スキル**: shrink_text.py を標準フロー化（他案件で再利用）
- **deploy 後 URL 共有判定**: deploy 完了後に team SSO 保護の有無を自動警告
- **Drive MCP 画像一括 download**: jq+file decode フローを skill 化
- **視覚調整冒頭プロンプト**: zoom 100% 確認 + 比較条件の同期を自動で促す

## 4. 次回への改善提案

- Vercel deploy 前に必ず `pwd && cat .vercel/project.json` を 1 コマンドで verify
- 視覚調整セッションの冒頭で「両方 100% zoom か、両方同じ viewport 幅か」を相互確認
- Tailwind v4 vrl writing-mode 使用箇所には `px=高さ / py=幅` を class コメント明示
- 写真選定時、heroBg prop と photo 明暗をペアで決める
- Bash 実行は絶対パスを徹底（cwd 依存ゼロ）

## 5. 反映 (commit 履歴で追跡可能)

### memory (新規 4 件)
- `feedback_browser_zoom_check.md`
- `feedback_vercel_subproject_cwd.md`
- `feedback_drive_mcp_base64_via_file.md`
- `feedback_tailwind_vrl_padding.md`

### improvement-log
- 上記 4 件のサマリを `data/improvement-log.jsonl` に追加

### 新規スキル
- `.claude/skills/tailwind-bulk-text-resize.md` — bulk text resize Python ワークフロー

### 既存スキル追記
- `.claude/skills/vercel-team-deploy-checklist.md` に「team SSO による URL 共有可否」セクション追加

### CLAUDE.md
- スキル一覧表に #31 を追加（tailwind-bulk-text-resize）

## 6. 数値サマリ

- 本セッションでの terra-isshiki commits: 30+ commits
- production deploys: 4 回 (最新: `site-7aoxr7itb-ofmetons-projects.vercel.app`)
- 適用された改修カテゴリ: A〜G + H + 数次のレビューイテレーション
- レスポンシブ検証スクリプト: `responsive-snap.sh` `responsive-audit.sh` を併設し、全 5 page × 6 viewport の overflow 自動検証パイプライン確立
