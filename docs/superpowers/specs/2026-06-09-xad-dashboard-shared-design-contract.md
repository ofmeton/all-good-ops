# xad-dashboard 共有デザイン契約（3チーム並列の競合防止 SSOT）

> 2026-06-09。Team A（schedule/slot）・Team B（publish-now）・Team C（UX revamp）が並列実装する際の**唯一の調停文書**。各チームは着手前にこれを Read し、所有境界とトークン凍結リストを厳守する。違反＝マージ競合。

対象アプリ: `apps/xad-dashboard`（Next.js 16 App Router / React 19 / Tailwind v4 / shadcn 不使用）。

---

## 1. ナビ IA（確定）

header ナビ（`app/layout.tsx`、**Team C が唯一実装・所有**）は以下6エントリを左→右の順で持つ:

| ラベル | path | 担当チーム | 備考 |
|---|---|---|---|
| 工程図 | `/` | C | 既存・観測ダッシュボード |
| キュレーション | `/curation` | C | 既存 |
| 承認 | `/approval` | C | 既存（現状ナビ未掲載→今回掲載） |
| スケジュール | `/schedule` | A（route実装）/ C（navリンク） | 新規 |
| 今すぐ投稿 | `/publish` | B（route実装）/ C（navリンク） | 新規 |
| Runs | `/runs` | C | 既存 |

- **A/B は `app/layout.tsx` を編集しない**。自分の route ページ（`app/schedule/**`・`app/publish/**`）だけ追加する。ナビリンクは C が本契約どおり実装する。
- A/B の新ページが C 未マージでも、直接 URL で到達でき単体動作すること（未リンクなだけ）。

---

## 2. デザイントークン凍結リスト — **v2: ダーク写像（2026-06-12 改訂）**

2026-06-12 のミッションコントロール刷新で**ダーク固定**へ移行した（`app/globals.css` 冒頭コメントと相互参照）。
**意味マッピング（slate=基調 / blue=primary / emerald=success / rose=danger / amber=warn）は不変**。
ダーク面の再写像原則 = 「低透過色背景 + 明色文字(*-300) + 同色 30% 枠」。

