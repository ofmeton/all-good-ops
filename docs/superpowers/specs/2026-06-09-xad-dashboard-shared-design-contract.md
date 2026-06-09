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

## 2. デザイントークン凍結リスト（A/B が使ってよい既存クラス）

C は再デザインで配色を進化させてよいが、**下記の意味マッピングは壊さない**（A/B はこれだけ使う）:

| 用途 | Tailwind クラス |
|---|---|
| 背景ベース | `bg-slate-50` / `text-slate-700` / `border-slate-200` |
| primary アクション | `bg-blue-600 hover:bg-blue-700 text-white` |
| success / 承認・確定 | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| danger / 却下・エラー | `bg-rose-50 text-rose-700 border-rose-200` |
| warning / 注意 | `bg-amber-50 text-amber-700 border-amber-200` |
| info / 補助メッセージ | `bg-slate-100 text-slate-600` |
| ステータス色（工程図） | `lib/colors.ts` の `nodeColor()` |

共通フォーム/ボタン寸法（既存準拠）: input/select=`h-7`〜`h-9` / button=`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40` / コンテナ=`max-w-3xl mx-auto px-4 sm:px-6` / ヘッダー=`border-b sticky top-0 z-20`。

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
