# 参考アカウントの「型化」手順（投稿テンプレ登録）

- date: 2026-06-08
- status: howto（再現手順）
- 関連: `docs/superpowers/specs/2026-06-08-xaccount-templates-approval-check-design.md` §3 T1
- 実装: `apps/x-account-system/lib/curation/compose-templates.ts`（registry が SSOT）

## これは何か

参考アカウント（チャエン氏など）を分析して得た「投稿の型」を、
構造化フィールドを埋めて `COMPOSE_TEMPLATES` registry に register するための手順。

テンプレ＝執筆エージェント（MA writer）の system prompt に差し込む「投稿の型」。
構造化フィールドから「## この投稿の型（骨子）」ブロックが自動合成され、
固有の掟（`systemPromptPatch`）と併用される（`renderTemplatePrompt`）。

**dashboard 側は手作業不要**。テンプレ選択肢は worker `GET /admin/templates`
（registry 由来）から動的取得する（`fetchTemplateOptions` → `toTemplateOptions`）。
registry に 1 件足せば、curation 画面の「執筆へ送る」ダイアログに自動で出る。

## 構造化フィールド（ComposeTemplate）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意 id（`template_<account>_<type>` 形式推奨。kebab/snake） |
| `name` | string | 表示名（dropdown ラベル。例「チャエン型2（逆張り問題提起）」） |
| `description` | string | 1 行要約（流れの要点） |
| `tone` | string | 文体・語り口（例「速報屋らしく短文・断定・テンポ重視」） |
| `structure` | string[] | 構成の流れ（例 `["速報フック","意味づけ","箇条書き","実務接続"]`） |
| `hookType` | enum | フック類型: `速報` / `逆張り` / `数字` / `共感` / `問い` / `権威` |
| `hookStrength` | enum | フック強度: `strong` / `medium` / `soft` |
| `referenceNote?` | string | 由来（任意。どのアカ・どの分析から型化したか） |
| `systemPromptPatch` | string | 構造化フィールドで表せない固有の掟・補足 |
| `preferredFmats?` | string[] | 想定 fmat（任意。`short`/`medium`/`long`/`article`/`thread`） |

`hookType` / `hookStrength` は `compose-templates.ts` の `HookType` / `HookStrength` 型で固定。
追加したい類型があれば型定義側を先に拡張する（テスト `compose-templates.test.ts` の
`HOOK_TYPES` / `HOOK_STRENGTHS` も合わせて更新）。

## 手順

1. **参考アカを分析**し、投稿の型を言語化する（出典: `outputs/research/<date>-<account>-x-account-analysis.md` 等）。
   - 文体（tone）／構成の流れ（structure）／冒頭の掴み方（hookType・hookStrength）を抽出。
2. **id を決める**（`template_<account>_<type>`）。既存と衝突しないこと。
3. `apps/x-account-system/lib/curation/compose-templates.ts` の `COMPOSE_TEMPLATES` に
   1 エントリ追加（上表の全フィールドを埋める。`referenceNote` に由来を残す）。
   - `systemPromptPatch` は「骨子で表せない固有の掟」だけ書く（構成の二重記述は避けてよい）。
   - 既存テンプレ（特に `template_chaen_gold` = 型1）は壊さない。
4. **テストを更新**（TDD）:
   - `compose-templates.test.ts` の `test.each` が全テンプレの構造化フィールド充足を自動検証する（追加分も自動でカバー）。
   - `renderTemplatePrompt` のスナップショットは初回 `npx jest compose-templates.test.ts -u` で生成。
   - 実行: `cd apps/x-account-system && IN_MEMORY_FALLBACK=true npx jest lib/curation/compose-templates.test.ts`
5. **dashboard は何もしない**。worker をデプロイすれば `/admin/templates` 経由で dropdown に反映。
   - ローカル確認: worker を起動し `GET /admin/templates`（Bearer `OAUTH_ADMIN_SECRET`）が新 id を返すこと。
6. デプロイ（人間ゲート）: worker（wrangler）と dashboard（Vercel）の本番反映は人間確認必須。

## 注意

- registry が **唯一の SSOT**。dashboard に id をハードコードしない（ドリフト禁止）。
- `/admin/templates` は `id/name/description/preferredFmats` の **要約のみ**返す
  （`systemPromptPatch` 本文は露出しない）。
- 取得失敗時は dashboard が `TEMPLATE_OPTIONS_FALLBACK`（既定 1 件）に fail-open するため、
  endpoint 障害でも送信導線は止まらない（が、新テンプレは出ない → endpoint 復旧で解消）。