| 用途 | v2 ダーククラス |
|---|---|
| 背景3層 | `bg-base`(#0a0f1e ページ地) / `bg-surface`(#0f1629 カード) / `bg-elevated`(#16203a モーダル) |
| 基調文字 | 見出し=`text-white` / 本文=`text-slate-200`〜`300` / 補助=`text-slate-400`（本文に slate-500 以下は禁止） |
| 枠線 | `border-white/10`（強調 `/15`、弱 `/5`） |
| カード | `.glass`（半透明+blur+内側ハイライト）/ 不透過は `bg-surface border-white/10` |
| モーダル/ドロワー | `.glass-elevated`、バックドロップ=`bg-black/60 backdrop-blur-sm` |
| primary アクション | `.btn-primary`（blue-500+グロー）or `bg-blue-500 hover:bg-blue-400 text-white` |
| 副ボタン | `.btn-ghost` |
| success / 承認・確定 | `.badge-ok` or `bg-emerald-400/10 text-emerald-300 border-emerald-400/30` |
| danger / 却下・エラー | `.badge-danger` or `bg-rose-400/10 text-rose-300 border-rose-400/30` |
| warning / 注意 | `.badge-warn` or `bg-amber-400/10 text-amber-300 border-amber-400/30` |
| info / 補助メッセージ | `.badge-info` or `bg-white/5 text-slate-300` |
| 入力 | `.input-dark` |
| ステータス色（工程図） | `lib/colors.ts` の `nodeColor()`（シグネチャ不変）。hex は `--st-*` ダーク値（ok=#34d399 / warn=#fbbf24 / danger=#fb7185 / skipped=#64748b / idle=#475569 / primary=#60a5fa） |
| グロー | `shadow-glow-{ok,warn,danger,primary}`。**box-shadow を直接アニメしない**（固定 shadow の疑似要素/spanの opacity を `animate-pulse-glow`） |
| モーション | `animate-{rise-in,pulse-glow,drift,grid-pan,draw-line}` / stagger=`.stagger-in` + `style={{"--i": idx}}`。常時アニメは transform/opacity/dash のみ。reduced-motion は globals.css で一括停止（JS 系は `useReducedMotion()`） |

共通フォーム/ボタン寸法（既存準拠）: input/select=`h-7`〜`h-9` / button=`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40` / コンテナ=`max-w-3xl mx-auto px-4 sm:px-6` / ヘッダー=`border-b border-white/10 sticky top-0 z-20`。

注意: `app/template.tsx` がページ遷移入場アニメを担う。template は**遷移ごとに client state を破棄する Next.js 仕様** — ページ間で client state を持ち越す設計を将来入れる場合は template の扱いを再検討すること。

<details>
<summary>v1（ライト時代・履歴）</summary>

| 用途 | Tailwind クラス |
|---|---|
| 背景ベース | `bg-slate-50` / `text-slate-700` / `border-slate-200` |
| primary アクション | `bg-blue-600 hover:bg-blue-700 text-white` |
| success / 承認・確定 | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| danger / 却下・エラー | `bg-rose-50 text-rose-700 border-rose-200` |
| warning / 注意 | `bg-amber-50 text-amber-700 border-amber-200` |
| info / 補助メッセージ | `bg-slate-100 text-slate-600` |

</details>

---

## 3. ファイル所有マップ（厳守）

### Team A 所有
- `apps/x-account-system/lib/publishing/slot-planner.ts`（+ `.test.ts`）
- `apps/x-account-system/src/worker.ts`（`/admin/plan-slots`・`/admin/mark-scheduled` 追加のみ。既存ルートは触らない）
- `apps/xad-dashboard/app/schedule/**`（page/Client/DraftRow/SlotPicker）
- `apps/xad-dashboard/lib/schedule-queries.ts` / `lib/schedule-logic.ts`（+test）
- `apps/xad-dashboard/app/api/schedule/**`

### Team B 所有
- `apps/xad-dashboard/app/publish/**`（page/Client）
- `apps/xad-dashboard/lib/publish-queries.ts`
- `apps/xad-dashboard/app/api/publish/**`
- `apps/x-account-system/scripts/publish-now.ts`
- `.claude/skills/x-scheduled-publish/`（即時モード追記）or 新 `x-immediate-publish/`
- 読み取りのみ: A の `listApprovedStock`（import 可。A 未マージ時の独立性のため薄い read query 重複も許容）

### Team C 所有
- `apps/xad-dashboard/app/layout.tsx` / `app/globals.css`
- `apps/xad-dashboard/app/HomeClient.tsx` / `app/components/Flowchart.tsx` / `app/components/NodePanel.tsx`
- `apps/xad-dashboard/app/curation/{CurationClient,MaterialCard}.tsx`
- `apps/xad-dashboard/app/approval/{ApprovalClient,DraftCard,AttachmentPicker}.tsx`
- `apps/xad-dashboard/app/runs/**`
- `apps/xad-dashboard/components/MediaModal.tsx`（**props/エクスポート API は変えない**。A/B が import 中）

### 共有・誰も破壊しない
- `apps/xad-dashboard/lib/supabase.ts`（`serverSupabase()`）/ `lib/colors.ts` / `lib/drafts-logic.ts`（メディア区分ユーティリティ。A/B が read 再利用）/ `lib/curation-queries.ts`（worker proxy の手本）。
- これらを変更する必要が生じたら**追加のみ（後方互換）**。既存シグネチャ変更は禁止。

---

## 4. 競合回避ルール

1. 自チーム所有外のファイルを編集しない。必要なら read 再利用 or 自分の lib に薄く複製。
2. `package.json` / `tsconfig.json` / lockfile は触らない（依存追加が要るなら停止して人間に確認）。
3. 統合順序の想定: **C → A → B**。ただし本契約でナビ/トークンを固定済みのため、各チームの成果は順不同でも単体動作する。
4. 各チームは origin/main 派生 worktree で作業し、完了時 PR。`main`/他 task ブランチへの直 commit はしない。

---

## 5. ポリシー不変（全チーム共通）
- X API 直投は恒久封印（`x-publisher.ts` Gate 5.5）。`X_DIRECT_API_ENABLED` を触らない。実投稿は chrome-devtools 半自動（source=本人クライアント維持）。
- 予約確定の DB 書込は冪等ガード（`scheduled_for IS NULL` / `published_at IS NULL`）必須。本番 deploy / migration は人間確認ゲート（実装スコープ外）。
- LLM/外部出力は境界で検証＋欠損デフォルト補完。
